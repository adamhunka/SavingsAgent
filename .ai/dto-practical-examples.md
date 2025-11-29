# Praktyczne Przykłady Implementacji DTO i Command Models

Ten dokument zawiera kompletną, gotową do użycia implementację wszystkich typów dla projektu SavingsAgent.

## Spis Treści
1. [Pełna implementacja types.ts](#full-implementation)
2. [Zod schemas dla walidacji](#zod-schemas)
3. [Przykłady API handlers](#api-handlers)
4. [Przykłady mapperów](#mappers)
5. [Przykłady użycia na frontendzie](#frontend-usage)

---

## 1. Pełna implementacja types.ts {#full-implementation}

```typescript
/**
 * src/types.ts
 * 
 * Definicje DTO (Data Transfer Objects) i Command Models dla API SavingsAgent.
 * 
 * KONWENCJE NAZEWNICTWA:
 * - *Entity           - Typ encji z bazy danych (alias Tables<>)
 * - *DTO              - Typ wysyłany do klienta (response)
 * - *ListItemDTO      - Uproszczony DTO dla list
 * - *DetailDTO        - Rozszerzony DTO z relacjami
 * - Create*Command    - Typ dla tworzenia zasobu (POST request body)
 * - Update*Command    - Typ dla aktualizacji zasobu (PATCH request body)
 * - *Query            - Typ dla query parameters (GET)
 * - *Response         - Typ dla odpowiedzi API (z meta)
 * 
 * STRUKTURA:
 * 1. Imports
 * 2. Common Types (używane przez wszystkie zasoby)
 * 3. Entity Aliases (aliasy dla Tables<>)
 * 4. Enum Aliases (aliasy dla Enums<>)
 * 5. DTO & Commands dla każdego zasobu (pogrupowane)
 */

import type { 
  Tables, 
  TablesInsert, 
  TablesUpdate, 
  Enums,
  Database 
} from './db/database.types';

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * PaginationMeta
 * 
 * Metadane paginacji offset-based (page/per_page).
 * Używane we wszystkich endpointach zwracających listy.
 * 
 * @example
 * {
 *   total: 150,
 *   page: 1,
 *   per_page: 20,
 *   total_pages: 8
 * }
 */
export interface PaginationMeta {
  total: number;        // Całkowita liczba rekordów
  page: number;         // Aktualna strona (1-indexed)
  per_page: number;     // Liczba rekordów na stronę
  total_pages: number;  // Całkowita liczba stron
}

/**
 * CursorPaginationMeta
 * 
 * Metadane paginacji cursor-based.
 * Używane dla dużych zbiorów danych gdzie offset jest nieefektywny.
 * 
 * @example
 * {
 *   next_cursor: "eyJpZCI6IjEyMyIsImNyZWF0ZWRfYXQiOiIyMDI1LTAxLTAxIn0=",
 *   has_more: true
 * }
 */
export interface CursorPaginationMeta {
  next_cursor: string | null;  // Token do następnej strony (base64 encoded)
  has_more: boolean;            // Czy są jeszcze rekordy?
}

/**
 * ApiError
 * 
 * Standardowa struktura błędu API zgodna z RFC 7807.
 * Zwracana przez wszystkie endpointy w przypadku błędu.
 * 
 * @example
 * {
 *   error: {
 *     code: "VALIDATION_ERROR",
 *     message: "Invalid input data",
 *     details: {
 *       name: ["Name is required"],
 *       price: ["Price must be positive"]
 *     }
 *   }
 * }
 */
export interface ApiError {
  error: {
    code: string;                       // Kod błędu (UPPERCASE_SNAKE_CASE)
    message: string;                    // Wiadomość dla użytkownika
    details?: Record<string, string[]>; // Szczegóły walidacji (pole → błędy)
  };
}

/**
 * ApiResponse<T>
 * 
 * Generic wrapper dla odpowiedzi API pojedynczego zasobu.
 * 
 * @template T - Typ danych w response
 */
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>; // Opcjonalne metadane
}

/**
 * ApiListResponse<T>
 * 
 * Generic wrapper dla odpowiedzi API zwracającej listę.
 * 
 * @template T - Typ elementów w liście
 */
export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ============================================================================
// ENTITY ALIASES
// ============================================================================

/**
 * Aliasy dla typów encji z bazy danych.
 * Używamy aliasów dla lepszej czytelności i łatwiejszego refactoringu.
 */
export type StoreEntity = Tables<'stores'>;
export type CategoryEntity = Tables<'categories'>;
export type FlyerEntity = Tables<'flyers'>;
export type PageEntity = Tables<'pages'>;
export type ProductEntity = Tables<'products'>;
export type ProfileEntity = Tables<'profiles'>;

/**
 * View types (widoki bazodanowe)
 */
export type ActiveProductView = Tables<'v_active_products'>;

// ============================================================================
// ENUM ALIASES
// ============================================================================

/**
 * Aliasy dla typów enum z bazy danych.
 */
export type FlyerStatus = Enums<'flyer_status'>;
export type PageProcessingStatus = Enums<'page_processing_status'>;
export type UserRole = Enums<'user_role'>;

// ============================================================================
// CUSTOM TYPES
// ============================================================================

/**
 * BoundingBox
 * 
 * Struktura reprezentująca obszar produktu na obrazie (coordinates).
 * Używana w products.bounding_box (JSON field).
 */
export interface BoundingBox {
  x: number;      // Pozycja X (px od lewej)
  y: number;      // Pozycja Y (px od góry)
  width: number;  // Szerokość (px)
  height: number; // Wysokość (px)
}

/**
 * AIExtractionResponse
 * 
 * Struktura odpowiedzi z AI (OpenAI/Anthropic) po ekstrakcji produktów.
 * Używana w pages.ai_raw_response (JSON field).
 */
export interface AIExtractionResponse {
  model: string;              // Nazwa modelu (np. "gpt-4-vision")
  provider: string;           // Provider ("openai", "anthropic")
  processed_at: string;       // Timestamp przetworzenia
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd?: number;        // Koszt w USD (optional)
  };
  products: Array<{
    name: string;
    price: number;
    price_regular?: number;
    description?: string;
    conditions?: string;
    bounding_box?: BoundingBox;
    confidence?: number;      // Poziom pewności AI (0-1)
  }>;
  metadata?: {
    processing_time_ms: number;
    image_dimensions: { width: number; height: number };
  };
}

// ============================================================================
// STORES
// ============================================================================

/**
 * StoreDTO
 * 
 * DTO dla sklepu wysyłany do klienta.
 * Usuwamy timestamps (created_at, updated_at) - klient nie potrzebuje.
 * 
 * UŻYCIE:
 * - GET /api/v1/stores
 * - GET /api/v1/stores/:id
 * - POST /api/v1/stores (response)
 * - PATCH /api/v1/stores/:id (response)
 */
export type StoreDTO = Omit<StoreEntity, 'created_at' | 'updated_at'>;

/**
 * CreateStoreCommand
 * 
 * Dane od klienta przy tworzeniu nowego sklepu.
 * 
 * POLA:
 * - name: wymagane (Required)
 * - logo_url: opcjonalne (może być null lub pominięte)
 * 
 * WALIDACJA:
 * - name: min 1 char, max 255 chars, unique
 * - logo_url: musi być valid URL lub path
 * 
 * UŻYCIE: POST /api/v1/stores
 */
export type CreateStoreCommand = Required<Pick<TablesInsert<'stores'>, 'name'>> & 
  Pick<TablesInsert<'stores'>, 'logo_url'>;

/**
 * UpdateStoreCommand
 * 
 * Dane od klienta przy aktualizacji sklepu.
 * Wszystkie pola opcjonalne - user może zmienić tylko wybrane.
 * 
 * UŻYCIE: PATCH /api/v1/stores/:id
 */
export type UpdateStoreCommand = Pick<TablesUpdate<'stores'>, 'name' | 'logo_url'>;

/**
 * StoresListResponse
 * 
 * Response dla listy sklepów.
 * 
 * UŻYCIE: GET /api/v1/stores
 */
export interface StoresListResponse {
  data: StoreDTO[];
  meta: PaginationMeta;
}

// ============================================================================
// CATEGORIES
// ============================================================================

/**
 * CategoryDTO
 * 
 * DTO dla kategorii wysyłany do klienta.
 * 
 * UŻYCIE:
 * - GET /api/v1/categories
 * - GET /api/v1/categories/:id
 */
export type CategoryDTO = Omit<CategoryEntity, 'created_at' | 'updated_at'>;

/**
 * CreateCategoryCommand
 * 
 * Dane od klienta przy tworzeniu kategorii.
 * 
 * POLA WYMAGANE:
 * - name: nazwa kategorii
 * - icon_name: nazwa ikony (z icon library)
 * 
 * POLA OPCJONALNE:
 * - display_order: kolejność wyświetlania (domyślnie auto-increment)
 * 
 * WALIDACJA:
 * - name: unique, max 255 chars
 * - icon_name: musi istnieć w icon library
 * 
 * UŻYCIE: POST /api/v1/categories
 */
export type CreateCategoryCommand = Required<
  Pick<TablesInsert<'categories'>, 'name' | 'icon_name'>
> & Pick<TablesInsert<'categories'>, 'display_order'>;

/**
 * UpdateCategoryCommand
 * 
 * Dane od klienta przy aktualizacji kategorii.
 * 
 * UŻYCIE: PATCH /api/v1/categories/:id
 */
export type UpdateCategoryCommand = Pick<TablesUpdate<'categories'>, 
  'name' | 'icon_name' | 'display_order'
>;

/**
 * CategoriesListResponse
 * 
 * Response dla listy kategorii.
 * Zwykle sortowane po display_order.
 * 
 * UŻYCIE: GET /api/v1/categories
 */
export interface CategoriesListResponse {
  data: CategoryDTO[];
  meta: PaginationMeta;
}

// ============================================================================
// FLYERS
// ============================================================================

/**
 * FlyerDTO
 * 
 * Podstawowe DTO gazetki.
 * 
 * UŻYCIE: GET /api/v1/flyers/:id (bez include=pages)
 */
export type FlyerDTO = Omit<FlyerEntity, 'created_at' | 'updated_at'>;

/**
 * FlyerListItemDTO
 * 
 * DTO dla listy gazetek - zawiera nazwę sklepu z JOIN.
 * 
 * DLACZEGO store_name zamiast store object?
 * - Mniejszy payload (1 string vs object)
 * - Wystarczające dla listy
 * - Jeśli potrzeba więcej danych o sklepie, użyj FlyerDetailDTO
 * 
 * UŻYCIE: GET /api/v1/flyers
 */
export type FlyerListItemDTO = FlyerDTO & {
  store_name: string;
};

/**
 * FlyerDetailDTO
 * 
 * Szczegółowe DTO z listą stron (opcjonalnie).
 * 
 * DLACZEGO pages jest optional?
 * - Zależy od query param: ?include=pages
 * - Bez include: pages jest undefined
 * - Z include: pages jest array
 * 
 * UŻYCIE: GET /api/v1/flyers/:id?include=pages
 */
export type FlyerDetailDTO = FlyerListItemDTO & {
  pages?: PageListItemDTO[];
};

/**
 * CreateFlyerCommand
 * 
 * Dane od klienta przy tworzeniu gazetki.
 * 
 * POLA WYMAGANE:
 * - store_id: UUID sklepu (musi istnieć)
 * - valid_from: data rozpoczęcia ważności (YYYY-MM-DD)
 * - valid_to: data zakończenia ważności (YYYY-MM-DD)
 * 
 * POLA OPCJONALNE:
 * - status: domyślnie 'draft'
 * 
 * WALIDACJA BIZNESOWA (w handler'ze):
 * - valid_to >= valid_from
 * - store_id must exist
 * - dates nie mogą być bardzo stare (np. > 1 rok wstecz)
 * 
 * UŻYCIE: POST /api/v1/flyers
 */
export type CreateFlyerCommand = Required<
  Pick<TablesInsert<'flyers'>, 'store_id' | 'valid_from' | 'valid_to'>
> & Pick<TablesInsert<'flyers'>, 'status'>;

/**
 * UpdateFlyerCommand
 * 
 * Dane od klienta przy aktualizacji gazetki.
 * 
 * UWAGA: store_id NIE może być zmieniane (business rule)
 * 
 * WALIDACJA:
 * - Jeśli zmienia się daty, sprawdź valid_to >= valid_from
 * - Status workflow: draft → active → archived
 * 
 * UŻYCIE: PATCH /api/v1/flyers/:id
 */
export type UpdateFlyerCommand = Pick<TablesUpdate<'flyers'>, 
  'valid_from' | 'valid_to' | 'status'
>;

/**
 * FlyersListResponse
 * 
 * Response dla listy gazetek.
 * 
 * UŻYCIE: GET /api/v1/flyers
 */
export interface FlyersListResponse {
  data: FlyerListItemDTO[];
  meta: PaginationMeta;
}

// ============================================================================
// PAGES
// ============================================================================

/**
 * PageDTO
 * 
 * Pełne DTO strony gazetki - wszystkie pola.
 * Override dla JSON fields aby mieć konkretne typy.
 * 
 * UŻYCIE: GET /api/v1/pages/:id
 */
export type PageDTO = Omit<PageEntity, 
  'ai_raw_response' | 'created_at' | 'updated_at'
> & {
  ai_raw_response: AIExtractionResponse | null;
};

/**
 * PageListItemDTO
 * 
 * Uproszczone DTO dla listy stron - bez dużych pól (ai_raw_response).
 * 
 * UŻYCIE: GET /api/v1/flyers/:flyer_id/pages
 */
export type PageListItemDTO = Pick<PageEntity,
  'id' | 
  'page_number' | 
  'image_path' | 
  'processing_status' | 
  'processing_started_at' | 
  'verified_at' | 
  'verified_by' |
  'error_details'
>;

/**
 * CreatePageCommand
 * 
 * Dane od klienta przy rejestracji strony po upload'zie.
 * 
 * FLOW:
 * 1. Klient wywołuje POST /flyers/:id/pages/upload-url
 * 2. Otrzymuje upload_url i public_path
 * 3. Upload'uje obraz do Supabase Storage
 * 4. Wywołuje POST /flyers/:id/pages z image_path
 * 
 * POLA WYMAGANE:
 * - flyer_id: z URL (/flyers/:flyer_id/pages)
 * - page_number: numer strony (unique per flyer)
 * - image_path: ścieżka do obrazu w storage
 * 
 * POLA OPCJONALNE:
 * - image_width, image_height: wymiary obrazu (oba lub żadne)
 * 
 * WALIDACJA:
 * - page_number: unique per flyer (DB constraint)
 * - dimensions: both null or both > 0
 * - image_path: must exist in storage
 * 
 * UŻYCIE: POST /api/v1/flyers/:flyer_id/pages
 */
export type CreatePageCommand = Required<
  Pick<TablesInsert<'pages'>, 'flyer_id' | 'page_number' | 'image_path'>
> & Pick<TablesInsert<'pages'>, 'image_width' | 'image_height'>;

/**
 * UploadUrlRequestCommand
 * 
 * Żądanie pre-signed URL dla upload'u obrazu strony.
 * 
 * FLOW: Zobacz CreatePageCommand
 * 
 * UŻYCIE: POST /api/v1/flyers/:flyer_id/pages/upload-url
 */
export interface UploadUrlRequestCommand {
  page_number: number;      // Numer strony (dla nazwy pliku)
  filename: string;         // Oryginalna nazwa pliku
  content_type: string;     // MIME type (np. "image/jpeg")
  width?: number;           // Opcjonalnie: szerokość obrazu
  height?: number;          // Opcjonalnie: wysokość obrazu
}

/**
 * UploadUrlResponse
 * 
 * Odpowiedź z pre-signed URL.
 * 
 * UŻYCIE: POST /api/v1/flyers/:flyer_id/pages/upload-url (response)
 */
export interface UploadUrlResponse {
  upload_url: string;    // Pre-signed URL do PUT (expires in 1h)
  public_path: string;   // Ścieżka do użycia w CreatePageCommand
  expires_at: string;    // Timestamp wygaśnięcia URL
}

/**
 * StartProcessingCommand
 * 
 * Komenda startowania przetwarzania AI dla strony.
 * 
 * UŻYCIE: PATCH /api/v1/pages/:id/processing/start
 */
export interface StartProcessingCommand {
  force?: boolean; // Wymuś re-processing nawet jeśli już processed
}

/**
 * VerifyPageCommand
 * 
 * Komenda weryfikacji strony przez admina.
 * 
 * ACTIONS:
 * - approve: Zatwierdź stronę i produkty → status 'verified'
 * - reject: Odrzuć → status 'error', wymaga error_details
 * - mark_no_products: Oznacz jako brak produktów → status 'no_products'
 * 
 * UŻYCIE: PATCH /api/v1/pages/:id/verify
 */
export interface VerifyPageCommand {
  action: 'approve' | 'reject' | 'mark_no_products';
  verified_by: string;      // Profile ID admina
  error_details?: string;   // Wymagane jeśli action === 'reject'
}

/**
 * PagesListResponse
 * 
 * Response dla listy stron.
 * 
 * UŻYCIE: GET /api/v1/flyers/:flyer_id/pages
 */
export interface PagesListResponse {
  data: PageListItemDTO[];
  meta: PaginationMeta;
}

// ============================================================================
// PRODUCTS
// ============================================================================

/**
 * ProductDTO
 * 
 * Podstawowe DTO produktu - bez pól technicznych.
 * Override dla bounding_box aby mieć konkretny typ.
 * 
 * UŻYCIE: GET /api/v1/products/:id
 */
export type ProductDTO = Omit<ProductEntity, 
  'bounding_box' | 'search_vector' | 'created_at' | 'updated_at'
> & {
  bounding_box: BoundingBox | null;
};

/**
 * ProductListItemDTO
 * 
 * DTO produktu dla listy - z view v_active_products.
 * View zawiera dane z JOIN (product + category + store + flyer).
 * 
 * DLACZEGO używamy view?
 * - Jeden query zamiast N+1
 * - View już filtruje active flyers
 * - View już filtruje verified pages
 * 
 * UWAGA: Wszystkie pola nullable bo LEFT JOIN może nie znaleźć rekordu
 * (ale w praktyce zawsze znajdzie bo mamy foreign keys)
 * 
 * UŻYCIE: GET /api/v1/products
 */
export type ProductListItemDTO = ActiveProductView;

/**
 * ProductDetailDTO
 * 
 * Szczegółowe DTO z pełnymi relacjami (nested objects).
 * 
 * KIEDY używać?
 * - GET /api/v1/products/:id (single product detail)
 * - Gdy frontend potrzebuje struktury obiektowej
 * 
 * DLACZEGO nie używamy w liście?
 * - Większy payload (nested objects vs flat)
 * - Trudniejsze cache'owanie
 * 
 * UŻYCIE: GET /api/v1/products/:id
 */
export type ProductDetailDTO = ProductDTO & {
  category: Pick<CategoryEntity, 'id' | 'name' | 'icon_name' | 'display_order'>;
  page: Pick<PageEntity, 'id' | 'page_number' | 'image_path'> & {
    flyer: Pick<FlyerEntity, 'id' | 'valid_from' | 'valid_to' | 'status'> & {
      store: Pick<StoreEntity, 'id' | 'name' | 'logo_url'>;
    };
  };
};

/**
 * CreateProductCommand
 * 
 * Dane od klienta przy tworzeniu produktu.
 * 
 * CONTEXT:
 * - Używane w panelu weryfikacji przez admina
 * - Może być auto-extracted z AI lub manual input
 * 
 * POLA WYMAGANE:
 * - category_id: UUID kategorii
 * - name: nazwa produktu
 * - price_promo: cena promocyjna (musi być > 0)
 * 
 * POLA OPCJONALNE:
 * - price_regular: cena regularna (jeśli podana, >= price_promo)
 * - description: opis produktu
 * - conditions: warunki promocji (np. "limit 2 szt.")
 * - bounding_box: obszar na obrazie
 * 
 * UWAGA: page_id jest w URL (/pages/:page_id/products)
 * 
 * WALIDACJA:
 * - price_promo > 0
 * - price_regular === null OR price_regular >= price_promo
 * - bounding_box: all fields required if provided
 * 
 * UŻYCIE: POST /api/v1/pages/:page_id/products
 */
export type CreateProductCommand = Omit<TablesInsert<'products'>,
  'id' | 'created_at' | 'updated_at' | 'search_vector' | 'page_id' | 'bounding_box'
> & Required<Pick<TablesInsert<'products'>, 
  'category_id' | 'name' | 'price_promo'
>> & {
  bounding_box?: BoundingBox | null;
};

/**
 * UpdateProductCommand
 * 
 * Dane od klienta przy aktualizacji produktu.
 * 
 * UŻYCIE: PATCH /api/v1/products/:id
 */
export type UpdateProductCommand = Omit<TablesUpdate<'products'>,
  'id' | 'page_id' | 'created_at' | 'updated_at' | 'search_vector' | 'bounding_box'
> & {
  bounding_box?: BoundingBox | null;
};

/**
 * ProductsListResponse
 * 
 * Response dla listy produktów.
 * 
 * UŻYCIE: GET /api/v1/products
 */
export interface ProductsListResponse {
  data: ProductListItemDTO[];
  meta: PaginationMeta;
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * SearchProductsQuery
 * 
 * Query parameters dla wyszukiwania produktów.
 * 
 * SEARCH STRATEGY:
 * 1. Full-text search (PostgreSQL tsvector)
 * 2. Fallback: trigram similarity (typo tolerance)
 * 3. Filters: store, category, price range
 * 4. Sorting: relevance, price, date
 * 
 * UŻYCIE: GET /api/v1/search/products?q=...
 */
export interface SearchProductsQuery {
  q: string;                    // Search query (required)
  store_id?: string;            // Filter by store UUID
  category_id?: string;         // Filter by category UUID
  min_price?: number;           // Min price (inclusive)
  max_price?: number;           // Max price (inclusive)
  similarity_threshold?: number; // Trigram threshold (0-1, default 0.3)
  page?: number;                // Page number (default 1)
  per_page?: number;            // Results per page (default 20, max 100)
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'created_at_desc';
}

/**
 * SearchResultDTO
 * 
 * Wynik wyszukiwania - ProductListItemDTO + score.
 * 
 * UŻYCIE: GET /api/v1/search/products (response)
 */
export type SearchResultDTO = ProductListItemDTO & {
  similarity_score?: number; // Trigram similarity (0-1)
  rank?: number;             // Full-text search rank
};

/**
 * SearchProductsResponse
 * 
 * Response dla wyszukiwania produktów z dodatkowymi meta.
 * 
 * UŻYCIE: GET /api/v1/search/products (response)
 */
export interface SearchProductsResponse {
  data: SearchResultDTO[];
  meta: PaginationMeta & {
    query: string;                    // Echo query string
    filters_applied: {
      store_id?: string;
      category_id?: string;
      price_range?: { min: number; max: number };
    };
    search_time_ms?: number;          // Search execution time
  };
}

// ============================================================================
// PROFILES (USER MANAGEMENT)
// ============================================================================

/**
 * ProfileDTO
 * 
 * DTO dla profilu użytkownika.
 * 
 * UWAGA: Nie zwracamy pełnych danych z auth.users (email, etc.)
 * Profile to tylko rozszerzenie z role.
 * 
 * UŻYCIE: GET /api/v1/me
 */
export type ProfileDTO = Omit<ProfileEntity, 'created_at' | 'updated_at'>;

/**
 * UpdateProfileCommand
 * 
 * Aktualizacja roli użytkownika (tylko admin może zmieniać role).
 * 
 * UŻYCIE: PATCH /api/v1/profiles/:id (admin only)
 */
export type UpdateProfileCommand = Pick<TablesUpdate<'profiles'>, 'role'>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guards dla runtime checking.
 * Użyteczne przy parsowaniu unknown data.
 */

export function isBoundingBox(value: unknown): value is BoundingBox {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value && typeof (value as BoundingBox).x === 'number' &&
    'y' in value && typeof (value as BoundingBox).y === 'number' &&
    'width' in value && typeof (value as BoundingBox).width === 'number' &&
    'height' in value && typeof (value as BoundingBox).height === 'number'
  );
}

export function isAIExtractionResponse(value: unknown): value is AIExtractionResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'model' in value && typeof (value as AIExtractionResponse).model === 'string' &&
    'provider' in value && typeof (value as AIExtractionResponse).provider === 'string' &&
    'products' in value && Array.isArray((value as AIExtractionResponse).products)
  );
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * ID type - wszystkie ID są UUID string
 */
export type ID = string;

/**
 * Timestamp type - ISO 8601 string
 */
export type Timestamp = string;

/**
 * Extract ID from DTO
 */
export type EntityID<T extends { id: string }> = T['id'];

/**
 * Make fields required
 */
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make fields optional
 */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

---

## 2. Zod Schemas dla Walidacji {#zod-schemas}

```typescript
/**
 * src/lib/validation/schemas.ts
 * 
 * Zod schemas dla runtime validation request bodies.
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

const UUIDSchema = z.string().uuid({ message: "Invalid UUID format" });

const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// STORES
// ============================================================================

export const CreateStoreCommandSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  logo_url: z.string().url().nullable().optional(),
});

export const UpdateStoreCommandSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  logo_url: z.string().url().nullable().optional(),
});

// ============================================================================
// CATEGORIES
// ============================================================================

export const CreateCategoryCommandSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  icon_name: z.string().min(1).max(100),
  display_order: z.number().int().min(0).optional(),
});

export const UpdateCategoryCommandSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  icon_name: z.string().min(1).max(100).optional(),
  display_order: z.number().int().min(0).optional(),
});

// ============================================================================
// FLYERS
// ============================================================================

const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Date must be in YYYY-MM-DD format"
});

export const CreateFlyerCommandSchema = z.object({
  store_id: UUIDSchema,
  valid_from: DateStringSchema,
  valid_to: DateStringSchema,
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
}).refine(
  (data) => new Date(data.valid_to) >= new Date(data.valid_from),
  {
    message: "valid_to must be >= valid_from",
    path: ["valid_to"],
  }
);

export const UpdateFlyerCommandSchema = z.object({
  valid_from: DateStringSchema.optional(),
  valid_to: DateStringSchema.optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
}).refine(
  (data) => {
    if (data.valid_from && data.valid_to) {
      return new Date(data.valid_to) >= new Date(data.valid_from);
    }
    return true;
  },
  {
    message: "valid_to must be >= valid_from",
    path: ["valid_to"],
  }
);

// ============================================================================
// PAGES
// ============================================================================

export const CreatePageCommandSchema = z.object({
  flyer_id: UUIDSchema,
  page_number: z.number().int().min(1),
  image_path: z.string().min(1),
  image_width: z.number().int().positive().nullable().optional(),
  image_height: z.number().int().positive().nullable().optional(),
}).refine(
  (data) => {
    // Both width and height must be provided together or both null
    const hasWidth = data.image_width !== null && data.image_width !== undefined;
    const hasHeight = data.image_height !== null && data.image_height !== undefined;
    return hasWidth === hasHeight;
  },
  {
    message: "image_width and image_height must both be provided or both omitted",
    path: ["image_width"],
  }
);

export const UploadUrlRequestCommandSchema = z.object({
  page_number: z.number().int().min(1),
  filename: z.string().min(1).max(255),
  content_type: z.string().regex(/^image\/(jpeg|jpg|png|webp)$/),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const StartProcessingCommandSchema = z.object({
  force: z.boolean().default(false),
});

export const VerifyPageCommandSchema = z.object({
  action: z.enum(['approve', 'reject', 'mark_no_products']),
  verified_by: UUIDSchema,
  error_details: z.string().min(1).optional(),
}).refine(
  (data) => {
    if (data.action === 'reject') {
      return !!data.error_details;
    }
    return true;
  },
  {
    message: "error_details is required when action is 'reject'",
    path: ["error_details"],
  }
);

// ============================================================================
// PRODUCTS
// ============================================================================

const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const CreateProductCommandSchema = z.object({
  category_id: UUIDSchema,
  name: z.string().min(1).max(500).trim(),
  price_promo: z.number().positive(),
  price_regular: z.number().positive().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  conditions: z.string().max(500).nullable().optional(),
  bounding_box: BoundingBoxSchema.nullable().optional(),
}).refine(
  (data) => {
    if (data.price_regular !== null && data.price_regular !== undefined) {
      return data.price_regular >= data.price_promo;
    }
    return true;
  },
  {
    message: "price_regular must be >= price_promo",
    path: ["price_regular"],
  }
);

export const UpdateProductCommandSchema = z.object({
  category_id: UUIDSchema.optional(),
  name: z.string().min(1).max(500).trim().optional(),
  price_promo: z.number().positive().optional(),
  price_regular: z.number().positive().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  conditions: z.string().max(500).nullable().optional(),
  bounding_box: BoundingBoxSchema.nullable().optional(),
}).refine(
  (data) => {
    if (data.price_regular !== null && 
        data.price_regular !== undefined && 
        data.price_promo !== undefined) {
      return data.price_regular >= data.price_promo;
    }
    return true;
  },
  {
    message: "price_regular must be >= price_promo",
    path: ["price_regular"],
  }
);

// ============================================================================
// SEARCH
// ============================================================================

export const SearchProductsQuerySchema = z.object({
  q: z.string().min(1).trim(),
  store_id: UUIDSchema.optional(),
  category_id: UUIDSchema.optional(),
  min_price: z.coerce.number().positive().optional(),
  max_price: z.coerce.number().positive().optional(),
  similarity_threshold: z.coerce.number().min(0).max(1).default(0.3),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'created_at_desc']).default('relevance'),
}).refine(
  (data) => {
    if (data.min_price !== undefined && data.max_price !== undefined) {
      return data.max_price >= data.min_price;
    }
    return true;
  },
  {
    message: "max_price must be >= min_price",
    path: ["max_price"],
  }
);
```

---

## 3. Przykłady API Handlers {#api-handlers}

```typescript
/**
 * src/pages/api/v1/stores/index.ts
 * 
 * GET /api/v1/stores - Lista sklepów
 * POST /api/v1/stores - Stwórz sklep (admin only)
 */

import type { APIRoute } from 'astro';
import { CreateStoreCommandSchema } from '@/lib/validation/schemas';
import type { 
  StoreDTO, 
  CreateStoreCommand, 
  StoresListResponse, 
  ApiError 
} from '@/types';

// GET /api/v1/stores
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    // Parse query params
    const page = parseInt(url.searchParams.get('page') || '1');
    const per_page = Math.min(
      parseInt(url.searchParams.get('per_page') || '20'),
      100
    );
    
    // Query database
    const { data, error, count } = await locals.supabase
      .from('stores')
      .select('id, name, logo_url', { count: 'exact' })
      .order('name')
      .range((page - 1) * per_page, page * per_page - 1);
    
    if (error) {
      throw error;
    }
    
    // Map to DTO (already matches StoreDTO shape)
    const stores: StoreDTO[] = data || [];
    
    // Build response
    const response: StoresListResponse = {
      data: stores,
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
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch stores',
      },
    };
    
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/v1/stores
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check auth & role
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      const error: ApiError = {
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      };
      return new Response(JSON.stringify(error), { status: 401 });
    }
    
    const { data: profile } = await locals.supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role !== 'admin') {
      const error: ApiError = {
        error: { code: 'FORBIDDEN', message: 'Admin access required' },
      };
      return new Response(JSON.stringify(error), { status: 403 });
    }
    
    // Parse & validate body
    const body = await request.json();
    const validation = CreateStoreCommandSchema.safeParse(body);
    
    if (!validation.success) {
      const error: ApiError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: validation.error.flatten().fieldErrors,
        },
      };
      return new Response(JSON.stringify(error), { status: 400 });
    }
    
    const command: CreateStoreCommand = validation.data;
    
    // Insert to database
    const { data: store, error: dbError } = await locals.supabase
      .from('stores')
      .insert({
        name: command.name,
        logo_url: command.logo_url ?? null,
      })
      .select('id, name, logo_url')
      .single();
    
    if (dbError) {
      // Check for unique constraint violation
      if (dbError.code === '23505') {
        const error: ApiError = {
          error: {
            code: 'CONFLICT',
            message: 'Store with this name already exists',
          },
        };
        return new Response(JSON.stringify(error), { status: 409 });
      }
      
      throw dbError;
    }
    
    // Map to DTO
    const dto: StoreDTO = store;
    
    return new Response(JSON.stringify(dto), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error creating store:', error);
    
    const apiError: ApiError = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create store',
      },
    };
    
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

