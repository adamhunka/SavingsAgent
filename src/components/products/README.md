# Komponenty Produktów - Widok Listy

Implementacja widoku listy produktów (Homepage) zgodnie z planem implementacji.

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

## 🌐 API Client

**Lokalizacja**: `src/lib/api.ts`

```typescript
// Pobierz produkty z filtrami
await fetchProducts(filters, page, perPage);

// Pobierz kategorie
await fetchCategories();

// Pobierz sklepy
await fetchStores();
```

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

### Scenariusze do przetestowania:
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

## 🎯 TODO / Przyszłe usprawnienia

- [ ] Modal ze szczegółami produktu (onClick handler gotowy)
- [ ] Prawdziwe ikony zamiast emoji (np. Lucide Icons)
- [ ] Filtry cenowe (min_price, max_price sliders)
- [ ] Virtual scrolling dla bardzo długich list
- [ ] Cache'owanie API responses
- [ ] Optimistic UI updates
- [ ] Persystencja filtrów w localStorage
- [ ] Share URL funkcjonalność
- [ ] Eksport listy produktów (CSV/PDF)

## 📝 Uwagi Techniczne

- API przyjmuje pojedynczy `store_id`, ale UI obsługuje multi-select (wysyła pierwszy element)
- Brak `PUBLIC_API_URL` w `.env` oznacza relative API calls (ok dla SSR)
- Metadane (kategorie/sklepy) są cache'owane przez browser (Cache-Control headers)
- Search używa FTS + trigram similarity na backendzie

