# Dokument wymagań produktu (PRD) - SavingsAgent

## 1. Przegląd produktu

SavingsAgent to aplikacja typu web, mająca na celu agregację i strukturyzację ofert promocyjnych z gazetek popularnych dyskontów (początkowo Lidl i Biedronka). System rozwiązuje problem rozproszonych informacji o promocjach, przekształcając obrazy gazetek w przeszukiwalną bazę danych przy użyciu technologii OCR i LLM.

Produkt składa się z dwóch głównych interfejsów:
1. Panel Administratora (Back-office) - służący do ręcznego wgrywania gazetek, uruchamiania przetwarzania AI oraz weryfikacji/korekty danych.
2. Aplikacja Kliencka - służąca do przeglądania, filtrowania i wyszukiwania ofert przez zalogowanych użytkowników.

Głównym celem MVP jest dostarczenie funkcjonalnego pipeline'u "od obrazka do bazy danych" przy zachowaniu ścisłej kontroli kosztów operacyjnych (model AI) oraz zapewnienie wysokiej jakości danych dzięki weryfikacji manualnej.

## 2. Problem użytkownika

Obecnie konsumenci chcący znaleźć najlepsze promocje muszą:
* Przeglądać wiele różnych stron internetowych lub aplikacji dedykowanych dla każdego sklepu osobno.
* Manualnie przeglądać cyfrowe wersje papierowych gazetek, co jest czasochłonne i niewygodne na urządzeniach mobilnych.
* Brak jest możliwości szybkiego wyszukania konkretnego produktu (np. "masło") we wszystkich aktualnych gazetkach jednocześnie.
* Porównywanie ofert jest utrudnione ze względu na brak ustrukturyzowanych danych (tylko obrazy).

## 3. Wymagania funkcjonalne

### 3.1. Uwierzytelnianie i Autoryzacja
* System oparty o Supabase Auth.
* Logowanie wymagane dla wszystkich użytkowników (Email + Hasło).
* Role użytkowników:
    * Administrator: Pełny dostęp do panelu uploadu, przetwarzania i edycji danych.
    * Użytkownik: Dostęp wyłącznie do odczytu (przeglądanie listy ofert).

### 3.2. Panel Administratora (Back-office)
* Dostępny i optymalizowany pod Desktop.
* **Zarządzanie Gazetkami:**
    * Tworzenie nowej gazetki (Wybór sklepu: Lidl/Biedronka, zakres dat obowiązywania).
    * Upload plików stron (formaty JPG/PNG).
    * Kompresja obrazów po stronie klienta przed wysłaniem do serwera.
* **Przetwarzanie AI:**
    * Ręczne wyzwalanie procesu przetwarzania dla wybranych stron ("Manual Trigger").
    * Pipeline: OCR -> LLM -> Ekstrakcja danych (JSON).
    * Obsługa błędów przetwarzania z możliwością ponowienia ("Retry").
    * Logika pomijania stron nie zawierających produktów.
* **Weryfikacja i Edycja (Split-screen):**
    * Widok podzielony: po jednej stronie podgląd oryginalnego obrazu strony gazetki, po drugiej formularz z wyekstrahowanymi produktami.
    * Możliwość edycji każdego pola produktu: Nazwa, Cena promocyjna, Cena regularna, Opis, Warunki.
    * Akcje: "Zatwierdź bez zmian", "Zapisz zmiany", "Usuń produkt", "Odrzuć stronę".
    * Kaskadowe usuwanie danych (usunięcie gazetki usuwa powiązane strony i produkty).

### 3.3. Aplikacja Kliencka (Frontend)
* Responsywny interfejs (RWD) działający na Mobile i Desktop.
* **Przeglądanie Ofert:**
    * Lista produktów ładowana w modelu Lazy Loading (infinite scroll lub paginacja).
    * Karty produktów zawierające: Nazwę, Cenę promocyjną, Cenę regularną (przekreśloną), Opis, Nazwę sklepu, Datę ważności.
    * Wizualizacja kategorii za pomocą predefiniowanych ikon (zamiast wycinków zdjęć produktów).
    * Możliwość podglądu pełnego obrazu strony gazetki, z której pochodzi oferta (modal/lightbox).
