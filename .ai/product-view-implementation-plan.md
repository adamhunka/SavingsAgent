# Plan implementacji widoku Product Detail (Modal / Lightbox)

## 1. Przegląd

Widok Product Detail (modal/lightbox) służy do prezentacji szczegółowych informacji o wybranej ofercie produktowej pobranej z gazetki: pełna nazwa, ceny (promocyjna i regularna), opis (waga/producent/wariant), kategoria, data ważności, oraz link/akces do podglądu źródłowej strony gazetki (image viewer z zoomem). Widok otwierany jako modal nad listą produktów (ścieżka modalna nad `/`) i musi wspierać dostępność (focus trap, esc zamyka, aria).

Główne cele:
- Umożliwić szybkie sprawdzenie szczegółów oferty bez zmiany kontekstu listy.
- Zapewnić możliwość przejścia do podglądu źródłowej strony gazetki (lightbox image viewer).
- Udostępnić wszystkie pola wymagane przez API `/api/v1/products/:id`.

## 2. Routing widoku

- Modal nad stroną główną: ścieżka routingu powinna być `/:?product=:id` lub wykorzystać system modal routing frontendu (np. `/?modal=product&id={id}`), jednocześnie tworząc history entry dla bezpośredniego linku do produktu: `/product/:id` (opcjonalnie jako samodzielna strona obsługująca ten sam komponent modalowy).
- Zachować zgodność z istniejącą nawigacją (np. kliknięcie karty produktu ustawia URL `/?product={id}` lub `#/product/{id}`) i umożliwia bezpośrednie odczytanie parametru URL do otwarcia modala.

## 3. Struktura komponentów

- ProductModal (kontener, modal)
  - ProductHeader (nazwa, akcje: zamknij, share, link do strony gazetki)
  - ProductContent
    - ProductInfo (ceny, opis, kategoria, warunki)
    - ProductMeta (sklep, data ważności, źródło)
    - ProductActions (przyciski: "Zobacz gazetkę" → otwiera Page Lightbox)
  - ProductImagePreview (thumbnail/mały podgląd strony z linkiem do pełnego viewer)
  - PageLightbox (oddzielny komponent modalowy do przeglądania obrazu strony z zoomem)

Diagram drzewa (wysokopoziom):

- ProductModal
  - ProductHeader
  - ProductContent
    - ProductImagePreview
    - ProductInfo
    - ProductMeta
    - ProductActions
  - PageLightbox

## 4. Szczegóły komponentów

### ProductModal
- Opis: Główny kontener modala zarządzający lifecycle: fetch danych produktu, ładowanie stanu, error handling, focus trap, klawisz ESC zamyka.
- Główne elementy:
  - overlay div (click poza modal zamyka)
  - dialog div z rolą `dialog` i `aria-modal="true"`
  - miejsce na `ProductHeader` i `ProductContent`
- Obsługiwane zdarzenia:
  - open(productId) — inicjuje fetch
  - close() — zamyka modal i przywraca focus
  - onError() — pokazuje komunikat błędu (toasty/modal error)
- Walidacja:
  - productId musi być poprawnym UUID (walidacja przed fetch)
  - Jeżeli odpowiedź 404 → pokazać "Produkt nie znaleziony"
  - Jeżeli brak danych krytycznych (np. brak price_promo) → pokazać etykietę "Brak danych"
- Typy:
  - Props: { productId: string, onClose: () => void }
  - Używane DTO: `ProductDetailDTO` (z `src/types.ts`)

### ProductHeader
- Opis: Pasek tytułowy: nazwa produktu, przyciski zamknij, udostępnij, link do strony.
- Elementy: h1 nazwa, ikony przycisków (button type=button)
- Zdarzenia: onClose click, onShare click (kopiuj link), onOpenSource click (otwiera PageLightbox)
- Walidacja: nazwa powinna być stringiem; jeśli długa — truncation + tooltip
- Typy: Props: { name: string, onClose: ()=>void, onOpenSource: ()=>void }

### ProductImagePreview
- Opis: Mały podgląd miniatury strony gazetki (jeżeli dostępna `page.image_path`), kliknięcie otwiera PageLightbox.
- Elementy: img z srcset, placeholder gdy brak obrazu
- Zdarzenia: onClick → otwórz PageLightbox
- Walidacja: image_path może być null — wtedy ukryć lub pokazać placeholder
- Typy: Props: { imagePath?: string, alt?: string, onOpen: ()=>void }

