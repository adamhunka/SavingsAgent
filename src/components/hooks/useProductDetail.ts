/**
 * src/components/hooks/useProductDetail.ts
 * Custom hook do pobierania szczegółów produktu
 */

import { useState, useEffect, useCallback } from "react";
import { fetchProductDetail, ApiClientError } from "@/lib/api";
import type { ProductDetailDTO, ProductViewModel } from "@/types";

interface UseProductDetailResult {
  data?: ProductViewModel;
  isLoading: boolean;
  isError: boolean;
  error?: ApiClientError;
  refetch: () => void;
  validationErrors?: string[];
}

/**
 * Waliduje UUID
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Mapuje ProductDetailDTO na ProductViewModel
 */
function mapToViewModel(dto: ProductDetailDTO): ProductViewModel {
  return {
    id: dto.id,
    name: dto.name,
    category: {
      id: dto.category.id,
      name: dto.category.name,
      iconName: dto.category.icon_name,
    },
    pricePromo: dto.price_promo,
    priceRegular: dto.price_regular,
    description: dto.description,
    conditions: dto.conditions,
    boundingBox: dto.bounding_box,
    imagePath: dto.page.image_path,
    pageId: dto.page.id,
    pageNumber: dto.page.page_number,
    store: {
      id: dto.page.store.id,
      name: dto.page.store.name,
      logoUrl: dto.page.store.logo_url,
    },
  };
}

/**
 * Waliduje dane produktu
 */
function validateProductData(dto: ProductDetailDTO): string[] {
  const errors: string[] = [];

  if (!dto.id || !dto.name) {
    errors.push("Brak danych podstawowych produktu");
  }

  if (dto.price_promo === null || dto.price_promo === undefined || dto.price_promo <= 0) {
    errors.push("Brak ceny promocyjnej");
  }

  if (!dto.page || !dto.page.store) {
    errors.push("Brak danych o źródle produktu");
  }

  return errors;
}

/**
 * Hook do pobierania szczegółów produktu
 * @param productId - UUID produktu
 * @returns Obiekt z danymi, statusem ładowania, błędami i funkcją refetch
 */
export function useProductDetail(productId: string): UseProductDetailResult {
  const [data, setData] = useState<ProductViewModel | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<ApiClientError | undefined>(undefined);
  const [validationErrors, setValidationErrors] = useState<string[] | undefined>(undefined);

  const fetchData = useCallback(async () => {
    // Walidacja ID przed fetch
    if (!productId || !isValidUUID(productId)) {
      setIsError(true);
      setError(new ApiClientError(400, "INVALID_ID", "Nieprawidłowy identyfikator produktu"));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(undefined);
    setValidationErrors(undefined);

    try {
      const response = await fetchProductDetail(productId);
      const productData = response.data;

      // Walidacja danych
      const errors = validateProductData(productData);
      if (errors.length > 0) {
        setValidationErrors(errors);
      }

      // Mapowanie do ViewModel
      const viewModel = mapToViewModel(productData);
      setData(viewModel);
    } catch (err) {
      setIsError(true);
      if (err instanceof ApiClientError) {
        setError(err);
      } else {
        setError(new ApiClientError(500, "UNKNOWN_ERROR", "Wystąpił nieoczekiwany błąd"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
    validationErrors,
  };
}

