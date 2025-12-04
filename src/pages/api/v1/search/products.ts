import type { APIRoute } from "astro";
import { SearchService } from "@/lib/services/search.service";
import { SearchProductsQuerySchema } from "@/lib/utils/validation";
import { AppError, ValidationError, formatZodErrors } from "@/lib/utils/errors";
import type { ProductListResponse, ApiError } from "@/types";

export const prerender = false;

/**
 * GET /api/v1/search/products
 * Wyszukuje produkty z użyciem Full-Text Search i pg_trgm (obsługa literówek)
 *
 * DOSTĘPNOŚĆ: Publiczny (każdy może wywołać)
 * BEZPIECZEŃSTWO: RLS w Supabase zapewnia widoczność tylko verified pages i active flyers
 *
 * PARAMETRY QUERY:
 * - q (string, WYMAGANE): Zapytanie wyszukiwania, min 1 znak, max 100 znaków
 * - store_id (UUID, optional): Filtr po sklepie
 * - category_id (UUID, optional): Filtr po kategorii
 * - similarity_threshold (float, optional, default: 0.3): Próg podobieństwa dla trigram (0-1)
 * - page (number, optional, default: 1): Numer strony (1-indexed)
 * - per_page (number, optional, default: 20, max: 100): Liczba wyników na stronę
 *
 * ODPOWIEDZI:
 * - 200: Lista produktów z metadanymi paginacji (może być pusta lista jeśli brak wyników)
 * - 400: Nieprawidłowe parametry (np. brak 'q', niepoprawny UUID, per_page > 100)
 * - 500: Nieoczekiwany błąd serwera
 *
 * PRZYKŁAD UŻYCIA:
 * /api/v1/search/products?q=masło&store_id=<uuid>&page=1&per_page=20
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Pobieranie parametrów z query string
    const queryParams = {
      q: url.searchParams.get("q") ?? undefined,
      store_id: url.searchParams.get("store_id") ?? undefined,
      category_id: url.searchParams.get("category_id") ?? undefined,
      similarity_threshold: url.searchParams.get("similarity_threshold") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      per_page: url.searchParams.get("per_page") ?? undefined,
    };

    // Walidacja parametrów wejściowych
    const validationResult = SearchProductsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe parametry zapytania", details);
    }

    const { q, store_id, category_id, similarity_threshold, page, per_page } = validationResult.data;

    // Wywołanie serwisu wyszukiwania
    const searchService = new SearchService(locals.supabase);
    const result = await searchService.searchProducts({
      query: q,
      store_id,
      category_id,
      similarity_threshold,
      page,
      per_page,
    });

    // Konstrukcja odpowiedzi
    const response: ProductListResponse = {
      data: result.data,
      meta: result.meta,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache na 30 sekund - popularne wyszukiwania mogą być cache'owane
        "Cache-Control": "public, max-age=30, s-maxage=60",
      },
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Funkcja obsługująca błędy i zwracająca odpowiednie odpowiedzi HTTP
 * @param error - Błąd do obsługi
 * @returns Response z odpowiednim kodem statusu i ciałem
 */
function handleError(error: unknown): Response {
  // Obsługa niestandardowych błędów aplikacji (ValidationError, NotFoundError, itd.)
  if (error instanceof AppError) {
    return new Response(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Obsługa nieoczekiwanych błędów
  console.error("[API /search/products] Nieoczekiwany błąd:", error);

  const apiError: ApiError = {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Wystąpił nieoczekiwany błąd podczas wyszukiwania produktów",
    },
  };

  return new Response(JSON.stringify(apiError), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

