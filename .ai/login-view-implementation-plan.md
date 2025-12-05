# Plan implementacji widoku Logowania

## 1. Przegląd
Widok logowania (`/login`) służy do uwierzytelniania użytkowników (zarówno Administratorów, jak i zwykłych Użytkowników) w systemie SavingsAgent. Wykorzystuje Supabase Auth jako backend uwierzytelniający. Formularz logowania jest interaktywnym komponentem React osadzonym na statycznej stronie Astro. Widok obsługuje walidację formularza, stany ładowania, obsługę błędów oraz przekierowanie do odpowiedniej sekcji aplikacji na podstawie roli użytkownika.

## 2. Routing widoku
- **Ścieżka:** `/login`
- **Dostęp:** Publiczny (dla niezalogowanych użytkowników).
- **Zasada przekierowania:** Jeśli użytkownik jest już zalogowany, wejście na tę ścieżkę powinno przekierować go automatycznie do strony docelowej (np. `/` dla Usera lub `/admin` dla Admina) – obsłużone przez Middleware lub logikę SSR.

## 3. Struktura komponentów

```text
src/pages/login.astro (Page)
└── src/layouts/AuthLayout.astro (Layout)
    └── src/components/auth/LoginForm.tsx (React Component - client:load)
        ├── src/components/ui/card.tsx (Shadcn Card)
        ├── src/components/ui/form.tsx (Shadcn Form / React Hook Form)
        ├── src/components/ui/input.tsx (Shadcn Input)
        ├── src/components/ui/button.tsx (Shadcn Button)
        └── src/components/ui/alert.tsx (Shadcn Alert - opcjonalnie dla błędów ogólnych)
```

## 4. Szczegóły komponentów

### 1. `src/pages/login.astro`
- **Opis:** Główny punkt wejścia. Strona Astro renderowana po stronie serwera.
- **Odpowiedzialność:**
  - Sprawdzenie sesji (opcjonalne, jeśli nie robi tego middleware) i przekierowanie zalogowanych.
  - Renderowanie layoutu `AuthLayout`.
  - Osadzenie komponentu `LoginForm` z dyrektywą `client:load` (wymagane do interaktywności).

### 2. `src/layouts/AuthLayout.astro`
- **Opis:** Wrapper dla stron uwierzytelniania (Login, Reset Hasła).
- **Elementy:**
  - Centrowany kontener (flex/grid).
  - Logo aplikacji.
  - Stopka z linkami (opcjonalnie).
- **Slot:** `<slot />` do wstrzyknięcia formularza.

### 3. `src/components/auth/LoginForm.tsx`
- **Opis:** Interaktywny formularz logowania napisany w React.
- **Biblioteki:** `react-hook-form`, `zod` (do walidacji), `lucide-react` (ikony).
- **Główne elementy:**
  - `<Form>` (wrapper z react-hook-form).
  - Pola: Email, Password.
  - Przycisk "Zaloguj się" (ze stanem loading).
  - Link "Nie pamiętasz hasła?" (opcjonalnie w przyszłości, teraz placeholder lub brak).
  - Obszar komunikatów błędów (Alert).
- **Obsługiwane zdarzenia:**
  - `onSubmit`: Przechwycenie danych, wywołanie `supabase.auth.signInWithPassword`.
- **Warunki walidacji (Zod Schema):**
  - **Email:** Wymagany, poprawny format email.
  - **Hasło:** Wymagane, min. 6 znaków (wymaganie Supabase).
- **Zarządzanie stanem:**
  - `isSubmitting` (z `useForm`).
  - `genericError` (stan lokalny `useState` dla błędów API np. "Invalid login credentials").

## 5. Typy

### DTO (Data Transfer Objects)
Model danych przesyłanych w formularzu (zdefiniowany przez schemat Zod):

```typescript
// src/lib/schemas/auth.ts (lub wewnątrz komponentu)
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email({ message: "Nieprawidłowy adres email" }),
  password: z.string().min(1, { message: "Hasło jest wymagane" }),
});

export type LoginFormData = z.infer<typeof LoginSchema>;
```

### ViewModel
Komponent nie wymaga skomplikowanego ViewModelu, korzysta bezpośrednio z `LoginFormData` oraz typów zwracanych przez Supabase Auth (`Session`, `User`).

## 6. Zarządzanie stanem

Zarządzanie stanem odbywa się lokalnie w komponencie `LoginForm` przy użyciu:
1. **React Hook Form:** Zarządza stanem pól formularza (wartości, błędy walidacji, status `isSubmitting`).
2. **useState:** Przechowuje ogólny błąd logowania (`serverError`), który nie jest przypisany do konkretnego pola.
3. **Supabase Client:** Przechowuje stan sesji (po udanym logowaniu).

