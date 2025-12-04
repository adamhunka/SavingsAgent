import { z } from "zod";

/**
 * Schema dla walidacji UUID w parametrach ścieżki
 */
export const UuidParamSchema = z.object({
  id: z.string().uuid("ID musi być poprawnym UUID"),
});

export const PageIdParamSchema = z.object({
  page_id: z.string().uuid("ID strony musi być poprawnym UUID"),
});

/**
 * Schema dla parametrów zapytania GET /api/v1/stores
 */
export const GetStoresQuerySchema = z.object({
  q: z.string().max(50, "Zapytanie nie może być dłuższe niż 50 znaków").optional(),
  page: z.coerce.number().int().min(1, "Numer strony musi być >=1").default(1),
  limit: z.coerce.number().int().min(1, "Limit musi być >=1").max(100, "Limit nie może przekraczać 100").default(20),
});

export const CreateStoreSchema = z.object({
  name: z.string().trim().min(1, "Nazwa sklepu jest wymagana").max(100, "Nazwa sklepu nie może przekraczać 100 znaków"),
  logo_url: z.string().url("Logo URL musi być poprawnym adresem URL").optional(),
});

export const GetCategoriesQuerySchema = z.object({
  sort: z
    .enum(["display_order"], { errorMap: () => ({ message: "Dozwolona wartość: display_order" }) })
    .default("display_order"),
  page: z.coerce.number().int().min(1, "Numer strony musi być >=1").default(1),
  limit: z.coerce.number().int().min(1, "Limit musi być >= 1").max(100, "Limit nie może przekraczać 100").default(20),
});

export const CreateCategorySchema = z.object({
  name: z
    .string({ required_error: "Nazwa kategorii jest wymagana" })
    .trim()
    .min(1, "Nazwa kategorii nie może być pusta")
    .max(100, "Nazwa kategorii nie może przekraczać100 znaków"),
  icon_name: z
    .string({ required_error: "Nazwa ikony jest wymagana" })
    .trim()
    .min(1, "Nazwa ikony nie może być pusta")
    .max(50, "Nazwa ikony nie może przekraczać 50 znaków"),
  display_order: z
    .number()
    .int("Kolejność wyświetlania musi być liczbą całkowitą")
    .nonnegative("Kolejność wyświertlania nie może być ujemna")
    .default(0)
    .optional(),
});

export const UpdateCategorySchema = z
  .object({
    name: z
      .string({ required_error: "Nazwa kategorii jest wymagana" })
      .trim()
      .min(1, "Nazwa kategorii nie może być pusta")
      .max(100, "Nazwa kategorii nie może przekraczać100 znaków"),
    icon_name: z
      .string({ required_error: "Nazwa ikony jest wymagana" })
      .trim()
      .min(1, "Nazwa ikony nie może być pusta")
      .max(50, "Nazwa ikony nie może przekraczać 50 znaków"),
    display_order: z
      .number()
      .int("Kolejność wyświetlania musi być liczbą całkowitą")
      .nonnegative("Kolejność wyświertlania nie może być ujemna")
      .default(0)
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Co najmniej jedno pole musi być podane",
  });

/**
 * Schema dla parametrów zapytania GET /api/v1/flyers
 */
export const GetFlyersQuerySchema = z.object({
  status: z.enum(["draft", "active", "archived"]).optional(),
  store_id: z.string().uuid("ID sklepu musi być poprawnym UUID").optional(),
  page: z.coerce.number().int().min(1, "Numer strony musi być >=1").default(1),
  per_page: z.coerce.number().int().min(1, "Limit musi być >=1").max(100, "Limit nie może przekraczać 100").default(20),
});

/**
 * Schema dla tworzenia gazetki POST /api/v1/flyers
 */
export const CreateFlyerSchema = z
  .object({
    store_id: z.string().uuid("ID sklepu musi być poprawnym UUID"),
    valid_from: z.coerce
      .date({ invalid_type_error: "Data początku musi być poprawną datą" })
      .transform((date) => date.toISOString().split("T")[0]),
    valid_to: z.coerce
      .date({ invalid_type_error: "Data końca musi być poprawną datą" })
      .transform((date) => date.toISOString().split("T")[0]),
    status: z.enum(["draft", "active", "archived"]).default("draft").optional(),
  })
  .refine((data) => new Date(data.valid_to) >= new Date(data.valid_from), {
    message: "Data końca promocji musi być >= data początku",
    path: ["valid_to"],
  });

