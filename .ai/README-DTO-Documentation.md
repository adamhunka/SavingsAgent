# Dokumentacja DTO i Command Models - README

## 📚 Przegląd Dokumentacji

Ta dokumentacja została stworzona, aby pomóc Junior Developerowi w tworzeniu typów DTO (Data Transfer Objects) i Command Models dla projektu SavingsAgent. Dokumentacja jest podzielona na kilka dokumentów, z których każdy służy innemu celowi.

## 🎯 Dla kogo jest ta dokumentacja?

Ta dokumentacja jest przeznaczona dla programisty, który:
- Ma podstawową znajomość TypeScript
- Nigdy wcześniej nie tworzył DTO i Command Models
- Potrzebuje zrozumieć DLACZEGO i JAK tworzy się te typy
- Chce nauczyć się best practices i wzorców projektowych

## 📖 Struktura Dokumentacji

### 1. [dto-guide-for-junior.md](./dto-guide-for-junior.md) - ZACZNIJ TUTAJ! 🚀

**Dla kogo:** Junior developer, który chce zrozumieć podstawy od zera.

**Co zawiera:**
- Czym są DTO i Command Models? (proste wyjaśnienie)
- Dlaczego używamy TypeScript Utility Types?
- Szczegółowe wyjaśnienie każdego utility type (Pick, Omit, Partial, itp.)
- Analiza struktury projektu
- Kompletny katalog wszystkich DTO do stworzenia
- Szczegółowe przykłady dla każdego zasobu (Stores, Categories, Flyers, Products, Pages)
- Wzorce i best practices
- Checklist implementacji krok po kroku

**Długość:** ~7000 linii  
**Czas czytania:** 2-3 godziny  
**Poziom:** Początkujący → Średniozaawansowany

**Kiedy czytać:**
- Pierwszego dnia pracy z DTO
- Gdy nie rozumiesz podstawowych pojęć
- Gdy potrzebujesz systematycznego wprowadzenia

---

### 2. [dto-technical-analysis.md](./dto-technical-analysis.md) - Głębsze Zrozumienie 🔬

**Dla kogo:** Developer, który rozumie podstawy i chce zgłębić temat.

**Co zawiera:**
- Dlaczego separacja Entity/DTO/Command jest ważna? (problemy bez separacji)
- Wzorce architektoniczne (Layered Architecture, Data Flow)
- Zaawansowany TypeScript Type System:
  - Jak działają Mapped Types?
  - Conditional Types
  - Template Literal Types
  - Intersection vs Union
- Szczegółowa analiza każdego zasobu API:
  - Stores - prosty CRUD
  - Categories - ordering i constraints
  - Flyers - dates i status workflow
  - Pages - processing pipeline
  - Products - złożone relacje
  - Search - query patterns
- Edge cases i problemy:
  - Nullable vs Optional
  - Enum types
  - JSON fields
  - Timestamp handling
  - Recursive types
- Performance i optymalizacja:
  - DTO size optimization
  - N+1 query problem
  - Pagination strategies (offset vs cursor)
  - Caching
- Testing strategy

**Długość:** ~1500 linii  
**Czas czytania:** 3-4 godziny  
**Poziom:** Średniozaawansowany → Zaawansowany

**Kiedy czytać:**
- Po przeczytaniu przewodnika dla junior
- Gdy chcesz zrozumieć "dlaczego" za decyzjami projektowymi
- Gdy napotkasz skomplikowany problem
- Gdy chcesz optymalizować swój kod

---

### 3. [dto-practical-examples.md](./dto-practical-examples.md) - Gotowy Kod 💻

**Dla kogo:** Developer, który chce zobaczyć działający kod.

**Co zawiera:**
- **Pełna implementacja types.ts** - gotowa do copy-paste:
  - Wszystkie Entity aliases
  - Wszystkie Enum aliases
  - Wszystkie DTO dla każdego zasobu
  - Wszystkie Command Models
  - Wszystkie Response types
  - Common types (PaginationMeta, ApiError, itp.)
  - Custom types (BoundingBox, AIExtractionResponse)
  - Type guards
