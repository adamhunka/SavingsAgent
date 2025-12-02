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

export type GetStoreQuery = z.infer<typeof GetStoresQuerySchema>;
export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;
