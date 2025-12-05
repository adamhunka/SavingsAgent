/**
 * src/components/admin/upload/UploadDropzone.tsx
 * Obszar drag & drop do dodawania plików.
 * Obsługuje zarówno przeciąganie plików jak i standardowy wybór przez input.
 */

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import type { FileWithMetadata } from "@/types";
import { Upload, FileImage } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  onFilesAdded: (files: FileWithMetadata[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  currentFileCount: number;
}

/**
 * UploadDropzone
 * Obszar do dodawania plików przez drag & drop lub standardowy wybór
 */
export function UploadDropzone({
  onFilesAdded,
  disabled = false,
  maxFiles = 50,
  currentFileCount,
}: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingSlots = maxFiles - currentFileCount;
  const canAddFiles = remainingSlots > 0 && !disabled;

  /**
   * Konwersja FileList na tablicę FileWithMetadata
   */
  const processFiles = (fileList: FileList): FileWithMetadata[] => {
    const files: FileWithMetadata[] = [];
    const maxFilesToAdd = Math.min(fileList.length, remainingSlots);

    for (let i = 0; i < maxFilesToAdd; i++) {
      const file = fileList[i];
      files.push({
        id: crypto.randomUUID(),
        file,
      });
    }

    return files;
  };

  /**
   * Handler dla drag enter
   */
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (canAddFiles) {
      setIsDragOver(true);
    }
  };

  /**
   * Handler dla drag leave
   */
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  /**
   * Handler dla drag over
   */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * Handler dla drop
   */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!canAddFiles) return;

    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      const processedFiles = processFiles(files);
      onFilesAdded(processedFiles);
    }
  };

  /**
   * Handler dla standardowego wyboru plików
   */
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      const processedFiles = processFiles(files);
      onFilesAdded(processedFiles);
    }
    // Reset input aby umożliwić dodanie tych samych plików ponownie
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Trigger input file dialog
   */
  const handleClick = () => {
    if (canAddFiles) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg p-8 transition-colors",
        isDragOver && canAddFiles
          ? "border-primary bg-primary/5"
          : "border-gray-300 hover:border-gray-400",
        !canAddFiles && "opacity-50 cursor-not-allowed",
        canAddFiles && "cursor-pointer"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={!canAddFiles}
        aria-label="Wybierz pliki"
      />

      {/* Dropzone content */}
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
            isDragOver && canAddFiles ? "bg-primary/10" : "bg-gray-100"
          )}
        >
          {isDragOver ? (
            <FileImage className="h-8 w-8 text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-gray-400" />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-base font-medium">
            {isDragOver
              ? "Upuść pliki tutaj"
              : "Przeciągnij i upuść pliki lub kliknij aby wybrać"}
          </p>
          <p className="text-sm text-muted-foreground">
            Obsługiwane formaty: JPG, PNG, WEBP (max 50MB)
          </p>
          {remainingSlots < maxFiles && (
            <p className="text-sm text-muted-foreground">
              Pozostało miejsc: {remainingSlots} / {maxFiles}
            </p>
          )}
        </div>

        {canAddFiles && (
          <Button
            variant="outline"
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <Upload className="h-4 w-4" />
            Wybierz pliki
          </Button>
        )}

        {!canAddFiles && disabled && (
          <p className="text-sm text-red-600">
            Upload jest wyłączony
          </p>
        )}

        {!canAddFiles && !disabled && remainingSlots === 0 && (
          <p className="text-sm text-red-600">
            Osiągnięto maksymalną liczbę plików ({maxFiles})
          </p>
        )}
      </div>
    </div>
  );
}

