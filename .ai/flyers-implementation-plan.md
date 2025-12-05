# API Endpoint Implementation Plan: POST /api/v1/flyers

## 1. Przegląd punktu końcowego

Krótki opis: endpoint tworzy nową gazetkę (`flyer`) przypisaną do istniejącego sklepu. Jest to operacja chroniona (admin only). Endpoint waliduje dane wejściowe (m.in. poprawność dat i istnienie `store_id`), tworzy rekord w tabeli `flyers` i zwraca nowo utworzony obiekt (201).

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/v1/flyers`
- Nagłówki:
  - `Authorization: Bearer <access_token>` (wymagane, admin)
  - `Content-Type: application/json`
- Parametry:
  - Wymagane (body):
    - `store_id` (UUID) — istniejący `stores.id`
    - `valid_from` (YYYY-MM-DD) — data rozpoczęcia
    - `valid_to` (YYYY-MM-DD) — data zakończenia
  - Opcjonalne (body):
    - `status` (enum: `draft` | `active` | `archived`) — domyślnie `draft`
- Przykładowe ciało żądania:

```json
{
  "store_id": "550e8400-e29b-41d4-a716-446655440000",
  "valid_from": "2025-11-01",
  "valid_to": "2025-11-07",
  "status": "draft"
}
```

## 3. Wykorzystywane typy

- DTOs i Command Modele:
  - `CreateFlyerCommand` (z `src/types.ts`) — wymagane pola `store_id`, `valid_from`, `valid_to`, opcjonalnie `status`.
  - `FlyerDTO` / `FlyerListItemDTO` — odpowiedź API (patrz `src/types.ts`).

## 4. Szczegóły odpowiedzi

- Sukces:
  - 201 Created — zwraca obiekt `FlyerDTO` zawierający przynajmniej: `id`, `store_id`, `store_name` (dołączone), `valid_from`, `valid_to`, `status`.
  - Header `Location: /api/v1/flyers/{id}` (opcjonalne, zalecane).
- Błędy:
  - 400 Bad Request — nieprawidłowe dane wejściowe (np. `valid_to < valid_from`, nie-UUID).
  - 401 Unauthorized — brak/nieprawidłowy token.
  - 403 Forbidden — token poprawny, ale użytkownik nie jest adminem.
  - 404 Not Found — jeśli `store_id` nie istnieje.
  - 409 Conflict — rzadziej; np. kolizje biznesowe (jeśli przyjęte w logice).
  - 500 Internal Server Error — nieoczekiwany błąd serwera.

Przykład odpowiedzi (201):

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "store_id": "440e8400-e29b-41d4-a716-446655440111",
    "store_name": "Lidl",
    "valid_from": "2025-11-01",
    "valid_to": "2025-11-07",
    "status": "draft"
  }
}
```

## 5. Przepływ danych

1. Autoryzacja: serwer weryfikuje JWT z nagłówka `Authorization`, pobiera `auth.uid()` i odczytuje `profiles.role` (z DB lub cache). Jeśli nie admin → 403.
2. Walidacja schematu wejściowego (Zod):
   - `store_id` jest UUID,
   - `valid_from` i `valid_to` są datami w formacie ISO,
   - `valid_to >= valid_from`.
3. Weryfikacja referencyjna:
   - Sprawdzić istnienie `stores` z `id = store_id`. Można to zrobić jedno zapytanie SELECT FOR SHARE/READ.
4. Transakcja DB:
   - W jednej transakcji INSERT do `flyers` z polami: `store_id`, `valid_from`, `valid_to`, `status`.
5. Dołączenie dodatkowych pól:
   - Opcjonalnie dołączyć `store_name` wykonując JOIN lub dodatkowe SELECTa (może być częścią serwisu).
6. Odpowiedź 201 z ciałem `FlyerDTO`.

Przy błędach walidacji zwrócić 400 z polem `details` zawierającym mapę pól -> komunikaty.

## 6. Względy bezpieczeństwa

- Autoryzacja:
  - Wymagany token JWT; wyłącznie użytkownicy z `profiles.role === 'admin'` mogą wykonać POST.
  - Zgodnie z zasadami projektu, używać SupabaseClient z serwera (service role tylko tam, gdzie konieczne), a do routingu korzystać z `context.locals.supabase` (jeżeli kod używa Astro server endpoints) lub bezpiecznego serwera Node po stronie backendu.
- Walidacja:
  - Strict Zod schemata dla payloadu.
  - Sanity checks: nie trustować danych wejściowych; walidować typy i zakresy.
- RLS:
  - Rely on DB RLS policies for read access; writes happen via server using service role where needed. But avoid exposing service role broadly — prefer server endpoints using authenticated session for admin actions.
