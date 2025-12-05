/**
 * src/lib/services/upload.service.ts
 * Serwis odpowiedzialny za komunikację z API w procesie uploadu stron gazetki.
 * Używany po stronie klienta (browser) do orchestracji procesu uploadu.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  UploadUrlRequestCommand,
  UploadUrlResponse,
  CreatePageCommand,
  PageDTO,
  CreateJobCommand,
  JobDTO,
  ApiResponse,
  ApiError,
} from "@/types";

/**
 * Custom error dla procesu uploadu
 */
export class UploadServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "UploadServiceError";
  }
}

/**
 * UploadService
 * Serwis do orkiestracji procesu uploadu stron gazetki.
 * Używany po stronie klienta (browser).
 */
export class UploadService {
  constructor(private supabaseClient: SupabaseClient) {}

  /**
   * Pobranie signed URL do uploadu pliku
   * Wywołuje: POST /api/v1/uploads/sign
   * @param request - Dane requestu uploadu
   * @returns Promise z signed URL response
   * @throws UploadServiceError w przypadku błędu API
   */
  async getSignedUploadUrl(request: UploadUrlRequestCommand): Promise<UploadUrlResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch("/api/v1/uploads/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new UploadServiceError(
          error.error.message,
          error.error.code,
          response.status,
          error.error.details
        );
      }

      const data: ApiResponse<UploadUrlResponse> = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof UploadServiceError) {
        throw error;
      }
      throw new UploadServiceError(
        "Nie udało się pobrać signed URL",
        "NETWORK_ERROR",
        undefined,
        undefined
      );
    }
  }

  /**
   * Upload pliku do storage używając signed URL
   * @param file - Plik do uploadu
   * @param uploadUrl - Signed URL z API
   * @param contentType - Typ MIME pliku
   * @param onProgress - Callback dla postępu uploadu (0-100)
   * @returns Promise void
   * @throws UploadServiceError w przypadku błędu uploadu
   */
  async uploadToStorage(
    file: File,
    uploadUrl: string,
    contentType: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      // Success
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(
            new UploadServiceError(
              `Upload failed: ${xhr.statusText}`,
              "UPLOAD_ERROR",
              xhr.status
            )
          );
        }
      });

      // Network error
      xhr.addEventListener("error", () => {
        reject(new UploadServiceError("Network error during upload", "NETWORK_ERROR"));
      });

      // Timeout
      xhr.addEventListener("timeout", () => {
        reject(new UploadServiceError("Upload timeout", "TIMEOUT_ERROR"));
      });

      // Configure and send
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.timeout = 300000; // 5 minutes
      xhr.send(file);
    });
  }

  /**
   * Rejestracja strony w bazie po uploadzie
   * Wywołuje: POST /api/v1/pages
   * @param command - Dane strony do utworzenia
   * @returns Promise z utworzoną stroną
   * @throws UploadServiceError w przypadku błędu API
   */
  async registerPage(command: CreatePageCommand): Promise<PageDTO> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch("/api/v1/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new UploadServiceError(
          error.error.message,
          error.error.code,
          response.status,
          error.error.details
        );
      }

      const data: ApiResponse<PageDTO> = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof UploadServiceError) {
        throw error;
      }
      throw new UploadServiceError(
        "Nie udało się zarejestrować strony",
        "NETWORK_ERROR",
        undefined,
        undefined
      );
    }
  }

  /**
   * Uruchomienie przetwarzania AI dla strony
   * Wywołuje: POST /api/v1/jobs/pages/:page_id/process
   * @param pageId - UUID strony
   * @param command - Opcje przetwarzania (model_hint, cost_limit_cents, force)
   * @returns Promise z utworzonym zadaniem
   * @throws UploadServiceError w przypadku błędu API
   */
  async startProcessing(
    pageId: string,
    command: Omit<CreateJobCommand, "page_id" | "requested_by">
  ): Promise<JobDTO> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(`/api/v1/jobs/pages/${pageId}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new UploadServiceError(
          error.error.message,
          error.error.code,
          response.status,
          error.error.details
        );
      }

      const data: ApiResponse<JobDTO> = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof UploadServiceError) {
        throw error;
      }
      throw new UploadServiceError(
        "Nie udało się uruchomić przetwarzania",
        "NETWORK_ERROR",
        undefined,
        undefined
      );
    }
  }

  /**
   * Pobranie następnego wolnego numeru strony dla gazetki
   * @param flyerId - UUID gazetki
   * @returns Promise z numerem strony
   * @throws UploadServiceError w przypadku błędu
   */
  async getNextPageNumber(flyerId: string): Promise<number> {
    try {
      const { data, error } = await this.supabaseClient
        .from("pages")
        .select("page_number")
        .eq("flyer_id", flyerId)
        .order("page_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new UploadServiceError(
          "Nie udało się pobrać numeru strony",
          "DATABASE_ERROR"
        );
      }

      return (data?.page_number ?? 0) + 1;
    } catch (error) {
      if (error instanceof UploadServiceError) {
        throw error;
      }
      throw new UploadServiceError(
        "Nie udało się pobrać numeru strony",
        "NETWORK_ERROR"
      );
    }
  }

  /**
   * Rejestracja strony z automatyczną inkrementacją page_number w przypadku duplikatu
   * @param command - Dane strony do utworzenia
   * @returns Promise z utworzoną stroną
   * @throws UploadServiceError w przypadku błędu API
   */
  async registerPageWithAutoIncrement(command: CreatePageCommand): Promise<PageDTO> {
    try {
      return await this.registerPage(command);
    } catch (error) {
      // Jeśli błąd 409 (conflict) - duplikat page_number
      if (error instanceof UploadServiceError && error.statusCode === 409) {
        // Pobierz kolejny numer i spróbuj ponownie
        const nextNumber = await this.getNextPageNumber(command.flyer_id);
        return await this.registerPage({
          ...command,
          page_number: nextNumber,
        });
      }
      throw error;
    }
  }

  /**
   * Pobranie access token z aktywnej sesji Supabase
   * @returns Promise z access tokenem
   * @throws UploadServiceError jeśli brak aktywnej sesji
   */
  private async getAccessToken(): Promise<string> {
    const {
      data: { session },
    } = await this.supabaseClient.auth.getSession();

    if (!session) {
      throw new UploadServiceError(
        "Brak aktywnej sesji. Zaloguj się ponownie.",
        "UNAUTHORIZED",
        401
      );
    }

    return session.access_token;
  }
}