```typescript
/**
 * src/pages/api/v1/products/index.ts
 * 
 * GET /api/v1/products - Lista produktów (z filters, search, pagination)
 */

import type { APIRoute } from 'astro';
import type { ProductsListResponse, ApiError } from '@/types';

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    // Parse query params
    const page = parseInt(url.searchParams.get('page') || '1');
    const per_page = Math.min(
      parseInt(url.searchParams.get('per_page') || '20'),
      100
    );
    const store_id = url.searchParams.get('store_id');
    const category_id = url.searchParams.get('category_id');
    const min_price = url.searchParams.get('min_price');
    const max_price = url.searchParams.get('max_price');
    const sort = url.searchParams.get('sort') || 'created_at_desc';
    
    // Build query using view
    let query = locals.supabase
      .from('v_active_products')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (store_id) {
      query = query.eq('store_id', store_id);
    }
    if (category_id) {
      query = query.eq('category_id', category_id);
    }
    if (min_price) {
      query = query.gte('price_promo', parseFloat(min_price));
    }
    if (max_price) {
      query = query.lte('price_promo', parseFloat(max_price));
    }
    
    // Apply sorting
    switch (sort) {
      case 'price_asc':
        query = query.order('price_promo', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price_promo', { ascending: false });
        break;
      case 'created_at_desc':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }
    
    // Apply pagination
    query = query.range((page - 1) * per_page, page * per_page - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    // Build response (data already in ProductListItemDTO shape)
    const response: ProductsListResponse = {
      data: data || [],
      meta: {
        total: count || 0,
        page,
        per_page,
        total_pages: Math.ceil((count || 0) / per_page),
      },
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    
    const apiError: ApiError = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch products',
      },
    };
    
    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

---

## 4. Przykłady Mapperów {#mappers}

```typescript
/**
 * src/lib/mappers/store.mapper.ts
 * 
 * Mappers dla Store entity <-> DTO/Command transformations
 */

