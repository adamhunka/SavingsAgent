# Architektura UI dla SavingsAgent

## 1. Przegląd struktury UI

SavingsAgent to aplikacja webowa z rozdziałem na publiczny frontend (przegląd ofert) oraz panel administracyjny (back‑office) do uploadu i weryfikacji wyników AI. Architektura UI jest mobile‑first, responsywna i zgodna z WCAG AA. Warstwa danych komunikuje się z API opisanym w `api-plan.md` (Supabase + własne endpointy). Fetching/caching: TanStack Query. Lokalny UI state: zustand (lub podobny), mutacje z optimistic updates i rollback.

Główne zasady:
- Mobile‑first, desktop‑optimized admin (split‑screen)
- Dostępność: aria, focus management, keyboard operability
- Bezpieczeństwo: role checks przed renderem tras admin, nieeksponowanie service_role keys
- Wydajność: CDN dla obrazów, srcset, lazy load, placeholdery, debouncing, bulk requests tam gdzie możliwe

## 2. Lista widoków

- **Public Product List**
  - Ścieżka: `/`
  - Główny cel: szybkie odkrywanie promocji, filtrowanie i wyszukiwanie
  - Kluczowe informacje: kafelki produktów (nazwa, cena promocyjna, cena regularna, kategoria ikona, sklep, data ważności), meta pagination
  - Kluczowe komponenty: SearchBar (debounce 300–500ms), FiltersBar (store + category), ProductCard, InfiniteScroll / CursorPagination, ProductListSkeleton
  - UX/A11Y/Security: keyboard accessible list, aria‑labels na kartach, publiczny endpoint — brak auth

- **Product Detail (Modal / Lightbox)**
  - Ścieżka (modal): `/product/:id` (modal nad `/`)
  - Główny cel: szczegóły oferty i dostęp do źródłowej strony gazetki
  - Kluczowe informacje: opis, ceny, kategoria, link „Zobacz gazetkę” (otwiera Page Lightbox), source page thumbnail
  - Kluczowe komponenty: Lightbox/Modal (focus trap), ImageViewer (zoom, srcset), ActionRow (share/link)
  - UX/A11Y/Security: focus trap, esc zamyka, gesty pinch/zoom na mobile

- **Login**
  - Ścieżka: `/login`
  - Główny cel: uwierzytelnienie użytkownika (Email + Hasło) via Supabase SDK
  - Kluczowe informacje: formularz, validation messages, loader, link reset hasła
  - Kluczowe komponenty: AuthForm, OAuthButtons (jeśli dodamy), ErrorBanner
  - UX/A11Y/Security: secure handling tokens (httpOnly cookies / in‑memory + refresh), rate limit UI, aria‑errors

- **Admin Dashboard**
  - Ścieżka: `/admin`
  - Główny cel: ogólny widok statusów (flyers, pages processing, jobs, KPI)
  - Kluczowe informacje: lista flyers, ostatnie joby, szybkie akcje (create flyer, upload), metryki approveRate, processing queue
  - Kluczowe komponenty: AdminHeader, FlyersOverviewTable, JobsWidget (polling), KPICards
  - UX/A11Y/Security: route guard (role check via `profiles`), audit trail linki

- **Flyer Pages List**
  - Ścieżka: `/admin/flyers/:flyerId/pages`
  - Główny cel: przegląd stron gazetki, akcje bulk (upload, process, retry, delete)
  - Kluczowe informacje: miniatury stron, page_number, processing_status, verified_by, actions
  - Kluczowe komponenty: PagesGrid, BulkActionsBar, UploadDropzone
  - UX/A11Y/Security: drag&drop accessible alternative, file validation UI (type/size)

- **Upload Flow**
  - Ścieżka: `/admin/flyers/:flyerId/upload`
  - Główny cel: upload stron (client compression, sign → upload → register)
  - Kluczowe informacje: drag&drop area, progress bars per file, retry controls, final register status
  - Kluczowe komponenty: UploadDropzone, CompressionWorker, UploadQueue (retry/backoff), SignedUploadService (calls `POST /api/v1/uploads/sign`)
  - UX/A11Y/Security: show file errors inline, prevent accidental navigation (unsaved changes prompt), progress accessible by screen readers

- **Page Verification (Split‑screen)**
  - Ścieżka: `/admin/pages/:pageId/verify`
  - Główny cel: weryfikacja i edycja produktów wyekstrahowanych z jednej strony (batch apply)
  - Kluczowe informacje: lewa kolumna — image canvas z zoom & bounding‑box editor, prawa kolumna — lista produktów (editable fields), akcje `approve/save/delete`, conflict/version meta
  - Kluczowe komponenty:
    - ImageCanvas: zoom, pan, keyboard accessible box creation, snap to bounding box, export bounding box coords
    - ProductsEditorList: inline editors (name, price_promo, price_regular, category, conditions), field validation, inline errors
    - VerifyActionsBar: `Approve all`, `Save`, `Delete selected`, `Reject page`
    - VersionControlModal: merge/overwrite on ETag conflict
  - UX/A11Y/Security: keyboard operable canvas controls, aria descriptions for boxes, optimistic updates with rollback, audit metadata stored on save
  - API mapping: GET `/api/v1/pages/:id?include=products,ai_raw_response` (load), POST `/api/v1/pages/:page_id/verify-actions` (batch save), conflict handling via ETag/version

