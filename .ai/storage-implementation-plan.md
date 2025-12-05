# API Endpoint Implementation Plan: POST /api/v1/uploads/sign

## 1. Przegląd punktu końcowego

- Cel: Udostępnić bezpieczny, krótkotrwały signed upload URL do `Supabase Storage` dla obrazów stron gazetki (bucket `flyer-pages`). Endpoint jest dostępny tylko dla użytkowników z rolą `admin`. Po pomyślnym uploadzie klient wywołuje osobny endpoint rejestrujący stronę (page register).
- Lokalizacja implementacji (proponowana): `src/pages/api/v1/uploads/sign.ts` (Astro server endpoint) oraz usługa pomocnicza `src/lib/services/storage.service.ts`.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/v1/uploads/sign`
- Nagłówki:
  - `Authorization: Bearer <access_token>` — wymagane (anon key nie wystarczy do generowania signed URL).
  - `Content-Type: application/json`
- Parametry:
  - Wymagane (body JSON):
    - `filename` (string) — nazwa pliku, np. `page_1.jpg`. Powinna być sanityzowana i nie zawierać ścieżek wykraczających poza dozwolony wzorzec.
    - `content_type` (string) — typ MIME, np. `image/jpeg`.
    - `flyer_slug` (string) — slug sklepu/ścieżki (np. `lidl`) lub inny katalog bazowy; używany do budowy public_path.
    - `flyer_id` (string, UUID) — id gazetki; wymagane do weryfikacji istnienia gazetki.
    - `page_number` (number) — numer strony (integer > 0).
  - Opcjonalne:
    - `width` (number) — szerokość obrazu (użyteczne dla walidacji/metadata)
    - `height` (number)

- Request Body model: użyj istniejącego typu `UploadUrlRequestCommand` z `src/types.ts`.

## 3. Wykorzystywane typy

- `UploadUrlRequestCommand` (`src/types.ts`)
- `UploadUrlResponse` (`src/types.ts`)
- Dodatkowo (wewnętrzne):
  - Serwis: `SignedUploadRequest` (wewnętrzny typ wynikowy z `storage.service.ts`)

## 4. Szczegóły odpowiedzi

- Kod 201 — utworzenie signed URL (preferowane dla "create" zasobu)
  - Body (application/json):
    - `upload_url` (string) — pełny URL (signed) do uploadu metodą PUT/POST lub pre-signed form data, zależnie od metody Supabase Storage.
    - `public_path` (string) — ścieżka publiczna zapisana w bazie, np. `lidl/{flyer_id}/page_1.jpg`. Klient zapisze tę ścieżkę przy rejestracji strony.
    - `expires_at` (string, ISO) — data wygaśnięcia signed URL.

- Kody błędów:
  - 400 — walidacja wejścia (szczegóły w body)
  - 401 — brak/nieprawidłowy token lub użytkownik nie ma roli admin
  - 404 — `flyer_id` lub `flyer_slug` nie istnieje
  - 500 — błąd serwera / błąd integracji ze Storage

Przykład odpowiedzi 201:
```json
{
  "upload_url": "https://...signed...",
  "public_path": "lidl/550e8400-e29b-41d4-a716-446655440000/page_1.jpg",
  "expires_at": "2025-12-04T13:45:00.000Z"
}
```

## 5. Przepływ danych

1. Endpoint przyjmuje żądanie POST z JSON. Endpoint to serwer (Astro server endpoint) z `export const prerender = false`.
2. Server uruchamia walidację schematu wejścia za pomocą `zod` (użyj `src/lib/utils/validation.ts` patterns jeśli istnieją).
3. Autoryzacja: uzyskaj `supabase` z `context.locals` (zgodnie z zasadami backend) i zweryfikuj sesję użytkownika oraz jego rolę (`profiles.role = 'admin'`). Alternatywnie sprawdź claimy JWT, ale preferuj zapytanie `profiles` przez supabase (SELECT role FROM profiles WHERE id = auth.uid()).
4. Weryfikacja biznesowa:
   - Czy `flyer_id` istnieje w tabeli `flyers`?
   - Czy `page_number` jest dodatni i że w danej gazetce nie istnieje już strona o tym numerze (opcjonalnie — jeśli klient zawsze rejestruje stronę po uploadzie, można jedynie walidować braki konfliktu).
   - Sanityzacja `filename` (usuń/odrzuć `..`, absolutne ścieżki, znaki specjalne).
5. Zbuduj `public_path` zgodnie z konwencją:
   - `flyer-pages/{flyer_slug}/{flyer_id}/page_{page_number}.{ext}` lub `flyer-pages/{flyer_slug}/{flyer_id}/{filename}` — ustal jeden wzorzec i stosuj go spójnie.
6. Wywołaj `storage.service.createSignedUploadUrl({ bucket: 'flyer-pages', path: public_path, contentType, expiresInSeconds })`.
   - Implementacja serwisowa powinna używać Service Role Key (tylko od strony serwera). Nigdy nie wystawiaj service role key do klienta.
7. Zwróć `upload_url`, `public_path`, `expires_at` (201).
8. Klient wykona upload do otrzymanego `upload_url`, a następnie wywoła endpoint rejestracji strony (np. `POST /api/v1/pages`) z `public_path` — ten endpoint zapisze rekord `pages` i powiąże go z `flyer_id`.

## 6. Wydzielenie logiki do serwisu

- Stwórz `src/lib/services/storage.service.ts` z interfejsem:
  - `createSignedUploadUrl(params: { bucket: string; path: string; contentType: string; expiresInSeconds?: number; }): Promise<{ uploadUrl: string; expiresAt: string }>`
  - `validateFilename(filename: string): string` (sanityzacja)
  - Ten serwis używa `createClient` Supabase z Service Role Key (pytanie: jeżeli w środowisku są różne klucze, wstrzykuj przez env i nie używaj w endpointach front-facing).

- Dodatkowo można dodać `src/lib/services/flyer.service.ts` z funkcją `ensureFlyerExists(flyer_id)` i `ensureAdmin(userId)` jeśli nie ma centralnego service.

## 7. Walidacja danych wejściowych

- Użyj `zod` schematu, przykładowo:
  - `filename`: nonempty string, regex ograniczający znaki (alfa-num, dash, underscore, dot), max length 255.
  - `content_type`: enum/common mime pattern (z whitelistą — `image/jpeg`, `image/png`, `image/webp`).
  - `flyer_slug`: nonempty string, slug pattern.
  - `flyer_id`: uuid.
  - `page_number`: integer().min(1).
  - `width`, `height`: optional positive integers.

- W razie niepowodzenia walidacji -> 400 + body z `ApiError` (użyj `ApiError` z `src/types.ts`).

## 9. Bezpieczeństwo

- Autoryzacja:
  - Wymagać zalogowanego użytkownika i rolę `admin`. Sprawdzać to serwerowo.
  - Nie korzystać z klienta Supabase z Anon Key do tworzenia signed URL — użyj Service Role Key po stronie serwera.
- Walidacja:
  - Sanityzować `filename` i `flyer_slug`.
  - Kontrolować `content_type` whitelistą.
- Ograniczenia:
  - Limit rozmiaru uploadu — narzuć limit w polityce storage lub waliduj `Content-Length` po stronie uploadu (klient może jednak oszukać — rozważ presigned POST z polityką).
  - Ustawić krótki TTL dla signed URLs (np. 5-15 minut).
- Rate limiting:
  - Dodaj rate limiting na endpoint (np. 10 req/min per user/ip) aby ograniczyć nadużycia i koszty.
- Inne:
  - Upewnij się, że `public_path` nie pozwala na nadpisanie innych zasobów bez odpowiedniej autoryzacji (np. wersjonuj ścieżki lub waliduj, że ścieżka należy do `flyer_id`).
 

## 11. Wydajność i skalowalność

- TTL dla signed URLs powinien być krótki (5–15 minut) aby zmniejszyć wektor ataku.
- Rate limiting i caching (jeśli konieczne) dla listy walidowanych zasobów (np. check istniejącego `flyer_id`) — użyć krótkiego cache (in-memory/LRU) na serwerze API dla hot reads.
- Upewnić się, że generowanie signed URLs jest szybkie — operacja nie wymaga zapisu do DB (poza opcjonalnym logiem).
- Montuj monitoring (latency, error rate) i alerty (np. na Sentry).

## 12. Kroki implementacji (szczegółowe)

1. Utworzyć zadanie migracji (opcjonalnie) dla tabeli `api_error_logs` (jeśli logujemy błędy do DB).
2. Dodać/zweryfikować `UploadUrlRequestCommand` i `UploadUrlResponse` w `src/types.ts` (już istnieją — potwierdzić).
3. Stworzyć `src/lib/services/storage.service.ts`:
   - Implementacja `createSignedUploadUrl(...)` używająca Supabase Storage z Service Role Key (env var).
   - Funkcja sanityzująca `sanitizeFilename`.
4. Dodać `zod` schemat walidacji w `src/lib/utils/validation.ts` lub lokalnie w endpointzie:
   - Schemat zgodny z `UploadUrlRequestCommand`.
5. Implementować endpoint `src/pages/api/v1/uploads/sign.ts`:
   - `export const prerender = false;`
   - Handler POST:
     - Pobranie supabase z `context.locals.supabase` (sprawdzić docs projektu).
     - Walidacja schematu (zod).
     - Autoryzacja: sprawdź session i `profiles.role = 'admin'`.
     - Weryfikacja istnienia `flyer_id` (`select id, store_id`).
     - Złożenie `public_path`.
     - Wywołanie `storage.service.createSignedUploadUrl`.
     - Zwrócenie 201 z `UploadUrlResponse`.
