import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeftCircle, Car, Search } from "lucide-react";
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

  const [photos, setPhotos] = useState<Record<string, File | null>>({ front: null, back: null, left: null, right: null, dashboard: null });
  const [previews, setPreviews] = useState<Record<string, string | null>>({ front: null, back: null, left: null, right: null, dashboard: null });

  const handlePhotoChange = (key: string, file: File | null, preview: string | null) => {
    setPhotos(prev => ({ ...prev, [key]: file }));
    setPreviews(prev => ({ ...prev, [key]: preview }));
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
    const fileExt = file.name.split(".").pop();
    const seq = String(Date.now()).slice(-6);
    const dateFolder = new Date().toISOString().slice(0, 10);
    const filePath = `veiculos/entradas/${dateFolder}/entrada_${prefix}_${seq}.${fileExt}`;
    const { error } = await supabase.storage.from("imagens").upload(filePath, file);
    if (error) throw error;
    return filePath;
  };

  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!selectedCheckout) throw new Error("Selecione um veículo");
      if (refueled === null) throw new Error("Informe se o veículo foi abastecido");

      const updateData = {
        status: "checked_in",
        checkin_date: new Date().toISOString(),
        km_checkin: 0,
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
        // Update the operation ID to match
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

      const [frontUrl, backUrl, leftUrl, rightUrl, dashboardUrl] = await Promise.all([
        uploadPhoto(photos.front!, "front_in"),
        uploadPhoto(photos.back!, "back_in"),
        uploadPhoto(photos.left!, "left_in"),
        uploadPhoto(photos.right!, "right_in"),
        uploadPhoto(photos.dashboard!, "dashboard_in"),
      ]);

      const { error } = await supabase
        .from("vehicle_checkouts")
        .update({
          ...updateData,
          photo_front_checkin: frontUrl,
          photo_back_checkin: backUrl,
          photo_left_checkin: leftUrl,
          photo_right_checkin: rightUrl,
          photo_dashboard_checkin: dashboardUrl,
        })
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
            disabled={!selectedCheckout || (isOnline && !allPhotos) || refueled === null || checkinMutation.isPending}
            className="flex-1"
          >
            {checkinMutation.isPending ? "Registrando..." : "Registrar Chegada"}
          </Button>
        </div>
      </form>
    </div>
  );
}
