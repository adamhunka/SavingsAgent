/**
 * src/components/products/InfiniteScrollTrigger.tsx
 * Komponent używający Intersection Observer do wyzwalania ładowania kolejnej strony.
 */

import * as React from "react";

export interface InfiniteScrollTriggerProps {
  onIntersect: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

/**
 * Komponent obsługujący infinite scroll
 */
export function InfiniteScrollTrigger({ onIntersect, isLoading, hasMore }: InfiniteScrollTriggerProps) {
  const observerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = observerRef.current;
    if (!element || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          onIntersect();
        }
      },
      {
        rootMargin: "100px", // Załaduj wcześniej (100px przed dotarciem do końca)
        threshold: 0.1,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [onIntersect, isLoading, hasMore]);

  if (!hasMore) {
    return null;
  }

  return (
    <div ref={observerRef} className="flex w-full justify-center py-8" aria-live="polite" aria-busy={isLoading}>
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg
            className="size-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Ładowanie...</span>
        </div>
      )}
    </div>
  );
}
