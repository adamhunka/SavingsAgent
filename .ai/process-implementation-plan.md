# API Endpoint Implementation Plan: POST /api/v1/jobs/pages/:page_id/process

## 1. Przegląd punktu końcowego

- Cel: Enqueue'ować zadanie przetworzenia pojedynczej strony gazetki (OCR → LLM → ekstrakcja produktów), zwrócić identyfikator zadania oraz status początkowy. Endpoint uruchamia pipeline asynchroniczny; rzeczywiste przetwarzanie wykonuje worker.
- Konsument: panel administracyjny i narzędzia backendowe. Endpoint wymaga uprawnień administratora.

## 2. Szczegóły żądania

- Metoda HTTP: `POST`
- Struktura URL: `/api/v1/jobs/pages/:page_id/process`
- Parametry:
  - Wymagane:
    - `page_id` (path) — UUID strony do przetworzenia.
    - nagłówek autoryzacji (cookie / Authorization) — użytkownik musi być uwierzytelniony i mieć rolę `admin`.
- Request Body (JSON):

```json
{
  "model_hint": "gpt-4o-mini",
  "cost_limit_cents": 500,
  "force": false
}
```

## 3. Wykorzystywane typy (DTO / Command Models)

- Proposed new types (do dodać w `src/types.ts` lub w dedykowanym pliku typów):
  - `CreateJobCommand`:
    - `page_id: string`
    - `model_hint?: string`
    - `cost_limit_cents?: number`
    - `force?: boolean`
    - `requested_by: string` (user id)
  - `JobDTO`:
    - `job_id: string`
    - `page_id: string`
    - `status: 'queued' | 'processing' | 'completed' | 'failed' | 'no_products'`
    - `created_at: string`
    - `started_at?: string`
    - `finished_at?: string`
    - `error_details?: string`
    - `meta?: Record<string, unknown>`

- Reuse existing types where relevant:
  - `PageEntity` / `PageDTO` (z `src/types.ts`) — do sprawdzenia istnienia strony i weryfikacji pól.
  - `StartProcessingCommand` (istnieje) — rozważyć konsolidację nazw lub mapowanie na `CreateJobCommand`.

## 4. Szczegóły odpowiedzi

- 201 Created — utworzono zadanie
  - Body:
  ```json
  {
    "data": {
      "job_id": "uuid",
      "status": "queued",
      "created_at": "2025-12-04T12:34:56Z"
    }
  }
  ```

- 400 Bad Request — walidacja wejścia (nieprawidłowy UUID, cost_limit ujemny itp.)
- 401 Unauthorized — brak uwierzytelnienia
- 403 Forbidden — uwierzytelniony użytkownik nie jest adminem
- 404 Not Found — brak strony o podanym `page_id`
- 500 Internal Server Error — błąd po stronie serwera/DB

## 5. Przepływ danych (end-to-end)

1. API handler:
   - waliduje token i sprawdza rolę `admin` (używając `context.locals.supabase` lub serwisowego sposobu weryfikacji),
   - waliduje `page_id` (UUID) i body (z użyciem `zod`),
   - sprawdza czy `page` istnieje (`SELECT id, processing_status FROM pages WHERE id = :page_id`).
2. Idempotencja i reguły:
   - jeśli `force` = false i istnieje aktywne zadanie (`queued`/`processing`) dla tej strony → zwrócić 409 lub odpowiedź z informacją o istniejącym zadaniu (projekt decyzji: 409 Conflict lub 200 + existing job link). Rekomendacja: zwracać 409 Conflict.
3. Wstawienie rekordu zadania do tabeli `jobs` (nowa tabela) z `status = 'queued'` i metadanymi (`model_hint`, `cost_limit_cents`, `requested_by`).
4. Opcjonalnie: opublikować komunikat do kolejki (Redis, BullMQ, RabbitMQ) albo pole `queued_at` wystarczy, a worker cyklicznie pobiera `queued` jobs z DB.
5. Zwrócić 201 ze `job_id`.
6. Worker:
   - przejmuje `job`, aktualizuje `jobs.status` na `processing` i `jobs.started_at`,
   - wykonuje OCR → ekstrakcję → LLM → buduje produkty,
   - w transakcji aktualizuje `pages.ai_raw_response`, `pages.processing_status` oraz tworzy/aktualizuje wiersze w `products`.
   - jeśli brak produktów → ustawić `pages.processing_status = 'no_products'` i `jobs.status = 'completed'` (lub `no_products`).
   - w przypadku błędu → zapisać `jobs.error_details`, `pages.error_details` i `jobs.status = 'failed'`.

## 6. Względy bezpieczeństwa

- Uwierzytelnianie:
  - Endpoint dostępny tylko dla zalogowanych użytkowników z rolą `admin`.
  - Używać `context.locals.supabase` dla dostępu do sesji i autoryzacji po stronie serwera.
- Autoryzacja:
  - Sprawdzenie waszej tabeli `profiles` (rola `admin`) przy każdym wywołaniu.
- Ochrona danych:
  - Walidacja wejścia z `zod`.
  - Rate limiting per admin user i per page (zapobiega spamowi).

## 7. Obsługa błędów i logowanie

- Poziomy błędów:
  - Walidacyjne (400) — zwrócić szczegóły błędów (pole `details`) z `zod`.
  - Autoryzacja (401 / 403) — krótki komunikat bez wewnętrznych detali.
  - Not found (404) — gdy `page` nie istnieje.
  - Konflikt (409) — gdy zadanie już istnieje i `force=false`.
  - Server (500) — logować szczegóły po stronie serwera.
