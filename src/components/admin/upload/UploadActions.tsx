/**
 * src/components/admin/upload/UploadActions.tsx
 * Panel z głównymi akcjami dla procesu uploadu.
 */

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Sparkles } from "lucide-react";

interface UploadActionsProps {
  onStartUpload: () => void;
  onCancelAll: () => void;
  canStartUpload: boolean;
  isUploading: boolean;
  autoProcess: boolean;
  onToggleAutoProcess: (value: boolean) => void;
  pendingCount: number;
}

/**
 * UploadActions
 * Panel z akcjami: rozpocznij upload, anuluj, opcja auto-przetwarzania
 */
export function UploadActions({
  onStartUpload,
  onCancelAll,
  canStartUpload,
  isUploading,
  autoProcess,
  onToggleAutoProcess,
  pendingCount,
}: UploadActionsProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Opcja auto-przetwarzania */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="auto-process"
              checked={autoProcess}
              onCheckedChange={(checked) => onToggleAutoProcess(checked === true)}
              disabled={isUploading}
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="auto-process"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Uruchom przetwarzanie AI po zakończeniu uploadu
                </span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatycznie rozpocznie ekstrakcję produktów z uploadowanych stron.
                Może wygenerować dodatkowe koszty API.
              </p>
            </div>
          </div>

          {/* Akcje główne */}
          <div className="flex items-center gap-3">
            {isUploading ? (
              <Button
                variant="destructive"
                size="lg"
                onClick={onCancelAll}
                className="flex-1"
              >
                <X className="h-5 w-5" />
                Anuluj wszystkie
              </Button>
            ) : (
              <Button
                variant="default"
                size="lg"
                onClick={onStartUpload}
                disabled={!canStartUpload}
                className="flex-1"
              >
                <Upload className="h-5 w-5" />
                {pendingCount > 0
                  ? `Rozpocznij upload (${pendingCount})`
                  : "Rozpocznij upload"}
              </Button>
            )}
          </div>

          {/* Pomoc */}
          {!isUploading && canStartUpload && (
            <div className="text-xs text-muted-foreground text-center">
              <p>
                Pliki zostaną skompresowane przed wysłaniem aby zmniejszyć rozmiar transferu.
              </p>
            </div>
          )}

          {isUploading && (
            <div className="text-xs text-muted-foreground text-center">
              <p>Upload w trakcie... Nie zamykaj tej strony.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

