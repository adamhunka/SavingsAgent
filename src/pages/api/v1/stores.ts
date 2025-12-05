import type { APIRoute } from "astro";
import { StoreService } from "@/lib/services/stores.service";
import { GetStoresQuerySchema, CreateStoreSchema } from "@/lib/utils/validation";
import { AppError, ValidationError, formatZodErrors } from "@/lib/utils/errors";
import type { StoresListResponse, ApiError } from "@/types";
import { requireAdmin } from "@/lib/utils/auth";

export const prerender = false;

/**
 * GET /api/v1/stores
 * Pobiera listę sklepów z paginacją i wyszukiwaniem
 *
 * DOSTĘPNOŚĆ: Publiczny (każdy może wywołać)
 *
 * PARAMETRY QUERY:
 * - q (string, optional): Wyszukiwanie po nazwie
 * - page (number, optional, default: 1): Numer strony
 * - limit (number, optional, default: 20, max: 100): Rekordów na stronę
 *
 * ODPOWIEDZI:
 * - 200: Lista sklepów z metadanymi
 * - 400: Błędne parametry
 * - 500: Błąd serwera
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const queryParams = {
      q: url.searchParams.get("q") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const validationResult = GetStoresQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe parametry zapytania", details);
    }

    const { q, page, limit } = validationResult.data;
    const storesService = new StoreService(locals.supabase);
    const result = await storesService.list({ q, page, limit });

    const response: StoresListResponse = {
      data: result.data,
      meta: result.meta,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * POST /api/v1/stores
 * Tworzy nowy sklep
 *
 * DOSTĘPNOŚĆ: Tylko administratorzy
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    await requireAdmin(request, locals.supabase);

    let body;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Nieprawidłowy format JSON");
    }

    const validationResult = CreateStoreSchema.safeParse(body);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe dane wejściowe", details);
    }

    const storeService = new StoreService(locals.supabase);
    const store = await storeService.create(validationResult.data);

    return new Response(JSON.stringify({ data: store }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
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