/**
 * Schema dla aktualizacji gazetki PATCH /api/v1/flyers/:id
 */
export const UpdateFlyerSchema = z
  .object({
    valid_from: z.coerce
      .date({ invalid_type_error: "Data początku musi być poprawną datą" })
      .transform((date) => date.toISOString().split("T")[0])
      .optional(),
    valid_to: z.coerce
      .date({ invalid_type_error: "Data końca musi być poprawną datą" })
      .transform((date) => date.toISOString().split("T")[0])
      .optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Co najmniej jedno pole musi być podane",
  })
  .refine(
    (data) => {
      if (data.valid_from && data.valid_to) {
        return new Date(data.valid_to) >= new Date(data.valid_from);
      }
      return true;
    },
    {
      message: "Data końca promocji musi być >= data początku",
      path: ["valid_to"],
    }
  );

/**
 * Schema dla generowania upload URL POST /api/v1/flyers/:flyer_id/pages/upload-url
 */
export const UploadUrlRequestSchema = z
  .object({
    page_number: z
      .number({ required_error: "Numer strony jest wymagany" })
      .int("Numer strony musi być liczbą całkowitą")
      .positive("Numer strony musi być > 0"),
    filename: z
      .string({ required_error: "Nazwa pliku jest wymagana" })
      .min(1, "Nazwa pliku nie może być pusta")
      .max(255, "Nazwa pliku nie może przekraczać 255 znaków")
      .regex(/^[a-zA-Z0-9_.-]+$/, "Nazwa pliku może zawierać tylko litery, cyfry, _, -, ."),
    content_type: z.enum(["image/jpeg", "image/png", "image/webp"], {
      errorMap: () => ({ message: "Dozwolone typy: image/jpeg, image/png, image/webp" }),
    }),
    width: z.number().int().positive("Szerokość musi być > 0").optional(),
    height: z.number().int().positive("Wysokość musi być > 0").optional(),
  })
  .refine(
    (data) => {
      // Jeśli podano width, to height musi być również podane (i vice versa)
      if ((data.width && !data.height) || (!data.width && data.height)) {
        return false;
      }
      return true;
    },
    {
      message: "Jeśli podano width lub height, oba pola muszą być wypełnione",
      path: ["width"],
    }
  );

/**
 * Schema dla parametrów zapytania GET /api/v1/products
 */
export const ListProductsQuerySchema = z
  .object({
    store_id: z.string().uuid("ID sklepu musi być poprawnym UUID").optional(),
    category_id: z.string().uuid("ID kategorii musi być poprawnym UUID").optional(),
    q: z.string().max(100, "Zapytanie nie może być dłuższe niż 100 znaków").optional(),
    min_price: z.coerce.number().positive("Minimalna cena musi być > 0").optional(),
    max_price: z.coerce.number().positive("Maksymalna cena musi być > 0").optional(),
    sort: z
      .enum(["price_asc", "price_desc", "created_at_desc"], {
        errorMap: () => ({ message: "Dozwolone wartości: price_asc, price_desc, created_at_desc" }),
      })
      .default("created_at_desc"),
    page: z.coerce.number().int().min(1, "Numer strony musi być >=1").default(1),
    per_page: z.coerce
      .number()
      .int()
      .min(1, "Limit musi być >=1")
      .max(100, "Limit nie może przekraczać 100")
      .default(20),
    similarity_threshold: z.coerce.number().min(0).max(1, "Threshold musi być w zakresie 0-1").optional(),
  })
  .refine(
    (data) => {
      // Jeśli podano min_price i max_price, to max >= min
      if (data.min_price !== undefined && data.max_price !== undefined) {
        return data.max_price >= data.min_price;
      }
      return true;
    },
    {
      message: "Maksymalna cena musi być >= minimalnej ceny",
      path: ["max_price"],
    }
  );

/**
 * Schema dla tworzenia produktu POST /api/v1/pages/:page_id/products
 */
