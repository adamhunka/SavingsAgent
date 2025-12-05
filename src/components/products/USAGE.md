# Product Modal - Instrukcja Użycia

## 🚀 Quick Start

Modal produktu jest już zintegrowany z `ProductBrowser` i działa automatycznie po kliknięciu karty produktu.

### Podstawowe użycie

```tsx
import { ProductModal } from "@/components/products/ProductModal";

// W komponencie
<ProductModal 
  productId="uuid-produktu" 
  onClose={() => console.log("Modal zamknięty")} 
/>
```

### Integracja z URL (jak w ProductBrowser)

```tsx
import { useState, useEffect } from "react";
import { ProductModal } from "@/components/products/ProductModal";

function MyComponent() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Synchronizacja z URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("product");
    setSelectedProductId(productId);

    // Listen for browser back/forward
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedProductId(params.get("product"));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Otwieranie modala
  const handleOpenModal = (productId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("product", productId);
    window.history.pushState({}, "", url.toString());
    setSelectedProductId(productId);
  };

  // Zamykanie modala
  const handleCloseModal = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("product");
    window.history.pushState({}, "", url.toString());
    setSelectedProductId(null);
  };

  return (
    <>
      <button onClick={() => handleOpenModal("uuid-produktu")}>
        Otwórz produkt
      </button>

      {selectedProductId && (
        <ProductModal 
          productId={selectedProductId} 
          onClose={handleCloseModal} 
        />
      )}
    </>
  );
}
```

## 🎨 Komponenty

### ProductModal (główny kontener)
**Props:**
- `productId: string` - UUID produktu do wyświetlenia
- `onClose: () => void` - Callback wywoływany przy zamykaniu modala

**Funkcjonalności:**
- ✅ Automatyczne fetch danych produktu
- ✅ Loading state (skeleton)
- ✅ Error state z retry button
- ✅ Focus trap
- ✅ ESC zamyka modal
- ✅ Click poza modal zamyka
- ✅ Blokada scroll na body

### ProductHeader
Pasek tytułowy z nazwą produktu i akcjami.

**Akcje:**
- Przycisk "Zobacz gazetkę" (jeśli dostępna)
- Przycisk "Kopiuj link" (z toastem sukcesu)
- Przycisk "Zamknij"

### ProductInfo
Wyświetla szczegółowe informacje:
- Cena promocyjna (duża, czerwona)
- Cena regularna (przekreślona)
- Badge z procentową oszczędnością
- Kategoria z ikoną
- Opis produktu
- Warunki

**Formatowanie cen:**
```typescript
// Automatyczne formatowanie według polskiej notacji
pricePromo: 12.99 → "12,99 zł"
```

### ProductMeta
Metadane źródła:
- Logo i nazwa sklepu
- Numer strony gazetki
- ID strony (skrócony)

### ProductImagePreview
Miniatura strony gazetki:
- Lazy loading
- Hover effect z zoom ikoną
- Click otwiera PageLightbox
- Error placeholder jeśli brak obrazu

### PageLightbox
Pełnoekranowy viewer obrazu:

**Kontrolki:**
- **Mouse wheel**: Zoom in/out
- **Przyciski +/-**: Zoom
- **Przycisk 0**: Reset zoom (fit to screen)
- **Drag & Drop**: Przesuwanie zoomowanego obrazu
- **ESC**: Zamknięcie lightboxa

**Mobile:**
- Touch gestures
- Pinch-to-zoom
- Swipe to pan

## 🔧 Custom Hook: useProductDetail

Hook do pobierania szczegółów produktu z API.

```typescript
import { useProductDetail } from "@/components/hooks/useProductDetail";

function MyComponent({ productId }: { productId: string }) {
  const { 
    data,              // ProductViewModel
    isLoading,         // boolean
    isError,           // boolean
    error,             // ApiClientError | undefined
    refetch,           // () => void
    validationErrors   // string[] | undefined
  } = useProductDetail(productId);

  if (isLoading) return <div>Ładowanie...</div>;
  if (isError) return <div>Błąd: {error?.message}</div>;
  if (!data) return null;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>Cena: {data.pricePromo} zł</p>
      {validationErrors && (
        <div>Uwaga: {validationErrors.join(", ")}</div>
      )}
    </div>
  );
}
```

