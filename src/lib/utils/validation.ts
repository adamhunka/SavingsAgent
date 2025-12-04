import { z } from "zod";

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

export type GetStoreQuery = z.infer<typeof GetStoresQuerySchema>;
export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;
export type GetCategoriesQuery = z.infer<typeof GetCategoriesQuerySchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type GetFlyersQuery = z.infer<typeof GetFlyersQuerySchema>;
export type CreateFlyerInput = z.infer<typeof CreateFlyerSchema>;
export type UpdateFlyerInput = z.infer<typeof UpdateFlyerSchema>;
