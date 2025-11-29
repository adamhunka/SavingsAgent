# Decyzje Projektowe - Dlaczego Różne Zasoby Mają Różne Typy DTO?

## 🤔 Pytanie

**Dlaczego Pages ma:**
- `PageDTO`
- `PageListItemDTO` ⬅️ dodatkowy
- `CreatePageCommand`
- `UploadUrlRequestCommand` ⬅️ dodatkowy
- `UploadUrlResponse` ⬅️ dodatkowy
- `StartProcessingCommand` ⬅️ dodatkowy
- `VerifyPageCommand` ⬅️ dodatkowy

**A Stores ma tylko:**
- `StoreDTO`
- `CreateStoreCommand`
- `UpdateStoreCommand`

---

## 📊 Porównanie Zasobów

| Zasób | Podstawowe DTO | Dodatkowe DTO | Dodatkowe Commands | Powód |
|-------|---------------|---------------|-------------------|--------|
| **Stores** | 3 | 0 | 0 | Prosty CRUD |
| **Categories** | 3 | 0 | 0 | Prosty CRUD |
| **Flyers** | 3 | **2** (ListItem, Detail) | 0 | Relacje z Store |
| **Pages** | 3 | **1** (ListItem) | **4** (Upload, Processing, Verify) | Złożony flow |
| **Products** | 3 | **2** (ListItem, Detail) | 0 | View + relacje |

---

## 🎯 Kryteria Decyzyjne

### Kryterium 1: Złożoność Business Process

#### Prosty CRUD (Stores, Categories)
```
User Action        API Call                    Types Needed
───────────────────────────────────────────────────────────
Lista sklepów  →   GET /stores              → StoreDTO
Stwórz sklep   →   POST /stores             → CreateStoreCommand
Edytuj sklep   →   PATCH /stores/:id        → UpdateStoreCommand
Usuń sklep     →   DELETE /stores/:id       → (brak body)
```

**Typy:** 3 (DTO, Create, Update)  
**Dlaczego tylko tyle:** Standardowy CRUD, brak specjalnych operacji

---

#### Złożony Workflow (Pages)
```
User Action              API Call                           Types Needed
────────────────────────────────────────────────────────────────────────────
1. Poproś o URL      →   POST /pages/upload-url         → UploadUrlRequestCommand
2. Otrzymaj URL      ←   Response                        → UploadUrlResponse
3. Upload do S3      →   PUT {upload_url}               → (external)
4. Zarejestruj page  →   POST /pages                    → CreatePageCommand
5. Start AI          →   PATCH /pages/:id/process       → StartProcessingCommand
6. (AI pracuje...)
7. Zweryfikuj        →   PATCH /pages/:id/verify        → VerifyPageCommand
8. Lista pages       →   GET /pages                     → PageListItemDTO
9. Szczegóły page    →   GET /pages/:id                 → PageDTO
```

**Typy:** 7 (DTO, ListItem, Create, 4 × special commands)  
**Dlaczego więcej:** Każdy krok workflow potrzebuje osobnego typu!

---

### Kryterium 2: Rozmiar Danych (Payload Size)

#### Small Entity (Store)

```typescript
// Store Entity - 5 kolumn, wszystkie małe
interface StoreEntity {
  id: string;              // UUID (36 chars)
  name: string;            // ~50 chars
  logo_url: string | null; // ~100 chars
  created_at: string;      // 24 chars
  updated_at: string;      // 24 chars
}
// TOTAL: ~234 bytes per record
```

**Dla listy 100 sklepów:** ~23 KB  
**Decyzja:** Nie potrzebujemy ListItemDTO (już małe!)

```typescript
// Wystarczy jeden typ
export type StoreDTO = Omit<StoreEntity, 'created_at' | 'updated_at'>;
// Użyty zarówno w liście jak i szczegółach
```

---

#### Large Entity (Page)

```typescript
// Page Entity - 11 kolumn, niektóre DUŻE
interface PageEntity {
  id: string;                    // 36 chars
  flyer_id: string;              // 36 chars
  page_number: number;           // 8 bytes
  image_path: string;            // ~100 chars
  image_width: number | null;    // 8 bytes
  image_height: number | null;   // 8 bytes
  processing_status: string;     // ~20 chars
  processing_started_at: string | null; // 24 chars
  ai_raw_response: Json | null;  // ⚠️ 5-50 KB! (AI response)
  error_details: string | null;  // ~500 chars
  verified_at: string | null;    // 24 chars
  verified_by: string | null;    // 36 chars
  created_at: string;            // 24 chars
  updated_at: string;            // 24 chars
}
// TOTAL: ~5-50 KB per record (głównie ai_raw_response)
```

