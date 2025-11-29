# Schemat Bazy Danych - SavingsAgent

## 1. Przegląd Schematu

Schemat bazy danych dla aplikacji SavingsAgent został zaprojektowany w oparciu o PostgreSQL (Supabase) z naciskiem na:
- **Integralność danych**: Wykorzystanie kluczy obcych, constraints i cascading deletes
- **Bezpieczeństwo**: Row Level Security (RLS) policies dla kontroli dostępu
- **Wydajność**: Strategiczne indeksy, Full Text Search z obsługą literówek
- **Audytowalność**: Timestampy i tracking weryfikacji
- **Skalowalność**: Wydzielone tabele słownikowe dla łatwej rozbudowy

### Konwencje
- **Klucze główne**: UUID v4 dla wszystkich tabel
- **Naming**: snake_case dla wszystkich obiektów
- **Timestamps**: `created_at` i `updated_at` w każdej tabeli
- **Typy danych**: `NUMERIC(10, 2)` dla cen, `TIMESTAMPTZ` dla czasów, `JSONB` dla danych elastycznych

### Hierarchia Encji
```
auth.users (Supabase Auth)
    └── profiles (1:1, role management)

stores (słownik sklepów)
    └── flyers (gazetki)
        └── pages (strony gazetek)
            └── products (oferty)
                └── categories (słownik kategorii)
```

---

## 2. Definicje Tabel

### 2.1. profiles

Rozszerzenie profilu użytkownika z auth.users. Relacja 1:1, tworzenie automatyczne przez trigger.

```sql
CREATE TYPE user_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Constraints:**
- `id` jest jednocześnie PK i FK do `auth.users`
- `role` domyślnie ustawiony na 'user'

**Indeksy:**
```sql
CREATE INDEX idx_profiles_role ON profiles(role);
```

---

### 2.2. stores

Słownik sklepów (Lidl, Biedronka).

```sql
CREATE TABLE public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Constraints:**
- `name` musi być unikalny (UNIQUE)
- `name` nie może być NULL

**Seed Data:**
```sql
INSERT INTO stores (name, logo_url) VALUES
    ('Lidl', '/logos/lidl.svg'),
    ('Biedronka', '/logos/biedronka.svg');
```

---

### 2.3. categories

Słownik kategorii produktów. Zamknięta lista narzucona w systemie i promptach AI.

```sql
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    icon_name VARCHAR(50) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Constraints:**
- `name` musi być unikalny
- `display_order` dla sortowania w UI

**Seed Data:**
```sql
INSERT INTO categories (name, icon_name, display_order) VALUES
    ('Owoce i Warzywa', 'fruit', 10),
    ('Nabiał', 'dairy', 20),
    ('Mięso i Wędliny', 'meat', 30),
    ('Pieczywo', 'bread', 40),
    ('Napoje', 'beverages', 50),
    ('Słodycze', 'sweets', 60),
    ('Chemia Gospodarcza', 'cleaning', 70),
    ('Kosmetyki', 'cosmetics', 80),
    ('Artykuły Przemysłowe', 'industrial', 90),
    ('Inne', 'other', 100);
```

---

### 2.4. flyers

Gazetki promocyjne przypisane do sklepów.

```sql
CREATE TYPE flyer_status AS ENUM ('draft', 'active', 'archived');

CREATE TABLE public.flyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    status flyer_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_valid_dates CHECK (valid_to >= valid_from)
);
```

**Constraints:**
- `valid_to >= valid_from` (CHECK constraint)
- `store_id` musi istnieć w tabeli `stores` (FK)
- Usunięcie sklepu blokowane jeśli ma gazetki (RESTRICT)

**Indeksy:**
```sql
CREATE INDEX idx_flyers_store_id ON flyers(store_id);
CREATE INDEX idx_flyers_status ON flyers(status);
CREATE INDEX idx_flyers_dates ON flyers(valid_from, valid_to);
CREATE INDEX idx_flyers_store_dates ON flyers(store_id, valid_from, valid_to);
```

---

### 2.5. pages

Strony gazetek z metadanymi obrazu, statusem przetwarzania i danymi diagnostycznymi AI.

```sql
CREATE TYPE page_processing_status AS ENUM (
    'pending',           -- Oczekuje na przetworzenie
    'processing',        -- W trakcie przetwarzania AI
    'processed',         -- Przetworzono, oczekuje na weryfikację
    'verified',          -- Zweryfikowane przez admina
    'error',             -- Błąd przetwarzania
    'no_products'        -- Strona nie zawiera produktów (pusta/reklama)
);