export const CreateProductSchema = z
  .object({
    category_id: z
      .string({ required_error: "ID kategorii jest wymagane" })
      .uuid("ID kategorii musi być poprawnym UUID"),
    name: z
      .string({ required_error: "Nazwa produktu jest wymagana" })
      .trim()
      .min(1, "Nazwa produktu nie może być pusta")
      .max(255, "Nazwa produktu nie może przekraczać 255 znaków"),
    price_promo: z.number({ required_error: "Cena promocyjna jest wymagana" }).positive("Cena promocyjna musi być > 0"),
    price_regular: z.number().positive("Cena regularna musi być > 0").nullable().optional(),
    description: z.string().max(1000, "Opis nie może przekraczać 1000 znaków").nullable().optional(),
    conditions: z.string().max(500, "Warunki nie mogą przekraczać 500 znaków").nullable().optional(),
    bounding_box: z
      .object({
        x: z.number().nonnegative("X musi być >= 0"),
        y: z.number().nonnegative("Y musi być >= 0"),
        width: z.number().positive("Szerokość musi być > 0"),
        height: z.number().positive("Wysokość musi być > 0"),
      })
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // Jeśli price_regular jest podane (i nie null), musi być >= price_promo
      if (data.price_regular !== undefined && data.price_regular !== null) {
        return data.price_regular >= data.price_promo;
      }
      return true;
    },
    {
      message: "Cena regularna musi być >= ceny promocyjnej",
      path: ["price_regular"],
    }
  );

/**
 * Schema dla aktualizacji produktu PATCH /api/v1/products/:id
 */
export const UpdateProductSchema = z
  .object({
    category_id: z.string().uuid("ID kategorii musi być poprawnym UUID").optional(),
    name: z
      .string()
      .trim()
      .min(1, "Nazwa produktu nie może być pusta")
      .max(255, "Nazwa produktu nie może przekraczać 255 znaków")
      .optional(),
    price_promo: z.number().positive("Cena promocyjna musi być > 0").optional(),
    price_regular: z.number().positive("Cena regularna musi być > 0").nullable().optional(),
    description: z.string().max(1000, "Opis nie może przekraczać 1000 znaków").nullable().optional(),
    conditions: z.string().max(500, "Warunki nie mogą przekraczać 500 znaków").nullable().optional(),
    bounding_box: z
      .object({
        x: z.number().nonnegative("X musi być >= 0"),
        y: z.number().nonnegative("Y musi być >= 0"),
        width: z.number().positive("Szerokość musi być > 0"),
        height: z.number().positive("Wysokość musi być > 0"),
      })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Co najmniej jedno pole musi być podane",
  })
  .refine(
    (data) => {
      // Jeśli oba pola są podane, price_regular >= price_promo
      if (data.price_promo !== undefined && data.price_regular !== undefined && data.price_regular !== null) {
        return data.price_regular >= data.price_promo;
      }
      return true;
    },
    {
      message: "Cena regularna musi być >= ceny promocyjnej",
      path: ["price_regular"],
    }
  );

/**
 * Schema dla parametrów zapytania GET /api/v1/search/products
 * Dedykowany endpoint do wyszukiwania produktów z obsługą FTS + trigram
 */
export const SearchProductsQuerySchema = z.object({
  q: z
    .string({ required_error: "Zapytanie wyszukiwania jest wymagane" })
    .trim()
    .min(1, "Zapytanie wyszukiwania nie może być puste")
    .max(100, "Zapytanie nie może przekraczać 100 znaków"),
  store_id: z.string().uuid("ID sklepu musi być poprawnym UUID").optional(),
  category_id: z.string().uuid("ID kategorii musi być poprawnym UUID").optional(),
  similarity_threshold: z.coerce
    .number()
    .min(0, "Próg podobieństwa musi być >= 0")
    .max(1, "Próg podobieństwa musi być <= 1")
    .default(0.3)
    .optional(),
  page: z.coerce.number().int().min(1, "Numer strony musi być >=1").default(1),
  per_page: z.coerce.number().int().min(1, "Limit musi być >=1").max(100, "Limit nie może przekraczać 100").default(20),
});

export type UuidParam = z.infer<typeof UuidParamSchema>;
export type PageIdParam = z.infer<typeof PageIdParamSchema>;
export type GetStoreQuery = z.infer<typeof GetStoresQuerySchema>;
export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;
export type GetCategoriesQuery = z.infer<typeof GetCategoriesQuerySchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type GetFlyersQuery = z.infer<typeof GetFlyersQuerySchema>;
export type CreateFlyerInput = z.infer<typeof CreateFlyerSchema>;
export type UpdateFlyerInput = z.infer<typeof UpdateFlyerSchema>;
export type UploadUrlRequestInput = z.infer<typeof UploadUrlRequestSchema>;
export type ListProductsQuery = z.infer<typeof ListProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type SearchProductsQuery = z.infer<typeof SearchProductsQuerySchema>;
