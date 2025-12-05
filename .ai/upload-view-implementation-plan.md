# Plan implementacji widoku Upload Flow

## 1. Przegląd

Widok Upload Flow to kluczowy element panelu administratora, który umożliwia wgrywanie obrazów stron gazetek promocyjnych do systemu. Widok realizuje pełny cykl: wybór plików → walidacja → kompresja po stronie klienta → pobranie signed URL → upload do Supabase Storage → rejestracja strony w bazie danych → opcjonalne uruchomienie przetwarzania AI.

Główne cele widoku:
- Zapewnienie intuicyjnego interfejsu drag & drop do wgrywania wielu plików jednocześnie
- Kompresja obrazów przed wysłaniem (redukcja kosztów transferu i storage)
- Walidacja formatu i rozmiaru plików
- Wizualizacja postępu uploadu z obsługą błędów i retry
- Zapobieganie przypadkowej utracie danych podczas procesu uploadu
- Opcjonalne uruchomienie przetwarzania AI bezpośrednio po uploadzie

## 2. Routing widoku

**Ścieżka:** `/admin/flyers/:flyerId/upload`

**Routing guards:**
- Wymagana rola: `admin` (weryfikacja przez middleware)
- Weryfikacja istnienia gazetki o podanym `flyerId` (redirect do 404 jeśli nie istnieje)
- Sprawdzenie czy gazetka nie jest w statusie `archived` (komunikat o niemożności dodawania stron)

**Parametry URL:**
- `flyerId` (UUID) - identyfikator gazetki, do której dodawane są strony

**Query params (opcjonalne):**
- `autoProcess=true` - automatyczne uruchomienie przetwarzania po zakończeniu uploadów

## 3. Struktura komponentów

```
UploadView (Astro page)
├── AdminLayout
│   ├── Breadcrumbs
│   └── PageHeader
└── UploadFlowContainer (React)
    ├── FlyerInfoPanel (Astro)
    │   ├── StoreBadge
    │   ├── DateRange
    │   └── StatusIndicator
    ├── UploadDropzone (React)
    │   ├── DropzoneArea
    │   ├── FileInput (hidden)
    │   └── HelpText
    ├── UploadQueue (React)
    │   ├── QueueHeader
    │   │   ├── QueueStats
    │   │   └── BulkActions
    │   └── UploadItemList
    │       └── UploadItem[] (React)
    │           ├── FilePreview
    │           ├── FileInfo
    │           ├── ProgressBar
    │           ├── StatusIcon
    │           └── ActionButtons
    ├── UploadActions (React)
    │   ├── StartUploadButton
    │   ├── ProcessAfterUploadCheckbox
    │   └── CancelAllButton
    └── ErrorBanner (React)
        └── ErrorList
```

## 4. Szczegóły komponentów

### 4.1. UploadView (Astro page)

**Opis:** Główna strona widoku upload, która owija logikę w layout administracyjny i przekazuje parametry z URL do komponentów React.

**Główne elementy:**
- `AdminLayout` - layout ze standardową nawigacją
- `Breadcrumbs` - ścieżka nawigacyjna (Dashboard → Flyers → [Flyer Name] → Upload)
- `PageHeader` - nagłówek z tytułem "Upload stron gazetki"
- `UploadFlowContainer` - główny kontener React z całą logiką

**Obsługiwane zdarzenia:** Brak (strona Astro)

**Warunki walidacji:**
- Weryfikacja parametru `flyerId` z URL (UUID format)
- Sprawdzenie istnienia gazetki w bazie przed renderowaniem
- Weryfikacja uprawnień użytkownika (admin)

**Typy:**
- `FlyerDetailDTO` - szczegóły gazetki do wyświetlenia w FlyerInfoPanel

**Propsy:** Brak (strona Astro)

### 4.2. UploadFlowContainer (React)

**Opis:** Główny kontener React zarządzający stanem całego procesu uploadu. Odpowiedzialny za orkiestrację komponentów i komunikację z API.

**Główne elementy:**
- `FlyerInfoPanel` - panel z informacjami o gazetce
- `UploadDropzone` - obszar do drop plików
- `UploadQueue` - lista plików w kolejce
- `UploadActions` - przyciski akcji
- `ErrorBanner` - banner z błędami globalnymi

**Obsługiwane zdarzenia:**
- `onFilesAdded` - dodanie nowych plików do kolejki
- `onFileRemoved` - usunięcie pliku z kolejki
- `onStartUpload` - rozpoczęcie procesu uploadów
- `onCancelAll` - anulowanie wszystkich uploadów
- `onRetryFailed` - ponowienie nieudanych uploadów
- `onNavigateAway` - próba opuszczenia strony podczas uploadu (prompt)

**Warunki walidacji:**
- Minimum 1 plik w kolejce aby aktywować przycisk "Start Upload"
- Maksymalnie 50 plików jednocześnie w kolejce
- Weryfikacja czy wszystkie pliki zostały przetworzone przed umożliwieniem nawigacji

**Typy:**
- `UploadFlowState` - stan całego procesu uploadu
- `FlyerDetailDTO` - informacje o gazetce

**Propsy:**
```typescript
interface UploadFlowContainerProps {
  flyerId: string;
  flyerData: FlyerDetailDTO;
  autoProcess?: boolean;
}
```

### 4.3. FlyerInfoPanel (React)

**Opis:** Panel wyświetlający podstawowe informacje o gazetce, do której będą uploadowane strony. Pomaga użytkownikowi potwierdzić kontekst operacji.

**Główne elementy:**
- `div` - kontener z informacjami
- `StoreBadge` - badge z nazwą sklepu i logo
- `DateRange` - zakres dat ważności gazetki
- `StatusIndicator` - status gazetki (draft/active)
- `PageCountInfo` - liczba już uploadowanych stron

**Obsługiwane zdarzenia:** Brak (komponent prezentacyjny)

**Warunki walidacji:** Brak

**Typy:**
- `FlyerDetailDTO`

**Propsy:**
```typescript
interface FlyerInfoPanelProps {
  flyer: FlyerDetailDTO;
}
```

