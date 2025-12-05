# Komponenty Produktów

Implementacja widoku listy produktów (Homepage) i modala szczegółów produktu zgodnie z planem implementacji.

## 📁 Struktura Komponentów

```
src/components/products/
├── ProductBrowser.tsx          # Smart Component - główny kontener
├── ProductCard.tsx             # Karta pojedynczego produktu
├── ProductCardSkeleton.tsx     # Loading state dla kart
├── SearchBar.tsx               # Input wyszukiwania z debounce
├── FilterSidebar.tsx           # Panel filtrów (desktop + mobile)
├── EmptyState.tsx              # Stan pustej listy
├── ErrorState.tsx              # Stan błędu
├── InfiniteScrollTrigger.tsx   # Intersection Observer dla infinite scroll
├── ProductModal.tsx            # ✨ Modal ze szczegółami produktu
├── ProductHeader.tsx           # ✨ Nagłówek modala (nazwa + akcje)
├── ProductContent.tsx          # ✨ Zawartość modala
├── ProductInfo.tsx             # ✨ Informacje o produkcie (ceny, opis)
├── ProductMeta.tsx             # ✨ Metadane (sklep, strona)
├── ProductActions.tsx          # ✨ Akcje użytkownika
├── ProductImagePreview.tsx     # ✨ Miniatura podglądu strony
├── PageLightbox.tsx            # ✨ Pełnoekranowy viewer obrazu
├── modal/
│   └── index.ts                # Eksport komponentów modala
└── README.md                   # Ta dokumentacja
```

## 🎯 Główne Funkcjonalności

### ProductBrowser (Root Container)
- **Zarządzanie stanem** poprzez hooki `useProductSearch` i `useMetadata`
- **Responsywność**: Desktop sidebar + Mobile sheet dla filtrów
- **Synchronizacja URL**: Filtry są zapisywane w query params
- **Infinite Scroll**: Automatyczne ładowanie kolejnych stron
- **Obsługa błędów**: Error states z możliwością retry

### Filtry
- **Sklepy**: Checkboxy (multi-select)
- **Kategorie**: Select (single-select)
- **Sortowanie**: Najnowsze | Cena rosnąco | Cena malejąco
- **Wyszukiwanie**: Debounced input (500ms)

### ProductCard
- Wyświetla: ikonę kategorii, cenę promocyjną, nazwę, opis, warunki
- Pokazuje cenę regularną jako przekreśloną jeśli jest wyższa
- Hover effects i accessibility (keyboard navigation)
- **onClick**: Otwiera modal ze szczegółami produktu i aktualizuje URL

### ProductModal (Widok Szczegółów)
**Główne cechy:**
- **Modal routing**: Synchronizacja z URL (`/?product={id}`)
- **Deep linking**: Bezpośrednie wejście na URL otwiera modal
- **Browser history**: Back/forward button support
- **Focus trap**: Pełna obsługa keyboard navigation
- **ESC to close**: Zamknięcie modalem klawiszem Escape
- **Loading states**: Skeleton loader podczas fetch
- **Error handling**: Friendly error messages z retry

**Podkomponenty:**
- `ProductHeader`: Nagłówek z nazwą i akcjami (zamknij, kopiuj link, zobacz gazetkę)
- `ProductContent`: Layout zawartości modala
- `ProductInfo`: Ceny (promo + regular), opis, warunki, kategoria
- `ProductMeta`: Informacje o sklepie i stronie gazetki
- `ProductActions`: Przycisk "Zobacz gazetkę"
- `ProductImagePreview`: Miniatura strony z hover zoom effect
- `PageLightbox`: Pełnoekranowy viewer z zoom i pan functionality

### PageLightbox (Image Viewer)
**Funkcjonalności:**
- **Zoom**: Mouse wheel, +/- buttons, pinch-to-zoom (mobile)
- **Pan**: Drag & drop dla zoomowanych obrazów
- **Keyboard controls**: ESC (zamknij), +/- (zoom), 0 (reset)
- **Touch gestures**: Obsługa mobile touch events
- **Loading/Error states**: Skeleton + error placeholder
- **Focus trap**: Pełna accessibility

## 🔧 Custom Hooks

### useProductSearch
**Lokalizacja**: `src/components/hooks/useProductSearch.ts`

```typescript
const {
  products,        // Tablica produktów
  meta,           // Metadane paginacji
  filters,        // Aktywne filtry
  isLoading,      // Ładowanie pierwszej strony
  isLoadingMore,  // Ładowanie kolejnej strony
  error,          // Błąd (null jeśli brak)
  updateFilter,   // Aktualizacja pojedynczego filtra
  loadMore,       // Załaduj kolejną stronę
  retry,          // Ponów zapytanie
  clearFilters,   // Wyczyść filtry
} = useProductSearch();
```

**Funkcje:**
- Synchronizacja dwukierunkowa z URL (query params)
- Debouncing dla wyszukiwania
- Anulowanie poprzednich requestów (AbortController)
- Paginacja z akumulacją wyników

### useMetadata
**Lokalizacja**: `src/components/hooks/useMetadata.ts`

```typescript
const {
  categories,  // Lista kategorii
  stores,      // Lista sklepów
  isLoading,   // Ładowanie
  error,       // Błąd
} = useMetadata();
```

### useProductDetail ✨
**Lokalizacja**: `src/components/hooks/useProductDetail.ts`