CREATE TABLE public.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flyer_id UUID NOT NULL REFERENCES flyers(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    image_width INTEGER,
    image_height INTEGER,
    processing_status page_processing_status NOT NULL DEFAULT 'pending',
    processing_started_at TIMESTAMPTZ,
    ai_raw_response JSONB,
    error_details TEXT,
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_page_number UNIQUE (flyer_id, page_number),
    CONSTRAINT check_page_number_positive CHECK (page_number > 0),
    CONSTRAINT check_image_dimensions CHECK (
        (image_width IS NULL AND image_height IS NULL) OR 
        (image_width > 0 AND image_height > 0)
    )
);
```

**Constraints:**
- Unikalna para `(flyer_id, page_number)` - jedna gazetka nie może mieć dwóch stron o tym samym numerze
- `page_number` musi być dodatni
- Wymiary obrazu muszą być albo oba NULL albo oba dodatnie
- Usunięcie gazetki usuwa wszystkie jej strony (CASCADE)

**Indeksy:**
```sql
CREATE INDEX idx_pages_flyer_id ON pages(flyer_id);
CREATE INDEX idx_pages_processing_status ON pages(processing_status);
CREATE INDEX idx_pages_verified_by ON pages(verified_by);
CREATE INDEX idx_pages_flyer_page_number ON pages(flyer_id, page_number);
```

---

### 2.6. products

Wyekstrahowane produkty z ofert promocyjnych.

```sql
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    price_promo NUMERIC(10, 2) NOT NULL,
    price_regular NUMERIC(10, 2),
    conditions TEXT,
    bounding_box JSONB,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_price_promo_positive CHECK (price_promo > 0),
    CONSTRAINT check_price_regular_positive CHECK (price_regular IS NULL OR price_regular > 0),
    CONSTRAINT check_price_logic CHECK (price_regular IS NULL OR price_regular >= price_promo)
);
```

**Opis kolumn:**
- `name`: Nazwa produktu (np. "Masło Extra")
- `description`: Waga, producent, wariant (np. "200g, Mlekovita")
- `price_promo`: Cena promocyjna (zawsze wymagana)
- `price_regular`: Cena regularna (opcjonalna, jeśli dostępna w gazetce)
- `conditions`: Warunki promocji (np. "przy zakupie 2 sztuk")
- `bounding_box`: Współrzędne produktu na obrazie strony dla panelu admin (format: `{"x": 100, "y": 200, "width": 300, "height": 400}`)
- `search_vector`: Wygenerowany wektor dla Full Text Search

**Constraints:**
- `price_promo` musi być dodatnia
- `price_regular` jeśli podana, musi być dodatnia
- `price_regular` jeśli podana, musi być >= `price_promo`
- Usunięcie strony usuwa wszystkie jej produkty (CASCADE)
- Usunięcie kategorii blokowane jeśli ma produkty (RESTRICT)

**Indeksy:**
```sql
CREATE INDEX idx_products_page_id ON products(page_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_category_price ON products(category_id, price_promo);
CREATE INDEX idx_products_price_promo ON products(price_promo);

-- Full Text Search z obsługą literówek (pg_trgm)
CREATE INDEX idx_products_search_vector ON products USING GIN(search_vector);
CREATE INDEX idx_products_name_trigram ON products USING GIN(name gin_trgm_ops);
CREATE INDEX idx_products_description_trigram ON products USING GIN(description gin_trgm_ops);
```

---

## 3. Relacje między Tabelami

### Diagram Relacji

```
auth.users (1) ──────────── (1) profiles
                                   │
stores (1) ──────────── (N) flyers │
                            │      │
                           (1)     │
                            │      │
                         pages (N) │
                            │      │
                           (1)    (N) [verified_by]
                            │      
                         products (N)
                            │
                           (N)
                            │
                         categories (1)
```

### Szczegóły Relacji

| Tabela Źródłowa | Tabela Docelowa | Typ Relacji | FK Column | ON DELETE |
|-----------------|-----------------|-------------|-----------|-----------|
| profiles | auth.users | 1:1 | id | CASCADE |
| flyers | stores | N:1 | store_id | RESTRICT |
| pages | flyers | N:1 | flyer_id | CASCADE |
| pages | profiles | N:1 | verified_by | SET NULL |
| products | pages | N:1 | page_id | CASCADE |
| products | categories | N:1 | category_id | RESTRICT |

### Logika Kaskadowego Usuwania

**CASCADE (automatyczne usunięcie):**
- Usunięcie użytkownika z `auth.users` → usuwa `profiles`
- Usunięcie gazetki → usuwa wszystkie jej `pages`
- Usunięcie strony → usuwa wszystkie jej `products`

**RESTRICT (blokada usunięcia):**
- Usunięcie sklepu blokowane jeśli ma gazetki
- Usunięcie kategorii blokowane jeśli ma produkty

**SET NULL:**
- Usunięcie profilu admina → `pages.verified_by` ustawione na NULL (zachowanie audytu)

---

## 4. Triggery

### 4.1. Automatyczne tworzenie profilu

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role)
    VALUES (NEW.id, 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

### 4.2. Automatyczna aktualizacja updated_at

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Zastosowanie na wszystkich tabelach
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON flyers
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

### 4.3. Automatyczna aktualizacja search_vector

```sql
CREATE OR REPLACE FUNCTION public.update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('polish', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('polish', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_vector_update
    BEFORE INSERT OR UPDATE OF name, description ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_search_vector();
```

**Uwaga:** Wymaga rozszerzenia `pg_trgm` i skonfigurowania polskiego słownika dla Full Text Search:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

## 5. Widoki

### 5.1. v_active_products

Widok agregujący logikę biznesową dla aplikacji klienckiej. Wyświetla tylko aktywne, zweryfikowane produkty z aktualnych gazetek.

```sql
CREATE OR REPLACE VIEW public.v_active_products AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.description,
    p.price_promo,
    p.price_regular,
    p.conditions,
    c.id AS category_id,
    c.name AS category_name,
    c.icon_name AS category_icon,
    s.id AS store_id,
    s.name AS store_name,
    s.logo_url AS store_logo,
    f.valid_from,
    f.valid_to,
    pg.image_path AS page_image_path,
    p.created_at
FROM products p
INNER JOIN pages pg ON p.page_id = pg.id
INNER JOIN flyers f ON pg.flyer_id = f.id
INNER JOIN stores s ON f.store_id = s.id
INNER JOIN categories c ON p.category_id = c.id
WHERE 
    f.status = 'active'
    AND pg.processing_status = 'verified'
    AND f.valid_from <= CURRENT_DATE
    AND f.valid_to >= CURRENT_DATE
ORDER BY p.created_at DESC;
```

**Użycie:**
- Frontend może używać tego widoku zamiast złożonych JOIN-ów
- Automatycznie filtruje nieaktualne/niezweryfikowane dane
- Upraszcza implementację API endpoints

---

## 6. Row Level Security (RLS) Policies

### 6.1. Włączenie RLS

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE flyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

### 6.2. Profiles

```sql
-- Każdy może odczytać wszystkie profile (potrzebne dla audytu)
CREATE POLICY "Profiles są publiczne do odczytu"
    ON profiles FOR SELECT
    USING (true);

-- Tylko admin może modyfikować profile
CREATE POLICY "Tylko admin może modyfikować profile"
    ON profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
```

### 6.3. Stores & Categories

```sql
-- Wszyscy mogą odczytywać słowniki
CREATE POLICY "Stores są publiczne do odczytu"
    ON stores FOR SELECT
    USING (true);

CREATE POLICY "Categories są publiczne do odczytu"
    ON categories FOR SELECT
    USING (true);

-- Tylko admin może modyfikować
CREATE POLICY "Tylko admin może modyfikować stores"
    ON stores FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Tylko admin może modyfikować categories"
    ON categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
```

### 6.4. Flyers

```sql
-- Wszyscy mogą odczytywać aktywne gazetki
CREATE POLICY "Aktywne flyers są publiczne do odczytu"
    ON flyers FOR SELECT
    USING (status = 'active' OR (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    ));

-- Tylko admin może zarządzać gazetkami
CREATE POLICY "Tylko admin może zarządzać flyers"
    ON flyers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
```

### 6.5. Pages

```sql
-- Wszyscy mogą odczytywać zweryfikowane strony z aktywnych gazetek
CREATE POLICY "Zweryfikowane pages są publiczne do odczytu"
    ON pages FOR SELECT
    USING (
        processing_status = 'verified' OR (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
            )
        )
    );

-- Tylko admin może zarządzać stronami
CREATE POLICY "Tylko admin może zarządzać pages"
    ON pages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
```

### 6.6. Products

```sql
-- Wszyscy mogą odczytywać produkty ze zweryfikowanych stron
CREATE POLICY "Produkty ze zweryfikowanych pages są publiczne"
    ON products FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pages
            WHERE pages.id = products.page_id
            AND pages.processing_status = 'verified'
        ) OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Tylko admin może zarządzać produktami
CREATE POLICY "Tylko admin może zarządzać products"
    ON products FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
```

---

## 7. Storage Configuration

### 7.1. Bucket: flyer-pages

```sql
-- Tworzenie bucketa (przez Supabase Dashboard lub Storage API)
INSERT INTO storage.buckets (id, name, public)
VALUES ('flyer-pages', 'flyer-pages', true);
```

### 7.2. Storage Policies

```sql
-- Publiczny odczyt obrazów
CREATE POLICY "Publiczny odczyt obrazów gazetek"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'flyer-pages');

