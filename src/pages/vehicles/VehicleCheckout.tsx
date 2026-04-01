import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightCircle, Car, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import VehiclePhotoCapture from "@/components/VehiclePhotoCapture";

export default function VehicleCheckout() {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const { data: cachedVehicles, saveToCache: saveVehiclesCache } = useOfflineStorage<any[]>("available-vehicles", []);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [destination, setDestination] = useState("");
  const [customDestination, setCustomDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [photos, setPhotos] = useState<Record<string, File | null>>({ front: null, back: null, left: null, right: null, dashboard: null });
  const [previews, setPreviews] = useState<Record<string, string | null>>({ front: null, back: null, left: null, right: null, dashboard: null });

  const handlePhotoChange = (key: string, file: File | null, preview: string | null) => {
    setPhotos(prev => ({ ...prev, [key]: file }));
    setPreviews(prev => ({ ...prev, [key]: preview }));
  };

  const allPhotos = Object.values(photos).every(Boolean);

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
        .order("name");
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
      if (!allPhotos) throw new Error("Tire todas as fotos do veículo (incluindo painel)");

      const [frontUrl, backUrl, leftUrl, rightUrl, dashboardUrl] = await Promise.all([
        uploadPhoto(photos.front!, "front_out"),
        uploadPhoto(photos.back!, "back_out"),
        uploadPhoto(photos.left!, "left_out"),
        uploadPhoto(photos.right!, "right_out"),
        uploadPhoto(photos.dashboard!, "dashboard_out"),
      ]);

      const { error } = await supabase.from("vehicle_checkouts").insert({
        vehicle_id: selectedVehicle,
        user_id: user.id,
        checked_out_by: user.id,
        km_checkout: 0,
        destination,
        notes,
        status: "checked_out",
        photo_front_checkout: frontUrl,
        photo_back_checkout: backUrl,
        photo_left_checkout: leftUrl,
        photo_right_checkout: rightUrl,
        photo_dashboard_checkout: dashboardUrl,
      });

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
                <Label htmlFor="destination">Obra de Destino</Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a obra de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {constructionSites?.map((site) => (
                      <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">Outra (digitar)</SelectItem>
                  </SelectContent>
                </Select>
                {destination === "__custom__" && (
                  <Input
                    placeholder="Digite o destino..."
                    value={customDestination}
                    onChange={(e) => setCustomDestination(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>

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
            disabled={!selectedVehicle || !allPhotos || checkoutMutation.isPending}
            className="flex-1"
          >
            {checkoutMutation.isPending ? "Registrando..." : "Registrar Saída"}
          </Button>
        </div>
      </form>
    </div>
  );
}
