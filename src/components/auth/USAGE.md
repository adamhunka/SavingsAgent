# LoginForm - Instrukcja Użycia

## 🚀 Quick Start

Formularz logowania jest już zintegrowany ze stroną `/login` i działa automatycznie. Komponent obsługuje uwierzytelnianie przez Supabase Auth oraz automatyczne przekierowanie na podstawie roli użytkownika.

## 📋 Struktura Komponentów

```text
src/pages/login.astro
└── src/layouts/AuthLayout.astro
    └── src/components/auth/LoginForm.tsx
        ├── src/components/ui/card.tsx
        ├── src/components/ui/form.tsx
        ├── src/components/ui/input.tsx
        ├── src/components/ui/button.tsx
        └── src/components/ui/alert.tsx
```

## 🎯 Funkcjonalność

### Automatyczne funkcje
- ✅ Walidacja formularza po stronie klienta (Zod + React Hook Form)
- ✅ Wywołanie Supabase Auth (`signInWithPassword`)
- ✅ Pobieranie roli użytkownika z tabeli `profiles`
- ✅ Automatyczne przekierowanie:
  - Admin → `/admin`
  - User → `/`
- ✅ Obsługa błędów (błędne dane logowania, błędy sieci)
- ✅ Stan loading z animowanym spinnerem
- ✅ Blokowanie formularza podczas wysyłania
- ✅ Responsywny design z dark mode

### Walidacja

**Email:**
- Wymagany
- Poprawny format email

**Hasło:**
- Wymagane
- Minimum 1 znak (zgodnie z wymaganiami Supabase)

## 🔧 Użycie Podstawowe

### W stronie Astro

```astro
---
import AuthLayout from "@/layouts/AuthLayout.astro";
import LoginForm from "@/components/auth/LoginForm";
---

<AuthLayout title="Logowanie">
  <LoginForm client:load />
</AuthLayout>
```

### Samodzielne użycie w React

Jeśli potrzebujesz użyć formularza w innym kontekście (np. w modalu):

```tsx
import LoginForm from "@/components/auth/LoginForm";

function MyComponent() {
  return (
    <div className="max-w-md mx-auto">
      <LoginForm />
    </div>
  );
}
```

## 📝 Schemat Walidacji

Schemat walidacji znajduje się w `src/lib/schemas/auth.ts`:

```typescript
import { z } from "zod";

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email jest wymagany" })
    .email({ message: "Nieprawidłowy adres email" }),
  password: z.string().min(1, { message: "Hasło jest wymagane" }),
});

export type LoginFormData = z.infer<typeof LoginSchema>;
```

## 🎨 Customizacja

### Zmiana przekierowania po zalogowaniu

Edytuj funkcję `onSubmit` w `LoginForm.tsx`:

```typescript
// Przekierowanie na podstawie roli
if (profile.role === "admin") {
  window.location.href = "/admin/dashboard"; // Zmień URL
} else {
  window.location.href = "/products"; // Zmień URL
}
```

### Zmiana komunikatów błędów

Edytuj sekcję obsługi błędów w `LoginForm.tsx`:

```typescript
if (error.message === "Invalid login credentials") {
  setServerError("Twój własny komunikat błędu");
}
```

### Dostosowanie walidacji

Edytuj `LoginSchema` w `src/lib/schemas/auth.ts`:

```typescript
export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Własny komunikat" })
    .email({ message: "Własny komunikat email" }),
  password: z
    .string()
    .min(8, { message: "Hasło musi mieć min. 8 znaków" }),
});
```

## 🔐 Ochrona Strony

Strona `/login` automatycznie przekierowuje zalogowanych użytkowników. Sprawdź implementację w `src/pages/login.astro`:

```astro
---
const supabase = Astro.locals.supabase;
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (profile) {
    const redirectUrl = profile.role === "admin" ? "/admin" : "/";
    return Astro.redirect(redirectUrl);
  }
}
---
```

## 🎯 AuthLayout

Layout dla stron uwierzytelniania znajduje się w `src/layouts/AuthLayout.astro`. Zawiera:

- Centrowany kontener z responsywnym designem
- Logo/nazwę aplikacji
- Slot dla formularza
- Stopkę
- Wsparcie dla dark mode

### Użycie AuthLayout dla innych stron auth