-- Tylko admin może uploadować
CREATE POLICY "Tylko admin może uploadować obrazy"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'flyer-pages'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Tylko admin może usuwać
CREATE POLICY "Tylko admin może usuwać obrazy"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'flyer-pages'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
```

### 7.3. Struktura ścieżek w Storage

**Konwencja nazewnictwa:**
```
flyer-pages/
    {store_slug}/
        {flyer_id}/
            page_{page_number}.jpg
```

**Przykład:**
```
flyer-pages/lidl/550e8400-e29b-41d4-a716-446655440000/page_1.jpg
flyer-pages/lidl/550e8400-e29b-41d4-a716-446655440000/page_2.jpg
flyer-pages/biedronka/660e8400-e29b-41d4-a716-446655440001/page_1.jpg
```

**Zapisywanie w tabeli `pages`:**
```sql
-- Przykład: image_path = 'lidl/550e8400-e29b-41d4-a716-446655440000/page_1.jpg'
-- Pełny URL budowany jako: {SUPABASE_URL}/storage/v1/object/public/flyer-pages/{image_path}
```

---

## 8. Funkcje Pomocnicze

### 8.1. Wyszukiwanie produktów z obsługą literówek

```sql
CREATE OR REPLACE FUNCTION public.search_products(
    search_query TEXT,
    similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    product_id UUID,
    product_name VARCHAR,
    description TEXT,
    price_promo NUMERIC,
    similarity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.price_promo,
        GREATEST(
            similarity(p.name, search_query),
            similarity(COALESCE(p.description, ''), search_query)
        ) AS sim_score
    FROM products p
    INNER JOIN pages pg ON p.page_id = pg.id
    WHERE 
        pg.processing_status = 'verified'
        AND (
            p.search_vector @@ plainto_tsquery('polish', search_query)
            OR similarity(p.name, search_query) > similarity_threshold
            OR similarity(COALESCE(p.description, ''), search_query) > similarity_threshold
        )
    ORDER BY sim_score DESC, p.price_promo ASC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;
```

**Użycie:**
```sql
SELECT * FROM search_products('masło');
SELECT * FROM search_products('kava', 0.4); -- z wyższym threshold dla "kawa"
```

---

## 9. Uwagi Implementacyjne

### 9.1. Kolejność Tworzenia Obiektów

1. **Rozszerzenia:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- opcjonalnie, gen_random_uuid() wbudowane w nowszych wersjach
   ```

2. **Typy ENUM:**
   - `user_role`
   - `flyer_status`
   - `page_processing_status`

3. **Tabele (w kolejności zależności):**
   - `profiles`
   - `stores`
   - `categories`
   - `flyers`
   - `pages`
   - `products`

4. **Indeksy**

5. **Triggery**

6. **Widoki**

7. **RLS Policies**

8. **Storage Bucket i Policies**

### 9.2. Seed Data

Wymagane dane inicjalne:
- **Stores:** Lidl, Biedronka
- **Categories:** 10 kategorii z ikonami i kolejnością wyświetlania
- **Admin User:** Pierwszy użytkownik z rolą 'admin' (utworzony ręcznie lub przez script migracyjny)

### 9.3. Konfiguracja Full Text Search

Dla języka polskiego konieczna jest konfiguracja słownika:

```sql
-- Sprawdzenie dostępnych konfiguracji
SELECT cfgname FROM pg_ts_config WHERE cfgname LIKE '%polish%';

-- Jeśli brak predefiniowanego, można użyć 'simple' lub stworzyć własny
-- Alternatywnie zainstalować dodatkowe słowniki dla PostgreSQL
```

### 9.4. Migracje i Rollback

**Strategia:**
- Każda zmiana schematu powinna mieć parę migracji: UP i DOWN
- Supabase wykorzystuje migracje SQL w folderze `supabase/migrations/`
- Nazewnictwo: `YYYYMMDDHHMMSS_description.sql`

**Przykład struktury folderów:**
```
supabase/
    migrations/
        20240101000001_init_schema.sql
        20240101000002_seed_data.sql
        20240102000001_add_bounding_box.sql
```

### 9.5. Monitoring i Performance

**Zalecane metryki do monitorowania:**
- Rozmiar tabel (`pg_total_relation_size`)
- Efektywność indeksów (`pg_stat_user_indexes`)
- Slow queries (logi PostgreSQL)
- Cache hit ratio

**Optymalizacje dla Production:**
- `VACUUM ANALYZE` po dużych importach danych
- `REINDEX` dla indeksów Full Text Search jeśli performance spada
- Rozważenie partycjonowania tabeli `products` po osiągnięciu >1M rekordów

### 9.6. Bezpieczeństwo

**Best Practices:**
- Używanie Service Role Key tylko w środowisku serverless (API routes)
- Anon Key dla aplikacji klienckiej z RLS
- Nigdy nie przechowywać kluczy API w kodzie frontend
- Rate limiting na endpointach przetwarzania AI
- Validation obrazów przed uploadem (MIME type, rozmiar)

### 9.7. Backup i Disaster Recovery

**Supabase zapewnia:**
- Automatyczne codzienne backupy (7 dni retention w planie darmowym)
- Point-in-time recovery (PITR) w planach płatnych

**Dodatkowe zalecenia:**
- Eksport manualny kluczowych danych (stores, categories) jako SQL dumps
- Archiwizacja obrazów z Storage poza Supabase (S3, DigitalOcean Spaces)

---

## 10. Diagram ERD (Entity Relationship Diagram)

```
┌─────────────────┐
│   auth.users    │
│  (Supabase)     │
└────────┬────────┘
         │ 1:1
         │
┌────────▼────────┐
│    profiles     │
│─────────────────│
│ id (PK, FK)     │◄──────────┐
│ role            │            │ verified_by (N:1)
│ created_at      │            │
│ updated_at      │            │
└─────────────────┘            │
                               │
┌─────────────────┐            │
│     stores      │            │
│─────────────────│            │
│ id (PK)         │            │
│ name (UNIQUE)   │            │
│ logo_url        │            │
└────────┬────────┘            │
         │ 1:N                 │
         │                     │
┌────────▼────────┐            │
│     flyers      │            │
│─────────────────│            │
│ id (PK)         │            │
│ store_id (FK)   │            │
│ valid_from      │            │
│ valid_to        │            │
│ status          │            │
└────────┬────────┘            │
         │ 1:N                 │
         │                     │
┌────────▼────────┐            │
│      pages      │            │
│─────────────────│            │
│ id (PK)         │            │
│ flyer_id (FK)   │            │
│ page_number     │            │
│ image_path      │            │
│ processing_status│           │
│ verified_by (FK)├────────────┘
└────────┬────────┘
         │ 1:N
         │
┌────────▼────────┐     ┌──────────────┐
│    products     │     │  categories  │
│─────────────────│     │──────────────│
│ id (PK)         │     │ id (PK)      │
│ page_id (FK)    │     │ name (UNIQUE)│
│ category_id (FK)├────►│ icon_name    │
│ name            │ N:1 │ display_order│
│ price_promo     │     └──────────────┘
│ price_regular   │
│ search_vector   │
└─────────────────┘
```

---

## 11. Checklist Implementacji

- [ ] Włączyć rozszerzenia PostgreSQL (`pg_trgm`)
- [ ] Utworzyć typy ENUM
- [ ] Utworzyć tabele w kolejności zależności
- [ ] Dodać wszystkie indeksy
- [ ] Zaimplementować triggery (updated_at, search_vector, new user)
- [ ] Utworzyć widok v_active_products
- [ ] Włączyć RLS na wszystkich tabelach
- [ ] Dodać RLS policies
- [ ] Utworzyć bucket flyer-pages w Storage
- [ ] Skonfigurować Storage policies
- [ ] Zaseedować dane: stores, categories
- [ ] Utworzyć pierwszego użytkownika admin
- [ ] Przetestować wszystkie policies (admin vs user)
- [ ] Przetestować cascade deletes
- [ ] Przetestować Full Text Search z polskimi znakami
- [ ] Zweryfikować wydajność zapytań na przykładowych danych
- [ ] Skonfigurować monitoring i alerty

---

## 12. Pytania i Decyzje do Rozważenia w Przyszłości

### Poza MVP (Nice-to-Have):

1. **Soft Delete:** Rozważyć dodanie kolumny `deleted_at` zamiast hard delete dla audytu
2. **History Tracking:** Tabela audit log dla zmian w products (kto, kiedy, co zmienił)
3. **Favorites:** Tabela user_favorites dla zapisywania ulubionych ofert
4. **Notifications:** Tabela user_notification_preferences + notification_logs
5. **Price History:** Tabela product_price_history dla śledzenia zmian cen w czasie
6. **Multi-region:** Replikacja bazy dla różnych regionów geograficznych
7. **Analytics:** Materialized views dla raportowania (top produkty, najpopularniejsze kategorie)
8. **API Cache:** Redis dla cache'owania często używanych zapytań (top offers, category counts)

---

## Podsumowanie

Schemat bazy danych SavingsAgent zapewnia:
- ✅ **Solidne fundamenty:** UUID, foreign keys, constraints, indexes
- ✅ **Bezpieczeństwo:** RLS policies dla separacji ról admin/user
- ✅ **Wydajność:** Strategic indexes, FTS z pg_trgm, view dla częstych zapytań
- ✅ **Skalowalność:** Słowniki stores/categories, możliwość łatwej rozbudowy
- ✅ **Audytowalność:** Timestamps, verified_by, ai_raw_response dla diagnostyki
- ✅ **Data Integrity:** Cascading deletes, check constraints, unique constraints

Schemat jest gotowy do implementacji jako migracje Supabase i stanowi solidną podstawę dla funkcjonalności opisanych w PRD.

