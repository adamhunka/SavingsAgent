import type { APIRoute } from "astro";
import { StorageService } from "@/lib/services/storage.service";
import { UploadUrlRequestSchema } from "@/lib/utils/validation";
import { requireAdmin } from "@/lib/utils/auth";
import { AppError, formatZodErrors, ValidationError, NotFoundError } from "@/lib/utils/errors";
import type { ApiError, UploadUrlResponse } from "@/types";

export const prerender = false;

/**
 * POST /api/v1/uploads/sign
 * Generuje signed upload URL do Supabase Storage dla obrazów stron gazetki
 *
 * DOSTĘPNOŚĆ: Tylko administratorzy
 * BUCKET: flyer-pages
 *
 * Request body:
 * - flyer_id: UUID gazetki
 * - flyer_slug: slug sklepu (np. lidl)
 * - page_number: numer strony (integer > 0)
 * - filename: nazwa pliku (sanityzowana)
 * - content_type: typ MIME (image/jpeg, image/png, image/webp)
 * - width?: szerokość obrazu (opcjonalne)
 * - height?: wysokość obrazu (opcjonalne)
 *
 * Response 201:
 * - upload_url: signed URL do uploadu
 * - public_path: ścieżka publiczna do zapisu w bazie
 * - expires_at: data wygaśnięcia URL (ISO 8601)
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

    const validationResult = UploadUrlRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe dane wejściowe", details);
    }

    const { flyer_id, flyer_slug, page_number, filename, content_type } = validationResult.data;

    // 3. Weryfikacja biznesowa - czy flyer_id istnieje w bazie
    const { data: flyer, error: flyerError } = await locals.supabase
      .from("flyers")
      .select("id, store_id")
      .eq("id", flyer_id)
      .maybeSingle();

    if (flyerError) {
      throw new ValidationError("Nie udało się zweryfikować gazetki");
    }

    if (!flyer) {
      throw new NotFoundError("Gazetka o podanym ID nie istnieje");
    }

    // 4. Opcjonalnie: Sprawdź czy strona o tym numerze już nie istnieje dla tej gazetki
    const { error: pageError } = await locals.supabase
      .from("pages")
      .select("id, page_number")
      .eq("flyer_id", flyer_id)
      .eq("page_number", page_number)
      .maybeSingle();

    if (pageError) {
      // Nie blokujemy procesu - możemy kontynuować
    }

    // 5. Inicjalizacja serwisu storage
    const storageService = new StorageService();

    // 6. Sanityzacja filename
    const sanitizedFilename = storageService.sanitizeFilename(filename);

    // 7. Budowa public_path
    const publicPath = storageService.buildPublicPath({
      flyerSlug: flyer_slug,
      flyerId: flyer_id,
      pageNumber: page_number,
      filename: sanitizedFilename,
    });

    // 8. Generowanie signed upload URL
    const { uploadUrl, expiresAt } = await storageService.createSignedUploadUrl({
      bucket: "flyer-pages",
      path: publicPath,
      contentType: content_type,
      expiresInSeconds: 900, // 15 minut
    });

    // 9. Przygotowanie odpowiedzi
    const response: UploadUrlResponse = {
      upload_url: uploadUrl,
      public_path: publicPath,
      expires_at: expiresAt,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store", // Nie cache'ować signed URLs
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