### 4.4. UploadDropzone (React)

**Opis:** Obszar drag & drop do dodawania plików. Obsługuje zarówno przeciąganie plików jak i standardowy wybór przez input. Wizualizuje stan "over" podczas przeciągania.

**Główne elementy:**
- `div` - obszar dropzone z event handlers
- `input[type="file"]` - ukryty input do wyboru plików
- `DropzoneIcon` - ikona upload (lucide-react)
- `DropzoneText` - tekst pomocniczy
- `Button` - przycisk "Wybierz pliki" jako alternatywa

**Obsługiwane zdarzenia:**
- `onDragEnter` - wizualizacja "drag over"
- `onDragLeave` - reset wizualizacji
- `onDrop` - przechwycenie upuszczonych plików
- `onClick` - trigger input file dla dostępności
- `onChange` (input) - przechwycenie wybranych plików

**Warunki walidacji:**
- Akceptowane formaty: `image/jpeg`, `image/png`, `image/webp`
- Maksymalny rozmiar pojedynczego pliku: 50MB (przed kompresją)
- Walidacja typu MIME i rozszerzenia (double-check)
- Odrzucenie duplikatów (sprawdzenie nazwy i rozmiaru)

**Typy:**
- `FileWithMetadata` - plik z dodatkowymi metadanymi

**Propsy:**
```typescript
interface UploadDropzoneProps {
  onFilesAdded: (files: FileWithMetadata[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  currentFileCount: number;
}
```

### 4.5. UploadQueue (React)

**Opis:** Komponent wyświetlający listę wszystkich plików w kolejce wraz z ich statusem, postępem i akcjami. Zawiera również nagłówek z statystykami i akcjami bulk.

**Główne elementy:**
- `QueueHeader` - nagłówek z statystykami
- `QueueStats` - statystyki (pending/uploading/success/failed)
- `BulkActions` - akcje bulk (Remove all failed, Retry all failed)
- `UploadItemList` - lista elementów

**Obsługiwane zdarzenia:**
- `onRemoveAllFailed` - usunięcie wszystkich nieudanych
- `onRetryAllFailed` - ponowienie wszystkich nieudanych
- `onClearCompleted` - wyczyszczenie zakończonych pomyślnie

**Warunki walidacji:**
- Akcje bulk aktywne tylko gdy są odpowiednie elementy (np. failed items dla retry)

**Typy:**
- `UploadQueueItem[]` - lista elementów kolejki

**Propsy:**
```typescript
interface UploadQueueProps {
  items: UploadQueueItem[];
  onItemRemove: (id: string) => void;
  onItemRetry: (id: string) => void;
  onRetryAllFailed: () => void;
  onRemoveAllFailed: () => void;
  onClearCompleted: () => void;
}
```

### 4.6. UploadItem (React)

**Opis:** Pojedynczy element w kolejce uploadu. Wyświetla podgląd pliku, informacje, progress bar oraz akcje. Stan wizualny zależy od statusu uploadu.

**Główne elementy:**
- `FilePreview` - miniatura obrazu (canvas/img)
- `FileInfo` - nazwa pliku, rozmiar, page_number
- `ProgressBar` - pasek postępu (0-100%)
- `StatusIcon` - ikona statusu (pending/compressing/uploading/success/error)
- `StatusText` - tekstowy opis statusu
- `ActionButtons` - przyciski (Remove/Retry)
- `ErrorMessage` - komunikat błędu (jeśli status=error)

**Obsługiwane zdarzenia:**
- `onRemove` - usunięcie elementu z kolejki
- `onRetry` - ponowienie uploadu

**Warunki walidacji:**
- Przycisk Retry aktywny tylko dla statusu `error`
- Przycisk Remove nieaktywny dla statusu `uploading` i `compressing`

**Typy:**
- `UploadQueueItem`

**Propsy:**
```typescript
interface UploadItemProps {
  item: UploadQueueItem;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}
```

### 4.7. UploadActions (React)

**Opis:** Panel z głównymi akcjami dla całego procesu uploadu: rozpoczęcie, anulowanie, opcja automatycznego przetwarzania.

**Główne elementy:**
- `Button` (primary) - "Rozpocznij upload"
- `Checkbox` - "Uruchom przetwarzanie AI po zakończeniu"
- `Button` (secondary) - "Anuluj wszystkie"
- `HelpText` - informacja o koszcie przetwarzania

**Obsługiwane zdarzenia:**
- `onStartUpload` - rozpoczęcie procesu
- `onCancelAll` - anulowanie wszystkich operacji
- `onToggleAutoProcess` - zmiana opcji auto-przetwarzania

**Warunki walidacji:**
- Przycisk "Rozpocznij upload" aktywny tylko gdy:
  - Są pliki w kolejce (min. 1)
  - Żaden plik nie jest w trakcie uploadu
  - Są pliki w statusie `pending` lub `error`
- Przycisk "Anuluj wszystkie" aktywny tylko podczas uploadu

**Typy:**
- Brak dedykowanych typów (używa primitives)

**Propsy:**
```typescript
interface UploadActionsProps {
  onStartUpload: () => void;
  onCancelAll: () => void;
  canStartUpload: boolean;
  isUploading: boolean;
  autoProcess: boolean;
  onToggleAutoProcess: (value: boolean) => void;
  pendingCount: number;
}
```

### 4.8. ErrorBanner (React)

**Opis:** Banner wyświetlający błędy globalne (nie związane z konkretnym plikiem), np. błąd połączenia, przekroczony limit API, brak miejsca w storage.

**Główne elementy:**
- `Alert` (shadcn/ui) - kontener alertu
- `AlertTitle` - tytuł błędu
- `AlertDescription` - opis błędu
- `ErrorList` - lista błędów (jeśli wiele)
- `Button` - przycisk zamknięcia lub akcji (Retry)

**Obsługiwane zdarzenia:**
- `onDismiss` - zamknięcie bannera
- `onRetryAction` - ponowienie akcji (jeśli applicable)