```typescript
const {
  data,             // ProductViewModel z danymi produktu
  isLoading,        // Ładowanie danych
  isError,          // Flaga błędu
  error,            // ApiClientError (jeśli wystąpił)
  refetch,          // Funkcja do ponowienia zapytania
  validationErrors, // Błędy walidacji danych
} = useProductDetail(productId);
```

**Funkcje:**
- Walidacja UUID przed fetch (early validation)
- Mapowanie DTO → ViewModel (camelCase dla React)
- Walidacja krytycznych pól (price_promo, name, page)
- Obsługa błędów 404, 400, 500
- Retry mechanism

## 🌐 API Client

**Lokalizacja**: `src/lib/api.ts`

```typescript
// Pobierz produkty z filtrami
await fetchProducts(filters, page, perPage);

// ✨ Pobierz szczegóły produktu
await fetchProductDetail(productId);

// Pobierz kategorie
await fetchCategories();

// Pobierz sklepy
await fetchStores();
```

**Endpointy:**
- `GET /api/v1/products` - Lista produktów z filtrowaniem
- `GET /api/v1/products/:id` - Szczegóły produktu ✨
- `GET /api/v1/categories` - Lista kategorii
- `GET /api/v1/stores` - Lista sklepów

## 🎨 Komponenty UI (Shadcn)

Zainstalowane komponenty:
- ✅ Card
- ✅ Button
- ✅ Input
- ✅ Select
- ✅ Checkbox
- ✅ Badge
- ✅ Sheet (dla mobile filters)
- ✅ Avatar

## 📱 Responsywność

### Mobile (< 1024px)
- Filtry w Sheet (drawer z lewej strony)
- Przycisk "Filtry" w headerze
- Grid: 1 kolumna (sm: 2 kolumny)

### Desktop (≥ 1024px)
- Filtry w stałym sidebarze (sticky)
- Grid: 3-4 kolumny (zależnie od szerokości ekranu)

## ♿ Accessibility

- **ARIA labels**: Wszystkie interaktywne elementy
- **Keyboard navigation**: Pełna obsługa klawiatury
- **Screen readers**: Proper semantic HTML + ARIA
- **Focus management**: Visible focus indicators
- **Loading states**: aria-busy, aria-live regions

## 🚀 Uruchomienie

```bash
# Development
npm run dev

# Build
npm run build

# Preview
npm run preview
```

## 🔍 Testowanie

### Scenariusze do przetestowania - Lista:
1. ✅ Filtrowanie po sklepie (multi-select)
2. ✅ Filtrowanie po kategorii
3. ✅ Wyszukiwanie tekstowe (debounce)
4. ✅ Sortowanie (3 opcje)
5. ✅ Infinite scroll (automatyczne ładowanie)
6. ✅ Synchronizacja URL (odświeżenie strony zachowuje filtry)
7. ✅ Responsywność (mobile/desktop)
8. ✅ Stan pustej listy
9. ✅ Stan błędu z retry
10. ✅ Keyboard navigation

### Scenariusze do przetestowania - Modal ✨:
11. ⏳ Kliknięcie karty produktu otwiera modal
12. ⏳ URL aktualizuje się po otwarciu modala (`/?product={id}`)
13. ⏳ Bezpośrednie wejście na URL z `?product={id}` otwiera modal
14. ⏳ ESC zamyka modal i usuwa parametr z URL
15. ⏳ Kliknięcie poza modal zamyka go
16. ⏳ Przycisk "Zamknij" zamyka modal
17. ⏳ Browser back button zamyka modal
18. ⏳ Loading state (skeleton) podczas ładowania danych
19. ⏳ Error state (404, 500) z retry button
20. ⏳ Validation errors (niepełne dane) wyświetlane jako warning
21. ⏳ Kopiowanie linku do schowka z toastem
22. ⏳ Przycisk "Zobacz gazetkę" otwiera PageLightbox
23. ⏳ PageLightbox - zoom in/out buttons
24. ⏳ PageLightbox - mouse wheel zoom
25. ⏳ PageLightbox - drag & drop dla zoomowanych obrazów
26. ⏳ PageLightbox - keyboard controls (+, -, 0, ESC)
27. ⏳ PageLightbox - touch gestures na mobile
28. ⏳ Focus trap w modalach
29. ⏳ Responsywność modala (mobile/tablet/desktop)
30. ⏳ Accessibility - screen reader compatibility

## 🎯 TODO / Przyszłe usprawnienia

- [x] Modal ze szczegółami produktu ✅
- [x] Modal routing z synchronizacją URL ✅
- [x] Pełnoekranowy viewer obrazu z zoom ✅
- [ ] Prawdziwe ikony zamiast emoji (np. Lucide Icons)
- [ ] Filtry cenowe (min_price, max_price sliders)
- [ ] Virtual scrolling dla bardzo długich list
- [ ] Cache'owanie API responses (React Query/SWR)
- [ ] Optimistic UI updates
- [ ] Persystencja filtrów w localStorage
- [ ] Eksport listy produktów (CSV/PDF)
- [ ] Akcje admina w modalu (edycja produktu)
- [ ] Share functionality (native Web Share API)

## 📝 Uwagi Techniczne

- API przyjmuje pojedynczy `store_id`, ale UI obsługuje multi-select (wysyła pierwszy element)
- Brak `PUBLIC_API_URL` w `.env` oznacza relative API calls (ok dla SSR)
- Metadane (kategorie/sklepy) są cache'owane przez browser (Cache-Control headers)
- Search używa FTS + trigram similarity na backendzie

