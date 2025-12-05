/**
 * src/lib/api.ts
 * API Client dla aplikacji klienckiej.
 * Zawiera funkcje fetchujące dla wszystkich endpointów API.
 */

import type {
  ProductListResponse,
  CategoriesListResponse,
  StoresListResponse,
  ProductFilters,
  ApiError,
} from "@/types";

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || "";

/**
 * Klasa błędu API
 */
export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Funkcja pomocnicza do obsługi błędów API
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      throw new ApiClientError(response.status, "UNKNOWN_ERROR", "Wystąpił nieoczekiwany błąd");
    }

    throw new ApiClientError(response.status, errorData.error.code, errorData.error.message, errorData.error.details);
  }

  return response.json();
}

/**
 * Funkcja pomocnicza do budowania query string z obiektów
 */
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Dla tablic dodajemy każdy element osobno (np. store_id=uuid1&store_id=uuid2)
        // Ale w naszym API store_id przyjmuje pojedynczą wartość, więc dla wielu sklepów
        // możemy wysłać jako pierwszy element lub zmienić API
        // Na razie wysyłamy pierwszy element z tablicy
        if (value.length > 0) {
          searchParams.append(key, String(value[0]));
        }
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
}

/**
 * Pobiera listę produktów z filtrami i paginacją
 * @param filters - Filtry i parametry zapytania
 * @param page - Numer strony (1-indexed)
 * @param perPage - Liczba rekordów na stronę
 * @returns Promise z ProductListResponse
 */
export async function fetchProducts(filters: ProductFilters, page = 1, perPage = 20): Promise<ProductListResponse> {
  const params: Record<string, unknown> = {
    page,
    per_page: perPage,
    sort: filters.sort || "created_at_desc",
  };

  // Dodaj filtry jeśli są ustawione
  if (filters.store_id && filters.store_id.length > 0) {
    params.store_id = filters.store_id[0]; // API przyjmuje pojedynczy store_id
  }
  if (filters.category_id) {
    params.category_id = filters.category_id;
  }
  if (filters.q) {
    params.q = filters.q;
  }
  if (filters.min_price !== undefined) {
    params.min_price = filters.min_price;
  }
  if (filters.max_price !== undefined) {
    params.max_price = filters.max_price;
  }

  const queryString = buildQueryString(params);
  const url = `${API_BASE_URL}/api/v1/products?${queryString}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return handleResponse<ProductListResponse>(response);
}

/**
 * Pobiera listę kategorii
 * @returns Promise z CategoriesListResponse
 */
export async function fetchCategories(): Promise<CategoriesListResponse> {
  const url = `${API_BASE_URL}/api/v1/categories?sort=display_order&page=1&limit=100`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return handleResponse<CategoriesListResponse>(response);
}

/**
 * Pobiera listę sklepów
 * @returns Promise z StoresListResponse
 */
export async function fetchStores(): Promise<StoresListResponse> {
  const url = `${API_BASE_URL}/api/v1/stores?page=1&limit=100`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return handleResponse<StoresListResponse>(response);
}
