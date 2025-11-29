# REST API Plan

This document defines a REST API for SavingsAgent based on the provided database schema, PRD, and tech stack (Astro + React frontend, TypeScript backend using Supabase/Postgres). It focuses on resources, endpoints, payloads, authentication/authorization, validation, business logic and performance/security considerations.

## 1. Resources
- **Auth / Profiles** — `profiles` (extends `auth.users`)  
- **Stores** — `stores`  
- **Categories** — `categories`  
- **Flyers** — `flyers`  
- **Pages** — `pages` (images, processing status, AI responses)  
- **Products** — `products` (extracted offers)  
- **Search** — search endpoints using FTS + trigram (`products.search_vector`, `name`, `description`)  
- **Storage / Upload** — Supabase Storage (`flyer-pages` bucket), upload/URL management  
- **AI Processing** — processing triggers and status endpoints (server-side job orchestration)

## 2. Conventions, global behaviors
- Base URL: /api/v1  
- All request/response bodies use JSON except upload which uses multipart/form-data or pre-signed URLs.  
- Pagination default: page & per_page (or cursor-based token). Default per_page = 20, max = 100. Responses include `meta` with `total`, `page`, `per_page` (or `next_cursor`).  
- All list endpoints support filtering, sorting and searching where relevant. Filtering uses query params (e.g. `?store_id=...&category_id=...`). Sorting via `sort` param (e.g. `sort=price_asc` or `sort=created_at_desc`).  
- All endpoints requiring modification are protected to Admin role (via JWT + role check against `profiles.role`). Public read endpoints use Supabase anon key and RLS for enforcement.  
- Error responses follow: { "error": { "code": "<ERR_CODE>", "message": "<human message>", "details": {...} } }  

## 3. Endpoints
Note: For each endpoint we provide method, path, description, params, request and response shapes, status codes and validation highlights.

### 3.1 Stores
- GET /api/v1/stores  
  - Description: List stores (public). Supports `?q`, `?limit`, `?page`.  
  - Response: { data: [ { id, name, logo_url } ], meta }  

- POST /api/v1/stores  
  - Description: Create store (admin only).  
  - Body: { "name": "Lidl", "logo_url": "/logos/lidl.svg" }  
  - Validation: `name` required, unique (enforce DB uniqueness).  
  - Response: 201 { id, name, logo_url, created_at }  

- PATCH /api/v1/stores/:id  
  - Description: Update store (admin only).  
  - Body: partial store fields. Validation: `name` cannot be null or duplicate.  

- DELETE /api/v1/stores/:id  
  - Description: Delete store (admin only). DB: ON DELETE RESTRICT if flyers exist — API must detect and return 409 conflict with message "store has flyers".

### 3.2 Categories
- GET /api/v1/categories  
  - Public list; support `?sort=display_order`  
  - Response: [ { id, name, icon_name, display_order } ]  

- POST /api/v1/categories (admin)  
  - Body: { name, icon_name, display_order }  
  - Validation: `name` unique, `icon_name` required

- PATCH /api/v1/categories/:id (admin)  
- DELETE /api/v1/categories/:id (admin)  
  - Note: Deletion blocked if products reference category (DB RESTRICT) — return 409 conflict.

### 3.3 Flyers
- GET /api/v1/flyers  
  - Description: Public list of active flyers by default. Query params: `?status=active|draft|archived`, `?store_id=`, `?valid_from=`, `?valid_to=`.  
  - Response: { data: [ { id, store_id, store_name, valid_from, valid_to, status } ], meta }  

- POST /api/v1/flyers (admin)  
  - Body: { "store_id": UUID, "valid_from": "YYYY-MM-DD", "valid_to": "YYYY-MM-DD", "status": "draft" }  
  - Validation: `valid_to >= valid_from` (enforce before DB insert). `store_id` must exist.  
  - Response: 201 flyer object.

- GET /api/v1/flyers/:id  
  - Description: Flyer detail including pages (optionally). Query param `?include=pages`.  
  - Response: flyer + pages meta (not full products unless explicitly requested).

- PATCH /api/v1/flyers/:id (admin)  
  - Body: partial fields; validate date check on updates.