**Warunki walidacji:** Brak

**Typy:**
- `GlobalError` - typ błędu globalnego

**Propsy:**
```typescript
interface ErrorBannerProps {
  errors: GlobalError[];
  onDismiss: (errorId: string) => void;
  onRetryAction?: () => void;
}
```

## 5. Typy

### 5.1. Typy API (z src/types.ts)

```typescript
// Już zdefiniowane w src/types.ts:
export interface UploadUrlRequestCommand {
  flyer_id: string;
  flyer_slug: string;
  page_number: number;
  filename: string;
  content_type: string;
  width?: number;
  height?: number;
}

export interface UploadUrlResponse {
  upload_url: string;
  public_path: string;
  expires_at: string;
}

export type CreatePageCommand = Required<Pick<TablesInsert<"pages">, "flyer_id" | "page_number" | "image_path">> &
  Pick<TablesInsert<"pages">, "image_width" | "image_height">;

export interface CreateJobCommand {
  page_id: string;
  model_hint?: string;
  cost_limit_cents?: number;
  force?: boolean;
  requested_by: string;
}

export type JobDTO = Pick<
  JobEntity,
  "id" | "page_id" | "status" | "created_at" | "started_at" | "finished_at" | "error_details" | "meta"
>;
```

### 5.2. Nowe typy ViewModel dla widoku

```typescript
/**
 * FileWithMetadata
 * Rozszerzenie standardowego obiektu File o dodatkowe metadane
 * potrzebne do kolejki uploadu i identyfikacji.
 */
export interface FileWithMetadata {
  id: string; // UUID generowane po stronie klienta
  file: File; // natywny obiekt File
  preview?: string; // Data URL do preview (opcjonalne)
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * UploadQueueItem
 * Reprezentuje pojedynczy element w kolejce uploadu z pełnym stanem procesu.
 */
export interface UploadQueueItem {
  id: string; // UUID (zgodny z FileWithMetadata.id)
  file: File; // oryginalny plik
  compressedFile?: File; // plik po kompresji
  preview?: string; // Data URL preview
  pageNumber: number; // automatycznie przydzielony numer strony
  
  // Status procesu
  status: UploadStatus;
  progress: number; // 0-100
  
  // Metadane obrazu
  dimensions: {
    width: number;
    height: number;
  };
  
  // Dane z API
  uploadUrl?: string; // signed URL z API
  publicPath?: string; // ścieżka w storage
  pageId?: string; // ID utworzonej strony w bazie
  
  // Błędy
  error?: UploadError;
  
  // Timestamps
  addedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * UploadStatus
 * Możliwe statusy elementu w kolejce uploadu.
 */
export type UploadStatus =
  | 'pending'       // Oczekuje na rozpoczęcie
  | 'validating'    // Walidacja pliku
  | 'compressing'   // Kompresja obrazu
  | 'signing'       // Pobieranie signed URL
  | 'uploading'     // Upload do storage
  | 'registering'   // Rejestracja w bazie
  | 'success'       // Zakończone pomyślnie
  | 'error'         // Błąd
  | 'cancelled';    // Anulowane

/**
 * UploadError
 * Szczegóły błędu uploadu.
 */
export interface UploadError {
  code: string; // np. 'VALIDATION_ERROR', 'NETWORK_ERROR', 'API_ERROR'
  message: string; // komunikat dla użytkownika
  details?: Record<string, string[]>; // szczegóły z API (opcjonalne)
  retryable: boolean; // czy można ponowić operację
}

/**
 * GlobalError
 * Błąd globalny niezwiązany z konkretnym plikiem.
 */
export interface GlobalError {
  id: string; // UUID błędu
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  dismissible: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

/**
 * UploadFlowState
 * Główny stan procesu uploadu zarządzany przez useUploadFlow hook.
 */
export interface UploadFlowState {
  // Kolejka
  queue: UploadQueueItem[];
  
  // Statystyki
  stats: {
    total: number;
    pending: number;
    processing: number; // validating + compressing + signing + uploading + registering
    success: number;
    error: number;
    cancelled: number;
  };
  
  // Stan globalny
  isUploading: boolean; // czy trwa jakiś upload
  autoProcess: boolean; // czy uruchomić przetwarzanie po uploadzie
  
  // Błędy globalne
  globalErrors: GlobalError[];
  
  // Flyer context
  flyerId: string;
  flyerSlug: string;
  nextPageNumber: number; // następny wolny numer strony
}

/**
 * CompressionOptions
 * Opcje kompresji obrazu.
 */
export interface CompressionOptions {
  maxWidth: number; // maksymalna szerokość (default: 2000px)
  maxHeight: number; // maksymalna wysokość (default: 2000px)
  quality: number; // jakość 0-1 (default: 0.85)
  targetSizeKB?: number; // docelowy rozmiar w KB (opcjonalne, wymusza dodatkową kompresję)
}

/**
 * CompressionResult
 * Wynik operacji kompresji.
 */
export interface CompressionResult {
  file: File; // skompresowany plik
  dimensions: {
    width: number;
    height: number;
  };
  originalSize: number; // rozmiar oryginalny w bajtach
  compressedSize: number; // rozmiar po kompresji w bajtach
  compressionRatio: number; // stosunek kompresji (0-1)
}
```

## 6. Zarządzanie stanem

### 6.1. Custom Hook: useUploadFlow

Główna logika widoku zostanie wyodrębniona do custom hooka `useUploadFlow`, który zarządza stanem całego procesu uploadu.

**Lokalizacja:** `src/lib/hooks/useUploadFlow.ts`

**Odpowiedzialności:**
- Zarządzanie kolejką plików (`UploadQueueItem[]`)
- Obliczanie statystyk (pending/processing/success/error)
- Orkiestracja procesu uploadu dla wszystkich plików
- Obsługa błędów globalnych
- Zapobieganie nawigacji podczas uploadu
- Integracja z API (przez service layer)

