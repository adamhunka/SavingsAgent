# Plan Testowania Widoku Upload Flow

## Status Serwera
✅ Serwer deweloperski uruchomiony: http://localhost:3000/
✅ Brak błędów kompilacji
✅ Wszystkie komponenty zaimplementowane

## Przygotowanie do Testów

### 1. Wymagania Wstępne

**Dane testowe w bazie:**
- Użytkownik z rolą `admin`
- Przynajmniej jeden sklep w tabeli `stores`
- Przynajmniej jedna gazetka w tabeli `flyers` (status: `draft` lub `active`)

**Pliki testowe:**
Przygotuj kilka obrazów w formatach:
- ✅ JPG (np. zdjęcie gazetki z telefonu)
- ✅ PNG (np. screen z PDF)
- ✅ WEBP (opcjonalnie)

Różne rozmiary:
- Mały: ~500KB
- Średni: ~2-5MB
- Duży: ~10-20MB
- Bardzo duży: >40MB (do testowania limitu)

### 2. Sprawdzenie Danych Testowych

**Krok 1: Zaloguj się jako admin**
```
1. Otwórz: http://localhost:3000/login
2. Zaloguj się jako użytkownik z rolą admin
3. Sprawdź czy przekierowuje do panelu admina
```

**Krok 2: Sprawdź czy masz gazetki**
```sql
-- W Supabase SQL Editor lub przez Supabase Studio:
SELECT 
  f.id,
  f.status,
  f.valid_from,
  f.valid_to,
  s.name as store_name
FROM flyers f
JOIN stores s ON f.store_id = s.id
WHERE f.status IN ('draft', 'active')
ORDER BY f.created_at DESC
LIMIT 5;
```

**Krok 3: Skopiuj UUID gazetki**
```
Zapisz UUID z kolumny `id` - będzie potrzebne do testów
```

## Scenariusze Testowe

### Scenariusz 1: Podstawowy Upload (Happy Path)

**Cel:** Weryfikacja pełnego flow uploadu pojedynczego pliku

**Kroki:**
1. Przejdź do: `http://localhost:3000/admin/flyers/{FLYER_UUID}/upload`
2. Sprawdź czy wyświetla się panel z informacjami o gazetce
3. Przeciągnij jeden plik JPG (2-5MB) do strefy dropzone
4. Sprawdź czy:
   - ✅ Plik pojawia się w kolejce
   - ✅ Wyświetla się preview obrazu
   - ✅ Pokazują się informacje o pliku (rozmiar, wymiary)
   - ✅ Przycisk "Rozpocznij upload" jest aktywny
5. Kliknij "Rozpocznij upload"
6. Obserwuj postęp:
   - ✅ Status zmienia się: pending → validating → compressing → signing → uploading → registering → success
   - ✅ Progress bar aktualizuje się (0-100%)
   - ✅ Ikony zmieniają się odpowiednio do statusu
7. Po zakończeniu:
   - ✅ Status: success (zielony)
   - ✅ Progress: 100%
   - ✅ Statystyki pokazują: 1 success

**Oczekiwany wynik:** ✅ Plik uploadowany pomyślnie, strona utworzona w bazie

**Weryfikacja w bazie:**
```sql
SELECT 
  p.id,
  p.page_number,
  p.image_path,
  p.image_width,
  p.image_height,
  p.processing_status
FROM pages p
WHERE p.flyer_id = '{FLYER_UUID}'
ORDER BY p.page_number DESC
LIMIT 1;
```

---

### Scenariusz 2: Upload Wielu Plików

**Cel:** Weryfikacja równoległego uploadu

**Kroki:**
1. Odśwież stronę: `http://localhost:3000/admin/flyers/{FLYER_UUID}/upload`
2. Przeciągnij 5 plików JPG jednocześnie
3. Sprawdź czy:
   - ✅ Wszystkie pliki w kolejce
   - ✅ Numery stron przydzielone automatycznie (kontynuacja od ostatniej)
   - ✅ Preview dla wszystkich plików
4. Kliknij "Rozpocznij upload"
5. Obserwuj:
   - ✅ Maksymalnie 3 pliki uploadowane jednocześnie
   - ✅ Pozostałe czekają w statusie pending
   - ✅ Każdy plik ma własny progress bar
6. Po zakończeniu:
   - ✅ Wszystkie pliki ze statusem success
   - ✅ Statystyki: 5 success

