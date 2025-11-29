# DTO & Command Models - Cheatsheet

Szybka ściągawka dla implementacji typów DTO i Command Models.

## 📋 Quick Reference

### Konwencje Nazewnictwa

```typescript
*Entity              // Alias dla Tables<'nazwa_tabeli'>
*DTO                 // Typ wysyłany do klienta (GET response)
*ListItemDTO         // Uproszczony DTO dla list
*DetailDTO           // Rozszerzony DTO z relacjami
Create*Command       // POST request body
Update*Command       // PATCH request body
*Query               // GET query parameters
*Response            // Wrapper z meta (lista + paginacja)
```

### TypeScript Utility Types

| Utility | Użycie | Przykład |
|---------|--------|----------|
| `Pick<T, K>` | Wybierz tylko określone pola | `Pick<User, 'id' \| 'name'>` |
| `Omit<T, K>` | Usuń określone pola | `Omit<User, 'password'>` |
| `Partial<T>` | Wszystkie pola optional | `Partial<User>` |
| `Required<T>` | Wszystkie pola required | `Required<User>` |
| `T & U` | Połącz dwa typy | `UserDTO & { role: string }` |
| `T \| U` | Jeden z typów | `string \| null` |

---

## 🎯 Wzorce Implementacji

### Wzorzec 1: Prosty DTO (bez timestamps)

```typescript
// WZORZEC: Usuń timestamps z Entity
export type XEntity = Tables<'nazwa_tabeli'>;
export type XDTO = Omit<XEntity, 'created_at' | 'updated_at'>;

// PRZYKŁAD:
export type StoreEntity = Tables<'stores'>;
export type StoreDTO = Omit<StoreEntity, 'created_at' | 'updated_at'>;
```

### Wzorzec 2: Create Command (większość pól wymagana)

```typescript
// WZORZEC: Usuń auto-generated fields, wymuszaj required fields
export type CreateXCommand = 
  Omit<TablesInsert<'nazwa_tabeli'>, 'id' | 'created_at' | 'updated_at'> &
  Required<Pick<TablesInsert<'nazwa_tabeli'>, 'pole1' | 'pole2'>>;

// PRZYKŁAD:
export type CreateStoreCommand = 
  Required<Pick<TablesInsert<'stores'>, 'name'>> & 
  Pick<TablesInsert<'stores'>, 'logo_url'>;
```

### Wzorzec 3: Create Command (tylko kilka pól)

```typescript
// WZORZEC: Pick tylko potrzebne pola
export type CreateXCommand = 
  Required<Pick<TablesInsert<'nazwa_tabeli'>, 'required_field'>> &
  Pick<TablesInsert<'nazwa_tabeli'>, 'optional_field'>;

// PRZYKŁAD:
export type CreateCategoryCommand = 
  Required<Pick<TablesInsert<'categories'>, 'name' | 'icon_name'>> &
  Pick<TablesInsert<'categories'>, 'display_order'>;
```

### Wzorzec 4: Update Command

```typescript
// WZORZEC: Pick pola które można zmieniać (już są optional w TablesUpdate)
export type UpdateXCommand = Pick<TablesUpdate<'nazwa_tabeli'>, 
  'pole1' | 'pole2' | 'pole3'
>;

// PRZYKŁAD:
export type UpdateStoreCommand = Pick<TablesUpdate<'stores'>, 
  'name' | 'logo_url'
>;
```

### Wzorzec 5: List Item DTO (z relacją)

```typescript
// WZORZEC: Bazowy DTO + dodatkowe pola z JOIN
export type XListItemDTO = XDTO & {
  related_field: string;
};

// PRZYKŁAD:
export type FlyerListItemDTO = FlyerDTO & {
  store_name: string;
};
```

### Wzorzec 6: Detail DTO (zagnieżdżone relacje)

```typescript
// WZORZEC: DTO + nested objects
export type XDetailDTO = XDTO & {
  related_entity: Pick<RelatedEntity, 'pole1' | 'pole2'>;
};

// PRZYKŁAD:
export type ProductDetailDTO = ProductDTO & {
  category: Pick<CategoryEntity, 'id' | 'name' | 'icon_name'>;
  page: Pick<PageEntity, 'id' | 'page_number' | 'image_path'>;
};
```

### Wzorzec 7: List Response