**Stan wewnętrzny:**
```typescript
const [state, setState] = useState<UploadFlowState>({
  queue: [],
  stats: { total: 0, pending: 0, processing: 0, success: 0, error: 0, cancelled: 0 },
  isUploading: false,
  autoProcess: false,
  globalErrors: [],
  flyerId: '',
  flyerSlug: '',
  nextPageNumber: 1,
});
```

**Publiczne metody:**
```typescript
interface UseUploadFlowReturn {
  // Stan
  state: UploadFlowState;
  
  // Akcje na plikach
  addFiles: (files: FileWithMetadata[]) => void;
  removeFile: (id: string) => void;
  retryFile: (id: string) => Promise<void>;
  
  // Akcje bulk
  startUpload: () => Promise<void>;
  cancelAll: () => void;
  retryAllFailed: () => Promise<void>;
  removeAllFailed: () => void;
  clearCompleted: () => void;
  
  // Konfiguracja
  setAutoProcess: (value: boolean) => void;
  
  // Błędy globalne
  dismissGlobalError: (errorId: string) => void;
  
  // Utility
  canStartUpload: boolean;
}
```

**Zależności:**
- `useEffect` - zapobieganie nawigacji podczas uploadu (beforeunload)
- `useCallback` - memoizacja funkcji akcji
- `useMemo` - obliczanie statystyk
- `UploadService` - komunikacja z API
- `CompressionService` - kompresja obrazów

### 6.2. Custom Hook: useCompressionWorker

Hook zarządzający kompresją obrazów w Web Worker dla zachowania responsywności UI.

**Lokalizacja:** `src/lib/hooks/useCompressionWorker.ts`

**Odpowiedzialności:**
- Inicjalizacja Web Workera
- Delegowanie kompresji do workera
- Obsługa queue kompresji (aby nie przeciążać przeglądarki)
- Cleanup workera przy unmount

**Publiczne metody:**
```typescript
interface UseCompressionWorkerReturn {
  compressImage: (file: File, options: CompressionOptions) => Promise<CompressionResult>;
  isCompressing: boolean;
  compressionQueue: number; // liczba plików w kolejce
}
```

### 6.3. Local State w komponentach

Komponenty prezentacyjne (UploadItem, FlyerInfoPanel, ErrorBanner) używają tylko propsów i nie mają własnego stanu.

Komponenty interaktywne (UploadDropzone, UploadActions) mogą mieć lokalny UI state (np. `isDragOver` w Dropzone).

## 7. Integracja API

### 7.1. UploadService

**Lokalizacja:** `src/lib/services/upload.service.ts`

Serwis odpowiedzialny za komunikację z API w procesie uploadu.

**Metody:**

```typescript
class UploadService {
  constructor(private supabaseClient: SupabaseClient) {}

  /**
   * Pobranie signed URL do uploadu pliku
   * Wywołuje: POST /api/v1/uploads/sign
   */
  async getSignedUploadUrl(
    request: UploadUrlRequestCommand
  ): Promise<UploadUrlResponse> {
    // Request type: UploadUrlRequestCommand
    // Response type: UploadUrlResponse
    const response = await fetch('/api/v1/uploads/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAccessToken()}`,
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new UploadError(error);
    }
    
    const data: ApiResponse<UploadUrlResponse> = await response.json();
    return data.data;
  }

  /**
   * Upload pliku do storage używając signed URL
   */
  async uploadToStorage(
    file: File,
    uploadUrl: string,
    contentType: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });
      
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send(file);
    });
  }

  /**
   * Rejestracja strony w bazie po uploadzie
   * Wywołuje: POST /api/v1/pages
   */
  async registerPage(
    command: CreatePageCommand
  ): Promise<PageDTO> {
    // Request type: CreatePageCommand
    // Response type: ApiResponse<PageDTO>
    const response = await fetch('/api/v1/pages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAccessToken()}`,
      },
      body: JSON.stringify(command),
    });
    
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new UploadError(error);
    }
    
    const data: ApiResponse<PageDTO> = await response.json();
    return data.data;
  }

  /**
   * Uruchomienie przetwarzania AI dla strony
   * Wywołuje: POST /api/v1/jobs/pages/:page_id/process
   */
  async startProcessing(
    pageId: string,
    command: Omit<CreateJobCommand, 'page_id' | 'requested_by'>
  ): Promise<JobDTO> {
    // Request type: CreateJobCommand (częściowo)
    // Response type: ApiResponse<JobDTO>
    const response = await fetch(`/api/v1/jobs/pages/${pageId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAccessToken()}`,
      },
      body: JSON.stringify(command),
    });
    
    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new ProcessingError(error);
    }
    
    const data: ApiResponse<JobDTO> = await response.json();
    return data.data;
  }

  /**
   * Pobranie następnego wolnego numeru strony dla gazetki
   */
  async getNextPageNumber(flyerId: string): Promise<number> {
    const { data, error } = await this.supabaseClient
      .from('pages')
      .select('page_number')
      .eq('flyer_id', flyerId)
      .order('page_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return (data?.page_number ?? 0) + 1;
  }

  private async getAccessToken(): Promise<string> {
    const { data: { session } } = await this.supabaseClient.auth.getSession();
    if (!session) throw new Error('No active session');
    return session.access_token;
  }
}
```

### 7.2. CompressionService

**Lokalizacja:** `src/lib/services/compression.service.ts`

Serwis do kompresji obrazów (może używać Web Worker lub biblioteki browser-image-compression).

```typescript
class CompressionService {
  async compressImage(
    file: File,
    options: CompressionOptions
  ): Promise<CompressionResult> {
    // Implementacja kompresji używając canvas API lub biblioteki
    // Zwraca skompresowany plik wraz z metadanymi
  }
  
  async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    // Odczytanie wymiarów obrazu
  }
}
```

### 7.3. Przepływ uploadu pojedynczego pliku

```
1. Walidacja formatu i rozmiaru
   ↓
2. Odczytanie wymiarów obrazu
   ↓
3. Kompresja (CompressionService)
   ↓