- **Zod schemas** - kompletne schema dla walidacji:
  - Schemas dla wszystkich Command Models
  - Refinements dla business rules
  - Custom validators
- **API handlers** - przykłady implementacji:
  - GET list endpoint (z paginacją i filtrami)
  - POST create endpoint (z auth, validation, error handling)
  - PATCH update endpoint
- **Mappers** - kompletne mapper classes:
  - Entity → DTO
  - Command → Insert/Update
  - JSON parsing
- **Frontend usage** - przykłady użycia w React:
  - Fetching data
  - Formularze z validation
  - Type-safe components

**Długość:** ~1000 linii  
**Czas czytania:** 1-2 godziny (+ copy-paste)  
**Poziom:** Wszystkie poziomy

**Kiedy używać:**
- Gdy potrzebujesz szybko skopiować działający kod
- Jako reference implementation
- Gdy uczysz się przez przykłady
- Podczas implementacji konkretnych features

---

### 4. [dto-cheatsheet.md](./dto-cheatsheet.md) - Szybka Ściągawka 📋

**Dla kogo:** Każdy developer, który potrzebuje szybkiego przypomnienia.

**Co zawiera:**
- Quick reference - konwencje nazewnictwa
- TypeScript Utility Types - tabela
- 8 wzorców implementacji z przykładami:
  1. Prosty DTO (bez timestamps)
  2. Create Command (większość pól wymagana)
  3. Create Command (tylko kilka pól)
  4. Update Command
  5. List Item DTO (z relacją)
  6. Detail DTO (zagnieżdżone relacje)
  7. List Response
  8. Override JSON field
- Biblioteka gotowych fragmentów:
  - Wspólne typy (PaginationMeta, ApiError, etc.)
  - Entity aliases (copy-paste)
  - Enum aliases
- Zod schemas - wzorce:
  - Basic field schemas
  - Schema z refinement
- Mapper functions - templates
- API handler templates:
  - GET list
  - POST create
  - PATCH update
- Najczęstsze błędy i rozwiązania (5 błędów)
- Checklist implementacji
- Pro Tips (10 wskazówek)

**Długość:** ~400 linii  
**Czas czytania:** 15-30 minut  
**Poziom:** Wszystkie poziomy

**Kiedy używać:**
- Codziennie podczas kodowania
- Gdy zapomniałeś jakiegoś wzorca
- Jako quick reference
- Przed code review
- Przy debugowaniu

---

## 🗺️ Mapa Nauki - Recommended Learning Path

### Ścieżka dla Beginnera (0 → Hero):

```
1. [dto-guide-for-junior.md] 
   ├─ Sekcja 1-3: Podstawy (1h)
   │  └─ Czym są DTO, dlaczego utility types, podstawy Pick/Omit/Partial
   │
   ├─ Sekcja 4-5: Struktura i katalog (30min)
   │  └─ Zrozumienie struktury projektu, lista wszystkich typów do stworzenia
   │
   ├─ [dto-practical-examples.md] - Sekcja 1 (30min)
   │  └─ Zobacz pełną implementację types.ts
   │
   ├─ [dto-guide-for-junior.md] - Sekcja 6 (2h)
   │  └─ Przeczytaj szczegółowe przykłady dla 2-3 zasobów
   │
   ├─ PRAKTYKA: Spróbuj sam stworzyć typy dla 1 zasobu (1h)
   │
   ├─ [dto-cheatsheet.md] - Cała (30min)
   │  └─ Przejrzyj wzorce i zapamiętaj gdzie czego szukać
   │
   ├─ [dto-practical-examples.md] - Sekcje 2-3 (1h)
   │  └─ Zod schemas i API handlers
   │
   ├─ PRAKTYKA: Implementuj handlers dla 1-2 zasobów (2h)
   │
   └─ [dto-technical-analysis.md] - Wybrane sekcje (2h)
      └─ Przeczytaj sekcje relevantne do problemów które napotkałeś
```

**Całkowity czas:** ~10-12 godzin (rozłożone na 2-3 dni)

