# Plan implementacji widoku Listy Produktów (Strona Główna)

## 1. Przegląd

Widok ten stanowi główny punkt wejścia do aplikacji klienckiej (Homepage). Umożliwia użytkownikom przeglądanie ofert promocyjnych z Lidla i Biedronki, filtrowanie ich według sklepu i kategorii, wyszukiwanie tekstowe oraz sortowanie. Widok nie wymaga uwierzytelniania i musi być w pełni responsywny (Mobile First).

## 2. Routing widoku

*   **Ścieżka:** `/` (Root)
*   **Plik Astro:** `src/pages/index.astro`
*   **Główny komponent React:** `src/components/products/ProductBrowser.tsx` (Renderowany z dyrektywą `client:load`)

## 3. Struktura komponentów

Widok zostanie zbudowany jako "wyspa" Reacta osadzona w layoutcie Astro.

```text
src/pages/index.astro (Layout: BaseLayout)
└── ProductBrowser (Smart Component - State Manager)
    ├── SearchHeader (Sticky Header)
    │   ├── SearchBar
    │   └── MobileFilterTrigger (Button -> Sheet/Drawer)
    ├── FilterSidebar (Desktop: Aside, Mobile: SheetContent)
    │   ├── StoreFilter (Checkbox Group)
    │   ├── CategoryFilter (Select / Radio Group)
    │   └── PriceRangeFilter (Slider / Inputs - opcjonalnie)
    └── ResultsArea (Main Content)
        ├── ResultsHeader
        │   ├── ResultCount
        │   └── SortSelect
        ├── ProductGrid
        │   ├── ProductCard (x N)
        │   │   ├── PriceBadge
        │   │   ├── StoreLogo
        │   │   └── CategoryIcon
        │   └── ProductCardSkeleton (Loading State)
        ├── ErrorState (Retry Button)
        ├── EmptyState
        └── InfiniteScrollTrigger (Intersection Observer)
```

## 4. Szczegóły komponentów

### `ProductBrowser` (Root Container)
*   **Opis:** Główny kontener zarządzający stanem filtrów, pobieraniem danych i synchronizacją URL.
*   **Główne elementy:** `div` (layout wrapper), `SearchHeader`, `FilterSidebar`, `ResultsArea`.
*   **Obsługiwane zdarzenia:**
    *   `onFilterChange`: Aktualizacja stanu filtrów i reset listy produktów.
    *   `onSearch`: Debounced update parametru `q`.
    *   `onLoadMore`: Pobranie kolejnej strony wyników.
*   **Stan:** `products`, `meta`, `filters`, `isLoading`, `error`.
*   **Propsy:** Brak (ewentualnie wstępnie załadowane dane z SSR, jeśli zdecydujemy się na hybrydę).

### `FilterSidebar`
*   **Opis:** Panel boczny zawierający wszystkie kontrolki filtrowania.
*   **Główne elementy:** `StoreFilter`, `CategoryFilter`.
*   **Propsy:**
    *   `stores`: `StoreDTO[]` (lista sklepów do wyboru).
    *   `categories`: `CategoryDTO[]` (lista kategorii do wyboru).
    *   `activeFilters`: `ProductFilters`.
    *   `onFilterChange`: `(key: keyof ProductFilters, value: any) => void`.

### `ProductCard`
*   **Opis:** Prezentacja pojedynczej oferty. Zgodnie z PRD, zamiast zdjęcia produktu (crop), wyświetlamy ikonę kategorii.
*   **Główne elementy:** `Card` (Shadcn), `Badge` (Cena), `Icon` (Kategoria), `Text` (Nazwa, Opis, Sklep).
*   **Typy:** Wymaga obiektu zgodnego z `ProductListItemViewModel` (rozszerzone DTO).
*   **Propsy:**
    *   `product`: `ProductListItemViewModel`.
    *   `categoryIcon`: `string` (nazwa ikony).
    *   `onClick`: `() => void` (otwarcie modala podglądu).

### `SearchBar`
*   **Opis:** Input tekstowy z opóźnieniem (debounce) do wyszukiwania ofert.
*   **Główne elementy:** `Input` (Shadcn), `SearchIcon`.
*   **Obsługiwane zdarzenia:** `onChange` (z debounce 300-500ms).
*   **Propsy:**
    *   `value`: `string`.
    *   `onChange`: `(value: string) => void`.

### `InfiniteScrollTrigger`
*   **Opis:** Niewidoczny element na dole listy, który wyzwala ładowanie kolejnej strony, gdy znajdzie się w viewport.
*   **Główne elementy:** `div` (ref).
*   **Obsługiwane zdarzenia:** Intersection Observer callback.
*   **Propsy:**
    *   `onIntersect`: `() => void`.
    *   `isLoading`: `boolean`.
    *   `hasMore`: `boolean`.

## 5. Typy

Należy zdefiniować w `src/types/products.ts` (lub rozszerzyć istniejący plik):

### ProductFilters
Typ reprezentujący stan filtrów w aplikacji.
```typescript
interface ProductFilters {
  store_id?: string[]; // Obsługa wielu sklepów
  category_id?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
  sort: 'created_at_desc' | 'price_asc' | 'price_desc';
}
```