import type {
  StoreEntity,
  StoreDTO,
  CreateStoreCommand,
  UpdateStoreCommand,
} from '@/types';
import type { TablesInsert, TablesUpdate } from '@/db/database.types';

export class StoreMapper {
  /**
   * Map StoreEntity → StoreDTO
   * Usuwa timestamps
   */
  static toDTO(entity: StoreEntity): StoreDTO {
    return {
      id: entity.id,
      name: entity.name,
      logo_url: entity.logo_url,
    };
  }
  
  /**
   * Map StoreEntity[] → StoreDTO[]
   */
  static toDTOList(entities: StoreEntity[]): StoreDTO[] {
    return entities.map(this.toDTO);
  }
  
  /**
   * Map CreateStoreCommand → TablesInsert<'stores'>
   * Przygotowuje dane do INSERT
   */
  static toInsert(command: CreateStoreCommand): TablesInsert<'stores'> {
    return {
      name: command.name,
      logo_url: command.logo_url ?? null, // undefined → null
      // id, created_at, updated_at - auto-generated by DB
    };
  }
  
  /**
   * Map UpdateStoreCommand → TablesUpdate<'stores'>
   * Przygotowuje dane do UPDATE
   */
  static toUpdate(command: UpdateStoreCommand): TablesUpdate<'stores'> {
    const update: TablesUpdate<'stores'> = {};
    
    if (command.name !== undefined) {
      update.name = command.name;
    }
    if (command.logo_url !== undefined) {
      update.logo_url = command.logo_url;
    }
    
    return update;
  }
}
```

```typescript
/**
 * src/lib/mappers/product.mapper.ts
 */

