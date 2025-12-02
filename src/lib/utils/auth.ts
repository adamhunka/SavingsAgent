import type { supabaseClient } from "@/db/supabase.client";
import { ForbiddenError, UnAuthorizedError } from "@/lib/utils/errors";
import type { UserRole } from "@/types";

export interface AuthenticalUser {
  id: string;
  role: UserRole;
}

function extractToken(authHeader: string | null): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnAuthorizedError("Brak tokenu autoryzacji");
  }
  return authHeader.substring(7);
}

export async function requireAdmin(request: Request, supabase: typeof supabaseClient): Promise<AuthenticalUser> {
  const token = extractToken(request.headers.get("Authorization"));

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new UnAuthorizedError("Nieprawidłowy token autoryzacji");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    throw new UnAuthorizedError("Nie znaleziono profilu użytkownika");
  }

  if (profile.role !== "admin") {
    throw new ForbiddenError("Brak uprawnień do wykonywania tej akcji");
  }

  return {
    id: user.id,
    role: profile.role,
  };
}
