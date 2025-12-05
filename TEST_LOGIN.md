# 🧪 Instrukcja Testowania Widoku Logowania

## ✅ Status Implementacji

Wszystkie komponenty zostały zaimplementowane i są gotowe do testowania:

- ✅ `AuthLayout.astro` - Layout uwierzytelniania
- ✅ `LoginForm.tsx` - Formularz logowania  
- ✅ `login.astro` - Strona logowania
- ✅ `auth.ts` - Schemat walidacji Zod
- ✅ `index.astro` - Strona główna (dla użytkowników)
- ✅ `admin/index.astro` - Panel administratora
- ✅ `/api/auth/logout` - Endpoint wylogowania

## 🚀 Przed Rozpoczęciem Testów

### 1. ⚠️ WYMAGANE: Skonfiguruj zmienne środowiskowe

**Formularz nie będzie działał bez tych zmiennych!**

Dodaj do pliku `.env`:
```env
# Wymagane dla client-side (React components)
PUBLIC_SUPABASE_URL=your-project-url.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Wymagane dla server-side (Astro SSR)
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

📖 **Szczegółowe instrukcje:** `ENV_SETUP.md`

### 2. Upewnij się, że dev server jest uruchomiony

```bash
npm run dev
```

⚠️ **WAŻNE:** Po dodaniu/zmianie zmiennych środowiskowych **MUSISZ** zrestartować dev server!

Aplikacja powinna być dostępna na: `http://localhost:3000`

### 3. Zweryfikuj zmienne środowiskowe

Otwórz konsolę przeglądarki (F12) i wpisz:
```javascript
console.log(import.meta.env.PUBLIC_SUPABASE_URL)
```

Jeśli widzisz `undefined` - zmienne nie są załadowane. Zrestartuj dev server!

### 3. Upewnij się, że masz użytkowników testowych

Musisz mieć w Supabase:

**Administrator:**
- Email: (Twój email admina)
- Hasło: (Twoje hasło)
- Profil w tabeli `profiles` z `role = 'admin'`

**Zwykły użytkownik:**
- Email: (Twój email użytkownika)
- Hasło: (Twoje hasło)
- Profil w tabeli `profiles` z `role = 'user'`

## 📋 Scenariusze Testowe

### Test 1: Dostępność Strony Logowania ✅

**Kroki:**
1. Otwórz przeglądarkę
2. Wejdź na `http://localhost:3000/login`

**Oczekiwany rezultat:**
- ✅ Strona się ładuje bez błędów (kod 200)
- ✅ Widoczny formularz logowania w karcie
- ✅ Logo "SavingsAgent" na górze
- ✅ Dwa pola: Email i Hasło
- ✅ Przycisk "Zaloguj się"
- ✅ Stopka z informacjami

**Status:** ✅ PASSED (zweryfikowane - kod 200)

---

### Test 2: Walidacja Formularza - Puste Pola

**Kroki:**
1. Wejdź na `/login`
2. Kliknij "Zaloguj się" bez wypełniania pól

**Oczekiwany rezultat:**
- ✅ Pod polem "Email": "Email jest wymagany"
- ✅ Pod polem "Hasło": "Hasło jest wymagane"
- ✅ Formularz nie został wysłany
- ✅ Nie ma błędu serwera

---

### Test 3: Walidacja Email - Nieprawidłowy Format

**Kroki:**
1. Wejdź na `/login`
2. Wpisz w pole email: `nieprawidlowy-email`
3. Wpisz w pole hasło: `test123`
4. Kliknij "Zaloguj się"

**Oczekiwany rezultat:**
- ✅ Pod polem "Email": "Nieprawidłowy adres email"
- ✅ Formularz nie został wysłany

---

### Test 4: Logowanie z Błędnymi Danymi

**Kroki:**
1. Wejdź na `/login`
2. Wpisz email: `test@example.com`
3. Wpisz hasło: `blednehaslo123`
4. Kliknij "Zaloguj się"

**Oczekiwany rezultat:**
- ✅ Przycisk zmienia się na "Logowanie..." ze spinnerem
- ✅ Formularz jest zablokowany podczas wysyłania
- ✅ Po błędzie pojawia się czerwony Alert: "Nieprawidłowy email lub hasło"
- ✅ Przycisk wraca do stanu "Zaloguj się"
- ✅ Formularz jest odblokowany

---

### Test 5: Logowanie Jako Administrator - SUKCES

**Kroki:**
1. Wejdź na `/login`
2. Wpisz poprawny email administratora
3. Wpisz poprawne hasło administratora
4. Kliknij "Zaloguj się"

**Oczekiwany rezultat:**
- ✅ Przycisk zmienia się na "Logowanie..." ze spinnerem
- ✅ Formularz jest zablokowany
- ✅ Automatyczne przekierowanie do `/admin`
- ✅ Na stronie `/admin`:
  - Widoczny nagłówek "Panel Administratora"
  - Wyświetlony email użytkownika
  - Rola: "admin"
  - Zielony komunikat: "Test logowania zakończony sukcesem!"
  - Przyciski: "Przejdź do strony głównej" i "Wyloguj się"

---

### Test 6: Logowanie Jako Zwykły Użytkownik - SUKCES

**Kroki:**
1. Wyloguj się jeśli jesteś zalogowany
2. Wejdź na `/login`
3. Wpisz poprawny email użytkownika (nie admina)
4. Wpisz poprawne hasło
5. Kliknij "Zaloguj się"

