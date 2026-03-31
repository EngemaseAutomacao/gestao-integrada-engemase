import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, ArrowRightCircle, ArrowLeftCircle, List, Clock, Fuel, ArrowRight, ChevronDown, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { History } from "lucide-react";

interface VehicleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

function VehicleCard({ title, description, icon, to }: VehicleCardProps) {
  return (
    <Link to={to} className="block">
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-primary">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            {icon}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <span className="text-sm font-medium text-primary">Acessar →</span>
        </CardContent>
      </Card>
    </Link>
  );
}

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
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Car className="w-8 h-8 text-primary" />
          Controle de Veículos
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie a entrada e saída de veículos
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold">{stats?.totalVehicles || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Disponíveis</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold text-success">{stats?.available || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Em Uso</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats?.inUse || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Saídas Ativas</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats?.activeCheckouts || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* My Active Vehicles */}
      {myVehicleCheckouts && myVehicleCheckouts.length > 0 && (
        <Card 
          className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 cursor-pointer"
          onClick={() => setMyVehiclesExpanded(!myVehiclesExpanded)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center justify-between text-blue-700 dark:text-blue-400">
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
                      {checkout.destination && <span>{checkout.destination}</span>}
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
                    Devolver <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <VehicleCard
          title="Registrar Saída"
          description="Registre a saída de um veículo"
          icon={<ArrowRightCircle className="w-7 h-7 text-primary" />}
          to="/veiculos/saida"
        />
        <VehicleCard
          title="Registrar Chegada"
          description="Registre a chegada de um veículo"
          icon={<ArrowLeftCircle className="w-7 h-7 text-primary" />}
          to="/veiculos/chegada"
        />
        <VehicleCard
          title="Lista de Veículos"
          description="Veja todos os veículos cadastrados"
          icon={<List className="w-7 h-7 text-primary" />}
          to="/veiculos/lista"
        />
        <VehicleCard
          title="Combustível"
          description="Registros de abastecimento"
          icon={<Fuel className="w-7 h-7 text-primary" />}
          to="/veiculos/combustivel"
        />
        <VehicleCard
          title="Meu Histórico"
          description="Veja seu histórico de uso"
          icon={<History className="w-7 h-7 text-primary" />}
          to="/veiculos/historico"
        />
        {isAdmin && (
          <VehicleCard
            title="Analytics"
            description="Análise detalhada de veículos"
            icon={<BarChart3 className="w-7 h-7 text-primary" />}
            to="/veiculos/analytics"
          />
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
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
          id, checkout_date, checkin_date, km_checkout, km_checkin, status, destination,
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
            <p className="font-medium text-sm">{checkout.vehicles.name} - {checkout.vehicles.plate}</p>
            <p className="text-xs text-muted-foreground">
              {checkout.profiles?.full_name} • {checkout.destination || "Sem destino"}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
              checkout.status === "checked_out" 
                ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400" 
                : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400"
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
