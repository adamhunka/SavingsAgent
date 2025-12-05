/**
 * src/components/products/ProductBrowser.tsx
 * Główny komponent przeglądania produktów z filtrami, wyszukiwaniem i infinite scroll.
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ProductCard } from "./ProductCard";
import { ProductGridSkeleton } from "./ProductCardSkeleton";
import { SearchBar } from "./SearchBar";
import { FilterSidebar } from "./FilterSidebar";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { InfiniteScrollTrigger } from "./InfiniteScrollTrigger";
import { ProductModal } from "./ProductModal";
import { useProductSearch } from "@/components/hooks/useProductSearch";
import { useMetadata } from "@/components/hooks/useMetadata";

/**
 * Mapowanie icon_name na emoji
 * TODO: Zastąpić prawdziwymi ikonami (np. Lucide Icons)
 */
const CATEGORY_ICONS: Record<string, string> = {
  food: "🍕",
  drinks: "🥤",
  household: "🏠",
  health: "💊",
  electronics: "📱",
  clothing: "👕",
  toys: "🧸",
  books: "📚",
  sports: "⚽",
  garden: "🌱",
  automotive: "🚗",
  pets: "🐾",
  other: "📦",
};

/**
 * Główny komponent przeglądania produktów
 */
export function ProductBrowser() {
  const { products, meta, filters, isLoading, isLoadingMore, error, updateFilter, loadMore, retry, clearFilters } =
    useProductSearch();

  const { categories, stores, isLoading: isLoadingMetadata, error: metadataError } = useMetadata();

  const [isMobileFilterOpen, setIsMobileFilterOpen] = React.useState(false);
  const [selectedProductId, setSelectedProductId] = React.useState<string | null>(null);

  // Sprawdź URL params przy montowaniu i zmianach URL
  React.useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const productId = params.get("product");
      setSelectedProductId(productId);
    };

    // Initial check
    handleUrlChange();

    // Listen for popstate (back/forward buttons)
    window.addEventListener("popstate", handleUrlChange);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, []);

  // Otwieranie modala - aktualizacja URL
  const handleOpenProductModal = (productId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("product", productId);
    window.history.pushState({}, "", url.toString());
    setSelectedProductId(productId);
  };

  // Zamykanie modala - usunięcie parametru z URL
  const handleCloseProductModal = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("product");
    window.history.pushState({}, "", url.toString());
    setSelectedProductId(null);
  };

  // Mapowanie store_id na nazwę sklepu
  const getStoreName = (storeId: string): string => {
    const store = stores.find((s) => s.id === storeId);
    return store?.name || "Nieznany sklep";
  };

  // Mapowanie category_id na ikonę
  const getCategoryIcon = (categoryId: string): string => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return CATEGORY_ICONS.other;

    // Spróbuj znaleźć ikonę po icon_name
    return CATEGORY_ICONS[category.icon_name] || CATEGORY_ICONS.other;
  };

  // Obsługa błędu metadanych
  if (metadataError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState message={metadataError} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  // Ładowanie metadanych
  if (isLoadingMetadata) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg
              className="size-6 animate-spin"
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
        </div>
      </div>
    );
  }

  const hasMore = meta ? meta.page < meta.total_pages : false;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header z wyszukiwarką */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Mobile Filter Button */}
            <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 lg:hidden" aria-label="Otwórz filtry">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filtry</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterSidebar
                    stores={stores}
                    categories={categories}
                    activeFilters={filters}
                    onFilterChange={updateFilter}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Search Bar */}
            <div className="flex-1">
              <SearchBar value={filters.q || ""} onChange={(value) => updateFilter("q", value || undefined)} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24">
              <FilterSidebar
                stores={stores}
                categories={categories}
                activeFilters={filters}
                onFilterChange={updateFilter}
              />
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1">
            {/* Results Header */}
            {meta && !isLoading && (
              <div className="mb-4 flex items-center justify-between" role="status" aria-live="polite">
                <p className="text-sm text-muted-foreground">
                  Znaleziono <span className="font-semibold">{meta.total}</span>{" "}
                  {meta.total === 1 ? "produkt" : "produktów"}
                </p>
              </div>
            )}

            {/* Error State */}
            {error && <ErrorState message={error} onRetry={retry} />}

            {/* Loading State (initial) */}
            {isLoading && !error && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <ProductGridSkeleton count={8} />
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && products.length === 0 && <EmptyState onClearFilters={clearFilters} />}

            {/* Products Grid */}
            {!error && products.length > 0 && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <ProductCard
                      key={product.product_id}
                      product={product}
                      categoryIcon={getCategoryIcon(product.category_id)}
                      storeName={getStoreName(product.store_id)}
                      onClick={() => handleOpenProductModal(product.product_id)}
                    />
                  ))}
                </div>

                {/* Infinite Scroll Trigger */}
                <InfiniteScrollTrigger onIntersect={loadMore} isLoading={isLoadingMore} hasMore={hasMore} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProductId && (
        <ProductModal productId={selectedProductId} onClose={handleCloseProductModal} />
      )}
    </div>
  );
}
