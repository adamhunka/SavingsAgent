import type { supabaseClient } from "@/db/supabase.client";
import type { ProductListItemDTO, PaginationMeta } from "@/types";
import { ProductService } from "./products.service";

/**
 * Parametry wyszukiwania produktów
 */
export interface SearchProductsParams {
  query: string;
  store_id?: string;
  category_id?: string;
  similarity_threshold?: number;
  page: number;
  per_page: number;
}

/**
 * Wynik wyszukiwania produktów
 */
export interface SearchProductsResult {
  data: ProductListItemDTO[];
  meta: PaginationMeta;
}

/**
 * SearchService
 * Serwis odpowiedzialny za wyszukiwanie produktów z użyciem FTS + trigram
 */
export class SearchService {
  constructor(private supabase: typeof supabaseClient) {}

  /**
   * Wyszukuje produkty z użyciem Full-Text Search i pg_trgm
   * @param params - Parametry wyszukiwania
   * @returns Zwraca listę produktów z metadanymi paginacji
   * @throws InternalServerError w przypadku błędu bazy danych
   */
  async searchProducts(params: SearchProductsParams): Promise<SearchProductsResult> {
    const { query, store_id, category_id, similarity_threshold, page, per_page } = params;

    // Tworzymy instancję ProductService dla tego zapytania
    const productService = new ProductService(this.supabase);

    // Wykorzystujemy istniejącą metodę listProducts z ProductService
    // która automatycznie wykrywa wyszukiwanie po parametrze 'q'
    const result = await productService.listProducts({
      q: query,
      store_id,
      category_id,
      similarity_threshold,
      sort: "created_at_desc", // domyślne sortowanie dla wyszukiwania (rank z DB)
      page,
      per_page,
    });

    return result;
  }
}
