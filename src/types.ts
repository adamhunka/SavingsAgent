/**
 * src/types.ts
 * Ten plik zawiera wszystkie DTO i Command Models używane w aplikacji.
 * KONWENCJE NAZEWNICTWA:
 * - *Entity - typ encji z bazy danych (alias dla Tables<>)
 * - *DTO - typ wysyłany do klienta
 * - Create*Command - typ dla tworzenia zasobu (POST)
 * - Update*Command - typ dla aktualizacji zasobu (PATCH)
 * - *ListResponse - typ dla listy zasobów z metadanymi
 */

import type { Enums, Tables, TablesInsert, TablesUpdate } from "./db/database.types";

// ============================================================================
// ENTITY ALIASES
// ============================================================================
export type StoreEntity = Tables<"stores">;
export type CategoryEntity = Tables<"categories">;
export type FlyerEntity = Tables<"flyers">;
export type PageEntity = Tables<"pages">;
export type ProductEntity = Tables<"products">;
export type ProfileEntity = Tables<"profiles">;
export type JobEntity = Tables<"jobs">;
export type FlyerStatus = Enums<"flyer_status">;
export type PageProcessingStatus = Enums<"page_processing_status">;
export type JobStatus = Enums<"job_status">;
export type UserRole = Enums<"user_role">;

// ============================================================================
// DTO (Data Transfer Objects)
// ============================================================================
/**
 * StoreDTO
 * Dane sklepu wysyłane do klienta.
 * Usuwa pola timestamp, które nie są potrzebne na frontendzie.
 * UŻYCIE: GET /api/v1/stores, GET /api/v1/stores/:id
 */
export type StoreDTO = Omit<StoreEntity, "created_at" | "updated_at">;

/**
 * CategoryDTO
 * Dane kategorii wysyłane do klienta.
 * Usuwa pola timestamp, które nie są potrzebne na frontendzie.
 * UŻYCIE: GET /api/v1/categories, GET /api/v1/categories/:id
 */
export type CategoryDTO = Omit<CategoryEntity, "created_at" | "updated_at">;

/**
 * FlyerDTO
 * Dane gazetki wysyłane do klienta.
 * Usuwa pola timestamp, które nie są potrzebne na frontendzie.
 * UŻYCIE: GET /api/v1/flyers, GET /api/v1/flyers/:id
 */
export type FlyerDTO = Omit<FlyerEntity, "created_at" | "updated_at">;

/**
 * FlyerListItemDTO
 * Dane gazetki wysyłane do klienta w formie listy.
 * Dodaje pole store_name, które jest nazwą sklepu.
 * UŻYCIE: GET /api/v1/flyers
 */
export type FlyerListItemDTO = FlyerDTO & {
  store_name: string;
};

/**
 * FlyerDetailDTO
 * Dane gazetki wysyłane do klienta w formie szczegółowej.
 * Dodaje pole pages, które jest listą stron gazetki.
 * UŻYCIE: GET /api/v1/flyers/:id
 */
export type FlyerDetailDTO = FlyerListItemDTO & {
  pages?: PageListItemDTO[];
};

/**
 * PageDTO
 * Dane strony wysyłane do klienta.
 * Usuwa pola timestamp, które nie są potrzebne na frontendzie.
 * UŻYCIE: GET /api/v1/pages, GET /api/v1/pages/:id
 */
export type PageDTO = Omit<PageEntity, "created_at" | "updated_at" | "ai_raw_response" | "error_details">;

/**
 * PageListItemDTO
 * Dane strony wysyłane do klienta w formie listy.
 * UŻYCIE: GET /api/v1/pages
 */
export type PageListItemDTO = Pick<
  PageEntity,
  "id" | "page_number" | "image_path" | "processing_status" | "processing_started_at" | "verified_at" | "verified_by"
>;

/**
 * ProductDTO
 * Dane produktu wysyłane do klienta.
 * Usuwa pola timestamp, które nie są potrzebne na frontendzie.
 * UŻYCIE: GET /api/v1/products, GET /api/v1/products/:id
 */
