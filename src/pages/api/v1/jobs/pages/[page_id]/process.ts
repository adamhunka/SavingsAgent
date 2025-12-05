import type { APIRoute } from "astro";
import { JobService } from "@/lib/services/jobs.service";
import { CreateJobRequestSchema, PageIdParamSchema } from "@/lib/utils/validation";
import { requireAdmin } from "@/lib/utils/auth";
import { AppError, formatZodErrors, ValidationError } from "@/lib/utils/errors";
import type { ApiError, ApiResponse, JobDTO } from "@/types";

export const prerender = false;

/**
 * POST /api/v1/jobs/pages/:page_id/process
 * Tworzy zadanie przetwarzania strony (OCR -> LLM -> ekstrakcja produktów)
 *
 * DOSTĘPNOŚĆ: Tylko administratorzy
 *
 * PARAMETRY PATH:
 * - page_id (UUID): ID strony do przetworzenia
 *
 * PARAMETRY BODY:
 * - model_hint (string, optional): Wskazówka dla modelu LLM (np. 'gpt-4o-mini', 'gpt-4')
 * - cost_limit_cents (number, optional): Limit kosztów w centach (> 0)
 * - force (boolean, optional): Czy utworzyć zadanie nawet jeśli istnieje już aktywne (default: false)
 *
 * ODPOWIEDZI:
 * - 201: Zadanie utworzone
 *   Body: { "data": { "job_id": "uuid", "status": "queued", "created_at": "timestamp", ... } }
 * - 400: Nieprawidłowe dane wejściowe
 * - 401: Brak autoryzacji
 * - 403: Brak uprawnień (nie admin)
 * - 404: Strona nie znaleziona
 * - 409: Istnieje już aktywne zadanie dla tej strony (gdy force=false)
 * - 500: Błąd serwera
 *
 * PRZYKŁAD BODY:
 * {
 *   "model_hint": "gpt-4o-mini",
 *   "cost_limit_cents": 500,
 *   "force": false
 * }
 *
 * PRZYKŁAD ODPOWIEDZI (201):
 * {
 *   "data": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "page_id": "660e8400-e29b-41d4-a716-446655440001",
 *     "status": "queued",
 *     "created_at": "2025-12-04T12:34:56Z",
 *     "started_at": null,
 *     "finished_at": null,
 *     "error_details": null,
 *     "meta": null
 *   }
 * }
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    // 1. Walidacja parametrów ścieżki (page_id)
    const paramValidation = PageIdParamSchema.safeParse(params);

    if (!paramValidation.success) {
      const details = formatZodErrors(paramValidation.error);
      throw new ValidationError("Nieprawidłowe parametry ścieżki", details);
    }

    const { page_id } = paramValidation.data;

    // 2. Sprawdzenie autoryzacji i uprawnień (tylko admin)
    const authenticatedUser = await requireAdmin(request, locals.supabase);

    // 3. Parsowanie i walidacja body
    let body;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Nieprawidłowy format JSON");
    }

    const validationResult = CreateJobRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe dane wejściowe", details);
    }

    // 4. Utworzenie zadania przez JobService
    const jobService = new JobService(locals.supabase);
    const job = await jobService.createJob({
      page_id: page_id,
      model_hint: validationResult.data.model_hint,
      cost_limit_cents: validationResult.data.cost_limit_cents,
      force: validationResult.data.force,
      requested_by: authenticatedUser.id,
    });

    // 5. Przygotowanie odpowiedzi
    const response: ApiResponse<JobDTO> = {
      data: job,
    };

    // 6. Zwrócenie odpowiedzi 201 Created
    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Location: `/api/v1/jobs/${job.id}`,
      },
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * Obsługa błędów endpointu
 * Konwertuje wyjątki AppError na odpowiedzi HTTP z odpowiednimi kodami statusu
 *
 * MAPOWANIE BŁĘDÓW:
 * - ValidationError (400): Nieprawidłowe dane wejściowe
 * - UnAuthorizedError (401): Brak autoryzacji
 * - ForbiddenError (403): Brak uprawnień
 * - NotFoundError (404): Strona nie znaleziona
 * - ConflictError (409): Konflikt - istnieje już aktywne zadanie
 * - InternalServerError (500): Błąd serwera
 *
 * @param error - Złapany wyjątek
 * @returns Response z kodem błędu i komunikatem
 */
function handleError(error: unknown): Response {
  // Obsługa AppError (ValidationError, UnAuthorizedError, ForbiddenError, NotFoundError, ConflictError, InternalServerError)
  if (error instanceof AppError) {
    return new Response(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Nieoczekiwany błąd - logowanie i zwrócenie ogólnego błędu 500
  console.error("Unexpected error in POST /api/v1/jobs/pages/:page_id/process:", error);

  const apiError: ApiError = {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Wystąpił nieoczekiwany błąd podczas tworzenia zadania",
    },
  };

  return new Response(JSON.stringify(apiError), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