4. Pobranie signed URL (UploadService.getSignedUploadUrl)
   Request: UploadUrlRequestCommand {
     flyer_id: string,
     flyer_slug: string,
     page_number: number,
     filename: string,
     content_type: string,
     width?: number,
     height?: number
   }
   Response: UploadUrlResponse {
     upload_url: string,
     public_path: string,
     expires_at: string
   }
   ↓
5. Upload do storage (UploadService.uploadToStorage)
   ↓
6. Rejestracja strony (UploadService.registerPage)
   Request: CreatePageCommand {
     flyer_id: string,
     page_number: number,
     image_path: string,
     image_width?: number,
     image_height?: number
   }
   Response: PageDTO
   ↓
7. [Opcjonalnie] Uruchomienie przetwarzania (UploadService.startProcessing)
   Request: CreateJobCommand {
     page_id: string,
     model_hint?: string,
     cost_limit_cents?: number,
     force?: boolean,
     requested_by: string
   }
   Response: JobDTO
```

## 8. Interakcje użytkownika

### 8.1. Dodawanie plików

**Scenariusz 1: Drag & Drop**
1. Użytkownik przeciąga pliki nad obszar dropzone
2. Obszar zmienia wygląd (border highlight, tekst pomocniczy)
3. Użytkownik upuszcza pliki
4. System waliduje pliki i dodaje do kolejki
5. Dla każdego pliku generowany jest podgląd (preview)
6. Automatycznie przydzielane są numery stron (kontynuując istniejące)

**Scenariusz 2: Wybór z dysku**
1. Użytkownik klika "Wybierz pliki" lub obszar dropzone
2. Otwiera się natywny dialog wyboru plików
3. Użytkownik wybiera jeden lub więcej plików
4. Dalszy przepływ jak w scenariuszu 1

**Feedback:**
- Walidacja natychmiastowa: nieprawidłowe pliki pokazują error inline
- Toast notification: "Dodano X plików do kolejki"
- Jeśli niektóre pliki odrzucone: "Dodano X plików, odrzucono Y (nieprawidłowy format)"

### 8.2. Rozpoczęcie uploadu

**Scenariusz:**
1. Użytkownik klika "Rozpocznij upload"
2. Przycisk zmienia się na "Uploadowanie..." i jest disabled
3. Pliki przetwarzane są sekwencyjnie lub równolegle (max 3 jednocześnie)
4. Dla każdego pliku:
   - Status zmienia się: pending → compressing → signing → uploading → registering → success
   - Progress bar pokazuje postęp (0-100%)
   - Ikona statusu aktualizuje się
5. Po zakończeniu wszystkich:
   - Toast notification: "Upload zakończony: X sukces, Y błędów"
   - Jeśli autoProcess=true: automatyczne uruchomienie przetwarzania dla wszystkich stron
   - Przycisk "Zakończ" lub "Zobacz strony" staje się aktywny

**Feedback:**
- Progress bar ogólny: "Uploadowanie X z Y plików"
- Szacowany czas pozostały (opcjonalnie)
- Możliwość anulowania procesu

### 8.3. Obsługa błędów

**Scenariusz: Błąd uploadu pojedynczego pliku**
1. Plik przechodzi przez statusy: pending → compressing → signing → uploading
2. Podczas uploadu wystąpił błąd sieciowy
3. Status zmienia się na `error`
4. Wyświetlany jest komunikat błędu pod plikiem
5. Ikona zmienia się na error (czerwony X)
6. Przycisk "Retry" staje się aktywny dla tego pliku
7. Użytkownik może:
   - Kliknąć "Retry" aby ponowić tylko ten plik
   - Kliknąć "Remove" aby usunąć z kolejki
   - Kliknąć "Retry all failed" aby ponowić wszystkie błędne

**Scenariusz: Błąd globalny (np. brak połączenia)**
1. Podczas uploadu traci połączenie sieciowe
2. Aktywne uploady kończą się błędem
3. Wyświetla się ErrorBanner na górze: "Utracono połączenie sieciowe"
4. Przycisk "Spróbuj ponownie" w bannerze
5. Po kliknięciu: ponowienie wszystkich nieudanych uploadów

### 8.4. Anulowanie procesu

**Scenariusz:**
1. Użytkownik klika "Anuluj wszystkie" podczas uploadu
2. Wyświetla się dialog potwierdzenia: "Czy na pewno chcesz anulować? Proces zostanie zatrzymany."
3. Po potwierdzeniu:
   - Wszystkie aktywne uploady są przerywane
   - Pliki w trakcie otrzymują status `cancelled`
   - Pliki oczekujące pozostają w statusie `pending`
4. Toast notification: "Upload anulowany"
5. Użytkownik może:
   - Usunąć anulowane pliki
   - Rozpocząć upload ponownie (przetwarzane będą tylko pending)

### 8.5. Opuszczenie strony

**Scenariusz: Próba nawigacji podczas uploadu**
1. Użytkownik próbuje opuścić stronę (klik w link, zamknięcie karty, etc.)
2. Jeśli `isUploading === true`:
   - Wyświetla się natywny dialog przeglądarki: "Czy na pewno chcesz opuścić? Trwa upload plików."
   - Użytkownik może anulować nawigację lub potwierdzić
3. Jeśli użytkownik potwierdzi: upload jest przerywany, strona zostaje opuszczona

## 9. Warunki i walidacja

### 9.1. Walidacja plików (UploadDropzone)

**Warunki sprawdzane przed dodaniem do kolejki:**

1. **Format pliku:**
   - Akceptowane MIME types: `image/jpeg`, `image/png`, `image/webp`
   - Walidacja podwójna: MIME type + rozszerzenie pliku
   - Błąd: "Plik {filename} ma nieprawidłowy format. Akceptowane: JPG, PNG, WEBP"

2. **Rozmiar pliku:**
   - Maksymalny rozmiar: 50MB przed kompresją
   - Walidacja: `file.size <= 50 * 1024 * 1024`
   - Błąd: "Plik {filename} jest zbyt duży ({size}MB). Maksymalny rozmiar: 50MB"

3. **Duplikaty:**
   - Sprawdzenie czy plik o tej samej nazwie i rozmiarze już istnieje w kolejce
   - Warunek: `!queue.some(item => item.file.name === file.name && item.file.size === file.size)`
   - Błąd: "Plik {filename} został już dodany do kolejki"

4. **Limit plików:**
   - Maksymalnie 50 plików w kolejce jednocześnie
   - Warunek: `queue.length + newFiles.length <= 50`
   - Błąd: "Można dodać maksymalnie 50 plików jednocześnie. Obecna liczba: {count}"

5. **Wymiary obrazu (po odczytaniu):**
   - Minimalne wymiary: 200x200px
   - Maksymalne wymiary: 10000x10000px
   - Błąd: "Obraz {filename} ma nieprawidłowe wymiary"

### 9.2. Walidacja przed rozpoczęciem uploadu (UploadActions)

**Warunki aktywacji przycisku "Rozpocznij upload":**

1. Minimum 1 plik w kolejce: `queue.length > 0`
2. Brak aktywnego uploadu: `!isUploading`
3. Istnieją pliki do przetworzenia: `stats.pending > 0 || stats.error > 0`

**Wynik:** `canStartUpload = queue.length > 0 && !isUploading && (stats.pending > 0 || stats.error > 0)`

### 9.3. Walidacja API (backend)

**POST /api/v1/uploads/sign:**

Warunki sprawdzane przez backend (z pliku sign.ts):
1. Autoryzacja: użytkownik ma rolę `admin`
2. Format JSON: body jest prawidłowym JSON
3. Walidacja danych wejściowych (Zod schema):
   - `flyer_id`: UUID format
   - `flyer_slug`: niepusty string
   - `page_number`: liczba całkowita > 0
   - `filename`: niepusty string
   - `content_type`: jeden z: image/jpeg, image/png, image/webp
   - `width`: opcjonalna liczba > 0
   - `height`: opcjonalna liczba > 0
4. Biznesowa: gazetka o podanym `flyer_id` istnieje w bazie
5. (Opcjonalnie) Ostrzeżenie: strona o tym numerze już istnieje

**POST /api/v1/jobs/pages/:page_id/process:**

Warunki sprawdzane przez backend (z pliku process.ts):
1. Autoryzacja: użytkownik ma rolę `admin`
2. Parametr `page_id`: UUID format
3. Format JSON: body jest prawidłowym JSON
4. Walidacja danych wejściowych (Zod schema):
   - `model_hint`: opcjonalny string
   - `cost_limit_cents`: opcjonalna liczba > 0
   - `force`: opcjonalny boolean
5. Biznesowa: strona o podanym `page_id` istnieje
6. Konflikt (jeśli force=false): nie istnieje już aktywne zadanie dla tej strony

### 9.4. Walidacja statusów plików

**Warunki przejść między statusami:**

```
pending → validating: zawsze dozwolone (początek procesu)
validating → compressing: walidacja OK
validating → error: walidacja failed

