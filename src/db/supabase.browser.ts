/**
 * src/db/supabase.browser.ts
 * Supabase client dla przeglądarki (używany w React components)
 * Używa zmiennych środowiskowych z prefixem PUBLIC_
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// W Astro, zmienne środowiskowe dostępne w przeglądarce muszą mieć prefix PUBLIC_
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Make sure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are set."
  );
}

export const supabaseBrowser = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
