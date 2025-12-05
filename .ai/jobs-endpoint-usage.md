# Dokumentacja Użycia: POST /api/v1/jobs/pages/:page_id/process

## Przegląd

Endpoint do tworzenia zadań przetwarzania stron gazetek. Inicjuje asynchroniczny pipeline:  
OCR → LLM → Ekstrakcja produktów.

## ⚙️ Pierwsze Uruchomienie

### 1. Uruchomienie Migracji DB

Przed użyciem endpointu, musisz uruchomić migrację tworzącą tabelę `jobs`:

```bash
# Opcja 1: Lokalne środowisko (zalecane dla development)
supabase start
supabase db reset

# Opcja 2: Produkcja / Remote
supabase db push
```

### 2. Regeneracja Typów TypeScript

Po uruchomieniu migracji, wygeneruj typy dla TypeScript:

```bash
supabase gen types typescript --local > src/db/database.types.ts
```

### 3. Weryfikacja

Sprawdź czy tabela `jobs` została utworzona:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'jobs';
```

Sprawdź czy enum `job_status` istnieje:

```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'job_status'::regtype;
```

---

## 🚀 Użycie Endpointu

### Request

**Metoda:** `POST`  
**URL:** `/api/v1/jobs/pages/:page_id/process`  
**Autoryzacja:** Bearer Token (tylko admin)

### Parametry Path

| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `page_id` | UUID | ✅ | ID strony do przetworzenia |

### Request Body

| Pole | Typ | Wymagany | Domyślna | Opis |
|------|-----|----------|----------|------|
| `model_hint` | string | ❌ | - | Wskazówka dla modelu LLM (np. 'gpt-4o-mini') |
| `cost_limit_cents` | number | ❌ | - | Limit kosztów w centach (> 0) |
| `force` | boolean | ❌ | false | Czy utworzyć zadanie nawet jeśli istnieje już aktywne |

### Przykład Requestu

```bash
curl -X POST http://localhost:4321/api/v1/jobs/pages/550e8400-e29b-41d4-a716-446655440000/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_hint": "gpt-4o-mini",
    "cost_limit_cents": 500,
    "force": false
  }'
```

### Odpowiedzi

#### ✅ 201 Created - Zadanie utworzone

```json
{
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "page_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
    "created_at": "2025-12-04T12:34:56Z",
    "started_at": null,
    "finished_at": null,
    "error_details": null,
    "meta": null
  }
}
```

#### ❌ 400 Bad Request - Nieprawidłowe dane

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nieprawidłowe dane wejściowe",
    "details": {
      "cost_limit_cents": ["Limit kosztów musi być liczbą dodatnią"]
    }
  }
}
```

#### ❌ 401 Unauthorized - Brak autoryzacji

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Brak tokenu autoryzacji"
  }
}
```

#### ❌ 403 Forbidden - Brak uprawnień

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Brak uprawnień do wykonywania tej akcji"
  }
}
```

#### ❌ 404 Not Found - Strona nie znaleziona

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Strona o ID \"550e8400-e29b-41d4-a716-446655440000\" nie została znaleziona"
  }
}
```

#### ❌ 409 Conflict - Istnieje już aktywne zadanie

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Dla strony o ID \"550e8400-e29b-41d4-a716-446655440000\" istnieje już aktywne zadanie (queued). Użyj force=true aby utworzyć nowe zadanie."
  }
}
```

#### ❌ 500 Internal Server Error - Błąd serwera

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Wystąpił nieoczekiwany błąd podczas tworzenia zadania"
  }
}
```

---

## 📊 Statusy Zadań

| Status | Opis |
|--------|------|
| `queued` | Zadanie w kolejce, oczekuje na worker |
| `processing` | Worker aktywnie przetwarza zadanie |
| `completed` | Zadanie zakończone pomyślnie |
| `failed` | Zadanie zakończone błędem |
| `no_products` | Zadanie zakończone, ale nie znaleziono produktów |

---

## 🔧 Testowanie

### 1. Przygotuj dane testowe

```sql
-- Utwórz testową gazetkę i stronę (jeśli nie istnieją)
INSERT INTO flyers (id, store_id, valid_from, valid_to, status)
VALUES ('550e8400-e29b-41d4-a716-446655440000', (SELECT id FROM stores LIMIT 1), NOW(), NOW() + INTERVAL '7 days', 'active');

INSERT INTO pages (id, flyer_id, page_number, image_path)
VALUES ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 1, 'test/page_1.jpg');
```

### 2. Zarejestruj użytkownika i nadaj rolę admin

```sql
-- Znajdź ID użytkownika
SELECT id, email FROM auth.users;

-- Nadaj rolę admin
UPDATE profiles SET role = 'admin' WHERE id = 'USER_UUID';
```

### 3. Uzyskaj Bearer Token

Zaloguj się przez aplikację lub użyj Supabase Auth API:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

### 4. Testuj endpoint

```bash
# Test 1: Utworzenie zadania (szczęśliwy przebieg)
curl -X POST http://localhost:4321/api/v1/jobs/pages/550e8400-e29b-41d4-a716-446655440001/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test 2: Próba utworzenia drugiego zadania bez force (409 Conflict)
curl -X POST http://localhost:4321/api/v1/jobs/pages/550e8400-e29b-41d4-a716-446655440001/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": false}'

