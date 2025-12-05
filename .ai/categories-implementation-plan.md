# API Endpoint Implementation Plan: Categories

## 1. Przegląd punktu końcowego
Kategoria to słownikowy obiekt używany w produktach promocyjnych; API oferuje publiczny listę i zestaw operacji administracyjnych (tworzenie/aktualizacja/usuwanie) z zachowaniem integralności danych (RESTRICT w bazie).

## 2. Szczegóły żądania
- Metody HTTP: `GET`, `POST`, `PATCH`, `DELETE`
- Struktura URL:
  - `GET /api/v1/categories`
  - `POST /api/v1/categories`
  - `PATCH /api/v1/categories/:id`
  - `DELETE /api/v1/categories/:id`
- Parametry:
  - Wymagane:
    - `:id` w ścieżce dla `PATCH` i `DELETE`
    - W ciele `POST`: `name`, `icon_name`
    - W ciele `PATCH`: co najmniej jedno z `name`, `icon_name`, `display_order`
  - Opcjonalne:
    - `display_order` (POST/PATCH)
    - `?sort=display_order` (GET) – walidować tylko tę wartość; fallback do domyślnej kolejności (np. `display_order asc`).
- Request Body:
  - `POST`: `{ name: string; icon_name: string; display_order?: number }`
  - `PATCH`: subset pól `{ name?: string; icon_name?: string; display_order?: number }`

## 3. Szczegóły odpowiedzi
- Typy:
  - `CategoryDTO` dla listy i pojedynczych odpowiedzi (usuwa timestamps).
  - `ApiListResponse<CategoryDTO>` dla GET list.
  - `ApiResponse<CategoryDTO>` lub status bez ciała (204) dla mutacji, w zależności od decyzji.
- Kody statusu:
  - `200` – GET lista kategorii.
  - `201` – udane utworzenie (`POST`).
  - `200` – udana aktualizacja (`PATCH`).
  - `204` – udane usunięcie bez treści (`DELETE`), lub `200` z potwierdzeniem.
  - `400` – błędna walidacja danych wejściowych.
  - `401` – brak autoryzacji/nieadmin.
  - `404` – brak kategorii o podanym `id`.
  - `409` – konflikt przy usuwaniu (istnieją powiązane produkty) lub duplikacja `name`.
  - `500` – nieoczekiwane błędy serwera.

## 4. Przepływ danych
1. Middleware Astro (np. `src/middleware/index.ts`) wyciąga `supabase` i `session`, przekazuje do handlera endpointa (z `context.locals.supabase`).
2. Mutacje delegować do `src/lib/services/categories.service.ts`, który:
   - Używa `supabase` z kontekstu.
   - Sprawdza rolę użytkownika (`profiles.role = 'admin'`) przed `POST/PATCH/DELETE`.
   - Dla `GET` robi query z `select` i `order(display_order)`.
   - Dla `POST` wykonuje `upsert` po weryfikacji unikalności `name`.
   - Dla `PATCH` pobiera kategorię, aplikuje pola i updatuje.
   - Dla `DELETE` sprawdza `products` (`supabase.from('products').select('id').eq('category_id', id).limit(1)`); jeśli istnieją, rzuca `ApiError` 409; w przeciwnym razie usuwa kategorię.
3. Logika walidacji (Zod) wykonywana przed wywołaniem service: schema `CreateCategoryCommand`, `UpdateCategoryCommand`.
4. Błędy mapowane na `ApiError` i przepisywane do wspólnego loggera (`src/lib/utils/errors.ts`), ewentualnie zapis do dedykowanej tabeli błędów/audytu.

## 5. Względy bezpieczeństwa
- Autoryzacja: tylko admin może mutować; `GET` publiczny.
- Walidacja: Zod zabezpiecza przed nieprawidłową strukturą i typami.
- RLS: Supabase już ma polityki (tylko admin do `categories` FOR ALL). Endpoint musi używać `context.locals.supabase` i nie ignorować RLS.
- Unikanie duplikacji: dodatkowe sprawdzenie `name` przed insert (lub bazowe ograniczenie unikalności) i odpowiedni handling 409.
- SQL injection: supabase client używa parametrów, a schema waliduje typy.
- Logging: błędy rejestrowane w `errors` (jeśli istnieje) lub w standardowym loggerze, z zachowaniem informacji o sesji (user id, role).

## 6. Obsługa błędów
- `400`: Zod zwraca listę walidacji (np. brak `name`, `icon_name`, `display_order` poza zakresem). Również niepoprawny `sort`.
- `401`: brak sesji lub roli admin w mutacjach.
- `404`: `PATCH`/`DELETE` z nieistniejącym `id`.
- `409`: konflikt duplikacji `name`, próba usunięcia kategorii powiązanej z produktami.
- `500`: nieprzewidziane wyjątki (loggowanie stack trace, zwracanie `ApiError` z `code: "internal_error"`).
- Dodatkowe: błędny `display_order` w `PATCH` (np. ujemna wartość) jako `400`.

## 7. Rozważania dotyczące wydajności
- GET listy powinno paginować w przyszłości (łatwo dodać `limit/offset`), obecnie sortowanie po indeksowanym `display_order`.
- Indeks na `categories(name)` i `display_order` (już w DB planie) zapewnia szybkie wyszukiwanie i sort.
- Mutacje powinny używać pojedynczych zapytań z `select` ograniczonym do niezbędnych pól (np. `select: 'id'` przy sprawdzaniu powiązanych produktów).
- W razie potrzeby cache’ować listę kategorii po stronie frontu (nie w API) ze względu na słowniki.

## 8. Kroki implementacji
1. Zdefiniować Zod schematy dla `CreateCategoryCommand` i `UpdateCategoryCommand` (np. w `src/lib/schemas/categories.schema.ts`).
2. Utworzyć `categories.service.ts` w `src/lib/services`, obsługujący listę, tworzenie, aktualizację i usuwanie z logiką sprawdzania roli i konfliktów.
3. Zaimplementować endpointy w `src/pages/api/v1/categories.ts` (lub rozbić na pojedyncze pliki) używając Astro endpointów (`export const POST`, `GET`, etc.) i `context.locals.supabase`.
4. W handlerach stosować Zod do walidacji, przetwarzać błędy na `ApiError` z `code`/`message` i zwracać odpowiednie statusy.
5. Upewnić się, że mutacje sprawdzają rolę admina (np. `await service.assertAdmin(session)`).

## Plan zapisany w
- `.ai/categories-implementation-plan.md` (ten plik).

