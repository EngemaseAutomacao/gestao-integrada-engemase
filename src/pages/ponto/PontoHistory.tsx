import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, Loader2, Calendar, Building2, AlertTriangle, Camera, Image, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SignedImage } from "@/components/SignedImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ENTRY_TYPES = [
  { value: "obra", label: "Por Obra" },
  { value: "cliente", label: "Por Cliente" },
  { value: "tecnico", label: "Por Técnico" },
  { value: "relatorio", label: "Relatório" },
  { value: "interno", label: "Uso Interno" },
];

interface TimeEntry {
  id: string;
  entry_date: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_address: string | null;
  clock_out_address: string | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  construction_site: string | null;
  notes: string | null;
  status: string;
  entry_type: string;
  location_alert: boolean;
  distance_from_site_meters: number | null;
  client_name: string | null;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}min`;
}

export default function PontoHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [photoDialog, setPhotoDialog] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (user) fetchEntries();
  }, [user]);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user!.id)
      .order("clock_in", { ascending: false })
      .limit(50);

    if (!error && data) {
      setEntries(data as TimeEntry[]);
    }
    setLoading(false);
  };

  const filtered = typeFilter === "all" ? entries : entries.filter(e => e.entry_type === typeFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      <div className="shrink-0 hidden sm:block">
        <h1 className="text-3xl font-bold text-foreground">Meu Histórico de Ponto</h1>
        <p className="text-muted-foreground mt-1">Seus registros de entrada e saída</p>
      </div>

      {/* Filter */}
      <div className="shrink-0">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filtrar tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {ENTRY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum registro de ponto encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          {filtered.map((entry) => {
            const duration = entry.clock_out
              ? differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in))
              : null;

            return (
              <Card key={entry.id} className={entry.location_alert ? "border-yellow-500/50" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {format(new Date(entry.clock_in), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {entry.location_alert && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Fora da área
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {ENTRY_TYPES.find(t => t.value === entry.entry_type)?.label || entry.entry_type}
                      </Badge>
                      <Badge variant={entry.status === "open" ? "default" : "secondary"}>
                        {entry.status === "open" ? "Aberto" : "Fechado"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Entrada:</span>
                      <span>{format(new Date(entry.clock_in), "HH:mm")}</span>
                    </div>
                    {entry.clock_out && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-red-500" />
                        <span className="font-medium">Saída:</span>
                        <span>{format(new Date(entry.clock_out), "HH:mm")}</span>
                      </div>
                    )}
                    {duration !== null && (
                      <Badge variant="outline">{formatDuration(duration)}</Badge>
                    )}
                  </div>

                  {entry.construction_site && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <Building2 className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{entry.construction_site}</span>
                      {entry.distance_from_site_meters !== null && (
                        <span className={entry.location_alert ? "text-yellow-600 font-medium" : "text-green-600"}>
                          ({entry.distance_from_site_meters}m)
                        </span>
                      )}
                    </p>
                  )}

                  {entry.clock_in_address && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{entry.clock_in_address.split(",").slice(0, 3).join(",")}</span>
                    </p>
                  )}

                  {/* Photos */}
                  {(entry.clock_in_photo_url || entry.clock_out_photo_url) && (
                    <div className="flex gap-2 mt-2">
                      {entry.clock_in_photo_url && (
                        <button
                          onClick={() => setPhotoDialog({ url: entry.clock_in_photo_url!, title: "Foto de Entrada" })}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Image className="w-3 h-3" />
                          Foto entrada
                        </button>
                      )}
                      {entry.clock_out_photo_url && (
                        <button
                          onClick={() => setPhotoDialog({ url: entry.clock_out_photo_url!, title: "Foto de Saída" })}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Image className="w-3 h-3" />
                          Foto saída
                        </button>
                      )}
                    </div>
                  )}

                  {entry.notes && (
                    <p className="text-xs text-muted-foreground italic">"{entry.notes}"</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Photo Dialog */}
      <Dialog open={!!photoDialog} onOpenChange={() => setPhotoDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{photoDialog?.title}</DialogTitle>
          </DialogHeader>
          {photoDialog && (
            <SignedImage
              storagePath={photoDialog.url}
              alt={photoDialog.title}
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
