import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Car, History, Calendar, User, MapPin, Clock, AlertCircle, CheckCircle, Fuel } from "lucide-react";
import { ModuleHero } from "@/components/ModuleHero";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";

interface Vehicle {
  id: string;
  name: string;
  plate: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  year: number | null;
  status: string | null;
  image_url: string | null;
}

interface CheckoutRecord {
  id: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string | null;
  destination: string | null;
  km_checkout: number;
  km_checkin: number | null;
  notes: string | null;
  user_profile: {
    full_name: string;
    email: string;
  };
}

interface VehicleIssue {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  photo_url: string | null;
  reporter: {
    full_name: string;
  } | null;
}

interface FuelRecord {
  id: string;
  refuel_date: string;
  liters: number;
  fuel_type: string;
  km_at_refuel: number;
  total_cost: number | null;
  gas_station: string | null;
}

const severityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading: loading } = useQuery({
    queryKey: ["vehicle-detail", id],
    queryFn: async () => {
      const [vehicleRes, checkoutsRes, issuesRes, fuelRes] = await Promise.all([
        supabase.from("vehicles").select("*").eq("id", id!).maybeSingle(),
        supabase
          .from("vehicle_checkouts")
          .select(`id, checkout_date, checkin_date, status, destination, km_checkout, km_checkin, notes, user_profile:profiles!vehicle_checkouts_user_id_fkey(full_name, email)`)
          .eq("vehicle_id", id!)
          .order("checkout_date", { ascending: false }),
        supabase
          .from("vehicle_issues")
          .select(`*, reporter:profiles!vehicle_issues_reported_by_fkey(full_name)`)
          .eq("vehicle_id", id!)
          .order("created_at", { ascending: false }),
        supabase
          .from("fuel_records")
          .select("id, refuel_date, liters, fuel_type, km_at_refuel, total_cost, gas_station")
          .eq("vehicle_id", id!)
          .order("refuel_date", { ascending: false }),
      ]);

      if (vehicleRes.error) throw vehicleRes.error;
      return {
        vehicle: vehicleRes.data as Vehicle | null,
        checkouts: ((checkoutsRes.data as any) || []) as CheckoutRecord[],
        issues: ((issuesRes.data as any) || []) as VehicleIssue[],
        fuelRecords: (fuelRes.data || []) as FuelRecord[],
      };
    },
    enabled: !!id,
    meta: { errorMessage: "Erro ao carregar dados" },
  });

  const vehicle = data?.vehicle ?? null;
  const checkouts = data?.checkouts ?? [];
  const issues = data?.issues ?? [];
  const fuelRecords = data?.fuelRecords ?? [];

  const getDaysUsed = (checkout: CheckoutRecord) => {
    const start = new Date(checkout.checkout_date);
    const end = checkout.checkin_date ? new Date(checkout.checkin_date) : new Date();
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  if (loading || !vehicle) {
    return (
      <div className="flex items-center justify-center h-full">
        <Car className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  const isAvailable = vehicle.status === "available";

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <h2 className="text-xl md:text-3xl font-bold tracking-tight truncate">{vehicle.name}</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Detalhes e histórico completo</p>
        </div>
      </div>

      {/* Vehicle Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Informações do Veículo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div>
              <p className="text-xs md:text-sm font-medium">Placa</p>
              <Badge variant="secondary" className="text-sm mt-1">{vehicle.plate}</Badge>
            </div>
            {vehicle.brand && (
              <div>
                <p className="text-xs md:text-sm font-medium">Marca</p>
                <p className="text-sm text-muted-foreground">{vehicle.brand}</p>
              </div>
            )}
            {vehicle.model && (
              <div>
                <p className="text-xs md:text-sm font-medium">Modelo</p>
                <p className="text-sm text-muted-foreground">{vehicle.model}</p>
              </div>
            )}
            {vehicle.color && (
              <div>
                <p className="text-xs md:text-sm font-medium">Cor</p>
                <p className="text-sm text-muted-foreground">{vehicle.color}</p>
              </div>
            )}
            {vehicle.year && (
              <div>
                <p className="text-xs md:text-sm font-medium">Ano</p>
                <p className="text-sm text-muted-foreground">{vehicle.year}</p>
              </div>
            )}
            <div>
              <p className="text-xs md:text-sm font-medium">Status</p>
              <Badge className={isAvailable ? "bg-green-500" : "bg-yellow-500"}>
                {isAvailable ? "Disponível" : "Em uso"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checkout History */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <History className="w-4 h-4 md:w-5 md:h-5" />
            Histórico de Uso
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {checkouts.length} registros de uso
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {checkouts.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">Nenhum uso registrado</p>
          ) : (
            <div className="space-y-3">
              {checkouts.map((checkout) => (
                <Card key={checkout.id}>
                  <CardContent className="p-3 md:p-4">
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm md:text-base truncate">{checkout.user_profile?.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{checkout.user_profile?.email}</p>
                        </div>
                        <Badge variant={checkout.status === "checked_out" ? "default" : "secondary"} className="text-xs">
                          {checkout.status === "checked_out" ? "Em Uso" : "Devolvido"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-muted-foreground">Saída</p>
                            <p>{format(new Date(checkout.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                          </div>
                        </div>
                        {checkout.checkin_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-muted-foreground">Devolução</p>
                              <p>{format(new Date(checkout.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                        {checkout.destination && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{checkout.destination}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{getDaysUsed(checkout)} dias</span>
                        </div>
                        <span className="text-muted-foreground">KM: {checkout.km_checkout}{checkout.km_checkin ? ` → ${checkout.km_checkin}` : ""}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Issues */}
      <Card>
        <CardHeader className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
              Problemas Reportados
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              {issues.length} problemas registrados
            </CardDescription>
          </div>
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link to={`/veiculos/report-issue?vehicleId=${id}`}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Reportar Problema
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {issues.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">Nenhum problema reportado</p>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <Card key={issue.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-3 md:p-4">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {issue.status === "resolved" || issue.status === "closed" ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                          )}
                          <h4 className="font-semibold text-sm truncate">{issue.title}</h4>
                        </div>
                        <Badge className="shrink-0 text-xs" variant={
                          issue.severity === "critical" || issue.severity === "high" ? "destructive" : "secondary"
                        }>
                          {severityLabels[issue.severity] || issue.severity}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground whitespace-pre-wrap">{issue.description}</p>
                      {issue.photo_url && (
                        <div className="mt-2">
                          <img 
                            src={supabase.storage.from("imagens").getPublicUrl(issue.photo_url).data.publicUrl} 
                            alt="Foto do problema" 
                            className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-md cursor-pointer hover:opacity-90"
                            onClick={() => window.open(supabase.storage.from("imagens").getPublicUrl(issue.photo_url!).data.publicUrl, "_blank")}
                          />
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>{issue.reporter?.full_name}</span>
                        </div>
                        <span>{format(new Date(issue.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                        <Badge variant="outline" className="text-xs">
                          {statusLabels[issue.status] || issue.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
