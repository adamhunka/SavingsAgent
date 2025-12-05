/**
 * src/components/admin/upload/UploadFlowContainer.tsx
 * Główny kontener React zarządzający stanem całego procesu uploadu.
 * Orkiestruje wszystkie komponenty i komunikację z API.
 */

import { useUploadFlow } from "@/components/hooks/useUploadFlow";
import type { FlyerDetailDTO } from "@/types";
import { FlyerInfoPanel } from "./FlyerInfoPanel";
import { ErrorBanner } from "./ErrorBanner";
import { UploadDropzone } from "./UploadDropzone";
import { UploadQueue } from "./UploadQueue";
import { UploadActions } from "./UploadActions";

interface UploadFlowContainerProps {
  flyerId: string;
  flyerSlug: string;
  flyerData: FlyerDetailDTO;
  initialPageNumber: number;
  autoProcess?: boolean;
}

/**
 * UploadFlowContainer
 * Główny kontener orchestrujący cały proces uploadu
 */
export function UploadFlowContainer({
  flyerId,
  flyerSlug,
  flyerData,
  initialPageNumber,
  autoProcess = false,
}: UploadFlowContainerProps) {
  // Hook zarządzający stanem uploadu
  const {
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
  } = useUploadFlow({
    flyerId,
    flyerSlug,
    initialPageNumber,
  });

  // Ustawienie początkowej wartości autoProcess
  if (autoProcess && !state.autoProcess) {
    setAutoProcess(true);
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Błędy globalne */}
      {state.globalErrors.length > 0 && (
        <ErrorBanner errors={state.globalErrors} onDismiss={dismissGlobalError} />
      )}

      {/* Layout dwukolumnowy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - informacje o gazetce */}
        <div className="lg:col-span-1 space-y-6">
          <FlyerInfoPanel flyer={flyerData} />
          
          {/* Akcje uploadu */}
          <UploadActions
            onStartUpload={startUpload}
            onCancelAll={cancelAll}
            canStartUpload={canStartUpload}
            isUploading={state.isUploading}
            autoProcess={state.autoProcess}
            onToggleAutoProcess={setAutoProcess}
            pendingCount={state.stats.pending + state.stats.error}
          />
        </div>

        {/* Main content - dropzone i kolejka */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dropzone */}
          {!state.isUploading && (
            <UploadDropzone
              onFilesAdded={addFiles}
              disabled={state.isUploading}
              maxFiles={50}
              currentFileCount={state.queue.length}
            />
          )}

          {/* Kolejka plików */}
          {state.queue.length > 0 && (
            <UploadQueue
              items={state.queue}
              onItemRemove={removeFile}
              onItemRetry={retryFile}
              onRetryAllFailed={retryAllFailed}
              onRemoveAllFailed={removeAllFailed}
              onClearCompleted={clearCompleted}
            />
          )}
        </div>
      </div>

      {/* Instrukcje dla pierwszego użycia */}
      {state.queue.length === 0 && !state.isUploading && (
        <div className="text-center py-12 text-muted-foreground">
          <h3 className="text-lg font-medium mb-2">Jak uploadować strony gazetki?</h3>
          <ol className="text-sm space-y-2 max-w-md mx-auto text-left">
            <li>1. Przeciągnij obrazy stron lub kliknij aby wybrać pliki</li>
            <li>2. Sprawdź listę plików w kolejce</li>
            <li>3. Opcjonalnie włącz automatyczne przetwarzanie AI</li>
            <li>4. Kliknij "Rozpocznij upload" aby wysłać pliki</li>
          </ol>
        </div>
      )}
    </div>
  );
}

