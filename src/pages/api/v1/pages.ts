import type { APIRoute } from "astro";
import { CreatePageSchema } from "@/lib/utils/validation";
import { requireAdmin } from "@/lib/utils/auth";
import { AppError, formatZodErrors, ValidationError, NotFoundError, ConflictError } from "@/lib/utils/errors";
import type { ApiError, ApiResponse, PageDTO, CreatePageCommand } from "@/types";

export const prerender = false;

/**
 * POST /api/v1/pages
 * Tworzy nową stronę gazetki w bazie danych
 *
 * DOSTĘPNOŚĆ: Tylko administratorzy
 *
 * Request body:
 * - flyer_id: UUID gazetki
 * - page_number: numer strony (integer > 0)
 * - image_path: ścieżka do obrazu w storage
 * - image_width?: szerokość obrazu (opcjonalne)
 * - image_height?: wysokość obrazu (opcjonalne)
 *
 * Response 201:
 * - PageDTO: Utworzona strona
 *
 * Response 409:
 * - Konflikt: strona o tym numerze już istnieje dla tej gazetki
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Autoryzacja - wymagana rola admin
    await requireAdmin(request, locals.supabase);

    // 2. Parsowanie i walidacja body
    let body;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Nieprawidłowy format JSON");
    }

    const validationResult = CreatePageSchema.safeParse(body);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe dane wejściowe", details);
    }

    const command: CreatePageCommand = validationResult.data;

    // 3. Sprawdzenie czy gazetka istnieje
    const { data: flyer, error: flyerError } = await locals.supabase
      .from("flyers")
      .select("id")
      .eq("id", command.flyer_id)
      .maybeSingle();

    if (flyerError) {
      throw new ValidationError("Nie udało się zweryfikować gazetki");
    }

    if (!flyer) {
      throw new NotFoundError("Gazetka o podanym ID nie istnieje");
    }

    // 4. Sprawdzenie czy strona o tym numerze już nie istnieje
    const { data: existingPage } = await locals.supabase
      .from("pages")
      .select("id, page_number")
      .eq("flyer_id", command.flyer_id)
      .eq("page_number", command.page_number)
      .maybeSingle();

    if (existingPage) {
      throw new ConflictError(`Strona o numerze ${command.page_number} już istnieje dla tej gazetki`);
    }

    // 5. Utworzenie strony
    const { data, error } = await locals.supabase
      .from("pages")
      .insert({
        flyer_id: command.flyer_id,
        page_number: command.page_number,
        image_path: command.image_path,
        image_width: command.image_width ?? null,
        image_height: command.image_height ?? null,
        processing_status: "pending",
      })
      .select(
        "id, flyer_id, page_number, image_path, image_width, image_height, processing_status, processing_started_at, verified_at, verified_by"
      )
      .single();

    if (error) {
      throw new ValidationError("Nie udało się utworzyć strony");
    }

    // 6. Zwrócenie utworzonej strony
    const response: ApiResponse<PageDTO> = {
      data: data as PageDTO,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
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
      message: "Wystąpił nieoczekiwany błąd serwera",
    },
  };

  return new Response(JSON.stringify(apiError), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
