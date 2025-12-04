import type { APIRoute } from "astro";
import { FlyerService } from "@/lib/services/flyers.service";
import { GetFlyersQuerySchema, CreateFlyerSchema } from "@/lib/utils/validation";
import { requireAdmin } from "@/lib/utils/auth";
import { AppError, formatZodErrors, ValidationError } from "@/lib/utils/errors";
import type { ApiError, FlyersListResponse } from "@/types";

export const prerender = false;

/**
 * GET /api/v1/flyers
 * Pobiera listę gazetek z paginacją i filtrami
 *
 * DOSTĘPNOŚĆ: Publiczny (każdy może wywołać)
 * FILTRY: status (domyślnie: active), store_id, page, per_page
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const queryParams = {
      status: url.searchParams.get("status") ?? undefined,
      store_id: url.searchParams.get("store_id") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      per_page: url.searchParams.get("per_page") ?? undefined,
    };

    const validationResult = GetFlyersQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe parametry zapytania", details);
    }

    const { status, store_id, page, per_page } = validationResult.data;
    const flyerService = new FlyerService(locals.supabase);
    const result = await flyerService.listFlyers({ status, store_id, page, per_page });

    const response: FlyersListResponse = {
      data: result.data,
      meta: result.meta,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * POST /api/v1/flyers
 * Tworzy nową gazetkę
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

    const validationResult = CreateFlyerSchema.safeParse(body);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe dane wejściowe", details);
    }

    const flyerService = new FlyerService(locals.supabase);
    const flyer = await flyerService.createFlyer(validationResult.data);

    return new Response(JSON.stringify({ data: flyer }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Location: `/api/v1/flyers/${flyer.id}`,
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
