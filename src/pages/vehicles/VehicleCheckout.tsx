import { useState } from "react";
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
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function VehicleCheckout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [kmCheckout, setKmCheckout] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: availableVehicles, isLoading } = useQuery({
    queryKey: ["available-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("status", "available")
        .order("name");

      if (error) throw error;
      return data;
    }
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!selectedVehicle) throw new Error("Selecione um veículo");
      if (!kmCheckout) throw new Error("Informe a quilometragem de saída");

      const { error } = await supabase.from("vehicle_checkouts").insert({
        vehicle_id: selectedVehicle,
        user_id: user.id,
        checked_out_by: user.id,
        km_checkout: parseInt(kmCheckout),
        destination,
        purpose,
        notes,
        status: "checked_out"
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ArrowRightCircle className="w-8 h-8 text-orange-600" />
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
                <Label htmlFor="km_checkout">Quilometragem de Saída *</Label>
                <Input
                  id="km_checkout"
                  type="number"
                  placeholder="Ex: 45000"
                  value={kmCheckout}
                  onChange={(e) => setKmCheckout(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destino</Label>
                <Input
                  id="destination"
                  placeholder="Ex: Obra Centro, Cliente ABC"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Motivo/Finalidade</Label>
                <Input
                  id="purpose"
                  placeholder="Ex: Visita técnica, Entrega de material"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
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
            disabled={!selectedVehicle || !kmCheckout || checkoutMutation.isPending}
            className="flex-1"
          >
            {checkoutMutation.isPending ? "Registrando..." : "Registrar Saída"}
          </Button>
        </div>
      </form>
    </div>
  );
}
