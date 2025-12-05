# 🔀 Informacja o Przekierowaniach Po Logowaniu

## ✅ Zachowanie Po Zalogowaniu

Po pomyślnym zalogowaniu użytkownik jest automatycznie przekierowywany:

### 👤 Zwykły Użytkownik (role: 'user')
```
/login → / (Lista produktów - ProductBrowser)
```

**Strona główna (`/`)** wyświetla:
- ✅ Pełną listę promocyjnych produktów
- ✅ Filtry (sklepy, kategorie)
- ✅ Wyszukiwarkę
- ✅ Infinite scroll
- ✅ Modal z szczegółami produktu

### 👨‍💼 Administrator (role: 'admin')
```
/login → /admin (Panel administratora)
```

**Panel admina (`/admin`)** wyświetla:
- ✅ Dashboard z KPI
- ✅ Lista gazetek
- ✅ Zarządzanie stronami
- ✅ Weryfikacja produktów

---

## 📁 Struktura Stron

```
/ (index.astro)
├── <ProductBrowser client:load />     ← Lista produktów
└── 🌍 PUBLICZNY (brak wymagania logowania)

/admin (admin/index.astro)
├── Dashboard administratora           ← Panel admina
└── 🔒 Wymaga logowania + role = 'admin'

/test-login (test-login.astro)
├── Strona testowa                     ← Test logowania
├── Przyciski do nawigacji
└── 🔒 Wymaga logowania

/login (login.astro)
├── Formularz logowania
└── Auto-redirect jeśli zalogowany
```

---

## 🧪 Testowanie Przekierowań

### Test 1: Logowanie jako User
1. Zaloguj się jako zwykły użytkownik
2. **Oczekiwany rezultat:** Przekierowanie do `/` (lista produktów)

### Test 2: Logowanie jako Admin
1. Zaloguj się jako administrator
2. **Oczekiwany rezultat:** Przekierowanie do `/admin` (panel)

### Test 3: Próba wejścia na /login gdy zalogowany
1. Zaloguj się (admin lub user)
2. Spróbuj wejść na `/login`
3. **Oczekiwany rezultat:** 
   - Admin → redirect do `/admin`
   - User → redirect do `/`

---

## 🔧 Zmiana Domyślnego Przekierowania

Jeśli chcesz zmienić domyślne przekierowanie dla użytkowników, edytuj:

**`src/components/auth/LoginForm.tsx`** (linia ~65-70):

```typescript
// Przekierowanie na podstawie roli
if (profile.role === "admin") {
  window.location.href = "/admin";  // ← Admin
} else {
  window.location.href = "/";       // ← User (zmień tutaj)
}
```

**Przykłady:**
```typescript
// Przekieruj do strony testowej
window.location.href = "/test-login";

// Przekieruj do konkretnej gazetki
window.location.href = "/flyers/123";

// Przekieruj z query params
window.location.href = "/?category=food";
```

---

## 🎯 Strona Testowa

Utworzono specjalną stronę testową: **`/test-login`**

**Funkcje:**
- ✅ Wyświetla informacje o zalogowanym użytkowniku
- ✅ Pokazuje rolę
- ✅ Przyciski nawigacji:
  - "Lista Produktów" → `/`
  - "Panel Administratora" → `/admin` (tylko dla adminów)
  - "Wyloguj się" → `/login`

**Użycie:**
```
http://localhost:3000/test-login
```

Idealne do weryfikacji czy logowanie działa przed testowaniem głównej aplikacji.

---

## 📊 Flow Diagram

```
┌─────────────┐
│   /login    │
│  (formularz)│
└──────┬──────┘
       │
       ├─ Submit (valid credentials)
       │
       ├─ Check role in profiles
       │
       ├─ role === 'admin' ?
       │  │
       │  ├─ YES → /admin (Dashboard)
       │  │
       │  └─ NO  → / (ProductBrowser)
       │
       └─ Invalid credentials
          │
          └─ Show error alert
```

---

## ✅ Checklist Działania

Po zalogowaniu sprawdź:

- [ ] User przekierowany do `/` (lista produktów)
- [ ] Admin przekierowany do `/admin` (dashboard)
- [ ] Zalogowany nie może wejść na `/login` (auto-redirect)
- [ ] Niezalogowany MOŻE wejść na `/` (lista produktów jest publiczna)
- [ ] Niezalogowany przekierowany z `/admin` do `/login`
- [ ] User nie może wejść na `/admin` (tylko admin)
- [ ] `/test-login` wymaga logowania

---

## 🎉 Podsumowanie

✅ **Strona główna (`/`)** = Lista produktów (ProductBrowser)  
✅ **Panel admina (`/admin`)** = Dashboard administratora  
✅ **Strona testowa (`/test-login`)** = Test logowania  

Domyślne przekierowanie **działa poprawnie** zgodnie z planem UI!