### ProductInfo
- Opis: Wyświetla ceny, description, conditions, bounding box info (jeżeli potrzebne), i kategorię.
- Elementy: price_promo (duży), price_regular (przekreślona, jeśli dostępna), description blok tekstu, conditions (badge), category chip z ikoną
- Zdarzenia: brak (czysto prezentacyjny), ewentualne expand/collapse dla długich opisów
- Walidacja:
  - price_promo: liczba > 0
  - price_regular: number | null (jeżeli present, > price_promo zazwyczaj)
  - description, conditions: stringy (możliwe null)
- Typy: Props: Partial<ProductDetailDTO> (fields: price_promo, price_regular, description, conditions, category)

### ProductMeta
- Opis: Pokazuje sklep (store.name), data ważności gazetki, link do strony źródłowej (page.id)
- Elementy: store name (link), valid_to/valid_from, badge verified_by (opcjonalne)
- Zdarzenia: kliknięcie nazwy sklepu filtruje listę (opcjonalne)
- Typy: Props: { page: { id: string, page_number: number, image_path?: string, store: { id: string, name: string } }, flyerMeta? }

### ProductActions
- Opis: Przycisk otwierający PageLightbox ("Zobacz gazetkę"), przycisk kopiuj link, ewentualne akcje admina (edytuj — tylko jeśli role/admin)
- Elementy: buttony, ikony
- Zdarzenia: onViewSource, onCopyLink, onEdit (admin)
- Walidacja: akcje zależne od uprawnień; jeśli brak `page` → button disabled
- Typy: Props: { onViewSource: ()=>void, isAdmin?: boolean, onEdit?: ()=>void }

### PageLightbox
- Opis: Pełny viewer obrazka strony gazetki; obsługa zoomu, pinch-to-zoom, keyboard nav (esc close), focus trap.
- Elementy: canvas/svg/img z srcset, controls: zoom in/out, fit to screen, download
- Zdarzenia: onClose, onZoom, onRotate (opcjonalnie)
- Walidacja: imagePath musi być poprawnym URL; fallback gdy fetch obrazu zawiedzie
- Typy: Props: { imagePath: string, alt?: string, onClose: ()=>void }

## 5. Typy

Wykorzystujemy istniejące typy z `src/types.ts`:
- `ProductDetailDTO` — główny DTO zwracany przez GET `/api/v1/products/:id`. Pola istotne dla widoku:
  - id: string
  - name: string
  - category: { id: string; name: string; icon_name?: string }
  - price_promo: number
  - price_regular: number | null
  - description: string | null
  - conditions: string | null
  - bounding_box?: object | null
  - page: { id: string; page_number: number; image_path?: string; store: { id: string; name: string; logo_url?: string } }

Proponowane dodatkowe ViewModely (front-end):
- `ProductViewModel`
  - id: string
  - name: string
  - category: { id: string; name: string; iconName?: string }
  - pricePromo: number
  - priceRegular?: number | null
  - description?: string | null
  - conditions?: string | null
  - imagePath?: string
  - pageId?: string
  - store: { id: string; name: string; logoUrl?: string }

Uwagi:
- Mapowanie API → ViewModel wykonywane centralnie w hooku/fn `useProductDetail` aby uprościć komponenty.

## 6. Zarządzanie stanem

Zalecane podejście:
- Lokalny stan modalowy + custom hook `useProductDetail(productId)`:
  - zwraca { data?: ProductViewModel, isLoading: boolean, isError: boolean, error?: ApiError, refetch: ()=>void }
  - obsługuje fetch, transformację DTO → ViewModel, cache krótkoterminowy (np. SWR/React Query lub własny cache)
  - walidacja ID i statusów HTTP (404 → not found)
- Globalny store (jeśli używane np. React Query): zarejestrować zapytanie `productDetail:{id}` z krótkim TTL; przy otwieraniu modala najpierw sprawdzić cache.
- Stan widoku w `ProductModal`:
  - isOpen: boolean
  - isViewerOpen (PageLightbox): boolean
  - currentImagePath: string | undefined
  - focusElementBeforeOpen: HTMLElement | null

Custom hook:
- `useProductDetail(productId: string)`:
  - implementacja: fetch GET `/api/v1/products/${id}`, map to ProductViewModel, handle errors
  - użyć fetch wrappera, obsłużyć headers, timeout, retry (1x) przy sieciowych błędach

## 7. Integracja API

Endpoint:
- GET `/api/v1/products/:id`
  - Request: GET, path param `id` (UUID)
  - Response: `ApiResponse<ProductDetailDTO>` (status 200)
  - Error cases: 400 (invalid id), 404 (not found), 500 (server)

Front-end:
- request URL: `/api/v1/products/${id}`
- parse response JSON, jeśli `response.status === 200` → use `response.data` as ProductDetailDTO
- mapować do `ProductViewModel`

Przykładowe shape request/response:
- Request: GET none body
- Successful response:
  {
    data: { /* ProductDetailDTO */ }
  }

