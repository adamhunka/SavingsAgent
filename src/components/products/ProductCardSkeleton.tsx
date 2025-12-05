/**
 * src/components/products/ProductCardSkeleton.tsx
 * Skeleton loader dla karty produktu.
 */

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Komponent skeleton dla karty produktu
 */
export function ProductCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          {/* Ikona kategorii skeleton */}
          <div className="size-12 shrink-0 animate-pulse rounded-lg bg-muted" />

          {/* Cena skeleton */}
          <div className="text-right">
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>

        {/* Tytuł skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Opis skeleton */}
        <div className="mb-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        </div>

        {/* Sklep skeleton */}
        <div className="flex items-center gap-2">
          <div className="size-2 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Komponent pomocniczy - grid ze skeletonami
 */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </>
  );
}
