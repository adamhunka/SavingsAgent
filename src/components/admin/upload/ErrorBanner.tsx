/**
 * src/components/admin/upload/ErrorBanner.tsx
 * Banner wyświetlający błędy globalne niezwiązane z konkretnym plikiem.
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { GlobalError } from "@/types";
import { AlertCircle, X, Info, AlertTriangle } from "lucide-react";

interface ErrorBannerProps {
  errors: GlobalError[];
  onDismiss: (errorId: string) => void;
  onRetryAction?: () => void;
}

/**
 * Mapowanie severity na ikonę
 */
function getSeverityIcon(severity: GlobalError["severity"]) {
  switch (severity) {
    case "error":
      return <AlertCircle className="h-4 w-4" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4" />;
    case "info":
      return <Info className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
}

/**
 * Mapowanie severity na variant alertu
 */
function getSeverityVariant(severity: GlobalError["severity"]): "default" | "destructive" {
  return severity === "error" ? "destructive" : "default";
}

/**
 * ErrorBanner
 * Wyświetla błędy globalne z możliwością zamknięcia i akcji retry
 */
export function ErrorBanner({ errors, onDismiss, onRetryAction }: ErrorBannerProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {errors.map((error) => (
        <Alert key={error.id} variant={getSeverityVariant(error.severity)}>
          {getSeverityIcon(error.severity)}
          <div className="flex-1">
            <AlertTitle className="flex items-center justify-between">
              <span>{error.message}</span>
              {error.dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(error.id)}
                  className="h-6 w-6 p-0"
                  aria-label="Zamknij"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </AlertTitle>
            {error.action && (
              <AlertDescription className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={error.action.handler}
                >
                  {error.action.label}
                </Button>
              </AlertDescription>
            )}
          </div>
        </Alert>
      ))}
    </div>
  );
}

