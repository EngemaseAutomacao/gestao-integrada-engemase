import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, Car, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface KPIData {
  toolsInUse: number;
  vehiclesOut: number;
  openToolIssues: number;
  openVehicleIssues: number;
  pendingUsers: number;
  pendingTransfers: number;
}

const EMPTY: KPIData = {
  toolsInUse: 0,
  vehiclesOut: 0,
  openToolIssues: 0,
  openVehicleIssues: 0,
  pendingUsers: 0,
  pendingTransfers: 0,
};

async function fetchKPIs(): Promise<KPIData> {
  const [
    toolCheckouts,
    vehicleCheckouts,
    toolIssues,
    vehicleIssues,
    pendingUsers,
    pendingTransfers,
  ] = await Promise.all([
    supabase.from("tool_checkouts").select("id", { count: "exact", head: true }).eq("status", "checked_out"),
    supabase.from("vehicle_checkouts").select("id", { count: "exact", head: true }).eq("status", "checked_out"),
    supabase.from("tool_issues").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    supabase.from("vehicle_issues").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("approved", false),
    supabase.from("asset_transfers").select("id", { count: "exact", head: true }).in("status", ["pending", "accepted"]),
  ]);

  return {
    toolsInUse: toolCheckouts.count || 0,
    vehiclesOut: vehicleCheckouts.count || 0,
    openToolIssues: toolIssues.count || 0,
    openVehicleIssues: vehicleIssues.count || 0,
    pendingUsers: pendingUsers.count || 0,
    pendingTransfers: pendingTransfers.count || 0,
  };
}

export function AdminKPICards() {
  const { data = EMPTY, isLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: fetchKPIs,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const kpis = [
    { label: "Ferramentas em Uso", value: data.toolsInUse, icon: <Wrench className="w-5 h-5" />, color: "text-primary", bg: "bg-primary/10" },
    { label: "Veículos em Uso", value: data.vehiclesOut, icon: <Car className="w-5 h-5" />, color: "text-warning", bg: "bg-warning/10" },
    { label: "Problemas Abertos", value: data.openToolIssues + data.openVehicleIssues, icon: <AlertTriangle className="w-5 h-5" />, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Usuários Pendentes", value: data.pendingUsers, icon: <Users className="w-5 h-5" />, color: "text-warning", bg: "bg-warning/10" },
    { label: "Transferências Pendentes", value: data.pendingTransfers, icon: <TrendingUp className="w-5 h-5" />, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                {kpi.icon}
              </div>
              <div className="min-w-0">
                <p className={`text-2xl font-bold ${kpi.color}`}>
                  {isLoading ? "…" : kpi.value}
                </p>
                <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
