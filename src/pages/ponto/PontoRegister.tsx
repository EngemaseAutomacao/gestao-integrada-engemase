import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  loading: boolean;
  error: string | null;
}

export default function PontoRegister() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [openEntry, setOpenEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    address: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (user) fetchOpenEntry();
  }, [user]);

  const fetchOpenEntry = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user!.id)
      .eq("status", "open")
      .maybeSingle();

    if (!error && data) {
      setOpenEntry(data);
    } else {
      setOpenEntry(null);
    }
    setLoading(false);
  };

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
    if (!user) return;
    setSubmitting(true);
    setLocation(prev => ({ ...prev, loading: true, error: null }));

    try {
      const coords = await getLocation();
      const address = await reverseGeocode(coords.latitude, coords.longitude);

      const { error } = await supabase.from("time_entries").insert({
        user_id: user.id,
        clock_in_latitude: coords.latitude,
        clock_in_longitude: coords.longitude,
        clock_in_address: address,
        notes: notes || null,
      });

      if (error) throw error;

      toast({ title: "Entrada registrada!", description: `Ponto de entrada registrado às ${format(new Date(), "HH:mm")}` });
      setNotes("");
      await fetchOpenEntry();
    } catch (err: any) {
      const msg = err?.code === 1 ? "Permissão de localização negada. Ative nas configurações do navegador." : err?.message || "Erro ao registrar entrada";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
      setLocation(prev => ({ ...prev, loading: false }));
    }
  };

  const handleClockOut = async () => {
    if (!user || !openEntry) return;
    setSubmitting(true);

    try {
      const coords = await getLocation();
      const address = await reverseGeocode(coords.latitude, coords.longitude);

      const { error } = await supabase
        .from("time_entries")
        .update({
          clock_out: new Date().toISOString(),
          clock_out_latitude: coords.latitude,
          clock_out_longitude: coords.longitude,
          clock_out_address: address,
          status: "closed",
          notes: notes || openEntry.notes,
        })
        .eq("id", openEntry.id);

      if (error) throw error;

      toast({ title: "Saída registrada!", description: `Ponto de saída registrado às ${format(new Date(), "HH:mm")}` });
      setNotes("");
      setOpenEntry(null);
    } catch (err: any) {
      const msg = err?.code === 1 ? "Permissão de localização negada." : err?.message || "Erro ao registrar saída";
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
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Current time */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <span className="text-4xl font-bold text-foreground tabular-nums">
              {format(new Date(), "HH:mm")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      {openEntry && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ponto Aberto</CardTitle>
              <Badge variant="outline" className="border-primary text-primary">Entrada ativa</Badge>
            </div>
            <CardDescription>
              Entrada registrada às {format(new Date(openEntry.clock_in), "HH:mm")}
              {openEntry.clock_in_address && (
                <span className="block mt-1 text-xs">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {openEntry.clock_in_address.split(",").slice(0, 3).join(",")}
                </span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>
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

      {/* Action button */}
      {!openEntry ? (
        <Button
          size="lg"
          className="w-full h-16 text-lg gap-3"
          onClick={handleClockIn}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
          Registrar Entrada
        </Button>
      ) : (
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
      )}

      <p className="text-xs text-muted-foreground text-center">
        <MapPin className="w-3 h-3 inline mr-1" />
        Sua localização será registrada automaticamente
      </p>
    </div>
  );
}