### Ścieżka dla Intermediate Developera (chcę zrozumieć głębiej):

```
1. [dto-cheatsheet.md] - Quick scan (15min)
   └─ Szybki przegląd wzorców

2. [dto-practical-examples.md] - Sekcja 1 (30min)
   └─ Zobacz pełną implementację

3. [dto-technical-analysis.md] - Całość (3-4h)
   └─ Głębokie zrozumienie architektury i decyzji

4. [dto-guide-for-junior.md] - Sekcje 6-7 (1h)
   └─ Best practices i wzorce

5. PRAKTYKA: Implementacja + optymalizacja (4h)
```

**Całkowity czas:** ~8-10 godzin

### Ścieżka "Potrzebuję szybko zrobić":

```
1. [dto-practical-examples.md] - Sekcja 1 (10min)
   └─ Copy-paste types.ts

2. [dto-cheatsheet.md] - Wzorce (10min)
   └─ Znajdź wzorzec dla swojego przypadku

3. [dto-practical-examples.md] - Sekcje 2-3 (20min)
   └─ Copy-paste Zod schemas i handlers

4. Dostosuj do swoich potrzeb (1-2h)

5. Wróć do [dto-guide-for-junior.md] gdy coś niejasne
```

**Całkowity czas:** 2-3 godziny (minimum viable implementation)

---

## 🎯 Jak Używać Tej Dokumentacji?

### Scenario 1: "Mam zadanie: stwórz DTO dla Products"

1. Otwórz [dto-cheatsheet.md](./dto-cheatsheet.md)
2. Znajdź wzorzec który pasuje (np. "DTO z relacjami")
3. Otwórz [dto-practical-examples.md](./dto-practical-examples.md)
4. Znajdź sekcję Products (Ctrl+F "PRODUCTS")
5. Copy-paste implementację
6. Dostosuj do swojego przypadku
7. Jeśli coś niejasne → [dto-guide-for-junior.md](./dto-guide-for-junior.md) sekcja 6.5

### Scenario 2: "Nie rozumiem czym są DTO"

1. Otwórz [dto-guide-for-junior.md](./dto-guide-for-junior.md)
2. Przeczytaj sekcję 1 (Wprowadzenie)
3. Przeczytaj przykład w sekcji 1
4. Otwórz [dto-technical-analysis.md](./dto-technical-analysis.md)
5. Przeczytaj sekcję 1 (Dlaczego separacja jest ważna)

### Scenario 3: "Mam błąd: Type 'X' is not assignable to type 'Y'"

1. Otwórz [dto-cheatsheet.md](./dto-cheatsheet.md)
2. Sekcja "Najczęstsze błędy"
3. Jeśli nie znalazłeś → [dto-technical-analysis.md](./dto-technical-analysis.md) sekcja 5 (Edge cases)
4. Jeśli dalej problem → [dto-guide-for-junior.md](./dto-guide-for-junior.md) sekcja Q&A

### Scenario 4: "Chcę zoptymalizować mój kod"

1. Otwórz [dto-technical-analysis.md](./dto-technical-analysis.md)
2. Sekcja 6 (Performance i optymalizacja)
3. Implementuj sugestie
4. Sprawdź wzorce w [dto-cheatsheet.md](./dto-cheatsheet.md) sekcja "Pro Tips"

### Scenario 5: "Potrzebuję napisać Zod schema"

1. Otwórz [dto-cheatsheet.md](./dto-cheatsheet.md)
2. Sekcja "Zod Schemas - Wzorce"
3. Znajdź podobny case
4. Dla złożonych validacji → [dto-practical-examples.md](./dto-practical-examples.md) sekcja 2

---

## 📊 Porównanie Dokumentów