- **Jobs / Processing Status**
  - Ścieżka: `/admin/jobs`
  - Główny cel: monitorowanie przetwarzania AI (polling)
  - Kluczowe informacje: job list, progress, retry controls, job_id link
  - Kluczowe komponenty: JobsTable (polls GET `/api/v1/jobs/:job_id/status`), RetryButton (POST `/api/v1/pages/:id/processing/retry`)
  - UX/A11Y/Security: disable retry if not allowed, informative error banners

- **Settings / Audit Logs**
  - Ścieżka: `/admin/settings` i `/admin/audit`
  - Główny cel: konfiguracja i przegląd audytu działań adminów
  - Kluczowe informacje: lista akcji (userId, action, pageId, diff), konfiguracje limits (upload size, processing hints)
  - Kluczowe komponenty: AuditTable, SettingsForm
  - UX/A11Y/Security: only admin role, paginated logs, sensitive data redaction

## 3. Mapa podróży użytkownika

- Główny przepływ (User / Shopper)
 1. Wejście na stronę `/` — ładowanie listy produktów (TanStack Query, stale‑while‑revalidate).
 2. Użytkownik wpisuje frazę w SearchBar (debounce 300–500ms) → GET `/api/v1/search/products` + filters (store, category).
 3. Użytkownik przewija — lazy load (infinite scroll/cursor) ładuje kolejne strony.
 4. Klik na `ProductCard` → otwarcie `Product Detail` modal z przyciskiem „Zobacz gazetkę”.
 5. Klik „Zobacz gazetkę” → otwarcie Page Lightbox z linkiem do source page (jeśli publiczny).

- Admin flow (Admin)
 1. Login `/login` → po uwierzytelnieniu frontend sprawdza `profiles.role` → przekierowanie do `/admin`.
 2. Admin tworzy/otwiera `Flyer` → idzie do `/admin/flyers/:id/pages`.
 3. Upload: admin przechodzi do `/admin/flyers/:id/upload`, wybiera pliki (drag&drop), klient kompresuje obrazy, klient żąda `POST /api/v1/uploads/sign` dla każdego pliku, uploaduje (pre‑signed), następnie rejestruje stronę `POST /api/v1/flyers/:flyer_id/pages`.
 4. Po rejestracji admin wyzwala przetwarzanie: POST `/api/v1/jobs/pages/:page_id/process` lub PATCH `/api/v1/pages/:id/processing/start`. UI pokazuje job (polling).
 5. Gdy strona zakończona (`processing_status='do_verification'`), admin otwiera `/admin/pages/:id/verify` — wykonuje edycje na liście produktów i bounding boxach, klika `Save/Approve` → POST `/api/v1/pages/:page_id/verify-actions`. UI stosuje optimistic update, w razie błędu rollback i inline error banner.
 6. W przypadku konfliktu wersji, pokazujemy `VersionControlModal` z opcjami merge/overwrite.

## 4. Układ i struktura nawigacji

- Globalna nawigacja (header + mobile bottom nav)
  - Public: Logo (link `/`), Search (przycisk/komponent), Menu (filters), Login/Profile
  - Admin (po zalogowaniu i z rolą admin): Sidebar z sekcjami — Dashboard, Flyers, Upload, Jobs, Audit, Settings; topbar z szybkim search i użytkownikiem (logout)
  - Mobile: hamburger → slide‑in nav; admin: condensed bottom nav + expandable sidebar na desktop

- Breadcrumbs i kontekst
  - W widokach admin (FlyerPages, PageVerify) pokazujemy breadcrumbs dla szybkiego powrotu do listingów

- Route guards
  - Middleware `src/middleware/index.ts` (zgodnie z projektem) blokuje dostęp do `/admin/*` jeśli brak roli admin; komponenty również weryfikują `profiles` i fallbackują do 403 UI

## 5. Kluczowe komponenty

- SearchBar
  - Debounce 300–500ms, accessible input, suggestions optional, calls `GET /api/v1/search/products`

- FiltersBar
  - Store multiselect, Category select (closed list), clear all, accessible checkbox controls

- ProductCard
  - Responsive card with image placeholder, name, prices, icon category, link to modal

- ImageViewer / Lightbox
  - Responsive, srcset, blurred placeholder, zoom/pan, keyboard controls, focus trap

