/**
 * src/components/products/SearchBar.tsx
 * Komponent paska wyszukiwania z debounce.
 */

import * as React from "react";
import { Input } from "@/components/ui/input";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

/**
 * Komponent paska wyszukiwania
 */
export function SearchBar({ value, onChange, placeholder = "Szukaj produktów...", debounceMs = 500 }: SearchBarProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Synchronizuj z zewnętrzną wartością
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Wyczyść poprzedni timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Ustaw nowy timeout
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  // Cleanup przy unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <Input
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-10"
        aria-label="Wyszukaj produkty"
      />
    </div>
  );
}
