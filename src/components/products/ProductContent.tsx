/**
 * src/components/products/ProductContent.tsx
 * Kontener zawartości modala produktu
 */

import type { ProductViewModel } from "@/types";
import { ProductImagePreview } from "./ProductImagePreview";
import { ProductInfo } from "./ProductInfo";
import { ProductMeta } from "./ProductMeta";
import { ProductActions } from "./ProductActions";

interface ProductContentProps {
  product: ProductViewModel;
  validationErrors?: string[];
  onOpenViewer?: () => void;
}

export function ProductContent({ product, validationErrors, onOpenViewer }: ProductContentProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Validation Errors - jeśli istnieją */}
      {validationErrors && validationErrors.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Uwaga: Niepełne dane produktu
              </h3>
              <ul className="mt-1 text-sm text-amber-700 dark:text-amber-300 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Layout dwukolumnowy na większych ekranach */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lewa kolumna: Obraz (jeśli dostępny) */}
        {product.imagePath && onOpenViewer && (
          <div className="lg:col-span-1">
            <ProductImagePreview imagePath={product.imagePath} alt={product.name} onOpen={onOpenViewer} />
          </div>
        )}

        {/* Prawa kolumna: Info */}
        <div className={product.imagePath ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="space-y-6">
            <ProductInfo
              pricePromo={product.pricePromo}
              priceRegular={product.priceRegular}
              description={product.description}
              conditions={product.conditions}
              category={product.category}
            />

            <ProductMeta
              store={product.store}
              pageNumber={product.pageNumber}
              pageId={product.pageId}
            />

            <ProductActions onViewSource={onOpenViewer} />
          </div>
        </div>
      </div>
    </div>
  );
}

