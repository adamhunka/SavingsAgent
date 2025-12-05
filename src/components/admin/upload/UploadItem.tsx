/**
 * src/components/admin/upload/UploadItem.tsx
 * Pojedynczy element w kolejce uploadu.
 * Wyświetla podgląd pliku, informacje, progress bar oraz akcje.
 */

import { Button } from "@/components/ui/button";
import type { UploadQueueItem } from "@/types";
import {
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCw,
  Trash2,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadItemProps {
  item: UploadQueueItem;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

/**
 * Formatowanie rozmiaru pliku
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Mapowanie statusu na ikonę i kolor
 */
function getStatusIcon(status: UploadQueueItem["status"]) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    case "error":
      return <XCircle className="h-5 w-5 text-red-600" />;
    case "cancelled":
      return <Ban className="h-5 w-5 text-gray-500" />;
    case "validating":
    case "compressing":
    case "signing":
    case "uploading":
    case "registering":
      return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
    default:
      return <ImageIcon className="h-5 w-5 text-gray-400" />;
  }
}

/**
 * Mapowanie statusu na tekstowy opis
 */
function getStatusText(status: UploadQueueItem["status"]): string {
  switch (status) {
    case "pending":
      return "Oczekuje";
    case "validating":
      return "Walidacja...";
    case "compressing":
      return "Kompresja...";
    case "signing":
      return "Pobieranie URL...";
    case "uploading":
      return "Wysyłanie...";
    case "registering":
      return "Rejestracja...";
    case "success":
      return "Zakończono";
    case "error":
      return "Błąd";
    case "cancelled":
      return "Anulowano";
    default:
      return status;
  }
}

/**
 * Progress Bar komponent
 */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={cn(
          "h-full transition-all duration-300 rounded-full",
          progress === 100 ? "bg-green-600" : "bg-blue-600"
        )}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

/**
 * UploadItem
 * Pojedynczy element kolejki uploadu
 */
export function UploadItem({ item, onRemove, onRetry }: UploadItemProps) {
  const canRetry = item.status === "error";
  const canRemove = !["uploading", "compressing", "signing", "registering"].includes(item.status);
  const isProcessing = [
    "validating",
    "compressing",
    "signing",
    "uploading",
    "registering",
  ].includes(item.status);

  return (
    <div
      className={cn(
        "flex gap-4 p-4 border rounded-lg bg-card",
        item.status === "error" && "border-red-200 bg-red-50/50",
        item.status === "success" && "border-green-200 bg-green-50/50"
      )}
    >
      {/* Preview obrazu */}
      <div className="flex-shrink-0">
        {item.preview ? (
          <img
            src={item.preview}
            alt={item.file.name}
            className="w-20 h-20 object-cover rounded border"
          />
        ) : (
          <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Informacje o pliku */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Nagłówek z nazwą pliku i statusem */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" title={item.file.name}>
              {item.file.name}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatFileSize(item.file.size)}</span>
              <span>•</span>
              <span>
                {item.dimensions.width} × {item.dimensions.height}px
              </span>
              <span>•</span>
              <span>Strona {item.pageNumber}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon(item.status)}
          </div>
        </div>

        {/* Status tekstowy */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{getStatusText(item.status)}</span>
          {isProcessing && (
            <span className="text-xs text-muted-foreground">({item.progress}%)</span>
          )}
        </div>

        {/* Progress bar */}
        {(isProcessing || item.status === "success") && (
          <ProgressBar progress={item.progress} />
        )}

        {/* Komunikat błędu */}
        {item.status === "error" && item.error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
            {item.error.message}
          </div>
        )}

        {/* Akcje */}
        <div className="flex items-center gap-2">
          {canRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRetry(item.id)}
              disabled={!item.error?.retryable}
            >
              <RotateCw className="h-3.5 w-3.5" />
              Ponów
            </Button>
          )}
          {canRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Usuń
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

