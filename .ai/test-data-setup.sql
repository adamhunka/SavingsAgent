-- ============================================================================
-- Skrypt SQL do przygotowania danych testowych dla Upload Flow
-- ============================================================================
-- UWAGA: Ten skrypt jest przeznaczony TYLKO dla środowiska DEV/TEST!
-- NIE URUCHAMIAJ na produkcji!
-- ============================================================================

-- 1. Sprawdzenie istniejących sklepów
-- ----------------------------------------------------------------------------
SELECT 
  id,
  name,
  logo_url,
  created_at
FROM stores
ORDER BY created_at DESC
LIMIT 5;

-- Jeśli brak sklepów, utwórz przykładowe:
-- INSERT INTO stores (name, logo_url) VALUES
-- ('Lidl', 'https://example.com/lidl-logo.png'),
-- ('Biedronka', 'https://example.com/biedronka-logo.png'),
-- ('Kaufland', 'https://example.com/kaufland-logo.png');


-- 2. Utworzenie testowej gazetki (DRAFT)
-- ----------------------------------------------------------------------------
-- Zastąp {STORE_ID} rzeczywistym UUID sklepu z kroku 1
INSERT INTO flyers (store_id, valid_from, valid_to, status)
VALUES (
  '{STORE_ID}', -- <-- ZMIEŃ NA PRAWDZIWY UUID
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  'draft'
)
RETURNING id, store_id, valid_from, valid_to, status;

-- Zapisz zwrócony UUID gazetki - będzie potrzebny do testów!


-- 3. Utworzenie testowej gazetki (ACTIVE) z datami
-- ----------------------------------------------------------------------------
INSERT INTO flyers (store_id, valid_from, valid_to, status)
VALUES (
  '{STORE_ID}', -- <-- ZMIEŃ NA PRAWDZIWY UUID
  '2025-01-10'::date,
  '2025-01-16'::date,
  'active'
)
RETURNING id, store_id, valid_from, valid_to, status;


-- 4. Sprawdzenie utworzonych gazetek
-- ----------------------------------------------------------------------------
SELECT 
  f.id,
  f.status,
  f.valid_from,
  f.valid_to,
  s.name as store_name,
  (SELECT COUNT(*) FROM pages WHERE flyer_id = f.id) as pages_count
FROM flyers f
JOIN stores s ON f.store_id = s.id
WHERE f.status IN ('draft', 'active')
ORDER BY f.created_at DESC
LIMIT 10;


-- 5. Sprawdzenie użytkownika admin
-- ----------------------------------------------------------------------------
SELECT 
  id,
  email,
  role,
  created_at
FROM profiles
WHERE role = 'admin'
LIMIT 5;

-- Jeśli nie masz użytkownika admin, utwórz go przez Supabase Auth:
-- 1. W Supabase Dashboard → Authentication → Users → Add User
-- 2. Ustaw email i hasło
-- 3. Po utworzeniu, zaktualizuj rolę w profiles:
-- UPDATE profiles SET role = 'admin' WHERE email = 'twoj-email@example.com';


-- ============================================================================
-- Zapytania pomocnicze podczas testowania
-- ============================================================================

-- 6. Sprawdzenie uploadowanych stron dla konkretnej gazetki
-- ----------------------------------------------------------------------------
SELECT 
  p.id,
  p.page_number,
  p.image_path,
  p.image_width,
  p.image_height,
  p.processing_status,
  p.created_at,
  (SELECT COUNT(*) FROM jobs WHERE page_id = p.id) as jobs_count
FROM pages p
WHERE p.flyer_id = '{FLYER_UUID}' -- <-- ZMIEŃ NA UUID gazetki
ORDER BY p.page_number ASC;


-- 7. Sprawdzenie zadań przetwarzania dla stron
-- ----------------------------------------------------------------------------
SELECT 
  j.id as job_id,
  j.status as job_status,
  p.page_number,
  p.image_path,
  j.created_at as job_created_at,
  j.started_at,
  j.finished_at,
  j.error_details
FROM jobs j
JOIN pages p ON j.page_id = p.id
WHERE p.flyer_id = '{FLYER_UUID}' -- <-- ZMIEŃ NA UUID gazetki
ORDER BY p.page_number ASC, j.created_at DESC;


