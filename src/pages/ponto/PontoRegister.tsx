import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, Loader2, WifiOff, Check, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadDataUrlImage } from "@/lib/storageUtils";
import { compressDataUrl } from "@/lib/imageCompression";
import { toast } from "sonner";
import { ModuleHero } from "@/components/ModuleHero";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useGeolocation } from "@/hooks/useGeolocation";
import { PontoEntryCard } from "@/components/ponto/PontoEntryCard";
import { PontoFormFields } from "@/components/ponto/PontoFormFields";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

const MAX_ENTRIES_PER_DAY = 3;
const PONTO_CACHE_KEY = "engemase_ponto_today";

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_address: string | null;
  clock_out_address: string | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  construction_site: string | null;
  client_name: string | null;
  notes: string | null;
  status: string;
  entry_type: string;
  location_alert: boolean;
  distance_from_site_meters: number | null;
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
  const [entryType, setEntryType] = useState("interno");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Photo state
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);

  // Unsaved changes warning
  const hasUnsavedData = !!(notes || photoConfirmed);
  useUnsavedChanges(hasUnsavedData);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const openEntry = todayEntries.find((e) => e.status === "open");
  const closedCount = todayEntries.filter((e) => e.status === "closed").length;
  const canClockIn = !openEntry && todayEntries.length < MAX_ENTRIES_PER_DAY;
  const totalEntries = todayEntries.length;

  const loadEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const cached = localStorage.getItem(PONTO_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === getToday() && parsed.userId === user.id) {
          setTodayEntries(parsed.entries);
        }
      }
    } catch {}

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
        localStorage.setItem(PONTO_CACHE_KEY, JSON.stringify({ date: today, userId: user.id, entries: data }));
      }
    }
    setLoading(false);
  }, [user, isOnline]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const { getCurrentPosition } = useGeolocation();

  const getLocation = async (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    const coords = await getCurrentPosition();
    return { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy || 0 };
  };

  const reverseGeocodeLocal = async (lat: number, lng: number): Promise<string | null> => {
    const { reverseGeocode: reverseGeo } = await import("@/lib/geocoding");
    return reverseGeo(lat, lng);
  };

  const handlePhotoCapture = (dataUrl: string) => {
    setPhotoDataUrl(dataUrl);
    setPhotoConfirmed(true);
    toast.success("Foto confirmada!");
  };

  const handlePhotoReset = () => {
    setPhotoConfirmed(false);
    setPhotoDataUrl(null);
  };

  const resetForm = () => {
    setNotes("");
    setPhotoDataUrl(null);
    setPhotoConfirmed(false);
  };

  const handleClockIn = async () => {
    if (!user || !canClockIn) return;

    if (!photoConfirmed || !photoDataUrl) {
      toast.error("Foto obrigatória", { description: "Tire uma foto antes de registrar o ponto." });
      return;
    }

    setSubmitting(true);
    try {
      const coords = await getLocation();
      let address: string | null = null;
      try { address = await reverseGeocodeLocal(coords.latitude, coords.longitude); } catch {}

      const compressedPhoto = await compressDataUrl(photoDataUrl, 1280, 0.7);
      const photoUrl = await uploadDataUrlImage(compressedPhoto, "photo", "ferramentas", "saidas");

      const entryData = {
        user_id: user.id,
        entry_date: getToday(),
        clock_in: new Date().toISOString(),
        clock_in_latitude: coords.latitude,
        clock_in_longitude: coords.longitude,
        clock_in_address: address,
        clock_in_photo_url: photoUrl,
        construction_site: null,
        client_name: null,
        entry_type: entryType,
        notes: notes || null,
        status: "open",
        location_alert: false,
        distance_from_site_meters: null,
      };

      if (isOnline) {
        const { error } = await supabase.from("time_entries").insert(entryData);
        if (error) throw error;
      } else {
        const localId = crypto.randomUUID();
        if (photoUrl) {
          try {
            const { saveOfflinePhoto } = await import("@/hooks/useOfflinePhotos");
            const response = await fetch(photoUrl);
            const blob = await response.blob();
            const file = new File([blob], "ponto_in.jpg", { type: "image/jpeg" });
            const opId = addPendingOperation("ponto_in", { ...entryData, _local_id: localId, clock_in_photo_url: null });
            await saveOfflinePhoto(opId, "clock_in", file);
          } catch {
            addPendingOperation("ponto_in", { ...entryData, _local_id: localId });
          }
        } else {
          addPendingOperation("ponto_in", { ...entryData, _local_id: localId });
        }
        const offlineEntry: TimeEntry = {
          id: localId,
          clock_in: entryData.clock_in,
          clock_out: null,
          clock_in_address: address,
          clock_out_address: null,
          clock_in_photo_url: photoUrl,
          clock_out_photo_url: null,
          construction_site: null,
          client_name: null,
          notes: entryData.notes,
          status: "open",
          entry_type: entryType,
          location_alert: false,
          distance_from_site_meters: null,
          is_offline: true,
        };
        const updated = [...todayEntries, offlineEntry];
        setTodayEntries(updated);
        localStorage.setItem(PONTO_CACHE_KEY, JSON.stringify({ date: getToday(), userId: user.id, entries: updated }));
      }

      toast.success("Entrada registrada!", {
        description: `Ponto ${totalEntries + 1}/${MAX_ENTRIES_PER_DAY} registrado às ${format(new Date(), "HH:mm")}${!isOnline ? " (offline)" : ""}`,
      });
      resetForm();
      if (isOnline) await loadEntries();
    } catch (err: any) {
      const msg = err?.code === 1 ? "Permissão de localização negada. Ative nas configurações do navegador." : err?.message || "Erro ao registrar entrada";
      toast.error("Erro", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!user || !openEntry) return;

    if (!photoConfirmed || !photoDataUrl) {
      toast.error("Foto obrigatória", { description: "Tire uma foto antes de registrar a saída." });
      return;
    }

    setSubmitting(true);
    try {
      const coords = await getLocation();
      let address: string | null = null;
      try { address = await reverseGeocodeLocal(coords.latitude, coords.longitude); } catch {}

      const compressedPhoto = await compressDataUrl(photoDataUrl, 1280, 0.7);
      const photoUrl = await uploadDataUrlImage(compressedPhoto, "photo", "ferramentas", "entradas");

      const updateData = {
        clock_out: new Date().toISOString(),
        clock_out_latitude: coords.latitude,
        clock_out_longitude: coords.longitude,
        clock_out_address: address,
        clock_out_photo_url: photoUrl,
        status: "closed",
        notes: notes || openEntry.notes,
        location_alert: openEntry.location_alert,
        distance_from_site_meters: openEntry.distance_from_site_meters,
      };

      if (isOnline && !openEntry.is_offline) {
        const { error } = await supabase.from("time_entries").update(updateData).eq("id", openEntry.id);
        if (error) throw error;
      } else {
        addPendingOperation("ponto_out", { entryId: openEntry.id, updates: updateData });
        const updated = todayEntries.map((e) => e.id === openEntry.id ? { ...e, ...updateData } : e);
        setTodayEntries(updated);
        localStorage.setItem(PONTO_CACHE_KEY, JSON.stringify({ date: getToday(), userId: user.id, entries: updated }));
      }

      toast.success("Saída registrada!", {
        description: `Saída registrada às ${format(new Date(), "HH:mm")}${!isOnline ? " (offline)" : ""}`,
      });
      resetForm();
      if (isOnline) await loadEntries();
    } catch (err: any) {
      const msg = err?.code === 1 ? "Permissão de localização negada." : err?.message || "Erro ao registrar saída";
      toast.error("Erro", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <ModuleHero
        eyebrow="Módulo · Ponto"
        title="Registrar Ponto"
        subtitle={format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
      />
      <div className="space-y-6 max-w-lg mx-auto px-3 sm:px-6 -mt-14 sm:-mt-16 relative z-10">


      {!isOnline && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-foreground">Modo Offline</p>
              <p className="text-xs text-muted-foreground">Seus registros serão sincronizados quando a conexão for restaurada</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live clock */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <span className="text-4xl font-bold text-foreground tabular-nums">{format(currentTime, "HH:mm:ss")}</span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">{closedCount}/{MAX_ENTRIES_PER_DAY} registros completos hoje</p>
        </CardContent>
      </Card>

      {/* Today's entries */}
      {todayEntries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Registros de Hoje</h2>
          {todayEntries.map((entry, idx) => (
            <PontoEntryCard key={entry.id} entry={entry} index={idx} />
          ))}
        </div>
      )}

      {/* Form fields */}
      <PontoFormFields
        entryType={entryType}
        onEntryTypeChange={setEntryType}
        notes={notes}
        onNotesChange={setNotes}
        photoDataUrl={photoDataUrl}
        photoConfirmed={photoConfirmed}
        onPhotoCapture={handlePhotoCapture}
        onPhotoReset={handlePhotoReset}
        photoTitle={openEntry ? "Foto de saída" : "Foto de entrada"}
        showEntryType={!openEntry}
        hideContextFields={!!openEntry}
      />

      {/* Action buttons */}
      {canClockIn ? (
        <Button size="lg" className="w-full h-16 text-lg gap-3" onClick={handleClockIn} disabled={submitting}>
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
          Registrar Entrada ({totalEntries + 1}ª)
        </Button>
      ) : openEntry ? (
        <Button size="lg" variant="destructive" className="w-full h-16 text-lg gap-3" onClick={handleClockOut} disabled={submitting}>
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
        Sua localização será registrada automaticamente (GPS de alta precisão)
      </p>
      </div>
    </div>
  );
}
