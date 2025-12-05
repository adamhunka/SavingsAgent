/**
 * src/components/products/ProductMeta.tsx
 * Komponent wyświetlający metadane produktu: sklep, strona gazetki
 */

import type { ProductViewModel } from "@/types";

interface ProductMetaProps {
  store: ProductViewModel["store"];
  pageNumber: number;
  pageId: string;
}

export function ProductMeta({ store, pageNumber, pageId }: ProductMetaProps) {
  return (
    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
      <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Źródło</h3>

      {/* Sklep */}
      <div className="flex items-center gap-3">
        {/* Logo sklepu */}
        {store.logoUrl ? (
          <div className="w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-800">
            <img
              src={store.logoUrl}
              alt={`Logo ${store.name}`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-10 h-10 flex-shrink-0 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-neutral-400 dark:text-neutral-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
        )}

        {/* Nazwa sklepu */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">{store.name}</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">Sieć handlowa</p>
        </div>
      </div>

      {/* Numer strony */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 flex-shrink-0 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-neutral-600 dark:text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">Strona {pageNumber}</p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate" title={pageId}>
            ID: {pageId.substring(0, 8)}...
          </p>
        </div>
      </div>

      {/* Info o gazetce */}
      <div className="pt-2">
        <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Produkt wykryty automatycznie na podstawie gazetki</span>
        </div>
      </div>
    </div>
  );
}

