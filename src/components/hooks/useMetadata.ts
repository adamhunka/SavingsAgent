/**
 * src/components/hooks/useMetadata.ts
 * Hook do pobierania metadanych (kategorie, sklepy).
 */

import { useState, useEffect } from "react";
import { fetchCategories, fetchStores } from "@/lib/api";
import type { CategoryDTO, StoreDTO } from "@/types";

export interface UseMetadataResult {
  categories: CategoryDTO[];
  stores: StoreDTO[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook do pobierania kategorii i sklepów
 */
export function useMetadata(): UseMetadataResult {
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [categoriesResponse, storesResponse] = await Promise.all([fetchCategories(), fetchStores()]);

        setCategories(categoriesResponse.data);
        setStores(storesResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nie udało się załadować danych");
      } finally {
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, []);

  return {
    categories,
    stores,
    isLoading,
    error,
  };
}
