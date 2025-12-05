/**
 * src/components/products/ProductCard.tsx
 * Komponent karty produktu wyświetlany w siatce.
 */

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductListItemViewModel } from "@/types";

export interface ProductCardProps {
  product: ProductListItemViewModel;
  categoryIcon?: string;
  storeName?: string;
  onClick?: () => void;
}

/**
 * Formatuje cenę do wyświetlenia (PLN)
 */
function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(price);
}

/**
 * Komponent karty produktu
 */
export function ProductCard({ product, categoryIcon, storeName, onClick }: ProductCardProps) {
  const hasDiscount = product.price_regular && product.price_regular > product.price_promo;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          {/* Ikona kategorii */}
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {categoryIcon ? (
              <span className="text-2xl" role="img" aria-label="Ikona kategorii">
                {categoryIcon}
              </span>
            ) : (
              <span className="text-2xl">📦</span>
            )}
          </div>

          {/* Cena promocyjna */}
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{formatPrice(product.price_promo)}</div>
            {hasDiscount && (
              <div className="text-sm text-muted-foreground line-through">{formatPrice(product.price_regular)}</div>
            )}
          </div>
        </div>

        <CardTitle className="line-clamp-2 text-base">{product.name}</CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Opis produktu */}
        {product.description && (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        )}

        {/* Warunki */}
        {product.conditions && (
          <p className="mb-3 line-clamp-1 text-xs text-muted-foreground italic">{product.conditions}</p>
        )}

        {/* Nazwa sklepu */}
        {storeName && (
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-primary/60" />
            <span className="text-xs font-medium text-muted-foreground">{storeName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