- DELETE /api/v1/flyers/:id (admin)  
  - Behavior: Cascades to pages/products (DB cascade). Return 204.

### 3.4 Pages (image + processing)
- GET /api/v1/flyers/:flyer_id/pages  
  - List pages of flyer: supports `?processing_status=` and pagination.  
  - Response: [ { id, page_number, image_path, processing_status, processing_started_at, verified_by, verified_at } ]

- POST /api/v1/flyers/:flyer_id/pages/upload-url (admin)  
  - Description: Create a pre-signed upload URL or accept multipart upload. Preferred: return Supabase Storage signed URL via server-side SDK.  
  - Body: { "page_number": 1, "filename": "page_1.jpg", "content_type": "image/jpeg", "width": 1200, "height": 1600 }  
  - Response: { upload_url, public_path }  
  - Validation: `page_number` unique per flyer (DB unique constraint).

- POST /api/v1/flyers/:flyer_id/pages (admin)  
  - Description: Register uploaded page record after upload or during upload flow. Accepts `image_path`, width/height.  
  - Body: { page_number, image_path, image_width?, image_height? }  
  - Validation: unique page number, check image dimensions (both null or both > 0).

- PATCH /api/v1/pages/:id/processing/start (admin)  
  - Description: Mark page as `processing` and enqueue AI job. Response returns job id/status.  
  - Request: none or { force: true }  
  - Behavior: set `processing_started_at=now()`, `processing_status='processing'`. Create job in background worker (Cloud Function or job queue).  

- POST /api/v1/pages/:id/processing/retry (admin)  
  - Retries failed processing.

- GET /api/v1/pages/:id  
  - Returns page full object including `ai_raw_response`, `error_details`, and `products` if `?include=products`.

- PATCH /api/v1/pages/:id/verify (admin)  
  - Body: { "verified_by": <profile_id>, "verified_at": timestamp, "processing_status": "verified" } or accept action like `action=approve|reject|no_products`.  
  - Behavior: On approve, set `processing_status='verified'`. On reject, set `processing_status='error'` with `error_details`.

### 3.5 Products
- GET /api/v1/products  
  - Description: Primary public listing (use view `v_active_products` where possible). Query params: `?store_id`, `?category_id`, `?q` (search), `?min_price`, `?max_price`, `?sort`, `?page`, `?per_page`.  
  - Search: `q` triggers full-text search + trigram similarity fallback. Support `similarity_threshold` param optionally.  
  - Sorting: `price_asc`, `price_desc`, `created_at_desc` (newest).  
  - Response: { data: [ { product_id, product_name, description, price_promo, price_regular, conditions, category, store, valid_from, valid_to, page_image_path } ], meta }

- GET /api/v1/products/:id  
  - Returns product with bounding_box, full metadata, source page id and link.

- POST /api/v1/pages/:page_id/products (admin via verification UI)  
  - Description: Create product extracted from page (or manual add).  
  - Body: { name, description?, price_promo, price_regular?, conditions?, category_id, bounding_box? }  
  - Validation: `price_promo > 0`, `price_regular == null or price_regular >= price_promo`  
  - Response: 201 product object.

- PATCH /api/v1/products/:id (admin)  
  - Edit product fields. On successful update, update `search_vector` (DB trigger will also update).  

- DELETE /api/v1/products/:id (admin)  
  - Soft-delete not in schema; deletion cascades only via pages/flyers as per DB. Return 204.

### 3.6 Search helper endpoints
- GET /api/v1/search/products  
  - Query params: `q` (required), `store_id?`, `category_id?`, `similarity_threshold?`, `page`, `per_page`.  
  - Implementation: Prefer server-side SQL function `search_products(search_query, similarity_threshold)` or use `plainto_tsquery` + `similarity` with `pg_trgm`. Trigram fallback improves typo tolerance.  
  - Response: same as products list.

### 3.7 AI Processing / Jobs
- POST /api/v1/jobs/pages/:page_id/process (admin)  
  - Description: Enqueue processing job (OCR -> LLM -> extraction). Returns job id and status.  
  - Request: { model_hint?, cost_limit_cents? } optional.  
  - Response: { job_id, status }  
  - Callbacks: Worker updates `pages.ai_raw_response`, `pages.processing_status`, `pages.error_details` and creates/updates `products` rows in a transactional manner. If page contains no products, set status `no_products`.