**Dla listy 100 pages z pełnym DTO:** ~500 KB - 5 MB ❌  
**Dla listy 100 pages z ListItemDTO:** ~50 KB ✅

**Decyzja:** MUSIMY mieć PageListItemDTO!

```typescript
// Lista - tylko potrzebne pola (małe)
export type PageListItemDTO = Pick<PageEntity,
  'id' | 'page_number' | 'image_path' | 'processing_status' | 
  'processing_started_at' | 'verified_at' | 'verified_by' | 'error_details'
>;
// ~300 bytes per record

// Szczegóły - wszystkie pola (duże)
export type PageDTO = Omit<PageEntity, 'created_at' | 'updated_at'> & {
  ai_raw_response: AIExtractionResponse | null;
};
// ~5-50 KB per record
```

---

### Kryterium 3: Relacje i Denormalizacja

#### Bez Dodatkowych Relacji (Store)

```typescript
// Store nie potrzebuje info o innych encjach w liście
export type StoreDTO = Omit<StoreEntity, 'created_at' | 'updated_at'>;

// Jeden typ wystarczy dla:
// - GET /stores (lista)
// - GET /stores/:id (szczegóły)
// - POST /stores (response)
// - PATCH /stores/:id (response)
```

---

#### Z Relacjami (Flyer)

```typescript
// Problem: W liście gazetek chcemy pokazać nazwę sklepu
// GET /flyers → pokazuje "Lidl", "Biedronka" (nie tylko store_id)

// ❌ Gdybyśmy mieli tylko FlyerDTO:
interface FlyerDTO {
  id: string;
  store_id: string; // ⚠️ UUID, nie nazwa!
  valid_from: string;
  valid_to: string;
  status: string;
}
// Frontend musiałby robić dodatkowe query dla każdego store_id (N+1!)

// ✅ Dlatego mamy FlyerListItemDTO:
interface FlyerListItemDTO extends FlyerDTO {
  store_name: string; // Dodana nazwa z JOIN!
}

// I FlyerDetailDTO dla szczegółów:
interface FlyerDetailDTO extends FlyerListItemDTO {
  pages?: PageListItemDTO[]; // Opcjonalnie lista stron
}
```

**Decyzja:** Potrzebujemy 3 typów (DTO, ListItem, Detail)

**SQL dla listy:**
```sql
SELECT 
  f.*, 
  s.name as store_name  -- JOIN dla store_name
FROM flyers f
JOIN stores s ON f.store_id = s.id
```

**SQL dla szczegółów (z pages):**
```sql
SELECT 
  f.*, 
  s.name as store_name,
  json_agg(p.*) as pages  -- Zagnieżdżone pages
FROM flyers f
JOIN stores s ON f.store_id = s.id
LEFT JOIN pages p ON p.flyer_id = f.id
WHERE f.id = $1
GROUP BY f.id, s.name
```

---

#### Z View (Product)

```typescript
// Products używa VIEW który już zawiera denormalized data
// VIEW v_active_products = product + category + store + flyer

// Lista używa view (denormalized, flat structure)
export type ProductListItemDTO = Tables<'v_active_products'>;
// Zawiera: product_name, category_name, store_name, store_logo, etc.

// Szczegóły używa JOINs (normalized, nested structure)
export type ProductDetailDTO = ProductDTO & {
  category: Pick<CategoryEntity, 'id' | 'name' | 'icon_name'>;
  page: {
    id: string;
    flyer: {
      store: Pick<StoreEntity, 'id' | 'name' | 'logo_url'>;
    };
  };
};
```

**Decyzja:** Potrzebujemy 3 typów (DTO, ListItem z view, Detail z relations)

---

### Kryterium 4: Specjalne Operacje

#### Standardowe Operacje (Store)

```
CRUD Operations:
├─ CREATE  → CreateStoreCommand
├─ READ    → StoreDTO
├─ UPDATE  → UpdateStoreCommand
└─ DELETE  → (no body)
```

**Typy:** 3

---

#### Specjalne Operacje (Page)

