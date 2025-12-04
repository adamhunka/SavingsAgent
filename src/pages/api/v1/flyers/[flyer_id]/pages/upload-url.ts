import type { APIRoute } from "astro";
import { PageService } from "@/lib/services/pages.service";
import { UploadUrlRequestSchema } from "@/lib/utils/validation";
import { requireAdmin } from "@/lib/utils/auth";
import { AppError, formatZodErrors, ValidationError } from "@/lib/utils/errors";
import type { ApiError, ApiResponse, UploadUrlResponse } from "@/types";

export const prerender = false;

/**
 * POST /api/v1/flyers/:flyer_id/pages/upload-url
 * Generuje pre-signed upload URL dla strony gazetki
 *
 * DOSTĘPNOŚĆ: Tylko administratorzy
 * BODY: { page_number, filename, content_type, width?, height? }
 * RESPONSE: { upload_url, public_path, expires_at }
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Walidacja parametru flyer_id
    const { flyer_id } = params;

    if (!flyer_id) {
      throw new ValidationError("ID gazetki jest wymagane");
    }

    // 2. Autoryzacja: wymagany admin
    await requireAdmin(request, locals.supabase);

    // 3. Parsowanie body
    let body;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Nieprawidłowy format JSON");
    }

    // 4. Walidacja body za pomocą Zod
    const validationResult = UploadUrlRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe dane wejściowe", details);
    }

    // 5. Wywołanie serwisu do generowania upload URL
    const pageService = new PageService(locals.supabase);
    const uploadUrlData = await pageService.generateUploadUrl(flyer_id, validationResult.data);

    // 6. Zwrócenie odpowiedzi 201 Created
    const response: ApiResponse<UploadUrlResponse> = {
      data: uploadUrlData,
    };

    return new Response(JSON.stringify(response), {
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

/**
 * Obsługa błędów
 * Mapuje AppError na odpowiednie kody HTTP i zwraca JSON z błędem
 */
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