- ImageCanvas (bounding box editor)
  - Pan/zoom, create/edit boxes, keyboard equivalents, export coords; accessible labels for each box; undo for box edits

- ProductsEditorList
  - Editable rows with validation, inline error mapping from `{ error: { code, message, details } }`

- UploadQueue & CompressionWorker
  - Client compression, per‑file progress, retry/backoff, local queue for resumable/retries

- VerifyActionsBar
  - Batch actions, confirmation modals for bulk approve/delete, shows ETag/version

- JobsTable (polling)
  - Polls job status, visual progress bars, retry/ cancel actions

- ErrorBanner & FieldError
  - Centralized error banner + per‑field error components that map API error shape

## 6. Mapowanie endpointów API → UI (kluczowe)

- GET `/api/v1/search/products` → SearchBar + ProductList (public search)
- GET `/api/v1/products` → ProductList (list view)
- GET `/api/v1/products/:id` → ProductDetail modal
- POST `/api/v1/uploads/sign` → UploadFlow (signed URLs)
- POST `/api/v1/flyers/:flyer_id/pages` → Register uploaded page
- PATCH `/api/v1/pages/:id/processing/start` / POST `/api/v1/jobs/pages/:page_id/process` → Jobs/Processing (polling)
- GET `/api/v1/jobs/:job_id/status` → JobsTable polling
- GET `/api/v1/pages/:id?include=products,ai_raw_response` → Page Verification (initial load)
- POST `/api/v1/pages/:page_id/verify-actions` → Page Verification (batch save)
- POST `/api/v1/pages/:id/processing/retry` → Retry control in Jobs/Pages list

Każdy endpoint jest używany przez TanStack Query (cache keys: resource + id + params), mutacje używają optimistic updates i w razie błędu wykonują rollback.

## 7. Obsługa błędów i przypadki brzegowe

- Walidacja uploadu: reject non‑JPG/PNG, size limit (UI: show error). (Otwarte: określić dokładny MB limit.)
- Network loss podczas uploadu: lokalna queue + retry/backoff; informacja o statusie uploadu; możliwość resume lub requeue.
- Job timeout / cost exceed: job shows error state with option `Retry` i szczegóły błędu; admin musi potwierdzić retry dla opłat.
- Conflict (ETag/version mismatch) przy save verify: open VersionControlModal z diff (local vs server) → merge / overwrite / cancel.
- Empty page (no products): system oznacza `no_products` — UI shows "Brak produktów" i możliwość `Mark as no_products`.
- Partial failure on batch save: atomic transaction expected server‑side; UI shows per‑item errors and allows re-editing only for failed items.
- Accessibility edge cases: canvas operations must be translatable to keyboard actions; provide alternative form‑based product selection/creation for users who cannot use drag.

## 8. Mapowanie historyjek użytkownika → UI

- US-001 (Login): `/login` + middleware role check → redirect to `/admin` or `/`
- US-002 (Upload stron): `/admin/flyers/:id/upload` + UploadQueue + client compression + `POST /api/v1/uploads/sign` + register page
- US-003 (Manual AI processing): `/admin/flyers/:id/pages` → action trigger → PATCH `/api/v1/pages/:id/processing/start` / job listing
- US-004 (Split‑screen verification): `/admin/pages/:id/verify` → ImageCanvas + ProductsEditorList + POST `/api/v1/pages/:page_id/verify-actions`
- US-005..US-007 (Product browsing/search/filter): `/` + SearchBar + FiltersBar + `GET /api/v1/search/products` + infinite scroll
- US-008 (Source page preview): ProductDetail modal → Page Lightbox (ImageViewer)

## 9. Wymagania UI → elementy interfejsu (wytyczne)

- **Wyszukiwanie**: debounce 300–500ms, graceful empty state, suggestions optional
- **Filtrowanie**: persistent filter state in URL query params for shareable links
- **Upload**: per‑file progress + overall progress; preflight validation; disable submit while processing; accessible retry
- **Verification**: bulk apply with confirmation; optimistic UI + undo; version control on conflict
- **Dostępność**: aria‑labels, visible focus states, keyboard operable canvas, focus traps in modals
- **Bezpieczeństwo**: role checks, route guards, no exposure of service keys, rate limiting UI feedback

## 10. Potencjalne punkty bólu użytkownika i ich rozwiązania

- Wolne przetwarzanie AI → pokazujemy progress + estimated time + opcję „Notify me” + retry. Polling z backoff.
- Błędy walidacji po batch save → mapujemy błędy per‑pole i utrzymujemy local edits (not losing work).
- Utrata sieci w trakcie uploadu → local retry queue, możliwość cancel and requeue, informacja o stanie.
- Trudności z obsługą bounding boxes → keyboard controls, prefill from AI boxes, undo history, snap/grid guides.
- Koszty przy masowych operacjach → warning modals, limits per action, require confirmations for large batches.