-- 8. Sprawdzenie rozmiarów plików w storage
-- ----------------------------------------------------------------------------
-- UWAGA: To zapytanie wymaga dostępu do tabeli storage.objects
-- Może wymagać uprawnień storage_admin
SELECT 
  id,
  name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'flyer-pages'
  AND name LIKE '%/{FLYER_UUID}/%' -- <-- ZMIEŃ NA UUID gazetki
ORDER BY created_at DESC;


-- ============================================================================
-- Czyszczenie danych testowych (OSTROŻNIE!)
-- ============================================================================

-- 9. Usunięcie stron testowych (bez kasowania z storage!)
-- ----------------------------------------------------------------------------
-- UWAGA: To NIE usuwa plików z Supabase Storage!
-- Pliki trzeba usunąć ręcznie przez Supabase Dashboard lub API
DELETE FROM pages
WHERE flyer_id = '{FLYER_UUID}' -- <-- ZMIEŃ NA UUID gazetki
RETURNING id, page_number, image_path;


-- 10. Usunięcie zadań przetwarzania dla gazetki
-- ----------------------------------------------------------------------------
DELETE FROM jobs
WHERE page_id IN (
  SELECT id FROM pages WHERE flyer_id = '{FLYER_UUID}'
);


-- 11. Usunięcie testowej gazetki
-- ----------------------------------------------------------------------------
-- UWAGA: To usunie również wszystkie powiązane strony (CASCADE)
DELETE FROM flyers
WHERE id = '{FLYER_UUID}' -- <-- ZMIEŃ NA UUID gazetki
RETURNING id, store_id, valid_from, valid_to;


-- ============================================================================
-- Monitoring i debugging
-- ============================================================================

-- 12. Statystyki uploadów dla wszystkich gazetek
-- ----------------------------------------------------------------------------
SELECT 
  f.id as flyer_id,
  s.name as store_name,
  f.valid_from,
  f.valid_to,
  f.status as flyer_status,
  COUNT(p.id) as total_pages,
  COUNT(CASE WHEN p.processing_status = 'pending' THEN 1 END) as pending_pages,
  COUNT(CASE WHEN p.processing_status = 'processing' THEN 1 END) as processing_pages,
  COUNT(CASE WHEN p.processing_status = 'completed' THEN 1 END) as completed_pages,
  COUNT(CASE WHEN p.processing_status = 'error' THEN 1 END) as error_pages
FROM flyers f
JOIN stores s ON f.store_id = s.id
LEFT JOIN pages p ON f.id = p.flyer_id
WHERE f.status IN ('draft', 'active')
GROUP BY f.id, s.name, f.valid_from, f.valid_to, f.status
ORDER BY f.created_at DESC;


-- 13. Najnowsze uploady (ostatnie 24h)
-- ----------------------------------------------------------------------------
SELECT 
  p.id,
  p.page_number,
  p.image_path,
  p.processing_status,
  f.id as flyer_id,
  s.name as store_name,
  p.created_at
FROM pages p
JOIN flyers f ON p.flyer_id = f.id
JOIN stores s ON f.store_id = s.id
WHERE p.created_at > NOW() - INTERVAL '24 hours'
ORDER BY p.created_at DESC
LIMIT 20;


-- 14. Błędy przetwarzania (ostatnie 7 dni)
-- ----------------------------------------------------------------------------
SELECT 
  j.id as job_id,
  j.status,
  j.error_details,
  p.page_number,
  p.image_path,
  f.id as flyer_id,
  s.name as store_name,
  j.created_at,
  j.finished_at
FROM jobs j
JOIN pages p ON j.page_id = p.id
JOIN flyers f ON p.flyer_id = f.id
JOIN stores s ON f.store_id = s.id
WHERE j.status IN ('error', 'failed')
  AND j.created_at > NOW() - INTERVAL '7 days'
ORDER BY j.created_at DESC
LIMIT 50;


-- ============================================================================
-- Performance check
-- ============================================================================

-- 15. Sprawdzenie indeksów
-- ----------------------------------------------------------------------------
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('pages', 'flyers', 'jobs', 'stores')
ORDER BY tablename, indexname;


-- 16. Rozmiar tabel
-- ----------------------------------------------------------------------------
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('pages', 'flyers', 'jobs', 'stores', 'products')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;


-- ============================================================================
-- Koniec skryptu
-- ============================================================================

