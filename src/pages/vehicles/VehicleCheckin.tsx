import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftCircle, Car, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import VehiclePhotoCapture from "@/components/VehiclePhotoCapture";

export default function VehicleCheckin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedCheckout, setSelectedCheckout] = useState("");
  const [kmCheckin, setKmCheckin] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [photos, setPhotos] = useState<Record<string, File | null>>({ front: null, back: null, left: null, right: null });
  const [previews, setPreviews] = useState<Record<string, string | null>>({ front: null, back: null, left: null, right: null });

  const handlePhotoChange = (key: string, file: File | null, preview: string | null) => {
    setPhotos(prev => ({ ...prev, [key]: file }));
    setPreviews(prev => ({ ...prev, [key]: preview }));
  };

  const allPhotos = Object.values(photos).every(Boolean);

  const { data: activeCheckouts, isLoading } = useQuery({
    queryKey: ["active-vehicle-checkouts"],
    queryFn: async () => {
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
      return data;
    }
  });

  const uploadPhoto = async (file: File, prefix: string) => {
    const fileExt = file.name.split(".").pop();
    const filePath = `vehicles/${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error } = await supabase.storage.from("checkout-images").upload(filePath, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("checkout-images").getPublicUrl(filePath);
    return publicUrl;
  };

  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!selectedCheckout) throw new Error("Selecione um veículo");
      if (!kmCheckin) throw new Error("Informe a quilometragem de chegada");
      if (!allPhotos) throw new Error("Tire as 4 fotos do veículo");

      const checkout = activeCheckouts?.find(c => c.id === selectedCheckout);
      if (checkout && parseInt(kmCheckin) < checkout.km_checkout) {
        throw new Error("A quilometragem de chegada não pode ser menor que a de saída");
      }

      const [frontUrl, backUrl, leftUrl, rightUrl] = await Promise.all([
        uploadPhoto(photos.front!, "front_in"),
        uploadPhoto(photos.back!, "back_in"),
        uploadPhoto(photos.left!, "left_in"),
        uploadPhoto(photos.right!, "right_in"),
      ]);

      const { error } = await supabase
        .from("vehicle_checkouts")
        .update({
          status: "checked_in",
          checkin_date: new Date().toISOString(),
          km_checkin: parseInt(kmCheckin),
          checked_in_by: user.id,
          notes: notes || undefined,
          photo_front_checkin: frontUrl,
          photo_back_checkin: backUrl,
          photo_left_checkin: leftUrl,
          photo_right_checkin: rightUrl,
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ArrowLeftCircle className="w-8 h-8 text-green-600" />
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
                        <p className="text-sm font-medium">KM Saída: {checkout.km_checkout.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(checkout.checkout_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
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
                <br />
                KM de Saída: {selectedCheckoutData.km_checkout.toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="km_checkin">Quilometragem de Chegada *</Label>
                <Input
                  id="km_checkin"
                  type="number"
                  placeholder={`Mínimo: ${selectedCheckoutData.km_checkout}`}
                  value={kmCheckin}
                  onChange={(e) => setKmCheckin(e.target.value)}
                  min={selectedCheckoutData.km_checkout}
                  required
                />
                {kmCheckin && parseInt(kmCheckin) >= selectedCheckoutData.km_checkout && (
                  <p className="text-sm text-muted-foreground">
                    Distância percorrida: {(parseInt(kmCheckin) - selectedCheckoutData.km_checkout).toLocaleString()} km
                  </p>
                )}
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
            disabled={!selectedCheckout || !kmCheckin || !allPhotos || checkinMutation.isPending}
            className="flex-1"
          >
            {checkinMutation.isPending ? "Registrando..." : "Registrar Chegada"}
          </Button>
        </div>
      </form>
    </div>
  );
}
