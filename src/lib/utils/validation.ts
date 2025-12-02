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

export type GetStoreQuery = z.infer<typeof GetStoresQuerySchema>;
export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;
export type GetCategoriesQuery = z.infer<typeof GetCategoriesQuerySchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