Walidacja po stronie frontu:
- sprawdzić, czy `data` zawiera `id`, `name`, `price_promo`, `page` z `store`
- jeśli brak pól krytycznych → traktować jako partial render z etykietą "Brak danych"

## 8. Interakcje użytkownika

Lista kluczowych interakcji i oczekiwane rezultaty:
- Kliknięcie karty produktu:
  - akcja: open ProductModal z productId
  - wynik: modal ładuje dane (skeleton), potem pokazuje treść
- ESC lub klik poza modal:
  - zamyka modal, przywraca focus
- Kliknięcie "Zobacz gazetkę":
  - otwiera PageLightbox z obrazem `page.image_path`
  - wynik: użytkownik może zoomować, przewijać stronę
- Kliknij "Kopiuj link":
  - kopiuje bezpośredni link do produktu (np. `/product/${id}`) do schowka, pokaż toast "Skopiowano"
- Błąd fetch:
  - pokaż komunikat i przycisk "Spróbuj ponownie"
- 404:
  - pokaż "Produkt nie znaleziony", przycisk Zamknij

## 9. Warunki i walidacja

Warunki do sprawdzania po stronie interfejsu:
- `productId` musi być non-empty i w formacie UUID (walidacja regexp lub biblioteka)
- `price_promo` musi być liczbą > 0 — inaczej oznaczyć jako brak ceny
- `price_regular` jeśli dostępna, powinna być >= 0 — render jako przekreślona
- `page.image_path` jeżeli brak → disable "Zobacz gazetkę"
- uprawnienia admina (dla akcji edycji) — sprawdzać poprzez globalny kontekst/auth (supabase auth klient) i ukryć przyciski jeśli brak uprawnień

Implementacja walidacji:
- Validate early in `useProductDetail` and zwróć `validationErrors` w hooku; UI decyduje co renderować (partial vs full)

## 10. Obsługa błędów

Potencjalne scenariusze:
- 400 (bad id) — walidacja inputu przed fetch, natychmiastowy toast/error bez zapytania
- 404 — komunikat "Produkt nie znaleziony" w modalnym oknie
- 500 lub network error — retry policy (1 retry), jeśli niepowodzenie → toast + "Spróbuj ponownie"
- brak pól krytycznych — partial render z widocznym komunikatem/piktogramem "Brak danych"
- błąd ładowania obrazu w PageLightbox — placeholder + opcja "Pobierz obraz" lub "Zamknij"

UX error handling:
- Skeleton loader podczas ładowania
- Friendly error messages (po polsku)
- Przyciski akcji: "Spróbuj ponownie" uruchamia refetch

## 11. Kroki implementacji

1. Utworzyć hook `useProductDetail(productId: string)` w `src/lib/hooks/useProductDetail.ts`:
   - fetch GET `/api/v1/products/:id`
   - mapowanie DTO → ProductViewModel
   - expose: { data, isLoading, isError, error, refetch, validationErrors }

2. Dodać komponent `ProductModal` w `src/components/products/ProductModal.tsx`:
   - implementacja layoutu modala, focus trap, keyboard shortcuts
   - integrate `useProductDetail`

3. Zaimplementować podkomponenty:
   - `ProductHeader`, `ProductInfo`, `ProductMeta`, `ProductActions`, `ProductImagePreview`, `PageLightbox`
   - każde w `src/components/products/` (plik per komponent)

4. Dodać stylowanie z Tailwind zgodne z design systemem/shadcn/ui i zapewnić responsywność mobile-first.

5. Obsłużyć routing modalny:
   - integracja z routerem (ustawienie URL przy open/close)
   - obsługa bezpośredniego wejścia na `/product/:id` otwierającego modal

6. Integracja uprawnień:
   - pobrać info o roli użytkownika z istniejącego kontekstu/auth; ukryć akcje admin

7. Testy wizualne i manualne:
   - sprawdzić przypadki: brak obrazu, brak price_regular, błędy 404/500, długie nazwy

8. Accessibility (A11Y):
   - focus trap, aria labels, keyboard navigation (tab, esc), kontrast kolorów

9. Drobne optymalizacje:
   - cache odpowiedzi (React Query/SWR)
   - lazy-load obrazów w PageLightbox, progressive loading

10. Finalizacja:
   - zaakceptować i zamknąć taski w TODO (aktualizacja statusów)
   - dodać krótką instrukcję dev README fragment w `src/components/products/README.md` (opcjonalnie)

--- 

Plik przygotowany zgodnie z PRD (US-008), opisanym endpointem `/api/v1/products/:id` i typami w `src/types.ts`. Implementacja powinna być zgodna z tech stackiem: Astro + React (komponenty klienta), TypeScript, Tailwind i shadcn/ui.