```
Standard CRUD:
├─ CREATE  → CreatePageCommand
├─ READ    → PageDTO
├─ UPDATE  → (not allowed - pages nie są edytowane)
└─ DELETE  → (cascade with flyer)

Special Operations:
├─ UPLOAD WORKFLOW
│  ├─ Request upload URL   → UploadUrlRequestCommand
│  └─ Response with URL    → UploadUrlResponse
│
├─ AI PROCESSING
│  ├─ Start processing     → StartProcessingCommand
│  └─ Retry processing     → StartProcessingCommand (reuse)
│
└─ VERIFICATION
   └─ Verify/Reject page   → VerifyPageCommand
```

**Typy:** 7 (3 standard + 4 special)

**Dlaczego osobne typy dla operacji?**

1. **Walidacja:** Każda operacja ma inne wymagania
2. **Dokumentacja:** Jasne co jest potrzebne
3. **Type Safety:** TypeScript wymusi poprawne dane
4. **Maintainability:** Łatwo zmienić requirements

---

## 🎨 Design Patterns

### Pattern 1: Single DTO (Simple Resource)

**Kiedy:** Mała encja, prosty CRUD, brak relacji

```typescript
// Store, Category
export type XEntity = Tables<'x'>;
export type XDTO = Omit<XEntity, 'created_at' | 'updated_at'>;
export type CreateXCommand = Required<Pick<...>>;
export type UpdateXCommand = Pick<...>;
```

**Use cases:** 
- GET /x → XDTO[]
- GET /x/:id → XDTO
- POST /x → response: XDTO
- PATCH /x/:id → response: XDTO

---

### Pattern 2: List + Detail (Resource with Relations)

**Kiedy:** Relacje z innymi tabelami, różne dane w liście vs szczegółach

```typescript
// Flyer, Product
export type XDTO = Omit<XEntity, 'created_at' | 'updated_at'>;

export type XListItemDTO = XDTO & {
  // Dodatkowe pola z JOIN (flat)
  related_name: string;
};

export type XDetailDTO = XListItemDTO & {
  // Zagnieżdżone relacje (nested)
  related_items?: RelatedDTO[];
};
```

**Use cases:**
- GET /x → XListItemDTO[] (optimized, z nazwami)
- GET /x/:id → XDetailDTO (full data, nested relations)

---

### Pattern 3: List Optimization (Large Payload)

**Kiedy:** Duże pola (JSON, text), lista zwraca dużo rekordów

```typescript
// Page
export type XDTO = Omit<XEntity, 'created_at' | 'updated_at' | 'heavy_field'> & {
  heavy_field: ParsedType | null; // Parsed from JSON
};

export type XListItemDTO = Pick<XEntity, 
  'id' | 'name' | 'status' | /* tylko potrzebne */
>;
// Usuwa heavy_field
```

**Use cases:**
- GET /x → XListItemDTO[] (light, fast)
- GET /x/:id → XDTO (full data with heavy fields)

---

### Pattern 4: Multi-Step Process (Complex Workflow)

**Kiedy:** Operacja wymaga wielu kroków, każdy krok = osobny request

```typescript
// Page Upload Workflow
export interface Step1RequestCommand { /* request pre-signed URL */ }
export interface Step1Response { /* URL + metadata */ }
export interface Step2Command { /* register uploaded file */ }
export interface Step3Command { /* start processing */ }
export interface Step4Command { /* verify results */ }
```

**Use cases:**
- POST /x/prepare → Step1Response
- POST /x/upload → (to external storage)
- POST /x → Step2Command
- PATCH /x/:id/action1 → Step3Command
- PATCH /x/:id/action2 → Step4Command

---

## 📋 Decision Tree

```
Tworzysz typy dla nowego zasobu X?
│
├─ Czy encja ma > 8 kolumn LUB heavy fields (JSON, TEXT)?
│  YES → Potrzebujesz XListItemDTO (optimization)
│  NO  → Jeden XDTO wystarczy
│
├─ Czy w liście pokazujesz dane z innych tabel (JOIN)?
│  YES → Potrzebujesz XListItemDTO (z dodatkowymi polami)
│  NO  → Jeden XDTO wystarczy
│
├─ Czy szczegóły zawierają zagnieżdżone relacje?
│  YES → Potrzebujesz XDetailDTO (nested objects)
│  NO  → XDTO wystarczy
│
├─ Czy resource ma specjalne operacje (nie CRUD)?
│  YES → Potrzebujesz osobnych Commands dla każdej operacji
│  NO  → CreateXCommand + UpdateXCommand wystarczy
│
└─ Czy operacja wymaga multi-step workflow?
   YES → Potrzebujesz Command + Response dla każdego kroku
   NO  → Jeden Command wystarczy
```

