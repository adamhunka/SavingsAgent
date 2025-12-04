# POST /api/v1/uploads/sign - Przykłady użycia

## Request

### Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Body
```json
{
  "flyer_id": "550e8400-e29b-41d4-a716-446655440000",
  "flyer_slug": "lidl",
  "page_number": 1,
  "filename": "page_1.jpg",
  "content_type": "image/jpeg",
  "width": 1920,
  "height": 1080
}
```

## Response

### Success (201)
```json
{
  "upload_url": "https://your-supabase-url.supabase.co/storage/v1/object/upload/sign/flyer-pages/lidl/550e8400-e29b-41d4-a716-446655440000/page_1.jpg?token=...",
  "public_path": "lidl/550e8400-e29b-41d4-a716-446655440000/page_1.jpg",
  "expires_at": "2025-12-04T13:45:00.000Z"
}
```

## Error Responses

### 400 - Validation Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nieprawidłowe dane wejściowe",
    "details": {
      "filename": ["Nazwa pliku może zawierać tylko litery, cyfry, _, -, ."]
    }
  }
}
```

### 401 - Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Nieprawidłowy token autoryzacji"
  }
}
```

### 403 - Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Brak uprawnień do wykonywania tej akcji"
  }
}
```

### 404 - Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Gazetka o podanym ID nie istnieje"
  }
}
```

## Flow użycia

1. **Klient wywołuje endpoint** aby uzyskać signed upload URL
2. **Klient uploaduje plik** do otrzymanego `upload_url` metodą PUT
3. **Klient rejestruje stronę** przez POST /api/v1/pages z `public_path`

## Przykład kompletnego flow

### Krok 1: Uzyskanie signed URL
```bash
curl -X POST http://localhost:4321/api/v1/uploads/sign \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flyer_id": "550e8400-e29b-41d4-a716-446655440000",
    "flyer_slug": "lidl",
    "page_number": 1,
    "filename": "page_1.jpg",
    "content_type": "image/jpeg",
    "width": 1920,
    "height": 1080
  }'
```

### Krok 2: Upload pliku do signed URL
```bash
curl -X PUT "UPLOAD_URL_FROM_STEP_1" \
  -H "Content-Type: image/jpeg" \
  --data-binary @page_1.jpg
```

### Krok 3: Rejestracja strony w bazie
```bash
curl -X POST http://localhost:4321/api/v1/pages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flyer_id": "550e8400-e29b-41d4-a716-446655440000",
    "page_number": 1,
    "image_path": "lidl/550e8400-e29b-41d4-a716-446655440000/page_1.jpg",
    "image_width": 1920,
    "image_height": 1080
  }'
```

## Wymagania środowiskowe

Upewnij się, że w `.env` znajdują się następujące zmienne:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Testowanie lokalne

### Uruchom Supabase lokalnie
```bash
supabase start
```

### Uruchom serwer Astro
```bash
npm run dev
```

### Pobierz token użytkownika admin
Zaloguj się przez aplikację lub uzyskaj token z Supabase Dashboard.