**Oczekiwany wynik:** ✅ Wszystkie 5 plików uploadowane, strony utworzone

---

### Scenariusz 3: Drag & Drop vs Wybór z Dysku

**Cel:** Weryfikacja obu metod dodawania plików

**Test A - Drag & Drop:**
1. Odśwież stronę
2. Przeciągnij 1 plik nad dropzone
3. Sprawdź wizualizację "drag over" (highlight, zmiana koloru)
4. Upuść plik
5. ✅ Plik dodany do kolejki

**Test B - Wybór z dysku:**
1. Kliknij przycisk "Wybierz pliki" lub obszar dropzone
2. Wybierz 2 pliki z dysku
3. ✅ Oba pliki dodane do kolejki

**Test C - Mix:**
1. Przeciągnij 1 plik
2. Kliknij i wybierz 2 pliki
3. ✅ Wszystkie 3 pliki w kolejce

---

### Scenariusz 4: Walidacja Plików

**Cel:** Weryfikacja odrzucania nieprawidłowych plików

**Test A - Nieprawidłowy format:**
1. Spróbuj przeciągnąć plik PDF lub DOCX
2. ✅ Toast/banner z błędem: "Nieprawidłowy format"
3. ✅ Plik nie dodany do kolejki

**Test B - Zbyt duży plik:**
1. Spróbuj przeciągnąć plik >50MB
2. ✅ Toast/banner z błędem: "Plik zbyt duży"
3. ✅ Plik nie dodany do kolejki

**Test C - Duplikat:**
1. Dodaj plik "test.jpg"
2. Spróbuj dodać ten sam plik ponownie
3. ✅ Toast/banner: "Plik już dodany do kolejki"

**Test D - Limit plików:**
1. Spróbuj dodać 51 plików jednocześnie
2. ✅ Tylko 50 pierwszych dodanych
3. ✅ Banner: "Maksymalnie 50 plików"

---

### Scenariusz 5: Obsługa Błędów - Retry

**Cel:** Weryfikacja mechanizmu retry dla nieudanych uploadów

**Symulacja błędu:**
1. Dodaj 1 plik do kolejki
2. **Wyłącz internet** (lub użyj DevTools Network → Offline)
3. Kliknij "Rozpocznij upload"
4. Sprawdź:
   - ✅ Status zmienia się na: error
   - ✅ Wyświetla się komunikat błędu
   - ✅ Ikona błędu (czerwony X)
   - ✅ Przycisk "Ponów" jest aktywny

**Retry:**
1. **Włącz internet**
2. Kliknij "Ponów" przy pliku z błędem
3. ✅ Upload rozpoczyna się ponownie
4. ✅ Tym razem kończy się sukcesem

---

### Scenariusz 6: Anulowanie Uploadu

**Cel:** Weryfikacja anulowania procesu

**Kroki:**
1. Dodaj 10 plików do kolejki (większe pliki ~5MB)
2. Kliknij "Rozpocznij upload"
3. **Podczas uploadu** (gdy 2-3 pliki są w trakcie):
4. Kliknij "Anuluj wszystkie"
5. Sprawdź:
   - ✅ Aktywne uploady przerywane
   - ✅ Pliki w trakcie otrzymują status: cancelled
   - ✅ Pliki pending pozostają pending
   - ✅ Przycisk "Rozpocznij upload" znowu aktywny

**Wznowienie:**
1. Kliknij "Rozpocznij upload" ponownie
2. ✅ Tylko pliki pending są uploadowane
3. ✅ Anulowane pliki można usunąć

---

### Scenariusz 7: Opcja Auto-Processing AI

**Cel:** Weryfikacja automatycznego uruchomienia przetwarzania

**Test A - Włączone:**
1. Zaznacz checkbox: "Uruchom przetwarzanie AI po zakończeniu"
2. Dodaj 1 plik i uploaduj
3. Po zakończeniu sprawdź w bazie:

```sql
SELECT 
  j.id,
  j.page_id,
  j.status,
  j.created_at
FROM jobs j
JOIN pages p ON j.page_id = p.id
WHERE p.flyer_id = '{FLYER_UUID}'
ORDER BY j.created_at DESC
LIMIT 1;
```

4. ✅ Zadanie przetwarzania utworzone automatycznie

**Test B - Wyłączone:**
1. Odznacz checkbox
2. Dodaj 1 plik i uploaduj
3. ✅ Brak zadania przetwarzania w bazie

---

### Scenariusz 8: Bulk Actions

