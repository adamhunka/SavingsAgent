/**
 * src/components/admin/upload/UploadQueue.tsx
 * Komponent wyświetlający listę wszystkich plików w kolejce z nagłówkiem i statystykami.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UploadQueueItem } from "@/types";
import { UploadItem } from "./UploadItem";
import { FileStack, RotateCw, Trash2, CheckCircle2 } from "lucide-react";

interface UploadQueueProps {
  items: UploadQueueItem[];
  onItemRemove: (id: string) => void;
  onItemRetry: (id: string) => void;
  onRetryAllFailed: () => void;
  onRemoveAllFailed: () => void;
  onClearCompleted: () => void;
}

/**
 * UploadQueue
 * Lista plików w kolejce uploadu z nagłówkiem, statystykami i akcjami bulk
 */
export function UploadQueue({
  items,
  onItemRemove,
  onItemRetry,
  onRetryAllFailed,
  onRemoveAllFailed,
  onClearCompleted,
}: UploadQueueProps) {
  // Obliczenie statystyk
  const stats = {
    total: items.length,
    pending: items.filter((item) => item.status === "pending").length,
    processing: items.filter((item) =>
      ["validating", "compressing", "signing", "uploading", "registering"].includes(item.status)
    ).length,
    success: items.filter((item) => item.status === "success").length,
    error: items.filter((item) => item.status === "error").length,
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <FileStack className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Brak plików w kolejce</p>
            <p className="text-sm mt-1">
              Przeciągnij pliki lub kliknij przycisk wyboru aby dodać strony gazetki
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileStack className="h-5 w-5" />
            Kolejka uploadu ({stats.total})
          </CardTitle>
          
          {/* Akcje bulk */}
          <div className="flex items-center gap-2">
            {stats.success > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearCompleted}
              >
                <CheckCircle2 className="h-4 w-4" />
                Wyczyść zakończone
              </Button>
            )}
            {stats.error > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetryAllFailed}
                >
                  <RotateCw className="h-4 w-4" />
                  Ponów wszystkie
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemoveAllFailed}
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń błędne
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Statystyki */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {stats.pending > 0 && (
            <span>
              <span className="font-medium text-foreground">{stats.pending}</span> oczekuje
            </span>
          )}
          {stats.processing > 0 && (
            <span>
              <span className="font-medium text-blue-600">{stats.processing}</span> w trakcie
            </span>
          )}
          {stats.success > 0 && (
            <span>
              <span className="font-medium text-green-600">{stats.success}</span> zakończone
            </span>
          )}
          {stats.error > 0 && (
            <span>
              <span className="font-medium text-red-600">{stats.error}</span> błędów
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Lista plików */}
        <div className="space-y-3">
          {items.map((item) => (
            <UploadItem
              key={item.id}
              item={item}
              onRemove={onItemRemove}
              onRetry={onItemRetry}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

