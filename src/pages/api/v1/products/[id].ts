import type { APIRoute } from "astro";
import { ProductService } from "@/lib/services/products.service";
import { UpdateProductSchema, UuidParamSchema } from "@/lib/utils/validation";
import { requireAdmin } from "@/lib/utils/auth";
import { AppError, formatZodErrors, ValidationError } from "@/lib/utils/errors";
import type { ApiError, ApiResponse, ProductDetailDTO, ProductDTO } from "@/types";

export const prerender = false;

/**
 * GET /api/v1/products/:id
 * Pobiera szczegóły produktu
 *
 * DOSTĘPNOŚĆ: Publiczny (każdy może wywołać)
 *
 * PARAMETRY PATH:
 * - id (UUID): ID produktu
 *
 * ODPOWIEDZI:
 * - 200: Szczegóły produktu
 * - 400: Nieprawidłowe ID
 * - 404: Produkt nie znaleziony
 * - 500: Błąd serwera
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const paramValidation = UuidParamSchema.safeParse(params);

    if (!paramValidation.success) {
      const details = formatZodErrors(paramValidation.error);
      throw new ValidationError("Nieprawidłowe parametry", details);
    }

    const { id } = paramValidation.data;

    const productService = new ProductService(locals.supabase);
    const product = await productService.getProductById(id);

    const response: ApiResponse<ProductDetailDTO> = {
      data: product,
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

/**
 * PATCH /api/v1/products/:id
 * Aktualizuje produkt
 *
 * DOSTĘPNOŚĆ: Tylko administratorzy
 *
 * PARAMETRY PATH:
 * - id (UUID): ID produktu
 *
 * PARAMETRY BODY:
 * - category_id (UUID, optional): Nowa kategoria
 * - name (string, optional): Nowa nazwa
 * - price_promo (number, optional): Nowa cena promocyjna
 * - price_regular (number|null, optional): Nowa cena regularna
 * - description (string|null, optional): Nowy opis
 * - conditions (string|null, optional): Nowe warunki
 * - bounding_box (object|null, optional): Nowy bounding box
 *
 * ODPOWIEDZI:
 * - 200: Zaktualizowany produkt
 * - 400: Nieprawidłowe dane
 * - 401: Brak autoryzacji
 * - 403: Brak uprawnień
 * - 404: Produkt nie znaleziony
 * - 500: Błąd serwera
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const paramValidation = UuidParamSchema.safeParse(params);

    if (!paramValidation.success) {
      const details = formatZodErrors(paramValidation.error);
      throw new ValidationError("Nieprawidłowe parametry", details);
    }

    const { id } = paramValidation.data;

    await requireAdmin(request, locals.supabase);

    let body;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Nieprawidłowy format JSON");
    }

    const validationResult = UpdateProductSchema.safeParse(body);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe dane wejściowe", details);
    }

    const productService = new ProductService(locals.supabase);
    const product = await productService.updateProduct(id, validationResult.data);

    const response: ApiResponse<ProductDTO> = {
      data: product,
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
 * DELETE /api/v1/products/:id
 * Usuwa produkt
 *
 * DOSTĘPNOŚĆ: Tylko administratorzy
 *
 * PARAMETRY PATH:
 * - id (UUID): ID produktu
 *
 * ODPOWIEDZI:
 * - 204: Produkt usunięty (bez treści)
 * - 400: Nieprawidłowe ID
 * - 401: Brak autoryzacji
 * - 403: Brak uprawnień
 * - 404: Produkt nie znaleziony
 * - 500: Błąd serwera
 */
export const DELETE: APIRoute = async ({ params, request, locals }) => {
  try {
    const paramValidation = UuidParamSchema.safeParse(params);

    if (!paramValidation.success) {
      const details = formatZodErrors(paramValidation.error);
      throw new ValidationError("Nieprawidłowe parametry", details);
    }

    const { id } = paramValidation.data;

    await requireAdmin(request, locals.supabase);

    const productService = new ProductService(locals.supabase);
    await productService.deleteProduct(id);

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
