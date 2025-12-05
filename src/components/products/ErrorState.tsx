/**
 * src/components/products/ErrorState.tsx
 * Komponent stanu błędu.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Komponent stanu błędu
 */
export function ErrorState({ message = "Wystąpił błąd podczas ładowania produktów", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" role="alert" aria-live="assertive">
      <div className="mb-4 text-6xl">⚠️</div>
      <h3 className="mb-2 text-lg font-semibold">Ups! Coś poszło nie tak</h3>
      <p className="mb-6 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="default" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      )}
    </div>
  );
}