```typescript
// WZORZEC: Array + PaginationMeta
export interface XListResponse {
  data: XDTO[];
  meta: PaginationMeta;
}

// PRZYKŁAD:
export interface StoresListResponse {
  data: StoreDTO[];
  meta: PaginationMeta;
}
```

### Wzorzec 8: Override JSON field

```typescript
// WZORZEC: Omit JSON field, dodaj konkretny typ
export type XDTO = Omit<XEntity, 'json_field' | 'timestamps'> & {
  json_field: ConcreteType | null;
};

// PRZYKŁAD:
export type ProductDTO = Omit<ProductEntity, 
  'bounding_box' | 'search_vector' | 'created_at' | 'updated_at'
> & {
  bounding_box: BoundingBox | null;
};
```

---

## 📚 Biblioteka Gotowych Fragmentów

### Wspólne Typy

```typescript
// Paginacja offset-based
export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Paginacja cursor-based
export interface CursorPaginationMeta {
  next_cursor: string | null;
  has_more: boolean;
}

// Błąd API
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// Generic response
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

// Generic list response
export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

### Entity Aliases

```typescript
export type StoreEntity = Tables<'stores'>;
export type CategoryEntity = Tables<'categories'>;
export type FlyerEntity = Tables<'flyers'>;
export type PageEntity = Tables<'pages'>;
export type ProductEntity = Tables<'products'>;
export type ProfileEntity = Tables<'profiles'>;
```

### Enum Aliases

```typescript
export type FlyerStatus = Enums<'flyer_status'>;
export type PageProcessingStatus = Enums<'page_processing_status'>;
export type UserRole = Enums<'user_role'>;
```

---

## 🔧 Zod Schemas - Wzorce

### Basic Field Schemas

```typescript
import { z } from 'zod';

// UUID
const UUIDSchema = z.string().uuid();

// String (required, trimmed, max length)
const NameSchema = z.string().min(1).max(255).trim();

// String (optional, nullable)
const OptionalStringSchema = z.string().nullable().optional();

// Number (positive)
const PriceSchema = z.number().positive();

// Number (positive, nullable, optional)
const OptionalPriceSchema = z.number().positive().nullable().optional();

// Date string (YYYY-MM-DD)
const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Enum
const StatusSchema = z.enum(['draft', 'active', 'archived']);

