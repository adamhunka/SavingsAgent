import type { supabaseClient } from "@/db/supabase.client";
import type { CategoryDTO, CreateCategoryCommand, UpdateCategoryCommand, PaginationMeta } from "@/types";
import { ConflictError, InternalServerError, NotFoundError } from "../utils/errors";

interface ListCategoriesParams {
  sort: "display_order";
  page: number;
  limit: number;
}

interface ListCategoriesResult {
  data: CategoryDTO[];
  meta: PaginationMeta;
}

export class CategoryService {
  constructor(private supabase: typeof supabaseClient) {}

  async list(params: ListCategoriesParams): Promise<ListCategoriesResult> {
    const { sort, page, limit } = params;

    let query = this.supabase.from("categories").select("id, name, icon_name, display_order", { count: "exact" });

    if (sort === "display_order") {
      query = query.order("display_order", { ascending: true });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new InternalServerError("Nie udało się pobrać listy kategorii");
    }

    const total = count ?? 0;
    const total_pages = Math.ceil(total / limit);

    const meta: PaginationMeta = {
      total,
      page,
      per_page: limit,
      total_pages,
    };

    return {
      data: data as CategoryDTO[],
      meta,
    };
  }

  async create(command: CreateCategoryCommand): Promise<CategoryDTO> {
    const { name, icon_name, display_order } = command;

    const { data: existing } = await this.supabase.from("categories").select("id").eq("name", name).maybeSingle();

    if (existing) {
      throw new ConflictError('Kategoria o nazwie "${name}" już isnieje', "CREATE_CATEGORY_DUPLICATE_NAME");
    }

    const { data, error } = await this.supabase
      .from("categories")
      .insert({ name, icon_name, display_order })
      .select("id, name, icon_name, display_order")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ConflictError('Kategoria o nazwie "${name}" już istnieje', "CREATE_DUPLICATE_NAME");
      }
      throw new InternalServerError("Nie udało się utworzyć kategorii");
    }
    return data as CategoryDTO;
  }

  async update(id: string, command: UpdateCategoryCommand): Promise<CategoryDTO> {
    const { data: existing } = await this.supabase.from("categories").select("id").eq("id", id).maybeSingle();

    if (!existing) {
      throw new NotFoundError("Kategoria o ID ${id} nie istnieje");
    }

    if (command.name) {
      const { data: duplicate } = await this.supabase
        .from("categories")
        .select("id")
        .eq("name", command.name)
        .neq("id", id)
        .maybeSingle();

      if (duplicate) {
        throw new ConflictError('Kategoria o nazwie "${command.name}" już isnieje', "CATEGORY_DUPLICATE_NAME");
      }
    }
    const { data, error } = await this.supabase
      .from("categories")
      .update(command)
      .eq("id", id)
      .select("id, name, icon_name, display_order")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ConflictError('Kategoria o nazwie "${command.name}" już isnieje', "CATEGORY_DUPLICATE_NAME");
      }
      throw new InternalServerError("Nie udało się zaktualizować kategorii");
    }
    return data as CategoryDTO;
  }

  async delete(id: string): Promise<void> {
    const { data: existing } = await this.supabase.from("categories").select("id").eq("id", id).maybeSingle();

    if (!existing) {
      throw new NotFoundError("Kategoria o ID ${id} nie istnieje");
    }

    const { data: products, error: productsError } = await this.supabase
      .from("products")
      .select("id")
      .eq("category_id", id)
      .limit(1);

    if (productsError) {
      throw new InternalServerError("Nie udło się sprawdzić powiązanych produktów");
    }

    if (products && products.length > 0) {
      throw new ConflictError("Kategoria o ID ${id} ma powiązane produkty", "CATEGORY_HAS_PRODUCTS");
    }
    const { error } = await this.supabase.from("categories").delete().eq("id", id);

    if (error) {
      throw new InternalServerError("Nie udało się usunąć kategorii");
    }
    return;
  }
}
