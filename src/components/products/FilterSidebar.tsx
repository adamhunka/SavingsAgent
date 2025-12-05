/**
 * src/components/products/FilterSidebar.tsx
 * Komponent bocznego panelu z filtrami.
 */

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StoreDTO, CategoryDTO, ProductFilters } from "@/types";

export interface FilterSidebarProps {
  stores: StoreDTO[];
  categories: CategoryDTO[];
  activeFilters: ProductFilters;
  onFilterChange: (key: keyof ProductFilters, value: unknown) => void;
}

/**
 * Komponent bocznego panelu z filtrami
 */
export function FilterSidebar({ stores, categories, activeFilters, onFilterChange }: FilterSidebarProps) {
  const handleStoreToggle = (storeId: string, checked: boolean) => {
    const currentStores = activeFilters.store_id || [];
    const newStores = checked ? [...currentStores, storeId] : currentStores.filter((id) => id !== storeId);

    onFilterChange("store_id", newStores.length > 0 ? newStores : undefined);
  };

  return (
    <aside className="space-y-6" aria-label="Filtry produktów">
      {/* Filtr sklepów */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Sklepy</h3>
        <div className="space-y-2">
          {stores.map((store) => {
            const isChecked = activeFilters.store_id?.includes(store.id) || false;

            return (
              <div key={store.id} className="flex items-center gap-2">
                <Checkbox
                  id={`store-${store.id}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleStoreToggle(store.id, checked === true)}
                  aria-label={`Filtruj ${store.name}`}
                />
                <label
                  htmlFor={`store-${store.id}`}
                  className="flex-1 cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {store.name}
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtr kategorii */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Kategoria</h3>
        <Select
          value={activeFilters.category_id || "all"}
          onValueChange={(value) => onFilterChange("category_id", value === "all" ? undefined : value)}
        >
          <SelectTrigger aria-label="Wybierz kategorię">
            <SelectValue placeholder="Wszystkie kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie kategorie</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtr sortowania */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Sortuj</h3>
        <Select
          value={activeFilters.sort}
          onValueChange={(value) => onFilterChange("sort", value as "created_at_desc" | "price_asc" | "price_desc")}
        >
          <SelectTrigger aria-label="Wybierz sortowanie">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at_desc">Najnowsze</SelectItem>
            <SelectItem value="price_asc">Cena rosnąco</SelectItem>
            <SelectItem value="price_desc">Cena malejąco</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </aside>
  );
}
