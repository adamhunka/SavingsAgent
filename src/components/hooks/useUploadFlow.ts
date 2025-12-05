/**
 * src/components/hooks/useUploadFlow.ts
 * Główny hook zarządzający stanem procesu uploadu stron gazetki.
 * Orchestruje kompresję, upload do storage i rejestrację w bazie.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import type {
  UploadFlowState,
  UploadQueueItem,
  FileWithMetadata,
  UploadError,
  GlobalError,
  UploadStatus,
} from "@/types";
import { compressionService } from "@/lib/services/compression.service";
import { UploadService } from "@/lib/services/upload.service";
import { supabaseBrowser } from "@/db/supabase.browser";

/**
 * Props dla hooka useUploadFlow
 */
interface UseUploadFlowProps {
  flyerId: string;
  flyerSlug: string;
  initialPageNumber: number;
}

/**
 * Wartość zwracana przez hook useUploadFlow
 */
interface UseUploadFlowReturn {
  // Stan
  state: UploadFlowState;

  // Akcje na plikach
  addFiles: (files: FileWithMetadata[]) => void;
  removeFile: (id: string) => void;
  retryFile: (id: string) => Promise<void>;

  // Akcje bulk
  startUpload: () => Promise<void>;
  cancelAll: () => void;
  retryAllFailed: () => Promise<void>;
  removeAllFailed: () => void;
  clearCompleted: () => void;

  // Konfiguracja
  setAutoProcess: (value: boolean) => void;

  // Błędy globalne
  dismissGlobalError: (errorId: string) => void;

  // Utility
  canStartUpload: boolean;
}

// Stałe konfiguracyjne
const MAX_FILES_IN_QUEUE = 50;
const MAX_CONCURRENT_UPLOADS = 3;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MIN_IMAGE_DIMENSION = 200;
const MAX_IMAGE_DIMENSION = 10000;

/**
 * Custom hook useUploadFlow
 * Zarządza całym procesem uploadu stron gazetki
 */
