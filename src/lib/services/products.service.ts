import type { supabaseClient } from "@/db/supabase.client";
import type {
  ProductListItemDTO,
  ProductDetailDTO,
  ProductDTO,
  CreateProductCommand,
  UpdateProductCommand,
  PaginationMeta,
} from "@/types";
import { InternalServerError, NotFoundError } from "@/lib/utils/errors";

/**
 * Parametry dla metody listProducts()
 */
interface ListProductsParams {
  store_id?: string;
  category_id?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
  sort: "price_asc" | "price_desc" | "created_at_desc";
  page: number;
  per_page: number;
  similarity_threshold?: number;
}

/**
 * Wynik metody listProducts()
 */
interface ListProductsResult {
  data: ProductListItemDTO[];
  meta: PaginationMeta;
}

export class ProductService {
  constructor(private supabase: typeof supabaseClient) {}

  /**
   * Pobiera listę produktów z paginacją, filtrami i wyszukiwaniem
   * @param params - Parametry zapytania (filtry, paginacja, sortowanie, wyszukiwanie)
   * @returns Zwraca listę produktów z metadanymi paginacji
   * @throws InternalServerError w przypadku błędu bazy danych
   */
  async listProducts(params: ListProductsParams): Promise<ListProductsResult> {
    const { store_id, category_id, q, min_price, max_price, sort, page, per_page } = params;

    // Jeśli jest zapytanie wyszukiwania, używamy FTS lub trigram
    if (q && q.trim()) {
      return this.searchProducts(params);
    }

    // Standardowe listowanie z widoku v_active_products
    let query = this.supabase.from("v_active_products").select("*", { count: "exact" });

    // Filtrowanie
    if (store_id) {
      query = query.eq("store_id", store_id);
    }
    if (category_id) {
      query = query.eq("category_id", category_id);
    }
    if (min_price !== undefined) {
      query = query.gte("price_promo", min_price);
    }
    if (max_price !== undefined) {
      query = query.lte("price_promo", max_price);
    }

    // Sortowanie
    switch (sort) {
      case "price_asc":
        query = query.order("price_promo", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price_promo", { ascending: false });
        break;
      case "created_at_desc":
      default:
        query = query.order("product_id", { ascending: false }); // używamy ID jako proxy dla created_at
        break;
    }

    // Paginacja
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new InternalServerError("Nie udało się pobrać listy produktów");
    }

    // Mapowanie wyniku do ProductListItemDTO (usuwamy page_image_path jeśli obecne)
    const products: ProductListItemDTO[] = (data || []).map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { page_image_path, ...rest } = row as typeof row & { page_image_path?: string };
      return rest as ProductListItemDTO;
    });

    // Metadane paginacji
    const total = count ?? 0;
    const total_pages = Math.ceil(total / per_page);

    const meta: PaginationMeta = {
      total,
      page,
      per_page,
      total_pages,
    };

    return {
      data: products,
      meta,
    };
  }

  /**
   * Wyszukiwanie produktów z użyciem FTS + trigram
   * @param params - Parametry zapytania
   * @returns Zwraca listę produktów z metadanymi paginacji
   * @throws InternalServerError w przypadku błędu bazy danych
   */
  private async searchProducts(params: ListProductsParams): Promise<ListProductsResult> {
    const { store_id, category_id, q, min_price, max_price, sort, page, per_page, similarity_threshold } = params;
    const searchQuery = q ? q.trim() : "";

    // Wywołanie funkcji search_products z bazy danych
    // Funkcja zwraca kolumny z v_active_products + rank/similarity_score
    const { data, error } = await this.supabase.rpc("search_products", {
      search_query: searchQuery,
      p_store_id: store_id || null,
      p_category_id: category_id || null,
      p_min_price: min_price || null,
      p_max_price: max_price || null,
      p_similarity_threshold: similarity_threshold || 0.3,
      p_limit: per_page,
      p_offset: (page - 1) * per_page,
    });

    if (error) {
      throw new InternalServerError("Nie udało się wyszukać produktów");
    }

    // Mapowanie wyniku
    const products: ProductListItemDTO[] = (data || []).map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { page_image_path, rank, similarity_score, ...rest } = row as typeof row & {
        page_image_path?: string;
        rank?: number;
        similarity_score?: number;
      };
      return rest as ProductListItemDTO;
    });

    // Sortowanie w pamięci (ponieważ RPC zwraca już posortowane przez rank, ale możemy override)
    if (sort === "price_asc") {
      products.sort((a, b) => (a.price_promo ?? 0) - (b.price_promo ?? 0));
    } else if (sort === "price_desc") {
      products.sort((a, b) => (b.price_promo ?? 0) - (a.price_promo ?? 0));
    }
    // dla created_at_desc pozostawiamy sortowanie domyślne (rank)

    // Meta - dla wyszukiwania nie mamy dokładnego total count (MVP limitation)
    // Możemy to oszacować lub zawsze zwrócić null
    const meta: PaginationMeta = {
      total: products.length, // niedokładne, ale dla MVP wystarczy
      page,
      per_page,
      total_pages: 1, // nie wiemy dokładnie
    };

    return {
      data: products,
      meta,
    };
  }

  /**
   * Pobiera szczegóły produktu po ID
   * @param id - ID produktu
   * @returns Zwraca ProductDetailDTO
   * @throws NotFoundError jeśli produkt nie istnieje
   * @throws InternalServerError w przypadku błędu bazy danych
   */
  async getProductById(id: string): Promise<ProductDetailDTO> {
    // Pobranie produktu z JOIN na category, page, store
    const { data: product, error } = await this.supabase
      .from("products")
      .select(
        `
        id,
        page_id,
        category_id,
        name,
        price_promo,
        price_regular,
        description,
        conditions,
        bounding_box,
        categories!inner(id, name, icon_name),
        pages!inner(
          id,
          page_number,
          image_path,
          flyer_id,
          flyers!inner(
            store_id,
            stores!inner(id, name, logo_url)
          )
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new InternalServerError("Nie udało się pobrać produktu");
    }

    if (!product) {
      throw new NotFoundError(`Produkt o ID "${id}" nie został znaleziony`);
    }

    // Mapowanie do ProductDetailDTO
    const category = product.categories as unknown as { id: string; name: string; icon_name: string };
    const page = product.pages as unknown as {
      id: string;
      page_number: number;
      image_path: string;
      flyers: {
        stores: { id: string; name: string; logo_url: string | null };
      };
    };

    const result: ProductDetailDTO = {
      id: product.id,
      page_id: product.page_id,
      category_id: product.category_id,
      name: product.name,
      price_promo: product.price_promo,
      price_regular: product.price_regular,
      description: product.description,
      conditions: product.conditions,
      bounding_box: product.bounding_box as { x: number; y: number; width: number; height: number } | null,
      category: {
        id: category.id,
        name: category.name,
        icon_name: category.icon_name,
      },
      page: {
        id: page.id,
        page_number: page.page_number,
        image_path: page.image_path,
        store: {
          id: page.flyers.stores.id,
          name: page.flyers.stores.name,
          logo_url: page.flyers.stores.logo_url,
        },
      },
    };

    return result;
  }

  /**
   * Tworzy nowy produkt
   * @param pageId - ID strony, do której należy produkt
   * @param command - Dane do utworzenia produktu
   * @returns Zwraca utworzony ProductDTO
   * @throws NotFoundError jeśli strona lub kategoria nie istnieje
   * @throws InternalServerError w przypadku błędu bazy danych
   */
  async createProduct(pageId: string, command: CreateProductCommand): Promise<ProductDTO> {
    // 1. Sprawdzenie czy strona istnieje
    const { data: page, error: pageError } = await this.supabase
      .from("pages")
      .select("id")
      .eq("id", pageId)
      .maybeSingle();

    if (pageError) {
      throw new InternalServerError("Nie udało się pobrać strony");
    }

    if (!page) {
      throw new NotFoundError(`Strona o ID "${pageId}" nie została znaleziona`);
    }

    // 2. Sprawdzenie czy kategoria istnieje
    const { data: category, error: categoryError } = await this.supabase
      .from("categories")
      .select("id")
      .eq("id", command.category_id)
      .maybeSingle();

    if (categoryError) {
      throw new InternalServerError("Nie udało się pobrać kategorii");
    }

    if (!category) {
      throw new NotFoundError(`Kategoria o ID "${command.category_id}" nie została znaleziona`);
    }

    // 3. Wstawienie produktu
    const { data, error } = await this.supabase
      .from("products")
      .insert({
        page_id: pageId,
        category_id: command.category_id,
        name: command.name,
        price_promo: command.price_promo,
        price_regular: command.price_regular ?? null,
        description: command.description ?? null,
        conditions: command.conditions ?? null,
        bounding_box: command.bounding_box ?? null,
      })
      .select("id, page_id, category_id, name, price_promo, price_regular, description, conditions, bounding_box")
      .single();

    if (error) {
      throw new InternalServerError("Nie udało się utworzyć produktu");
    }

    return data as ProductDTO;
  }

  /**
   * Aktualizuje produkt
   * @param id - ID produktu
   * @param command - Dane do aktualizacji
   * @returns Zwraca zaktualizowany ProductDTO
   * @throws NotFoundError jeśli produkt lub kategoria nie istnieje
   * @throws InternalServerError w przypadku błędu bazy danych
   */
  async updateProduct(id: string, command: UpdateProductCommand): Promise<ProductDTO> {
    // 1. Sprawdzenie czy produkt istnieje
    const { data: existing, error: existingError } = await this.supabase
      .from("products")
      .select("id, price_promo, price_regular")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new InternalServerError("Nie udało się pobrać produktu");
    }

    if (!existing) {
      throw new NotFoundError(`Produkt o ID "${id}" nie został znaleziony`);
    }

    // 2. Jeśli aktualizujemy category_id, sprawdzamy czy istnieje
    if (command.category_id) {
      const { data: category, error: categoryError } = await this.supabase
        .from("categories")
        .select("id")
        .eq("id", command.category_id)
        .maybeSingle();

      if (categoryError) {
        throw new InternalServerError("Nie udało się pobrać kategorii");
      }

      if (!category) {
        throw new NotFoundError(`Kategoria o ID "${command.category_id}" nie została znaleziona`);
      }
    }

    // 3. Dodatkowa walidacja biznesowa: jeśli aktualizujemy tylko price_promo lub price_regular,
    // sprawdzamy spójność z istniejącymi wartościami
    const newPricePromo = command.price_promo ?? existing.price_promo;
    const newPriceRegular = command.price_regular !== undefined ? command.price_regular : existing.price_regular;

    if (newPriceRegular !== null && newPriceRegular < newPricePromo) {
      throw new InternalServerError("Cena regularna musi być >= ceny promocyjnej");
    }

    // 4. Budowanie updateData
    const updateData: Record<string, unknown> = {};
    if (command.category_id !== undefined) updateData.category_id = command.category_id;
    if (command.name !== undefined) updateData.name = command.name;
    if (command.price_promo !== undefined) updateData.price_promo = command.price_promo;
    if (command.price_regular !== undefined) updateData.price_regular = command.price_regular;
    if (command.description !== undefined) updateData.description = command.description;
    if (command.conditions !== undefined) updateData.conditions = command.conditions;
    if (command.bounding_box !== undefined) updateData.bounding_box = command.bounding_box;

    // 5. Aktualizacja produktu
    const { data, error } = await this.supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select("id, page_id, category_id, name, price_promo, price_regular, description, conditions, bounding_box")
      .single();

    if (error) {
      throw new InternalServerError("Nie udało się zaktualizować produktu");
    }

    return data as ProductDTO;
  }

  /**
   * Usuwa produkt
   * @param id - ID produktu
   * @throws NotFoundError jeśli produkt nie istnieje
   * @throws InternalServerError w przypadku błędu bazy danych
   */
  async deleteProduct(id: string): Promise<void> {
    // 1. Sprawdzenie czy produkt istnieje
    const { data: existing, error: existingError } = await this.supabase
      .from("products")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      throw new InternalServerError("Nie udało się pobrać produktu");
    }

    if (!existing) {
      throw new NotFoundError(`Produkt o ID "${id}" nie został znaleziony`);
    }

    // 2. Usunięcie produktu
    const { error } = await this.supabase.from("products").delete().eq("id", id);

    if (error) {
      throw new InternalServerError("Nie udało się usunąć produktu");
    }
  }
}
