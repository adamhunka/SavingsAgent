# API Endpoint Implementation Plan: Products endpoints

## 1. Przegląd punktu końcowego

Cel: Dostarczyć kompletne, bezpieczne i wydajne API dla zarządzania i odczytu ofert produktowych wydobytych z gazetek (products). Plan obejmuje: publiczne listowanie produktów (`GET /api/v1/products`), szczegóły produktu (`GET /api/v1/products/:id`) oraz operacje administracyjne: tworzenie produktu (`POST /api/v1/pages/:page_id/products`), aktualizacja (`PATCH /api/v1/products/:id`) i usuwanie (`DELETE /api/v1/products/:id`).

Założenia techniczne:
- Backend: Supabase (Postgres + Storage + Auth)
- Runtime: Astro server endpoints (TS)
- Validation: Zod
- Services: logika wyodrębniona do `src/lib/services/products.service.ts`
- Typy: `src/types.ts` (ProductDTO, ProductListItemDTO, ProductDetailDTO, CreateProductCommand, UpdateProductCommand)


## 2. Szczegóły żądania

- Metoda HTTP: GET (lista), GET (detail), POST (create), PATCH (update), DELETE (delete)
- Struktura URL:
  - Lista: `GET /api/v1/products`
  - Szczegóły: `GET /api/v1/products/:id`
  - Create (admin): `POST /api/v1/pages/:page_id/products`
  - Update (admin): `PATCH /api/v1/products/:id`
  - Delete (admin): `DELETE /api/v1/products/:id`

- Parametry (lista - `GET /api/v1/products`):
  - Wymagane: brak (public listing)
  - Opcjonalne:
    - `store_id` (UUID) — filtr sklepu
    - `category_id` (UUID) — filtr kategorii
    - `q` (string) — zapytanie wyszukiwania (FTS + trigram fallback)
    - `min_price` (number) — minimalna cena promocyjna
    - `max_price` (number) — maksymalna cena promocyjna
    - `sort` (string) — `price_asc`, `price_desc`, `created_at_desc` (domyślnie `created_at_desc`)
    - `page` (integer, 1-indexed) — numer strony
    - `per_page` (integer) — liczba rekordów na stronę (max cap, np. 100)
    - `similarity_threshold` (float, optional) — dla trigram fallback

- Request Body (create/update):
  - `POST /api/v1/pages/:page_id/products` (CreateProductCommand):
    - `category_id` (UUID) — REQUIRED
    - `name` (string) — REQUIRED
    - `price_promo` (number) — REQUIRED, > 0
    - `price_regular` (number | null) — optional, if present >= price_promo
    - `description` (string | null) — optional
    - `conditions` (string | null) — optional
    - `bounding_box` (object | null) — optional { x, y, width, height }

  - `PATCH /api/v1/products/:id` (UpdateProductCommand): any updatable fields except `id`, `page_id`, `created_at`, `updated_at`, `search_vector`.


## 3. Wykorzystywane typy

- DTOs i Command Modele (z `src/types.ts`):
  - `ProductListItemDTO` (lista z `v_active_products`)
  - `ProductDetailDTO` (szczegóły produktu)
  - `ProductDTO`
  - `CreateProductCommand`
  - `UpdateProductCommand`


## 4. Szczegóły odpowiedzi

- `GET /api/v1/products` (200):
  - Body: `ProductListResponse` — { data: ProductListItemDTO[], meta: PaginationMeta }

- `GET /api/v1/products/:id` (200):
  - Body: `ProductDetailResponse` — { data: ProductDetailDTO }

- `POST /api/v1/pages/:page_id/products` (201 - admin):
  - Body: created `ProductDTO`

- `PATCH /api/v1/products/:id` (200 - admin):
  - Body: updated `ProductDTO`

- `DELETE /api/v1/products/:id` (204 - admin):
  - No content

- Error codes used globally:
  - 400 — invalid input / validation errors
  - 401 — unauthorized (missing/invalid auth)
  - 403 — forbidden (authenticated but lacks admin role)
  - 404 — resource not found
  - 500 — server error


## 5. Przepływ danych

1. Ingress: Astro server endpoint receives request; extract query, params, auth from `context`.
2. Validation: Input validated with Zod schemas in `src/lib/utils/validation.ts`.
3. AuthN/AuthZ: Use Supabase auth via `context.locals.supabase` (or `supabase` from request context) to obtain `user.id`; load `profiles` role or use JWT claims. For admin operations, verify `profiles.role === 'admin'`.
4. Service layer: All DB interactions via new `src/lib/services/products.service.ts`.
   - `listProducts(opts)` uses view `v_active_products` with filters, FTS query or trigram fallback (call DB functions or raw SQL). Apply pagination and sorting.
   - `getProductById(id)` selects from `products` JOIN `pages`/`flyers`/`stores`/`categories` to assemble `ProductDetailDTO`.
   - `createProduct(pageId, payload, actorId)` inserts into `products` (validate page exists, category exists) and returns created product.
   - `updateProduct(id, payload, actorId)` updates allowed fields, relies on DB triggers to refresh `search_vector`.
   - `deleteProduct(id)` deletes product row.
