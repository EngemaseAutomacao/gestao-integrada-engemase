import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Car, ArrowRight, ChevronDown, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function VehicleDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [myVehiclesExpanded, setMyVehiclesExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["vehicle-stats"],
    queryFn: async () => {
      const [vehiclesRes, checkoutsRes] = await Promise.all([
        supabase.from("vehicles").select("id, status"),
        supabase.from("vehicle_checkouts").select("id, status").eq("status", "checked_out")
      ]);
      const vehicles = vehiclesRes.data || [];
      const activeCheckouts = checkoutsRes.data || [];
      return {
        totalVehicles: vehicles.length,
        available: vehicles.filter(v => v.status === "available").length,
        inUse: vehicles.filter(v => v.status === "in_use").length,
        activeCheckouts: activeCheckouts.length
      };
    }
  });

  const { data: myVehicleCheckouts } = useQuery({
    queryKey: ["my-vehicle-checkouts", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("vehicle_checkouts")
        .select(`id, vehicle_id, checkout_date, destination, km_checkout, vehicles!inner(name, plate)`)
        .eq("user_id", profile.id)
        .eq("status", "checked_out")
        .order("checkout_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles-list-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    }
  });

  const filteredVehicles = (vehicles || []).filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const myActiveVehicleIds = new Set(
    (myVehicleCheckouts || []).map((c: any) => c.vehicle_id)
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 space-y-3 sm:space-y-4 pb-3 sm:pb-4">
        <div className="hidden sm:block">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Car className="w-8 h-8 text-primary" />
            Controle de Veículos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a entrada e saída de veículos
          </p>
        </div>

        {/* My Active Vehicles */}
        {myVehicleCheckouts && myVehicleCheckouts.length > 0 && (
          <Card 
            className="border-primary/50 bg-primary/5 cursor-pointer"
            onClick={() => setMyVehiclesExpanded(!myVehiclesExpanded)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center justify-between text-primary">
                <span className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Meus Veículos em Uso ({myVehicleCheckouts.length})
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${myVehiclesExpanded ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {myVehiclesExpanded && (
              <CardContent className="space-y-2 max-h-[250px] overflow-y-auto pt-0" onClick={(e) => e.stopPropagation()}>
                {myVehicleCheckouts.map((checkout: any) => (
                  <div key={checkout.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-background/80">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {checkout.vehicles?.name} - {checkout.vehicles?.plate}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>KM: {checkout.km_checkout}</span>
                        <span>Saída: {format(new Date(checkout.checkout_date), "dd/MM HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs gap-1 shrink-0"
                      onClick={() => navigate(`/veiculos/chegada`)}
                    >
                      Devolução <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold text-success">{stats?.available || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">{stats?.totalVehicles || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Em Uso</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold text-warning">{stats?.inUse || 0}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Vehicle List - same pattern as tools Dashboard */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Veículos</CardTitle>
          <CardDescription>Lista de veículos disponíveis</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar veículo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : filteredVehicles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum veículo encontrado
              </p>
            ) : (
              filteredVehicles.map((vehicle) => {
                const userHasVehicle = myActiveVehicleIds.has(vehicle.id);
                const isAvailable = vehicle.status === "available";
                return (
                  <Card key={vehicle.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate(`/veiculos/${vehicle.id}`)}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm sm:text-base">{vehicle.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {vehicle.plate}
                            </Badge>
                            <span className={`text-xs font-medium ${isAvailable ? "text-success" : "text-warning"}`}>
                              {isAvailable ? "Disponível" : "Em uso"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                            {vehicle.brand && <span>{vehicle.brand}</span>}
                            {vehicle.model && <span>• {vehicle.model}</span>}
                            {vehicle.color && <span>• {vehicle.color}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {isAvailable && (
                            <Button
                              size="sm"
                              className="text-xs gap-1"
                              onClick={(e) => { e.stopPropagation(); navigate("/veiculos/saida"); }}
                            >
                              Registrar Saída
                            </Button>
                          )}
                          {userHasVehicle && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1"
                              onClick={(e) => { e.stopPropagation(); navigate("/veiculos/chegada"); }}
                            >
                              Registrar Devolução
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}