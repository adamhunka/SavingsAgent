import type { APIRoute } from "astro";
import { FlyerService } from "@/lib/services/flyers.service";
import { UpdateFlyerSchema } from "@/lib/utils/validation";
import { requireAdmin } from "@/lib/utils/auth";
import { AppError, formatZodErrors, ValidationError } from "@/lib/utils/errors";
import type { ApiError, ApiResponse, FlyerDetailDTO, FlyerListItemDTO } from "@/types";

export const prerender = false;

/**
 * GET /api/v1/flyers/:id
 * Pobiera szczegóły gazetki
 *
 * DOSTĘPNOŚĆ: Publiczny (każdy może wywołać)
 * QUERY PARAMS: include=pages - dołącza listę stron gazetki
 */
export const GET: APIRoute = async ({ params, url, locals }) => {
  try {
    const { id } = params;

    if (!id) {
      throw new ValidationError("ID gazetki jest wymagane");
    }

    const includePages = url.searchParams.get("include") === "pages";

    const flyerService = new FlyerService(locals.supabase);
    const flyer = await flyerService.getFlyerById(id, { includePages });

    const response: ApiResponse<FlyerDetailDTO> = {
      data: flyer,
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
 * PATCH /api/v1/flyers/:id
 * Aktualizuje gazetkę
 *
 * DOSTĘPNOŚĆ: Tylko administratorzy
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;

    if (!id) {
      throw new ValidationError("ID gazetki jest wymagane");
    }

    await requireAdmin(request, locals.supabase);

    let body;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Nieprawidłowy format JSON");
    }

    const validationResult = UpdateFlyerSchema.safeParse(body);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe dane wejściowe", details);
    }

    const flyerService = new FlyerService(locals.supabase);
    const flyer = await flyerService.updateFlyer(id, validationResult.data);

    const response: ApiResponse<FlyerListItemDTO> = {
      data: flyer,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * DELETE /api/v1/flyers/:id
 * Usuwa gazetkę
 *
 * DOSTĘPNOŚĆ: Tylko administratorzy
 */
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;

    if (!id) {
      throw new ValidationError("ID gazetki jest wymagane");
    }

    await requireAdmin(request, locals.supabase);

    const flyerService = new FlyerService(locals.supabase);
    await flyerService.deleteFlyer(id);

    return new Response(null, {
      status: 204,
      headers: {
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