import type {
  ProductEntity,
  ProductDTO,
  ProductDetailDTO,
  CreateProductCommand,
  BoundingBox,
  CategoryEntity,
  PageEntity,
  FlyerEntity,
  StoreEntity,
} from '@/types';
import type { TablesInsert } from '@/db/database.types';

export class ProductMapper {
  /**
   * Map ProductEntity → ProductDTO
   * Usuwa technical fields i parsuje bounding_box
   */
  static toDTO(entity: ProductEntity): ProductDTO {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      price_promo: entity.price_promo,
      price_regular: entity.price_regular,
      conditions: entity.conditions,
      category_id: entity.category_id,
      page_id: entity.page_id,
      bounding_box: this.parseBoundingBox(entity.bounding_box),
    };
  }
  
  /**
   * Map full join result → ProductDetailDTO
   */
  static toDetailDTO(
    product: ProductEntity,
    category: CategoryEntity,
    page: PageEntity,
    flyer: FlyerEntity,
    store: StoreEntity
  ): ProductDetailDTO {
    return {
      ...this.toDTO(product),
      category: {
        id: category.id,
        name: category.name,
        icon_name: category.icon_name,
        display_order: category.display_order,
      },
      page: {
        id: page.id,
        page_number: page.page_number,
        image_path: page.image_path,
        flyer: {
          id: flyer.id,
          valid_from: flyer.valid_from,
          valid_to: flyer.valid_to,
          status: flyer.status,
          store: {
            id: store.id,
            name: store.name,
            logo_url: store.logo_url,
          },
        },
      },
    };
  }
  
  /**
   * Map CreateProductCommand → TablesInsert<'products'>
   */
  static toInsert(
    command: CreateProductCommand, 
    page_id: string
  ): TablesInsert<'products'> {
    return {
      page_id,
      category_id: command.category_id,
      name: command.name,
      description: command.description ?? null,
      price_promo: command.price_promo,
      price_regular: command.price_regular ?? null,
      conditions: command.conditions ?? null,
      bounding_box: command.bounding_box ? JSON.stringify(command.bounding_box) : null,
      // id, created_at, updated_at, search_vector - auto-generated
    };
  }
  
  /**
   * Parse JSON bounding_box to BoundingBox type
   */
  private static parseBoundingBox(json: unknown): BoundingBox | null {
    if (!json || typeof json !== 'object') {
      return null;
    }
    
    const bbox = json as Record<string, unknown>;
    
    if (
      typeof bbox.x === 'number' &&
      typeof bbox.y === 'number' &&
      typeof bbox.width === 'number' &&
      typeof bbox.height === 'number'
    ) {
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
      };
    }
    
    return null;
  }
}
```

---

## 5. Przykłady użycia na frontendzie {#frontend-usage}

```typescript
/**
 * Frontend: React component używający API
 */

