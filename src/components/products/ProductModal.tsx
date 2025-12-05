/**
 * src/components/products/ProductModal.tsx
 * Główny komponent modala wyświetlającego szczegóły produktu
 */

import { useEffect, useRef, useState } from "react";
import { useProductDetail } from "@/components/hooks/useProductDetail";
import { ProductHeader } from "./ProductHeader";
import { ProductContent } from "./ProductContent";
import { PageLightbox } from "./PageLightbox";

interface ProductModalProps {
  productId: string;
  onClose: () => void;
}

export function ProductModal({ productId, onClose }: ProductModalProps) {
  const { data, isLoading, isError, error, refetch, validationErrors } = useProductDetail(productId);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const focusElementBeforeOpen = useRef<HTMLElement | null>(null);

  // Zapisz element, który miał focus przed otwarciem modala
  useEffect(() => {
    focusElementBeforeOpen.current = document.activeElement as HTMLElement;

    // Focus trap - przenieś focus do modala
    if (modalRef.current) {
      modalRef.current.focus();
    }

    // Zablokuj scroll na body
    document.body.style.overflow = "hidden";

    return () => {
      // Przywróć scroll
      document.body.style.overflow = "";
      // Przywróć focus
      if (focusElementBeforeOpen.current) {
        focusElementBeforeOpen.current.focus();
      }
    };
  }, []);

  // Obsługa klawisza ESC
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isViewerOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, isViewerOpen]);

  // Obsługa kliknięcia poza modalem
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isViewerOpen) {
      onClose();
    }
  };

  const handleOpenViewer = () => {
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
  };

  // Stan ładowania
  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={handleOverlayClick}
      >
        <div
          ref={modalRef}
          className="relative w-full max-w-3xl max-h-[90vh] m-4 bg-white dark:bg-neutral-900 rounded-lg shadow-xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabIndex={-1}
        >
          <div className="p-6 space-y-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
              <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Stan błędu
  if (isError || !data) {
    const errorMessage = error?.statusCode === 404 ? "Produkt nie znaleziony" : error?.message || "Wystąpił błąd";
    
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={handleOverlayClick}
      >
        <div
          ref={modalRef}
          className="relative w-full max-w-md max-h-[90vh] m-4 bg-white dark:bg-neutral-900 rounded-lg shadow-xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-error-title"
          tabIndex={-1}
        >
          <div className="p-6 space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-red-600 dark:text-red-400"
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
                </div>
              </div>
              <div>
                <h2 id="modal-error-title" className="text-xl font-semibold text-neutral-900 dark:text-white">
                  {errorMessage}
                </h2>
                {error?.code && (
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Kod błędu: {error.code}</p>
                )}
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={refetch}
                  className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                >
                  Spróbuj ponownie
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Główny widok modala z danymi
  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={handleOverlayClick}
      >
        <div
          ref={modalRef}
          className="relative w-full max-w-3xl max-h-[90vh] m-4 bg-white dark:bg-neutral-900 rounded-lg shadow-xl overflow-hidden flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabIndex={-1}
        >
          <ProductHeader
            name={data.name}
            productId={data.id}
            onClose={onClose}
            onOpenSource={data.imagePath ? handleOpenViewer : undefined}
          />
          <div className="overflow-y-auto flex-1">
            <ProductContent
              product={data}
              validationErrors={validationErrors}
              onOpenViewer={data.imagePath ? handleOpenViewer : undefined}
            />
          </div>
        </div>
      </div>

      {/* Page Lightbox - modalny viewer obrazu */}
      {isViewerOpen && data.imagePath && (
        <PageLightbox imagePath={data.imagePath} alt={`Strona ${data.pageNumber}`} onClose={handleCloseViewer} />
      )}
    </>
  );
}

