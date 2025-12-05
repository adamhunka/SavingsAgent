/**
 * src/pages/api/auth/logout.ts
 * Endpoint do wylogowania użytkownika
 */

import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ locals, redirect }) => {
  const supabase = locals.supabase;

  // Wylogowanie użytkownika
  await supabase.auth.signOut();

  // Przekierowanie do strony logowania
  return redirect("/login", 302);
};