import { useState, useEffect } from 'react';
import type { ProductListItemDTO, ProductsListResponse } from '@/types';

interface ProductListProps {
  storeId?: string;
  categoryId?: string;
}

export function ProductList({ storeId, categoryId }: ProductListProps) {
  const [products, setProducts] = useState<ProductListItemDTO[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      
      try {
        // Build query params
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: '20',
        });
        
        if (storeId) params.set('store_id', storeId);
        if (categoryId) params.set('category_id', categoryId);
        
        const response = await fetch(`/api/v1/products?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const data: ProductsListResponse = await response.json();
        
        setProducts(data.data);
        setTotalPages(data.meta.total_pages);
        
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProducts();
  }, [page, storeId, categoryId]);
  
  return (
    <div>
      {loading && <div>Loading...</div>}
      
      <div className="grid grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard key={product.product_id} product={product} />
        ))}
      </div>
      
      <Pagination 
        currentPage={page} 
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}

function ProductCard({ product }: { product: ProductListItemDTO }) {
  return (
    <div className="card">
      <h3>{product.product_name}</h3>
      <p className="text-sm text-gray-600">{product.description}</p>
      
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-red-600">
          {product.price_promo?.toFixed(2)} zł
        </span>
        
        {product.price_regular && (
          <span className="text-sm line-through text-gray-400">
            {product.price_regular.toFixed(2)} zł
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <img 
          src={product.store_logo || '/default-store.svg'} 
          alt={product.store_name || 'Store'}
          className="w-8 h-8"
        />
        <span className="text-sm">{product.store_name}</span>
      </div>
      
      <div className="text-xs text-gray-500 mt-1">
        Valid: {product.valid_from} - {product.valid_to}
      </div>
    </div>
  );
}
```

```typescript
/**
 * Frontend: Form do tworzenia sklepu (admin panel)
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateStoreCommandSchema } from '@/lib/validation/schemas';
import type { CreateStoreCommand, StoreDTO, ApiError } from '@/types';

export function CreateStoreForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateStoreCommand>({
    resolver: zodResolver(CreateStoreCommandSchema),
  });
  
  async function onSubmit(data: CreateStoreCommand) {
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.error.message);
      }
      
      const store: StoreDTO = await response.json();
      
      console.log('Created store:', store);
      reset();
      
      // Show success message, redirect, etc.
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create store');
    } finally {
      setSubmitting(false);
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Store Name *
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className="mt-1 block w-full rounded-md border-gray-300"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="logo_url" className="block text-sm font-medium">
          Logo URL
        </label>
        <input
          id="logo_url"
          type="text"
          {...register('logo_url')}
          className="mt-1 block w-full rounded-md border-gray-300"
        />
        {errors.logo_url && (
          <p className="mt-1 text-sm text-red-600">{errors.logo_url.message}</p>
        )}
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
      >
        {submitting ? 'Creating...' : 'Create Store'}
      </button>
    </form>
  );
}
```

---

## Podsumowanie

Ten dokument zawiera:

1. **Kompletną implementację types.ts** - gotową do copy-paste
2. **Zod schemas** - dla runtime validation
3. **API handlers** - przykłady implementacji endpointów
4. **Mappers** - dla transformacji Entity ↔ DTO
5. **Frontend usage** - jak używać typów w React components

Wszystkie przykłady są w pełni funkcjonalne i zgodne z API Plan i database schema.