# Test 3: Utworzenie zadania z force=true
curl -X POST http://localhost:4321/api/v1/jobs/pages/550e8400-e29b-41d4-a716-446655440001/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": true, "cost_limit_cents": 1000}'

# Test 4: Nieprawidłowy UUID (400 Bad Request)
curl -X POST http://localhost:4321/api/v1/jobs/pages/invalid-uuid/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test 5: Nieistniejący page_id (404 Not Found)
curl -X POST http://localhost:4321/api/v1/jobs/pages/00000000-0000-0000-0000-000000000000/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Test 6: Brak tokenu (401 Unauthorized)
curl -X POST http://localhost:4321/api/v1/jobs/pages/550e8400-e29b-41d4-a716-446655440001/process \
  -H "Content-Type: application/json" \
  -d '{}'

# Test 7: Użytkownik bez roli admin (403 Forbidden)
# (użyj tokenu użytkownika z rolą 'user')
```

---

## 🛠️ Integracja z Workerem

Worker (nie zaimplementowany w tym etapie) powinien:

1. Pobrać następne zadanie z kolejki:
```typescript
const jobService = new JobService(supabaseServiceClient);
const job = await jobService.getNextQueuedJob();
```

2. Zaktualizować status na `processing`:
```typescript
await jobService.updateJobStatus(job.id, 'processing', {
  started_at: new Date().toISOString()
});
```

3. Wykonać pipeline (OCR → LLM → ekstrakcja)

4. Zaktualizować status na `completed` lub `failed`:
```typescript
// Sukces
await jobService.updateJobStatus(job.id, 'completed', {
  finished_at: new Date().toISOString(),
  meta: { tokens_used: 1234, cost_cents: 45 }
});

// Błąd
await jobService.updateJobStatus(job.id, 'failed', {
  finished_at: new Date().toISOString(),
  error_details: { error_type: 'ocr_failed', message: '...' }
});
```

---

## 📝 Struktura Plików

```
/supabase/migrations/
  └── 20251204000000_create_jobs_table.sql    # Migracja DB

/src/types.ts                                  # Typy (JobEntity, JobDTO, CreateJobCommand)

/src/lib/utils/validation.ts                   # Schemat Zod (CreateJobRequestSchema)

/src/lib/services/jobs.service.ts              # Logika biznesowa

/src/pages/api/v1/jobs/pages/[page_id]/
  └── process.ts                               # API endpoint
```

---

## ⚠️ Uwagi Implementacyjne

1. **Idempotencja**: Endpoint sprawdza czy nie istnieje już aktywne zadanie dla strony (queued/processing). Użyj `force=true` aby pominąć to sprawdzenie.

2. **Autoryzacja**: Endpoint wymaga tokenu Bearer i roli `admin`. Token jest weryfikowany przy każdym wywołaniu.

3. **Koszty**: `cost_limit_cents` to opcjonalny parametr do kontroli kosztów API LLM. Worker powinien sprawdzać ten limit przed wykonaniem operacji.

4. **Błędy**: Wszystkie błędy zwracają strukturę `ApiError` z kodem, komunikatem i opcjonalnymi szczegółami.

5. **Cache**: Response ma nagłówek `Cache-Control: no-store` aby uniknąć cachowania.

6. **Location Header**: W odpowiedzi 201 zwracany jest nagłówek `Location` wskazujący na przyszły endpoint `/api/v1/jobs/:job_id`.

---

## 🔍 Monitorowanie

Aby sprawdzić status zadań w bazie danych:

```sql
-- Wszystkie zadania
SELECT id, page_id, status, created_at, started_at, finished_at 
FROM jobs 
ORDER BY created_at DESC 
LIMIT 10;

-- Aktywne zadania
SELECT id, page_id, status, created_at 
FROM jobs 
WHERE status IN ('queued', 'processing')
ORDER BY queued_at ASC;

-- Zadania z błędami
SELECT id, page_id, error_details, finished_at 
FROM jobs 
WHERE status = 'failed'
ORDER BY finished_at DESC;

-- Statystyki zadań
SELECT 
  status, 
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (finished_at - started_at))) as avg_duration_seconds
FROM jobs
WHERE finished_at IS NOT NULL
GROUP BY status;
```

---

## ✅ Checklist Wdrożenia

- [x] Migracja DB utworzona
- [x] Typy TypeScript dodane
- [x] Walidacja Zod zaimplementowana
- [x] Serwis JobService utworzony
- [x] API endpoint zaimplementowany
- [x] Obsługa błędów kompletna
- [ ] Migracja DB uruchomiona (użytkownik musi wykonać)
- [ ] Typy TS wygenerowane (użytkownik musi wykonać)
- [ ] Worker zaimplementowany (przyszły etap)
- [ ] Testy end-to-end (przyszły etap)
- [ ] Monitoring i alerty (przyszły etap)

---

**Data utworzenia:** 2025-12-04  
**Autor:** SavingsAgent Development Team

