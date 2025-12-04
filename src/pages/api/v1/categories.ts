import type { APIRoute } from "astro";
import { CategoryService } from "@/lib/services/categories.service";
import { GetCategoriesQuerySchema, CreateCategorySchema, UpdateCategorySchema } from "@/lib/utils/validation";
import { AppError, ValidationError, formatZodErrors } from "@/lib/utils/errors";
import type { CategoriesListResponse, ApiError, ApiResponse, CategoryDTO } from "@/types";
import { requireAdmin } from "@/lib/utils/auth";

export const prerender = false;

/**
 * GET /api/v1/categories
 * Pobiera listę kategorii z paginacją i wyszukiwaniem
 *
 * DOSTĘPNOŚĆ: Publiczny (każdy może wywołać)
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const queryParams = {
      sort: url.searchParams.get("sort") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const validationResult = GetCategoriesQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe parametry zapytania", details);
    }

    const { sort, page, limit } = validationResult.data;
    const categoryService = new CategoryService(locals.supabase);
    const result = await categoryService.list({ sort, page, limit });

    const response: CategoriesListResponse = {
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

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    await requireAdmin(request, locals.supabase);

    let body;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Nieprawidłowy format JSON");
    }

    const validationResult = CreateCategorySchema.safeParse(body);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("Nieprawidłowe dane wejściowe", details);
    }

    const categoryService = new CategoryService(locals.supabase);
    const category = await categoryService.create(validationResult.data);

    const response: ApiResponse<CategoryDTO> = {
      data: category,
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

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  try {
    const id = params.id;
    if (!id) {
      throw new ValidationError("Brak ID kategorii");
    }

    await requireAdmin(request, locals.supabase);

    let body;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError("Nieprawidłowy format JSON");
    }

    const validationResult = UpdateCategorySchema.safeParse(body);

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      throw new ValidationError("nieprawidłowe dane wejściowe", details);
    }

    const categoryService = new CategoryService(locals.supabase);
    const category = await categoryService.update(id, validationResult.data);

    const response: ApiResponse<CategoryDTO> = {
      data: category,
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

export const DELETE: APIRoute = async ({ request, params, locals }) => {
  try {
    const id = params.id;
    if (!id) {
      throw new ValidationError("Brak ID kategorii");
    }

    await requireAdmin(request, locals.supabase);

    const categoryService = new CategoryService(locals.supabase);
    await categoryService.delete(id);

    return new Response(null, {
      status: 204,
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
