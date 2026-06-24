import { useState } from "react";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleHero } from "@/components/ModuleHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeftCircle, Car, Search, Loader2, AlertTriangle, CheckCircle2, Gauge } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadFileImage } from "@/lib/storageUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import VehiclePhotoCapture, { getRequiredPhotoKeys } from "@/components/VehiclePhotoCapture";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface OdometerResult {
  checkout_km: number | null;
  checkin_km: number | null;
  distance_km: number | null;
  confidence: "high" | "medium" | "low";
  notes: string;
}

export default function VehicleCheckin() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const { isOnline, addPendingOperation } = useOffline();
  const { data: cachedCheckouts, saveToCache: saveCheckoutsCache } = useOfflineStorage<any[]>("active-vehicle-checkouts", []);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedCheckout, setSelectedCheckout] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refueled, setRefueled] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualDate, setManualDate] = useState<string>("");

  // Odometer estimation state
  const [odometerResult, setOdometerResult] = useState<OdometerResult | null>(null);
  const [isEstimatingKm, setIsEstimatingKm] = useState(false);
  const [manualKm, setManualKm] = useState<string>("");
  const [showManualKm, setShowManualKm] = useState(false);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<Record<string, string> | null>(null);

  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [previews, setPreviews] = useState<Record<string, string | null>>({});
  const [chargesDuringUse, setChargesDuringUse] = useState<string>("");

  const hasUnsavedData = !!(selectedCheckout || notes || Object.values(photos).some(Boolean));
  useUnsavedChanges(hasUnsavedData);

  const handlePhotoChange = (key: string, file: File | null, preview: string | null) => {
    setPhotos(prev => ({ ...prev, [key]: file }));
    setPreviews(prev => ({ ...prev, [key]: preview }));
    if (key === "dashboard") {
      setOdometerResult(null);
      setShowManualKm(false);
      setManualKm("");
    }
  };

  const { data: activeCheckouts, isLoading } = useQuery({
    queryKey: ["active-vehicle-checkouts"],
    queryFn: async () => {
      if (!isOnline) {
        if (cachedCheckouts && cachedCheckouts.length > 0) {
          toast.info("Modo offline - usando dados em cache");
          return cachedCheckouts;
        }
        return [];
      }
      const { data, error } = await supabase
        .from("vehicle_checkouts")
        .select(`
          id,
          checkout_date,
          km_checkout,
          destination,
          user_id,
          photo_dashboard_checkout,
          vehicles!inner(id, name, plate, brand, model, vehicle_type),
          profiles!vehicle_checkouts_user_id_fkey(full_name)
        `)
        .eq("status", "checked_out")
        .order("checkout_date", { ascending: false });


      if (error) throw error;
      if (data) saveCheckoutsCache(data);
      return data;
    }
  });

  const uploadPhoto = async (file: File, prefix: string) => {
    return uploadFileImage(file, prefix, "veiculos", "entradas");
  };

  const selectedCheckoutData = activeCheckouts?.find((c: any) => c.id === selectedCheckout);
  const vehicleType: "vehicle" | "platform" = (selectedCheckoutData?.vehicles?.vehicle_type as any) || "vehicle";
  const isPlatform = vehicleType === "platform";
  const requiredPhotoKeys = getRequiredPhotoKeys(vehicleType, true);
  const allPhotos = requiredPhotoKeys.every((k) => !!photos[k]);

  const photoColumnMap: Record<string, string> = {
    front: "photo_front_checkin",
    back: "photo_back_checkin",
    left: "photo_left_checkin",
    right: "photo_right_checkin",
    dashboard: "photo_dashboard_checkin",
    control: "photo_control_checkin",
    wheel_fl: "photo_wheel_fl_checkin",
    wheel_fr: "photo_wheel_fr_checkin",
    wheel_rl: "photo_wheel_rl_checkin",
    wheel_rr: "photo_wheel_rr_checkin",
  };


  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!selectedCheckout) throw new Error("Selecione um veículo");
      if (!isPlatform && refueled === null) throw new Error("Informe se o veículo foi abastecido");

      const currentCheckoutData = activeCheckouts?.find((c: any) => c.id === selectedCheckout);
      const isAdminActingForOther = !!(isAdmin && currentCheckoutData?.user_id && currentCheckoutData.user_id !== user.id);
      if (isAdminActingForOther && (!notes || notes.trim().length < 5)) {
        throw new Error("Justificativa obrigatória (mín. 5 caracteres) ao devolver veículo em nome de outro usuário.");
      }

      const updateData: any = {
        status: "checked_in",
        checkin_date: (isAdmin && manualMode && manualDate ? new Date(manualDate) : new Date()).toISOString(),
        checked_in_by: user.id,
        notes: notes || undefined,
        km_checkin_automatic: false,
      };



      if (isPlatform) {
        if (chargesDuringUse.trim()) {
          updateData.charges_during_use = parseInt(chargesDuringUse) || 0;
        }
      } else {
        const km_checkout = currentCheckoutData?.km_checkout || 0;
        let checkin_km = manualKm ? parseInt(manualKm) : (odometerResult?.checkin_km || 0);
        
        // If manual and no value provided, use checkout km as placeholder
        if (showManualKm && !manualKm) {
          checkin_km = km_checkout;
        }

        // Only validate if not manual (AI result should be valid)
        // If manual, we allow it to be the same as checkout if they don't know it yet
        if (!showManualKm && checkin_km <= km_checkout && checkin_km !== 0) {
          throw new Error(`O KM de chegada (${checkin_km}) deve ser maior que o KM de saída (${km_checkout}).`);
        }

        updateData.km_checkin = checkin_km;
        updateData.refueled = refueled === "yes";
        updateData.km_checkin_automatic = !!(odometerResult && !showManualKm);
      }

      if (!isOnline) {
        const opId = crypto.randomUUID();
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
        addPendingOperation("vehicle_checkin", {
          checkoutId: selectedCheckout,
          updates: updateData,
        });
        const ops = JSON.parse(localStorage.getItem("engemase_pending_operations") || "[]");
        if (ops.length > 0) {
          ops[ops.length - 1].id = opId;
          localStorage.setItem("engemase_pending_operations", JSON.stringify(ops));
        }
        const photoMsg = photosSaved > 0 ? ` ${photosSaved} foto(s) salva(s) localmente.` : " Fotos não foram salvas.";
        toast.success(`Chegada registrada (offline)!${photoMsg} Será sincronizada quando conectar.`);
        navigate("/veiculos");
        return;
      }

      const photosOptional = isAdmin && manualMode;
      if (!photosOptional && !allPhotos) {
        throw new Error(isPlatform
          ? "Tire todas as fotos da plataforma (4 lados + controle + 4 rodas)"
          : "Tire todas as fotos do veículo (incluindo painel)");
      }

      // Upload provided photos in parallel (skip if already uploaded - retry after manual km)
      let urls = uploadedPhotoUrls;
      if (!urls) {
        const keysToUpload = requiredPhotoKeys.filter((key) => !!photos[key]);
        const uploadResults = await Promise.all(
          keysToUpload.map(async (key) => {
            const url = await uploadPhoto(photos[key]!, `${key}_in`);
            return { key, url };
          })
        );
        urls = {};
        for (const { key, url } of uploadResults) {
          urls[key] = url;
        }
        setUploadedPhotoUrls(urls);
      }

      // Try to estimate km from dashboard photos (only for vehicles, not platforms)
      if (!isPlatform && !odometerResult && !showManualKm && currentCheckoutData?.photo_dashboard_checkout && urls.dashboard) {
        setIsEstimatingKm(true);
        try {
          const { data: odometerData, error: odometerError } = await supabase.functions.invoke("read-odometer", {
            body: {
              checkout_photo_path: currentCheckoutData.photo_dashboard_checkout,
              checkin_photo_path: urls.dashboard,
            },
          });

          setIsEstimatingKm(false);

          if (!odometerError && odometerData) {
            const result = odometerData as OdometerResult;
            setOdometerResult(result);

            if (result.distance_km !== null && result.confidence !== "low") {
              updateData.km_checkin = result.checkin_km || 0;
              updateData.km_checkin_automatic = true;
              if (result.checkout_km && result.checkout_km > 0 && currentCheckoutData.km_checkout === 0) {
                updateData.km_checkout = result.checkout_km;
              }
            } else {
              setShowManualKm(true);
              throw new Error("Não foi possível ler o hodômetro com precisão. Informe a quilometragem manualmente abaixo e clique em 'Registrar Chegada' novamente.");
            }
          }
        } catch (e: any) {
          setIsEstimatingKm(false);
          // If it's our controlled abort, rethrow so onError shows the message and DB stays untouched
          if (e?.message?.includes("hodômetro")) throw e;
          console.error("Odometer estimation failed:", e);
          setShowManualKm(true);
          setOdometerResult({
            checkout_km: null, checkin_km: null, distance_km: null,
            confidence: "low",
            notes: "Erro ao processar as fotos. Informe a quilometragem manualmente abaixo e clique em 'Registrar Chegada' novamente.",
          });
          throw new Error("Não foi possível estimar a quilometragem automaticamente. Informe manualmente abaixo e tente novamente.");
        }
      }

      if (!isPlatform && manualKm) {
        updateData.km_checkin = parseInt(manualKm);
        updateData.km_checkin_automatic = false;
      }

      // Apply photo URLs to update payload
      const finalUpdate: any = { ...updateData };
      for (const key of requiredPhotoKeys) {
        const col = photoColumnMap[key];
        if (col && urls[key]) finalUpdate[col] = urls[key];
      }

      const { error } = await supabase
        .from("vehicle_checkouts")
        .update(finalUpdate)
        .eq("id", selectedCheckout);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chegada registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["active-vehicle-checkouts"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-vehicle-checkouts"] });
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });
      navigate("/veiculos");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao registrar chegada");
    }
  });

  const baseCheckouts = isAdmin && !manualMode
    ? activeCheckouts?.filter((c: any) => c.user_id === user?.id)
    : activeCheckouts;
  const filteredCheckouts = baseCheckouts?.filter((checkout: any) =>
    checkout.vehicles.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    checkout.vehicles.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    checkout.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCheckoutDataForUI = activeCheckouts?.find((c: any) => c.id === selectedCheckout);
  const isAdminActingForOtherUI = !!(isAdmin && user && selectedCheckoutDataForUI?.user_id && selectedCheckoutDataForUI.user_id !== user.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminActingForOtherUI) {
      const confirmed = window.confirm(
        `Confirmar devolução do veículo "${selectedCheckoutDataForUI?.vehicles?.name}" em nome de ${selectedCheckoutDataForUI?.profiles?.full_name || "outro usuário"}?`
      );
      if (!confirmed) return;
    }
    checkinMutation.mutate();
  };


  // selectedCheckoutData defined above

  const confidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="w-3 h-3" />Alta precisão</Badge>;
      case "medium":
        return <Badge variant="secondary" className="gap-1"><AlertTriangle className="w-3 h-3" />Precisão média</Badge>;
      default:
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Baixa precisão</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <ModuleHero
        narrow
        eyebrow="Módulo · Veículos"
        title="Registrar Chegada"
        subtitle="Registre a chegada de um veículo"
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
        {/* Vehicle Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Veículo</CardTitle>
            <CardDescription>Escolha o veículo que está retornando</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdmin && (
              <div className="space-y-2 p-2 border rounded-md bg-muted/30">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="manual_mode_vehicle_checkin" className="cursor-pointer text-sm">
                    Devolução manual (em nome de outro)
                  </Label>
                  <Switch
                    id="manual_mode_vehicle_checkin"
                    checked={manualMode}
                    onCheckedChange={(v) => {
                      setManualMode(v);
                      setSelectedCheckout("");
                      if (!v) setManualDate("");
                    }}
                  />
                </div>
                {manualMode && (
                  <>
                    <Label htmlFor="manual_date_vehicle_checkin">Data e hora da chegada (retroativa, opcional)</Label>
                    <Input
                      id="manual_date_vehicle_checkin"
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por veículo, placa ou motorista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>


            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Carregando veículos...</p>
            ) : filteredCheckouts && filteredCheckouts.length > 0 ? (
              <div className="space-y-3">
                {filteredCheckouts.map((checkout: any) => (
                  <div
                    key={checkout.id}
                    onClick={() => setSelectedCheckout(checkout.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedCheckout === checkout.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Car className="w-8 h-8 text-orange-600" />
                        <div>
                          <p className="font-medium">{checkout.vehicles.name}</p>
                          <p className="text-sm text-muted-foreground">{checkout.vehicles.plate}</p>
                          <p className="text-xs text-muted-foreground">
                            Motorista: {checkout.profiles?.full_name || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Saída: {format(new Date(checkout.checkout_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                        {checkout.destination && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Destino: {checkout.destination}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                {isAdmin && !manualMode
                  ? "Você não possui veículos em uso. Ative \"Devolução manual\" para devolver em nome de outro usuário."
                  : "Nenhum veículo em uso no momento"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Checkin Details */}
        {selectedCheckout && selectedCheckoutData && (
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Chegada</CardTitle>
              <CardDescription>
                Veículo: {selectedCheckoutData.vehicles.name} ({selectedCheckoutData.vehicles.plate})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAdminActingForOtherUI && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 p-3 rounded-lg text-sm">
                  <strong>Devolução manual:</strong> você está devolvendo em nome de <strong>{selectedCheckoutDataForUI?.profiles?.full_name}</strong>. Justificativa obrigatória nas observações (mín. 5 caracteres).
                </div>
              )}
              <div className="space-y-3">

                <Label className="text-base font-semibold">O veículo foi abastecido? *</Label>
                <RadioGroup value={refueled || ""} onValueChange={setRefueled} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="refueled-yes" />
                    <Label htmlFor="refueled-yes" className="cursor-pointer">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="refueled-no" />
                    <Label htmlFor="refueled-no" className="cursor-pointer">Não</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações sobre a viagem, condição do veículo..."
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
                vehicleType={vehicleType}
              />

              {/* Odometer estimation result */}
              {isEstimatingKm && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="py-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <div>
                      <p className="font-medium text-sm">Analisando fotos do painel...</p>
                      <p className="text-xs text-muted-foreground">A IA está lendo o hodômetro para estimar a quilometragem percorrida</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {odometerResult && !isEstimatingKm && (
                <Card className="border-primary/30">
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-5 h-5 text-primary" />
                        <p className="font-semibold text-sm">Estimativa de Quilometragem</p>
                      </div>
                      {confidenceBadge(odometerResult.confidence)}
                    </div>

                    {odometerResult.distance_km !== null && odometerResult.confidence !== "low" && (
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-lg bg-muted p-2">
                          <p className="text-xs text-muted-foreground">Saída</p>
                          <p className="font-bold text-sm">{odometerResult.checkout_km?.toLocaleString("pt-BR") ?? "—"} km</p>
                        </div>
                        <div className="rounded-lg bg-muted p-2">
                          <p className="text-xs text-muted-foreground">Chegada</p>
                          <p className="font-bold text-sm">{odometerResult.checkin_km?.toLocaleString("pt-BR") ?? "—"} km</p>
                        </div>
                        <div className="rounded-lg bg-primary/10 p-2">
                          <p className="text-xs text-muted-foreground">Percorrido</p>
                          <p className="font-bold text-sm text-primary">~{odometerResult.distance_km?.toLocaleString("pt-BR")} km</p>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">{odometerResult.notes}</p>

                    {odometerResult.confidence !== "low" && !showManualKm && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowManualKm(true)}
                        className="text-xs"
                      >
                        Corrigir manualmente
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {showManualKm && (
                <div className="space-y-2">
                  <Label htmlFor="manualKm" className="flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    Quilometragem atual (km) *
                  </Label>
                  <Input
                    id="manualKm"
                    type="number"
                    placeholder="Ex: 45230"
                    value={manualKm}
                    onChange={(e) => setManualKm(e.target.value)}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Informe a quilometragem atual mostrada no painel. Se não souber agora, pode deixar em branco e o sistema usará o KM de saída.
                  </p>
                </div>
              )}
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
            disabled={
              !selectedCheckout || 
              (isOnline && !allPhotos) || 
              refueled === null || 
              checkinMutation.isPending ||
              isEstimatingKm
            }
            className="flex-1"
          >
            {checkinMutation.isPending ? "Registrando..." : "Registrar Chegada"}
          </Button>
        </div>
      </form>
    </div>
  );
}
