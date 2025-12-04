import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import { InternalServerError, ValidationError } from "@/lib/utils/errors";

/**
 * Parametry dla metody createSignedUploadUrl()
 */
interface CreateSignedUploadUrlParams {
  bucket: string;
  path: string;
  contentType: string;
  expiresInSeconds?: number;
}

/**
 * Wynik metody createSignedUploadUrl()
 */
interface CreateSignedUploadUrlResult {
  uploadUrl: string;
  expiresAt: string;
}

/**
 * StorageService
 * Serwis do zarządzania operacjami na Supabase Storage
 * UWAGA: Używa Service Role Key, więc może być używany tylko po stronie serwera
 */
export class StorageService {
  private serviceClient;

  constructor() {
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new InternalServerError("Brak konfiguracji Supabase (URL lub Service Role Key)");
    }

    // Używamy Service Role Key do operacji na storage (wymagane do signed URLs)
    this.serviceClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Sanityzuje nazwę pliku - usuwa niebezpieczne znaki i ścieżki
   * @param filename - Nazwa pliku do sanityzacji
   * @returns Sanityzowana nazwa pliku
   * @throws ValidationError jeśli filename zawiera niebezpieczne wzorce
   */
  sanitizeFilename(filename: string): string {
    // Sprawdź czy filename nie zawiera ścieżek (.. lub /)
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      throw new ValidationError("Nazwa pliku nie może zawierać ścieżek (.. / \\)");
    }

    // Usuń białe znaki z początku i końca
    const sanitized = filename.trim();

    // Sprawdź czy po sanityzacji coś zostało
    if (sanitized.length === 0) {
      throw new ValidationError("Nazwa pliku nie może być pusta");
    }

    // Sprawdź maksymalną długość
    if (sanitized.length > 255) {
      throw new ValidationError("Nazwa pliku nie może przekraczać 255 znaków");
    }

    return sanitized;
  }

  /**
   * Buduje public_path dla pliku w formacie: {bucket}/{flyer_slug}/{flyer_id}/page_{page_number}.{ext}
   * @param params - Parametry do budowy ścieżki
   * @returns Pełna ścieżka do pliku w storage
   */
  buildPublicPath(params: { flyerSlug: string; flyerId: string; pageNumber: number; filename: string }): string {
    const { flyerSlug, flyerId, pageNumber, filename } = params;

    // Wyciągnij rozszerzenie z filename
    const ext = filename.split(".").pop() || "jpg";

    // Format: {flyer_slug}/{flyer_id}/page_{page_number}.{ext}
    return `${flyerSlug}/${flyerId}/page_${pageNumber}.${ext}`;
  }

  /**
   * Tworzy signed upload URL do Supabase Storage
   * @param params - Parametry do utworzenia signed URL
   * @returns Obiekt z uploadUrl i expiresAt
   * @throws InternalServerError w przypadku błędu tworzenia signed URL
   */
  async createSignedUploadUrl(params: CreateSignedUploadUrlParams): Promise<CreateSignedUploadUrlResult> {
    const { bucket, path, expiresInSeconds = 900 } = params; // domyślnie 15 minut

    try {
      // Supabase Storage signed upload URL
      const { data, error } = await this.serviceClient.storage.from(bucket).createSignedUploadUrl(path, {
        upsert: false, // nie nadpisuj istniejącego pliku
      });

      if (error) {
        throw new InternalServerError(`Nie udało się utworzyć signed upload URL: ${error.message}`);
      }

      if (!data || !data.signedUrl) {
        throw new InternalServerError("Nie otrzymano signed URL z Supabase Storage");
      }

      // Oblicz expires_at (czas wygaśnięcia)
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

      return {
        uploadUrl: data.signedUrl,
        expiresAt,
      };
    } catch (error) {
      // Jeśli to już InternalServerError, przekaż dalej
      if (error instanceof InternalServerError) {
        throw error;
      }

      // Inny błąd - wrap w InternalServerError
      throw new InternalServerError("Nieoczekiwany błąd podczas tworzenia signed upload URL");
    }
  }

  /**
   * Sprawdza czy plik istnieje w storage
   * @param bucket - Nazwa bucketu
   * @param path - Ścieżka do pliku
   * @returns true jeśli plik istnieje, false w przeciwnym wypadku
   */
  async fileExists(bucket: string, path: string): Promise<boolean> {
    try {
      const { data, error } = await this.serviceClient.storage
        .from(bucket)
        .list(path.split("/").slice(0, -1).join("/"));

      if (error) {
        return false;
      }

      const filename = path.split("/").pop();
      return data?.some((file) => file.name === filename) || false;
    } catch {
      return false;
    }
  }
}
