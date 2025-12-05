/**
 * src/lib/services/compression.service.ts
 * Serwis odpowiedzialny za kompresję obrazów przed uploadem.
 * Używa Canvas API do kompresji obrazów w przeglądarce.
 */

import type { CompressionOptions, CompressionResult } from "@/types";

/**
 * CompressionService
 * Serwis do kompresji obrazów używający Canvas API.
 */
export class CompressionService {
  /**
   * Domyślne opcje kompresji
   */
  private defaultOptions: CompressionOptions = {
    maxWidth: 2000,
    maxHeight: 2000,
    quality: 0.85,
  };

  /**
   * Kompresja obrazu używając Canvas API
   * @param file - Oryginalny plik obrazu
   * @param options - Opcje kompresji (opcjonalne)
   * @returns Promise z wynikiem kompresji
   */
  async compressImage(
    file: File,
    options?: Partial<CompressionOptions>
  ): Promise<CompressionResult> {
    const opts: CompressionOptions = { ...this.defaultOptions, ...options };
    const originalSize = file.size;

    try {
      // Odczytanie wymiarów obrazu
      const dimensions = await this.getImageDimensions(file);
      const { width: originalWidth, height: originalHeight } = dimensions;

      // Obliczenie nowych wymiarów zachowując proporcje
      let targetWidth = originalWidth;
      let targetHeight = originalHeight;

      if (originalWidth > opts.maxWidth || originalHeight > opts.maxHeight) {
        const widthRatio = opts.maxWidth / originalWidth;
        const heightRatio = opts.maxHeight / originalHeight;
        const ratio = Math.min(widthRatio, heightRatio);

        targetWidth = Math.round(originalWidth * ratio);
        targetHeight = Math.round(originalHeight * ratio);
      }

      // Utworzenie canvas i kompresja
      const compressedFile = await this.resizeAndCompress(
        file,
        targetWidth,
        targetHeight,
        opts.quality
      );

      // Jeśli określono targetSizeKB i plik jest za duży, kompresuj dalej
      let finalFile = compressedFile;
      if (opts.targetSizeKB) {
        const targetBytes = opts.targetSizeKB * 1024;
        if (compressedFile.size > targetBytes) {
          finalFile = await this.compressToTargetSize(
            file,
            targetWidth,
            targetHeight,
            targetBytes
          );
        }
      }

      const compressedSize = finalFile.size;
      const compressionRatio = compressedSize / originalSize;

      return {
        file: finalFile,
        dimensions: {
          width: targetWidth,
          height: targetHeight,
        },
        originalSize,
        compressedSize,
        compressionRatio,
      };
    } catch (error) {
      throw new Error(
        `Kompresja obrazu nie powiodła się: ${error instanceof Error ? error.message : "Nieznany błąd"}`
      );
    }
  }

  /**
   * Odczytanie wymiarów obrazu
   * @param file - Plik obrazu
   * @returns Promise z wymiarami obrazu
   */
  async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Nie udało się odczytać wymiarów obrazu"));
      };

      img.src = objectUrl;
    });
  }

  /**
   * Zmiana rozmiaru i kompresja obrazu używając Canvas API
   * @param file - Oryginalny plik
   * @param width - Docelowa szerokość
   * @param height - Docelowa wysokość
   * @param quality - Jakość kompresji (0-1)
   * @returns Promise z skompresowanym plikiem
   */
  private async resizeAndCompress(
    file: File,
    width: number,
    height: number,
    quality: number
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        try {
          // Utworzenie canvas
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Nie udało się utworzyć kontekstu Canvas"));
            return;
          }

          // Rysowanie obrazu na canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Konwersja do Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Nie udało się skompresować obrazu"));
                return;
              }

              // Utworzenie nowego pliku z oryginalną nazwą
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });

              resolve(compressedFile);
            },
            file.type,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Nie udało się załadować obrazu"));
      };

      img.src = objectUrl;
    });
  }

  /**
   * Kompresja obrazu do określonego rozmiaru docelowego
   * Próbuje różne poziomy jakości aż do osiągnięcia rozmiaru < targetBytes
   * @param file - Oryginalny plik
   * @param width - Docelowa szerokość
   * @param height - Docelowa wysokość
   * @param targetBytes - Docelowy rozmiar w bajtach
   * @returns Promise z skompresowanym plikiem
   */
  private async compressToTargetSize(
    file: File,
    width: number,
    height: number,
    targetBytes: number
  ): Promise<File> {
    let quality = 0.85;
    let compressedFile: File | null = null;
    const minQuality = 0.1;
    const step = 0.1;

    while (quality >= minQuality) {
      compressedFile = await this.resizeAndCompress(file, width, height, quality);

      if (compressedFile.size <= targetBytes) {
        break;
      }

      quality -= step;
    }

    if (!compressedFile) {
      throw new Error("Nie udało się skompresować obrazu do docelowego rozmiaru");
    }

    return compressedFile;
  }

  /**
   * Generowanie preview (Data URL) dla obrazu
   * @param file - Plik obrazu
   * @param maxSize - Maksymalny rozmiar preview (domyślnie 200px)
   * @returns Promise z Data URL
   */
  async generatePreview(file: File, maxSize = 200): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        try {
          // Obliczenie rozmiaru preview zachowując proporcje
          let width = img.naturalWidth;
          let height = img.naturalHeight;

          if (width > height) {
            if (width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          // Utworzenie canvas dla preview
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Nie udało się utworzyć kontekstu Canvas"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Konwersja do Data URL
          const dataUrl = canvas.toDataURL(file.type, 0.7);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Nie udało się załadować obrazu dla preview"));
      };

      img.src = objectUrl;
    });
  }
}

// Singleton instance
export const compressionService = new CompressionService();

