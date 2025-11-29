# API Endpoint Implementation Plan: Stores

## 1. Przegląd punktu końcowego

- **Cel**: udostępnić publiczny katalog sklepów (`stores`) z podstawowymi danymi (GET) oraz umożliwić administratorom tworzenie nowych sklepów (POST).
- **Zakres**: `GET /api/v1/stores` (publiczne, paginowane, z filtrem `q`) i `POST /api/v1/stores` (admin, walidacja, ochrona konfliktów wartości unikalnych).
- **Oczekiwane kody**: 200 (GET), 201 (POST), 400/401/409/500 w błędnych scenariuszach.

## 2. Szczegóły żądania

- **Metoda HTTP**: GET, POST
- **Ścieżka**: `/api/v1/stores`
- **Nagłówki**:
  - `GET`: opcjonalny `Authorization` z anon key (publiczne RLS) lub JWT.
  - `POST`: obowiązkowy `Authorization: Bearer <token>` z profilem admina.
- **Parametry**:
  - **Wymagane**: brak w GET; w POST `name` w body.
  - **Opcjonalne**:
    - GET: `q` (tekst do wyszukiwania nazwy), `page` (≥1), `limit` (≤100, domyślnie 20).
    - POST: `logo_url` (string), `created_at / updated_at` ignorowane (generowane po stronie bazy).
- **Body** (`POST`): zgodne z `CreateStoreCommand` → `{ name: string; logo_url?: string }`.

## 3. Szczegóły odpowiedzi

- **Używane typy**:
  - `StoreDTO` – minimalny widok sklepu (`id`, `name`, `logo_url`).
  - `StoresListResponse` – `ApiListResponse<StoreDTO>` z `meta`.
  - `CreateStoreCommand` – body POST (`name`, opcjonalnie `logo_url`).
  - `ApiError` – format błędów (`code`, `message`, `details`).

- **GET**
  - Ciało: `{ data: StoreDTO[]; meta: PaginationMeta }`.
  - Kody: 200 (poprawna lista), 400 (nieprawidłowe query), 500 (błąd serwera).
- **POST**
  - Ciało: `StoreDTO` z polami `id`, `name`, `logo_url`, `created_at` (opcjonalnie `updated_at` jeśli przekazano).
  - Kody: 201 (utworzono), 400 (walidacja), 401 (brak/niepoprawny token albo brak admina), 409 (nazwa już istnieje), 500 (błąd bazy).
- **Błędy**: w formacie `ApiError`.

## 4. Przepływ danych

1. **GET**: Astro API route (`src/pages/api/v1/stores.ts`) odbiera query → walidacja `zod` → przekazuje parametry do `storesService.list` (w `src/lib/services/stores.service.ts`), który używa `context.locals.supabase` do zapytania `supabase.from("stores")`, stosuje filter `ilike('name', %q%)`, `range` na `page`/`limit` i zwraca `data` + `count`. Route formatuje w `StoresListResponse`, zwraca 200.
2. **POST**: ta sama ruta odczytuje body → weryfikuje roszczenia `context.locals.profile` i `role === 'admin'` → `storesService.create` waliduje unikalność nazwy (np. `select("id").eq("name", name)`), wykonuje `insert` w tabeli `stores`, łapie konflikt z constraint (kod `PGRST116` lub `duplicate key value`), loguje ewentualny komunikat i rzuca odpowiedni `ApiError`.

## 5. Względy bezpieczeństwa

- **Uwierzytelnianie**: JWT z Supabase; `POST` wymaga tokena admina (rola `profiles.role`).
- **Autoryzacja**: sprawdzenie `context.locals.profile?.role` przed próbą utworzenia sklepu.
- **RLS**: `stores` ma polityki publiczne do odczytu, ale modyfikacje tylko dla admina (po stronie RLS i w kodzie).
- **Walidacja danych**: `zod` na inputy i query eliminuje wstrzyknięcia; `logo_url` sprawdzany jako URL/ścieżka (opcjonalnie regex).
- **Ochrona przed nadużyciami**: limit `limit <= 100`, `page >= 1`; `q` cięte do 50 znaków; logowanie prób tworzenia duplikatów w audycie.

## 6. Obsługa błędów

- **400**: format query/body nie przechodzi `zod`.
- **401**: brak JWT lub nie-admin w `POST`.
- **409**: `name` już istnieje — przechwycić błąd Supabase (unique constraint) i zwrócić `ApiError` z kodem np. `STORE_DUPLICATE_NAME`.
- **500**: dowolny błąd Supabase lub niespodziewany wyjątek → logowanie (np. `logError("stores", err, { ctx: "create" })`) i `ApiError` z odpowiednim message. Brak dedykowanej tabeli błędów, więc wysyłamy log do `src/lib/logging`.

## 7. Wydajność

- **Paginated queries**: wykorzystać `range` w Supabase zamiast `limit`/`offset` ręcznie (db zapewnia).
- **Indeksy**: `stores(name)` ma indeks unikatowy (zapewniając search szybciej). `q` w query mapowany na `ilike` lub „fts” – w przypadku większych danych można dodać trigram i full-text.
- **Caching**: rozważyć cache (np. CDN) dla GET w frontendzie; w API ustawić krótkie TTL w nagłówku `Cache-Control: public, max-age=60`.
- **Obciążenie tworzenia**: walidacja i unikalny check od razu odrzuca duplikaty, ograniczając transakcje.

## 8. Kroki implementacji

1. Zdefiniować `zod` schematy dla GET query (`q`, `page`, `limit`) oraz POST body (`CreateStoreCommand`).
2. Utworzyć `storesService` w `src/lib/services` z metodami `list(params)` i `create(command, profile)`, przyjmując `SupabaseClient`.
3. W API route `src/pages/api/v1/stores.ts` obsłużyć GET/POST, wstrzykiwać `supabase` z `context.locals`, wywoływać serwis, mapować odpowiedzi na `ApiListResponse`/`StoreDTO`.
4. W metodzie POST sprawdzić `context.locals.profile?.role === "admin"` i obsłużyć błędy konfliktów, złożone poprzez `ApiError`.
