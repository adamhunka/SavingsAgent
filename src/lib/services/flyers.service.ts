import type { supabaseClient } from "@/db/supabase.client";
import type { CreateFlyerCommand, FlyerListItemDTO, FlyerDetailDTO, UpdateFlyerCommand, PaginationMeta } from "@/types";
import { InternalServerError, NotFoundError } from "@/lib/utils/errors";

/**
 * Parametry dla metody listFlyers()
 */
interface ListFlyersParams {
  status?: "draft" | "active" | "archived";
  store_id?: string;
  page: number;
  per_page: number;
}

/**
 * Wynik metody listFlyers()
 */
interface ListFlyersResult {
  data: FlyerListItemDTO[];
  meta: PaginationMeta;
}

/**
 * Opcje dla metody getFlyerById()
 */
interface GetFlyerByIdOptions {
  includePages?: boolean;
}

export class FlyerService {
  constructor(private supabase: typeof supabaseClient) {}

  /**
   * Tworzy nową gazetkę
   * @param command - Dane do utworzenia gazetki
   * @returns Zwraca FlyerListItemDTO z store_name
   * @throws NotFoundError jeśli sklep nie istnieje
   * @throws InternalServerError w przypadku błędu bazy danych
   */
  async createFlyer(command: CreateFlyerCommand): Promise<FlyerListItemDTO> {
    // 1. Sprawdzenie czy sklep istnieje
    const { data: store, error: storeError } = await this.supabase
      .from("stores")
      .select("id, name")
      .eq("id", command.store_id)
      .maybeSingle();

    if (storeError) {
      throw new InternalServerError("Nie udało się pobrać sklepu");
    }

    if (!store) {
      throw new NotFoundError(`Sklep o ID "${command.store_id}" nie został znaleziony`);
    }

    // 2. Wstawienie nowej gazetki
    const { data, error } = await this.supabase
      .from("flyers")
      .insert({
        store_id: command.store_id,
        valid_from: command.valid_from,
        valid_to: command.valid_to,
        status: command.status || "draft",
      })
      .select("id, store_id, valid_from, valid_to, status")
      .single();

    if (error) {
      throw new InternalServerError("Nie udało się utworzyć gazetki");
    }

    // 3. Zwrócenie FlyerListItemDTO z store_name
    return {
      ...data,
      store_name: store.name,
    };
  }

  /**
   * Pobiera listę gazetek z paginacją i filtrami
   * @param params - Parametry zapytania (status, store_id, page, per_page)
   * @returns Zwraca listę gazetek z metadanymi paginacji
   * @throws InternalServerError w przypadku błędu bazy danych
   */
  async listFlyers(params: ListFlyersParams): Promise<ListFlyersResult> {
    const { status, store_id, page, per_page } = params;

    // 1. Budowanie zapytania z JOIN na stores
    let query = this.supabase
      .from("flyers")
      .select("id, store_id, valid_from, valid_to, status, stores!inner(name)", { count: "exact" });

    // 2. Filtrowanie
    if (status) {
      query = query.eq("status", status);
    } else {
      // Domyślnie pokazujemy tylko active
      query = query.eq("status", "active");
    }

    if (store_id) {
      query = query.eq("store_id", store_id);
    }

    // 3. Paginacja
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    // 4. Sortowanie i wykonanie zapytania
    const { data, error, count } = await query.range(from, to).order("valid_from", { ascending: false });

    if (error) {
      throw new InternalServerError("Nie udało się pobrać listy gazetek");
    }

    // 5. Mapowanie wyniku do FlyerListItemDTO
    const flyers: FlyerListItemDTO[] = (data || []).map((row) => ({
      id: row.id,
      store_id: row.store_id,
      valid_from: row.valid_from,
      valid_to: row.valid_to,
      status: row.status,
      store_name: (row.stores as { name: string }).name,
    }));

    // 6. Metadane paginacji
    const total = count ?? 0;
    const total_pages = Math.ceil(total / per_page);

    const meta: PaginationMeta = {
      total,
      page,
      per_page,
      total_pages,
    };

    return {
      data: flyers,
      meta,
    };
  }

