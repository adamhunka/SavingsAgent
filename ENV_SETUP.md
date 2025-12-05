# 🔧 Konfiguracja Zmiennych Środowiskowych

## ⚠️ WAŻNE - Wymagane dla Logowania

Aby formularz logowania działał poprawnie, musisz skonfigurować zmienne środowiskowe z prefixem `PUBLIC_`.

## 📝 Wymagane Zmienne

Utwórz plik `.env` w głównym katalogu projektu i dodaj:

```env
# Supabase Configuration (Server-side)
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Supabase Configuration (Client-side - WYMAGANE dla logowania!)
# Muszą mieć prefix PUBLIC_ aby być dostępne w przeglądarce
PUBLIC_SUPABASE_URL=your-project-url.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenRouter API Key (opcjonalne)
OPENROUTER_API_KEY=your-openrouter-api-key
```

## 🔑 Gdzie Znaleźć Wartości?

1. **Zaloguj się do Supabase Dashboard**
2. Wybierz swój projekt
3. Przejdź do: **Settings** → **API**
4. Skopiuj:
   - **Project URL** → `PUBLIC_SUPABASE_URL` i `SUPABASE_URL`
   - **anon/public key** → `PUBLIC_SUPABASE_ANON_KEY` i `SUPABASE_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (tylko server-side)

## 🎯 Dlaczego `PUBLIC_` Prefix?

W Astro, zmienne środowiskowe są domyślnie dostępne **tylko po stronie serwera**. 

Aby zmienne były dostępne w przeglądarce (w komponentach React z `client:load`), **muszą** mieć prefix `PUBLIC_`.

### Przykład:

```typescript
// ❌ NIE DZIAŁA w komponencie React (client-side)
const url = import.meta.env.SUPABASE_URL; // undefined w przeglądarce!

// ✅ DZIAŁA w komponencie React (client-side)
const url = import.meta.env.PUBLIC_SUPABASE_URL; // dostępne!
```

## 🔒 Bezpieczeństwo

**NIE** używaj `PUBLIC_` prefix dla:
- ❌ Service role keys
- ❌ Private API keys
- ❌ Secrets
- ❌ Credentials

Używaj `PUBLIC_` prefix **tylko** dla:
- ✅ Public API URLs
- ✅ Anon/public keys (są bezpieczne do udostępnienia)
- ✅ Public configuration

## 📁 Struktura Plików

```
src/
├── db/
│   ├── supabase.client.ts        → Server-side (Astro SSR)
│   └── supabase.browser.ts       → Client-side (React components)
```

### Kiedy Używać Którego?

**`supabase.client.ts` (Server-side):**
- ✅ Astro pages (.astro)
- ✅ API endpoints
- ✅ Middleware
- ✅ SSR operations

**`supabase.browser.ts` (Client-side):**
- ✅ React components
- ✅ Client-side operations
- ✅ Browser authentication
- ✅ Components z `client:load`

## 🚀 Po Skonfigurowaniu

1. **Zrestartuj dev server:**
   ```bash
   # Zatrzymaj (Ctrl+C)
   # Uruchom ponownie
   npm run dev
   ```

2. **Sprawdź czy zmienne są załadowane:**
   Otwórz konsolę przeglądarki i wpisz:
   ```javascript
   console.log(import.meta.env.PUBLIC_SUPABASE_URL)
   ```
   Powinieneś zobaczyć swój URL Supabase.

3. **Przetestuj logowanie:**
   - Wejdź na `/login`
   - Spróbuj się zalogować
   - Powinieneś zobaczyć komunikaty błędów lub sukces

## 🐛 Troubleshooting

### Problem: "nic się nie dzieje po kliknięciu Zaloguj"

**Przyczyna:** Brak zmiennych `PUBLIC_*`

**Rozwiązanie:**
1. Sprawdź czy plik `.env` zawiera `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_ANON_KEY`
2. Zrestartuj dev server
3. Sprawdź konsolę przeglądarki (F12) na błędy

### Problem: "Missing Supabase environment variables"

**Rozwiązanie:**
1. Dodaj `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_ANON_KEY` do `.env`
2. Zrestartuj dev server

### Problem: Zmienne są `undefined` w przeglądarce

**Rozwiązanie:**
1. Upewnij się, że zmienne mają prefix `PUBLIC_`
2. Zrestartuj dev server (to jest KLUCZOWE!)
3. Wyczyść cache przeglądarki (Ctrl+Shift+R)

## ✅ Weryfikacja

Aby sprawdzić czy wszystko działa:

```bash
# 1. Zrestartuj server
npm run dev

# 2. Otwórz przeglądarkę na http://localhost:3000/login

# 3. Otwórz DevTools (F12) → Console

# 4. Wpisz:
console.log(import.meta.env.PUBLIC_SUPABASE_URL)

# 5. Powinieneś zobaczyć swój Supabase URL (nie "undefined")
```

## 📚 Dokumentacja

- [Astro Environment Variables](https://docs.astro.build/en/guides/environment-variables/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

## 🎉 Gotowe!

Po poprawnej konfiguracji zmiennych środowiskowych, formularz logowania będzie działał prawidłowo:
- ✅ Walidacja formularza
- ✅ Komunikaty błędów
- ✅ Logowanie do Supabase
- ✅ Przekierowania wg roli

