# API Endpoint Implementation Plan: POST /api/v1/flyers/:flyer_id/pages/upload-url

## 1. Przegląd punktu końcowego

- Cel: Udostępnić bezpieczny, serwerowy pre-signed upload URL dla plików stron gazetki (page images). Endpoint jest dostępny tylko dla administratorów i zwraca URL do bezpośredniego uploadu do Supabase Storage oraz publiczną ścieżkę (public_path) do zapisania w rekordzie `pages`.
- Zakres: Wygenerowanie podpisanego URL, walidacja parametrów (page_number, filename, content_type, width/height), ochrona autoryzacyjna (admin), zwrócenie meta (upload_url, public_path, expires_at).

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/v1/flyers/:flyer_id/pages/upload-url`
- Parametry ścieżki:
  - `flyer_id` (UUID) — wymagane
- Query: brak
- Parametry w body (JSON):
  - Wymagane:
    - `page_number`: number (integer > 0)
    - `filename`: string (bez ścieżek, np. `page_1.jpg`)
    - `content_type`: string (MIME type, np. `image/jpeg`)
  - Opcjonalne:
    - `width`: number (px) — jeśli podawane, musi iść razem z `height`
    - `height`: number (px) — jeśli podawane, musi iść razem z `width`

- Przykład Request Body:

```json
{
  "page_number": 1,
  "filename": "page_1.jpg",
  "content_type": "image/jpeg",
  "width": 1200,
  "height": 1600
}
```

## 3. Wykorzystywane typy (DTO / Commands)

- `UploadUrlRequestCommand` (z `src/types.ts`)
  - page_number: number
  - filename: string
  - content_type: string
  - width?: number
  - height?: number
- `UploadUrlResponse` (z `src/types.ts`)
  - upload_url: string
  - public_path: string
  - expires_at: string (ISO)

Możliwe dodatkowe internal DTOs:
- `GenerateUploadUrlResult` { uploadUrl, publicPath, expiresAt }

## 4. Szczegóły odpowiedzi

- Kody statusu:
  - 201 Created — podpisany URL wygenerowany pomyślnie (stosować 201 zgodnie z utworzeniem zasobu uploadu)
  - 400 Bad Request — walidacja wejścia nie powiodła się
  - 401 Unauthorized — niezalogowany użytkownik lub brak autoryzacji
  - 403 Forbidden — zalogowany użytkownik nie ma roli admin
  - 404 Not Found — `flyer_id` nie istnieje
  - 500 Internal Server Error — błąd serwera / storage

- Body (201):
```json
{
  "upload_url": "https://...signed...",
  "public_path": "lidl/{flyer_id}/page_1.jpg",
  "expires_at": "2025-12-04T12:34:56Z"
}
```

## 5. Przepływ danych

1. Router/handler przyjmuje POST `/api/v1/flyers/:flyer_id/pages/upload-url`.
2. Autoryzacja: odczyt `auth` z kontekstu (Astro `context.locals.supabase` lub request headers); pobrać `auth.uid()` i rolę z `profiles` (JOIN / supabase RPC).
3. Walidacja wejścia (zod):
   - `page_number` > 0,
   - `filename` nie zawiera backslashów/ścieżek; dopuszczalne tylko bezpieczne znaki,
   - `content_type` jest w whitelist MIME (`image/jpeg`, `image/png`, `image/webp` — konfigurowalne),
   - jeśli podano `width`/`height` — oba muszą być liczbami > 0.
4. Sprawdź istnienie `flyer` i jego `store` (SELECT z `flyers` by `flyer_id`).
   - Zwróć 404 jeśli nie istnieje.
5. Autoryzacja roli: sprawdzić, czy `profiles.role === 'admin'`. Jeśli nie, zwrócić 403.
6. Zbuduj `public_path` zgodnie z konwencją storage:
   - `{store_slug}/{flyer_id}/page_{page_number}.{ext}` — `store_slug` powinien pochodzić z tabeli `stores` (np. slug utworzony z nazwy), `ext` wydobyte z `filename`.
7. Wywołanie Supabase Storage SDK na serwerze (z użyciem service role key lub server-side Supabase client dostępnego w `context.locals.supabase`) w celu wygenerowania signed URL do PUT lub do bezpośredniego uploadu (preferować `createSignedUrl` lub analogiczną metodę; w Supabase Storage: `from(bucket).createSignedUrl(path, expiresInSeconds)` dla GET/PUT zależnie od potrzeb).
8. Zwróć `upload_url`, `public_path`, `expires_at` w odpowiedzi (201).
9. (Opcjonalne) Zarejestruj tymczasowy placeholder `pages` record w DB lub pozostaw rejestrację strony do osobnego endpointu `POST /api/v1/flyers/:flyer_id/pages` (zalecane: rozdzielić - upload-url tylko generuje URL; klient musi następnie zarejestrować rekord strony).

## 6. Wydzielenie logiki do service

- Nowy serwis: `src/lib/services/pages.service.ts` (jeśli jeszcze nie istnieje) z metodami:
  - `generateUploadUrl(flyerId: string, cmd: UploadUrlRequestCommand, userId: string): Promise<GenerateUploadUrlResult>`
  - `validateUploadCommand(cmd): ZodSchema` (zwraca/wykorzystuje zod)
  - (opcjonalnie) `ensureFlyerExists(flyerId)` i `getStoreSlugForFlyer(flyerId)`

- Handler API (`src/pages/api/v1/flyers/[flyer_id]/pages/upload-url.ts`) powinien być cienkim wrapperem: parsuje request, wywołuje walidację, weryfikuje auth/role, calls `pages.service.generateUploadUrl`, i mapuje rezultat na HTTP response.

## 7. Walidacja danych wejściowych

- Użyć `zod` (zgodnie z projektem) do walidacji `UploadUrlRequestCommand`. Schemat:
  - page_number: z.number().int().positive()
  - filename: z.string().min(1).regex(/^[a-zA-Z0-9_.-]+$/) (bez slashów)
  - content_type: z.enum(['image/jpeg','image/png','image/webp']) lub z.string() + custom check
  - width/height: both optional but if one present, require the other and both > 0

- Walidacja dodatkowa:
  - Sprawdzenie konfliktu page_number z istniejącymi rekordami (jeśli endpoint ma rejestrować record od razu) — DB unique constraint uchroni, ale dobrze wcześniej SELECT by zapobiec race.

## 9. Bezpieczeństwo

- Uwierzytelnianie:
  - Wymagane: użytkownik musi być zalogowany. Użyć Supabase auth z `context.locals.supabase` lub tokena z nagłówka.
- Autoryzacja:
  - Sprawdzić `profiles.role === 'admin'` (RLS nie zastąpi tej kontroli tutaj).
- Przepisy napędu kluczy:
  - Generować signed URL po stronie serwera (SERVICE ROLE KEY jeśli konieczne); nigdy nie używać Service Role Key w kliencie.
- Walidacja plików:
  - Ograniczyć `content_type` do obrazów; ograniczyć rozmiar pliku przy upload (na poziomie client + storage policy).
- Sanity checks dla `filename` i `public_path` aby zapobiec path traversal.
- Rate limiting:
  - Dodać rate-limit na endpoint (np. 10 req/min per admin) by zapobiec nadużyciom.

## 10. Scenariusze błędów i mapowanie kodów stanu

- 400 Bad Request:
  - Niepoprawna shape JSON (zod fails)
  - filename zawiera niedozwolone znaki
  - width/height podane niekompletnie

- 401 Unauthorized:
  - Brak tokena, session wygasła, lub token invalid

- 403 Forbidden:
  - User jest zalogowany ale `role !== 'admin'`

- 404 Not Found:
  - `flyer_id` nie istnieje

- 409 Conflict (opcjonalnie):
  - page_number już istnieje (jeśli endpoint rejestruje page od razu)

- 500 Internal Server Error:
  - Błąd wygenerowania signed URL, problem z storage, błąd DB przy zapisie do `api_errors`

## 11. Wydajność

- Koszty operacyjne:
  - Generowanie signed URL jest tanie; głównym kosztem jest latencja do supabase storage.
- Optymalizacje:
  - Minimalny DB access: tylko SELECT flyer + store slug, avoid heavy joins.
  - Cache (short-lived) store_slug if high frequency for same flyer_id (optional).
  - Timeouts: ustaw krótki timeout dla storage SDK calls i odpowiednio obsłuż błędy.

## 12. Kroki implementacji (szczegółowo)

1. ZADANIE: Utworzyć TODOs (zrobione).

2. Utwórz/aktualizuj serwis:
   - Plik: `src/lib/services/pages.service.ts`
   - Zaimportuj SupabaseClient type i użyj serwera-side supabase client przekazywanego z kontekstu lub skonstruuj nowy z service role key w środowisku serwera.
   - Implementuj `generateUploadUrl(flyerId, cmd, userId)`.
   - Pobierz `flyer` i `store` (slug) z DB; rzuć 404 jeśli brak.
   - Zbuduj `public_path` zgodnie z konwencją.
   - Wywołaj `from('flyer-pages').createSignedUrl(publicPath, expiresInSec)` lub odpowiednią metodę PUT/POST w SDK.
   - Zwróć `upload_url`, `public_path`, `expires_at`.

3. Dodaj zod schema:
   - Plik: `src/lib/utils/validation.ts` (rozszerz istniejący) — dodaj `uploadUrlRequestSchema`.

4. Dodaj endpoint handler:
   - Plik: `src/pages/api/v1/flyers/[flyer_id]/pages/upload-url.ts`
   - Akcje:
     - Parsuj `flyer_id` z params, body z JSON.
     - Uwierzytelnij użytkownika (use `context.locals.supabase`), pobierz `auth.uid()`.
     - Sprawdź profil role (SELECT profiles WHERE id = auth.uid()).
     - Waliduj body z zod.
     - Call `pages.service.generateUploadUrl`.
     - Return 201 z `UploadUrlResponse`.
     - Catch errors: map to proper HTTP codes; dla 500: log INSERT do `api_errors`.

5. DB: (opcjonalne) utwórz tabelę `api_errors` / `upload_errors` (migracja SQL) i migrację.

6. Testy:
   - Unit testy dla `pages.service.generateUploadUrl` (mocks supabase storage).
   - Integration tests endpointu:
     - happy path (admin)
     - unauthenticated
     - non-admin role
     - invalid payloads
     - flyer not found

9. Rolowanie i feature flags:
   - Opcjonalnie wprowadź feature flag dla `upload-url` jeśli rollout stopniowy.

10. Deployment checklist:
   - Upewnij się, że env vars mają odpowiedni service role key tylko serwera.
   - Przetestuj na staging z prawdziwym storage.

---

Przypomnienie implementacyjne: endpoint `upload-url` powinien być cienkim kontrolerem delegującym całą logikę walidacji i komunikacji z Storage do `pages.service`. Rejestracja rekordu `pages` powinna odbywać się w dedykowanym endpointzie `POST /api/v1/flyers/:flyer_id/pages` — to oddziela generowanie URL od zapisu metadanych (clean separation of concerns).
