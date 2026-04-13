import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, Loader2, Calendar, Search, Users, Building2, AlertTriangle, Camera, Image } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
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

interface TimeEntryWithUser {
  id: string;
  user_id: string;
  entry_date: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_address: string | null;
  clock_out_address: string | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  notes: string | null;
  status: string;
  entry_type: string;
  location_alert: boolean;
  distance_from_site_meters: number | null;
  construction_site: string | null;
  profiles: {
    full_name: string;
    username: string | null;
  };
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}min`;
}

export default function PontoAdmin() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<TimeEntryWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [alertFilter, setAlertFilter] = useState("all");
  const [photoDialog, setPhotoDialog] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (profile?.role === "admin") fetchEntries();
  }, [profile]);

  if (profile?.role !== "admin") {
    return <Navigate to="/" />;
  }

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("time_entries")
      .select("*, profiles!time_entries_user_id_fkey(full_name, username)")
      .order("clock_in", { ascending: false })
      .limit(200);

    if (!error && data) {
      setEntries(data as unknown as TimeEntryWithUser[]);
    }
    setLoading(false);
  };

  const filtered = entries.filter((e) => {
    const matchSearch = !search || 
      e.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.profiles?.username?.toLowerCase().includes(search.toLowerCase()) ||
      e.construction_site?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    const matchType = typeFilter === "all" || e.entry_type === typeFilter;
    const matchAlert = alertFilter === "all" || 
      (alertFilter === "alert" && e.location_alert) ||
      (alertFilter === "ok" && !e.location_alert);
    return matchSearch && matchStatus && matchType && matchAlert;
  });

  const alertCount = entries.filter(e => e.location_alert).length;

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
        <h1 className="text-3xl font-bold text-foreground">Gerenciar Pontos</h1>
        <p className="text-muted-foreground mt-1">Visualize os registros de ponto de todos os funcionários</p>
      </div>

      {/* Filters */}
      <div className="shrink-0 flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou obra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status</SelectItem>
              <SelectItem value="open">Abertos</SelectItem>
              <SelectItem value="closed">Fechados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tipo</SelectItem>
              {ENTRY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={alertFilter} onValueChange={setAlertFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Localização</SelectItem>
              <SelectItem value="alert">⚠️ Com alerta</SelectItem>
              <SelectItem value="ok">✅ Sem alerta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{entries.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{entries.filter(e => e.status === "open").length}</p>
              <p className="text-xs text-muted-foreground">Abertos</p>
            </div>
          </CardContent>
        </Card>
        <Card className={alertCount > 0 ? "border-yellow-500/50" : ""}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle className={`w-5 h-5 ${alertCount > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
            <div>
              <p className="text-2xl font-bold">{alertCount}</p>
              <p className="text-xs text-muted-foreground">Alertas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Camera className="w-5 h-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{entries.filter(e => e.clock_in_photo_url || e.clock_out_photo_url).length}</p>
              <p className="text-xs text-muted-foreground">Com foto</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum registro encontrado.</p>
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
                    <div>
                      <CardTitle className="text-base">{entry.profiles?.full_name}</CardTitle>
                      <CardDescription>
                        {format(new Date(entry.clock_in), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.location_alert && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {entry.distance_from_site_meters ? `${entry.distance_from_site_meters}m` : "Fora"}
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
                  <div className="flex items-center gap-4 text-sm flex-wrap">
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
