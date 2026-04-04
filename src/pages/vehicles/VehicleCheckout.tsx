import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightCircle, Car, Search, MapPin, Loader2, Navigation, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import VehiclePhotoCapture from "@/components/VehiclePhotoCapture";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { ConstructionSiteAutocomplete } from "@/components/ConstructionSiteAutocomplete";

interface RouteEstimate {
  distance_km: number;
  duration_minutes: number;
}

export default function VehicleCheckout() {
  const { user } = useAuth();
  const { isOnline, addPendingOperation } = useOffline();
  const { data: cachedVehicles, saveToCache: saveVehiclesCache } = useOfflineStorage<any[]>("available-vehicles", []);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedReturnTime, setEstimatedReturnTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Outside city state
  const [isOutsideCity, setIsOutsideCity] = useState(false);
  const [originAddress, setOriginAddress] = useState("");
  const [originCoords, setOriginCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [routeEstimate, setRouteEstimate] = useState<RouteEstimate | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  const [photos, setPhotos] = useState<Record<string, File | null>>({ front: null, back: null, left: null, right: null, dashboard: null });
  const [previews, setPreviews] = useState<Record<string, string | null>>({ front: null, back: null, left: null, right: null, dashboard: null });

  const handlePhotoChange = (key: string, file: File | null, preview: string | null) => {
    setPhotos(prev => ({ ...prev, [key]: file }));
    setPreviews(prev => ({ ...prev, [key]: preview }));
  };

  const allPhotos = Object.values(photos).every(Boolean);

  const handleGetLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude, accuracy } = position.coords;
      setOriginCoords({ lat: latitude, lon: longitude });
      console.log(`GPS accuracy: ${accuracy}m`);

      // Reverse geocode
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "pt-BR" } }
      );
      const data = await res.json();
      const rawAddr = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      const addr = rawAddr.split(", ").filter((p: string) => !p.match(/^Região /i)).join(", ");
      setOriginAddress(addr);
      toast.success("Localização obtida!");
    } catch {
      toast.error("Não foi possível obter a localização. Verifique as permissões.");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleCalculateRoute = async () => {
    if (!destinationAddress.trim()) {
      toast.error("Informe o destino primeiro.");
      return;
    }
    if (!originCoords && !originAddress.trim()) {
      toast.error("Informe a origem ou use o GPS.");
      return;
    }

    setIsCalculatingRoute(true);
    try {
      // Geocode origin if no coords
      let startLat = originCoords?.lat;
      let startLon = originCoords?.lon;

      if (!startLat || !startLon) {
        const originGeoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(originAddress)}&format=json&limit=1&countrycodes=br`,
          { headers: { "Accept-Language": "pt-BR" } }
        );
        const originGeoData = await originGeoRes.json();
        if (!originGeoData.length) {
          toast.error("Origem não encontrada. Tente um endereço mais específico.");
          return;
        }
        startLat = parseFloat(originGeoData[0].lat);
        startLon = parseFloat(originGeoData[0].lon);
        setOriginCoords({ lat: startLat, lon: startLon });
      }

      // Geocode destination
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destinationAddress)}&format=json&limit=1&countrycodes=br`,
        { headers: { "Accept-Language": "pt-BR" } }
      );
      const geoData = await geoRes.json();
      if (!geoData.length) {
        toast.error("Destino não encontrado. Tente um endereço mais específico.");
        return;
      }

      const destLat = parseFloat(geoData[0].lat);
      const destLon = parseFloat(geoData[0].lon);

      // OSRM route
      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${destLon},${destLat}?overview=false`
      );
      const routeData = await routeRes.json();

      if (routeData.code !== "Ok" || !routeData.routes?.length) {
        toast.error("Não foi possível calcular a rota.");
        return;
      }

      const route = routeData.routes[0];
      setRouteEstimate({
        distance_km: Math.round((route.distance / 1000) * 10) / 10,
        duration_minutes: Math.round(route.duration / 60),
      });
      toast.success("Rota calculada!");
    } catch {
      toast.error("Erro ao calcular a rota. Tente novamente.");
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const { data: availableVehicles, isLoading } = useQuery({
    queryKey: ["available-vehicles"],
    queryFn: async () => {
      if (!isOnline) {
        if (cachedVehicles && cachedVehicles.length > 0) {
          toast.info("Modo offline - usando dados em cache");
          return cachedVehicles;
        }
        return [];
      }
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("status", "available")
        .order("name");

      if (error) throw error;
      if (data) saveVehiclesCache(data);
      return data;
    }
  });

  const { data: constructionSites } = useQuery({
    queryKey: ["construction-sites-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("construction_sites")
        .select("id, name")
        .eq("active", true)
        .order("name", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadPhoto = async (file: File, prefix: string) => {
    const fileExt = file.name.split(".").pop();
    const seq = String(Date.now()).slice(-6);
    const dateFolder = new Date().toISOString().slice(0, 10);
    const filePath = `veiculos/saidas/${dateFolder}/saida_${prefix}_${seq}.${fileExt}`;
    const { error } = await supabase.storage.from("imagens").upload(filePath, file);
    if (error) throw error;
    return filePath;
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!selectedVehicle) throw new Error("Selecione um veículo");
      const finalDestination = destination.trim();
      if (!finalDestination) throw new Error("Selecione a obra de destino");
      if (!estimatedReturnTime) throw new Error("Informe a hora estimada de retorno");

      // Build estimated return date from time input
      const now = new Date();
      const [hours, minutes] = estimatedReturnTime.split(":").map(Number);
      const estimatedReturn = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
      if (estimatedReturn <= now) {
        estimatedReturn.setDate(estimatedReturn.getDate() + 1);
      }

      const insertData: any = {
        vehicle_id: selectedVehicle,
        user_id: user.id,
        checked_out_by: user.id,
        km_checkout: 0,
        destination: finalDestination,
        notes,
        status: "checked_out",
        is_outside_city: isOutsideCity,
        estimated_return_time: estimatedReturnTime,
      };

      if (isOutsideCity) {
        insertData.origin_address = originAddress;
        insertData.origin_latitude = originCoords?.lat;
        insertData.origin_longitude = originCoords?.lon;
        insertData.destination_address = destinationAddress;
        insertData.estimated_distance_km = routeEstimate?.distance_km;
        insertData.estimated_duration_minutes = routeEstimate?.duration_minutes;
      }

      if (!isOnline) {
        const opId = crypto.randomUUID();
        // Save photos to IndexedDB if available
        const photoKeys = ["front", "back", "left", "right", "dashboard"];
        let photosSaved = 0;
        for (const key of photoKeys) {
          if (photos[key]) {
            try {
              const { saveOfflinePhoto } = await import("@/hooks/useOfflinePhotos");
              await saveOfflinePhoto(opId, key, photos[key]!);
              photosSaved++;
            } catch (e) {
              console.error(`Erro ao salvar foto ${key} offline:`, e);
            }
          }
        }
        addPendingOperation("vehicle_checkout", insertData);
        // Update the operation ID to match
        const ops = JSON.parse(localStorage.getItem("engemase_pending_operations") || "[]");
        if (ops.length > 0) {
          ops[ops.length - 1].id = opId;
          localStorage.setItem("engemase_pending_operations", JSON.stringify(ops));
        }
        const photoMsg = photosSaved > 0 ? ` ${photosSaved} foto(s) salva(s) localmente.` : " Fotos não foram salvas.";
        toast.success(`Saída registrada (offline)!${photoMsg} Será sincronizada quando conectar.`);
        navigate("/veiculos");
        return;
      }

      if (!allPhotos) throw new Error("Tire todas as fotos do veículo (incluindo painel)");

      const [frontUrl, backUrl, leftUrl, rightUrl, dashboardUrl] = await Promise.all([
        uploadPhoto(photos.front!, "front_out"),
        uploadPhoto(photos.back!, "back_out"),
        uploadPhoto(photos.left!, "left_out"),
        uploadPhoto(photos.right!, "right_out"),
        uploadPhoto(photos.dashboard!, "dashboard_out"),
      ]);

      insertData.photo_front_checkout = frontUrl;
      insertData.photo_back_checkout = backUrl;
      insertData.photo_left_checkout = leftUrl;
      insertData.photo_right_checkout = rightUrl;
      insertData.photo_dashboard_checkout = dashboardUrl;

      const { error } = await supabase.from("vehicle_checkouts").insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saída registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-vehicle-checkouts"] });
      navigate("/veiculos");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao registrar saída");
    }
  });

  const filteredVehicles = availableVehicles?.filter(vehicle =>
    vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.plate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkoutMutation.mutate();
  };

  const selectedVehicleData = availableVehicles?.find(v => v.id === selectedVehicle);

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return `${h}h ${m}min`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ArrowRightCircle className="w-8 h-8 text-primary" />
          Registrar Saída
        </h1>
        <p className="text-muted-foreground mt-1">
          Registre a saída de um veículo
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Veículo</CardTitle>
            <CardDescription>Escolha o veículo para registrar a saída</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou placa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Carregando veículos...</p>
            ) : filteredVehicles && filteredVehicles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredVehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedVehicle === vehicle.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Car className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{vehicle.name}</p>
                        <p className="text-sm text-muted-foreground">{vehicle.plate}</p>
                        {vehicle.brand && vehicle.model && (
                          <p className="text-xs text-muted-foreground">{vehicle.brand} {vehicle.model}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nenhum veículo disponível
              </p>
            )}
          </CardContent>
        </Card>

        {/* Checkout Details */}
        {selectedVehicle && (
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Saída</CardTitle>
              <CardDescription>
                Veículo selecionado: {selectedVehicleData?.name} ({selectedVehicleData?.plate})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="destination">Obra de Destino *</Label>
                <ConstructionSiteAutocomplete
                  sites={constructionSites || []}
                  value={destination}
                  onChange={setDestination}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedReturnTime" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Hora Estimada de Retorno *
                </Label>
                <Input
                  id="estimatedReturnTime"
                  type="time"
                  value={estimatedReturnTime}
                  onChange={(e) => setEstimatedReturnTime(e.target.value)}
                  required
                />
              </div>

              {/* Outside City Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    Trabalho fora da cidade
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Ative para calcular distância e tempo estimado
                  </p>
                </div>
                <Switch
                  checked={isOutsideCity}
                  onCheckedChange={(checked) => {
                    setIsOutsideCity(checked);
                    if (!checked) {
                      setOriginAddress("");
                      setOriginCoords(null);
                      setDestinationAddress("");
                      setRouteEstimate(null);
                    }
                  }}
                />
              </div>

              {/* Outside City Details */}
              {isOutsideCity && (
                <Card className="border-dashed">
                  <CardContent className="pt-4 space-y-4">
                    {/* Origin */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Localização de Origem
                      </Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <AddressAutocomplete
                            value={originAddress}
                            onChange={(val) => {
                              setOriginAddress(val);
                              setRouteEstimate(null);
                            }}
                            onSelect={(addr, lat, lon) => {
                              setOriginAddress(addr);
                              setOriginCoords({ lat, lon });
                              setRouteEstimate(null);
                            }}
                            placeholder="Digite ou use o GPS para localização..."
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGetLocation}
                          disabled={isLoadingLocation}
                          title="Usar GPS"
                        >
                          {isLoadingLocation ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Navigation className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use o botão GPS ou digite o endereço para buscar
                      </p>
                    </div>

                    {/* Destination Address */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Endereço de Destino
                      </Label>
                      <AddressAutocomplete
                        value={destinationAddress}
                        onChange={(val) => {
                          setDestinationAddress(val);
                          setRouteEstimate(null);
                        }}
                        onSelect={(addr) => {
                          setDestinationAddress(addr);
                          setRouteEstimate(null);
                        }}
                        placeholder="Ex: São Paulo, SP ou Rua X, Cidade..."
                      />
                    </div>

                    {/* Calculate Button */}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCalculateRoute}
                      disabled={isCalculatingRoute || (!originCoords && !originAddress.trim()) || !destinationAddress.trim()}
                      className="w-full"
                    >
                      {isCalculatingRoute ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Calculando...
                        </>
                      ) : (
                        "Calcular Distância e Tempo"
                      )}
                    </Button>

                    {/* Route Result */}
                    {routeEstimate && (
                      <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">≈ {routeEstimate.distance_km} km</p>
                          <p className="text-sm text-muted-foreground">Distância aproximada</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">≈ {formatDuration(routeEstimate.duration_minutes)}</p>
                          <p className="text-sm text-muted-foreground">Tempo aproximado</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações adicionais..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <VehiclePhotoCapture
                photos={photos}
                previews={previews}
                onPhotoChange={handlePhotoChange}
                includeDashboard
              />
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/veiculos")}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!selectedVehicle || !destination || !estimatedReturnTime || (isOnline && !allPhotos) || checkoutMutation.isPending}
            className="flex-1"
          >
            {checkoutMutation.isPending ? "Registrando..." : "Registrar Saída"}
          </Button>
        </div>
      </form>
    </div>
  );
}