## 🌐 API

Hook automatycznie wywołuje:
```
GET /api/v1/products/:id
```

**Response (ProductDetailDTO):**
```typescript
{
  id: string;
  name: string;
  price_promo: number;
  price_regular: number | null;
  description: string | null;
  conditions: string | null;
  bounding_box: object | null;
  category: {
    id: string;
    name: string;
    icon_name: string | null;
  };
  page: {
    id: string;
    page_number: number;
    image_path: string | null;
    store: {
      id: string;
      name: string;
      logo_url: string | null;
    };
  };
}
```

**Mapowanie do ProductViewModel:**
- snake_case → camelCase
- Dodanie `imagePath` z `page.image_path`
- Dodanie `pageId`, `pageNumber`, `store`

## 🎯 Przykłady użycia

### Otwieranie modala programowo
```typescript
// Dodaj parametr do URL i modal się otworzy
const url = new URL(window.location.href);
url.searchParams.set("product", productId);
window.history.pushState({}, "", url.toString());
```

### Share link do produktu
```typescript
const shareUrl = `${window.location.origin}/?product=${productId}`;
await navigator.clipboard.writeText(shareUrl);
```

### Deep linking
Użytkownik wchodzi bezpośrednio na:
```
https://twoj-site.com/?product=uuid-produktu
```
Modal otworzy się automatycznie dzięki `useEffect` w `ProductBrowser`.

## ♿ Accessibility

### Keyboard Navigation
- `Tab` / `Shift+Tab` - Poruszanie się po elementach
- `ESC` - Zamknięcie modala/lightboxa
- `+` / `-` - Zoom w lightboxie
- `0` - Reset zoom w lightboxie
- `Enter` / `Space` - Aktywacja przycisków

### ARIA Labels
Wszystkie komponenty mają odpowiednie:
- `role="dialog"` dla modali
- `aria-modal="true"`
- `aria-label` dla przycisków bez tekstu
- `aria-labelledby` dla tytułów
- `aria-live` regions dla toastów

### Focus Management
- Focus trap w modalu
- Przywracanie focus po zamknięciu
- Widoczne focus indicators (rings)

## 🐛 Obsługa błędów

### Validation Errors
Jeśli produkt ma niepełne dane, wyświetlany jest warning box:
```typescript
validationErrors: ["Brak danych podstawowych produktu"]
```

### API Errors
- **400**: Nieprawidłowy UUID
- **404**: Produkt nie znaleziony
- **500**: Błąd serwera

Wszystkie z friendly message i retry button.

## 📱 Responsywność

### Mobile (< 640px)
- Modal na pełną szerokość
- Single column layout
- Sticky header
- Touch-friendly controls

### Tablet (640px - 1024px)
- Modal max-width: 3xl (48rem)
- 2 column grid (obraz + info)

### Desktop (> 1024px)
- Modal max-width: 3xl
- 3 column grid możliwy
- Hover effects

## 🚨 Known Issues / Limitations

1. **Brak cache'owania** - każde otwarcie modala = nowy fetch (TODO: React Query)
2. **Pojedyncze zdjęcie** - brak gallery dla wielu stron
3. **Pinch-to-zoom** - może wymagać dodatkowego testowania na iOS
4. **Image loading** - brak progressive loading

## 🔮 Przyszłe usprawnienia

- [ ] React Query dla cache'owania
- [ ] Gallery dla produktów na wielu stronach
- [ ] Native Share API integration
- [ ] Optimistic UI updates
- [ ] Offline support
- [ ] Image preloading dla szybszego UX
- [ ] Akcje admina (edycja produktu)