export type ProductDTO = Omit<ProductEntity, "created_at" | "updated_at" | "search_vector">;

/**
 * ProductListItemDTO
 * Dane produktu wysyłane do klienta w formie listy.
 * Usuwa pole page_image_path, które nie jest potrzebne na frontendzie.
 * UŻYCIE: GET /api/v1/products
 */
export type ProductListItemDTO = Omit<Tables<"v_active_products">, "page_image_path">;

/**
 * ProductDetailDTO
 * Dane produktu wysyłane do klienta w formie szczegółowej.
 * Dodaje pole category, które jest kategorią produktu.
 * UŻYCIE: GET /api/v1/products/:id
 */
export type ProductDetailDTO = ProductDTO & {
  category: Pick<CategoryEntity, "id" | "name" | "icon_name">;
  page: Pick<PageEntity, "id" | "page_number" | "image_path"> & {
    store: Pick<StoreEntity, "id" | "name" | "logo_url">;
  };
};

/**
 * ProfileDTO
 * Dane profilu wysyłane do klienta.
 * Usuwa pola timestamp, które nie są potrzebne na frontendzie.
 * UŻYCIE: GET /api/v1/profiles, GET /api/v1/profiles/:id
 */
export type ProfileDTO = Omit<ProfileEntity, "created_at" | "updated_at">;

/**
 * JobDTO
 * Dane zadania wysyłane do klienta.
 * Usuwa pola timestamp i szczegółowe informacje.
 * UŻYCIE: POST /api/v1/jobs/pages/:page_id/process, GET /api/v1/jobs/:id
 */
export type JobDTO = Pick<
  JobEntity,
  "id" | "page_id" | "status" | "created_at" | "started_at" | "finished_at" | "error_details" | "meta"
>;

// ============================================================================
// COMMAND MODELS
// ============================================================================

// Store Commands
export type CreateStoreCommand = Required<Pick<TablesInsert<"stores">, "name">> &
  Pick<TablesInsert<"stores">, "logo_url">;

export type UpdateStoreCommand = Pick<TablesUpdate<"stores">, "name" | "logo_url">;

// Category Commands
export type CreateCategoryCommand = Required<Pick<TablesInsert<"categories">, "name" | "icon_name">> &
  Pick<TablesInsert<"categories">, "display_order">;

export type UpdateCategoryCommand = Pick<TablesUpdate<"categories">, "name" | "icon_name" | "display_order">;

// Flyer Commands
/**
 * CreateFlyerCommand
 * Dane do utworzenia nowej gazetki.
 * WALIDACJA BIZNESOWA:
 * - valid_to >= valid_from (sprawdzane przed INSERT)
 * - store_id musi istnieć w bazie
 * - status domyślnie 'draft'
 * UŻYCIE: POST /api/v1/flyers
 */
export type CreateFlyerCommand = Required<Pick<TablesInsert<"flyers">, "store_id" | "valid_from" | "valid_to">> &
  Pick<TablesInsert<"flyers">, "status">;

/**
 * UpdateFlyerCommand
 * Dane do aktualizacji gazetki.
 * WALIDACJA BIZNESOWA:
 * - valid_to >= valid_from (sprawdzane przed UPDATE)
 * - status workflow: draft → active → archived
 * UŻYCIE: PATCH /api/v1/flyers/:id
 */
export type UpdateFlyerCommand = Pick<TablesUpdate<"flyers">, "valid_from" | "valid_to" | "status">;

// Page Commands
/**
 * CreatePageCommand
 * Dane do utworzenia nowej strony.
 * WALIDACJA BIZNESOWA:
 * - image_width i image_height muszą być podane razem lub oba null
 * - image_path musi być podane
 * UŻYCIE: POST /api/v1/pages
 */
export type CreatePageCommand = Required<Pick<TablesInsert<"pages">, "flyer_id" | "page_number" | "image_path">> &
  Pick<TablesInsert<"pages">, "image_width" | "image_height">;

