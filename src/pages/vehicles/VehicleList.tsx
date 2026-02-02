import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Car, Search, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

export default function VehicleList() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const isAdmin = profile?.role === "admin";

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    }
  });

  const filteredVehicles = vehicles?.filter(vehicle =>
    vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800">Disponível</Badge>;
      case "in_use":
        return <Badge className="bg-orange-100 text-orange-800">Em Uso</Badge>;
      case "maintenance":
        return <Badge className="bg-red-100 text-red-800">Manutenção</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Car className="w-8 h-8 text-primary" />
            Lista de Veículos
          </h1>
          <p className="text-muted-foreground mt-1">
            Todos os veículos cadastrados no sistema
          </p>
        </div>
        {isAdmin && (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Veículo
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, placa, marca ou modelo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Vehicle Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <Car className="w-12 h-12 text-muted-foreground animate-pulse mx-auto" />
          <p className="text-muted-foreground mt-2">Carregando veículos...</p>
        </div>
      ) : filteredVehicles && filteredVehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {vehicle.image_url ? (
                      <img 
                        src={vehicle.image_url} 
                        alt={vehicle.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Car className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                      <CardDescription className="font-mono">{vehicle.plate}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(vehicle.status || "available")}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {vehicle.brand && vehicle.model && (
                    <p>{vehicle.brand} {vehicle.model}</p>
                  )}
                  {vehicle.year && <p>Ano: {vehicle.year}</p>}
                  {vehicle.color && <p>Cor: {vehicle.color}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "Nenhum veículo encontrado" : "Nenhum veículo cadastrado"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