compressing → signing: kompresja OK
compressing → error: kompresja failed

signing → uploading: otrzymano signed URL
signing → error: błąd API podczas pobierania URL

uploading → registering: upload do storage OK
uploading → error: błąd podczas uploadu (network, timeout)

registering → success: rejestracja w bazie OK
registering → error: błąd API podczas rejestracji

error → pending: użytkownik kliknął "Retry"
success → (end state)
cancelled → (end state)
```

## 10. Obsługa błędów

### 10.1. Błędy walidacji plików

**Typ:** Błąd klienta, synchroniczny

**Obsługa:**
- Pliki nieprzechodzące walidacji nie są dodawane do kolejki
- Toast notification z listą odrzuconych plików i powodów
- Log w konsoli dla debugging

**Przykład:**
```typescript
const rejectedFiles: Array<{ file: File; reason: string }> = [];

// Po walidacji:
if (rejectedFiles.length > 0) {
  toast.error(
    `Odrzucono ${rejectedFiles.length} plików`,
    {
      description: rejectedFiles.map(r => `${r.file.name}: ${r.reason}`).join('\n')
    }
  );
}
```

### 10.2. Błędy kompresji

**Typ:** Błąd klienta, asynchroniczny

**Przyczyny:**
- Uszkodzony plik obrazu
- Brak pamięci w przeglądarce
- Timeout kompresji

**Obsługa:**
- Status pliku zmienia się na `error`
- `error.code = 'COMPRESSION_ERROR'`
- `error.message` = komunikat dla użytkownika
- `error.retryable = true`
- Możliwość retry lub skip kompresji (upload oryginału)

**Przykład komunikatu:**
"Nie udało się skompresować obrazu. Spróbuj ponownie lub usuń plik."

### 10.3. Błędy API - GET signed URL

**Typ:** Błąd API, asynchroniczny

**Przyczyny:**
- Brak autoryzacji (401)
- Brak uprawnień (403)
- Gazetka nie istnieje (404)
- Nieprawidłowe dane (400)
- Błąd serwera (500)

**Obsługa:**
- Status pliku zmienia się na `error`
- Parsowanie odpowiedzi API (ApiError)
- Mapowanie kodu błędu na komunikat użytkownika
- `error.retryable` zależy od kodu (401/403 = false, 500 = true)

**Mapowanie błędów:**
```typescript
function mapApiError(apiError: ApiError): UploadError {
  const { code, message, details } = apiError.error;
  
  const errorMap: Record<string, { message: string; retryable: boolean }> = {
    'UNAUTHORIZED': { 
      message: 'Sesja wygasła. Zaloguj się ponownie.', 
      retryable: false 
    },
    'FORBIDDEN': { 
      message: 'Brak uprawnień do wykonania tej operacji.', 
      retryable: false 
    },
    'NOT_FOUND': { 
      message: 'Gazetka nie została znaleziona.', 
      retryable: false 
    },
    'VALIDATION_ERROR': { 
      message: 'Nieprawidłowe dane. Sprawdź plik i spróbuj ponownie.', 
      retryable: false 
    },
    'INTERNAL_SERVER_ERROR': { 
      message: 'Błąd serwera. Spróbuj ponownie za chwilę.', 
      retryable: true 
    },
  };
  
  return {
    code,
    message: errorMap[code]?.message || message,
    details,
    retryable: errorMap[code]?.retryable ?? true,
  };
}
```

### 10.4. Błędy uploadu do storage

**Typ:** Błąd sieciowy, asynchroniczny

**Przyczyny:**
- Utrata połączenia sieciowego
- Timeout
- Wygaśnięcie signed URL (>15min)
- Błąd serwera storage

**Obsługa:**
- Status pliku zmienia się na `error`
- `error.code = 'UPLOAD_ERROR'` lub 'NETWORK_ERROR'
- `error.retryable = true` (prawie zawsze)
- Retry z exponential backoff

**Retry logic:**
```typescript
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1s

