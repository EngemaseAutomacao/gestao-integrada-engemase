import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleHero } from "@/components/ModuleHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightCircle, Car, Search, MapPin, Loader2, Navigation, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadFileImage } from "@/lib/storageUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useActiveConstructionSites } from "@/hooks/useConstructionSites";
import { useGeolocation } from "@/hooks/useGeolocation";
import { reverseGeocode, geocodeAddress, calculateRoute } from "@/lib/geocoding";
import type { RouteEstimate as RouteEstimateType } from "@/lib/geocoding";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import VehiclePhotoCapture, { getRequiredPhotoKeys } from "@/components/VehiclePhotoCapture";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { ConstructionSiteAutocomplete } from "@/components/ConstructionSiteAutocomplete";


export default function VehicleCheckout() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [responsibleUserId, setResponsibleUserId] = useState<string>("");
  const [manualMode, setManualMode] = useState(false);
  const [manualDate, setManualDate] = useState<string>("");
  const [skipPhotos, setSkipPhotos] = useState(false);
  const [approvedUsers, setApprovedUsers] = useState<{ id: string; full_name: string }[]>([]);

  const { isOnline, addPendingOperation } = useOffline();
  const { data: cachedVehicles, saveToCache: saveVehiclesCache } = useOfflineStorage<any[]>("available-vehicles", []);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const vehicleIdFromParam = searchParams.get("vehicleId") || "";

  const [selectedVehicle, setSelectedVehicle] = useState(vehicleIdFromParam);
  const isVehicleLocked = !!vehicleIdFromParam;
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedReturnTime, setEstimatedReturnTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Outside city state
  const [isOutsideCity, setIsOutsideCity] = useState(false);
  const [originAddress, setOriginAddress] = useState("");
  const [originCoords, setOriginCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [routeEstimate, setRouteEstimate] = useState<RouteEstimateType | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [previews, setPreviews] = useState<Record<string, string | null>>({});

  const hasUnsavedData = !!(selectedVehicle || destination || notes || Object.values(photos).some(Boolean));
  useUnsavedChanges(hasUnsavedData);

  const handlePhotoChange = (key: string, file: File | null, preview: string | null) => {
    setPhotos(prev => ({ ...prev, [key]: file }));
    setPreviews(prev => ({ ...prev, [key]: preview }));
  };

  // Load approved users for admin select
  useQuery({
    queryKey: ["approved-users-vehicle-checkout"],
    queryFn: async () => {
      if (!isAdmin) return [];
      const { data } = await supabase.rpc("get_approved_users");
      setApprovedUsers((data as any) || []);
      return data || [];
    },
    enabled: isAdmin,
  });


  // Platform-specific state
  const [chargesDuringUse, setChargesDuringUse] = useState<string>("");

  const { getCurrentPosition, loading: isLoadingLocation } = useGeolocation();

  const handleGetLocation = async () => {
    try {
      const coords = await getCurrentPosition();
      setOriginCoords({ lat: coords.latitude, lon: coords.longitude });

      const addr = await reverseGeocode(coords.latitude, coords.longitude);
      setOriginAddress(addr || `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      toast.success("Localização obtida!");
    } catch {
      toast.error("Não foi possível obter a localização. Verifique as permissões.");
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
      let startCoords = originCoords;

      if (!startCoords) {
        const geocoded = await geocodeAddress(originAddress);
        if (!geocoded) {
          toast.error("Origem não encontrada. Tente um endereço mais específico.");
          return;
        }
        startCoords = geocoded;
        setOriginCoords(startCoords);
      }

      const destCoords = await geocodeAddress(destinationAddress);
      if (!destCoords) {
        toast.error("Destino não encontrado. Tente um endereço mais específico.");
        return;
      }

      const route = await calculateRoute(startCoords, destCoords);
      if (!route) {
        toast.error("Não foi possível calcular a rota.");
        return;
      }

      setRouteEstimate(route);
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
        .select("*, last_km:vehicle_checkouts(km_checkin)")
        .eq("status", "available")
        .order("name");

      if (error) throw error;
      
      // Post-process to get the latest checkin km for each vehicle
      const processedData = data?.map((v: any) => ({
        ...v,
        last_km: v.last_km?.sort((a: any, b: any) => b.km_checkin - a.km_checkin)[0]?.km_checkin || 0
      }));

      if (processedData) saveVehiclesCache(processedData);
      return processedData;
    }
  });

  const { data: constructionSites } = useActiveConstructionSites();

  const selectedVehicleData = availableVehicles?.find((v: any) => v.id === selectedVehicle);
  const vehicleType: "vehicle" | "platform" = (selectedVehicleData?.vehicle_type as any) || "vehicle";
  const isPlatform = vehicleType === "platform";
  const requiredPhotoKeys = getRequiredPhotoKeys(vehicleType, true);
  const allPhotos = requiredPhotoKeys.every((k) => !!photos[k]);

  const uploadPhoto = async (file: File, prefix: string) => {
    return uploadFileImage(file, prefix, "veiculos", "saidas");
  };

  // Map photo key -> DB column for checkout
  const photoColumnMap: Record<string, string> = {
    front: "photo_front_checkout",
    back: "photo_back_checkout",
    left: "photo_left_checkout",
    right: "photo_right_checkout",
    dashboard: "photo_dashboard_checkout",
    control: "photo_control_checkout",
    wheel_fl: "photo_wheel_fl_checkout",
    wheel_fr: "photo_wheel_fr_checkout",
    wheel_rl: "photo_wheel_rl_checkout",
    wheel_rr: "photo_wheel_rr_checkout",
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

      const effectiveUserId = isAdmin && responsibleUserId && responsibleUserId !== user.id ? responsibleUserId : user.id;
      const isAdminActingForOther = effectiveUserId !== user.id;
      if (isAdminActingForOther && (!notes || notes.trim().length < 5)) {
        throw new Error("Justificativa obrigatória (mín. 5 caracteres) ao retirar veículo em nome de outro usuário.");
      }

      const insertData: any = {
        vehicle_id: selectedVehicle,
        user_id: effectiveUserId,
        checked_out_by: user.id,
        km_checkout: selectedVehicleData?.last_km || 0,
        destination: finalDestination,
        notes,
        status: "checked_out",
        is_outside_city: isOutsideCity,
        estimated_return_time: estimatedReturnTime,
        ...(isAdmin && manualMode && manualDate ? { checkout_date: new Date(manualDate).toISOString() } : {}),
      };


      if (isOutsideCity) {
        insertData.origin_address = originAddress;
        insertData.origin_latitude = originCoords?.lat;
        insertData.origin_longitude = originCoords?.lon;
        insertData.destination_address = destinationAddress;
        insertData.estimated_distance_km = routeEstimate?.distance_km;
        insertData.estimated_duration_minutes = routeEstimate?.duration_minutes;
      }

      if (isPlatform) {
        if (chargesDuringUse.trim()) {
          insertData.charges_during_use = parseInt(chargesDuringUse) || 0;
        }
      }

      if (!isOnline) {
        const opId = crypto.randomUUID();
        // Save photos to IndexedDB if available
        let photosSaved = 0;
        for (const key of requiredPhotoKeys) {
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

      const photosOptional = isAdmin && manualMode && skipPhotos;
      if (!photosOptional && !allPhotos) {
        throw new Error(isPlatform
          ? "Tire todas as fotos da plataforma (4 lados + controle + 4 rodas)"
          : "Tire todas as fotos do veículo (incluindo painel)");
      }

      // Upload available photos in parallel
      const photoKeysToUpload = requiredPhotoKeys.filter((key) => !!photos[key]);
      const uploadResults = await Promise.all(
        photoKeysToUpload.map(async (key) => {
          const url = await uploadPhoto(photos[key]!, `${key}_out`);
          return { key, url };
        })
      );

      for (const { key, url } of uploadResults) {
        const col = photoColumnMap[key];
        if (col) insertData[col] = url;
      }

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

  // selectedVehicleData defined above

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return `${h}h ${m}min`;
  };

  return (
    <div className="space-y-6">
      <ModuleHero
        narrow
        eyebrow="Módulo · Veículos"
        title="Registrar Saída"
        subtitle="Registre a saída de um veículo"
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
        {/* Vehicle Selection - hidden when preselected from dashboard */}
        {!isVehicleLocked && (
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
        )}
        {/* Checkout Details */}
        {selectedVehicle && (
          <Card>
            <CardHeader>
              <CardTitle>{isPlatform ? "Detalhes do Uso" : "Detalhes da Saída"}</CardTitle>
              <CardDescription>
                {isPlatform ? "Plataforma" : "Veículo"} selecionado: {selectedVehicleData?.name} ({selectedVehicleData?.plate})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAdmin && (
                <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="manual_mode_vehicle" className="cursor-pointer">Retirada manual (em nome de outro)</Label>
                    <Switch
                      id="manual_mode_vehicle"
                      checked={manualMode}
                      onCheckedChange={(v) => {
                        setManualMode(v);
                        if (!v) { setResponsibleUserId(""); setManualDate(""); setSkipPhotos(false); }
                      }}
                    />
                  </div>
                  {manualMode && (
                    <>
                      <Label htmlFor="responsible_user_vehicle">Responsável pela retirada</Label>
                      <Select value={responsibleUserId || user!.id} onValueChange={(v) => setResponsibleUserId(v === user!.id ? "" : v)}>
                        <SelectTrigger id="responsible_user_vehicle">
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={user!.id}>Eu mesmo ({profile?.full_name})</SelectItem>
                          {approvedUsers.filter(u => u.id !== user!.id).map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {responsibleUserId && responsibleUserId !== user!.id && (
                        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 p-2 rounded text-xs">
                          <strong>Retirada manual:</strong> ação será registrada no log. Justificativa obrigatória no campo Observações (mín. 5 caracteres).
                        </div>
                      )}
                      <Label htmlFor="manual_date_vehicle">Data e hora da saída (retroativa, opcional)</Label>
                      <Input
                        id="manual_date_vehicle"
                        type="datetime-local"
                        value={manualDate}
                        max={new Date().toISOString().slice(0, 16)}
                        onChange={(e) => setManualDate(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Deixe em branco para usar a data/hora atual. Fotos são opcionais no modo manual e podem vir da galeria.</p>
                    </>
                  )}
                </div>
              )}
              <div className="space-y-2">

                <Label htmlFor="destination">{isPlatform ? "Obra de Uso *" : "Obra de Destino *"}</Label>
                <ConstructionSiteAutocomplete
                  sites={constructionSites || []}
                  value={destination}
                  onChange={setDestination}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedReturnTime" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {isPlatform ? "Hora Estimada de Uso *" : "Hora Estimada de Retorno *"}
                </Label>
                <Input
                  id="estimatedReturnTime"
                  type="time"
                  value={estimatedReturnTime}
                  onChange={(e) => setEstimatedReturnTime(e.target.value)}
                  required
                />
              </div>

              {/* Outside City Toggle - irrelevant for platforms */}
              {!isPlatform && (
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
              )}
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

              {isPlatform && (
                <div className="space-y-2">
                  <Label htmlFor="charges-during-use">Carregamentos durante o uso</Label>
                  <Input
                    id="charges-during-use"
                    type="number"
                    min={0}
                    placeholder="Ex: 2"
                    value={chargesDuringUse}
                    onChange={(e) => setChargesDuringUse(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantas vezes você carregou a plataforma <strong>enquanto estava em uso</strong>. Não conte recargas feitas após o término do uso.
                  </p>
                </div>
              )}

              <VehiclePhotoCapture
                photos={photos}
                previews={previews}
                onPhotoChange={handlePhotoChange}
                includeDashboard={!isPlatform}
                vehicleType={vehicleType}
                allowGallery={isAdmin && manualMode}
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
            disabled={!selectedVehicle || !destination || !estimatedReturnTime || (isOnline && !allPhotos && !(isAdmin && manualMode)) || checkoutMutation.isPending}
            className="flex-1"
          >
            {checkoutMutation.isPending ? "Registrando..." : "Registrar Saída"}
          </Button>
        </div>
      </form>
    </div>
  );
}