// Boolean with default
const BooleanWithDefaultSchema = z.boolean().default(false);
```

### Schema z Refinement (custom validation)

```typescript
// Date range validation
const CreateFlyerSchema = z.object({
  store_id: z.string().uuid(),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valid_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine(
  (data) => new Date(data.valid_to) >= new Date(data.valid_from),
  {
    message: "valid_to must be >= valid_from",
    path: ["valid_to"],
  }
);

// Price validation
const CreateProductSchema = z.object({
  price_promo: z.number().positive(),
  price_regular: z.number().positive().nullable().optional(),
}).refine(
  (data) => {
    if (data.price_regular) {
      return data.price_regular >= data.price_promo;
    }
    return true;
  },
  {
    message: "price_regular must be >= price_promo",
    path: ["price_regular"],
  }
);

// Conditional required field
const VerifyPageSchema = z.object({
  action: z.enum(['approve', 'reject', 'mark_no_products']),
  error_details: z.string().optional(),
}).refine(
  (data) => {
    if (data.action === 'reject') {
      return !!data.error_details;
    }
    return true;
  },
  {
    message: "error_details required when action is 'reject'",
    path: ["error_details"],
  }
);
```

---

## 🛠️ Mapper Functions

### Basic Mapper

```typescript
export class XMapper {
  // Entity → DTO
  static toDTO(entity: XEntity): XDTO {
    return {
      id: entity.id,
      field1: entity.field1,
      field2: entity.field2,
      // Pomijamy created_at, updated_at
    };
  }
  
  // Entity[] → DTO[]
  static toDTOList(entities: XEntity[]): XDTO[] {
    return entities.map(this.toDTO);
  }
  
  // Command → Insert
  static toInsert(command: CreateXCommand): TablesInsert<'table_name'> {
    return {
      field1: command.field1,
      field2: command.field2 ?? null, // undefined → null
    };
  }
  
  // Command → Update
  static toUpdate(command: UpdateXCommand): TablesUpdate<'table_name'> {
    const update: TablesUpdate<'table_name'> = {};
    
    if (command.field1 !== undefined) {
      update.field1 = command.field1;
    }
    if (command.field2 !== undefined) {
      update.field2 = command.field2;
    }
    
    return update;
  }
}
```

### Mapper z JSON Parsing

```typescript
export class ProductMapper {
  static toDTO(entity: ProductEntity): ProductDTO {
    return {
      ...entity,
      bounding_box: this.parseBoundingBox(entity.bounding_box),
    };
  }
  
  private static parseBoundingBox(json: unknown): BoundingBox | null {
    if (!json || typeof json !== 'object') return null;
    
    const bbox = json as Record<string, unknown>;
    
    if (
      typeof bbox.x === 'number' &&
      typeof bbox.y === 'number' &&
      typeof bbox.width === 'number' &&
      typeof bbox.height === 'number'
    ) {
      return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
    }
    
    return null;
  }
  
  static toInsert(command: CreateProductCommand, page_id: string): TablesInsert<'products'> {
    return {
      ...command,
      page_id,
      bounding_box: command.bounding_box ? JSON.stringify(command.bounding_box) : null,
    };
  }
}
```

---

## 🎨 API Handler Template

### GET List Endpoint

```typescript
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    // 1. Parse query params
    const page = parseInt(url.searchParams.get('page') || '1');
    const per_page = Math.min(parseInt(url.searchParams.get('per_page') || '20'), 100);
    
    // 2. Query database
    const { data, error, count } = await locals.supabase
      .from('table_name')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * per_page, page * per_page - 1);
    
    if (error) throw error;
    
    // 3. Map to DTO
    const items = Mapper.toDTOList(data || []);
    
    // 4. Build response
    const response: XListResponse = {
      data: items,
      meta: {
        total: count || 0,
        page,
        per_page,
        total_pages: Math.ceil((count || 0) / per_page),
      },
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    const apiError: ApiError = {
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch data' },
    };
    return new Response(JSON.stringify(apiError), { status: 500 });
  }
};
```

### POST Create Endpoint

```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Check auth
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
      }), { status: 401 });
    }
    
    // 2. Check role (if admin only)
    const { data: profile } = await locals.supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }), { status: 403 });
    }
    
    // 3. Parse & validate body
    const body = await request.json();
    const validation = CreateXCommandSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: validation.error.flatten().fieldErrors,
        }
      }), { status: 400 });
    }
    
    const command: CreateXCommand = validation.data;
    
    // 4. Insert to database
    const insertData = Mapper.toInsert(command);
    
    const { data, error: dbError } = await locals.supabase
      .from('table_name')
      .insert(insertData)
      .select()
      .single();
    
    if (dbError) {
      // Handle unique constraint
      if (dbError.code === '23505') {
        return new Response(JSON.stringify({
          error: { code: 'CONFLICT', message: 'Resource already exists' }
        }), { status: 409 });
      }
      throw dbError;
    }
    
    // 5. Map to DTO and return
    const dto = Mapper.toDTO(data);
    
    return new Response(JSON.stringify(dto), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create resource' }
    }), { status: 500 });
  }
};
```

### PATCH Update Endpoint

```typescript
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const id = params.id;
    
    // 1. Auth check (same as POST)
    // ...
    
    // 2. Parse & validate
    const body = await request.json();
    const validation = UpdateXCommandSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: validation.error.flatten().fieldErrors,
        }
      }), { status: 400 });
    }
    
    const command: UpdateXCommand = validation.data;
    
    // 3. Update database
    const updateData = Mapper.toUpdate(command);
    
    const { data, error: dbError } = await locals.supabase
      .from('table_name')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (dbError) {
      if (dbError.code === 'PGRST116') { // Not found
        return new Response(JSON.stringify({
          error: { code: 'NOT_FOUND', message: 'Resource not found' }
        }), { status: 404 });
      }
      throw dbError;
    }
    
    // 4. Return updated DTO
    const dto = Mapper.toDTO(data);
    
    return new Response(JSON.stringify(dto), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update resource' }
    }), { status: 500 });
  }
};
```

---

## 🚨 Najczęstsze Błędy i Rozwiązania

### Błąd 1: Mieszanie optional i nullable

```typescript
// ❌ ZŁE
interface Command {
  field?: string | null; // Zbyt permisywne
}

// ✅ DOBRE - dla Create Command (body JSON)
interface CreateCommand {
  field?: string | null; // optional (może być pominięte) AND nullable
}