```astro
---
import AuthLayout from "@/layouts/AuthLayout.astro";
import YourAuthComponent from "@/components/auth/YourAuthComponent";
---

<AuthLayout title="Własny tytuł">
  <YourAuthComponent client:load />
</AuthLayout>
```

## ⚠️ Wymagania

### Zależności
- `react-hook-form` - zarządzanie formularzem
- `zod` - walidacja
- `@hookform/resolvers` - integracja RHF + Zod
- `lucide-react` - ikony (Loader2)
- `@supabase/supabase-js` - uwierzytelnianie

### Komponenty Shadcn/ui
- `button`
- `card`
- `form`
- `input`
- `label`
- `alert`

### Konfiguracja Supabase

Upewnij się, że masz skonfigurowane:

1. Tabelę `profiles` z polem `role` (enum: `admin`, `user`)
2. Zmienne środowiskowe:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`

## 🐛 Obsługa Błędów

### Typy błędów

**Błędy walidacji pól:**
- Wyświetlane pod odpowiednim polem
- Czerwony kolor
- Automatyczne czyszczenie przy poprawie wartości

**Błędne dane logowania:**
- Alert na górze formularza
- Variant: `destructive`
- Ogólny komunikat ze względów bezpieczeństwa

**Błędy sieci/serwera:**
- Alert na górze formularza
- Komunikat: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później."

### Przykładowa obsługa niestandardowych błędów

```typescript
try {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    // Dodaj własną logikę obsługi błędów
    console.error("Login error:", error);
    
    switch (error.message) {
      case "Invalid login credentials":
        setServerError("Nieprawidłowy email lub hasło");
        break;
      case "Email not confirmed":
        setServerError("Potwierdź swój email przed zalogowaniem");
        break;
      default:
        setServerError("Wystąpił błąd podczas logowania");
    }
    return;
  }
  
  // ... reszta logiki
} catch (err) {
  console.error("Unexpected error:", err);
  setServerError("Wystąpił nieoczekiwany błąd");
}
```

## 📱 Responsywność

Formularz jest w pełni responsywny:
- Mobile: pełna szerokość z paddingiem
- Desktop: maksymalna szerokość 28rem (448px)
- Dark mode: automatyczne przełączanie kolorów

## 🧪 Testowanie

### Scenariusze testowe

1. **Logowanie poprawne (Admin):**
   - Email: admin@example.com
   - Hasło: poprawne
   - Oczekiwany rezultat: Przekierowanie do `/admin`

2. **Logowanie poprawne (User):**
   - Email: user@example.com
   - Hasło: poprawne
   - Oczekiwany rezultat: Przekierowanie do `/`

3. **Błędne hasło:**
   - Email: admin@example.com
   - Hasło: błędne
   - Oczekiwany rezultat: Alert z komunikatem błędu

4. **Walidacja formularza:**
   - Pusty email → "Email jest wymagany"
   - Nieprawidłowy format email → "Nieprawidłowy adres email"
   - Puste hasło → "Hasło jest wymagane"

5. **Stan loading:**
   - Kliknięcie "Zaloguj się"
   - Oczekiwany rezultat: Przycisk zablokowany, spinner widoczny

6. **Responsywność:**
   - Sprawdź na mobile (< 640px)
   - Sprawdź na tablet (640px - 1024px)
   - Sprawdź na desktop (> 1024px)

## 💡 Wskazówki

1. **Bezpieczeństwo:**
   - Nigdy nie wyświetlaj szczegółowych informacji o błędach logowania
   - Używaj ogólnych komunikatów typu "Nieprawidłowy email lub hasło"
   - Loguj szczegóły błędów tylko w konsoli (dla debugowania)

2. **UX:**
   - Autofocus na polu email
   - Obsługa Enter do wysłania formularza
   - Wyraźny stan loading
   - Komunikaty błędów w języku użytkownika

3. **Wydajność:**
   - Komponent renderuje się tylko po stronie klienta (`client:load`)
   - Minimalna liczba re-renderów dzięki React Hook Form
   - Lazy loading przez Astro

## 🔗 Powiązane Pliki

- `src/pages/login.astro` - Strona logowania
- `src/layouts/AuthLayout.astro` - Layout dla auth
- `src/components/auth/LoginForm.tsx` - Komponent formularza
- `src/lib/schemas/auth.ts` - Schemat walidacji
- `src/db/supabase.client.ts` - Klient Supabase
- `src/middleware/index.ts` - Middleware Astro