- GET /api/v1/jobs/:job_id/status  
  - Polling endpoint for UI to show progress.

### 3.8 Admin verification UI actions (split-screen)
- POST /api/v1/pages/:page_id/verify-actions  
  - Body: { actions: [ { type: "approve_product" | "edit_product" | "delete_product" | "approve_page" | "reject_page" , payload: {...} } ], reviewer_id }  
  - Description: Batch changes produced by the verification UI; apply in a transaction. On "approve_page", products created/updated are set to `verified` (or page processing_status updated to `verified`).

### 3.10 Storage / Uploads
- POST /api/v1/uploads/sign (admin)  
  - Body: { filename, content_type, flyer_slug, flyer_id, page_number }  
  - Response: { upload_url, public_path } — uses Supabase Storage signed upload or direct SDK. After upload complete, client calls page register endpoint.

### 3.11 Health & Monitoring
- GET /api/v1/health  
  - Returns DB connectivity, storage connectivity, AI provider connectivity statuses.

## 4. Authentication & Authorization
- Mechanism: Supabase Auth (JWT). Frontend uses Supabase SDK to sign in; backend validates JWT on protected endpoints and extracts user id (`auth.uid()` equivalent) and maps to `profiles` row to check `role`.  
- Authorization policy:
  - Public read endpoints: allow via RLS and direct SELECT from views (e.g., `v_active_products`). Server ensures anonymous requests use anon key; server endpoints should still validate tokens for protected features.  
  - Admin endpoints: require `Authorization: Bearer <access_token>` AND `profiles.role == 'admin'`. The API verifies token, queries `profiles` for role and denies 403 if not admin.  
- Recommended: Verify `Authorization` header on every modifying endpoint. Use short-lived Access Tokens and refresh via Supabase.

## 5. Validation & DB constraints mapping
- `profiles.role`: enum('admin','user') — validate on create/update.  
- `stores.name`: required, unique — check before create; handle 409 on DB unique constraint violation.  
- `categories.name`: required, unique.  
- `flyers.valid_to >= valid_from`: validate date logic on create/update; return 400 with message if violated.  
- `pages.page_number` is unique per flyer: enforce 400 if duplicate attempted.  
- `pages.image_width` & `image_height`: either both null or both > 0 — validate on register.  
- `products.price_promo > 0`, `price_regular == null or > 0`, and if provided `price_regular >= price_promo`: enforce at API validation layer and rely on DB checks. Return 400 with field errors.  
- Deletion semantics: `stores` deletion returns 409 if associated flyers exist; `categories` deletion returns 409 if products exist. Use DB ON DELETE rules and surface human-friendly messages.

## 6. Business logic mapping (PRD -> API)
- Upload flow (US-002):  
  - Client obtains signed upload URL via `/uploads/sign`, uploads image to storage, then registers the page via `POST /flyers/:flyer_id/pages` (page record created with `processing_status='pending'`).  
- Manual AI processing (US-003):  
  - Admin triggers `/pages/:id/processing/start` or `/jobs/pages/:page_id/process`. Worker updates `pages.processing_status` to `processing` and later to `verified` / `error` / `no_products`. Jobs support retry endpoint.  
- Verification & split-screen (US-004):  
  - The UI calls `GET /pages/:id?include=products,ai_raw_response` to render image + extracted products. The reviewer posts batch actions to `/pages/:page_id/verify-actions` which applies product upserts/deletes and sets `processing_status='verified'`.  
- Client browsing, filters, search, pagination (US-005..US-007):  
  - `GET /products` + `GET /search/products` handle lazy loading + filters + sort. Use `v_active_products` view to simplify SQL and enforce `f.status='active'` + `pages.processing_status='verified'`.

