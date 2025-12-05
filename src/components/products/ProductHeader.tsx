/**
 * src/components/products/ProductHeader.tsx
 * Pasek tytułowy modala produktu z nazwą i akcjami
 */

import { useState } from "react";

interface ProductHeaderProps {
  name: string;
  productId: string;
  onClose: () => void;
  onOpenSource?: () => void;
}

export function ProductHeader({ name, productId, onClose, onOpenSource }: ProductHeaderProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/?product=${productId}`;
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Nie udało się skopiować linku:", err);
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        {/* Nazwa produktu */}
        <div className="flex-1 min-w-0">
          <h1
            id="modal-title"
            className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-white truncate"
            title={name}
          >
            {name}
          </h1>
        </div>

        {/* Akcje */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Przycisk: Zobacz gazetkę */}
          {onOpenSource && (
            <button
              onClick={onOpenSource}
              className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
              aria-label="Zobacz gazetkę źródłową"
              title="Zobacz gazetkę źródłową"
            >
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}

          {/* Przycisk: Kopiuj link */}
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white relative"
            aria-label="Kopiuj link do produktu"
            title="Kopiuj link do produktu"
          >
            {copySuccess ? (
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
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
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            )}
            {copySuccess && (
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs rounded whitespace-nowrap">
                Skopiowano!
              </span>
            )}
          </button>

          {/* Przycisk: Zamknij */}
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white"
            aria-label="Zamknij modal"
            title="Zamknij"
          >
            <svg
              className="w-5 h-5 text-neutral-600 dark:text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