| Feature | Junior Guide | Technical Analysis | Practical Examples | Cheatsheet |
|---------|-------------|-------------------|-------------------|------------|
| **Dla kogo** | Beginners | Intermediate+ | Everyone | Everyone |
| **Cel** | Nauczanie | Głębokie zrozumienie | Reference | Quick lookup |
| **Styl** | Tutorial | Analysis | Code | Reference |
| **Przykłady kodu** | Średnio | Mało | Dużo | Średnio |
| **Teoria** | Dużo | Bardzo dużo | Mało | Mało |
| **Copy-paste** | Nie | Nie | Tak | Tak |
| **Długość** | Długi | Średni | Długi | Krótki |
| **Aktualizacje** | Rzadko | Rzadko | Często | Często |

---

## 🔍 Index - Gdzie Znaleźć Konkretne Tematy

### Podstawy TypeScript

| Temat | Gdzie szukać |
|-------|-------------|
| Pick, Omit, Partial | Junior Guide § 3 |
| Mapped Types | Technical Analysis § 3.1 |
| Conditional Types | Technical Analysis § 3.2 |
| Type Guards | Practical Examples § 1 (końcówka) |
| Intersection vs Union | Technical Analysis § 3.4 |

### Wzorce DTO

| Wzorzec | Gdzie szukać |
|---------|-------------|
| Prosty DTO | Junior Guide § 6.1, Cheatsheet "Wzorzec 1" |
| DTO z relacjami | Junior Guide § 6.3, Cheatsheet "Wzorzec 5" |
| DTO z JSON fields | Technical Analysis § 5.3, Cheatsheet "Wzorzec 8" |
| List Response | Junior Guide § 6.1, Cheatsheet "Wzorzec 7" |

### Command Models

| Wzorzec | Gdzie szukać |
|---------|-------------|
| Create Command | Junior Guide § 6.1-6.5, Cheatsheet "Wzorzec 2-3" |
| Update Command | Junior Guide § 6.1-6.5, Cheatsheet "Wzorzec 4" |
| Validation | Practical Examples § 2, Cheatsheet "Zod Schemas" |

### Zasoby API

| Zasób | Junior Guide | Technical Analysis | Practical Examples |
|-------|-------------|-------------------|-------------------|
| Stores | § 6.1 | § 4.1 | § 1 "STORES" |
| Categories | § 6.1 | § 4.2 | § 1 "CATEGORIES" |
| Flyers | § 6.3 | § 4.3 | § 1 "FLYERS" |
| Pages | § 6.4 | § 4.4 | § 1 "PAGES" |
| Products | § 6.2 | § 4.5 | § 1 "PRODUCTS" |
| Search | § 6.2 | § 4.6 | § 1 "SEARCH" |

### Problemy i Rozwiązania

| Problem | Gdzie szukać |
|---------|-------------|
| Nullable vs Optional | Technical Analysis § 5.1 |
| Enum handling | Technical Analysis § 5.2 |
| JSON fields | Technical Analysis § 5.3 |
| Timestamp handling | Technical Analysis § 5.4 |
| N+1 queries | Technical Analysis § 6.2 |
| Pagination | Technical Analysis § 6.3 |

### Implementacja

| Co | Gdzie szukać |
|----|-------------|
| Pełny types.ts | Practical Examples § 1 |
| Zod schemas | Practical Examples § 2 |
| API handlers | Practical Examples § 3 |
| Mappers | Practical Examples § 4 |
| Frontend usage | Practical Examples § 5 |
| Templates | Cheatsheet - wszystkie sekcje |

---

## ✅ Checklist: "Czy jestem gotowy do implementacji?"

Po przeczytaniu dokumentacji, sprawdź czy rozumiesz:

### Podstawy (musisz wiedzieć)
- [ ] Czym jest Entity, DTO i Command Model?
- [ ] Różnica między Pick i Omit
- [ ] Różnica między Partial i Required
- [ ] Różnica między optional (?) i nullable (| null)
- [ ] Kiedy używać Tables, TablesInsert, TablesUpdate
- [ ] Jak importować typy z database.types.ts

### Praktyka (musisz umieć)
- [ ] Stworzyć prosty DTO (np. StoreDTO)
- [ ] Stworzyć Create Command z required fields
- [ ] Stworzyć Update Command (wszystkie optional)
- [ ] Napisać Zod schema z basic validation
- [ ] Napisać API handler GET z paginacją
- [ ] Napisać API handler POST z validation

