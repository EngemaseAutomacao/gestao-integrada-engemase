import { AdminPageHero } from "@/components/admin/AdminPageHero";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { subDays, subMonths, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Search, Eye, FileText, FileSpreadsheet, Camera, Brain, Trash2, X, List, Clock, Car, PlugZap } from "lucide-react";
import { HistorySkeleton } from "@/components/PageSkeleton";
import { AssetTimeline } from "@/components/admin/AssetTimeline";
import { SignedImage } from "@/components/SignedImage";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";
import { DeleteWithReasonDialog } from "@/components/DeleteWithReasonDialog";

type VehicleHistoryCategory = "engemase_employee" | "third_party" | "socios" | null;

// Formata duração entre saída e devolução como "Xh Ymin" (relatório de horas de uso — útil p/ plataformas sem hodômetro)
function formatUsageHours(checkout: string, checkin: string | null): string {
  if (!checkin) return "-";
  const ms = new Date(checkin).getTime() - new Date(checkout).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "-";
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
function usageHoursDecimal(checkout: string, checkin: string | null): number | null {
  if (!checkin) return null;
  const ms = new Date(checkin).getTime() - new Date(checkout).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Number((ms / 3600000).toFixed(2));
}

interface VehicleHistoryEntry {
  id: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string | null;
  destination: string | null;
  km_checkout: number;
  km_checkin: number | null;
  km_checkin_automatic: boolean | null;
  refueled: boolean | null;
  notes: string | null;
  photo_front_checkout: string | null;
  photo_back_checkout: string | null;
  photo_left_checkout: string | null;
  photo_right_checkout: string | null;
  photo_dashboard_checkout: string | null;
  photo_front_checkin: string | null;
  photo_back_checkin: string | null;
  photo_left_checkin: string | null;
  photo_right_checkin: string | null;
  photo_dashboard_checkin: string | null;
  vehicles: {
    name: string;
    plate: string;
  } | null;
  profiles: {
    full_name: string;
    category: VehicleHistoryCategory;
  } | null;
  checked_out_by_profile: {
    full_name: string;
  } | null;
  checked_in_by_profile: {
    full_name: string;
  } | null;
}

export default function AdminVehicleHistory() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: history = [], isLoading: loading } = useQuery<VehicleHistoryEntry[]>({
    queryKey: ["admin-vehicle-history"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_general_vehicle_history");
      if (error) throw error;
      return (data || []).map((entry) => ({
        id: entry.id,
        checkout_date: entry.checkout_date,
        checkin_date: entry.checkin_date,
        status: entry.status,
        destination: entry.destination,
        km_checkout: entry.km_checkout,
        km_checkin: entry.km_checkin,
        km_checkin_automatic: entry.km_checkin_automatic,
        refueled: entry.refueled,
        notes: entry.notes,
        photo_front_checkout: entry.photo_front_checkout,
        photo_back_checkout: entry.photo_back_checkout,
        photo_left_checkout: entry.photo_left_checkout,
        photo_right_checkout: entry.photo_right_checkout,
        photo_dashboard_checkout: entry.photo_dashboard_checkout,
        photo_front_checkin: entry.photo_front_checkin,
        photo_back_checkin: entry.photo_back_checkin,
        photo_left_checkin: entry.photo_left_checkin,
        photo_right_checkin: entry.photo_right_checkin,
        photo_dashboard_checkin: entry.photo_dashboard_checkin,
        vehicles: entry.vehicle_name || entry.vehicle_plate ? { name: entry.vehicle_name || "Veículo", plate: entry.vehicle_plate || "-" } : null,
        profiles: { full_name: entry.user_full_name || "Usuário não encontrado", category: entry.user_category as VehicleHistoryCategory },
        checked_out_by_profile: entry.checked_out_by_full_name ? { full_name: entry.checked_out_by_full_name } : null,
        checked_in_by_profile: entry.checked_in_by_full_name ? { full_name: entry.checked_in_by_full_name } : null,
      }));
    },
    staleTime: 30_000,
  });

  // Sessões de carregamento (só plataformas têm)
  const { data: chargingSessions = [] } = useQuery({
    queryKey: ["admin-vehicle-charging-sessions"],
    queryFn: async () => {
      const [sessRes, vehRes, usersRes] = await Promise.all([
        supabase
          .from("vehicle_charging_sessions")
          .select("id, vehicle_id, started_at, started_by, ended_at, ended_by")
          .order("started_at", { ascending: false })
          .limit(2000),
        supabase.from("vehicles").select("id, name, plate, vehicle_type"),
        supabase.rpc("get_approved_users"),
      ]);
      if (sessRes.error) throw sessRes.error;
      const vMap = new Map<string, { name: string; plate: string; type: string | null }>();
      ((vehRes.data as any[]) || []).forEach((v) =>
        vMap.set(v.id, { name: v.name, plate: v.plate, type: v.vehicle_type })
      );
      const uMap = new Map<string, string>();
      ((usersRes.data as any[]) || []).forEach((u) => uMap.set(u.id, u.full_name));
      return ((sessRes.data as any[]) || []).map((s) => {
        const v = vMap.get(s.vehicle_id);
        const durationMs = s.ended_at
          ? new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()
          : Date.now() - new Date(s.started_at).getTime();
        return {
          id: s.id as string,
          vehicle_id: s.vehicle_id as string,
          vehicle_name: v?.name || "—",
          vehicle_plate: v?.plate || "—",
          started_at: s.started_at as string,
          ended_at: s.ended_at as string | null,
          started_by_name: uMap.get(s.started_by) || "—",
          ended_by_name: s.ended_by ? uMap.get(s.ended_by) || "—" : null,
          duration_hours: Number((Math.max(0, durationMs) / 3600000).toFixed(2)),
        };
      });
    },
    staleTime: 30_000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<VehicleHistoryEntry | null>(null);
  const [aiEstimation, setAiEstimation] = useState<{
    checkout_km: number | null;
    checkin_km: number | null;
    distance_km: number | null;
    confidence: string;
    notes: string;
  } | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; entry: VehicleHistoryEntry | null }>({ open: false, entry: null });
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");

  const handleDeleteEntry = async (reason: string) => {
    if (!deleteDialog.entry) return;
    try {
      const { error } = await supabase
        .from("vehicle_checkouts")
        .delete()
        .eq("id", deleteDialog.entry.id);

      if (error) throw error;

      await supabase.from("system_logs").insert({
        action: "delete_history",
        entity_type: "vehicle_checkout",
        entity_id: deleteDialog.entry.id,
        user_id: profile!.id,
        user_name: profile!.full_name,
        details: {
          vehicle_name: deleteDialog.entry.vehicles?.name,
          plate: deleteDialog.entry.vehicles?.plate,
          user_name: deleteDialog.entry.profiles?.full_name,
          reason,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["admin-vehicle-history"] });
      toast.success("Registro excluído com sucesso");
    } catch (error) {
      console.error("Erro ao excluir registro:", error);
      toast.error("Erro ao excluir registro");
      throw error;
    }
  };

  if (!profile) {
    return <Navigate to="/" />;
  }
  const isAdmin = profile.role === "admin";


  const getDateRange = () => {
    const now = new Date();
    switch (periodFilter) {
      case "7d": return { start: subDays(now, 7), end: now };
      case "30d": return { start: subDays(now, 30), end: now };
      case "90d": return { start: subDays(now, 90), end: now };
      case "6m": return { start: subMonths(now, 6), end: now };
      case "1y": return { start: subMonths(now, 12), end: now };
      default: return null;
    }
  };

  const filteredHistory = history.filter((entry) => {
    const matchesSearch =
      entry.vehicles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.vehicles?.plate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.destination && entry.destination.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || entry.status === statusFilter;

    const matchesCategory =
      categoryFilter === "all" || entry.profiles?.category === categoryFilter;

    const dateRange = getDateRange();
    const matchesPeriod = !dateRange || (
      isAfter(new Date(entry.checkout_date), startOfDay(dateRange.start)) &&
      isBefore(new Date(entry.checkout_date), endOfDay(dateRange.end))
    );

    return matchesSearch && matchesStatus && matchesCategory && matchesPeriod;
  });

  // Filtragem das sessões de carregamento (usa mesma busca + período)
  const filteredCharging = chargingSessions.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      s.vehicle_name.toLowerCase().includes(q) ||
      s.vehicle_plate.toLowerCase().includes(q) ||
      s.started_by_name.toLowerCase().includes(q) ||
      (s.ended_by_name?.toLowerCase().includes(q) ?? false);
    const dateRange = getDateRange();
    const matchesPeriod =
      !dateRange ||
      (isAfter(new Date(s.started_at), startOfDay(dateRange.start)) &&
        isBefore(new Date(s.started_at), endOfDay(dateRange.end)));
    return matchesSearch && matchesPeriod;
  });

  // Horímetro consolidado por plataforma
  const platformHourMeter = Object.values(
    filteredCharging.reduce<Record<string, { vehicle: string; plate: string; sessions: number; hours: number }>>(
      (acc, s) => {
        const key = s.vehicle_id;
        if (!acc[key]) acc[key] = { vehicle: s.vehicle_name, plate: s.vehicle_plate, sessions: 0, hours: 0 };
        acc[key].sessions += 1;
        acc[key].hours += s.duration_hours;
        return acc;
      },
      {}
    )
  ).sort((a, b) => b.hours - a.hours);

  const exportChargingPDF = async () => {
    if (filteredCharging.length === 0) {
      toast.error("Nenhuma sessão de carregamento para exportar");
      return;
    }
    const headers = ["Plataforma", "Placa", "Colocou p/ carregar", "Início", "Retirou da carga", "Fim", "Duração", "Horas"];
    const rows = filteredCharging.map((s) => [
      s.vehicle_name,
      s.vehicle_plate,
      s.started_by_name,
      format(new Date(s.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      s.ended_by_name || "—",
      s.ended_at ? format(new Date(s.ended_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Em andamento",
      s.duration_hours >= 1 ? `${Math.floor(s.duration_hours)}h ${Math.round((s.duration_hours % 1) * 60)}min` : `${Math.round(s.duration_hours * 60)}min`,
      s.duration_hours.toFixed(2),
    ]);
    await exportToPDF({
      title: "Carregamentos de Plataforma",
      subtitle: `Total: ${filteredCharging.length} sessão(ões) · Horímetro acumulado: ${platformHourMeter.reduce((a, b) => a + b.hours, 0).toFixed(2)}h`,
      headers, rows,
      filename: `carregamentos-plataforma-${format(new Date(), "yyyy-MM-dd")}`,
      orientation: "landscape",
    });
    toast.success("PDF exportado!");
  };

  const exportChargingExcel = () => {
    if (filteredCharging.length === 0) {
      toast.error("Nenhuma sessão de carregamento para exportar");
      return;
    }
    const headers = ["Plataforma", "Placa", "Colocou p/ carregar", "Início", "Retirou da carga", "Fim", "Horas (decimal)", "Status"];
    const rows = filteredCharging.map((s) => [
      s.vehicle_name,
      s.vehicle_plate,
      s.started_by_name,
      format(new Date(s.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      s.ended_by_name || "—",
      s.ended_at ? format(new Date(s.ended_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
      s.duration_hours,
      s.ended_at ? "Finalizada" : "Em andamento",
    ]);
    exportToExcel({
      title: "Carregamentos de Plataforma",
      subtitle: `Total: ${filteredCharging.length} sessões`,
      headers, rows,
      filename: `carregamentos-plataforma-${format(new Date(), "yyyy-MM-dd")}`,
    });
    toast.success("Excel exportado!");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || categoryFilter !== "all" || periodFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPeriodFilter("all");
  };

  const getCategoryLabel = (category: VehicleHistoryCategory | undefined) => {
    if (category === "engemase_employee") return "Funcionário";
    if (category === "socios") return "Sócio";
    if (category === "third_party") return "Terceirizado";
    return "-";
  };

  const getCategoryBadge = (category: VehicleHistoryCategory | undefined) => {
    if (category === "engemase_employee") {
      return <Badge className="bg-badge-employee text-badge-employee-foreground">Funcionário</Badge>;
    }
    if (category === "socios") {
      return <Badge className="bg-primary text-primary-foreground">Sócio</Badge>;
    }
    if (!category) {
      return <span className="text-muted-foreground">-</span>;
    }
    return <Badge className="bg-badge-thirdparty text-badge-thirdparty-foreground">Terceirizado</Badge>;
  };

  const hasPhotos = (entry: VehicleHistoryEntry) => {
    return entry.photo_front_checkout || entry.photo_front_checkin ||
      entry.photo_dashboard_checkout || entry.photo_dashboard_checkin;
  };

  const canEstimateKm = (entry: VehicleHistoryEntry) => {
    return entry.photo_dashboard_checkout && entry.photo_dashboard_checkin;
  };

  const estimateKm = async (entry: VehicleHistoryEntry) => {
    if (!entry.photo_dashboard_checkout || !entry.photo_dashboard_checkin) {
      toast.error("Fotos do painel de saída e devolução são necessárias");
      return;
    }

    setEstimating(true);
    setAiEstimation(null);

    try {
      const { data, error } = await supabase.functions.invoke("read-odometer", {
        body: {
          checkout_photo_path: entry.photo_dashboard_checkout,
          checkin_photo_path: entry.photo_dashboard_checkin,
        },
      });

      if (error) throw error;

      const estimation = data as {
        checkout_km: number | null;
        checkin_km: number | null;
        distance_km: number | null;
        confidence: string;
        notes: string;
      };

      setAiEstimation(estimation);

      if (estimation.confidence === "low" || estimation.checkin_km === null) {
        toast.warning("Baixa confiança na leitura. Verifique manualmente.");
        return;
      }

      const updateData: { km_checkin: number; km_checkout?: number } = {
        km_checkin: estimation.checkin_km,
      };

      if (estimation.checkout_km !== null && entry.km_checkout === 0) {
        updateData.km_checkout = estimation.checkout_km;
      }

      const { error: updateError } = await supabase
        .from("vehicle_checkouts")
        .update(updateData)
        .eq("id", entry.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["admin-vehicle-history"] });

      setSelectedEntry((prev) =>
        prev && prev.id === entry.id
          ? {
              ...prev,
              km_checkin: estimation.checkin_km,
              km_checkout: updateData.km_checkout ?? prev.km_checkout,
            }
          : prev
      );

      toast.success("Estimativa concluída e salva no histórico!");
    } catch (error) {
      console.error("Error estimating km:", error);
      toast.error("Erro ao estimar quilometragem");
    } finally {
      setEstimating(false);
    }
  };

  const exportPDF = async () => {
    if (filteredHistory.length === 0) {
      toast.error("Nenhum registro para exportar");
      return;
    }
    const headers = ["Veículo", "Placa", "Usuário", "Categoria", "Destino", "Saída", "KM Saída", "Chegada", "KM Chegada", "Tempo de Uso", "Status"];
    const rows = filteredHistory.map((e) => [
      e.vehicles?.name,
      e.vehicles?.plate,
      e.profiles?.full_name || "Usuário não encontrado",
      getCategoryLabel(e.profiles?.category),
      e.destination || "-",
      format(new Date(e.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      e.km_checkout.toLocaleString(),
      e.checkin_date ? format(new Date(e.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
      e.km_checkin !== null ? e.km_checkin.toLocaleString() : "-",
      formatUsageHours(e.checkout_date, e.checkin_date),
      e.status === "checked_out" ? "Em Uso" : "Devolvido",
    ]);
    await exportToPDF({
      title: "Histórico de Veículos",
      subtitle: `Total: ${filteredHistory.length} registros`,
      headers, rows,
      filename: `historico-veiculos-${format(new Date(), "yyyy-MM-dd")}`,
      orientation: "landscape",
    });
    toast.success("PDF exportado!");
  };

  const exportExcel = () => {
    if (filteredHistory.length === 0) {
      toast.error("Nenhum registro para exportar");
      return;
    }
    const headers = ["Veículo", "Placa", "Usuário", "Categoria", "Destino", "Saída", "KM Saída", "Chegada", "KM Chegada", "KM Percorridos", "Tempo de Uso", "Horas (decimal)", "Abastecido", "Status", "Retirado por", "Devolvido por", "Observações"];
    const rows = filteredHistory.map((e) => [
      e.vehicles?.name,
      e.vehicles?.plate,
      e.profiles?.full_name || "Usuário não encontrado",
      getCategoryLabel(e.profiles?.category),
      e.destination || "-",
      format(new Date(e.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      e.km_checkout,
      e.checkin_date ? format(new Date(e.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
      e.km_checkin !== null ? e.km_checkin : "-",
      e.km_checkin !== null ? e.km_checkin - e.km_checkout : "-",
      formatUsageHours(e.checkout_date, e.checkin_date),
      usageHoursDecimal(e.checkout_date, e.checkin_date) ?? "-",
      e.refueled === null ? "-" : e.refueled ? "Sim" : "Não",
      e.status === "checked_out" ? "Em Uso" : "Devolvido",
      e.checked_out_by_profile?.full_name || "-",
      e.checked_in_by_profile?.full_name || "-",
      e.notes || "-",
    ]);
    exportToExcel({
      title: "Histórico de Veículos",
      subtitle: `Total: ${filteredHistory.length} registros`,
      headers, rows,
      filename: `historico-veiculos-${format(new Date(), "yyyy-MM-dd")}`,
    });
    toast.success("Excel exportado!");
  };

  if (loading) {
    return <HistorySkeleton />;
  }

  const PhotoSection = ({ label, photos }: { label: string; photos: { label: string; path: string | null }[] }) => {
    const validPhotos = photos.filter(p => p.path);
    if (validPhotos.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {validPhotos.map((photo, i) => (
            <div key={i}>
              <p className="text-xs text-muted-foreground mb-1">{photo.label}</p>
              <SignedImage storagePath={photo.path!} alt={photo.label} className="w-full h-24 object-cover rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 sm:gap-6">
      <AdminPageHero icon={Car} title="Histórico Geral de Veículos" subtitle="Visualize todas as movimentações de veículos" />
      <div className="shrink-0 flex items-center justify-end flex-wrap gap-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
        </div>
      </div>

      <Card className="shrink-0">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre o histórico por diferentes critérios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar veículo, placa ou usuário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="checked_out">Em Uso</SelectItem>
                <SelectItem value="checked_in">Devolvido</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                <SelectItem value="engemase_employee">Funcionários</SelectItem>
                <SelectItem value="third_party">Terceirizados</SelectItem>
                <SelectItem value="socios">Sócios</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
                <SelectItem value="1y">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
              <X className="w-3 h-3" />
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Histórico de Movimentações</CardTitle>
            <CardDescription>
              Mostrando {filteredHistory.length} de {history.length} registros
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("table")}
              title="Visualização em tabela"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "timeline" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("timeline")}
              title="Visualização em timeline"
            >
              <Clock className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma movimentação encontrada
            </p>
          ) : viewMode === "timeline" ? (
            <AssetTimeline
              events={filteredHistory.map((entry) => ({
                id: entry.id,
                date: entry.status === "checked_in" && entry.checkin_date ? entry.checkin_date : entry.checkout_date,
                action: entry.status === "checked_out" ? "Retirada" : "Devolução",
                description: `${entry.vehicles?.name} (${entry.vehicles?.plate})${entry.destination ? ` — ${entry.destination}` : ""}${entry.km_checkin !== null ? ` • ${(entry.km_checkin - entry.km_checkout).toLocaleString()} km` : ""}`,
                user: entry.profiles?.full_name,
                type: entry.status === "checked_out" ? "checkout" : "checkin",
              }))}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead>Chegada</TableHead>
                      <TableHead>KM</TableHead>
                      <TableHead>Tempo de Uso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.vehicles?.name}</TableCell>
                        <TableCell>{entry.vehicles?.plate}</TableCell>
                        <TableCell>{entry.profiles?.full_name}</TableCell>
                        <TableCell>{getCategoryBadge(entry.profiles?.category)}</TableCell>
                        <TableCell>{entry.destination || "-"}</TableCell>
                        <TableCell>
                          {format(new Date(entry.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {entry.checkin_date
                            ? format(new Date(entry.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>
                              {entry.km_checkin !== null
                                ? `${(entry.km_checkin - entry.km_checkout).toLocaleString()} km`
                                : "-"}
                            </span>
                            {entry.checkin_date && entry.km_checkin_automatic === false && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 w-fit mt-1 border-orange-200 bg-orange-50 text-orange-700">Manual</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatUsageHours(entry.checkout_date, entry.checkin_date)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.status === "checked_out" ? "default" : "secondary"}>
                            {entry.status === "checked_out" ? "Em Uso" : "Devolvido"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedEntry(entry); setAiEstimation(null); }}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  Ver
                                  {hasPhotos(entry) && <Camera className="w-3 h-3 ml-1" />}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Detalhes da Movimentação</DialogTitle>
                                </DialogHeader>
                                {selectedEntry && (
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Veículo</p>
                                        <p className="font-semibold">{selectedEntry.vehicles?.name} - {selectedEntry.vehicles?.plate}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                                        <p className="font-semibold">{selectedEntry.profiles?.full_name}</p>
                                        {getCategoryBadge(selectedEntry.profiles?.category)}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Destino</p>
                                        <p>{selectedEntry.destination || "Não informado"}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                                        <Badge variant={selectedEntry.status === "checked_out" ? "default" : "secondary"}>
                                          {selectedEntry.status === "checked_out" ? "Em Uso" : "Devolvido"}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Saída</p>
                                        <p>{format(new Date(selectedEntry.checkout_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                        <p className="text-xs text-muted-foreground">
                                          KM: {selectedEntry.km_checkout.toLocaleString()} | Por: {selectedEntry.checked_out_by_profile?.full_name || "-"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Chegada</p>
                                        <p>
                                          {selectedEntry.checkin_date
                                            ? format(new Date(selectedEntry.checkin_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                            : "Não devolvido"}
                                        </p>
                                        {selectedEntry.km_checkin !== null && (
                                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                                            KM: {selectedEntry.km_checkin.toLocaleString()} | Por: {selectedEntry.checked_in_by_profile?.full_name || "-"}
                                            {selectedEntry.km_checkin_automatic === false && (
                                              <Badge variant="outline" className="text-[10px] h-4 px-1 border-orange-200 bg-orange-50 text-orange-700">Manual</Badge>
                                            )}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {selectedEntry.km_checkin !== null && (
                                      <div className="pt-4 border-t">
                                        <p className="text-sm font-medium text-muted-foreground">Distância Percorrida</p>
                                        <p className="text-lg font-bold text-primary">
                                          {(selectedEntry.km_checkin - selectedEntry.km_checkout).toLocaleString()} km
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Abastecido: {selectedEntry.refueled === null ? "Não informado" : selectedEntry.refueled ? "Sim" : "Não"}
                                        </p>
                                      </div>
                                    )}

                                    {canEstimateKm(selectedEntry) && (
                                      <div className="pt-4 border-t">
                                        <div className="flex items-center justify-between">
                                          <p className="text-sm font-medium text-muted-foreground">Estimativa por IA</p>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-2"
                                            onClick={() => estimateKm(selectedEntry)}
                                            disabled={estimating}
                                          >
                                            {estimating ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <Brain className="w-4 h-4" />
                                            )}
                                            {estimating ? "Analisando..." : "Estimar KM via IA"}
                                          </Button>
                                        </div>
                                        {aiEstimation && (
                                          <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-2">
                                            <div className="flex items-center gap-2">
                                              <Badge variant={
                                                aiEstimation.confidence === "high" ? "default" :
                                                aiEstimation.confidence === "medium" ? "secondary" : "destructive"
                                              }>
                                                {aiEstimation.confidence === "high" ? "Alta confiança" :
                                                 aiEstimation.confidence === "medium" ? "Média confiança" : "Baixa confiança"}
                                              </Badge>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                              <div>
                                                <p className="text-muted-foreground text-xs">KM Saída</p>
                                                <p className="font-medium">{aiEstimation.checkout_km?.toLocaleString() || "N/A"}</p>
                                              </div>
                                              <div>
                                                <p className="text-muted-foreground text-xs">KM Chegada</p>
                                                <p className="font-medium">{aiEstimation.checkin_km?.toLocaleString() || "N/A"}</p>
                                              </div>
                                              <div>
                                                <p className="text-muted-foreground text-xs">Distância</p>
                                                <p className="font-bold text-primary">{aiEstimation.distance_km?.toLocaleString() || "N/A"} km</p>
                                              </div>
                                            </div>
                                            {aiEstimation.notes && (
                                              <p className="text-xs text-muted-foreground">{aiEstimation.notes}</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {selectedEntry.notes && (
                                      <div className="pt-4 border-t">
                                        <p className="text-sm font-medium text-muted-foreground">Observações</p>
                                        <p className="text-sm">{selectedEntry.notes}</p>
                                      </div>
                                    )}

                                    {hasPhotos(selectedEntry) && (
                                      <div className="pt-4 border-t space-y-4">
                                        <h4 className="font-semibold">Fotos — Comparativo Saída vs Devolução</h4>
                                        {[
                                          { label: "Frente", checkout: selectedEntry.photo_front_checkout, checkin: selectedEntry.photo_front_checkin },
                                          { label: "Traseira", checkout: selectedEntry.photo_back_checkout, checkin: selectedEntry.photo_back_checkin },
                                          { label: "Esquerda", checkout: selectedEntry.photo_left_checkout, checkin: selectedEntry.photo_left_checkin },
                                          { label: "Direita", checkout: selectedEntry.photo_right_checkout, checkin: selectedEntry.photo_right_checkin },
                                          { label: "Painel", checkout: selectedEntry.photo_dashboard_checkout, checkin: selectedEntry.photo_dashboard_checkin },
                                        ]
                                          .filter((pair) => pair.checkout || pair.checkin)
                                          .map((pair) => (
                                            <div key={pair.label} className="space-y-1">
                                              <p className="text-sm font-medium text-muted-foreground">{pair.label}</p>
                                              <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                  <p className="text-xs text-muted-foreground mb-1">Saída</p>
                                                  {pair.checkout ? (
                                                    <SignedImage storagePath={pair.checkout} alt={`${pair.label} - Saída`} className="w-full h-32 object-cover rounded-lg border" />
                                                  ) : (
                                                    <div className="w-full h-32 rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground bg-muted/30">
                                                      Sem foto
                                                    </div>
                                                  )}
                                                </div>
                                                <div>
                                                  <p className="text-xs text-muted-foreground mb-1">Devolução</p>
                                                  {pair.checkin ? (
                                                    <SignedImage storagePath={pair.checkin} alt={`${pair.label} - Devolução`} className="w-full h-32 object-cover rounded-lg border" />
                                                  ) : (
                                                    <div className="w-full h-32 rounded-lg border border-dashed flex items-center justify-center text-xs text-muted-foreground bg-muted/30">
                                                      Sem foto
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteDialog({ open: true, entry })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}

                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredHistory.map((entry) => (
                  <Card key={entry.id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {entry.vehicles?.name} - {entry.vehicles?.plate}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.profiles?.full_name} • {entry.destination || "Sem destino"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.checkout_date), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                          <Badge variant={entry.status === "checked_out" ? "default" : "secondary"} className="text-[10px]">
                            {entry.status === "checked_out" ? "Em Uso" : "Devolvido"}
                          </Badge>
                          {entry.km_checkin !== null && (
                            <span className="text-xs font-medium text-primary">
                              {(entry.km_checkin - entry.km_checkout).toLocaleString()} km
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedEntry(entry); setAiEstimation(null); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Detalhes da Movimentação</DialogTitle>
                            </DialogHeader>
                            {selectedEntry && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Veículo</p>
                                    <p className="font-semibold">{selectedEntry.vehicles?.name} - {selectedEntry.vehicles?.plate}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                                    <p className="font-semibold">{selectedEntry.profiles?.full_name}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteDialog({ open: true, entry })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}

                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Carregamentos de Plataforma */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <PlugZap className="w-4 h-4 md:w-5 md:h-5 text-info" />
                Carregamentos de Plataforma
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {filteredCharging.length} sessão(ões) · Horímetro acumulado:{" "}
                <span className="font-semibold text-foreground">
                  {platformHourMeter.reduce((a, b) => a + b.hours, 0).toFixed(2)}h
                </span>
              </CardDescription>
            </div>
            <div className="flex gap-1 flex-wrap">
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={exportChargingPDF}>
                <FileText className="w-3.5 h-3.5" /> PDF
              </Button>
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={exportChargingExcel}>
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-4">
          {platformHourMeter.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {platformHourMeter.map((p) => (
                <div key={p.plate} className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Horímetro</p>
                  <p className="font-semibold text-sm truncate">{p.vehicle}</p>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs font-mono text-muted-foreground">{p.plate}</span>
                    <span className="text-lg font-bold text-info">{p.hours.toFixed(2)}h</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{p.sessions} sessão(ões)</p>
                </div>
              ))}
            </div>
          )}

          {filteredCharging.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Nenhuma sessão de carregamento no período/filtro atual
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Colocou p/ carregar</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Retirou da carga</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCharging.slice(0, 200).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.vehicle_name}</TableCell>
                      <TableCell className="font-mono text-xs">{s.vehicle_plate}</TableCell>
                      <TableCell>{s.started_by_name}</TableCell>
                      <TableCell>{format(new Date(s.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell>{s.ended_by_name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        {s.ended_at
                          ? format(new Date(s.ended_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : <span className="text-muted-foreground italic">Em andamento</span>}
                      </TableCell>
                      <TableCell className="font-mono">
                        {s.duration_hours >= 1
                          ? `${Math.floor(s.duration_hours)}h ${Math.round((s.duration_hours % 1) * 60)}min`
                          : `${Math.round(s.duration_hours * 60)}min`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.ended_at ? "secondary" : "default"} className={s.ended_at ? "" : "bg-info text-info-foreground"}>
                          {s.ended_at ? "Finalizada" : "Em andamento"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredCharging.length > 200 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Mostrando 200 de {filteredCharging.length} sessões — exporte para ver todas
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      <DeleteWithReasonDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, entry: open ? deleteDialog.entry : null })}
        onConfirm={handleDeleteEntry}
        title="Excluir Registro do Histórico"
        description="Esta ação é irreversível. O registro será removido permanentemente do histórico."
        itemName={deleteDialog.entry ? `${deleteDialog.entry.vehicles?.name} (${deleteDialog.entry.vehicles?.plate}) - ${deleteDialog.entry.profiles?.full_name}` : ""}
      />
    </div>
  );
}
