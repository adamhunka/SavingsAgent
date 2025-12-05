/**
 * src/lib/schemas/auth.ts
 * Schematy walidacji Zod dla uwierzytelniania
 */

import { z } from "zod";

/**
 * LoginSchema
 * Schemat walidacji dla formularza logowania
 */
export const LoginSchema = z.object({
  email: z.string().min(1, { message: "Email jest wymagany" }).email({ message: "Nieprawidłowy adres email" }),
  password: z.string().min(1, { message: "Hasło jest wymagane" }),
});

/**
 * LoginFormData
 * Typ danych formularza logowania wywnioskowany ze schematu
 */
export type LoginFormData = z.infer<typeof LoginSchema>;