### ProductListItemViewModel
Rozszerzenie DTO o pola pomocnicze dla UI (jeśli potrzebne, np. sformatowana cena), chociaż na początku wystarczy `ProductListItemDTO` z mapowaniem kategorii.
Ważne: Ponieważ `ProductListItemDTO` nie zawiera pełnych obiektów `Category` i `Store`, musimy mapować `category_id` na ikonę i `store_id` na nazwę/logo w komponencie nadrzędnym lub w hooku.

## 6. Zarządzanie stanem

Zarządzanie stanem odbędzie się w komponencie `ProductBrowser` przy użyciu niestandardowego hooka `useProductSearch`.

### Hook `useProductSearch`
*   **Stan wewnętrzny:**
    *   `data`: Tablica produktów (akumulowana przy paginacji).
    *   `meta`: Metadane paginacji (`PaginationMeta`).
    *   `isLoading`: `boolean`.
    *   `isError`: `boolean`.
    *   `filters`: `ProductFilters`.
*   **Synchronizacja URL:**
    *   Przy montowaniu: Inicjalizacja stanu `filters` z `window.location.search`.
    *   Przy zmianie `filters`: Aktualizacja URL (bez przeładowania strony, `history.pushState`) oraz wywołanie API.
*   **Logika:**
    *   Zmiana filtra (sklep/kategoria/sort/szukanie) -> Reset tablicy `data` -> `page=1` -> Fetch.
    *   `loadMore` -> `page = current_page + 1` -> Fetch -> Append do `data`.

## 7. Integracja API

### Endpointy
1.  **Produkty:** `GET /api/v1/products`
    *   Query Params: Mapowane bezpośrednio z obiektu `ProductFilters` + `page` + `per_page`.
    *   Response: `ProductListResponse` (`{ data: ProductListItemDTO[], meta: PaginationMeta }`).
2.  **Kategorie:** `GET /api/v1/categories`
    *   Cel: Pobranie listy do filtra i mapowania ikon.
    *   Cache: Można cache'ować agresywnie.
3.  **Sklepy:** `GET /api/v1/stores`
    *   Cel: Pobranie listy do filtra i mapowania nazw sklepów.

## 8. Interakcje użytkownika

1.  **Wejście na stronę:**
    *   Ładowanie filtrów (sklepy, kategorie).
    *   Ładowanie pierwszej strony produktów (skeletony w trakcie ładowania).
2.  **Wyszukiwanie ("kawa"):**
    *   Użytkownik wpisuje frazę -> Debounce 500ms -> Reset listy -> Loader -> Wyniki dla frazy "kawa".
3.  **Filtrowanie (np. tylko Lidl):**
    *   Kliknięcie checkboxa "Lidl" -> Natychmiastowe wysłanie zapytania z `store_id=UUID_LIDL`.
4.  **Przewijanie (Infinite Scroll):**
    *   Użytkownik dociera do końca listy -> Spinner na dole -> Pobranie strony 2 -> Doklejenie wyników.
5.  **Kliknięcie w ofertę:**
    *   Otwarcie modala ze szczegółami (w ramach tego zadania tylko przygotowanie handler `onClick`).

## 9. Warunki i walidacja

*   **API Query Params:** Walidacja po stronie backendu (Zod), frontend musi dbać o poprawne typy (np. numery dla cen).
*   **Cena:** Wyświetlanie ceny promocyjnej jako głównej. Cena regularna (przekreślona) tylko jeśli `price_regular > price_promo`.
*   **Brak wyników:** Jeśli API zwróci pustą tablicę `data`, wyświetlić komponent `EmptyState` z sugestią wyczyszczenia filtrów.

## 10. Obsługa błędów

*   **Błąd pobierania produktów:** Wyświetlenie komunikatu w miejscu listy produktów z przyciskiem "Spróbuj ponownie".
*   **Błąd pobierania słowników (kategorie/sklepy):** Ukrycie odpowiednich filtrów lub wyświetlenie tostera z błędem, fallback do podstawowego widoku.
*   **Błędy sieciowe (Offline):** Browser-native handling (ew. detekcja `navigator.onLine`).

## 11. Kroki implementacji

1.  **Przygotowanie typów i serwisu API:**
    *   Upewnić się, że `types.ts` jest aktualny.
    *   Stworzyć plik `src/lib/api.ts` (lub podobny) z funkcjami fetchującymi (`fetchProducts`, `fetchCategories`, `fetchStores`) używającymi `fetch` i zwracającymi odpowiednie Typy Response.

2.  **Stworzenie komponentów UI (Shadcn/Tailwind):**
    *   `ProductCard`: Stylowanie karty, obsługa wariantów cenowych.
    *   `ProductCardSkeleton`: Loading state.
    *   `FilterSidebar`: Layout dla filtrów.

3.  **Implementacja Hooka `useProductSearch`:**
    *   Obsługa `useState` dla danych i filtrów.
    *   Obsługa `useEffect` do fetchowania.
    *   Obsługa URL params.

4.  **Złożenie `ProductBrowser`:**
    *   Integracja hooka.
    *   Złożenie layoutu (Sidebar + Grid).
    *   Podpięcie `InfiniteScrollTrigger`.

5.  **Integracja z Astro:**
    *   Zaimportowanie `ProductBrowser` w `src/pages/index.astro`.
    *   Dodanie `client:load`.

6.  **Testy manualne:**
    *   Weryfikacja filtrów, sortowania, wyszukiwania i paginacji.
    *   Sprawdzenie responsywności (Mobile/Desktop).