- Rate limiting & abuse:
  - Ograniczyć liczbę kreacji (anti-flood) po stronie serwera na konto/admin/IP.
- Injection & formatting:
  - Nie budować SQL dynamicznie z pola wejściowego; używać prepared statements/ORM.

## 7. Obsługa błędów

- Typowe scenariusze i odpowiedzi:
  - Validation fail (`valid_to < valid_from`): 400
  - Missing field (`store_id`): 400
  - Invalid UUID format: 400
  - Non-existent `store_id`: 404
  - Unauthorized (no token): 401
  - Forbidden (user not admin): 403
  - DB unique/constraint violation (unexpected): 409 lub 400 z czytelnym komunikatem (mapować kod DB -> komunikat)
  - Unexpected error: 500, w body podać `error` z `code` i `reference_id` (log id)

- Błędy walidacji powinny zwracać strukturę:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { "valid_to": ["must be >= valid_from"] }
  }
}
```

- Rejestrowanie błędów:
  - Krótkoterminowo: logi serwera (structured logs) zawierające trace id i payload (bez tokenów).
  - Długoterminowo: (opcjonalnie) tabela `api_errors` z kolumnami `id`, `endpoint`, `user_id`, `payload` (jsonb), `error_code`, `error_message`, `created_at`. Jeśli wdrażamy — zapisuj krytyczne 5xx i powtarzające się 4xx do tej tabeli.
  - Dla AI-job failures używać `pages.error_details` i `pages.processing_status='error'`.

## 8. Wydajność

- Złożoność: operacja tworzenia pojedynczego rekordu jest O(1). Krytyczne ścieżki:
  - SELECT sprawdzające istnienie `store` (index on stores.id).
  - INSERT do `flyers` — index on `store_id` w DB.
- Optymalizacje:
  - Bulk/Batch: jeżeli klient tworzy wiele flyers, zapewnić batch endpoint w przyszłości.
  - Cache: `store_name` można odczytać z cache (Redis) do zmniejszenia dodatkowego SELECTa, ale na MVP dołączamy JOIN (cheap).
  - Connection pooling: upewnić się, że pool DB jest poprawnie skonfigurowany.

## 9. Kroki implementacji

1. Dodaj / zaktualizuj DTO & schemat walidacji:
   - Zod schema `createFlyerSchema` zgodna z `CreateFlyerCommand` (w `src/lib/validation.ts` lub nowym `src/lib/schemas/flyers.schema.ts`).

2. Service:
   - Utwórz/aktualizuj `src/lib/services/flyers.service.ts` (jeśli istnieje, rozszerzyć).
   - Funkcja: `createFlyer(createCmd: CreateFlyerCommand, actorId: string)`:
     - Waliduje pola (dodatkowe sanity checks).
     - Sprawdza istnienie sklepu (`stores`).
     - Wstawia rekord do `flyers` w transakcji.
     - Zwraca `FlyerDTO` (dołącza `store_name` przez JOIN lub dodatkowy SELECT).
     - W razie błędów mapuje wyjątki DB → przyjazne błędy (unique -> 409, fk -> 404).

3. Middleware / auth helper:
   - Upewnij się, że masz middleware do walidacji tokena i sprawdzenia roli admina (np. `src/lib/utils/auth.ts`). W Astro endpoints użyj `context.locals.supabase` i pobierz `auth.user()` lub `auth.uid()`, następnie `profiles` row.

4. Endpoint:
   - Utwórz/zmodyfikuj `src/pages/api/v1/flyers.ts`:
     - Handler POST: parse body, validate Zod, wywołaj `flyers.service.createFlyer`.
     - Zwróć 201 wraz z `Location` header dla nowego zasobu.
     - Mapuj błędy walidacji → 400; auth → 401/403; not found store → 404; DB conflict → 409; unexpected → 500.
     - Upewnij się, że `export const prerender = false` w pliku endpointu.


5. Linter & types:
   - Dodaj/uruchom linter + typy TypeScript; upewnij się, że `supabase` client type używa `SupabaseClient` z `src/db/supabase.client.ts`.

6. Monitoring & logs:
   - Dodaj structured log entries przy CREATE (info) i przy błędach (error) zawierające `user_id`, `endpoint`, `payload_summary`, `trace_id`.

7. Dokumentacja:
   - Zaktualizuj `README` lub OpenAPI spec z opisem endpointu i schematami request/response.

## 10. Przykładowy pseudokod (serwis)

```ts
// createFlyer in src/lib/services/flyers.service.ts
async function createFlyer(dbClient, cmd, actorId) {
  // 1) validate cmd (Zod)
  // 2) check store exists: SELECT 1 FROM stores WHERE id = $1
  // 3) INSERT INTO flyers (...) RETURNING *
  // 4) SELECT store.name if needed and build DTO
  // 5) return dto
}
```

## 11. Uwagi końcowe

- Stosuj zasadę "validate early, fail fast". Wszystkie błędy walidacji powinny być wyłapywane przed próbą INSERTu, a DB constraints traktowane jako ostateczne zabezpieczenie integralności.
- Trzymaj logikę biznesową w warstwie serwisu (`src/lib/services/flyers.service.ts`) — dzięki temu endpointy pozostają cienkie i łatwe do testowania.
- Po wdrożeniu monitoruj metryki: liczba tworzeń, czas odpowiedzi, błędy 4xx/5xx, liczba jobów przetwarzania.
 
## Dodatkowo: GET, PATCH i DELETE dla `/api/v1/flyers`

Poniżej krótkie specyfikacje i wskazówki implementacyjne dla pozostałych metod CRUD (lista / szczegóły / aktualizacja / usunięcie).

- GET `/api/v1/flyers` (lista)
  - Cel: publiczna lista gazetek; domyślnie filtrowana `status=active`.
  - Query params: `status`, `store_id`, `valid_from`, `valid_to`, `page`, `per_page`, `sort`.
  - Zwraca: 200 `{ data: FlyerListItemDTO[], meta }`.
  - Walidacja: sprawdzić formaty dat/UUID dla filtrów; ograniczyć `per_page` (max 100).
  - Implementacja: serwis `listFlyers(filters, pagination)` wykonuje SELECT z WHERE i JOIN na `stores` aby dołączyć `store_name`. Upewnij się, że używasz indeksów na `store_id` i (`valid_from`,`valid_to`).
  - Błędy: 400 (nieprawidłowe query), 500 (DB).

- GET `/api/v1/flyers/:id` (szczegóły)
  - Cel: zwraca `FlyerDetailDTO` (opcjonalnie `?include=pages`).
  - Zwraca: 200 z `FlyerDetailDTO` lub 404 jeśli brak.
  - Implementacja: serwis `getFlyerById(id, opts)` zwraca flyer i (opcjonalnie) listę stron (bez produktów, chyba że `include=products`). Użyj transakcji jeśli pobierasz wiele zasobów.
  - Błędy: 404 (not found), 500.

- PATCH `/api/v1/flyers/:id` (admin)
  - Cel: częściowa aktualizacja pól `valid_from`, `valid_to`, `status`.
  - Autoryzacja: admin only (401/403).
  - Walidacja:
    - Jeśli `valid_from` lub `valid_to` podane → wymusić `valid_to >= valid_from`.
    - `status` musi być zdefiniowany w enumie (`draft|active|archived`); opcjonalnie walidować workflow statusów (np. disallow downgrade).
  - Implementacja:
    - Zod schema `updateFlyerSchema` (tylko dozwolone pola).
    - Serwis `updateFlyer(id, updateCmd, actorId)`:
      - Pobierz aktualny rekord (SELECT FOR UPDATE jeśli konieczne),
      - Waliduj reguły biznesowe (status workflow, daty),
      - Wykonaj UPDATE w transakcji i RETURNING *,
      - Zwróć zaktualizowany `FlyerDTO`.
  - Odpowiedzi:
    - 200 OK + `FlyerDTO`,
    - 400 — walidacja,
    - 401/403 — auth/role,
    - 404 — brak zasobu,
    - 409 — konflikt biznesowy,
    - 500 — nieoczekiwany.

- DELETE `/api/v1/flyers/:id` (admin)
  - Cel: usunięcie gazetki; zgodnie ze schematem DB usunięcie powinno CASCADE do `pages` i `products`.
  - Autoryzacja: admin only.
  - Implementacja:
    - Serwis `deleteFlyer(id, actorId)`:
      - Opcjonalnie wykonać pre-delete checks (np. czy nie ma aktywnych jobów),
      - DELETE FROM flyers WHERE id = $1;
      - Zwraca 204 No Content.
  - Błędy:
    - 401/403 — auth/role,
    - 404 — not found,
    - 409 — jeśli DB zgłasza RESTRICT (w innych relacjach),
    - 500 — nieoczekiwany.

### Wspólne wskazówki implementacyjne

- Rozszerz `src/lib/services/flyers.service.ts` o:
  - `listFlyers(filters, pagination)`,
  - `getFlyerById(id, opts)`,
  - `updateFlyer(id, updateCmd, actorId)`,
  - `deleteFlyer(id, actorId)`.

- Endpointy w `src/pages/api/v1/flyers.ts`:
  - GET (lista) → `listFlyers`,
  - GET /:id → `getFlyerById`,
  - POST → `createFlyer` (opisane wcześniej),
  - PATCH /:id → `updateFlyer`,
  - DELETE /:id → `deleteFlyer`.
