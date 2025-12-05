# API Endpoint Implementation Plan: GET /api/v1/search/products

## 1. Przegląd punktu końcowego

Cel: Dostarczyć bezpieczne, wydajne i typowane API do wyszukiwania produktów w aktywnych gazetkach z obsługą literówek (trigramy + FTS). Endpoint ma wykorzystywać istniejącą funkcję SQL `search_products(search_query, similarity_threshold)` opisano w schemacie bazy danych i zwracać strukturę zgodną z `ProductListResponse`.

Użytkownicy: publiczny frontend (anon key + RLS) oraz konsumenci API. Wyniki powinny być ograniczone i paginowane oraz respektować statusy i RLS (tylko `verified` pages i `active` flyers).

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/v1/search/products` (query params)

- Parametry:
  - Wymagane:
    - `q` (string) — zapytanie wyszukiwania, min 1 znak
  - Opcjonalne:
    - `store_id` (UUID) — filtr po sklepie
    - `category_id` (UUID) — filtr po kategorii
    - `similarity_threshold` (float) — dopuszczalna podobieństwo (domyślnie 0.3)
    - `page` (integer, 1-indexed, domyślnie 1)
    - `per_page` (integer, domyślnie 20, max 100)

- Request Body: brak (GET z query params)

## 3. Wykorzystywane typy

- Input: `SearchProductsQuery` (z `src/types.ts`) — mapować query params na ten typ
- Output: `ProductListResponse` (`ApiListResponse<ProductListItemDTO>`) oraz opcjonalnie `SearchResultDTO` dla rozszerzonych wyników z `similarity_score` i `rank`.

Zalecane typy/kontrakty do importu:
- `src/types.ts`: `SearchProductsQuery`, `ProductListResponse`, `SearchResultDTO`

## 4. Przepływ danych

1. Request trafia do Astro Server Endpoint `src/pages/api/v1/search/products.ts`.
2. Endpoint waliduje query params przy pomocy `zod` (wspólne walidatory w `src/lib/utils/validation.ts`).
3. Endpoint konstruuje parametry i wywołuje serwis `src/lib/services/search.service.ts` (nowy) odpowiedzialny za interakcję z Supabase.
   - Serwis korzysta z `context.locals.supabase` (zgodnie z regułami backend/astro) albo z Supabase clienta serwisowego, jeśli wymagane uprawnienia.
   - Jeśli podano `store_id` lub `category_id`, serwis przekazuje je do zapytania SQL lub filtruje wyniki po stronie serwera.
4. Serwis wywołuje SQL function `search_products(search_query, similarity_threshold)` lub wykonuje parametrized SQL z `plainto_tsquery` + `similarity()` jako fallback.
5. Serwis aplikuje paginację (OFFSET / LIMIT) — ograniczyć `per_page` do 100.
6. Endpoint mapuje wynik na `ProductListResponse` (pola `data`, `meta`) i zwraca JSON z kodem 200.

Uwagi implementacyjne:
- Preferuj wykonywanie wyszukiwania po stronie DB (funkcja `search_products`) — lepsza wydajność i wykorzystanie indeksów FTS + pg_trgm.
- Filtry `store_id` i `category_id` najlepiej dorzucić w zapytaniu SQL (WHERE) przed rankingiem, aby nie spowodować błędnej kolejności rankingów.

## 5. Względy bezpieczeństwa

- Uwierzytelnianie/Autoryzacja:
  - Endpoint może być publiczny (anon key) — RLS w Supabase zapewni, że tylko `verified` pages i `active` flyers będą widoczne.

- Walidacja i sanitacja:
  - Walidować `q` długość i typ; limitować `per_page` do 100.
  - Używać parametrized queries; nigdy nie interpolować surowych wartości do SQL.

- Rate limiting:
  - Wprowadzić limit na endpoint (np. 60 req/min per IP lub per client token) — middleware/edge lub reverse-proxy.

## 6. Obsługa błędów

- Kody odpowiedzi:
  - `200` — sukces (z wynikami lub pustą listą)
  - `400` — niepoprawne parametry (np. brak `q`, niepoprawny UUID, `per_page` > 100)
  - `401` — brak autoryzacji (gdy endpoint wymaga auth)
  - `404` — nie ma wyników specyficznych zasobów (np. podany `store_id` nie istnieje) — optional: można zamiast 404 zwrócić 200 z pustą listą
  - `500` — nieoczekiwany błąd serwera

- Scenariusze błędów i obsługa:
  - Walidacja Zod nie przeszła → 400 z ciałem `ApiError` (schema z `src/types.ts`).
  - Błąd DB (timeoout, permission denied) → 500; loguj szczegóły i zwróć uogólniony komunikat użytkownikowi.
  - Wykryty nieistniejący `store_id`/`category_id` → preferować 400 (invalid param) albo 200 z pustą listą; wskazanie w dokumentacji.

## 7. Wydajność

- Ograniczenia:
  - Zastosować `per_page` cap (max 100).
  - Użyć DB-side ranking (`search_products`) by wykorzystać indeksy GIN+pg_trgm i `search_vector`.

- Caching:
  - Cacheować popularne zapytania na poziomie CDN / edge (z uwzględnieniem store_id/category_id) TTL np. 30s–5m.

- Inne optymalizacje:
  - Jeśli wyszukiwanie staje się kosztowne, rozważyć materialized view lub ElasticSearch dla dużych datasetów.
  - Monitorować slow queries i dodać indeksy wg realnych potrzeb.

## 8. Kroki implementacji

1. Utworzyć / zaktualizować TODO (już zainicjowano).
2. Dodać migrację SQL (jeśli nie istnieje): tabela `api_errors` (opcjonalnie) i upewnić dostępność `pg_trgm`.
3. Stworzyć nowy serwis `src/lib/services/search.service.ts`:
   - Funkcja `searchProducts(params: {query:string, storeId?:string, categoryId?:string, similarityThreshold?:number, page:number, perPage:number}, supabase: SupabaseClient)` zwracająca `{data, total}`.
   - Implementacja powinna wywoływać funkcję DB `search_products` lub wykonywać parametrized SQL.
4. Dodać zod schema w `src/lib/utils/validation.ts` lub `src/lib/validators/search.validator.ts`:
   - Walidacja `q` (min 1 char), `page` >=1, `per_page` 1..100, UUID checks dla filtrów.
5. Utworzyć endpoint Astro: `src/pages/api/v1/search/products.ts`:
   - Pobiera `supabase` z `context.locals`, waliduje query, wywołuje `search.service`, mapuje wynik do `ProductListResponse`:
     ```ts
     return new Response(JSON.stringify({ data, meta }), { status: 200 })
     ```
   - Obsługa błędów z odpowiednimi kodami i formatem `ApiError`.
8. Przegląd kodu, uruchomienie linterów i naprawa ewentualnych błędów.

## Dodatkowe wytyczne i przykłady

- Przykład query string:
  - `/api/v1/search/products?q=mas%C5%82o&store_id=<uuid>&page=1&per_page=20`

- Zwracany `meta`:
  - `total`: całkowita liczba hitów (jeżeli możliwe do otrzymania)
  - `page`, `per_page`, `total_pages`

---

Plik ten powinien służyć jako jednoźródłowy przewodnik implementacyjny dla zespołu backendu i frontend-u. Implementacja powinna trzymać się konwencji repozytorium i używać istniejących helpers (`src/lib/utils/validation.ts`) oraz typów (`src/types.ts`).
