import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, LogOut, WifiOff, Check, AlertTriangle, Camera, Building2, User, MapPin } from "lucide-react";
import { format } from "date-fns";

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_address: string | null;
  clock_in_photo_url: string | null;
  construction_site: string | null;
  client_name: string | null;
  status: string;
  entry_type: string;
  location_alert: boolean;
  distance_from_site_meters: number | null;
  is_offline?: boolean;
}

const ENTRY_TYPES = [
  { value: "obra", label: "Por Obra" },
  { value: "cliente", label: "Por Cliente" },
  { value: "tecnico", label: "Por Técnico (Em breve)" },
  { value: "relatorio", label: "Relatório (Em breve)" },
  { value: "interno", label: "Uso Interno" },
];

interface PontoEntryCardProps {
  entry: TimeEntry;
  index: number;
}

export function PontoEntryCard({ entry, index }: PontoEntryCardProps) {
  return (
    <Card className={`${entry.status === "open" ? "border-primary/50 bg-primary/5" : ""} ${entry.location_alert ? "border-yellow-500/50" : ""}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
            <div className="flex items-center gap-1.5 text-sm">
              <LogIn className="w-3.5 h-3.5 text-green-600" />
              <span>{format(new Date(entry.clock_in), "HH:mm")}</span>
            </div>
            {entry.clock_out && (
              <div className="flex items-center gap-1.5 text-sm">
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                <span>{format(new Date(entry.clock_out), "HH:mm")}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {entry.location_alert && (
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                <AlertTriangle className="w-3 h-3 mr-1" />Fora da área
              </Badge>
            )}
            {entry.is_offline && (
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                <WifiOff className="w-3 h-3 mr-1" />Offline
              </Badge>
            )}
            <Badge variant={entry.status === "open" ? "default" : "secondary"} className="text-xs">
              {entry.status === "open" ? "Aberto" : <><Check className="w-3 h-3 mr-1" />Fechado</>}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-1.5">
          <Badge variant="outline" className="text-xs">
            {ENTRY_TYPES.find(t => t.value === entry.entry_type)?.label || entry.entry_type}
          </Badge>
          {entry.clock_in_photo_url && <Badge variant="outline" className="text-xs text-green-600"><Camera className="w-3 h-3 mr-1" />Foto</Badge>}
        </div>
        {entry.construction_site && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1">
            <Building2 className="w-3 h-3 mt-0.5 shrink-0" />
            {entry.construction_site}
            {entry.distance_from_site_meters !== null && (
              <span className={entry.location_alert ? "text-yellow-600 font-medium" : "text-green-600"}>({entry.distance_from_site_meters}m)</span>
            )}
          </p>
        )}
        {entry.client_name && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1">
            <User className="w-3 h-3 mt-0.5 shrink-0" />{entry.client_name}
          </p>
        )}
        {entry.clock_in_address && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />{entry.clock_in_address.split(",").slice(0, 3).join(",")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
