# Migracje Bazy Danych - SavingsAgent

## Przegląd

Ten folder zawiera migracje Supabase dla pełnego schematu bazy danych SavingsAgent. Migracje są wykonywane sekwencyjnie według znaczników czasu w nazwach plików.

## Lista Migracji

### 1. `20251126120000_init_schema.sql`
**Cel:** Inicjalizacja podstawowego schematu bazy danych

**Zawiera:**
- Rozszerzenia PostgreSQL (pg_trgm)
- Typy ENUM (user_role, flyer_status, page_processing_status)
- Tabele:
  - `profiles` - Profile użytkowników z zarządzaniem rolami
  - `stores` - Słownik sklepów
  - `categories` - Słownik kategorii produktów
  - `flyers` - Gazetki promocyjne
  - `pages` - Strony gazetek z metadanymi przetwarzania AI
  - `products` - Wyekstrahowane produkty z ofert
- Wszystkie constraints i relacje FK
- Włączenie RLS na wszystkich tabelach

### 2. `20251126120001_create_indexes.sql`
**Cel:** Optymalizacja wydajności zapytań

**Zawiera:**
- Indeksy na kluczach obcych dla efektywnych JOIN-ów
- Indeksy kompozytowe dla częstych kombinacji filtrów
- Indeksy GIN dla Full Text Search
- Indeksy trigramowe dla tolerancji literówek

### 3. `20251126120002_create_triggers_and_functions.sql`
**Cel:** Automatyzacja i funkcje pomocnicze

**Zawiera:**
- `handle_new_user()` - Automatyczne tworzenie profilu przy rejestracji
- `handle_updated_at()` - Automatyczna aktualizacja znacznika czasu
- `update_product_search_vector()` - Generowanie wektora wyszukiwania
- `search_products()` - Zaawansowane wyszukiwanie z tolerancją literówek
- Triggery dla wszystkich tabel

### 4. `20251126120003_create_views.sql`
**Cel:** Uproszczenie zapytań aplikacji klienckiej

**Zawiera:**
- `v_active_products` - Widok agregujący aktywne, zweryfikowane produkty z wszystkimi powiązanymi danymi

### 5. `20251126120004_create_rls_policies.sql`
**Cel:** Zabezpieczenie danych na poziomie wierszy

**Zawiera:**
- Polityki SELECT dla użytkowników anonimowych (anon)
- Polityki SELECT dla użytkowników uwierzytelnionych (authenticated)
- Polityki INSERT/UPDATE/DELETE tylko dla adminów
- Granularne polityki dla każdej kombinacji operacji i roli

**Logika bezpieczeństwa:**
- Użytkownicy anonimowi i zwykli: odczyt aktywnych, zweryfikowanych danych
- Adminowie: pełny dostęp do wszystkich danych i operacji

### 6. `20251126120005_configure_storage.sql`
**Cel:** Konfiguracja Storage dla obrazów gazetek

**Zawiera:**
- Bucket `flyer-pages` (publiczny, limit 10MB, tylko obrazy)
- Polityki SELECT dla publicznego dostępu
- Polityki INSERT/UPDATE/DELETE tylko dla adminów
- Dokumentacja konwencji nazewnictwa ścieżek

**Struktura ścieżek:**
```
flyer-pages/{store_slug}/{flyer_id}/page_{page_number}.jpg
```

### 7. `20251126120006_seed_data.sql`
**Cel:** Dane inicjalne do uruchomienia aplikacji

**Zawiera:**
- Sklepy: Lidl, Biedronka
- Kategorie: 10 predefiniowanych kategorii z ikonami i kolejnością wyświetlania
- Instrukcje tworzenia pierwszego użytkownika admin

## Jak Uruchomić Migracje

### Opcja 1: Supabase CLI (Zalecane)

