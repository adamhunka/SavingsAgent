/**
 * src/components/hooks/useProductSearch.ts
 * Hook do zarządzania stanem wyszukiwania produktów.
 * Obsługuje filtrowanie, paginację, synchronizację URL i ładowanie danych.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchProducts } from "@/lib/api";
import type { ProductFilters, ProductListItemDTO, PaginationMeta } from "@/types";

export interface UseProductSearchResult {
  products: ProductListItemDTO[];
  meta: PaginationMeta | null;
  filters: ProductFilters;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  setFilters: (filters: ProductFilters) => void;
  updateFilter: (key: keyof ProductFilters, value: unknown) => void;
  loadMore: () => void;
  retry: () => void;
  clearFilters: () => void;
}

const DEFAULT_FILTERS: ProductFilters = {
  sort: "created_at_desc",
};

const PER_PAGE = 20;

/**
 * Hook do wyszukiwania produktów z obsługą filtrów, paginacji i synchronizacji URL
 */
export function useProductSearch(): UseProductSearchResult {
  const [products, setProducts] = useState<ProductListItemDTO[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [filters, setFiltersState] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Inicjalizacja filtrów z URL przy montowaniu
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const initialFilters: ProductFilters = { ...DEFAULT_FILTERS };

    // Parsuj store_id jako array
    const storeIds = params.getAll("store_id");
    if (storeIds.length > 0) {
      initialFilters.store_id = storeIds;
    }

    // Parsuj pozostałe filtry
    const categoryId = params.get("category_id");
    if (categoryId) initialFilters.category_id = categoryId;

    const query = params.get("q");
    if (query) initialFilters.q = query;

    const minPrice = params.get("min_price");
    if (minPrice) initialFilters.min_price = parseFloat(minPrice);

    const maxPrice = params.get("max_price");
    if (maxPrice) initialFilters.max_price = parseFloat(maxPrice);

    const sort = params.get("sort");
    if (sort === "price_asc" || sort === "price_desc" || sort === "created_at_desc") {
      initialFilters.sort = sort;
    }

    setFiltersState(initialFilters);
  }, []);

  /**
   * Synchronizacja URL z filtrami
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();

    // Dodaj filtry do URL
    if (filters.store_id && filters.store_id.length > 0) {
      filters.store_id.forEach((id) => params.append("store_id", id));
    }
    if (filters.category_id) params.set("category_id", filters.category_id);
    if (filters.q) params.set("q", filters.q);
    if (filters.min_price !== undefined) params.set("min_price", String(filters.min_price));
    if (filters.max_price !== undefined) params.set("max_price", String(filters.max_price));
    if (filters.sort !== "created_at_desc") params.set("sort", filters.sort);

    // Aktualizuj URL bez przeładowania strony
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.pushState({}, "", newUrl);
  }, [filters]);

  /**
   * Funkcja do pobierania produktów
   */
  const fetchProductsData = useCallback(
    async (page: number, append = false) => {
      // Anuluj poprzednie zapytanie jeśli istnieje
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Utwórz nowy AbortController
      abortControllerRef.current = new AbortController();

      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          setProducts([]);
        }
        setError(null);

        const response = await fetchProducts(filters, page, PER_PAGE);

        setProducts((prev) => (append ? [...prev, ...response.data] : response.data));
        setMeta(response.meta);
        setCurrentPage(page);
      } catch (err) {
        // Ignoruj błędy anulowania
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd");
        if (!append) {
          setProducts([]);
          setMeta(null);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filters]
  );

  /**
   * Efekt do pobierania produktów przy zmianie filtrów
   */
  useEffect(() => {
    fetchProductsData(1, false);
  }, [fetchProductsData]);

  /**
   * Funkcja do aktualizacji filtrów
   */
  const setFilters = useCallback((newFilters: ProductFilters) => {
    setFiltersState(newFilters);
    setCurrentPage(1);
  }, []);

  /**
   * Funkcja do aktualizacji pojedynczego filtra
   */
  const updateFilter = useCallback((key: keyof ProductFilters, value: unknown) => {
    setFiltersState((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  }, []);

  /**
   * Funkcja do ładowania kolejnej strony
   */
  const loadMore = useCallback(() => {
    if (!meta || currentPage >= meta.total_pages || isLoadingMore) {
      return;
    }

    fetchProductsData(currentPage + 1, true);
  }, [meta, currentPage, isLoadingMore, fetchProductsData]);

  /**
   * Funkcja do ponowienia zapytania
   */
  const retry = useCallback(() => {
    fetchProductsData(1, false);
  }, [fetchProductsData]);

  /**
   * Funkcja do czyszczenia filtrów
   */
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setCurrentPage(1);
  }, []);

  return {
    products,
    meta,
    filters,
    isLoading,
    isLoadingMore,
    error,
    setFilters,
    updateFilter,
    loadMore,
    retry,
    clearFilters,
  };
}
