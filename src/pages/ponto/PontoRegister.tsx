import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, LogIn, LogOut, Loader2, WifiOff, Check, Building2, Camera, AlertTriangle, CheckCircle, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { supabase } from "@/integrations/supabase/client";
import { uploadDataUrlImage } from "@/lib/storageUtils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConstructionSiteAutocomplete } from "@/components/ConstructionSiteAutocomplete";
import { PhotoCapture } from "@/components/PhotoCapture";
import { geocodeAddress } from "@/lib/geocoding";

const MAX_ENTRIES_PER_DAY = 3;
const PONTO_CACHE_KEY = "engemase_ponto_today";
const GEOFENCE_RADIUS_METERS = 500;

interface ConstructionSiteWithCoords {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface ClientOption {
  id: string;
  name: string;
}

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

const ENTRY_TYPES = [
  { value: "obra", label: "Por Obra", disabled: false },
  { value: "cliente", label: "Por Cliente", disabled: false },
  { value: "tecnico", label: "Por Técnico (Em breve)", disabled: true },
  { value: "relatorio", label: "Relatório (Em breve)", disabled: true },
  { value: "interno", label: "Uso Interno", disabled: false },
];

function getToday() {
  return format(new Date(), "yyyy-MM-dd");
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function PontoRegister() {
  const { user } = useAuth();
  const { isOnline, addPendingOperation } = useOffline();

  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [constructionSite, setConstructionSite] = useState("");
  const [clientName, setClientName] = useState("");
  const [entryType, setEntryType] = useState("obra");
  const [sites, setSites] = useState<ConstructionSiteWithCoords[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Photo state
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);

  // Load construction sites + clients
  useEffect(() => {
    supabase
      .from("construction_sites")
      .select("id, name, address, latitude, longitude")
      .eq("active", true)
      .order("name")
      .then(({ data }) => { if (data) setSites(data as ConstructionSiteWithCoords[]); });

    supabase
      .from("clients")
      .select("id, name")
      .eq("active", true)
      .order("name")
      .then(({ data }) => { if (data) setClients(data); });
  }, []);

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

  const getLocation = (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error("Geolocalização não suportada")); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
      );
    });
  };

  const reverseGeocodeLocal = async (lat: number, lng: number): Promise<string | null> => {
    const { reverseGeocode: reverseGeo } = await import("@/lib/geocoding");
    return reverseGeo(lat, lng);
  };

  const getSiteCoords = async (siteName: string): Promise<{ lat: number; lon: number } | null> => {
    const site = sites.find((s) => s.name === siteName);
    if (!site) return null;
    if (site.latitude && site.longitude) return { lat: site.latitude, lon: site.longitude };
    if (site.address) {
      const coords = await geocodeAddress(site.address);
      if (coords) {
        supabase.from("construction_sites").update({ latitude: coords.lat, longitude: coords.lon }).eq("id", site.id).then(() => {});
        return coords;
      }
    }
    return null;
  };

  const checkGeofence = async (userLat: number, userLon: number, siteName: string): Promise<{ alert: boolean; distance: number | null }> => {
    const siteCoords = await getSiteCoords(siteName);
    if (!siteCoords) return { alert: false, distance: null };
    const distance = haversineDistance(userLat, userLon, siteCoords.lat, siteCoords.lon);
    return { alert: distance > GEOFENCE_RADIUS_METERS, distance: Math.round(distance) };
  };

  const handlePhotoCapture = (dataUrl: string) => {
    setPhotoDataUrl(dataUrl);
    setPhotoConfirmed(true);
    toast.success("Foto confirmada!");
  };

  const handleClockIn = async () => {
    if (!user || !canClockIn) return;

    // Validate mandatory photo
    if (!photoConfirmed || !photoDataUrl) {
      toast.error("Foto obrigatória", { description: "Tire uma foto antes de registrar o ponto." });
      return;
    }

    // Validate conditional fields
    if (entryType === "obra" && !constructionSite) {
      toast.error("Selecione a obra");
      return;
    }
    if (entryType === "cliente" && !clientName) {
      toast.error("Selecione o cliente");
      return;
    }

    setSubmitting(true);
    try {
      const coords = await getLocation();
      let address: string | null = null;
      try { address = await reverseGeocodeLocal(coords.latitude, coords.longitude); } catch {}

      const photoUrl = await uploadDataUrlImage(photoDataUrl, "photo", "ferramentas", "saidas");

      let locationAlert = false;
      let distanceFromSite: number | null = null;
      if (entryType === "obra" && constructionSite) {
        const geofence = await checkGeofence(coords.latitude, coords.longitude, constructionSite);
        locationAlert = geofence.alert;
        distanceFromSite = geofence.distance;
        if (locationAlert) {
          toast.warning(`⚠️ Você está a ${distanceFromSite}m da obra "${constructionSite}". Um alerta será registrado.`, { duration: 6000 });
        }
      }

      const entryData = {
        user_id: user.id,
        entry_date: getToday(),
        clock_in: new Date().toISOString(),
        clock_in_latitude: coords.latitude,
        clock_in_longitude: coords.longitude,
        clock_in_address: address,
        clock_in_photo_url: photoUrl,
        construction_site: entryType === "obra" ? constructionSite || null : null,
        client_name: entryType === "cliente" ? clientName || null : null,
        entry_type: entryType,
        notes: notes || null,
        status: "open",
        location_alert: locationAlert,
        distance_from_site_meters: distanceFromSite,
      };

      if (isOnline) {
        const { error } = await supabase.from("time_entries").insert(entryData);
        if (error) throw error;
      } else {
        addPendingOperation("ponto_in", entryData);
        const offlineEntry: TimeEntry = {
          id: crypto.randomUUID(),
          clock_in: entryData.clock_in,
          clock_out: null,
          clock_in_address: address,
          clock_out_address: null,
          clock_in_photo_url: photoUrl,
          clock_out_photo_url: null,
          construction_site: entryData.construction_site,
          client_name: entryData.client_name,
          notes: entryData.notes,
          status: "open",
          entry_type: entryType,
          location_alert: locationAlert,
          distance_from_site_meters: distanceFromSite,
          is_offline: true,
        };
        const updated = [...todayEntries, offlineEntry];
        setTodayEntries(updated);
        localStorage.setItem(PONTO_CACHE_KEY, JSON.stringify({ date: getToday(), userId: user.id, entries: updated }));
      }

      toast.success("Entrada registrada!", {
        description: `Ponto ${totalEntries + 1}/${MAX_ENTRIES_PER_DAY} registrado às ${format(new Date(), "HH:mm")}${!isOnline ? " (offline)" : ""}`,
      });
      setNotes("");
      setConstructionSite("");
      setClientName("");
      setPhotoDataUrl(null);
      setPhotoConfirmed(false);
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

      const photoUrl = await uploadDataUrlImage(photoDataUrl, "photo", "ferramentas", "entradas");

      let locationAlert = openEntry.location_alert;
      let distanceFromSite = openEntry.distance_from_site_meters;
      if (openEntry.construction_site) {
        const geofence = await checkGeofence(coords.latitude, coords.longitude, openEntry.construction_site);
        if (geofence.alert) {
          locationAlert = true;
          distanceFromSite = geofence.distance;
          toast.warning(`⚠️ Saída registrada a ${geofence.distance}m da obra. Alerta registrado.`, { duration: 6000 });
        }
      }

      const updateData = {
        clock_out: new Date().toISOString(),
        clock_out_latitude: coords.latitude,
        clock_out_longitude: coords.longitude,
        clock_out_address: address,
        clock_out_photo_url: photoUrl,
        status: "closed",
        notes: notes || openEntry.notes,
        location_alert: locationAlert,
        distance_from_site_meters: distanceFromSite,
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
      setNotes("");
      setPhotoDataUrl(null);
      setPhotoConfirmed(false);
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
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold text-foreground">Registrar Ponto</h1>
        <p className="text-muted-foreground mt-1">
          {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

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
            <Card key={entry.id} className={`${entry.status === "open" ? "border-primary/50 bg-primary/5" : ""} ${entry.location_alert ? "border-yellow-500/50" : ""}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
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
          ))}
        </div>
      )}

      {/* Entry type */}
      <div className="space-y-2">
        <Label>Tipo de Registro *</Label>
        <Select value={entryType} onValueChange={(v) => { setEntryType(v); setConstructionSite(""); setClientName(""); }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTRY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Construction site - only for "obra" */}
      {entryType === "obra" && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Obra de Destino *
          </Label>
          <ConstructionSiteAutocomplete
            sites={sites}
            value={constructionSite}
            onChange={setConstructionSite}
            placeholder="Selecione a obra..."
          />
          {constructionSite && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Localização será comparada com a obra (raio de {GEOFENCE_RADIUS_METERS}m)
            </p>
          )}
        </div>
      )}

      {/* Client - only for "cliente" */}
      {entryType === "cliente" && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Cliente *
          </Label>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado. Peça ao administrador para cadastrar.</p>
          ) : (
            <Select value={clientName} onValueChange={setClientName}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Photo Capture - MANDATORY */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Foto de Registro *</Label>
          {photoConfirmed && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="w-3 h-3" />Capturada
            </Badge>
          )}
        </div>
        {!photoConfirmed ? (
          <PhotoCapture onCapture={handlePhotoCapture} title={openEntry ? "Foto de saída" : "Foto de entrada"} />
        ) : (
          <div className="relative">
            <img src={photoDataUrl!} alt="Foto capturada" className="w-full h-48 object-cover rounded-lg" />
            <Button type="button" variant="outline" size="sm" className="absolute top-2 right-2" onClick={() => { setPhotoConfirmed(false); setPhotoDataUrl(null); }}>
              Refazer
            </Button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Observações (opcional)</label>
        <Textarea placeholder="Ex: Visita técnica na obra X..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>

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
  );
}
