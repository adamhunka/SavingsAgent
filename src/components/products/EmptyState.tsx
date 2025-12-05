/**
 * src/components/products/EmptyState.tsx
 * Komponent stanu pustej listy.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  onClearFilters?: () => void;
}

/**
 * Komponent stanu pustej listy
 */
export function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
      <div className="mb-4 text-6xl">🔍</div>
      <h3 className="mb-2 text-lg font-semibold">Nie znaleziono produktów</h3>
      <p className="mb-6 text-sm text-muted-foreground">
        Spróbuj zmienić filtry lub wyszukiwanie, aby zobaczyć więcej wyników
      </p>
      {onClearFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Wyczyść filtry
        </Button>
      )}
    </div>
  );
}