**Cel:** Weryfikacja akcji masowych

**Przygotowanie:**
1. Dodaj 5 plików
2. Rozpocznij upload
3. Podczas uploadu **wyłącz internet** (symulacja błędów)
4. Poczekaj aż wszystkie pliki zakończą się błędem

**Test akcji bulk:**
1. Sprawdź przyciski:
   - ✅ "Ponów wszystkie" - aktywny
   - ✅ "Usuń błędne" - aktywny
2. Kliknij "Ponów wszystkie"
3. **Włącz internet**
4. ✅ Wszystkie 5 plików uploadowane ponownie
5. Po sukcesie sprawdź:
   - ✅ Przycisk "Wyczyść zakończone" - aktywny
6. Kliknij "Wyczyść zakończone"
7. ✅ Wszystkie pliki success usunięte z kolejki

---

### Scenariusz 9: Kompresja Obrazów

**Cel:** Weryfikacja czy kompresja działa

**Kroki:**
1. Przygotuj plik JPG o rozmiarze ~10MB (oryginał)
2. Dodaj do kolejki
3. Sprawdź w DevTools Network tab:
   - Otwórz DevTools → Network
   - Rozpocznij upload
4. Obserwuj request do Supabase Storage (PUT)
5. Sprawdź rozmiar przesyłanego pliku:
   - ✅ Plik przesyłany jest mniejszy niż oryginał
   - ✅ Typowo kompresja redukuje rozmiar o 30-70%

**Weryfikacja wymiarów:**
```sql
SELECT 
  p.image_width,
  p.image_height
FROM pages p
WHERE p.flyer_id = '{FLYER_UUID}'
ORDER BY p.created_at DESC
LIMIT 1;
```

- ✅ Wymiary zapisane poprawnie
- ✅ Maksymalnie 2000px (zgodnie z ustawieniami kompresji)

---

### Scenariusz 10: Beforeunload Protection

**Cel:** Zapobieganie przypadkowej utracie danych

**Kroki:**
1. Dodaj 5 plików
2. Rozpocznij upload
3. **Podczas uploadu** spróbuj:
   - Zamknąć kartę (Ctrl+W)
   - Odświeżyć stronę (F5)
   - Przejść do innej strony
4. ✅ Przeglądarka pokazuje dialog ostrzegawczy
5. ✅ Możesz anulować nawigację
6. Poczekaj aż upload się zakończy
7. Spróbuj ponownie zamknąć kartę
8. ✅ Brak dialogu ostrzegawczego (upload zakończony)

---

### Scenariusz 11: Responsywność UI

**Cel:** Sprawdzenie layoutu na różnych urządzeniach

**Desktop (>1024px):**
1. Otwórz widok w pełnym oknie
2. ✅ Layout dwukolumnowy (sidebar + main)
3. ✅ Wszystkie elementy widoczne

**Tablet (768-1024px):**
1. Resize okna do ~800px szerokości
2. ✅ Layout dostosowuje się
3. ✅ Sidebar pod main content

**Mobile (<768px):**
1. Otwórz DevTools → Responsive mode
2. Wybierz iPhone 12 Pro
3. ✅ Layout jednostkowy (pionowy)
4. ✅ Dropzone działa (touch events)
5. ✅ Przyciski dostępne

---

## Testy Edge Cases

### Edge Case 1: Bardzo duży obraz
- Plik: 8000x6000px, ~25MB
- ✅ Kompresja do 2000px max
- ✅ Upload sukces

### Edge Case 2: Bardzo mały obraz
- Plik: 100x100px
- ✅ Odrzucony (min 200x200px)

### Edge Case 3: Duplikat page_number
1. Upload strony page_number=1
2. W innej karcie upload strony page_number=1
3. ✅ Backend zwraca 409 Conflict
4. ✅ Frontend auto-increment do page_number=2

### Edge Case 4: Gazetka archived
1. Zmień status gazetki na `archived`
2. Spróbuj otworzyć widok uploadu
3. ✅ Błąd 400: "Cannot upload to archived flyer"

### Edge Case 5: Wygasła sesja
1. Otwórz widok uploadu
2. **Poczekaj 1h+** (lub wymuś logout w innej karcie)
3. Spróbuj uploadować
4. ✅ Błąd: "Sesja wygasła. Zaloguj się ponownie"
5. ✅ Redirect do /login

---

## Testy Wydajnościowe