Nie ma potrzeby tworzenia dedykowanego Custom Hooka tylko dla logowania, chyba że logika autoryzacji stanie się bardziej złożona (np. pobieranie dodatkowych danych profilu w tym samym kroku). Wystarczy bezpośrednie użycie serwisu.

## 7. Integracja API

**Endpoint:** Supabase Auth (`signInWithPassword`)

**Żądanie (wywołanie SDK):**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: formData.email,
  password: formData.password,
});
```

**Odpowiedź (Sukces):**
- Obiekt `data.session` i `data.user` nie jest null.
- Kod: 200 OK.

**Odpowiedź (Błąd):**
- Obiekt `error` zawiera `message` (np. "Invalid login credentials").
- Kod: 400 Bad Request / 401 Unauthorized.

**Dodatkowe zapytanie (opcjonalne, ale zalecane):**
Po zalogowaniu może być konieczne pobranie roli użytkownika z tabeli `profiles`, aby zdecydować o przekierowaniu, chyba że rola jest zaszyta w `user_metadata` w Supabase Auth.

## 8. Interakcje użytkownika

1. **Wejście na stronę:** Użytkownik widzi formularz logowania. Fokus ustawiony na pole "Email".
2. **Wprowadzanie danych:** Walidacja "onBlur" lub "onChange" (zależnie od konfiguracji formularza).
3. **Próba wysłania pustego formularza:** Wyświetlenie błędów walidacji pod polami.
4. **Kliknięcie "Zaloguj się":**
   - Przycisk zmienia stan na "Loading" (spinner, disabled).
   - Formularz jest zablokowany.
5. **Sukces logowania:**
   - Przekierowanie do odpowiedniego dashboardu (Admin -> `/admin`, User -> `/`).
   - Opcjonalnie toast "Zalogowano pomyślnie".
6. **Błąd logowania:**
   - Przywrócenie stanu przycisku.
   - Wyświetlenie komunikatu błędu (np. "Błędny email lub hasło") w widocznym miejscu (czerwony Alert nad formularzem).

## 9. Warunki i walidacja

Walidacja realizowana jest dwuetapowo:

1. **Frontend (Zod + React Hook Form):**
   - `email`: `required`, format `email`.
   - `password`: `required`.
   
2. **Backend (Supabase):**
   - Weryfikacja poprawności poświadczeń.
   - Weryfikacja czy email jest potwierdzony (jeśli włączone w Supabase).

## 10. Obsługa błędów

- **Błędy walidacji pól:** Wyświetlane tekstowo pod odpowiednim polem input (kolor czerwony).
- **Błędne dane logowania (AuthApiError):** Wyświetlane jako ogólny `Alert` (variant="destructive") nad formularzem. Komunikat dla użytkownika powinien być ogólny ("Nieprawidłowy email lub hasło") ze względów bezpieczeństwa.
- **Błędy sieci/serwera:** Wyświetlane w `Alert` jako "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.".

## 11. Kroki implementacji

1. **Przygotowanie środowiska:**
   - Upewnij się, że klient Supabase jest skonfigurowany w `src/lib/supabase.ts`.
   - Upewnij się, że komponenty Shadcn (`input`, `button`, `form`, `card`, `alert`) są zainstalowane.

2. **Stworzenie Layoutu:**
   - Utwórz `src/layouts/AuthLayout.astro` ze stylami centrującymi content.

3. **Implementacja Formularza (React):**
   - Utwórz `src/components/auth/LoginForm.tsx`.
   - Zdefiniuj `LoginSchema` używając Zod.
   - Skonfiguruj `useForm`.
   - Zaimplementuj funkcję `onSubmit` wywołującą `supabase.auth.signInWithPassword`.
   - Dodaj logikę przekierowania po sukcesie:
     - Pobierz użytkownika.
     - Sprawdź rolę (z tabeli `profiles` lub metadanych).
     - `window.location.href = role === 'admin' ? '/admin/dashboard' : '/products'`.

4. **Implementacja Strony (Astro):**
   - Utwórz `src/pages/login.astro`.
   - Zaimportuj i użyj `AuthLayout`.
   - Zaimportuj `LoginForm` i użyj go z `client:load`.

5. **Weryfikacja:**
   - Przetestuj logowanie poprawne (Admin i User).
   - Przetestuj logowanie błędne (złe hasło).
   - Przetestuj walidację pól (pusty email, zły format).
   - Sprawdź responsywność na mobile.