// ✅ DOBRE - dla Entity (zawsze w DB)
interface Entity {
  field: string | null; // required (zawsze jest) but nullable
}
```

### Błąd 2: Zapomnienie o Required dla wymaganych pól

```typescript
// ❌ ZŁE - wszystkie pola optional
export type CreateXCommand = Pick<TablesInsert<'x'>, 'field1' | 'field2'>;

// ✅ DOBRE - field1 required, field2 optional
export type CreateXCommand = 
  Required<Pick<TablesInsert<'x'>, 'field1'>> &
  Pick<TablesInsert<'x'>, 'field2'>;
```

### Błąd 3: Używanie Pick gdy lepszy Omit (i odwrotnie)

```typescript
interface Big { a, b, c, d, e, f, g, h, i, j }

// ❌ ZŁE - potrzebujesz 8/10 pól
type Bad = Pick<Big, 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'>;

// ✅ DOBRE - krócej i jaśniej
type Good = Omit<Big, 'i' | 'j'>;
```

### Błąd 4: Zapomnienie o undefined → null przy mappingu

```typescript
// ❌ ZŁE
function toInsert(cmd: Command): Insert {
  return {
    field: cmd.field, // undefined nie jest accepted by Supabase!
  };
}

// ✅ DOBRE
function toInsert(cmd: Command): Insert {
  return {
    field: cmd.field ?? null, // undefined → null
  };
}
```

### Błąd 5: Nieprawidłowa struktura Zod refinement

```typescript
// ❌ ZŁE - brak return
z.object({ ... }).refine((data) => {
  data.a > data.b; // Zapomnieliśmy return!
});

// ✅ DOBRE
z.object({ ... }).refine(
  (data) => data.a > data.b, // Return boolean
  { message: "...", path: ["a"] }
);
```

---

## 📝 Checklist Implementacji

### Dla każdego zasobu (np. Stores):

- [ ] `StoreEntity` - alias dla `Tables<'stores'>`
- [ ] `StoreDTO` - typ response (bez timestamps)
- [ ] `CreateStoreCommand` - typ request body dla POST
- [ ] `UpdateStoreCommand` - typ request body dla PATCH
- [ ] `StoresListResponse` - typ dla listy z paginacją
- [ ] `CreateStoreCommandSchema` - Zod schema dla validation
- [ ] `UpdateStoreCommandSchema` - Zod schema dla validation
- [ ] `StoreMapper` - mapper functions (optional ale recommended)
- [ ] GET handler - lista z paginacją
- [ ] POST handler - create z validacją
- [ ] PATCH handler - update z validacją
- [ ] DELETE handler (optional)

### Testy (optional ale highly recommended):

- [ ] Type tests (kompilacja TypeScript)
- [ ] Zod schema tests (unit tests)
- [ ] Mapper tests (unit tests)
- [ ] API integration tests

---

## 💡 Pro Tips

1. **Zawsze zaczynaj od Entity alias** - to źródło prawdy
2. **Używaj TablesInsert dla Create, TablesUpdate dla Update** - mają poprawne optional fields
3. **Omit > Pick gdy usuwasz mniej niż połowę pól**
4. **Pick > Omit gdy bierzesz mniej niż połowę pól**
5. **Dodawaj JSDoc komentarze** - przyszłe Ty będzie wdzięczne
6. **Mappers są opcjonalne** - ale ułatwiają testowanie i refactoring
7. **Zod schemas piszemy osobno** - nie inline w handlers
8. **Generic types (ApiResponse<T>) są Twoim przyjacielem**
9. **Views (v_active_products) = denormalizacja = szybkość**
10. **Type guards dla JSON fields** - bezpieczeństwo w runtime

---

## 🔗 Quick Links do Dokumentacji

- [Główny przewodnik](./dto-guide-for-junior.md) - Szczegółowe wyjaśnienia
- [Analiza techniczna](./dto-technical-analysis.md) - Głębsze zrozumienie
- [Praktyczne przykłady](./dto-practical-examples.md) - Gotowy kod
- [API Plan](./api-plan.md) - Specyfikacja endpointów
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) - Oficjalna dokumentacja
- [Zod Documentation](https://zod.dev/) - Dokumentacja Zod

---

**Pamiętaj:** To są wzorce, nie dogmaty. Dostosuj je do swoich potrzeb, ale zachowaj konsystencję w projekcie!