5. Response shaping: Service returns DTOs. Endpoints map to `ApiResponse`/`ApiListResponse` types.
6. Logging & Errors: Validation errors return 400. Unexpected errors logged and reported as 500. Optionally persist structured errors to `api_errors` table (recommended).


## 6. Walidacja danych wejściowych

- Implementować Zod schemas in `src/lib/utils/validation.ts` and reuse across endpoints.
  - `ListProductsQuerySchema` — validate numeric, UUIDs, range, page/per_page bounds, allowed sort values.
  - `CreateProductSchema` — requires `category_id`, `name`, `price_promo` > 0, `price_regular` == null or >= `price_promo`. Validate `bounding_box` structure when present.
  - `UpdateProductSchema` — same constraints for updated fields.

- Business checks (service layer):
  - `page_id` must exist and belong to a flyer (for create)
  - `category_id` must exist
  - `price` invariants: `price_promo > 0`, `price_regular == null OR >= price_promo`



## 8. Względy bezpieczeństwa

- Autentykacja: używać Supabase JWT / session z `context.locals.supabase.auth.getUser()` lub `auth.getSession()` zależnie od integracji.
- Autoryzacja: wszystkie operacje mutujące (POST/PATCH/DELETE) wymagają roli `admin` w `profiles` (sprawdzanie w service / endpoint).
- Input validation: blokować nieoczekiwane pola; użyć Zod to strict parsing.
- RLS: rely on DB RLS policies (already designed) for extra enforcement; service uses service role key only server-side when needed.
- Rate limiting: dodać per-IP rate limit for heavy endpoints (search) to avoid abuse.
- Storage: bounding_box must be sanitized; do not store executable content.



## 10. Rozważania wydajności

- Używać widoku `v_active_products` dla listowania — upraszcza i korzysta z indeksów.
- Limituj `per_page` (e.g., max 100) i wymuszaj `OFFSET`/`LIMIT` lub kursory (cursor pagination preferred for large datasets).
- Wyszukiwanie: preferuj FTS + trigram indices (`pg_trgm`) już skonfigurowane. Używaj `similarity_threshold` per-request.
- Cache warstwy: rozważyć in-memory cache (Redis) dla często zapytań (top products, category counts) i Cache-Control headers dla CDN.
- Avoid N+1: prejoin stores/categories in service queries.


## 11. Kroki implementacji

1. Utworzyć TODOs i przypisać zadania (already created).
2. Dodać/uzupełnić Zod schemas w `src/lib/utils/validation.ts`:
   - `ListProductsQuerySchema`, `CreateProductSchema`, `UpdateProductSchema`.
3. Stworzyć `src/lib/services/products.service.ts` z funkcjami: `listProducts`, `getProductById`, `createProduct`, `updateProduct`, `deleteProduct`. Użyć Supabase client z `context.locals` w endpointach, ale przyjmować `supabase` jako zależność w service for testability.
4. Utworzyć/zmodyfikować Astro endpoints:
   - `src/pages/api/v1/products.ts` (GET list)
   - `src/pages/api/v1/products/[id].ts` (GET, PATCH, DELETE)
   - `src/pages/api/v1/pages/[page_id]/products.ts` (POST create)
   Każdy endpoint: waliduj dane wejściowe (Zod), sprawdź autoryzację, wywołaj serwis, przemapuj wynik na DTO i zwróć jako ApiResponse.
7. Dodaj middleware limitujący liczbę zapytań (rate limiting) dla endpointów intensywnie wykorzystywanych do wyszukiwania.
8. Przejrzyj polityki RLS i przetestuj z kontami admin/użytkownik, aby upewnić się, że dostęp działa prawidłowo.
9. Uruchom linter i napraw wszelkie błędy TypeScript, następnie uruchom `read_lints`, aby potwierdzić brak nowych błędów.


---

Notes:
- Preferuj paginację opartą na kursorze dla lepszej skalowalności przy dużych zbiorach danych, ale na potrzeby MVP zaimplementuj OFFSET/LIMIT.
- Upewnij się, że wektor wyszukiwania (`search_vector`) jest aktualizowany przez triggery bazy danych; serwis nie powinien zarządzać tym ręcznie.