### Test 1: Równoległość
- Upload 10 plików jednocześnie
- ✅ Maksymalnie 3 aktywne jednocześnie
- ✅ Pozostałe w kolejce

### Test 2: Kompresja Performance
- Plik 20MB JPG
- ✅ Kompresja <3 sekundy
- ✅ UI responsywne (brak freeze)

### Test 3: Progress Accuracy
- Upload pliku z throttled network (DevTools → Slow 3G)
- ✅ Progress bar płynnie aktualizowany
- ✅ Szacowany czas pozostały

---

## Checklist Funkcjonalności

### UI/UX
- [ ] Dropzone highlight podczas drag over
- [ ] Preview obrazów wyświetlane poprawnie
- [ ] Progress bars aktualizowane płynnie
- [ ] Ikony statusu zmieniają się odpowiednio
- [ ] Komunikaty błędów czytelne i pomocne
- [ ] Breadcrumbs navigation działa
- [ ] Przycisk "Powrót" kieruje do szczegółów gazetki
- [ ] Responsywność na różnych rozdzielczościach

### Funkcjonalność
- [ ] Dodawanie plików (drag & drop)
- [ ] Dodawanie plików (wybór z dysku)
- [ ] Walidacja formatu plików
- [ ] Walidacja rozmiaru plików
- [ ] Walidacja wymiarów obrazów
- [ ] Kompresja obrazów
- [ ] Upload do Supabase Storage
- [ ] Rejestracja stron w bazie
- [ ] Auto-increment page_number
- [ ] Opcjonalne przetwarzanie AI
- [ ] Retry nieudanych uploadów
- [ ] Anulowanie uploadów
- [ ] Bulk actions (retry all, remove all failed, clear completed)
- [ ] Beforeunload warning

### Obsługa Błędów
- [ ] Błędy walidacji (nieprawidłowy format)
- [ ] Błędy sieciowe (brak internetu)
- [ ] Błędy API (404, 409, 500)
- [ ] Błędy kompresji
- [ ] Timeout uploadu
- [ ] Wygasła sesja

### Bezpieczeństwo
- [ ] Autoryzacja admin (redirect dla non-admin)
- [ ] Walidacja UUID w URL
- [ ] Signed URLs z wygaśnięciem
- [ ] Sanityzacja nazw plików
- [ ] Double-check formatu plików (MIME + extension)

### Wydajność
- [ ] Kompresja przed uploadem
- [ ] Równoległe uploady (max 3)
- [ ] Memoizacja statystyk
- [ ] Lazy loading komponentów
- [ ] Brak memory leaks (cleanup w useEffect)

---

## Zgłaszanie Błędów

Jeśli znajdziesz błąd, zgłoś go z następującymi informacjami:

**Tytuł:** [Upload Flow] Krótki opis problemu

**Opis:**
- Scenariusz testowy: (np. Scenariusz 5)
- Kroki do reprodukcji: (szczegółowo)
- Oczekiwany wynik: (co powinno się stać)
- Faktyczny wynik: (co się faktycznie stało)
- Konsola błędy: (jeśli są)
- Screenshot: (jeśli pomocny)

**Środowisko:**
- Przeglądarka: (np. Chrome 120)
- OS: (np. Windows 11)
- Rozdzielczość: (np. 1920x1080)

---

## Następne Kroki Po Testach

Po zakończeniu testów:

1. ✅ Wypełnij checklist funkcjonalności
2. 📝 Zgłoś znalezione błędy
3. 🎯 Priorytetyzuj poprawki
4. 🚀 Deploy do staging
5. 🧪 Testy E2E (Playwright)
6. ✨ Deploy do production

---

## Przydatne Komendy

**Restart serwera:**
```bash
# W terminalu gdzie działa serwer:
Ctrl+C
npm run dev
```

**Sprawdzenie logów:**
```bash
# W nowym terminalu:
tail -f /var/log/supabase/... # jeśli masz dostęp do logów Supabase
```

**Czyszczenie storage (testowo):**
```sql
-- UWAGA: Tylko na środowisku DEV!
DELETE FROM pages WHERE flyer_id = '{FLYER_UUID}';
-- Potem ręcznie usuń pliki z Supabase Storage bucket
```

---

## Kontakt

W razie pytań lub problemów:
- Sprawdź dokumentację: `.ai/upload-view-implementation-plan.md`
- Sprawdź podsumowanie: `.ai/upload-view-implementation-summary.md`
- Sprawdź API plan: `.ai/api-plan.md`

