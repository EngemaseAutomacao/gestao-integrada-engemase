import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, ArrowRightCircle, ArrowLeftCircle, List, Clock, Fuel, ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
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
  const isAdmin = profile?.role === "admin";
  const [myVehiclesExpanded, setMyVehiclesExpanded] = useState(true);
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

  // Fetch user's active vehicle checkouts
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

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 sm:gap-6">
      <div className="shrink-0">
        <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
          <Car className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          Controle de Veículos
        </h1>
        <p className="text-xs sm:text-base text-muted-foreground mt-1">
          Gerencie a entrada e saída de veículos
        </p>
      </div>

      {/* Stats Cards */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Veículos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVehicles || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.available || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.inUse || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saídas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.activeCheckouts || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightCircle className="w-5 h-5 text-orange-600" />
              Registrar Saída
            </CardTitle>
            <CardDescription>
              Registre a saída de um veículo com fotos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/veiculos/saida">Registrar Saída</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftCircle className="w-5 h-5 text-green-600" />
              Registrar Chegada
            </CardTitle>
            <CardDescription>
              Registre a chegada de um veículo com fotos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/veiculos/chegada">Registrar Chegada</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="w-5 h-5 text-blue-600" />
              Lista de Veículos
            </CardTitle>
            <CardDescription>
              Veja todos os veículos cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full">
              <Link to="/veiculos/lista">Ver Veículos</Link>
            </Button>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-600" />
                Combustível
              </CardTitle>
              <CardDescription>
                Registros de abastecimento dos veículos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link to="/veiculos/combustivel">Ver Registros</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          <RecentVehicleActivity />
        </CardContent>
      </Card>
    </div>
  );
}

function RecentVehicleActivity() {
  const { data: recentCheckouts, isLoading } = useQuery({
    queryKey: ["recent-vehicle-checkouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_checkouts")
        .select(`
          id,
          checkout_date,
          checkin_date,
          km_checkout,
          km_checkin,
          status,
          destination,
          vehicles!inner(name, plate),
          profiles!vehicle_checkouts_user_id_fkey(full_name)
        `)
        .order("checkout_date", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <p className="text-muted-foreground text-center py-4">Carregando...</p>;
  }

  if (!recentCheckouts || recentCheckouts.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Nenhuma atividade recente</p>;
  }

  return (
    <div className="space-y-3">
      {recentCheckouts.map((checkout: any) => (
        <div key={checkout.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="font-medium">{checkout.vehicles.name} - {checkout.vehicles.plate}</p>
            <p className="text-sm text-muted-foreground">
              {checkout.profiles?.full_name} • {checkout.destination || "Sem destino"}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              checkout.status === "checked_out" 
                ? "bg-orange-100 text-orange-800" 
                : "bg-green-100 text-green-800"
            }`}>
              {checkout.status === "checked_out" ? "Em uso" : "Devolvido"}
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(checkout.checkout_date).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