---

## 🔍 Analiza Konkretnych Przypadków

### Case 1: Stores (Najprostszy)

**Charakterystyka:**
- ✅ Mała encja (5 kolumn)
- ✅ Proste pola (string, null)
- ✅ Brak heavy fields
- ✅ Brak relacji w liście
- ✅ Standardowy CRUD

**Decyzja:**
```typescript
StoreDTO              // Jeden dla wszystkiego
CreateStoreCommand    // Standard
UpdateStoreCommand    // Standard
```

**Total: 3 typy** ✨ Minimum viable

---

### Case 2: Flyers (Średnia złożoność)

**Charakterystyka:**
- ✅ Średnia encja (7 kolumn)
- ✅ Relacja N→1 z Store
- ❌ Brak heavy fields
- ✅ W liście potrzebna nazwa sklepu
- ⚠️ Szczegóły mogą zawierać pages
- ✅ Standardowy CRUD

**Decyzja:**
```typescript
FlyerDTO              // Podstawowe pola
FlyerListItemDTO      // + store_name (z JOIN)
FlyerDetailDTO        // + pages[] (opcjonalne)
CreateFlyerCommand    // Standard + date validation
UpdateFlyerCommand    // Standard
```

**Total: 5 typów** (3 DTO variants + 2 commands)

**Dlaczego 3 DTO?**
- `FlyerDTO` - czysta encja, base type
- `FlyerListItemDTO` - używane w GET /flyers (z store_name)
- `FlyerDetailDTO` - używane w GET /flyers/:id?include=pages

---

### Case 3: Pages (Najbardziej złożony)

**Charakterystyka:**
- ❌ Duża encja (13 kolumn)
- ❌ Heavy field: ai_raw_response (5-50 KB)
- ❌ Heavy field: error_details (do 1 KB)
- ✅ Złożony workflow:
  - Upload (2 steps: request URL → upload → register)
  - AI Processing (trigger → wait → verify)
  - Verification (approve/reject/mark)
- ❌ Nie ma UPDATE (pages są immutable po utworzeniu)
- ✅ Ma specjalne operacje (nie CRUD)

**Decyzja:**
```typescript
// DTO (2 variants)
PageDTO                     // Pełne dane (dla szczegółów)
PageListItemDTO             // Bez heavy fields (dla listy)

// Commands (5 variants)
CreatePageCommand           // Register page after upload
UploadUrlRequestCommand     // Request pre-signed URL
UploadUrlResponse           // Pre-signed URL + metadata
StartProcessingCommand      // Trigger AI processing
VerifyPageCommand           // Approve/reject results
```

**Total: 7 typów** (2 DTO + 5 commands)

**Dlaczego nie UpdatePageCommand?**
- Pages są immutable po utworzeniu (audit trail)
- Zmiana statusu = specjalne operacje (process, verify)
- Zmiana danych = delete + create new page

**Dlaczego 5 commands?**
- Każdy reprezentuje osobną business operation
- Każda ma różne requirements i validation
- Type safety wymusza poprawny flow

---

### Case 4: Products (Złożone relacje)

**Charakterystyka:**
- ❌ Duża encja (11 kolumn)
- ✅ JSON field: bounding_box (typed)
- ⚠️ Technical field: search_vector (hidden)
- ✅ Relacje: N→1 Category, N→1 Page
- ✅ VIEW: v_active_products (denormalized)
- ✅ Lista vs szczegóły = różne struktury
- ✅ Standardowy CRUD (w kontekście verification)

**Decyzja:**
```typescript
// DTO (3 variants)
ProductDTO           // Base (bez technical fields)
ProductListItemDTO   // Z VIEW (flat, denormalized)
ProductDetailDTO     // Z JOINs (nested, normalized)

// Commands (2 standard)
CreateProductCommand // W kontekście verification
UpdateProductCommand // Edit przez admina
```

**Total: 5 typów** (3 DTO + 2 commands)

**Dlaczego 3 DTO?**