* **Filtrowanie i Sortowanie:**
    * Filtr sklepu (multiselect: Lidl, Biedronka).
    * Filtr kategorii (z zamkniętej listy zdefiniowanej w systemie).
    * Sortowanie: Od najniższej ceny, Od najnowszej gazetki.
* **Wyszukiwanie:**
    * Pasek wyszukiwania obsługujący zapytania tekstowe.
    * Wykorzystanie PostgreSQL Full Text Search.
    * Przeszukiwanie pól: Nazwa produktu, Opis (producent).

### 3.4. Struktura Danych i Logika Biznesowa
* **Kategorie:** Sztywna, zamknięta lista kategorii narzucona w systemie i prompcie AI (np. Owoce/Warzywa, Nabiał, Mięso, Pieczywo, Napoje, Słodycze, Chemia, Inne).
* **Model Produktu:**
    * Rozdzielenie "Opisu" (waga, producent, wariant) od "Warunków" (np. "przy zakupie 2 sztuk").
    * Przechowywanie ceny promocyjnej i regularnej (jeśli dostępna).
    * Brak deduplikacji ofert między sklepami – każda oferta jest unikalna dla danej gazetki.

## 4. Granice produktu

* **Formaty plików:** Obsługa wyłącznie JPG/PNG. Brak obsługi plików PDF (wymagana konwersja zewnętrzna przed uploadem).
* **Zasięg sklepów:** MVP ograniczone do dwóch sieci: Lidl i Biedronka.
* **Język:** Interfejs i dane wyłącznie w języku polskim.
* **Zakres funkcjonalności Użytkownika:**
    * Brak funkcji koszyka zakupowego.
    * Brak listy ulubionych.
    * Brak powiadomień (Push/Email).
    * Brak historii cen.
* **Automatyzacja:** Brak crawlerów pobierających gazetki automatycznie. Proces pozyskiwania obrazów jest ręczny.
* **Normalizacja:** Brak zaawansowanej normalizacji jednostek (np. przeliczania wszystkiego na 1kg) i nazw produktów (brak słownika marek).

## 5. Historyjki użytkowników

### Uwierzytelnianie

#### US-001 Logowanie do systemu
**Tytuł:** Jako użytkownik (Admin/User), chcę się zalogować przy użyciu adresu email i hasła, aby uzyskać dostęp do aplikacji.
**Opis:** System musi wymuszać autoryzację przed dostępem do jakichkolwiek treści. Wykorzystujemy Supabase Auth.
**Kryteria akceptacji:**
1. Użytkownik widzi ekran logowania po wejściu na stronę główną (jeśli nie jest zalogowany).
2. Po podaniu poprawnych danych następuje przekierowanie do odpowiedniego widoku (Dashboard dla Admina, Lista ofert dla Użytkownika).
3. Po podaniu błędnych danych wyświetlany jest komunikat błędu.
4. Sesja użytkownika jest utrzymywana.

### Panel Administratora

#### US-002 Upload stron gazetki
**Tytuł:** Jako Administrator, chcę wgrać pliki obrazów (JPG/PNG) wybranej gazetki, aby zasilić system nowymi danymi.
**Opis:** Administrator wybiera sklep i daty, a następnie wgrywa pliki. Pliki są kompresowane w przeglądarce przed wysłaniem.
**Kryteria akceptacji:**
1. Możliwość wyboru wielu plików jednocześnie (drag & drop lub wybór z dysku).
2. Walidacja formatu plików (tylko JPG/PNG).
3. Obrazy są automatycznie kompresowane przed uploadem.
4. Po udanym uploadzie pliki są widoczne na liście stron gazetki ze statusem "Oczekuje na przetworzenie".

#### US-003 Ręczne uruchomienie przetwarzania AI
**Tytuł:** Jako Administrator, chcę ręcznie uruchomić przetwarzanie AI dla wgranych stron, aby kontrolować koszty i moment ekstrakcji danych.
**Opis:** Przycisk przy każdej stronie lub "Przetwórz wszystkie" uruchamia pipeline OCR+LLM.
**Kryteria akceptacji:**
1. Akcja wyzwala cloud function/endpoint odpowiedzialny za analizę obrazu.
2. Status strony zmienia się na "Przetwarzanie".
3. Po zakończeniu status zmienia się na "Do weryfikacji" (sukces) lub "Błąd" (niepowodzenie).
4. System pomija puste strony lub oznacza je jako "Brak produktów".