- Persistowanie błędów:
  - Page-level diagnostics: `pages.error_details` (istnieje już) — worker lub API może zapisywać te informacje.

## 8. Wydajność i skalowalność

- Krótkie:
  - Enqueueing jest szybkie: jedna INSERT do `jobs` (z indeksami na `page_id`, `status`, `queued_at`).
  - Worker(y) przetwarzają asynchronicznie (poza request-response).
- Rozważenia:
  - Stosować limit jednoczesnych przetwarzań na stronę / na konto by zapobiec przeciążeniu OCR/LLM.
  - Indeksować `jobs(status, queued_at)` by worker szybko znajdował zadania.
  - Paginacja / batch processing dla masowych operacji (nie dotyczy pojedynczego endpointu).
  - Cache wyników, jeśli UI wielokrotnie pyta o status (GET /api/v1/jobs/:job_id/status).

## 9. Potencjalne scenariusze błędów i mapowanie kodów statusu

- 400 Bad Request:
  - Nieprawidłowy `page_id` (nie UUID)
  - `cost_limit_cents` nie jest liczbą dodatnią
  - nieprawidłowy body JSON
- 401 Unauthorized:
  - Brak sesji / tokenu
- 403 Forbidden:
  - Uwierzytelniony użytkownik nie jest adminem
- 404 Not Found:
  - `page` o podanym `page_id` nie istnieje
- 409 Conflict:
  - Istnieje już aktywne zadanie dla tej strony i `force=false`
- 201 Created:
  - Zadanie poprawnie utworzone
- 500 Internal Server Error:
  - Błąd zapisu do DB, błąd serializacji, problem z infrastrukturą kolejki

## 10. Kroki implementacji (szczegółowy plan)

1. Migracja DB:
   - Dodać migrację tworzącą tabelę `jobs`:
     - kolumny: `id UUID PK DEFAULT gen_random_uuid()`, `page_id UUID REFERENCES pages(id) ON DELETE CASCADE`, `status TEXT` (enum lub TEXT), `model_hint TEXT`, `cost_limit_cents INTEGER`, `requested_by UUID`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `queued_at TIMESTAMPTZ`, `started_at TIMESTAMPTZ`, `finished_at TIMESTAMPTZ`, `error_details JSONB`, `meta JSONB`.
   - Dodać indeksy: `idx_jobs_status_queued_at`, `idx_jobs_page_id`.
2. Typy:
   - Dodać `JobEntity`, `CreateJobCommand`, `JobDTO` w `src/types.ts` lub `src/db/` typach.
3. Service:
   - Utworzyć `src/lib/services/jobs.service.ts` z funkcjami:
     - `createJob(command: CreateJobCommand): Promise<JobDTO>`
     - `getJob(jobId: string): Promise<JobDTO | null>`
   - Service używa `context.locals.supabase` w API handlerze lub wewnętrznego klienta DB (Service Role w workerze).
4. API Route:
   - Dodać plik: `src/pages/api/v1/jobs/pages/[page_id]/process.ts`
   - Handler:
     - `export const prerender = false`
     - `POST` handler: walidacja `page_id` (path), parsowanie body z `zod`.
     - Sprawdzenie sesji i roli admin (`context.locals.supabase`).
     - Sprawdzenie istnienia `page` (SELECT).
     - Wywołanie `jobs.service.createJob(...)`.
     - Zwrócenie `201` z utworzonym `job_id` i `status`.
5. Worker (jeśli jeszcze nie istnieje):
   - Implementacja worker'a / konsumenta kolejki, który:
     - pobiera `queued` jobs, ustawia `processing`, wykonuje pipeline OCR→LLM→ekstrakcja,
     - w transakcji aktualizuje `pages` i `products`, uzupełnia `jobs.finished_at` i `jobs.status`.
6. Walidacja i testy:
   - Zod schema dla request body
   - Testy integracyjne dla:
     - tworzenia zadania (szczęśliwy przebieg)
     - brak uprawnień (401/403)
     - nieistniejący `page_id` (404)
     - konflikt gdy już istnieje zadanie (409)
7. Monitorowanie i alertowanie:
   - Instrumentować błędy do Sentry / innego loggera
   - Dodać metryki: `jobs_created_total`, `jobs_failed_total`, `job_processing_time_histogram`
8. Dokumentacja:
   - Uaktualnić `api-plan.md` i README developerów z opisem endpointu, formatem body, ograniczeniami kosztów i przykładami.

## 11. Dodatkowe uwagi implementacyjne

- Zgodnie z zasadami projektu:
  - Używać `zod` na endpointach.
  - Używać `context.locals.supabase` zamiast importu globalnego SupabaseClient w handlerach Astro.
  - `export const prerender = false` dla endpointu.
  - Zachować solidną obsługę błędów i early returns.
- Idempotencja: rekomendacja w dłuższej perspektywie dodać deduplikację po hash’u obrazu lub `image_path` jeśli multiple requests mogą trafić dla tej samej zasady.

---

Plik przygotowany jako plan wdrożenia endpointu: `POST /api/v1/jobs/pages/:page_id/process`. Implementacja powinna rozpocząć się od migracji DB i dodania typów, następnie serwisu i endpointu, a na końcu worker + testy oraz monitoring.


