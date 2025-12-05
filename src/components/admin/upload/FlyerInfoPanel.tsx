/**
 * src/components/admin/upload/FlyerInfoPanel.tsx
 * Panel wyświetlający podstawowe informacje o gazetce, do której będą uploadowane strony.
 * Komponent prezentacyjny bez własnego stanu.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FlyerDetailDTO } from "@/types";
import { Calendar, Store, FileText } from "lucide-react";

interface FlyerInfoPanelProps {
  flyer: FlyerDetailDTO;
}

/**
 * Formatowanie daty do czytelnego formatu
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pl-PL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Mapowanie statusu gazetki na wariant badge
 */
function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "draft":
      return "secondary";
    case "archived":
      return "outline";
    default:
      return "outline";
  }
}

/**
 * Mapowanie statusu gazetki na tekst
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Aktywna";
    case "draft":
      return "Szkic";
    case "archived":
      return "Zarchiwizowana";
    default:
      return status;
  }
}

/**
 * FlyerInfoPanel
 * Panel z informacjami o gazetce
 */
export function FlyerInfoPanel({ flyer }: FlyerInfoPanelProps) {
  const pageCount = flyer.pages?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Informacje o gazetce</span>
          <Badge variant={getStatusVariant(flyer.status)}>
            {getStatusLabel(flyer.status)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informacja o sklepie */}
        <div className="flex items-start gap-3">
          <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Sklep</p>
            <p className="text-sm text-muted-foreground">{flyer.store_name}</p>
          </div>
        </div>

        {/* Zakres dat */}
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Okres ważności</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(flyer.valid_from)} - {formatDate(flyer.valid_to)}
            </p>
          </div>
        </div>

        {/* Liczba stron */}
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Liczba stron</p>
            <p className="text-sm text-muted-foreground">
              {pageCount === 0
                ? "Brak stron"
                : pageCount === 1
                  ? "1 strona"
                  : `${pageCount} stron`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