**Oczekiwany rezultat:**
- ✅ Przycisk zmienia się na "Logowanie..." ze spinnerem
- ✅ Automatyczne przekierowanie do `/` (strona główna)
- ✅ Na stronie głównej:
  - Widoczny nagłówek "SavingsAgent"
  - Wyświetlony email użytkownika
  - Rola: "user"
  - Zielony komunikat: "Test logowania zakończony sukcesem!"
  - Przycisk: "Wyloguj się"

---

### Test 7: Przekierowanie Zalogowanego Użytkownika

**Kroki:**
1. Zaloguj się jako admin lub user
2. Spróbuj wejść ponownie na `/login`

**Oczekiwany rezultat:**
- ✅ Automatyczne przekierowanie:
  - Admin → `/admin`
  - User → `/`
- ✅ Strona `/login` nie jest wyświetlana

---

### Test 8: Wylogowanie

**Kroki:**
1. Zaloguj się (admin lub user)
2. Kliknij przycisk "Wyloguj się"

**Oczekiwany rezultat:**
- ✅ Automatyczne przekierowanie do `/login`
- ✅ Sesja zakończona
- ✅ Próba wejścia na `/admin` lub `/` przekierowuje do `/login`

---

### Test 9: Ochrona Stron - Bez Logowania

**Kroki:**
1. Upewnij się, że jesteś wylogowany
2. Spróbuj wejść bezpośrednio na `/admin`
3. Spróbuj wejść bezpośrednio na `/`

**Oczekiwany rezultat:**
- ✅ Automatyczne przekierowanie do `/login`
- ✅ Strony chronione nie są dostępne bez logowania

---

### Test 10: Ochrona Panelu Admin - User Nie Może Wejść

**Kroki:**
1. Zaloguj się jako zwykły użytkownik (nie admin)
2. Spróbuj wejść na `/admin`

**Oczekiwany rezultat:**
- ✅ Automatyczne przekierowanie do `/` (strona główna)
- ✅ Panel admina nie jest dostępny dla zwykłych użytkowników

---

### Test 11: Responsywność - Mobile

**Kroki:**
1. Wejdź na `/login`
2. Otwórz DevTools (F12)
3. Włącz tryb responsywny (Toggle device toolbar)
4. Ustaw rozdzielczość na iPhone SE (375px)

**Oczekiwany rezultat:**
- ✅ Formularz zajmuje prawie całą szerokość ekranu (z paddingiem)
- ✅ Wszystkie elementy są czytelne
- ✅ Przycisk "Zaloguj się" jest pełnej szerokości
- ✅ Nie ma poziomego scrollowania

---

### Test 12: Dark Mode

**Kroki:**
1. Wejdź na `/login`
2. Zmień motyw systemu na ciemny lub użyj DevTools do dodania klasy `dark` do `<html>`

**Oczekiwany rezultat:**
- ✅ Tło zmienia się na ciemne
- ✅ Tekst jest jasny i czytelny
- ✅ Formularz ma odpowiedni kontrast
- ✅ Wszystkie elementy są widoczne

---

### Test 13: Autofocus na Polu Email

**Kroki:**
1. Wejdź na `/login`

**Oczekiwany rezultat:**
- ✅ Kursor automatycznie znajduje się w polu "Email"
- ✅ Możesz od razu pisać bez klikania

---

### Test 14: Wysyłanie Formularza Enter

**Kroki:**
1. Wejdź na `/login`
2. Wpisz email
3. Wpisz hasło
4. Naciśnij Enter (nie klikaj przycisku)

**Oczekiwany rezultat:**
- ✅ Formularz zostaje wysłany
- ✅ Działa tak samo jak kliknięcie "Zaloguj się"

---

## 🎯 Szybki Checklist

Użyj tego checklisty do szybkiego sprawdzenia wszystkich funkcji:

- [ ] Strona `/login` ładuje się poprawnie
- [ ] Walidacja pustych pól działa
- [ ] Walidacja nieprawidłowego emaila działa
- [ ] Błędne dane logowania pokazują alert
- [ ] Stan loading (spinner) działa podczas wysyłania
- [ ] Logowanie jako admin przekierowuje do `/admin`
- [ ] Logowanie jako user przekierowuje do `/`
- [ ] Zalogowany użytkownik nie może wejść na `/login`
- [ ] Wylogowanie działa i przekierowuje do `/login`
- [ ] Strony `/admin` i `/` są chronione
- [ ] User nie może wejść do `/admin`
- [ ] Formularz działa na mobile (< 640px)
- [ ] Dark mode działa poprawnie
- [ ] Autofocus na email działa
- [ ] Wysyłanie formularza Enter działa

## 🐛 Znalezione Problemy

Zapisz tutaj wszelkie problemy znalezione podczas testowania:

```
Problem 1:
- Opis:
- Kroki do reprodukcji:
- Oczekiwane zachowanie:
- Rzeczywiste zachowanie:

Problem 2:
- ...
```

## 📊 Raport z Testów

Po zakończeniu testów wypełnij:

**Data testów:** _____________

**Tester:** _____________

**Środowisko:**
- Przeglądarka: _____________
- System operacyjny: _____________
- Rozdzielczość: _____________

**Wyniki:**
- Testy passed: __ / 14
- Testy failed: __ / 14
- Znalezione błędy: __

**Komentarze:**
_____________________________________________
_____________________________________________

## 🎉 Po Zakończeniu Testów

Jeśli wszystkie testy przeszły pomyślnie:

1. ✅ Implementacja jest kompletna
2. ✅ Widok logowania jest gotowy do użycia w produkcji
3. ✅ Możesz przejść do implementacji kolejnych widoków

Jeśli znaleziono błędy:
1. Opisz je w sekcji "Znalezione Problemy"
2. Ustal priorytety (krytyczne/ważne/niskie)
3. Napraw błędy według priorytetu
4. Przetestuj ponownie