export function useUploadFlow({
  flyerId,
  flyerSlug,
  initialPageNumber,
}: UseUploadFlowProps): UseUploadFlowReturn {
  // Inicjalizacja serwisu uploadu
  const uploadService = useMemo(() => new UploadService(supabaseBrowser), []);

  // Stan główny
  const [state, setState] = useState<UploadFlowState>({
    queue: [],
    stats: {
      total: 0,
      pending: 0,
      processing: 0,
      success: 0,
      error: 0,
      cancelled: 0,
    },
    isUploading: false,
    autoProcess: false,
    globalErrors: [],
    flyerId,
    flyerSlug,
    nextPageNumber: initialPageNumber,
  });

  // Obliczanie statystyk (memoized)
  const stats = useMemo(() => {
    const queue = state.queue;
    return {
      total: queue.length,
      pending: queue.filter((item) => item.status === "pending").length,
      processing: queue.filter((item) =>
        ["validating", "compressing", "signing", "uploading", "registering"].includes(item.status)
      ).length,
      success: queue.filter((item) => item.status === "success").length,
      error: queue.filter((item) => item.status === "error").length,
      cancelled: queue.filter((item) => item.status === "cancelled").length,
    };
  }, [state.queue]);

  // Warunek możliwości rozpoczęcia uploadu
  const canStartUpload = useMemo(() => {
    return (
      state.queue.length > 0 &&
      !state.isUploading &&
      (stats.pending > 0 || stats.error > 0)
    );
  }, [state.queue.length, state.isUploading, stats.pending, stats.error]);

  // Zapobieganie nawigacji podczas uploadu
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isUploading) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.isUploading]);

  /**
   * Walidacja pliku przed dodaniem do kolejki
   */
  const validateFile = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    // Sprawdzenie typu MIME
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Nieprawidłowy format. Akceptowane: JPG, PNG, WEBP`,
      };
    }

    // Sprawdzenie rozmiaru
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      return {
        valid: false,
        error: `Plik zbyt duży (${sizeMB}MB). Maksymalny rozmiar: 50MB`,
      };
    }

    // Sprawdzenie wymiarów
    try {
      const dimensions = await compressionService.getImageDimensions(file);
      if (
        dimensions.width < MIN_IMAGE_DIMENSION ||
        dimensions.height < MIN_IMAGE_DIMENSION
      ) {
        return {
          valid: false,
          error: `Obraz zbyt mały. Minimalne wymiary: ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION}px`,
        };
      }
      if (
        dimensions.width > MAX_IMAGE_DIMENSION ||
        dimensions.height > MAX_IMAGE_DIMENSION
      ) {
        return {
          valid: false,
          error: `Obraz zbyt duży. Maksymalne wymiary: ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}px`,
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: "Nie udało się odczytać wymiarów obrazu",
      };
    }

    return { valid: true };
  };

  /**
   * Dodanie plików do kolejki
   */
  const addFiles = useCallback(
    async (files: FileWithMetadata[]) => {
      // Sprawdzenie limitu plików
      if (state.queue.length + files.length > MAX_FILES_IN_QUEUE) {
        const globalError: GlobalError = {
          id: crypto.randomUUID(),
          code: "TOO_MANY_FILES",
          message: `Można dodać maksymalnie ${MAX_FILES_IN_QUEUE} plików jednocześnie`,
          severity: "error",
          dismissible: true,
        };
        setState((prev) => ({
          ...prev,
          globalErrors: [...prev.globalErrors, globalError],
        }));
        return;
      }

      const validFiles: UploadQueueItem[] = [];
      const rejectedFiles: Array<{ file: File; reason: string }> = [];

      for (const fileWithMeta of files) {
        // Sprawdzenie duplikatów
        const isDuplicate = state.queue.some(
          (item) =>
            item.file.name === fileWithMeta.file.name &&
            item.file.size === fileWithMeta.file.size
        );

        if (isDuplicate) {
          rejectedFiles.push({
            file: fileWithMeta.file,
            reason: "Plik już dodany do kolejki",
          });
          continue;
        }

        // Walidacja pliku
        const validation = await validateFile(fileWithMeta.file);
        if (!validation.valid) {
          rejectedFiles.push({
            file: fileWithMeta.file,
            reason: validation.error || "Nieprawidłowy plik",
          });
          continue;
        }

        // Odczytanie wymiarów (już zwalidowane)
        const dimensions = fileWithMeta.dimensions || 
          (await compressionService.getImageDimensions(fileWithMeta.file));

        // Generowanie preview
        const preview = fileWithMeta.preview ||
          (await compressionService.generatePreview(fileWithMeta.file));

        // Utworzenie elementu kolejki
        const queueItem: UploadQueueItem = {
          id: fileWithMeta.id,
          file: fileWithMeta.file,
          preview,
          pageNumber: state.nextPageNumber + validFiles.length,
          status: "pending",
          progress: 0,
          dimensions,
          addedAt: new Date(),
        };

        validFiles.push(queueItem);
      }

      // Aktualizacja stanu
      setState((prev) => ({
        ...prev,
        queue: [...prev.queue, ...validFiles],
        nextPageNumber: prev.nextPageNumber + validFiles.length,
      }));

      // Informacja o odrzuconych plikach
      if (rejectedFiles.length > 0) {
        const globalError: GlobalError = {
          id: crypto.randomUUID(),
          code: "FILES_REJECTED",
          message: `Odrzucono ${rejectedFiles.length} plików`,
          severity: "warning",
          dismissible: true,
        };
        setState((prev) => ({
          ...prev,
          globalErrors: [...prev.globalErrors, globalError],
        }));
      }
    },
    [state.queue, state.nextPageNumber]
  );

  /**
   * Usunięcie pliku z kolejki
   */
  const removeFile = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      queue: prev.queue.filter((item) => item.id !== id),
    }));
  }, []);

  /**
   * Aktualizacja statusu i postępu pliku
   */
  const updateFileStatus = useCallback(
    (
      id: string,
      updates: Partial<Pick<UploadQueueItem, "status" | "progress" | "error" | "uploadUrl" | "publicPath" | "pageId" | "compressedFile" | "startedAt" | "completedAt">>
    ) => {
      setState((prev) => ({
        ...prev,
        queue: prev.queue.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));
    },
    []
  );

  /**
   * Upload pojedynczego pliku (cały flow)
   */
  const uploadSingleFile = async (item: UploadQueueItem): Promise<void> => {
    try {
      // 1. Walidacja
      updateFileStatus(item.id, { status: "validating", progress: 5 });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 2. Kompresja
      updateFileStatus(item.id, { status: "compressing", progress: 10 });
      const compressionResult = await compressionService.compressImage(item.file);
      updateFileStatus(item.id, {
        compressedFile: compressionResult.file,
        progress: 30,
      });

      // 3. Pobranie signed URL
      updateFileStatus(item.id, { status: "signing", progress: 35 });
      const signedUrlResponse = await uploadService.getSignedUploadUrl({
        flyer_id: flyerId,
        flyer_slug: flyerSlug,
        page_number: item.pageNumber,
        filename: item.file.name,
        content_type: item.file.type,
        width: compressionResult.dimensions.width,
        height: compressionResult.dimensions.height,
      });

      updateFileStatus(item.id, {
        uploadUrl: signedUrlResponse.upload_url,
        publicPath: signedUrlResponse.public_path,
        progress: 40,
      });

      // 4. Upload do storage
      updateFileStatus(item.id, { status: "uploading", progress: 45 });
      await uploadService.uploadToStorage(
        compressionResult.file,
        signedUrlResponse.upload_url,
        item.file.type,
        (progress) => {
          // Progress: 45-80%
          const uploadProgress = 45 + (progress * 35) / 100;
          updateFileStatus(item.id, { progress: uploadProgress });
        }
      );

      updateFileStatus(item.id, { progress: 80 });

      // 5. Rejestracja w bazie
      updateFileStatus(item.id, { status: "registering", progress: 85 });
      const page = await uploadService.registerPageWithAutoIncrement({
        flyer_id: flyerId,
        page_number: item.pageNumber,
        image_path: signedUrlResponse.public_path,
        image_width: compressionResult.dimensions.width,
        image_height: compressionResult.dimensions.height,
      });

      updateFileStatus(item.id, {
        pageId: page.id,
        progress: 95,
      });

      // 6. Opcjonalnie: uruchomienie przetwarzania AI
      if (state.autoProcess) {
        try {
          await uploadService.startProcessing(page.id, {});
        } catch (error) {
          // Błąd przetwarzania nie blokuje sukcesu uploadu
          console.error("Failed to start processing:", error);
        }
      }

      // 7. Sukces
      updateFileStatus(item.id, {
        status: "success",
        progress: 100,
        completedAt: new Date(),
      });
    } catch (error) {
      // Obsługa błędów
      const uploadError: UploadError = {
        code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        message: error instanceof Error ? error.message : "Nieznany błąd",
        retryable: true,
      };

      updateFileStatus(item.id, {
        status: "error",
        error: uploadError,
        completedAt: new Date(),
      });
    }
  };

  /**
   * Rozpoczęcie uploadu wszystkich plików w kolejce
   */
  const startUpload = useCallback(async () => {
    if (!canStartUpload) return;

    setState((prev) => ({
      ...prev,
      isUploading: true,
    }));

    // Filtrowanie plików do uploadu (pending i error)
    const filesToUpload = state.queue.filter(
      (item) => item.status === "pending" || item.status === "error"
    );

    // Oznaczenie czasu rozpoczęcia
    filesToUpload.forEach((item) => {
      updateFileStatus(item.id, { startedAt: new Date() });
    });

    // Upload równoległy z limitem concurrent
    const uploadPromises: Promise<void>[] = [];
    let activeUploads = 0;
    let currentIndex = 0;

    const uploadNext = async (): Promise<void> => {
      if (currentIndex >= filesToUpload.length) return;

      const item = filesToUpload[currentIndex];
      currentIndex++;
      activeUploads++;

      await uploadSingleFile(item);
      activeUploads--;

      // Uruchomienie następnego uploadu
      if (currentIndex < filesToUpload.length) {
        await uploadNext();
      }
    };

    // Uruchomienie MAX_CONCURRENT_UPLOADS równolegle
    for (let i = 0; i < Math.min(MAX_CONCURRENT_UPLOADS, filesToUpload.length); i++) {
      uploadPromises.push(uploadNext());
    }

    await Promise.all(uploadPromises);

    setState((prev) => ({
      ...prev,
      isUploading: false,
    }));
  }, [canStartUpload, state.queue, state.autoProcess, flyerId, flyerSlug, updateFileStatus]);

  /**
   * Anulowanie wszystkich uploadów
   */
  const cancelAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      queue: prev.queue.map((item) =>
        ["pending", "validating", "compressing", "signing", "uploading", "registering"].includes(
          item.status
        )
          ? { ...item, status: "cancelled" as UploadStatus }
          : item
      ),
      isUploading: false,
    }));
  }, []);

  /**
   * Ponowienie uploadu pojedynczego pliku
   */
  const retryFile = useCallback(
    async (id: string) => {
      const item = state.queue.find((item) => item.id === id);
      if (!item || item.status !== "error") return;

      updateFileStatus(id, {
        status: "pending",
        progress: 0,
        error: undefined,
        startedAt: undefined,
        completedAt: undefined,
      });

      // Uruchomienie uploadu jeśli nie trwa już inny
      if (!state.isUploading) {
        setState((prev) => ({ ...prev, isUploading: true }));
        await uploadSingleFile(item);
        setState((prev) => ({ ...prev, isUploading: false }));
      }
    },
    [state.queue, state.isUploading, updateFileStatus]
  );

  /**
   * Ponowienie wszystkich nieudanych uploadów
   */
  const retryAllFailed = useCallback(async () => {
    const failedItems = state.queue.filter((item) => item.status === "error");
    failedItems.forEach((item) => {
      updateFileStatus(item.id, {
        status: "pending",
        progress: 0,
        error: undefined,
        startedAt: undefined,
        completedAt: undefined,
      });
    });

    if (failedItems.length > 0 && !state.isUploading) {
      await startUpload();
    }
  }, [state.queue, state.isUploading, updateFileStatus, startUpload]);

  /**
   * Usunięcie wszystkich nieudanych uploadów
   */
  const removeAllFailed = useCallback(() => {
    setState((prev) => ({
      ...prev,
      queue: prev.queue.filter((item) => item.status !== "error"),
    }));
  }, []);

  /**
   * Wyczyszczenie zakończonych pomyślnie uploadów
   */
  const clearCompleted = useCallback(() => {
    setState((prev) => ({
      ...prev,
      queue: prev.queue.filter((item) => item.status !== "success"),
    }));
  }, []);

  /**
   * Ustawienie opcji automatycznego przetwarzania
   */
  const setAutoProcess = useCallback((value: boolean) => {
    setState((prev) => ({
      ...prev,
      autoProcess: value,
    }));
  }, []);

  /**
   * Odrzucenie błędu globalnego
   */
  const dismissGlobalError = useCallback((errorId: string) => {
    setState((prev) => ({
      ...prev,
      globalErrors: prev.globalErrors.filter((error) => error.id !== errorId),
    }));
  }, []);

  // Aktualizacja stats w state
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      stats,
    }));
  }, [stats]);

  return {
    state,
    addFiles,
    removeFile,
    retryFile,
    startUpload,
    cancelAll,
    retryAllFailed,
    removeAllFailed,
    clearCompleted,
    setAutoProcess,
    dismissGlobalError,
    canStartUpload,
  };
}

