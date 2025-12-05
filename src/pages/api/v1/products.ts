import type { APIRoute } from "astro";
import { ProductService } from "@/lib/services/products.service";
import { ListProductsQuerySchema } from "@/lib/utils/validation";
import { AppError, ValidationError, formatZodErrors } from "@/lib/utils/errors";
import type { ProductListResponse, ApiError } from "@/types";

export const prerender = false;

/**
 * GET /api/v1/products
 * Pobiera listę produktów z paginacją, filtrami i wyszukiwaniem
 *
 * DOSTĘPNOŚĆ: Publiczny (każdy może wywołać)
 *
 * PARAMETRY QUERY:
 * - store_id (UUID, optional): Filtr po sklepie
 * - category_id (UUID, optional): Filtr po kategorii
 * - q (string, optional): Zapytanie wyszukiwania (FTS + trigram)
 * - min_price (number, optional): Minimalna cena promocyjna
 * - max_price (number, optional): Maksymalna cena promocyjna
 * - sort (string, optional, default: "created_at_desc"): Sortowanie (price_asc, price_desc, created_at_desc)
 * - page (number, optional, default: 1): Numer strony
 * - per_page (number, optional, default: 20, max: 100): Rekordów na stronę
 * - similarity_threshold (float, optional, default: 0.3): Próg podobieństwa dla trigram (0-1)
 *
 * ODPOWIEDZI:
 * - 200: Lista produktów z metadanymi paginacji
 * - 400: Błędne parametry
 * - 500: Błąd serwera
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const queryParams = {
      store_id: url.searchParams.get("store_id") ?? undefined,
      category_id: url.searchParams.get("category_id") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      min_price: url.searchParams.get("min_price") ?? undefined,
      max_price: url.searchParams.get("max_price") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      per_page: url.searchParams.get("per_page") ?? undefined,
      similarity_threshold: url.searchParams.get("similarity_threshold") ?? undefined,
    };

    const validationResult = ListProductsQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe parametry zapytania", details);
    }

    const productService = new ProductService(locals.supabase);
    const result = await productService.listProducts(validationResult.data);

    const response: ProductListResponse = {
      data: result.data,
      meta: result.meta,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    return handleError(error);
  }
};

function handleError(error: unknown): Response {
  if (error instanceof AppError) {
    return new Response(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiError: ApiError = {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Wystąpił nieoczekiwany błąd",
    },
  };

  return new Response(JSON.stringify(apiError), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