### Zaawansowane (nice to have)
- [ ] Rozumiesz dlaczego separujemy Entity/DTO/Command
- [ ] Potrafisz napisać Zod refinement
- [ ] Potrafisz stworzyć mapper class
- [ ] Rozumiesz problemy z N+1 queries
- [ ] Rozumiesz cursor vs offset pagination

Jeśli masz wszystkie ✅ w "Podstawy" i "Praktyka" - jesteś gotowy!

---

## 🆘 Wsparcie i Pytania

### Mam pytanie które nie jest covered w dokumentacji

1. Sprawdź Index powyżej
2. Użyj Ctrl+F w odpowiednim dokumencie
3. Przeczytaj sekcję Q&A w [dto-guide-for-junior.md](./dto-guide-for-junior.md)
4. Przeczytaj "Najczęstsze błędy" w [dto-cheatsheet.md](./dto-cheatsheet.md)
5. Jeśli dalej problem - pytaj seniora!

### Znalazłem błąd w dokumentacji

1. Zapisz co i gdzie
2. Zanotuj jaki powinno być prawidłowe rozwiązanie
3. Zgłoś do team leada
4. Po aktualizacji - sprawdź czy fix jest OK

### Dokumentacja jest nieaktualna

Jeśli zmieni się:
- Database schema → zaktualizuj sekcje o Entity
- API endpoints → zaktualizuj sekcje o konkretnych zasobach
- Wzorce projektowe → dodaj nową sekcję w Technical Analysis

---

## 📈 Postęp Nauki - Self Assessment

### Level 0: Beginner
- [ ] Przeczytałem Junior Guide sekcje 1-3
- [ ] Rozumiem różnicę między Entity/DTO/Command
- [ ] Znam podstawowe utility types

### Level 1: Junior
- [ ] Przeczytałem cały Junior Guide
- [ ] Stworzyłem DTO dla 2-3 zasobów
- [ ] Napisałem podstawowe Zod schemas
- [ ] Zaimplementowałem 2-3 API endpoints

### Level 2: Intermediate
- [ ] Przeczytałem Technical Analysis
- [ ] Rozumiem zaawansowane wzorce
- [ ] Potrafię debugować problemy z typami
- [ ] Napisałem mapper classes
- [ ] Rozumiem performance considerations

### Level 3: Advanced
- [ ] Rozumiem wszystkie edge cases
- [ ] Potrafię optymalizować zapytania
- [ ] Piszę własne generic types
- [ ] Mentoruje innych w temacie DTO
- [ ] Mogę rozszerzyć dokumentację

---

## 🎓 Kolejne Kroki Po Opanowaniu DTO

1. **Walidacja zaawansowana** - Custom Zod validators, transform schemas
2. **Testing** - Unit tests dla mappers, integration tests dla API
3. **Documentation** - Automatyczne generowanie API docs z typów (TypeDoc)
4. **Code Generation** - Generowanie kodu z OpenAPI schema
5. **Advanced patterns** - CQRS, Event Sourcing, Domain-Driven Design

---

## 📝 Changelog

**2025-11-27** - Stworzenie początkowej dokumentacji
- dto-guide-for-junior.md - Kompleksowy przewodnik
- dto-technical-analysis.md - Głęboka analiza techniczna
- dto-practical-examples.md - Gotowe przykłady kodu
- dto-cheatsheet.md - Szybka ściągawka
- README-DTO-Documentation.md - Ten dokument

---

## 💬 Feedback

Ta dokumentacja została stworzona z myślą o junior developerze, który nigdy nie pracował z DTO i Command Models. Jeśli coś jest niejasne, zbyt skomplikowane, lub brakuje jakiejś informacji - zgłoś to! Dokumentacja powinna ewoluować z Twoimi potrzebami.

---

**Powodzenia w nauce i implementacji! 🚀**

Pamiętaj: Każdy senior developer kiedyś był junior. Różnica polega tylko na liczbie popełnionych (i naprawionych!) błędów. Nie bój się eksperymentować i pytać!