```bash
# Upewnij się, że jesteś zalogowany
supabase login

# Połącz projekt lokalny z projektem Supabase
supabase link --project-ref <your-project-ref>

# Uruchom wszystkie migracje
supabase db push

# LUB uruchom migracje na lokalnej instancji (dla development)
supabase start
supabase db reset  # Resetuje bazę i uruchamia wszystkie migracje od nowa
```

### Opcja 2: Ręcznie przez Supabase Dashboard

1. Przejdź do projektu w Supabase Dashboard
2. Otwórz SQL Editor
3. Kopiuj i wklej zawartość każdego pliku migracji w kolejności
4. Wykonaj każdą migrację po kolei

## Po Uruchomieniu Migracji

### 1. Utwórz Pierwszego Użytkownika Admin

```sql
-- 1. Zarejestruj użytkownika przez aplikację lub Supabase Dashboard

-- 2. Znajdź UUID użytkownika
SELECT id, email FROM auth.users;

-- 3. Nadaj rolę admin
UPDATE profiles
SET role = 'admin'
WHERE id = '<user-uuid>';
```

### 2. Sprawdź Poprawność

```sql
-- Sprawdź liczbę tabel
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
-- Oczekiwana wartość: 6 tabel

-- Sprawdź triggery
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Sprawdź dane seed
SELECT COUNT(*) FROM stores;      -- Oczekiwane: 2
SELECT COUNT(*) FROM categories;  -- Oczekiwane: 10

-- Sprawdź RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 3. Przetestuj Funkcjonalność

```sql
-- Test wyszukiwania produktów (po dodaniu przykładowych produktów)
SELECT * FROM search_products('masło', 0.3);

-- Test widoku aktywnych produktów
SELECT * FROM v_active_products LIMIT 10;
```

## Rollback Migracji

Jeśli potrzebujesz cofnąć migracje:

```bash
# Lokalnie - zresetuj bazę
supabase db reset

# Produkcja - stwórz migrację rollback ręcznie
# NIE MA automatycznego rollbacku dla Supabase
```

## Struktura Zależności

```
1. init_schema (tabele, typy, rozszerzenia)
   ↓
2. create_indexes (indeksy)
   ↓
3. create_triggers_and_functions (automatyzacja)
   ↓
4. create_views (widoki agregujące)
   ↓
5. create_rls_policies (zabezpieczenia)
   ↓
6. configure_storage (storage bucket)
   ↓
7. seed_data (dane inicjalne)
```

## Najlepsze Praktyki

1. **Zawsze testuj migracje lokalnie przed wdrożeniem na produkcję**
   ```bash
   supabase start
   supabase db reset
   ```

2. **Twórz backupy przed uruchomieniem migracji na produkcji**
   ```bash
   # Przez Supabase Dashboard > Database > Backups
   ```

3. **Monitoruj logi podczas migracji**
   ```bash
   supabase logs db
   ```

4. **Weryfikuj integralność danych po migracji**
   - Sprawdź liczby rekordów
   - Przetestuj kluczowe zapytania
   - Sprawdź działanie RLS policies

## Znane Problemy i Rozwiązania

### Problem: Trigger `on_auth_user_created` nie działa
**Rozwiązanie:** Upewnij się, że funkcja `handle_new_user()` ma flagę `SECURITY DEFINER`

### Problem: Full Text Search nie obsługuje polskich znaków
**Rozwiązanie:** Sprawdź dostępne konfiguracje:
```sql
SELECT cfgname FROM pg_ts_config WHERE cfgname LIKE '%polish%';
```

### Problem: Storage bucket nie pozwala na upload
**Rozwiązanie:** Sprawdź polityki RLS i upewnij się, że użytkownik ma rolę admin

## Kontakt

Jeśli napotkasz problemy z migracjami, sprawdź:
1. Dokumentację db-plan.md w folderze `.ai/`
2. Logi Supabase: `supabase logs db`
3. SQL Editor w Supabase Dashboard dla szczegółów błędów