async function uploadWithRetry(
  file: File,
  uploadUrl: string,
  retryCount = 0
): Promise<void> {
  try {
    await uploadToStorage(file, uploadUrl, file.type);
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_DELAY * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return uploadWithRetry(file, uploadUrl, retryCount + 1);
    }
    throw error;
  }
}
```

### 10.5. Błędy rejestracji strony

**Typ:** Błąd API, asynchroniczny

**Przyczyny:**
- Duplikat page_number (409 Conflict)
- Nieprawidłowe dane (400)
- Błąd serwera (500)

**Obsługa:**
- Status pliku zmienia się na `error`
- W przypadku 409 (duplikat): automatyczna inkrementacja page_number i retry
- W pozostałych przypadkach: `error.retryable` zależy od kodu

**Specjalna obsługa duplikatów:**
```typescript
async function registerPageWithAutoIncrement(
  command: CreatePageCommand
): Promise<PageDTO> {
  try {
    return await uploadService.registerPage(command);
  } catch (error) {
    if (error.statusCode === 409) {
      // Duplikat - pobierz kolejny numer i spróbuj ponownie
      const nextNumber = await uploadService.getNextPageNumber(command.flyer_id);
      return await uploadService.registerPage({
        ...command,
        page_number: nextNumber,
      });
    }
    throw error;
  }
}
```

### 10.6. Błędy uruchamiania przetwarzania AI

**Typ:** Błąd API, asynchroniczny (opcjonalny krok)

**Przyczyny:**
- Konflikt: już istnieje aktywne zadanie (409)
- Limit kosztów przekroczony
- Błąd serwera (500)

**Obsługa:**
- Błąd nie wpływa na status uploadu (plik pozostaje `success`)
- Wyświetlenie GlobalError z informacją
- Możliwość uruchomienia przetwarzania później z listy stron

**Przykład:**
```typescript
try {
  await uploadService.startProcessing(pageId, {});
} catch (error) {
  // Nie zmieniaj statusu pliku - upload się powiódł
  addGlobalError({
    id: uuid(),
    code: 'PROCESSING_START_FAILED',
    message: `Nie udało się uruchomić przetwarzania dla strony ${pageNumber}. Możesz uruchomić je ręcznie później.`,
    severity: 'warning',
    dismissible: true,
  });
}
```

### 10.7. Błędy globalne

**Przykłady:**
- Brak połączenia sieciowego (wszystkie uploady failują)
- Przekroczony limit storage
- Wygasła sesja użytkownika
- Limit API rate limiting

**Obsługa:**
- Wyświetlenie ErrorBanner na górze widoku
- Opcjonalny przycisk akcji (np. "Zaloguj ponownie", "Spróbuj ponownie")
- Blokada możliwości rozpoczęcia nowych uploadów dopóki błąd nie zostanie rozwiązany

### 10.8. Fallback dla starszych przeglądarek

**Warunki:**
- Brak wsparcia dla Drag & Drop API
- Brak wsparcia dla FileReader API
- Brak wsparcia dla Canvas API (kompresja)

**Obsługa:**
- Graceful degradation: pokazanie tylko input[type="file"]
- Wyłączenie funkcji kompresji (upload oryginalnego pliku z ostrzeżeniem)
- Informacja dla użytkownika: "Twoja przeglądarka nie wspiera wszystkich funkcji. Zalecamy użycie nowszej wersji."

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury projektu
- Utworzenie katalogu `src/pages/admin/flyers/[flyerId]/upload.astro`
- Utworzenie katalogu `src/components/admin/upload/` dla komponentów React
- Utworzenie katalogu `src/lib/hooks/` dla custom hooków (jeśli nie istnieje)
- Utworzenie katalogu `src/lib/services/` dla serwisów (jeśli nie istnieje)

### Krok 2: Definicja typów
- Dodanie nowych typów do `src/types.ts`:
  - `FileWithMetadata`
  - `UploadQueueItem`
  - `UploadStatus`
  - `UploadError`
  - `GlobalError`
  - `UploadFlowState`
  - `CompressionOptions`
  - `CompressionResult`
- Eksport typów

### Krok 3: Implementacja serwisów

**3a. CompressionService:**
- Utworzenie `src/lib/services/compression.service.ts`
- Implementacja `compressImage()` używając Canvas API lub biblioteki (np. browser-image-compression)
- Implementacja `getImageDimensions()`
- Testy jednostkowe kompresji

**3b. UploadService:**
- Utworzenie `src/lib/services/upload.service.ts`
- Implementacja `getSignedUploadUrl()` - wywołanie POST /api/v1/uploads/sign
- Implementacja `uploadToStorage()` - upload z progress tracking (XMLHttpRequest lub fetch)
- Implementacja `registerPage()` - wywołanie POST /api/v1/pages (endpoint do utworzenia)
- Implementacja `startProcessing()` - wywołanie POST /api/v1/jobs/pages/:page_id/process
- Implementacja `getNextPageNumber()` - zapytanie do Supabase
- Obsługa błędów i retry logic

### Krok 4: Implementacja custom hooków

**4a. useCompressionWorker:**
- Utworzenie `src/lib/hooks/useCompressionWorker.ts`
- Setup Web Worker (opcjonalnie, można pominąć w MVP i kompresować w main thread)
- Implementacja queue kompresji
- Cleanup przy unmount

**4b. useUploadFlow:**
- Utworzenie `src/lib/hooks/useUploadFlow.ts`
- Setup stanu początkowego `UploadFlowState`
- Implementacja `addFiles()`:
  - Walidacja plików
  - Generowanie UUID dla każdego pliku
  - Odczytanie wymiarów
  - Przydzielenie page_number
  - Dodanie do kolejki
- Implementacja `startUpload()`:
  - Iteracja przez pliki w statusie `pending`
  - Dla każdego: kompresja → sign → upload → register → (opcjonalnie) process
  - Równoległość: max 3 pliki jednocześnie
  - Update statusu i progress dla każdego pliku
- Implementacja `removeFile()`, `retryFile()`, `cancelAll()`, etc.
- Implementacja `useEffect` dla beforeunload warning
- Obliczanie statystyk (useMemo)

### Krok 5: Implementacja komponentów prezentacyjnych

**5a. FlyerInfoPanel:**
- Utworzenie `src/components/admin/upload/FlyerInfoPanel.tsx`
- Layout z informacjami o gazetce
- Użycie komponentów shadcn/ui: Card, Badge
- Stylowanie Tailwind

**5b. ErrorBanner:**
- Utworzenie `src/components/admin/upload/ErrorBanner.tsx`
- Użycie shadcn/ui Alert component
- Obsługa dismiss i retry actions
- Dostępność (role="alert")

**5c. UploadItem:**
- Utworzenie `src/components/admin/upload/UploadItem.tsx`
- Layout elementu kolejki: preview, info, progress, actions
- Użycie shadcn/ui: Progress, Button
- Warunkowe renderowanie w zależności od statusu
- Obsługa akcji: remove, retry

**5d. UploadQueue:**
- Utworzenie `src/components/admin/upload/UploadQueue.tsx`
- Layout listy z nagłówkiem
- QueueStats (statystyki)
- BulkActions (akcje bulk)
- Mapowanie `items` na komponenty `UploadItem`

**5e. UploadDropzone:**
- Utworzenie `src/components/admin/upload/UploadDropzone.tsx`
- Setup drag & drop event handlers
- Stylowanie stanu "drag over"
- Hidden file input
- Walidacja przy dodawaniu plików
- Accessibility: keyboard accessible, screen reader friendly

**5f. UploadActions:**
- Utworzenie `src/components/admin/upload/UploadActions.tsx`
- Layout przycisków akcji
- Warunki disabled w zależności od stanu
- Checkbox dla autoProcess

### Krok 6: Implementacja głównego kontenera

**6a. UploadFlowContainer:**
- Utworzenie `src/components/admin/upload/UploadFlowContainer.tsx`
- Setup hooka `useUploadFlow`
- Przekazanie callbacków do komponentów dzieci
- Layout główny (grid lub flex)
- Zarządzanie loading state podczas inicjalizacji

### Krok 7: Implementacja strony Astro

**7a. upload.astro:**
- Utworzenie `src/pages/admin/flyers/[flyerId]/upload.astro`
- Fetch danych gazetki (getStaticPaths lub getServerData)
- Weryfikacja uprawnień (middleware + page level)
- Przekazanie danych do `UploadFlowContainer`
- Obsługa 404 jeśli gazetka nie istnieje

### Krok 8: Stylowanie i responsywność
- Zastosowanie Tailwind classes dla wszystkich komponentów
- Testowanie responsywności (mobile, tablet, desktop)
- Dostępność: sprawdzenie focus states, aria labels, keyboard navigation
- Testowanie z screen readerem

### Krok 9: Integracja z API
- Sprawdzenie czy endpoint POST /api/v1/pages istnieje (może wymagać utworzenia)
- Testowanie całego flow uploadu end-to-end
- Obsługa różnych scenariuszy błędów
- Testowanie retry logic

### Krok 10: Optymalizacja i fine-tuning
- Optymalizacja kompresji (quality, rozmiar)
- Dostrojenie równoległości uploadów (max concurrent)
- Dodanie debounce/throttle gdzie potrzeba
- Optymalizacja rerenderów React (useMemo, useCallback, memo)
- Lazy loading komponentów gdzie sensowne

### Krok 11: Testy i debugging
- Testy jednostkowe dla serwisów (compression, upload)
- Testy integracyjne dla hooka useUploadFlow
- Testy E2E dla pełnego flow (np. Playwright)
- Testowanie edge cases:
  - Bardzo duże pliki
  - Bardzo wiele plików
  - Utrata połączenia podczas uploadu
  - Wygaśnięcie sesji
  - Duplikaty page_number
- Testowanie na różnych przeglądarkach

### Krok 12: Dokumentacja i finalizacja
- Dodanie komentarzy JSDoc do komponentów i funkcji
- Aktualizacja dokumentacji API jeśli utworzono nowe endpointy
- Dokumentacja użytkownika (opcjonalnie)
- Code review
- Merge do głównej gałęzi

---

## Dodatkowe uwagi

### Bezpieczeństwo
- Walidacja formatu plików po stronie klienta i serwera
- Signed URLs z krótkim czasem wygaśnięcia (15 min)
- Weryfikacja uprawnień na każdym etapie
- Rate limiting uploadów (serwer)

### Wydajność
- Kompresja obrazów przed uploadem (redukcja transferu)
- Równoległe uploady (max 3) dla szybszego przetwarzania
- Lazy loading preview obrazów
- Debounce dla akcji użytkownika gdzie sensowne

### UX
- Jasne komunikaty błędów z sugestiami rozwiązania
- Progress indicators na każdym etapie
- Możliwość anulowania i retry
- Zapobieganie utracie danych (beforeunload warning)
- Dostępność dla screen readerów

### Skalowanie
- Queue uploadu może być rozszerzona o persystencję (localStorage)
- Możliwość resume uploadów po odświeżeniu strony
- Batch processing dla dużej liczby plików
- Monitoring i logging błędów (Sentry)

