/**
 * src/components/products/ProductImagePreview.tsx
 * Komponent wyświetlający miniaturę podglądu strony gazetki
 */

import { useState } from "react";

interface ProductImagePreviewProps {
  imagePath: string;
  alt: string;
  onOpen: () => void;
}

export function ProductImagePreview({ imagePath, alt, onOpen }: ProductImagePreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Stan błędu - placeholder
  if (imageError) {
    return (
      <div className="relative group">
        <div className="aspect-[210/297] rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center">
          <svg
            className="w-12 h-12 text-neutral-400 dark:text-neutral-600"
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
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">Nie można załadować obrazu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Skeleton loader */}
      {!imageLoaded && (
        <div className="aspect-[210/297] rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
      )}

      {/* Obraz */}
      <button
        onClick={onOpen}
        className="relative block w-full overflow-hidden rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2"
        style={{ display: imageLoaded ? "block" : "none" }}
      >
        <div className="aspect-[210/297] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
          <img
            src={imagePath}
            alt={alt}
            className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>

        {/* Overlay z ikoną powiększenia */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-neutral-900 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-neutral-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                />
              </svg>
            </div>
            <span className="text-white text-sm font-medium drop-shadow-lg">Kliknij aby powiększyć</span>
          </div>
        </div>
      </button>

      {/* Etykieta */}
      {imageLoaded && (
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 text-center">Strona gazetki</p>
      )}
    </div>
  );
}

