import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeftCircle, Car, Search, Loader2, AlertTriangle, CheckCircle2, Gauge } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import VehiclePhotoCapture from "@/components/VehiclePhotoCapture";
import { Badge } from "@/components/ui/badge";

interface OdometerResult {
  checkout_km: number | null;
  checkin_km: number | null;
  distance_km: number | null;
  confidence: "high" | "medium" | "low";
  notes: string;
}

export default function VehicleCheckin() {
  const { user } = useAuth();
  const { isOnline, addPendingOperation } = useOffline();
  const { data: cachedCheckouts, saveToCache: saveCheckoutsCache } = useOfflineStorage<any[]>("active-vehicle-checkouts", []);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedCheckout, setSelectedCheckout] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refueled, setRefueled] = useState<string | null>(null);

  // Odometer estimation state
  const [odometerResult, setOdometerResult] = useState<OdometerResult | null>(null);
  const [isEstimatingKm, setIsEstimatingKm] = useState(false);
  const [manualKm, setManualKm] = useState<string>("");
  const [showManualKm, setShowManualKm] = useState(false);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<Record<string, string> | null>(null);

  const [photos, setPhotos] = useState<Record<string, File | null>>({ front: null, back: null, left: null, right: null, dashboard: null });
  const [previews, setPreviews] = useState<Record<string, string | null>>({ front: null, back: null, left: null, right: null, dashboard: null });

  const handlePhotoChange = (key: string, file: File | null, preview: string | null) => {
    setPhotos(prev => ({ ...prev, [key]: file }));
    setPreviews(prev => ({ ...prev, [key]: preview }));
    // Reset odometer result when dashboard photo changes
    if (key === "dashboard") {
      setOdometerResult(null);
      setShowManualKm(false);
      setManualKm("");
    }
  };

  const allPhotos = Object.values(photos).every(Boolean);

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
          photo_dashboard_checkout,
          vehicles!inner(id, name, plate, brand, model),
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


  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!selectedCheckout) throw new Error("Selecione um veículo");
      if (refueled === null) throw new Error("Informe se o veículo foi abastecido");

      const currentCheckoutData = activeCheckouts?.find(c => c.id === selectedCheckout);

      const updateData: any = {
        status: "checked_in",
        checkin_date: new Date().toISOString(),
        km_checkin: manualKm ? parseInt(manualKm) : (odometerResult?.checkin_km || 0),
        checked_in_by: user.id,
        notes: notes || undefined,
        refueled: refueled === "yes",
      };

      if (!isOnline) {
        const opId = crypto.randomUUID();
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

      if (!allPhotos) throw new Error("Tire todas as fotos do veículo (incluindo painel)");

      // Skip re-uploading if photos were already uploaded (retry after manual km)
      let urls = uploadedPhotoUrls;
      if (!urls) {
        const [frontUrl, backUrl, leftUrl, rightUrl, dashboardUrl] = await Promise.all([
          uploadPhoto(photos.front!, "front_in"),
          uploadPhoto(photos.back!, "back_in"),
          uploadPhoto(photos.left!, "left_in"),
          uploadPhoto(photos.right!, "right_in"),
          uploadPhoto(photos.dashboard!, "dashboard_in"),
        ]);
        urls = { front: frontUrl, back: backUrl, left: leftUrl, right: rightUrl, dashboard: dashboardUrl };
        setUploadedPhotoUrls(urls);
      }

      // Try to estimate km from dashboard photos (only on first attempt)
      if (!odometerResult && !showManualKm && currentCheckoutData?.photo_dashboard_checkout) {
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
              if (result.checkout_km && result.checkout_km > 0 && currentCheckoutData.km_checkout === 0) {
                updateData.km_checkout = result.checkout_km;
              }
            } else {
              setShowManualKm(true);
              toast.warning("Não foi possível ler o hodômetro com precisão. Informe manualmente.");
              return; // Stop - user needs to enter km manually and resubmit
            }
          }
        } catch (e) {
          setIsEstimatingKm(false);
          console.error("Odometer estimation failed:", e);
          setShowManualKm(true);
          setOdometerResult({
            checkout_km: null, checkin_km: null, distance_km: null,
            confidence: "low",
            notes: "Erro ao processar as fotos. Informe a quilometragem manualmente.",
          });
          toast.warning("Não foi possível estimar a quilometragem. Informe manualmente.");
          return; // Stop - user needs to enter km manually and resubmit
        }
      }

      // If manual km was provided, use it
      if (manualKm) {
        updateData.km_checkin = parseInt(manualKm);
      }

      const { error } = await supabase
        .from("vehicle_checkouts")
        .update({
          ...updateData,
          photo_front_checkin: urls.front,
          photo_back_checkin: urls.back,
          photo_left_checkin: urls.left,
          photo_right_checkin: urls.right,
          photo_dashboard_checkin: urls.dashboard,
        })
        .eq("id", selectedCheckout);

      if (error) throw error;

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

  const filteredCheckouts = activeCheckouts?.filter(checkout =>
    checkout.vehicles.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    checkout.vehicles.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    checkout.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkinMutation.mutate();
  };

  const selectedCheckoutData = activeCheckouts?.find(c => c.id === selectedCheckout);

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ArrowLeftCircle className="w-8 h-8 text-primary" />
          Registrar Chegada
        </h1>
        <p className="text-muted-foreground mt-1">
          Registre a chegada de um veículo
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Veículo</CardTitle>
            <CardDescription>Escolha o veículo que está retornando</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                Nenhum veículo em uso no momento
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
                    Informe a quilometragem atual mostrada no painel do veículo
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
              isEstimatingKm ||
              (showManualKm && !manualKm)
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