  /**
   * Pobiera szczegóły gazetki po ID
   * @param id - ID gazetki
   * @param options - Opcje (includePages)
   * @returns Zwraca FlyerDetailDTO
   * @throws NotFoundError jeśli gazetka nie istnieje
   * @throws InternalServerError w przypadku błędu bazy danych
   */
  async getFlyerById(id: string, options?: GetFlyerByIdOptions): Promise<FlyerDetailDTO> {
    // 1. Pobranie gazetki z nazwą sklepu
    const { data: flyer, error } = await this.supabase
      .from("flyers")
      .select("id, store_id, valid_from, valid_to, status, stores!inner(name)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InternalServerError("Nie udało się pobrać gazetki");
    }

    if (!flyer) {
      throw new NotFoundError(`Gazetka o ID "${id}" nie została znaleziona`);
    }

    // 2. Mapowanie do FlyerDetailDTO
    const result: FlyerDetailDTO = {
      id: flyer.id,
      store_id: flyer.store_id,
      valid_from: flyer.valid_from,
      valid_to: flyer.valid_to,
      status: flyer.status,
      store_name: (flyer.stores as { name: string }).name,
    };

    // 3. Opcjonalnie dołączenie stron
    if (options?.includePages) {
      const { data: pages, error: pagesError } = await this.supabase
        .from("pages")
        .select("id, page_number, image_path, processing_status, processing_started_at, verified_at, verified_by")
        .eq("flyer_id", id)
        .order("page_number", { ascending: true });

      if (pagesError) {
        throw new InternalServerError("Nie udało się pobrać stron gazetki");
      }

      result.pages = pages || [];
    }

    return result;
  }

  /**
   * Aktualizuje gazetkę
   * @param id - ID gazetki
   * @param command - Dane do aktualizacji
   * @returns Zwraca zaktualizowaną FlyerListItemDTO
   * @throws NotFoundError jeśli gazetka nie istnieje
   * @throws InternalServerError w przypadku błędu bazy danych
   */
  async updateFlyer(id: string, command: UpdateFlyerCommand): Promise<FlyerListItemDTO> {
    // 1. Sprawdzenie czy gazetka istnieje
    const { data: existing, error: existingError } = await this.supabase
      .from("flyers")
      .select("id, store_id, stores!inner(name)")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new InternalServerError("Nie udało się pobrać gazetki");
    }

    if (!existing) {
      throw new NotFoundError(`Gazetka o ID "${id}" nie została znaleziona`);
    }

    // 2. Aktualizacja gazetki
    const updateData: Record<string, string> = {};
    if (command.valid_from !== undefined) updateData.valid_from = command.valid_from;
    if (command.valid_to !== undefined) updateData.valid_to = command.valid_to;
    if (command.status !== undefined) updateData.status = command.status;

    const { data, error } = await this.supabase
      .from("flyers")
      .update(updateData)
      .eq("id", id)
      .select("id, store_id, valid_from, valid_to, status")
      .single();

    if (error) {
      throw new InternalServerError("Nie udało się zaktualizować gazetki");
    }

    // 3. Zwrócenie FlyerListItemDTO z store_name
    return {
      ...data,
      store_name: (existing.stores as { name: string }).name,
    };
  }

  /**
   * Usuwa gazetkę
   * @param id - ID gazetki
   * @throws NotFoundError jeśli gazetka nie istnieje
   * @throws InternalServerError w przypadku błędu bazy danych
   */
  async deleteFlyer(id: string): Promise<void> {
    // 1. Usunięcie gazetki (CASCADE usunie pages i products)
    const { error } = await this.supabase.from("flyers").delete().eq("id", id);

    if (error) {
      // PostgreSQL error code 23503 = FOREIGN_KEY_VIOLATION
      if (error.code === "23503") {
        throw new InternalServerError("Nie można usunąć gazetki - istnieją powiązane zasoby");
      }
      throw new InternalServerError("Nie udało się usunąć gazetki");
    }
  }
}
