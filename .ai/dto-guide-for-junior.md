# Przewodnik Tworzenia DTO i Command Models dla Junior Developera

## Spis Treści
1. [Wprowadzenie - Czym są DTO i Command Models?](#wprowadzenie)
2. [Dlaczego używamy TypeScript Utility Types?](#dlaczego-utility-types)
3. [Podstawowe TypeScript Utility Types](#podstawowe-utility-types)
4. [Analiza Struktury Projektu](#analiza-struktury)
5. [Katalog Wszystkich DTO i Command Models](#katalog-dto)
6. [Szczegółowe Przykłady Implementacji](#szczegolowe-przyklady)
7. [Wzorce i Best Practices](#wzorce)
8. [Checklist Implementacji](#checklist)

---

## 1. Wprowadzenie - Czym są DTO i Command Models? {#wprowadzenie}

### Co to jest DTO (Data Transfer Object)?

**DTO** to obiekt, który służy do **przenoszenia danych** między różnymi warstwami aplikacji. W naszym przypadku:
- **Z backendu do frontendu** (dane które wysyłamy w odpowiedzi API)
- **Z frontendu do backendu** (dane które otrzymujemy w żądaniu API)

#### Kluczowe cechy DTO:
1. **Nie zawiera logiki biznesowej** - to tylko struktura danych
2. **Jest zoptymalizowane pod konkretny use case** - zawiera tylko te pola, które są potrzebne
3. **Może łączyć dane z wielu tabel** - np. produkt + informacje o sklepie
4. **Może ukrywać wrażliwe informacje** - np. nie wysyłamy haseł użytkowników

### Co to jest Command Model?

**Command Model** to obiekt, który reprezentuje **intencję zmiany stanu** w systemie. To dane, które otrzymujemy gdy użytkownik chce:
- Utworzyć nowy zasób (CREATE)
- Zaktualizować istniejący zasób (UPDATE)
- Wykonać akcję biznesową

#### Kluczowe cechy Command Models:
1. **Zawiera tylko pola do zmiany** - nie zawiera ID czy timestamps
2. **Ma ścisłą walidację** - sprawdzamy czy dane są poprawne
3. **Reprezentuje intencję użytkownika** - "chcę utworzyć sklep o nazwie X"

### Przykład różnicy:

```typescript
// ENCJA BAZY DANYCH (Supabase)
// To jest cała tabela ze wszystkimi kolumnami
interface StoreEntity {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

// DTO (wysyłane do klienta)
// Zawiera tylko to, co klient potrzebuje zobaczyć
interface StoreDTO {
  id: string;
  name: string;
  logo_url: string | null;
  // NIE wysyłamy created_at i updated_at - klient ich nie potrzebuje
}

// COMMAND MODEL (otrzymywane od klienta przy tworzeniu)
// Zawiera tylko to, co użytkownik może ustawić
interface CreateStoreCommand {
  name: string;
  logo_url?: string | null;
  // NIE ma id (generowane przez bazę)
  // NIE ma timestamps (ustawiane automatycznie)
}

// COMMAND MODEL (otrzymywane od klienta przy aktualizacji)
// Wszystkie pola opcjonalne - user może zmienić tylko name lub tylko logo
interface UpdateStoreCommand {
  name?: string;
  logo_url?: string | null;
}
```

---

## 2. Dlaczego używamy TypeScript Utility Types? {#dlaczego-utility-types}

### Problem bez Utility Types

Wyobraź sobie, że piszesz typy ręcznie:

```typescript
// ❌ ZŁE PODEJŚCIE - Duplikacja kodu
interface Product {
  id: string;
  name: string;
  description: string | null;
  price_promo: number;
  price_regular: number | null;
  category_id: string;
  page_id: string;
  bounding_box: Json | null;
  conditions: string | null;
  created_at: string;
  updated_at: string;
}

// Teraz chcemy stworzyć DTO... kopiujemy ręcznie pola
interface ProductDTO {
  id: string;
  name: string;
  description: string | null;
  price_promo: number;
  price_regular: number | null;
  // ... kopiujemy wszystko ręcznie
}

// A co jeśli zmieni się Product? Musimy pamiętać o zmianie ProductDTO!
```

**Problemy:**
- Duplikacja kodu
- Ryzyko błędów (zapomnimy zaktualizować DTO)
- Trudne w utrzymaniu

### Rozwiązanie: Utility Types

```typescript
// ✅ DOBRE PODEJŚCIE - Wykorzystujemy istniejące typy
import { Tables } from './db/database.types';

// ProductEntity to alias dla typu z bazy danych
type ProductEntity = Tables<'products'>;

// DTO tworzymy AUTOMATYCZNIE na podstawie Entity
// Jeśli Product się zmieni, DTO też się zaktualizuje!
type ProductDTO = Omit<ProductEntity, 'search_vector' | 'created_at' | 'updated_at'>;
```

**Korzyści:**
- Jeden źródło prawdy (Single Source of Truth)
- TypeScript automatycznie aktualizuje typy
- Mniej błędów
- Łatwiejsze w utrzymaniu

---

## 3. Podstawowe TypeScript Utility Types {#podstawowe-utility-types}

### 3.1 `Pick<T, K>` - Wybierz określone pola

**Kiedy używać:** Gdy potrzebujesz **tylko kilka pól** z większego typu.

```typescript
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  created_at: string;
}

// Chcemy tylko id i name
type UserSummary = Pick<User, 'id' | 'name'>;

// TypeScript automatycznie tworzy:
// type UserSummary = {
//   id: string;
//   name: string;
// }
```

**Przykład użycia w projekcie:**
```typescript
// Gdy lista sklepów potrzebuje tylko podstawowych informacji
type StoreListItemDTO = Pick<StoreEntity, 'id' | 'name' | 'logo_url'>;
```

### 3.2 `Omit<T, K>` - Usuń określone pola

**Kiedy używać:** Gdy potrzebujesz **większości pól oprócz kilku**.

```typescript
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
}

// Chcemy wszystko OPRÓCZ password
type SafeUser = Omit<User, 'password'>;

// TypeScript automatycznie tworzy:
// type SafeUser = {
//   id: string;
//   email: string;
//   name: string;
//   role: string;
// }
```

**Przykład użycia w projekcie:**
```typescript
// Produkty bez wewnętrznych pól technicznych
type ProductDTO = Omit<ProductEntity, 'search_vector' | 'created_at' | 'updated_at'>;
```

### 3.3 `Partial<T>` - Wszystkie pola opcjonalne

**Kiedy używać:** Gdy **wszystkie pola są opcjonalne** - typowo w UPDATE commands.

```typescript
interface Store {
  name: string;
  logo_url: string | null;
}

type UpdateStore = Partial<Store>;

// TypeScript automatycznie tworzy:
// type UpdateStore = {
//   name?: string;
//   logo_url?: string | null;
// }
```

**Dlaczego to ważne przy UPDATE:**
- Użytkownik może chcieć zmienić tylko nazwę
- Lub tylko logo
- Lub oba pola
- Partial pozwala na wszystkie te scenariusze

### 3.4 `Required<T>` - Wszystkie pola wymagane

**Kiedy używać:** Gdy bazowy typ ma pola opcjonalne, ale **w tym kontekście muszą być wymagane**.

```typescript
interface Config {
  apiUrl?: string;
  timeout?: number;
}

type ValidatedConfig = Required<Config>;

// TypeScript automatycznie tworzy:
// type ValidatedConfig = {
//   apiUrl: string;
//   timeout: number;
// }
```

### 3.5 Łączenie Utility Types

**Najpotężniejsza technika:** Możesz łączyć utility types!

```typescript
type ProductEntity = Tables<'products'>;

// 1. Najpierw usuń pola techniczne
// 2. Potem usuń pola generowane przez bazę
// 3. Potem zrób wszystko opcjonalne
type UpdateProductCommand = Partial<
  Omit<ProductEntity, 
    'id' | 'created_at' | 'updated_at' | 'search_vector'
  >
>;
```

**Czytamy od środka na zewnątrz:**
1. Bierzemy `ProductEntity`
2. `Omit` usuwa pola: id, created_at, updated_at, search_vector
3. `Partial` robi wszystkie pozostałe pola opcjonalne

---

## 4. Analiza Struktury Projektu {#analiza-struktury}

### 4.1 Skąd pochodzą typy bazowe?

```
src/
├── db/
│   ├── database.types.ts  ← TUTAJ są definicje tabel (Supabase)
│   └── supabase.client.ts
└── types.ts               ← TUTAJ tworzymy DTO i Command Models
```

### 4.2 Jak importować typy z bazy danych?

```typescript
// W pliku src/types.ts
import type { Tables, TablesInsert, TablesUpdate, Enums } from './db/database.types';

// Tables<'nazwa_tabeli'> - zwraca typ Row (wiersz z bazy)
type StoreEntity = Tables<'stores'>;

// TablesInsert<'nazwa_tabeli'> - typ dla INSERT
type StoreInsert = TablesInsert<'stores'>;

// TablesUpdate<'nazwa_tabeli'> - typ dla UPDATE
type StoreUpdate = TablesUpdate<'stores'>;

// Enums<'nazwa_enuma'> - typ dla enumów
type FlyerStatus = Enums<'flyer_status'>;
```

### 4.3 Struktura pliku types.ts

```typescript
/**
 * src/types.ts
 * 
 * Ten plik zawiera wszystkie DTO i Command Models używane w aplikacji.
 * 
 * KONWENCJE NAZEWNICTWA:
 * - *Entity - typ encji z bazy danych (alias dla Tables<>)
 * - *DTO - typ wysyłany do klienta
 * - Create*Command - typ dla tworzenia zasobu (POST)
 * - Update*Command - typ dla aktualizacji zasobu (PATCH)
 * - *ListResponse - typ dla listy zasobów z metadanymi
 */

import type { Tables, TablesInsert, TablesUpdate, Enums } from './db/database.types';

// ============================================
// SEKCJA 1: ENTITY ALIASES
// ============================================
// Tworzymy czytelne nazwy dla typów z bazy danych
export type StoreEntity = Tables<'stores'>;
export type CategoryEntity = Tables<'categories'>;
// ... itd

// ============================================
// SEKCJA 2: DTO (Data Transfer Objects)
// ============================================
// Typy wysyłane do klienta

// ============================================
// SEKCJA 3: COMMAND MODELS
// ============================================
// Typy otrzymywane od klienta

// ============================================
// SEKCJA 4: RESPONSE TYPES
// ============================================
// Typy dla odpowiedzi API (z paginacją, itp.)
```

---

## 5. Katalog Wszystkich DTO i Command Models {#katalog-dto}

Na podstawie analizy planu API, oto kompletna lista typów do stworzenia:

### 5.1 Stores (Sklepy)

| Typ | Cel | Endpoint |
|-----|-----|----------|
| `StoreEntity` | Encja z bazy danych | - |
| `StoreDTO` | Dane sklepu dla klienta | GET /api/v1/stores |
| `StoreListItemDTO` | Uproszczone dane dla listy | GET /api/v1/stores |
| `CreateStoreCommand` | Tworzenie sklepu | POST /api/v1/stores |
| `UpdateStoreCommand` | Aktualizacja sklepu | PATCH /api/v1/stores/:id |
| `StoresListResponse` | Lista sklepów z paginacją | GET /api/v1/stores |

### 5.2 Categories (Kategorie)

| Typ | Cel | Endpoint |
|-----|-----|----------|
| `CategoryEntity` | Encja z bazy danych | - |
| `CategoryDTO` | Dane kategorii dla klienta | GET /api/v1/categories |
| `CreateCategoryCommand` | Tworzenie kategorii | POST /api/v1/categories |
| `UpdateCategoryCommand` | Aktualizacja kategorii | PATCH /api/v1/categories/:id |
| `CategoriesListResponse` | Lista kategorii | GET /api/v1/categories |

### 5.3 Flyers (Gazetki)

| Typ | Cel | Endpoint |
|-----|-----|----------|
| `FlyerEntity` | Encja z bazy danych | - |
| `FlyerDTO` | Dane gazetki dla klienta | GET /api/v1/flyers/:id |
| `FlyerListItemDTO` | Uproszczone dane z nazwą sklepu | GET /api/v1/flyers |
| `CreateFlyerCommand` | Tworzenie gazetki | POST /api/v1/flyers |
| `UpdateFlyerCommand` | Aktualizacja gazetki | PATCH /api/v1/flyers/:id |
| `FlyersListResponse` | Lista gazetek z paginacją | GET /api/v1/flyers |error_details

### 5.4 Pages (Strony gazetek)

| Typ | Cel | Endpoint |
|-----|-----|----------|
| `PageEntity` | Encja z bazy danych | - |
| `PageDTO` | Pełne dane strony | GET /api/v1/pages/:id |
| `PageListItemDTO` | Uproszczone dane dla listy | GET /api/v1/flyers/:id/pages |
| `CreatePageCommand` | Rejestracja strony | POST /api/v1/flyers/:id/pages |
| `UploadUrlRequestCommand` | Żądanie URL do uploadu | POST /api/v1/flyers/:id/pages/upload-url |
| `UploadUrlResponse` | Odpowiedź z URL | POST /api/v1/flyers/:id/pages/upload-url |
| `StartProcessingCommand` | Start przetwarzania AI | PATCH /api/v1/pages/:id/processing/start |
| `VerifyPageCommand` | Weryfikacja strony | PATCH /api/v1/pages/:id/verify |

### 5.5 Products (Produkty)

| Typ | Cel | Endpoint |
|-----|-----|----------|
| `ProductEntity` | Encja z bazy danych | - |
| `ProductDTO` | Szczegóły produktu | GET /api/v1/products/:id |
| `ProductListItemDTO` | Produkt w liście (z view) | GET /api/v1/products |
| `CreateProductCommand` | Tworzenie produktu | POST /api/v1/pages/:id/products |
| `UpdateProductCommand` | Aktualizacja produktu | PATCH /api/v1/products/:id |
| `ProductsListResponse` | Lista produktów z paginacją | GET /api/v1/products |

### 5.6 Search (Wyszukiwanie)

| Typ | Cel | Endpoint |
|-----|-----|----------|
| `SearchProductsQuery` | Parametry wyszukiwania | GET /api/v1/search/products |
| `SearchResultDTO` | Wynik wyszukiwania | GET /api/v1/search/products |

### 5.7 Common Types (Wspólne typy)

| Typ | Cel | Zastosowanie |
|-----|-----|--------------|
| `PaginationMeta` | Metadane paginacji | Wszystkie listy |
| `ApiError` | Struktura błędu | Wszystkie endpointy |
| `ApiResponse<T>` | Generic response wrapper | Wszystkie endpointy |

---

## 6. Szczegółowe Przykłady Implementacji {#szczegolowe-przyklady}

### 6.1 Stores - Kompletna implementacja

```typescript
// ============================================
// STORES
// ============================================

/**
 * StoreEntity
 * 
 * Typ reprezentujący wiersz z tabeli 'stores' w bazie danych.
 * Zawiera wszystkie kolumny włącznie z timestampami.
 * 
 * UŻYCIE: Backend, operacje bazodanowe
 */
export type StoreEntity = Tables<'stores'>;
// Typ wygenerowany automatycznie z Supabase:
// {
//   id: string;
//   name: string;
//   logo_url: string | null;
//   created_at: string;
//   updated_at: string;
// }

/**
 * StoreDTO
 * 
 * Typ wysyłany do klienta jako odpowiedź API.
 * Usuwamy timestamp pola, które nie są potrzebne frontendowi.
 * 
 * DLACZEGO Omit?
 * - Mamy 5 pól w StoreEntity
 * - Chcemy wysłać 3 pola (id, name, logo_url)
 * - Łatwiej użyć Omit niż Pick
 * 
 * UŻYCIE: GET /api/v1/stores/:id, GET /api/v1/stores
 */
export type StoreDTO = Omit<StoreEntity, 'created_at' | 'updated_at'>;

/**
 * CreateStoreCommand
 * 
 * Typ dla danych otrzymywanych przy tworzeniu nowego sklepu.
 * 
 * DLACZEGO Pick z TablesInsert?
 * - TablesInsert ma już wszystkie pola jako opcjonalne (z domyślnymi wartościami)
 * - Wybieramy tylko te, które user może ustawić
 * - id, created_at, updated_at są generowane przez bazę
 * 
 * DLACZEGO Required?
 * - 'name' musi być wymagane (walidacja biznesowa)
 * - logo_url może być null (opcjonalne)
 * 
 * UŻYCIE: POST /api/v1/stores
 */
export type CreateStoreCommand = Required<Pick<TablesInsert<'stores'>, 'name'>> & 
  Pick<TablesInsert<'stores'>, 'logo_url'>;
  
// Co TypeScript z tego zrobi:
// {
//   name: string;              // Required - musi być podane
//   logo_url?: string | null;  // Optional - może być pominięte
// }

/**
 * UpdateStoreCommand
 * 
 * Typ dla danych otrzymywanych przy aktualizacji sklepu.
 * 
 * DLACZEGO Partial?
 * - Przy aktualizacji user może zmienić tylko nazwę, tylko logo, lub oba
 * - Wszystkie pola muszą być opcjonalne
 * 
 * DLACZEGO Pick z TablesUpdate?
 * - TablesUpdate ma już wszystkie pola jako opcjonalne
 * - Wybieramy tylko te, które user może zmieniać
 * 
 * UŻYCIE: PATCH /api/v1/stores/:id
 */
export type UpdateStoreCommand = Pick<TablesUpdate<'stores'>, 'name' | 'logo_url'>;

// Co TypeScript z tego zrobi:
// {
//   name?: string;
//   logo_url?: string | null;
// }

/**
 * StoresListResponse
 * 
 * Typ dla odpowiedzi GET /api/v1/stores
 * Zawiera listę sklepów oraz metadane paginacji
 * 
 * DLACZEGO potrzebujemy tego typu?
 * - Konsystencja API - wszystkie listy mają tę samą strukturę
 * - TypeScript wymusi na nas zawsze zwracanie paginacji
 * 
 * UŻYCIE: GET /api/v1/stores
 */
export interface StoresListResponse {
  data: StoreDTO[];
  meta: PaginationMeta;
}
```

### 6.2 Products - Zaawansowany przykład

```typescript
// ============================================
// PRODUCTS
// ============================================

/**
 * ProductEntity
 * 
 * Typ reprezentujący wiersz z tabeli 'products'.
 */
export type ProductEntity = Tables<'products'>;

/**
 * ProductDTO
 * 
 * Podstawowe DTO produktu - bez pól technicznych.
 * 
 * DLACZEGO usuwamy search_vector?
 * - To pole techniczne używane tylko przez bazę danych do wyszukiwania
 * - Klient nie potrzebuje tego widzieć
 * - Typ 'unknown' nie jest serializowalny do JSON
 * 
 * DLACZEGO usuwamy timestamps?
 * - W większości przypadków klient nie potrzebuje tych informacji
 * - Zmniejszamy rozmiar odpowiedzi API
 * 
 * UŻYCIE: GET /api/v1/products/:id
 */
export type ProductDTO = Omit<ProductEntity, 'search_vector' | 'created_at' | 'updated_at'>;

/**
 * ProductListItemDTO
 * 
 * DTO używane w listach produktów.
 * Bazuje na view `v_active_products` który łączy dane z wielu tabel.
 * 
 * DLACZEGO używamy Tables<'v_active_products'>?
 * - To VIEW w bazie danych (nie tabela)
 * - Tables<> działa też dla views!
 * - View już zawiera połączone dane (produkt + sklep + kategoria)
 * 
 * DLACZEGO Omit<..., 'page_image_path'>?
 * - Lista produktów nie potrzebuje ścieżki do obrazu strony
 * - To szczegół potrzebny tylko w widoku szczegółów
 * 
 * WAŻNE: View zwraca wszystkie pola jako nullable (string | null)
 * bo SQL JOIN może nie znaleźć pasujących rekordów.
 * 
 * UŻYCIE: GET /api/v1/products, GET /api/v1/search/products
 */
export type ProductListItemDTO = Omit<Tables<'v_active_products'>, 'page_image_path'>;

/**
 * CreateProductCommand
 * 
 * Typ dla tworzenia produktu przez admina w panelu weryfikacji.
 * 
 * ANALIZA:
 * 1. Bazujemy na TablesInsert<'products'>
 * 2. Usuwamy pola generowane przez system:
 *    - id (UUID generowane przez bazę)
 *    - created_at, updated_at (timestamps automatyczne)
 *    - search_vector (generowane przez trigger w bazie)
 * 3. Usuwamy page_id - dlaczego?
 *    - page_id będzie w URL: POST /api/v1/pages/:page_id/products
 *    - Nie powinno być w body żeby uniknąć konfliktu URL vs body
 * 4. Wymagamy category_id, name, price_promo - to pola obowiązkowe biznesowo
 * 5. Reszta pól jest opcjonalna
 * 
 * UŻYCIE: POST /api/v1/pages/:page_id/products
 */
export type CreateProductCommand = 
  // Krok 1: Usuń pola generowane przez system
  Omit<TablesInsert<'products'>, 
    'id' | 'created_at' | 'updated_at' | 'search_vector' | 'page_id'
  > & 
  // Krok 2: Wymuszamy wymagane pola
  Required<Pick<TablesInsert<'products'>, 'category_id' | 'name' | 'price_promo'>>;

// Rezultat:
// {
//   category_id: string;           // Required
//   name: string;                  // Required
//   price_promo: number;           // Required
//   price_regular?: number | null; // Optional
//   description?: string | null;   // Optional
//   conditions?: string | null;    // Optional
//   bounding_box?: Json | null;    // Optional
// }

/**
 * UpdateProductCommand
 * 
 * Typ dla aktualizacji produktu.
 * 
 * ANALIZA:
 * - Bazujemy na TablesUpdate (wszystkie pola już opcjonalne)
 * - Usuwamy pola których user nie może zmieniać
 * - Nie trzeba dodawać Partial bo TablesUpdate już to ma
 * 
 * UŻYCIE: PATCH /api/v1/products/:id
 */
export type UpdateProductCommand = Omit<TablesUpdate<'products'>, 
  'id' | 'page_id' | 'created_at' | 'updated_at' | 'search_vector'
>;
```

### 6.3 Flyers - Złożone relacje

```typescript
// ============================================
// FLYERS
// ============================================

export type FlyerEntity = Tables<'flyers'>;

/**
 * FlyerDTO
 * 
 * DTO dla pojedynczej gazetki.
 * Zawiera podstawowe informacje o gazetce.
 * 
 * UŻYCIE: GET /api/v1/flyers/:id (podstawowe info)
 */
export type FlyerDTO = Omit<FlyerEntity, 'created_at' | 'updated_at'>;

/**
 * FlyerListItemDTO
 * 
 * DTO dla listy gazetek - zawiera dodatkowo nazwę sklepu.
 * 
 * DLACZEGO &?
 * - Chcemy POŁĄCZYĆ dwa typy w jeden
 * - FlyerDTO (dane gazetki) + informacje o sklepie
 * 
 * DLACZEGO Pick<StoreEntity, 'name'>?
 * - Potrzebujemy tylko nazwy sklepu
 * - Ale UWAGA: to spowoduje konflikt nazw!
 * - FlyerDTO ma store_id, a my dodajemy 'name' ze Store
 * 
 * ROZWIĄZANIE:
 * - Zmieniamy nazwę pola używając custom interface
 * 
 * UŻYCIE: GET /api/v1/flyers
 */
export type FlyerListItemDTO = FlyerDTO & {
  store_name: string; // Nazwa sklepu (z JOIN)
};

/**
 * FlyerDetailDTO
 * 
 * Szczegółowe DTO z listą stron (opcjonalnie).
 * 
 * KIEDY używać?
 * - GET /api/v1/flyers/:id?include=pages
 * 
 * DLACZEGO optional array?
 * - pages? oznacza że to pole może nie istnieć
 * - Zależy od query params (include=pages)
 */
export type FlyerDetailDTO = FlyerListItemDTO & {
  pages?: PageListItemDTO[];
};

/**
 * CreateFlyerCommand
 * 
 * WALIDACJA BIZNESOWA:
 * - valid_from i valid_to muszą być podane
 * - valid_to >= valid_from (sprawdzamy w handler'ze)
 * - status domyślnie 'draft'
 */
export type CreateFlyerCommand = 
  Required<Pick<TablesInsert<'flyers'>, 'store_id' | 'valid_from' | 'valid_to'>> &
  Pick<TablesInsert<'flyers'>, 'status'>;

/**
 * UpdateFlyerCommand
 * 
 * WALIDACJA BIZNESOWA:
 * - Jeśli zmienia się valid_to lub valid_from, sprawdź poprawność dat
 */
export type UpdateFlyerCommand = Pick<TablesUpdate<'flyers'>, 
  'valid_from' | 'valid_to' | 'status'
>;
```

### 6.4 Wspólne typy pomocnicze

```typescript
// ============================================
// COMMON TYPES & UTILITIES
// ============================================

/**
 * PaginationMeta
 * 
 * Standardowe metadane paginacji dla wszystkich list.
 * 
 * DLACZEGO potrzebujemy tego?
 * - Konsystencja API
 * - Klient zawsze wie jak parsować odpowiedź
 * - TypeScript wymusza te pola
 */
export interface PaginationMeta {
  total: number;      // Całkowita liczba rekordów
  page: number;       // Aktualna strona (1-indexed)
  per_page: number;   // Liczba rekordów na stronę
  total_pages: number; // Całkowita liczba stron
}

/**
 * CursorPaginationMeta
 * 
 * Alternatywna paginacja oparta na kursorach (dla dużych zbiorów danych).
 * 
 * KIEDY używać?
 * - Gdy offset pagination jest zbyt wolna
 * - Dla real-time feedów
 * - Gdy kolejność może się zmieniać
 */
export interface CursorPaginationMeta {
  next_cursor: string | null; // Token do następnej strony
  has_more: boolean;           // Czy są jeszcze dane?
}

/**
 * ApiError
 * 
 * Standardowa struktura błędu zgodna z RFC 7807 (Problem Details).
 * 
 * UŻYCIE: Wszystkie endpointy w przypadku błędu
 */
export interface ApiError {
  error: {
    code: string;           // Kod błędu (np. "VALIDATION_ERROR")
    message: string;        // Komunikat dla użytkownika
    details?: Record<string, string[]>; // Szczegóły (np. błędy walidacji pól)
  };
}

/**
 * ApiResponse<T>
 * 
 * Generic wrapper dla odpowiedzi API.
 * 
 * DLACZEGO Generic?
 * - Możemy użyć dla różnych typów danych
 * - ApiResponse<StoreDTO>
 * - ApiResponse<ProductDTO>
 * - TypeScript automatycznie wywnioskuje typ
 */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta | CursorPaginationMeta;
}

/**
 * ApiListResponse<T>
 * 
 * Odpowiedź dla endpointów zwracających listy.
 */
export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

---

## 7. Wzorce i Best Practices {#wzorce}

### 7.1 Wzorzec: Entity → DTO

```typescript
// WZORZEC:
// Entity (z bazy) → DTO (do klienta)

// Krok 1: Alias dla Entity
export type XEntity = Tables<'nazwa_tabeli'>;

// Krok 2: DTO usuwający pola techniczne
export type XDTO = Omit<XEntity, 'created_at' | 'updated_at'>;

// Zastosowanie dla wszystkich zasobów: Stores, Categories, Flyers, Pages, Products
```

### 7.2 Wzorzec: CREATE Command

```typescript
// WZORZEC:
// Command dla POST endpoint

// Opcja A: Gdy większość pól jest wymagana
export type CreateXCommand = Omit<TablesInsert<'nazwa_tabeli'>, 
  'id' | 'created_at' | 'updated_at' | 'pola_generowane'
> & Required<Pick<TablesInsert<'nazwa_tabeli'>, 'pole_wymagane1' | 'pole_wymagane2'>>;

// Opcja B: Gdy tylko kilka pól
export type CreateXCommand = Required<Pick<TablesInsert<'nazwa_tabeli'>, 
  'pole1' | 'pole2'
>> & Pick<TablesInsert<'nazwa_tabeli'>, 'pole_opcjonalne1'>;
```

### 7.3 Wzorzec: UPDATE Command

```typescript
// WZORZEC:
// Command dla PATCH endpoint

// Prosty przypadek:
export type UpdateXCommand = Pick<TablesUpdate<'nazwa_tabeli'>, 
  'pole1' | 'pole2' | 'pole3'
>;

// Wszystkie pola już opcjonalne w TablesUpdate!
```

### 7.4 Wzorzec: List Response

```typescript
// WZORZEC:
// Odpowiedź dla GET endpoint zwracającego listę

export interface XListResponse {
  data: XDTO[];
  meta: PaginationMeta;
}

// Lub używając Generic:
export type XListResponse = ApiListResponse<XDTO>;
```

### 7.5 Wzorzec: Detail z relacjami

```typescript
// WZORZEC:
// DTO z zagnieżdżonymi relacjami

// Bazowe DTO
export type ProductDTO = Omit<ProductEntity, 'search_vector' | 'created_at' | 'updated_at'>;

// DTO z relacjami (JOIN)
export type ProductDetailDTO = ProductDTO & {
  category: Pick<CategoryEntity, 'id' | 'name' | 'icon_name'>;
  page: Pick<PageEntity, 'id' | 'image_path' | 'page_number'>;
  store: Pick<StoreEntity, 'id' | 'name' | 'logo_url'>;
};
```

### 7.6 Best Practice: Komentarze JSDoc

```typescript
/**
 * [Nazwa typu]
 * 
 * [Krótki opis co reprezentuje]
 * 
 * DLACZEGO [wyjaśnienie decyzji projektowych]:
 * - Punkt 1
 * - Punkt 2
 * 
 * UŻYCIE: [gdzie jest używany]
 * 
 * @example
 * const example: TypeName = {
 *   field1: 'value',
 *   field2: 123
 * };
 */
export type TypeName = ...;
```

### 7.7 Best Practice: Kolejność definicji

W pliku `src/types.ts` zachowaj kolejność:

```typescript
// 1. Importy
import type { Tables, TablesInsert, TablesUpdate, Enums } from './db/database.types';

// 2. Wspólne typy (używane przez wszystkie)
export interface PaginationMeta { ... }
export interface ApiError { ... }

// 3. Entity aliases
export type StoreEntity = Tables<'stores'>;
export type CategoryEntity = Tables<'categories'>;
// ... wszystkie entity

// 4. Dla każdego zasobu (grupujemy razem):
// ============================================
// STORES
// ============================================
export type StoreDTO = ...;
export type CreateStoreCommand = ...;
export type UpdateStoreCommand = ...;
export interface StoresListResponse = ...;

// ============================================
// CATEGORIES  
// ============================================
// ... itd.
```

### 7.8 Best Practice: Walidacja biznesowa

```typescript
/**
 * CreateFlyerCommand
 * 
 * WALIDACJA BIZNESOWA (do implementacji w handler'ze):
 * 1. valid_to >= valid_from (sprawdzić przed INSERT)
 * 2. store_id musi istnieć w bazie (foreign key constraint)
 * 3. Daty w formacie YYYY-MM-DD (Zod schema)
 * 
 * BŁĘDY:
 * - 400 Bad Request - jeśli valid_to < valid_from
 * - 404 Not Found - jeśli store_id nie istnieje
 * - 422 Unprocessable Entity - jeśli daty są w przeszłości
 */
export type CreateFlyerCommand = ...;
```

---

## 8. Checklist Implementacji {#checklist}

### Przygotowanie

- [ ] Przeczytaj cały przewodnik
- [ ] Zrozum różnicę między Entity, DTO i Command Model
- [ ] Zrozum działanie TypeScript Utility Types
- [ ] Przeanalizuj plik `database.types.ts`
- [ ] Przeanalizuj plik `api-plan.md`

### Implementacja

#### Krok 1: Struktura pliku
- [ ] Stwórz plik `src/types.ts`
- [ ] Dodaj importy z `./db/database.types`
- [ ] Dodaj sekcję komentarzy wyjaśniających konwencje

#### Krok 2: Wspólne typy
- [ ] Zdefiniuj `PaginationMeta`
- [ ] Zdefiniuj `ApiError`
- [ ] Zdefiniuj `ApiResponse<T>`
- [ ] Zdefiniuj `ApiListResponse<T>`

#### Krok 3: Entity Aliases
- [ ] Stwórz alias dla każdej tabeli (StoreEntity, CategoryEntity, ...)
- [ ] Stwórz alias dla enumów (FlyerStatus, PageProcessingStatus, UserRole)

#### Krok 4: Implementacja dla każdego zasobu

Dla **STORES**:
- [ ] `StoreDTO`
- [ ] `CreateStoreCommand`
- [ ] `UpdateStoreCommand`
- [ ] `StoresListResponse`

Dla **CATEGORIES**:
- [ ] `CategoryDTO`
- [ ] `CreateCategoryCommand`
- [ ] `UpdateCategoryCommand`
- [ ] `CategoriesListResponse`

Dla **FLYERS**:
- [ ] `FlyerDTO`
- [ ] `FlyerListItemDTO` (z store_name)
- [ ] `FlyerDetailDTO` (opcjonalnie z pages)
- [ ] `CreateFlyerCommand`
- [ ] `UpdateFlyerCommand`
- [ ] `FlyersListResponse`

Dla **PAGES**:
- [ ] `PageDTO`
- [ ] `PageListItemDTO`
- [ ] `CreatePageCommand`
- [ ] `UploadUrlRequestCommand`
- [ ] `UploadUrlResponse`
- [ ] `StartProcessingCommand`
- [ ] `VerifyPageCommand`
- [ ] `PagesListResponse`

Dla **PRODUCTS**:
- [ ] `ProductDTO`
- [ ] `ProductListItemDTO` (z view)
- [ ] `ProductDetailDTO` (z relacjami)
- [ ] `CreateProductCommand`
- [ ] `UpdateProductCommand`
- [ ] `ProductsListResponse`

Dla **SEARCH**:
- [ ] `SearchProductsQuery`
- [ ] `SearchResultDTO`

#### Krok 5: Dokumentacja
- [ ] Każdy typ ma komentarz JSDoc
- [ ] Komentarze wyjaśniają DLACZEGO (nie tylko CO)
- [ ] Komentarze zawierają informację o użyciu (endpoint)
- [ ] Złożone typy mają przykłady

#### Krok 6: Walidacja
- [ ] Sprawdź czy wszystkie typy z API Plan są pokryte
- [ ] Sprawdź czy nazwy są konsystentne (Entity, DTO, Command, Response)
- [ ] Sprawdź czy nie ma duplikacji
- [ ] Uruchom TypeScript compiler (`tsc --noEmit`)

#### Krok 7: Review
- [ ] Przejrzyj każdy typ i upewnij się że rozumiesz dlaczego tak wygląda
- [ ] Sprawdź czy wszystkie typy są eksportowane (`export type/interface`)
- [ ] Sprawdź czy kolejność jest logiczna

---

## Pytania i odpowiedzi

### Q: Kiedy używać `Pick`, a kiedy `Omit`?

**Zasada:**
- Jeśli potrzebujesz **mniej niż połowy pól** → użyj `Pick`
- Jeśli potrzebujesz **więcej niż połowy pól** → użyj `Omit`

**Przykład:**
```typescript
interface User { a, b, c, d, e, f, g, h }

// Potrzebujesz tylko a, b → Pick
type A = Pick<User, 'a' | 'b'>;

// Potrzebujesz wszystkiego oprócz g, h → Omit  
type B = Omit<User, 'g' | 'h'>;
```

### Q: Dlaczego `TablesInsert` zamiast `Tables`?

**Odpowiedź:**

`Tables` = typ dla **odczytu z bazy** (wszystkie pola required)
`TablesInsert` = typ dla **wstawiania do bazy** (pola z domyślnymi wartościami są optional)

```typescript
// Tables<'stores'>
{
  id: string;              // Required
  name: string;            // Required
  logo_url: string | null; // Required
  created_at: string;      // Required
  updated_at: string;      // Required
}

// TablesInsert<'stores'>
{
  id?: string;              // Optional (UUID generowane)
  name: string;             // Required
  logo_url?: string | null; // Optional (domyślnie null)
  created_at?: string;      // Optional (domyślnie now())
  updated_at?: string;      // Optional (domyślnie now())
}
```

CREATE command powinien bazować na `TablesInsert` bo te pola są już opcjonalne.

### Q: Co jeśli potrzebuję zmienić typ pola?

**Przykład:** Baza zwraca string, ale API potrzebuje Date object.

```typescript
// ❌ Nie możemy zmienić typu w alias
export type ProductDTO = Tables<'products'>; // created_at to string

// ✅ Możemy nadpisać pole
export type ProductDTO = Omit<Tables<'products'>, 'created_at' | 'updated_at'> & {
  created_at: Date;  // Nadpisujemy typ
  updated_at: Date;
};
```

### Q: Jak obsłużyć zagnieżdżone relacje?

**Przykład:** Produkt z kategorią i sklepem.

```typescript
// Opcja 1: Płaska struktura (łatwiejsza dla SQL)
export type ProductWithRelations = ProductDTO & {
  category_name: string;
  category_icon: string;
  store_name: string;
  store_logo: string | null;
};

// Opcja 2: Zagnieżdżona struktura (bardziej obiektowa)
export type ProductWithRelations = ProductDTO & {
  category: {
    id: string;
    name: string;
    icon_name: string;
  };
  store: {
    id: string;
    name: string;
    logo_url: string | null;
  };
};
```

**Rekomendacja:** Użyj opcji 1 (płaska) jeśli bazujesz na VIEW, opcji 2 jeśli robisz JOIN w kodzie.

### Q: Jak obsłużyć pola opcjonalne z API ale wymagane w bazie?

**Problem:** `price_regular` jest `number | null` w bazie, ale API zawsze wysyła wartość.

```typescript
// Bazowy typ (z bazy)
type ProductEntity = Tables<'products'>; // price_regular: number | null

// DTO z wymuszonym polem
export type ProductDTO = Omit<ProductEntity, 'price_regular'> & {
  price_regular: number; // Zawsze jest wartość (null przekształcamy na 0)
};
```

---

## Zakończenie

Ten przewodnik pokazuje:
- **CO** tworzymy (DTO i Command Models)
- **DLACZEGO** używamy Utility Types
- **JAK** je implementować krok po kroku
- **GDZIE** używamy każdego typu

**Następne kroki:**
1. Przeczytaj cały przewodnik
2. Przeanalizuj przykłady
3. Użyj checklisty do implementacji
4. Pytaj jeśli coś jest niejasne!

**Pamiętaj:**
- Entity = dane z bazy danych
- DTO = dane do klienta
- Command = dane od klienta
- Utility Types = narzędzia do tworzenia typów z innych typów

Powodzenia! 🚀
