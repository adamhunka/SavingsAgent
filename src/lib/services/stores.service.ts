import type { supabaseClient } from "@/db/supabase.client";
import type { StoreDTO, CreateStoreCommand, PaginationMeta } from "@/types";
import { ConflictError, InternalServerError } from "../utils/errors";

/**
 * Parametry dla metody list()
 */
interface ListStoresParams {
  q?: string; // Wyszukiwanie
  page: number; // Numer strony
  limit: number; // Rekordów na stronę
}

/**
 * Wynik metody list()
 */
interface ListStoresResult {
  data: StoreDTO[];
  meta: PaginationMeta;
}

/**
 * Serwis odpowiedzialny za operacje na sklepach
 */
export class StoreService {
  constructor(private supabase: typeof supabaseClient) {}

  async list(params: ListStoresParams): Promise<ListStoresResult> {
    const { q, page, limit } = params;

    let query = this.supabase.from("stores").select("id, name, logo_url", { count: "exact" });

    if (q) {
      query = query.ilike("name", "%${q}%");
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to).order("name", { ascending: true });

    if (error) {
      throw new InternalServerError("Nie udało się pobrać listy sklepów");
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
      data: data as StoreDTO[],
      meta,
    };
  }

  /**
   * Tworzy nowy sklep
   */
  async create(command: CreateStoreCommand): Promise<StoreDTO> {
    const { name, logo_url } = command;

    const { data: existing } = await this.supabase.from("stores").select("id").eq("name", name).maybeSingle();

    if (existing) {
      throw new ConflictError('Sklep o nazwie "${name}" już istnieje', "STORE DUPLICATE_NAME");
    }

    const { data, error } = await this.supabase
      .from("stores")
      .insert({
        name,
        logo_url: logo_url ?? null,
      })
      .select("id, name, logo_url")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ConflictError('Sklep o nazwie "${name}" już istnieje', "STORE DUPLICATE_NAME");
      }
      throw new InternalServerError("Nie udało się utworzyć sklepu");
    }

    return data as StoreDTO;
  }
}