## 7. Search & performance considerations
- Use DB-side FTS + trigram indices described in schema: `search_vector` GIN + trigram indexes on `name` and `description`. Implement search endpoint that calls the `search_products` function if present.  
- For heavy list endpoints use cursor-based pagination if product volume grows (>100k). For initial MVP offset pagination is acceptable with `per_page <= 100`.  
- Add cache headers on public endpoints and consider CDN for storage images. Use HTTP caching for product lists (short TTL) and ETag for product details.  
- Rate limiting: apply global API rate limit (e.g., 60 req/min per IP) and stricter limits for auth endpoints and job triggering (e.g., 10 process triggers/min per admin) to control costs of AI processing.

## 8. Security & operational controls
- Authentication: Supabase Auth JWT validation on backend. Use service role keys only server-side when interacting with Supabase Admin features. Never expose service-role keys to frontend.  
- Authorization: Role checks against `profiles.role`. Use RLS policies for DB-level enforcement as defined in schema.  
- Input validation: Strict schema validation (TypeScript / Zod) for all incoming payloads. Sanitize text fields before sending to LLM/OCR pipelines.  
- Upload validation: Validate MIME type and size on upload; prefer client-side compression and server-side verification.  
- Audit & logging: Log admin actions (who approved/edited pages/products), include `verified_by` and `verified_at`. Store `ai_raw_response` for audit and debugging.  
- Cost controls: Jobs accept optional limits (max tokens/cost hint). Enforce server-side quotas and use queueing to throttle AI requests.  
- Backups & monitoring: Health endpoint, job queue metrics, and DB monitoring (slow queries). Use `VACUUM ANALYZE` after heavy imports and `REINDEX` materialized views periodically.

## 9. Error handling and common HTTP codes
- 200 OK — success read  
- 201 Created — resource created  
- 202 Accepted — job accepted (processing)  
- 204 No Content — successful delete w/o body  
- 400 Bad Request — validation error (body includes field errors)  
- 401 Unauthorized — missing/invalid token  
- 403 Forbidden — insufficient role/permission  
- 404 Not Found — resource not found  
- 409 Conflict — uniqueness / delete blocked due to FK (DB RESTRICT)  
- 422 Unprocessable Entity — business rule violation (e.g., valid_to < valid_from)  
- 500 Internal Server Error — unexpected errors (include job id/log ref)

## 10. Implementation notes & assumptions
- Assumptions:
  - Supabase Auth is primary auth provider; tokens are available to frontend.  
  - File uploads use Supabase Storage; backend can mint signed upload URLs.  
  - A background worker / cloud function exists to process AI jobs and update DB.  
  - For MVP, offset pagination is acceptable, but endpoints provide cursor-based hooks for future upgrade.  
- Recommended server responsibilities (Node/TypeScript):
  - Validate JWT and map to `profiles` record on each request.  
  - Use typed DTOs (Zod/TypeBox) to validate payloads.  
  - Use DB transactions for batch verification actions to ensure atomicity.  
  - Surface DB constraint failures as 4xx with clear messages (translate unique violation and FK errors).

## 11. Example payloads (high-level)
- Create flyer:
```json
{
  "store_id": "550e8400-e29b-41d4-a716-446655440000",
  "valid_from": "2025-11-01",
  "valid_to": "2025-11-07",
  "status": "draft"
}
```

- Create product (admin verification):
```json
{
  "name": "Masło Extra 200g",
  "description": "200g, Mlekovita",
  "price_promo": 4.99,
  "price_regular": 6.49,
  "conditions": "limit 2 per customer",
  "category_id": "uuid-category-dairy",
  "bounding_box": { "x": 100, "y": 200, "width": 300, "height": 400 }
}
```

## 12. Next steps (implementation roadmap)
1. Implement authentication stub + role-check middleware (Supabase JWT validation).  
2. Implement storage signing endpoint and client upload flow.  
3. Implement flyers/pages CRUD + page registration + unique constraints.  
4. Implement job queue + AI processing worker and job status endpoints.  
5. Implement products endpoints and `v_active_products`-backed list for frontend.  
6. Implement search endpoint using `search_products` SQL function and indexes.  
7. Add rate limiting, monitoring and logging.

---

This plan maps the DB schema and PRD features into a RESTful set of endpoints suitable for the specified tech stack (Astro + React front-end, TypeScript server, Supabase Postgres) and includes validation, security, performance and operational guidance for the MVP and near-term scaling.


