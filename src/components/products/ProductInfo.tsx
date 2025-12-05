/**
 * src/components/products/ProductInfo.tsx
 * Komponent wyświetlający szczegółowe informacje o produkcie: ceny, opis, warunki, kategoria
 */

import type { ProductViewModel } from "@/types";

interface ProductInfoProps {
  pricePromo: number;
  priceRegular?: number | null;
  description?: string | null;
  conditions?: string | null;
  category: ProductViewModel["category"];
}

/**
 * Formatuje cenę zgodnie z polską notacją
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(price);
}

/**
 * Oblicza procentową oszczędność
 */
function calculateSavings(pricePromo: number, priceRegular: number): number {
  if (priceRegular <= pricePromo) return 0;
  return Math.round(((priceRegular - pricePromo) / priceRegular) * 100);
}

export function ProductInfo({ pricePromo, priceRegular, description, conditions, category }: ProductInfoProps) {
  const savings = priceRegular && priceRegular > pricePromo ? calculateSavings(pricePromo, priceRegular) : null;

  return (
    <div className="space-y-4">
      {/* Ceny */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          {/* Cena promocyjna */}
          <div className="text-3xl sm:text-4xl font-bold text-red-600 dark:text-red-400">
            {formatPrice(pricePromo)}
          </div>

          {/* Cena regularna i oszczędność */}
          {priceRegular && priceRegular > pricePromo && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-lg text-neutral-500 dark:text-neutral-400 line-through">
                {formatPrice(priceRegular)}
              </div>
              {savings && savings > 0 && (
                <div className="inline-flex items-center px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm font-medium">
                  -{savings}%
                </div>
              )}
            </div>
          )}
        </div>

        {/* Etykieta ceny promocyjnej */}
        {priceRegular && priceRegular > pricePromo && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Oszczędzasz {formatPrice(priceRegular - pricePromo)}
          </p>
        )}
      </div>

      {/* Kategoria */}
      <div className="flex items-center gap-2">
        {category.iconName && (
          <span className="text-lg" role="img" aria-label={category.name}>
            {category.iconName}
          </span>
        )}
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {category.name}
        </span>
      </div>

      {/* Opis */}
      {description && (
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Opis</h3>
          <p className="text-neutral-900 dark:text-white whitespace-pre-wrap">{description}</p>
        </div>
      )}

      {/* Warunki */}
      {conditions && (
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Warunki</h3>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <svg
              className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-blue-900 dark:text-blue-200">{conditions}</p>
          </div>
        </div>
      )}
    </div>
  );
}

