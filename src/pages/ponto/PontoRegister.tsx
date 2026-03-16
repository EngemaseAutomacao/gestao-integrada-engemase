import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, LogIn, LogOut, Loader2, WifiOff, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MAX_ENTRIES_PER_DAY = 3;
const PONTO_CACHE_KEY = "engemase_ponto_today";

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_address: string | null;
  clock_out_address: string | null;
  notes: string | null;
  status: string;
  is_offline?: boolean;
}

function getToday() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function PontoRegister() {
  const { user } = useAuth();
  const { isOnline, addPendingOperation } = useOffline();
  
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openEntry = todayEntries.find((e) => e.status === "open");
  const closedCount = todayEntries.filter((e) => e.status === "closed").length;
  const canClockIn = !openEntry && todayEntries.length < MAX_ENTRIES_PER_DAY;
  const totalEntries = todayEntries.length;

  // Load from cache first, then from DB
  const loadEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Load from cache
    try {
      const cached = localStorage.getItem(PONTO_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === getToday() && parsed.userId === user.id) {
          setTodayEntries(parsed.entries);
        }
      }
    } catch {}

    // If online, fetch from DB
    if (isOnline) {
      const today = getToday();
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_date", today)
        .order("clock_in", { ascending: true });

      if (!error && data) {
        setTodayEntries(data as TimeEntry[]);
        localStorage.setItem(PONTO_CACHE_KEY, JSON.stringify({
          date: today,
          userId: user.id,
          entries: data,
        }));
      }
    }
    setLoading(false);
  }, [user, isOnline]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const getLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalização não suportada"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`
      );
      const data = await res.json();
      return data.display_name || null;
    } catch {
      return null;
    }
  };

  const handleClockIn = async () => {
    if (!user || !canClockIn) return;
    setSubmitting(true);

    try {
      const coords = await getLocation();
      let address: string | null = null;
      try { address = await reverseGeocode(coords.latitude, coords.longitude); } catch {}

      const entryData = {
        user_id: user.id,
        entry_date: getToday(),
        clock_in: new Date().toISOString(),
        clock_in_latitude: coords.latitude,
        clock_in_longitude: coords.longitude,
        clock_in_address: address,
        notes: notes || null,
        status: "open",
      };

      if (isOnline) {
        const { error } = await supabase.from("time_entries").insert(entryData);
        if (error) throw error;
      } else {
        // Save offline
        addPendingOperation("ponto_in", entryData);
        const offlineEntry: TimeEntry = {
          id: crypto.randomUUID(),
          clock_in: entryData.clock_in,
          clock_out: null,
          clock_in_address: address,
          clock_out_address: null,
          notes: entryData.notes,
          status: "open",
          is_offline: true,
        };
        const updated = [...todayEntries, offlineEntry];
        setTodayEntries(updated);
        localStorage.setItem(PONTO_CACHE_KEY, JSON.stringify({
          date: getToday(),
          userId: user.id,
          entries: updated,
        }));
      }

      toast({
        title: "Entrada registrada!",
        description: `Ponto ${totalEntries + 1}/${MAX_ENTRIES_PER_DAY} registrado às ${format(new Date(), "HH:mm")}${!isOnline ? " (offline)" : ""}`,
      });
      setNotes("");
      if (isOnline) await loadEntries();
    } catch (err: any) {
      const msg = err?.code === 1
        ? "Permissão de localização negada. Ative nas configurações do navegador."
        : err?.message || "Erro ao registrar entrada";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !openEntry) return;
    setSubmitting(true);

    try {
      const coords = await getLocation();
      let address: string | null = null;
      try { address = await reverseGeocode(coords.latitude, coords.longitude); } catch {}

      const updateData = {
        clock_out: new Date().toISOString(),
        clock_out_latitude: coords.latitude,
        clock_out_longitude: coords.longitude,
        clock_out_address: address,
        status: "closed",
        notes: notes || openEntry.notes,
      };

      if (isOnline && !openEntry.is_offline) {
        const { error } = await supabase
          .from("time_entries")
          .update(updateData)
          .eq("id", openEntry.id);
        if (error) throw error;
      } else {
        addPendingOperation("ponto_out", {
          entryId: openEntry.id,
          updates: updateData,
        });
        // Update local cache
        const updated = todayEntries.map((e) =>
          e.id === openEntry.id ? { ...e, ...updateData } : e
        );
        setTodayEntries(updated);
        localStorage.setItem(PONTO_CACHE_KEY, JSON.stringify({
          date: getToday(),
          userId: user.id,
          entries: updated,
        }));
      }

      toast({
        title: "Saída registrada!",
        description: `Saída registrada às ${format(new Date(), "HH:mm")}${!isOnline ? " (offline)" : ""}`,
      });
      setNotes("");
      if (isOnline) await loadEntries();
    } catch (err: any) {
      const msg = err?.code === 1
        ? "Permissão de localização negada."
        : err?.message || "Erro ao registrar saída";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Registrar Ponto</h1>
        <p className="text-muted-foreground mt-1">
          {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-foreground">Modo Offline</p>
              <p className="text-xs text-muted-foreground">
                Seus registros serão sincronizados quando a conexão for restaurada
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live clock */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <span className="text-4xl font-bold text-foreground tabular-nums">
              {format(currentTime, "HH:mm:ss")}
            </span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            {closedCount}/{MAX_ENTRIES_PER_DAY} registros completos hoje
          </p>
        </CardContent>
      </Card>

      {/* Today's entries */}
      {todayEntries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Registros de Hoje</h2>
          {todayEntries.map((entry, idx) => (
            <Card
              key={entry.id}
              className={`${entry.status === "open" ? "border-primary/50 bg-primary/5" : ""}`}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">
                      #{idx + 1}
                    </span>
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
                {entry.clock_in_address && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                    {entry.clock_in_address.split(",").slice(0, 3).join(",")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Observações (opcional)</label>
        <Textarea
          placeholder="Ex: Visita técnica na obra X..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Action buttons */}
      {canClockIn ? (
        <Button
          size="lg"
          className="w-full h-16 text-lg gap-3"
          onClick={handleClockIn}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
          Registrar Entrada ({totalEntries + 1}ª)
        </Button>
      ) : openEntry ? (
        <Button
          size="lg"
          variant="destructive"
          className="w-full h-16 text-lg gap-3"
          onClick={handleClockOut}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
          Registrar Saída
        </Button>
      ) : (
        <Card className="border-muted">
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Limite de {MAX_ENTRIES_PER_DAY} registros atingido hoje.</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        <MapPin className="w-3 h-3 inline mr-1" />
        Sua localização será registrada automaticamente
      </p>
    </div>
  );
}
