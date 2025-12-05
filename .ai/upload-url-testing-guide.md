# Przewodnik testowania endpointa POST /api/v1/flyers/:flyer_id/pages/upload-url

## Przegląd
Endpoint generuje pre-signed upload URL dla obrazów stron gazetki. Dostępny tylko dla administratorów.

## Wymagania wstępne
- Działająca instancja Supabase z bucketem `flyer-pages`
- Użytkownik z rolą `admin` w tabeli `profiles`
- Token autoryzacyjny (Bearer token)
- Istniejąca gazetka w bazie danych

## Scenariusze testowe

### 1. ✅ Happy Path - Prawidłowe żądanie

**Request:**
```bash
POST /api/v1/flyers/123e4567-e89b-12d3-a456-426614174000/pages/upload-url
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "page_number": 1,
  "filename": "page_1.jpg",
  "content_type": "image/jpeg",
  "width": 1200,
  "height": 1600
}
```

**Expected Response:** `201 Created`
```json
{
  "data": {
    "upload_url": "https://...supabase.co/storage/v1/object/upload/sign/flyer-pages/...",
    "public_path": "lidl/123e4567-e89b-12d3-a456-426614174000/page_1.jpg",
    "expires_at": "2025-12-04T13:34:56.789Z"
  }
}
```

### 2. ✅ Prawidłowe żądanie bez width/height

**Request:**
```bash
POST /api/v1/flyers/123e4567-e89b-12d3-a456-426614174000/pages/upload-url
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "page_number": 2,
  "filename": "page_2.png",
  "content_type": "image/png"
}
```

**Expected Response:** `201 Created`

---

### 3. ❌ Brak autoryzacji (401 Unauthorized)

**Request:**
```bash
POST /api/v1/flyers/123e4567-e89b-12d3-a456-426614174000/pages/upload-url
Content-Type: application/json

{
  "page_number": 1,
  "filename": "page_1.jpg",
  "content_type": "image/jpeg"
}
```

**Expected Response:** `401 Unauthorized`
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Brak tokenu autoryzacji"
  }
}
```

### 4. ❌ Nieprawidłowy token (401 Unauthorized)

**Request:**
```bash
POST /api/v1/flyers/123e4567-e89b-12d3-a456-426614174000/pages/upload-url
Authorization: Bearer invalid_token_xyz
Content-Type: application/json

{
  "page_number": 1,
  "filename": "page_1.jpg",
  "content_type": "image/jpeg"
}
```

**Expected Response:** `401 Unauthorized`
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Nieprawidłowy token autoryzacji"
  }
}
```

### 5. ❌ Użytkownik nie jest adminem (403 Forbidden)

**Request:**
```bash
POST /api/v1/flyers/123e4567-e89b-12d3-a456-426614174000/pages/upload-url
Authorization: Bearer <regular_user_token>
Content-Type: application/json

{
  "page_number": 1,
  "filename": "page_1.jpg",
  "content_type": "image/jpeg"
}
```

**Expected Response:** `403 Forbidden`
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Brak uprawnień do wykonywania tej akcji"
  }
}
```

---

### 6. ❌ Gazetka nie istnieje (404 Not Found)

**Request:**
```bash
POST /api/v1/flyers/00000000-0000-0000-0000-000000000000/pages/upload-url
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "page_number": 1,
  "filename": "page_1.jpg",
  "content_type": "image/jpeg"
}
```

**Expected Response:** `404 Not Found`
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Gazetka o ID \"00000000-0000-0000-0000-000000000000\" nie została znaleziona"
  }
}
```

---

### 7. ❌ Nieprawidłowy format JSON (400 Bad Request)

**Request:**
```bash
POST /api/v1/flyers/123e4567-e89b-12d3-a456-426614174000/pages/upload-url
Authorization: Bearer <admin_token>
Content-Type: application/json

{invalid json}
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nieprawidłowy format JSON"
  }
}
```

### 8. ❌ Brak wymaganych pól (400 Bad Request)

**Request:**
```bash
POST /api/v1/flyers/123e4567-e89b-12d3-a456-426614174000/pages/upload-url
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "page_number": 1
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nieprawidłowe dane wejściowe",
    "details": {
      "filename": ["Nazwa pliku jest wymagana"],
      "content_type": ["Required"]
    }
  }
}
```

### 9. ❌ Nieprawidłowy page_number (400 Bad Request)

**Request:**
```bash
POST /api/v1/flyers/123e4567-e89b-12d3-a456-426614174000/pages/upload-url
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "page_number": -1,
  "filename": "page_1.jpg",
  "content_type": "image/jpeg"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nieprawidłowe dane wejściowe",
    "details": {
      "page_number": ["Numer strony musi być > 0"]
    }
  }
}
```

### 10. ❌ Nieprawidłowy filename (niedozwolone znaki) (400 Bad Request)

**Request:**
```bash
POST /api/v1/flyers/123e4567-e89b-12d3-a456-426614174000/pages/upload-url
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "page_number": 1,
  "filename": "../../../etc/passwd",
  "content_type": "image/jpeg"
}
```

**Expected Response:** `400 Bad Request`
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

### 11. ❌ Nieprawidłowy content_type (400 Bad Request)

**Request:**
```bash
POST /api/v1/flyers/123e4567-e89b-12d3-a456-426614174000/pages/upload-url
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "page_number": 1,
  "filename": "page_1.pdf",
  "content_type": "application/pdf"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nieprawidłowe dane wejściowe",
    "details": {
      "content_type": ["Dozwolone typy: image/jpeg, image/png, image/webp"]
    }
  }
}
```

### 12. ❌ Niepełne width/height (400 Bad Request)

**Request:**
```bash
POST /api/v1/flyers/123e4567-e89b-12d3-a456-426614174000/pages/upload-url
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "page_number": 1,
  "filename": "page_1.jpg",
  "content_type": "image/jpeg",
  "width": 1200
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nieprawidłowe dane wejściowe",
    "details": {
      "width": ["Jeśli podano width lub height, oba pola muszą być wypełnione"]
    }
  }
}
```

---

## Przepływ użycia

1. **Klient wysyła POST request** z metadanymi strony (page_number, filename, content_type)
2. **Backend generuje signed URL** i zwraca je klientowi
3. **Klient wykonuje PUT request** bezpośrednio do Supabase Storage używając `upload_url`:
   ```bash
   PUT <upload_url>
   Content-Type: image/jpeg
   
   <binary image data>
   ```
4. **Po udanym uploadzie** klient może zarejestrować stronę w bazie używając endpointa `POST /api/v1/flyers/:flyer_id/pages` (do implementacji)

---

## Notatki implementacyjne

### ✅ Zaimplementowane zabezpieczenia:
- Autoryzacja admin-only (requireAdmin)
- Walidacja UUID flyer_id
- Walidacja JSON body (Zod)
- Whitelist content_type (tylko obrazy)
- Sanity check filename (brak path traversal)
- Width/height parowanie (oba lub żadne)

### ✅ Obsługiwane kody statusu:
- `201 Created` - sukces
- `400 Bad Request` - błędy walidacji
- `401 Unauthorized` - brak/nieprawidłowy token
- `403 Forbidden` - nie-admin
- `404 Not Found` - gazetka nie istnieje
- `500 Internal Server Error` - błąd serwera/storage

### 🔧 Potencjalne rozszerzenia:
- Rate limiting (np. 10 req/min per admin)
- Logging błędów do tabeli `api_errors`
- Metryki (liczba wygenerowanych URLi, success rate)
- Sprawdzenie duplikatu page_number przed generowaniem URL