/**
 * UploadUrlRequestCommand
 * Dane do requestu uploadu URL.
 * WALIDACJA BIZNESOWA:
 * - page_number musi być podane
 * - filename musi być podane
 * - content_type musi być podane
 * - flyer_id musi być poprawnym UUID
 * - flyer_slug musi być podane
 * UŻYCIE: POST /api/v1/uploads/sign
 */
export interface UploadUrlRequestCommand {
  flyer_id: string;
  flyer_slug: string;
  page_number: number;
  filename: string;
  content_type: string;
  width?: number;
  height?: number;
}

/**
 * UploadUrlResponse
 * Dane do responseu uploadu URL.
 * WALIDACJA BIZNESOWA:
 * - upload_url musi być podane
 * - public_path musi być podane
 * - expires_at musi być podane
 * UŻYCIE: POST /api/v1/pages/:page_number/upload-url
 */
export interface UploadUrlResponse {
  upload_url: string;
  public_path: string;
  expires_at: string;
}

/**
 * StartProcessingCommand
 * Dane do startowania procesu przetwarzania strony.
 * WALIDACJA BIZNESOWA:
 * - force może być podane lub nie
 * UŻYCIE: POST /api/v1/pages/:page_number/start-processing
 */
export interface StartProcessingCommand {
  force?: boolean;
}

/**
 * VerifyPageCommand
 * Dane do weryfikacji strony.
 * WALIDACJA BIZNESOWA:
 * - action musi być jednym z: approve, reject, mark_no_products
 * - verified_by musi być podane
 * - error_details jest opcjonalne
 * UŻYCIE: PATCH /api/v1/pages/:id/verify
 */
export interface VerifyPageCommand {
  action: "approve" | "reject" | "mark_no_products";
  verified_by: string;
  error_details?: string | null;
}

/**
 * CreateJobCommand
 * Dane do utworzenia nowego zadania przetwarzania strony.
 * WALIDACJA BIZNESOWA:
 * - page_id musi być UUID
 * - requested_by musi być UUID użytkownika z rolą admin
 * - cost_limit_cents musi być liczbą dodatnią lub null
 * - force określa czy ignorować istniejące aktywne zadania
 * UŻYCIE: POST /api/v1/jobs/pages/:page_id/process
 */
export interface CreateJobCommand {
  page_id: string;
  model_hint?: string;
  cost_limit_cents?: number;
  force?: boolean;
  requested_by: string;
}

// Product Commands
/**
 * CreateProductCommand
 * Dane do utworzenia nowego produktu.
 * WALIDACJA BIZNESOWA:
 * - category_id musi być podane
 * - name musi być podane
 * - price_promo musi być podane
 * UŻYCIE: POST /api/v1/pages/:page_id/products
 */
export type CreateProductCommand = Omit<
  TablesInsert<"products">,
  "id" | "created_at" | "updated_at" | "search_vector" | "page_id"
> &
  Required<Pick<TablesInsert<"products">, "category_id" | "name" | "price_promo">>;

/**
 * UpdateProductCommand
 * Dane do aktualizacji produktu.
 * WALIDACJA BIZNESOWA:
 * - id musi być podane
 * - page_id musi być podane
 * - created_at i updated_at nie mogą być podane
 * - search_vector nie może być podane
 * UŻYCIE: PATCH /api/v1/products/:id
 */
export type UpdateProductCommand = Omit<
  TablesUpdate<"products">,
  "id" | "page_id" | "created_at" | "updated_at" | "search_vector"
>;

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * PaginationMeta
 *
 * Metadane paginacji dla wszystkich list.
 */
export interface PaginationMeta {
  total: number; // Całkowita liczba rekordów
  page: number; // Aktualna strona (1-indexed)
  per_page: number; // Liczba rekordów na stronę
  total_pages: number; // Całkowita liczba stron
}