#### US-004 Weryfikacja i edycja danych (Split-screen)
**Tytuł:** Jako Administrator, chcę widzieć podgląd strony obok formularza z danymi, aby szybko zweryfikować poprawność ekstrakcji.
**Opis:** Interfejs dzieli ekran: lewa strona to zoomowalny obraz gazetki, prawa to lista formularzy z produktami wykrytymi na tej stronie.
**Kryteria akceptacji:**
1. Wyświetlenie obrazu strony z możliwością przybliżania.
2. Wyświetlenie listy edytowalnych pól dla każdego produktu (Nazwa, Cena, Kategoria, Opis).
3. Możliwość ręcznego dodania brakującego produktu.
4. Możliwość usunięcia błędnie wykrytego produktu.
5. Przycisk "Zatwierdź" przenosi produkty ze statusu roboczego do publicznie widocznych ("Verified").

### Aplikacja Kliencka

#### US-005 Przeglądanie listy ofert
**Tytuł:** Jako Użytkownik, chcę przeglądać listę produktów z podziałem na sklepy, aby zapoznać się z aktualnymi promocjami.
**Opis:** Główny widok aplikacji prezentujący kafelki/listę produktów.
**Kryteria akceptacji:**
1. Produkty są ładowane dynamicznie (lazy loading) w miarę przewijania.
2. Każdy produkt wyświetla: cenę, nazwę, sklep, ikonę kategorii.
3. Domyślne sortowanie prezentuje najatrakcyjniejsze cenowo lub najnowsze oferty.

#### US-006 Filtrowanie ofert
**Tytuł:** Jako Użytkownik, chcę filtrować produkty po sklepie i kategorii, aby zawęzić wyniki do moich zainteresowań.
**Opis:** Filtry dostępne w nagłówku lub panelu bocznym.
**Kryteria akceptacji:**
1. Możliwość zaznaczenia jednego lub obu sklepów (Lidl, Biedronka).
2. Możliwość wyboru kategorii z listy (np. tylko "Nabiał").
3. Lista produktów odświeża się natychmiast lub po zatwierdzeniu filtrów.

#### US-007 Wyszukiwanie produktów
**Tytuł:** Jako Użytkownik, chcę wyszukać produkt po nazwie lub producencie, aby szybko znaleźć konkretną rzecz.
**Opis:** Wyszukiwarka tekstowa działająca w oparciu o FTS bazy danych.
**Kryteria akceptacji:**
1. Wpisanie frazy (np. "kawa") zwraca listę pasujących produktów.
2. Wyszukiwanie uwzględnia literówki (w miarę możliwości konfiguracji PostgreSQL) lub dopasowania częściowe.
3. Wyniki wyszukiwania można dalej filtrować (np. "kawa" tylko w sklepie "Lidl").

#### US-008 Podgląd źródła oferty
**Tytuł:** Jako Użytkownik, chcę zobaczyć oryginalną stronę gazetki dla wybranego produktu, aby sprawdzić szczegóły wizualne oferty.
**Opis:** Kliknięcie w ofertę lub ikonę "zobacz gazetkę" otwiera podgląd strony.
**Kryteria akceptacji:**
1. Wyświetlenie modala/widoku z obrazem strony gazetki.
2. Obraz jest czytelny na urządzeniach mobilnych (możliwość zoomu).

## 6. Metryki sukcesu

### KPI Jakości Danych
* **Wskaźnik poprawności automatycznej:** ≥ 80% produktów powinno być zatwierdzanych przez Administratora przyciskiem "Zatwierdź bez zmian" (bez konieczności ręcznej edycji pól).
* **Brak "False Positives" na pustych stronach:** System powinien w 95% przypadków poprawnie identyfikować strony niebędące ofertami (np. reklamy wizerunkowe, spisy treści) i nie generować dla nich fałszywych rekordów produktów.

### KPI Wydajności i Kosztów
* **Koszt przetworzenia:** Średni koszt przetworzenia jednej strony gazetki (OCR + LLM) nie może przekraczać $0.05.
* **Czas weryfikacji:** Średni czas spędzony przez Administratora na weryfikacji jednej strony gazetki powinien wynosić poniżej 30 sekund.

### KPI Użyteczności
* **Retencja użytkowników:** Procent użytkowników powracających do aplikacji w kolejnym cyklu promocyjnym (tygodniowym).

