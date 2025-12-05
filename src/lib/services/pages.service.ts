import type { supabaseClient } from "@/db/supabase.client";
import type { UploadUrlRequestCommand, UploadUrlResponse } from "@/types";
import { InternalServerError, NotFoundError } from "@/lib/utils/errors";

/**
 * Wynik wewnętrzny generowania upload URL
 */
interface GenerateUploadUrlResult {
  uploadUrl: string;
  publicPath: string;
  expiresAt: string;
}

/**
 * Informacje o flyerze i sklepie potrzebne do generowania URL
 */
interface FlyerStoreInfo {
  flyer_id: string;
  store_id: string;
  store_name: string;
}

export class PageService {
  // Whitelist dozwolonych typów MIME dla obrazów stron
  private static readonly ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
  // Czas wygaśnięcia signed URL (w sekundach) - 1 godzina
  private static readonly SIGNED_URL_EXPIRES_IN = 3600;
  // Bucket name w Supabase Storage
  private static readonly STORAGE_BUCKET = "flyer-pages";

  constructor(private supabase: typeof supabaseClient) {}

  /**
   * Generuje pre-signed upload URL dla strony gazetki
   * @param flyerId - ID gazetki
   * @param command - Dane requestu (page_number, filename, content_type, width?, height?)
   * @returns Promise<UploadUrlResponse> - upload_url, public_path, expires_at
   * @throws NotFoundError jeśli gazetka nie istnieje
   * @throws InternalServerError w przypadku błędu storage/DB
   */
  async generateUploadUrl(flyerId: string, command: UploadUrlRequestCommand): Promise<UploadUrlResponse> {
    // 1. Sprawdzenie czy gazetka istnieje i pobranie store info
    const flyerInfo = await this.ensureFlyerExists(flyerId);

    // 2. Sprawdzenie content_type (whitelist)
    if (!PageService.ALLOWED_CONTENT_TYPES.includes(command.content_type)) {
      throw new InternalServerError(
        `Niedozwolony typ pliku. Dozwolone: ${PageService.ALLOWED_CONTENT_TYPES.join(", ")}`
      );
    }

    // 3. Walidacja filename (bez ścieżek, tylko bezpieczne znaki)
    this.validateFilename(command.filename);

    // 4. Ekstrakcja rozszerzenia z filename
    const fileExtension = this.extractFileExtension(command.filename);

    // 5. Budowa public_path zgodnie z konwencją:
    // {store_slug}/{flyer_id}/page_{page_number}.{ext}
    const storeSlug = this.generateStoreSlug(flyerInfo.store_name);
    const publicPath = `${storeSlug}/${flyerId}/page_${command.page_number}.${fileExtension}`;

    // 6. Generowanie signed URL przez Supabase Storage
    const result = await this.createSignedUploadUrl(publicPath);

    return {
      upload_url: result.uploadUrl,
      public_path: publicPath,
      expires_at: result.expiresAt,
    };
  }

  /**
   * Sprawdza czy gazetka istnieje i pobiera informacje o sklepie
   * @param flyerId - ID gazetki
   * @returns Promise<FlyerStoreInfo>
   * @throws NotFoundError jeśli gazetka nie istnieje
   * @throws InternalServerError w przypadku błędu DB
   */
  private async ensureFlyerExists(flyerId: string): Promise<FlyerStoreInfo> {
    const { data, error } = await this.supabase
      .from("flyers")
      .select("id, store_id, stores!inner(name)")
      .eq("id", flyerId)
      .maybeSingle();

    if (error) {
      throw new InternalServerError("Nie udało się pobrać gazetki");
    }

    if (!data) {
      throw new NotFoundError(`Gazetka o ID "${flyerId}" nie została znaleziona`);
    }

    return {
      flyer_id: data.id,
      store_id: data.store_id,
      store_name: (data.stores as { name: string }).name,
    };
  }

  /**
   * Waliduje filename pod kątem bezpieczeństwa (brak ścieżek, tylko bezpieczne znaki)
   * @param filename - nazwa pliku
   * @throws InternalServerError jeśli filename jest niepoprawny
   */
  private validateFilename(filename: string): void {
    // Regex: tylko litery, cyfry, myślniki, podkreślniki i kropki
    const safeFilenameRegex = /^[a-zA-Z0-9_.-]+$/;

    if (!safeFilenameRegex.test(filename)) {
      throw new InternalServerError("Nazwa pliku zawiera niedozwolone znaki. Dozwolone: a-z, A-Z, 0-9, _, -, .");
    }

    // Zapobieganie path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      throw new InternalServerError("Nazwa pliku nie może zawierać ścieżek (/, \\, ..)");
    }
  }

  /**
   * Ekstraktuje rozszerzenie z filename
   * @param filename - nazwa pliku
   * @returns rozszerzenie (bez kropki)
   */
  private extractFileExtension(filename: string): string {
    const parts = filename.split(".");
    if (parts.length < 2) {
      return "jpg"; // domyślne rozszerzenie
    }
    return parts[parts.length - 1].toLowerCase();
  }

  /**
   * Generuje slug dla nazwy sklepu (lowercase, spacje -> myślniki, tylko bezpieczne znaki)
   * @param storeName - nazwa sklepu
   * @returns slug
   */
  private generateStoreSlug(storeName: string): string {
    return storeName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // spacje -> myślniki
      .replace(/[^a-z0-9-]/g, "") // tylko litery, cyfry, myślniki
      .replace(/-+/g, "-") // wielokrotne myślniki -> jeden
      .replace(/^-|-$/g, ""); // usunięcie myślników na początku/końcu
  }

  /**
   * Tworzy signed upload URL w Supabase Storage
   * @param publicPath - ścieżka w storage bucket
   * @returns Promise<GenerateUploadUrlResult>
   * @throws InternalServerError w przypadku błędu storage
   */
  private async createSignedUploadUrl(publicPath: string): Promise<GenerateUploadUrlResult> {
    try {
      // Supabase Storage: createSignedUploadUrl dla uploadu pliku
      const { data, error } = await this.supabase.storage
        .from(PageService.STORAGE_BUCKET)
        .createSignedUploadUrl(publicPath);

      if (error) {
        throw new InternalServerError("Nie udało się wygenerować URL do uploadu");
      }

      if (!data || !data.signedUrl) {
        throw new InternalServerError("Brak signed URL w odpowiedzi storage");
      }

      // Obliczenie czasu wygaśnięcia (teraz + SIGNED_URL_EXPIRES_IN sekund)
      const expiresAt = new Date(Date.now() + PageService.SIGNED_URL_EXPIRES_IN * 1000).toISOString();

      return {
        uploadUrl: data.signedUrl,
        publicPath: publicPath,
        expiresAt: expiresAt,
      };
    } catch (error) {
      if (error instanceof InternalServerError) {
        throw error;
      }
      throw new InternalServerError("Nie udało się wygenerować URL do uploadu");
    }
  }
}
