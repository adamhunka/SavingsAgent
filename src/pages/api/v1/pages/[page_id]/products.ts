import type { APIRoute } from "astro";
import { ProductService } from "@/lib/services/products.service";
import { CreateProductSchema, PageIdParamSchema } from "@/lib/utils/validation";
import { requireAdmin } from "@/lib/utils/auth";
import { AppError, formatZodErrors, ValidationError } from "@/lib/utils/errors";
import type { ApiError, ApiResponse, ProductDTO } from "@/types";

export const prerender = false;

/**
 * POST /api/v1/pages/:page_id/products
 * Tworzy nowy produkt przypisany do strony
 *
 * DOSTĘPNOŚĆ: Tylko administratorzy
 *
 * PARAMETRY PATH:
 * - page_id (UUID): ID strony, do której należy produkt
 *
 * PARAMETRY BODY:
 * - category_id (UUID, required): ID kategorii produktu
 * - name (string, required): Nazwa produktu
 * - price_promo (number, required): Cena promocyjna (> 0)
 * - price_regular (number|null, optional): Cena regularna (>= price_promo)
 * - description (string|null, optional): Opis produktu (max 1000 znaków)
 * - conditions (string|null, optional): Warunki promocji (max 500 znaków)
 * - bounding_box (object|null, optional): Współrzędne produktu na obrazie
 *   - x (number): Pozycja X (>= 0)
 *   - y (number): Pozycja Y (>= 0)
 *   - width (number): Szerokość (> 0)
 *   - height (number): Wysokość (> 0)
 *
 * ODPOWIEDZI:
 * - 201: Produkt utworzony
 * - 400: Nieprawidłowe dane
 * - 401: Brak autoryzacji
 * - 403: Brak uprawnień
 * - 404: Strona lub kategoria nie znaleziona
 * - 500: Błąd serwera
 *
 * PRZYKŁAD BODY:
 * {
 *   "category_id": "550e8400-e29b-41d4-a716-446655440000",
 *   "name": "Mleko 2% 1L",
 *   "price_promo": 3.99,
 *   "price_regular": 5.49,
 *   "description": "Mleko UHT 2% tłuszczu, 1 litr",
 *   "conditions": "Ważne do 31.12.2024",
 *   "bounding_box": {
 *     "x": 100,
 *     "y": 200,
 *     "width": 150,
 *     "height": 180
 *   }
 * }
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const paramValidation = PageIdParamSchema.safeParse(params);

    if (!paramValidation.success) {
      const details = formatZodErrors(paramValidation.error);
      throw new ValidationError("Nieprawidłowe parametry", details);
    }

    const { page_id } = paramValidation.data;

    await requireAdmin(request, locals.supabase);

    let body;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Nieprawidłowy format JSON");
    }

    const validationResult = CreateProductSchema.safeParse(body);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe dane wejściowe", details);
    }

    const productService = new ProductService(locals.supabase);
    const product = await productService.createProduct(page_id, validationResult.data);

    const response: ApiResponse<ProductDTO> = {
      data: product,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Location: `/api/v1/products/${product.id}`,
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
