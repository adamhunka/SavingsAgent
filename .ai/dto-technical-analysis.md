# Analiza Techniczna DTO i Command Models - Głębsze zrozumienie

## Spis Treści
1. [Dlaczego separacja Entity/DTO/Command jest ważna?](#dlaczego-separacja)
2. [Wzorce architektoniczne](#wzorce-architektoniczne)
3. [TypeScript Type System - Zaawansowane](#typescript-advanced)
4. [Analiza każdego zasobu API](#analiza-zasobow)
5. [Edge cases i problemy](#edge-cases)
6. [Performance i optymalizacja](#performance)
7. [Testing strategy](#testing)

---

## 1. Dlaczego separacja Entity/DTO/Command jest ważna? {#dlaczego-separacja}

### 1.1 Problem: Tight Coupling

Wyobraź sobie że nie używamy DTO:

```typescript
// ❌ ANTYWZORZEC: Wysyłanie Entity bezpośrednio
app.get('/api/stores/:id', async (req, res) => {
  const store = await db.from('stores').select('*').eq('id', req.params.id).single();
  res.json(store); // Wysyłamy wszystko!
});

// Co jeśli dodamy pole 'internal_notes' do tabeli?
// ALTER TABLE stores ADD COLUMN internal_notes TEXT;
// 🔥 Nagle wysyłamy pole które klient nie powinien widzieć!
```

**Problem:**
- Każda zmiana w bazie danych wpływa na API
- Nie mamy kontroli nad tym co wysyłamy
- Trudno dodać nowe pola bez breaking changes

### 1.2 Rozwiązanie: DTO Layer

```typescript
// ✅ WZORZEC: DTO jako kontrakt API
type StoreEntity = Tables<'stores'>; // Reprezentacja bazy
type StoreDTO = Omit<StoreEntity, 'created_at' | 'updated_at' | 'internal_notes'>;

app.get('/api/stores/:id', async (req, res) => {
  const store = await db.from('stores').select('*').eq('id', req.params.id).single();
  
  // Explicit mapping Entity → DTO
  const dto: StoreDTO = {
    id: store.id,
    name: store.name,
    logo_url: store.logo_url,
    // internal_notes jest pomijane!
  };
  
  res.json(dto);
});

// Dodanie internal_notes do bazy NIE wpłynie na API
// DTO pozostaje niezmienne = stabilny kontrakt
```

**Korzyści:**
1. **Stability** - API contract nie zmienia się z każdą zmianą w bazie
2. **Security** - Kontrolujemy co eksponujemy
3. **Flexibility** - Możemy transformować dane (format dat, obliczenia)
4. **Versioning** - Łatwo stworzyć v2 API bez zmiany bazy

### 1.3 Command Pattern: Separacja intencji od implementacji

```typescript
// ❌ ANTYWZORZEC: Bezpośrednia akceptacja partial entity
app.patch('/api/stores/:id', async (req, res) => {
  // Klient może wysłać DOWOLNE pole!
  await db.from('stores').update(req.body).eq('id', req.params.id);
  // 🔥 Co jeśli klient wyśle { id: 'nowy-id' }?
  // 🔥 Co jeśli wyśle { created_at: '1970-01-01' }?
});
```

```typescript
// ✅ WZORZEC: Command jako explicit contract
type UpdateStoreCommand = {
  name?: string;
  logo_url?: string | null;
  // TYLKO te pola mogą być zmieniane!
};

app.patch('/api/stores/:id', async (req, res) => {
  const command: UpdateStoreCommand = req.body;
  
  // Validate command
  const validation = UpdateStoreCommandSchema.safeParse(command);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }
  
  // Execute command
  await db.from('stores').update(validation.data).eq('id', req.params.id);
});
```

**Korzyści Command Pattern:**
1. **Explicit intent** - Wiemy dokładnie co użytkownik chce zrobić
2. **Validation boundary** - Walidacja na granicy systemu
3. **Audit trail** - Możemy logować komendy (CQRS)
4. **Business rules** - Łatwo dodać logikę biznesową przed wykonaniem

---

## 2. Wzorce architektoniczne {#wzorce-architektoniczne}

### 2.1 Layered Architecture

```
┌─────────────────────────────────────┐
│         Frontend (React)             │
│  Używa: DTO types                   │
└──────────────┬──────────────────────┘
               │ HTTP (JSON)
               ▼
┌─────────────────────────────────────┐
│      API Layer (Astro)              │
│  Input: Command Models              │
│  Output: DTO                        │
│  Walidacja: Zod schemas             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Business Logic Layer               │
│  Używa: Domain Models (opcjonalnie) │
│  Reguły biznesowe                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Data Access Layer (Supabase)     │
│  Używa: Entity types (Tables<>)     │
│  SQL queries, transactions          │
└─────────────────────────────────────┘
```

### 2.2 Data Flow: Create Operation

```typescript
// KROK 1: Frontend wysyła Command
const command: CreateStoreCommand = {
  name: "Lidl",
  logo_url: "/logos/lidl.svg"
};

fetch('/api/v1/stores', {
  method: 'POST',
  body: JSON.stringify(command)
});

// KROK 2: API Handler waliduje Command
export async function POST({ request, locals }: APIContext) {
  const body = await request.json();
  
  // 2.1 Parse & Validate
  const command = CreateStoreCommandSchema.parse(body);
  
  // 2.2 Business rules
  const existingStore = await locals.supabase
    .from('stores')
    .select('id')
    .eq('name', command.name)
    .maybeSingle();
    
  if (existingStore) {
    throw new Error('Store with this name already exists');
  }
  
  // KROK 3: Map Command → Entity Insert
  const insertData: TablesInsert<'stores'> = {
    name: command.name,
    logo_url: command.logo_url ?? null,
    // id, created_at, updated_at - auto-generated
  };
  
  // KROK 4: Database operation
  const { data: entity, error } = await locals.supabase
    .from('stores')
    .insert(insertData)
    .select()
    .single();
    
  if (error) throw error;
  
  // KROK 5: Map Entity → DTO
  const dto: StoreDTO = {
    id: entity.id,
    name: entity.name,
    logo_url: entity.logo_url,
  };
  
  // KROK 6: Return DTO
  return new Response(JSON.stringify(dto), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 2.3 Mapping Strategy

**Strategia 1: Explicit Mapping (Recommended)**
```typescript
// Pros: Bezpieczeństwo typu, kontrola
// Cons: Więcej kodu
function entityToDTO(entity: StoreEntity): StoreDTO {
  return {
    id: entity.id,
    name: entity.name,
    logo_url: entity.logo_url,
  };
}
```

**Strategia 2: Spread + Pick (Faster, less safe)**
```typescript
// Pros: Mniej kodu
// Cons: Łatwo o błędy przy zmianach
function entityToDTO(entity: StoreEntity): StoreDTO {
  const { created_at, updated_at, ...dto } = entity;
  return dto;
}
```

**Strategia 3: Mapper Class (Enterprise)**
```typescript
class StoreMapper {
  static toDTO(entity: StoreEntity): StoreDTO {
    return {
      id: entity.id,
      name: entity.name,
      logo_url: entity.logo_url,
    };
  }
  
  static toDTOList(entities: StoreEntity[]): StoreDTO[] {
    return entities.map(this.toDTO);
  }
  
  static toEntity(command: CreateStoreCommand): TablesInsert<'stores'> {
    return {
      name: command.name,
      logo_url: command.logo_url ?? null,
    };
  }
}

// Usage
const dto = StoreMapper.toDTO(entity);
const dtos = StoreMapper.toDTOList(entities);
```

---

## 3. TypeScript Type System - Zaawansowane {#typescript-advanced}

### 3.1 Jak działają Mapped Types?

TypeScript używa **mapped types** do transformacji typów.

```typescript
// Definicja Partial w TypeScript
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Jak to działa?
interface Store {
  id: string;
  name: string;
  logo_url: string | null;
}

// Krok po kroku:
// 1. keyof Store = 'id' | 'name' | 'logo_url'
// 2. [P in 'id' | 'name' | 'logo_url'] - iteracja po każdym kluczu
// 3. ?: - dodaj optional modifier
// 4. T[P] - zachowaj oryginalny typ wartości

// Rezultat:
type PartialStore = {
  id?: string;
  name?: string;
  logo_url?: string | null;
};
```

### 3.2 Conditional Types

```typescript
// Definicja NonNullable w TypeScript
type NonNullable<T> = T extends null | undefined ? never : T;

// Przykład użycia:
type MaybeString = string | null | undefined;
type DefinitelyString = NonNullable<MaybeString>; // string

// Custom conditional type:
type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T];

interface Example {
  required: string;
  optional?: number;
}

type OnlyRequired = RequiredKeys<Example>; // 'required'
```

### 3.3 Template Literal Types

```typescript
// Generowanie nazw typów dynamicznie
type EventName = 'store' | 'category' | 'product';
type EventAction = 'created' | 'updated' | 'deleted';

type Event = `${EventName}:${EventAction}`;
// Event = 'store:created' | 'store:updated' | 'store:deleted' 
//       | 'category:created' | 'category:updated' | ...

// Praktyczne użycie:
type ApiEndpoint = `/api/v1/${EventName}`;
// ApiEndpoint = '/api/v1/store' | '/api/v1/category' | '/api/v1/product'
```

### 3.4 Intersection vs Union

```typescript
// INTERSECTION (&) - WSZYSTKIE właściwości
type A = { a: string };
type B = { b: number };
type C = A & B; // { a: string; b: number }

// Praktyczny przykład:
type FlyerDTO = Omit<FlyerEntity, 'created_at' | 'updated_at'>;
type FlyerListItemDTO = FlyerDTO & {
  store_name: string; // DODAJEMY pole
};

// UNION (|) - JEDNA Z opcji
type Status = 'draft' | 'active' | 'archived';
type Result = Success | Error;
```

### 3.5 Narrowing Types

```typescript
// Type Guards
function isStoreDTO(value: unknown): value is StoreDTO {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  );
}

// Discriminated Unions
type ApiSuccess<T> = {
  status: 'success';
  data: T;
};

type ApiError = {
  status: 'error';
  error: { code: string; message: string };
};

type ApiResponse<T> = ApiSuccess<T> | ApiError;

function handleResponse<T>(response: ApiResponse<T>) {
  if (response.status === 'success') {
    // TypeScript wie że to ApiSuccess
    console.log(response.data);
  } else {
    // TypeScript wie że to ApiError
    console.log(response.error);
  }
}
```

---

## 4. Analiza każdego zasobu API {#analiza-zasobow}

### 4.1 Stores - Prosty CRUD

**Charakterystyka:**
- Mało pól (5 kolumn)
- Proste relacje (1→N z flyers)
- Publiczny odczyt, admin modyfikacja

**Typy:**

```typescript
// Entity - wszystkie pola z bazy
export type StoreEntity = Tables<'stores'>;
// {
//   id: string;
//   name: string;
//   logo_url: string | null;
//   created_at: string;
//   updated_at: string;
// }

// DTO - bez timestamps (klient nie potrzebuje)
export type StoreDTO = Omit<StoreEntity, 'created_at' | 'updated_at'>;

// Create Command - tylko name i logo_url
// name jest required, logo_url optional
export type CreateStoreCommand = Required<Pick<TablesInsert<'stores'>, 'name'>> & 
  Pick<TablesInsert<'stores'>, 'logo_url'>;

// Update Command - oba pola optional
export type UpdateStoreCommand = Pick<TablesUpdate<'stores'>, 'name' | 'logo_url'>;
```

**Decyzje projektowe:**
1. **Dlaczego Omit dla DTO?** - Mamy 5 pól, usuwamy 2 → Omit jest jasny
2. **Dlaczego Required<Pick> dla Create?** - Wymuszamy 'name' jako required
3. **Dlaczego TablesInsert a nie Tables?** - TablesInsert ma już pola z default values jako optional

### 4.2 Categories - Ordering i Constraints

**Charakterystyka:**
- Display order (sortowanie)
- Icon name (związany z UI)
- Relacja 1→N z products (RESTRICT deletion)

**Typy:**

```typescript
export type CategoryEntity = Tables<'categories'>;

export type CategoryDTO = Omit<CategoryEntity, 'created_at' | 'updated_at'>;

// Wszystkie pola required przy tworzeniu (oprócz display_order ma default)
export type CreateCategoryCommand = Required<
  Pick<TablesInsert<'categories'>, 'name' | 'icon_name'>
> & Pick<TablesInsert<'categories'>, 'display_order'>;

export type UpdateCategoryCommand = Pick<TablesUpdate<'categories'>, 
  'name' | 'icon_name' | 'display_order'
>;
```

**Specjalne przypadki:**

```typescript
// Reordering categories
export interface ReorderCategoriesCommand {
  // Array of category IDs in new order
  category_ids: string[];
}

// Handler będzie aktualizował display_order dla każdej kategorii
```

**Business Rules:**
1. Deletion blocked if products exist (DB RESTRICT)
2. Unique name constraint
3. display_order używane do sortowania w UI

### 4.3 Flyers - Dates i Status

**Charakterystyka:**
- Date range validation (valid_from, valid_to)
- Status workflow (draft → active → archived)
- Relations: N→1 Store, 1→N Pages

**Typy:**

```typescript
export type FlyerEntity = Tables<'flyers'>;

// Basic DTO
export type FlyerDTO = Omit<FlyerEntity, 'created_at' | 'updated_at'>;

// List item with store name (JOIN)
export type FlyerListItemDTO = FlyerDTO & {
  store_name: string;
};

// Detail with pages (optional include)
export type FlyerDetailDTO = FlyerListItemDTO & {
  pages?: PageListItemDTO[];
};

// Create command
export type CreateFlyerCommand = Required<
  Pick<TablesInsert<'flyers'>, 'store_id' | 'valid_from' | 'valid_to'>
> & Pick<TablesInsert<'flyers'>, 'status'>;

// Update command
export type UpdateFlyerCommand = Pick<TablesUpdate<'flyers'>, 
  'valid_from' | 'valid_to' | 'status'
>;
```

**Business Rules (nie w typach, ale w handler'ach):**

```typescript
// Walidacja w handler'ze
function validateFlyerDates(command: CreateFlyerCommand | UpdateFlyerCommand) {
  if (command.valid_from && command.valid_to) {
    const from = new Date(command.valid_from);
    const to = new Date(command.valid_to);
    
    if (to < from) {
      throw new ValidationError('valid_to must be >= valid_from');
    }
  }
}

// Status workflow
function canTransitionStatus(from: FlyerStatus, to: FlyerStatus): boolean {
  const transitions: Record<FlyerStatus, FlyerStatus[]> = {
    draft: ['active', 'archived'],
    active: ['archived'],
    archived: [], // No transitions from archived
  };
  
  return transitions[from].includes(to);
}
```

### 4.4 Pages - Processing Pipeline

**Charakterystyka:**
- Image storage (Supabase Storage)
- Processing status machine
- AI response (JSON storage)
- Error handling

**Status Flow:**
```
pending → processing → processed → verified
   ↓           ↓
error    no_products
```

**Typy:**

```typescript
export type PageEntity = Tables<'pages'>;

// Full page DTO (for detail view)
export type PageDTO = Omit<PageEntity, 'created_at' | 'updated_at'>;

// List item (smaller payload)
export type PageListItemDTO = Pick<PageEntity,
  'id' | 'page_number' | 'image_path' | 'processing_status' | 
  'processing_started_at' | 'verified_at' | 'verified_by'
>;

// Register page after upload
export type CreatePageCommand = Required<
  Pick<TablesInsert<'pages'>, 'flyer_id' | 'page_number' | 'image_path'>
> & Pick<TablesInsert<'pages'>, 'image_width' | 'image_height'>;

// Upload URL request
export interface UploadUrlRequestCommand {
  page_number: number;
  filename: string;
  content_type: string;
  width?: number;
  height?: number;
}

// Upload URL response
export interface UploadUrlResponse {
  upload_url: string;    // Pre-signed URL for upload
  public_path: string;   // Path for image_path field
  expires_at: string;    // URL expiry
}

// Start processing
export interface StartProcessingCommand {
  force?: boolean; // Force reprocessing even if already processed
}

// Verify page
export interface VerifyPageCommand {
  action: 'approve' | 'reject' | 'mark_no_products';
  verified_by: string; // Profile ID
  error_details?: string; // Required if action === 'reject'
}
```

**Complex Business Logic:**

```typescript
// Handler dla verify
async function verifyPage(pageId: string, command: VerifyPageCommand) {
  const updates: Partial<PageEntity> = {
    verified_by: command.verified_by,
    verified_at: new Date().toISOString(),
  };
  
  switch (command.action) {
    case 'approve':
      updates.processing_status = 'verified';
      break;
      
    case 'reject':
      if (!command.error_details) {
        throw new ValidationError('error_details required for reject');
      }
      updates.processing_status = 'error';
      updates.error_details = command.error_details;
      break;
      
    case 'mark_no_products':
      updates.processing_status = 'no_products';
      break;
  }
  
  await db.from('pages').update(updates).eq('id', pageId);
}
```

### 4.5 Products - Complex Relations

**Charakterystyka:**
- Many fields (11 kolumn)
- Relations: N→1 Category, N→1 Page
- View dla listy (v_active_products)
- Full-text search + trigram
- Price validation rules

**Typy:**

```typescript
export type ProductEntity = Tables<'products'>;

// Basic DTO - remove technical fields
export type ProductDTO = Omit<ProductEntity, 
  'search_vector' | 'created_at' | 'updated_at'
>;

// List item from view (denormalized data)
export type ProductListItemDTO = Tables<'v_active_products'>;
// View już zawiera:
// - product fields
// - category_name, category_icon
// - store_name, store_logo
// - valid_from, valid_to

// Detail with full relations
export type ProductDetailDTO = ProductDTO & {
  category: Pick<CategoryEntity, 'id' | 'name' | 'icon_name'>;
  page: Pick<PageEntity, 'id' | 'page_number' | 'image_path'> & {
    flyer: Pick<FlyerEntity, 'id' | 'valid_from' | 'valid_to'> & {
      store: Pick<StoreEntity, 'id' | 'name' | 'logo_url'>;
    };
  };
};

// Create command (from verification UI)
export type CreateProductCommand = Omit<TablesInsert<'products'>,
  'id' | 'created_at' | 'updated_at' | 'search_vector' | 'page_id'
> & Required<Pick<TablesInsert<'products'>, 
  'category_id' | 'name' | 'price_promo'
>>;

// Update command
export type UpdateProductCommand = Omit<TablesUpdate<'products'>,
  'id' | 'page_id' | 'created_at' | 'updated_at' | 'search_vector'
>;
```

**Business Rules:**

```typescript
// Price validation
function validateProductPrices(command: CreateProductCommand | UpdateProductCommand) {
  if (command.price_promo !== undefined && command.price_promo <= 0) {
    throw new ValidationError('price_promo must be > 0');
  }
  
  if (command.price_regular !== undefined && 
      command.price_regular !== null && 
      command.price_regular <= 0) {
    throw new ValidationError('price_regular must be > 0');
  }
  
  if (command.price_regular !== undefined && 
      command.price_regular !== null &&
      command.price_promo !== undefined &&
      command.price_regular < command.price_promo) {
    throw new ValidationError('price_regular must be >= price_promo');
  }
}

// Bounding box validation
function validateBoundingBox(bbox: Json | null) {
  if (!bbox) return;
  
  if (typeof bbox !== 'object' || bbox === null) {
    throw new ValidationError('bounding_box must be an object');
  }
  
  const required = ['x', 'y', 'width', 'height'];
  for (const key of required) {
    if (!(key in bbox) || typeof bbox[key] !== 'number') {
      throw new ValidationError(`bounding_box.${key} must be a number`);
    }
  }
}
```

### 4.6 Search - Query Pattern

```typescript
// Search query parameters
export interface SearchProductsQuery {
  q: string;                    // Search query
  store_id?: string;            // Filter by store
  category_id?: string;         // Filter by category
  min_price?: number;           // Price range
  max_price?: number;
  similarity_threshold?: number; // For trigram (0-1, default 0.3)
  page?: number;                // Pagination
  per_page?: number;
  sort?: 'price_asc' | 'price_desc' | 'created_at_desc';
}

// Search result (same as product list item)
export type SearchResultDTO = ProductListItemDTO & {
  similarity_score?: number; // If using trigram
  rank?: number;             // If using ts_rank
};

// Search response
export interface SearchProductsResponse {
  data: SearchResultDTO[];
  meta: PaginationMeta & {
    query: string;
    filters_applied: {
      store_id?: string;
      category_id?: string;
      price_range?: { min: number; max: number };
    };
  };
}
```

---

## 5. Edge Cases i Problemy {#edge-cases}

### 5.1 Nullable vs Optional

**Problem:** Różnica między `field?: T` i `field: T | null`

```typescript
// OPTIONAL - pole może nie istnieć w obiekcie
interface A {
  field?: string;
}

const a1: A = {}; // ✅ OK
const a2: A = { field: undefined }; // ✅ OK
const a3: A = { field: null }; // ❌ ERROR

// NULLABLE - pole musi istnieć ale może być null
interface B {
  field: string | null;
}

const b1: B = {}; // ❌ ERROR - field is required
const b2: B = { field: undefined }; // ❌ ERROR
const b3: B = { field: null }; // ✅ OK
```

**W naszym przypadku:**

```typescript
// Baza danych: logo_url NULLABLE column
// Tables<'stores'> → logo_url: string | null (NOT optional!)

// Command: logo_url optional (może być pominięte w body)
interface CreateStoreCommand {
  name: string;
  logo_url?: string | null; // Optional AND nullable
}

// Mapping Command → Entity
function commandToInsert(cmd: CreateStoreCommand): TablesInsert<'stores'> {
  return {
    name: cmd.name,
    logo_url: cmd.logo_url ?? null, // undefined → null
  };
}
```

### 5.2 Enum Types

**Problem:** TypeScript enums vs string literal unions

```typescript
// ❌ UNIKAJ TypeScript enum
enum FlyerStatus {
  Draft = 'draft',
  Active = 'active',
  Archived = 'archived'
}

// ✅ UŻYWAJ string literal union (z Supabase)
type FlyerStatus = Database['public']['Enums']['flyer_status'];
// = 'draft' | 'active' | 'archived'

// Dlaczego?
// 1. Enums generują JavaScript kod (zwiększa bundle)
// 2. Enums nie są kompatybilne z JSON
// 3. String unions są bardziej type-safe
```

**Pracowanie z enumami:**

```typescript
// Import from database types
export type FlyerStatus = Enums<'flyer_status'>;
export type PageProcessingStatus = Enums<'page_processing_status'>;
export type UserRole = Enums<'user_role'>;

// Runtime validation (Zod)
import { z } from 'zod';

const FlyerStatusSchema = z.enum(['draft', 'active', 'archived']);
const PageProcessingStatusSchema = z.enum([
  'pending', 'processing', 'processed', 'verified', 'error', 'no_products'
]);

// Type-safe constants
export const FLYER_STATUSES = {
  DRAFT: 'draft' as const,
  ACTIVE: 'active' as const,
  ARCHIVED: 'archived' as const,
} satisfies Record<string, FlyerStatus>;

// Usage
const status: FlyerStatus = FLYER_STATUSES.DRAFT; // Type-safe!
```

### 5.3 JSON Fields

**Problem:** `Json` type jest bardzo szeroki

```typescript
// Supabase definicja
type Json = string | number | boolean | null | 
  { [key: string]: Json | undefined } | Json[];

// Nasze przypadki:
// 1. bounding_box (products)
// 2. ai_raw_response (pages)
```

**Rozwiązanie: Narrow down types**

```typescript
// Definicja struktury bounding box
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Override w DTO
export type ProductDTO = Omit<ProductEntity, 
  'bounding_box' | 'search_vector' | 'created_at' | 'updated_at'
> & {
  bounding_box: BoundingBox | null; // Konkretny typ zamiast Json
};

// AI Response structure (vary by AI provider)
export interface AIExtractionResponse {
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  products: Array<{
    name: string;
    price: number;
    bounding_box?: BoundingBox;
    // ... extracted fields
  }>;
}

export type PageDTO = Omit<PageEntity, 
  'ai_raw_response' | 'created_at' | 'updated_at'
> & {
  ai_raw_response: AIExtractionResponse | null;
};
```

### 5.4 Timestamp Handling

**Problem:** Baza zwraca string, frontend może chcieć Date

```typescript
// Database: TIMESTAMP WITH TIME ZONE → string (ISO 8601)
// "2025-11-27T10:30:00.000Z"

// Opcja 1: Zostaw jako string (prostsze)
export type StoreDTO = {
  id: string;
  name: string;
  created_at: string; // ISO 8601 string
};

// Opcja 2: Transform do Date (wymaga mappingu)
export type StoreDTO = {
  id: string;
  name: string;
  created_at: Date;
};

// Mapper
function entityToDTO(entity: StoreEntity): StoreDTO {
  return {
    ...entity,
    created_at: new Date(entity.created_at),
  };
}

// ⚠️ PROBLEM: Date nie jest serializowalne do JSON!
// JSON.stringify({ date: new Date() }) → {"date":"2025-11-27T..."}
// Transformuje się z powrotem do stringa!

// ✅ REKOMENDACJA: Zostaw jako string
// Frontend może parsować gdy potrzebuje:
// const date = new Date(dto.created_at);
```

### 5.5 Recursive Types

**Problem:** Zagnieżdżone komentarze, kategorie z pod-kategoriami

```typescript
// Nie mamy w projekcie, ale gdybyśmy mieli:
export interface CategoryTree extends CategoryDTO {
  children: CategoryTree[]; // Rekurencja
  parent_id: string | null;
}

// TypeScript obsługuje rekurencyjne typy!
```

---

## 6. Performance i Optymalizacja {#performance}

### 6.1 DTO Size Optimization

**Problem:** Wysyłanie zbyt dużo danych

```typescript
// ❌ BAD: Pełny DTO w liście (1000 produktów × 2KB = 2MB)
type ProductListItemDTO = ProductDTO; // Wszystkie pola

// ✅ GOOD: Minimal DTO dla listy
type ProductListItemDTO = Pick<ProductDTO,
  'id' | 'name' | 'price_promo' | 'price_regular'
> & {
  category_name: string;
  store_name: string;
};
// (1000 produktów × 200B = 200KB)
```

### 6.2 N+1 Query Problem

**Problem:** Fetching relations w pętli

```typescript
// ❌ BAD: N+1 queries
async function getProductsWithCategory(ids: string[]) {
  const products = await db.from('products').select('*').in('id', ids);
  
  // N additional queries!
  for (const product of products) {
    const category = await db.from('categories')
      .select('*')
      .eq('id', product.category_id)
      .single();
    product.category = category;
  }
  
  return products;
}

// ✅ GOOD: Single query with JOIN or VIEW
async function getProductsWithCategory(ids: string[]) {
  // Użyj view
  const products = await db.from('v_active_products')
    .select('*')
    .in('product_id', ids);
  
  return products; // Kategoria już w wyniku
}
```

### 6.3 Pagination Strategy

**Offset vs Cursor:**

```typescript
// Offset pagination (prostsze, ale wolniejsze dla dużych offsetów)
interface OffsetPaginationQuery {
  page: number;      // 1-indexed
  per_page: number;  // Default 20
}

// SQL: LIMIT per_page OFFSET (page - 1) * per_page
// Problem: OFFSET 10000 jest wolne (DB musi przeskanować 10k rekordów)

// Cursor pagination (szybsze, ale bardziej złożone)
interface CursorPaginationQuery {
  cursor?: string;   // Base64 encoded { id, created_at }
  limit: number;
}

// SQL: WHERE (created_at, id) > (cursor_created_at, cursor_id) LIMIT limit
// Szybkie nawet dla dużych zbiorów (używa indeksu)
```

**Implementacja cursor pagination:**

```typescript
export interface CursorPaginationMeta {
  next_cursor: string | null;
  has_more: boolean;
}

function encodeCursor(id: string, created_at: string): string {
  return Buffer.from(JSON.stringify({ id, created_at })).toString('base64');
}

function decodeCursor(cursor: string): { id: string; created_at: string } {
  return JSON.parse(Buffer.from(cursor, 'base64').toString());
}

async function getProductsCursor(query: { cursor?: string; limit: number }) {
  let dbQuery = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(query.limit + 1); // +1 to check if there's more
  
  if (query.cursor) {
    const { id, created_at } = decodeCursor(query.cursor);
    dbQuery = dbQuery.lt('created_at', created_at);
    // Handle tie-break on same created_at
    dbQuery = dbQuery.or(`created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`);
  }
  
  const { data } = await dbQuery;
  
  const has_more = data.length > query.limit;
  const items = has_more ? data.slice(0, -1) : data;
  
  const next_cursor = has_more 
    ? encodeCursor(items[items.length - 1].id, items[items.length - 1].created_at)
    : null;
  
  return {
    data: items,
    meta: { next_cursor, has_more }
  };
}
```

### 6.4 Caching Strategy

```typescript
// Response type with cache hints
export interface CachedResponse<T> {
  data: T;
  meta: {
    cached_at: string;
    cache_ttl: number; // seconds
  };
}

// Cache headers
function setCacheHeaders(response: Response, ttl: number) {
  response.headers.set('Cache-Control', `public, max-age=${ttl}`);
  response.headers.set('Expires', new Date(Date.now() + ttl * 1000).toUTCString());
}

// Example: Cache store list for 5 minutes
app.get('/api/v1/stores', async (req, res) => {
  const stores = await getStores();
  
  const response = {
    data: stores,
    meta: {
      total: stores.length,
      cached_at: new Date().toISOString(),
      cache_ttl: 300
    }
  };
  
  setCacheHeaders(res, 300); // 5 minutes
  res.json(response);
});
```

---

## 7. Testing Strategy {#testing}

### 7.1 Type Testing

```typescript
// Use TypeScript's type system to test types!
import { expect, test } from 'vitest';
import type { Equal, Expect } from '@type-challenges/utils';

test('StoreDTO should match expected shape', () => {
  type Expected = {
    id: string;
    name: string;
    logo_url: string | null;
  };
  
  type Result = Expect<Equal<StoreDTO, Expected>>;
  // Compile error if types don't match!
});

test('CreateStoreCommand should have required name', () => {
  // @ts-expect-error - name is required
  const invalid: CreateStoreCommand = { logo_url: 'test' };
  
  // @ts-expect-ok
  const valid: CreateStoreCommand = { name: 'test' };
});
```

### 7.2 Runtime Validation Testing

```typescript
import { describe, it, expect } from 'vitest';
import { CreateStoreCommandSchema } from './schemas';

describe('CreateStoreCommand validation', () => {
  it('should accept valid command', () => {
    const valid = {
      name: 'Lidl',
      logo_url: '/logos/lidl.svg'
    };
    
    const result = CreateStoreCommandSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
  
  it('should reject missing name', () => {
    const invalid = {
      logo_url: '/logos/test.svg'
    };
    
    const result = CreateStoreCommandSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['name']);
    }
  });
  
  it('should reject empty name', () => {
    const invalid = {
      name: '',
      logo_url: '/logos/test.svg'
    };
    
    const result = CreateStoreCommandSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
```

### 7.3 Mapper Testing

```typescript
import { describe, it, expect } from 'vitest';

describe('Store mappers', () => {
  it('should map entity to DTO correctly', () => {
    const entity: StoreEntity = {
      id: '123',
      name: 'Lidl',
      logo_url: '/logos/lidl.svg',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };
    
    const dto = entityToDTO(entity);
    
    expect(dto).toEqual({
      id: '123',
      name: 'Lidl',
      logo_url: '/logos/lidl.svg'
    });
    
    expect('created_at' in dto).toBe(false);
    expect('updated_at' in dto).toBe(false);
  });
  
  it('should map command to insert correctly', () => {
    const command: CreateStoreCommand = {
      name: 'Lidl',
      logo_url: '/logos/lidl.svg'
    };
    
    const insert = commandToInsert(command);
    
    expect(insert.name).toBe('Lidl');
    expect(insert.logo_url).toBe('/logos/lidl.svg');
    expect(insert.id).toBeUndefined(); // Should not set ID
  });
  
  it('should handle missing optional fields', () => {
    const command: CreateStoreCommand = {
      name: 'Lidl'
      // logo_url omitted
    };
    
    const insert = commandToInsert(command);
    
    expect(insert.logo_url).toBe(null); // undefined → null
  });
});
```

---

## Podsumowanie

Ta analiza techniczna pokazuje:

1. **Dlaczego** stosujemy separację Entity/DTO/Command (bezpieczeństwo, stabilność)
2. **Jak** TypeScript type system działa pod spodem (mapped types, conditionals)
3. **Zaawansowane wzorce** dla każdego typu zasobu
4. **Edge cases** i jak je obsługiwać
5. **Performance** - optymalizacja DTO i queries
6. **Testing** - jak testować typy i mappers

To nie jest tylko "zrób tak bo tak" - to głębokie zrozumienie DLACZEGO każda decyzja projektowa została podjęta.