/**
 * ApiError
 * Dane do błędu API.
 * WALIDACJA BIZNESOWA:
 * - code musi być podane
 * - message musi być podane
 * - details jest opcjonalne
 * UŻYCIE: API
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/**
 * ApiResponse
 * Dane do responseu API.
 * WALIDACJA BIZNESOWA:
 * - data musi być podane
 * - meta jest opcjonalne
 * UŻYCIE: API
 */
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * ApiListResponse
 * Dane do responseu listy API.
 * WALIDACJA BIZNESOWA:
 * - data musi być podane
 * - meta musi być podane
 * UŻYCIE: API
 */
export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * StoresListResponse
 * Dane do responseu listy sklepów.
 * WALIDACJA BIZNESOWA:
 * - data musi być podane
 * - meta musi być podane
 * UŻYCIE: API
 */
export type StoresListResponse = ApiListResponse<StoreDTO>;

/**
 * CategoriesListResponse
 * Dane do responseu listy kategorii.
 * WALIDACJA BIZNESOWA:
 * - data musi być podane
 * - meta musi być podane
 * UŻYCIE: API
 */
export type CategoriesListResponse = ApiListResponse<CategoryDTO>;

/**
 * FlyersListResponse
 * Dane do responseu listy gazetek.
 * WALIDACJA BIZNESOWA:
 * - data musi być podane
 * - meta musi być podane
 * UŻYCIE: API
 */
export type FlyersListResponse = ApiListResponse<FlyerListItemDTO>;

/**
 * PagesListResponse
 * Dane do responseu listy stron.
 * WALIDACJA BIZNESOWA:
 * - data musi być podane
 * - meta musi być podane
 * UŻYCIE: API
 */
export type PagesListResponse = ApiListResponse<PageListItemDTO>;

/**
 * ProductListResponse
 * Dane do responseu listy produktów.
 * WALIDACJA BIZNESOWA:
 * - data musi być podane
 * - meta musi być podane
 * UŻYCIE: API
 */
export type ProductListResponse = ApiListResponse<ProductListItemDTO>;

/**
 * ProductDetailResponse
 * Dane do responseu szczegółowego produktu.
 * WALIDACJA BIZNESOWA:
 * - data musi być podane
 * UŻYCIE: API
 */
export type ProductDetailResponse = ApiResponse<ProductDetailDTO>;

// ============================================================================
// SEARCH
// ============================================================================

/**
 * SearchProductsQuery
 * Dane do wyszukiwania produktów.
 * WALIDACJA BIZNESOWA:
 * - query musi być podane
 * UŻYCIE: API
 */
export interface SearchProductsQuery {
  query: string;
}

/**
 * SearchResultDTO
 * Dane do responseu wyszukiwania produktów.
 * WALIDACJA BIZNESOWA:
 * - similarity_score jest opcjonalne
 * UŻYCIE: API
 */
export type SearchResultDTO = ProductListItemDTO & {
  similarity_score?: number;
  rank?: number;
};

// ============================================================================
// FRONTEND TYPES
// ============================================================================

/**
 * ProductFilters
 * Typ reprezentujący stan filtrów w aplikacji klienckiej.
 * UŻYCIE: Frontend - ProductBrowser component
 */
export interface ProductFilters {
  store_id?: string[]; // Obsługa wielu sklepów
  category_id?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
  sort: "created_at_desc" | "price_asc" | "price_desc";
}

/**
 * ProductListItemViewModel
 * Rozszerzenie DTO o pola pomocnicze dla UI.
 * Na razie alias dla ProductListItemDTO, ale może być rozszerzone w przyszłości.
 * UŻYCIE: Frontend - ProductCard component
 */
export type ProductListItemViewModel = ProductListItemDTO;

/**
 * ProductViewModel
 * ViewModel dla widoku szczegółów produktu (ProductModal).
 * Mapowany z ProductDetailDTO z camelCase naming dla lepszej ergonomii w React.
 * UŻYCIE: Frontend - ProductModal component
 */
export interface ProductViewModel {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
    iconName?: string | null;
  };
  pricePromo: number;
  priceRegular?: number | null;
  description?: string | null;
  conditions?: string | null;
  boundingBox?: Record<string, unknown> | null;
  imagePath?: string | null;
  pageId: string;
  pageNumber: number;
  store: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
}