1. **ProductDTO** - Base type
   ```typescript
   // Czysta encja bez technical fields
   Omit<ProductEntity, 'search_vector' | 'created_at' | 'updated_at'>
   ```

2. **ProductListItemDTO** - Z VIEW
   ```typescript
   // Flat structure, pre-joined data
   Tables<'v_active_products'>
   // product_name, category_name, store_name, store_logo, valid_from, valid_to
   ```

3. **ProductDetailDTO** - Z relacjami
   ```typescript
   // Nested structure, full relations
   ProductDTO & {
     category: CategoryDTO,
     page: { 
       flyer: { 
         store: StoreDTO 
       } 
     }
   }
   ```

**Dlaczego różne struktury?**
- **Lista:** Optymalizacja (1 query do VIEW zamiast N+1 JOINs)
- **Szczegóły:** Struktura obiektowa (łatwiejsza w użyciu dla frontendu)

---

## 💡 Key Takeaways

### 1. Nie ma "one size fits all"
Każdy zasób ma unikalne wymagania. Typy DTO są **projektowane pod konkretne use cases**, nie jako uniwersalne kontenery.

### 2. Optymalizacja > Uniwersalność
Lepiej mieć 3 wyspecjalizowane typy (List, Detail, Create) niż 1 uniwersalny "do wszystkiego".

### 3. Business Logic determinuje typy
- Upload workflow → Upload commands
- Processing pipeline → Processing commands
- Verification → Verification commands
- Relations → ListItem/Detail DTOs

### 4. Performance matters
- Heavy fields → osobny ListItemDTO
- Denormalized data → VIEW-based DTO
- N+1 queries → JOIN-based ListItemDTO

### 5. Type Safety > Convenience
Lepiej mieć 5 precyzyjnych typów niż 1 permisywny:
```typescript
// ❌ Zbyt permisywny
interface UniversalPageCommand {
  action?: 'create' | 'upload' | 'process' | 'verify';
  // ... wszystkie możliwe pola
}

// ✅ Type-safe
interface CreatePageCommand { /* tylko potrzebne */ }
interface VerifyPageCommand { /* tylko potrzebne */ }
```

---

## 🎯 Praktyczne Guidelines

### Zacznij od minimum:
```typescript
export type XEntity = Tables<'x'>;
export type XDTO = Omit<XEntity, 'created_at' | 'updated_at'>;
export type CreateXCommand = ...;
export type UpdateXCommand = ...;
```

### Dodaj gdy potrzeba:

**Performance problem?**
```typescript
// + XListItemDTO (lighter)
```

**Relations in list?**
```typescript
// + XListItemDTO (with JOIN fields)
```

**Complex details?**
```typescript
// + XDetailDTO (with nested relations)
```

**Special operation?**
```typescript
// + SpecialOperationCommand
// + SpecialOperationResponse (if needed)
```

---

## 📖 Summary Table

| Zasób | Typy | Powód Dodatkowych Typów |
|-------|------|-------------------------|
| **Stores** | 3 | ➖ Brak (prosty CRUD) |
| **Categories** | 3 | ➖ Brak (prosty CRUD) |
| **Flyers** | 5 | ✅ Relacje (store_name)<br>✅ Optional nested (pages) |
| **Pages** | 7 | ✅ Heavy fields (optimization)<br>✅ Upload workflow (2 types)<br>✅ Processing (1 type)<br>✅ Verification (1 type) |
| **Products** | 5 | ✅ VIEW (denormalized list)<br>✅ JOINs (nested detail) |

---

## 🚀 Kiedy Ty Tworzysz Nowy Zasób

Zadaj sobie te pytania:

1. **Ile kolumn ma encja?** (>8 → consider ListItemDTO)
2. **Czy są heavy fields?** (JSON, TEXT → definitely ListItemDTO)
3. **Czy lista pokazuje dane z innych tabel?** (YES → ListItemDTO z JOIN)
4. **Czy szczegóły mają nested relations?** (YES → DetailDTO)
5. **Ile operacji (nie-CRUD)?** (każda → osobny Command)
6. **Czy operacja ma response?** (YES → Response type)
7. **Czy workflow ma kroki?** (YES → Command + Response per step)

**Reguła:** Zacznij od minimum (3 typy), dodawaj gdy potrzeba!

---

Mam nadzieję, że to wyjaśniło dlaczego różne zasoby mają różną liczbę typów! 🎓

