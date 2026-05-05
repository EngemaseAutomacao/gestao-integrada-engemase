import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Download, Loader2, FileSpreadsheet, Calendar } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToPDF as exportPdfUtil, exportToExcel as exportXlsxUtil } from "@/lib/exportUtils";
import { useActiveConstructionSites } from "@/hooks/useConstructionSites";

interface ReportFilters {
  startDate: string;
  endDate: string;
  toolId: string;
  constructionSite: string;
  reportType: "checkouts" | "maintenance" | "inventory" | "usage_summary" | "vehicle_checkouts" | "fuel_records";
}

interface Tool {
  id: string;
  name: string;
}

const reportTypeFileLabel = (t: string) => ({
  checkouts: "Retiradas-Devolucoes-Ferramentas",
  maintenance: "Manutencao-Ferramentas",
  inventory: "Inventario-Ferramentas",
  usage_summary: "Resumo-Uso-Ferramentas",
  vehicle_checkouts: "Movimentacao-Veiculos",
  fuel_records: "Abastecimentos-Veiculos",
}[t] || "Geral");

export default function AdminReports() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const { data: activeSites = [] } = useActiveConstructionSites();
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: "",
    endDate: "",
    toolId: "all",
    constructionSite: "",
    reportType: "checkouts",
  });

  useEffect(() => {
    loadTools();
  }, []);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const loadTools = async () => {
    try {
      const { data, error } = await supabase
        .from("tools")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setTools(data || []);
    } catch (error: any) {
      console.error("Error loading tools:", error);
    }
  };

  const fetchReportData = async () => {
    let query = supabase.from("tool_checkouts").select(`
      *,
      tools (name, tag, brand),
      profiles!tool_checkouts_user_id_fkey (full_name, email, category),
      checked_out_by_profile:profiles!tool_checkouts_checked_out_by_fkey (full_name),
      checked_in_by_profile:profiles!tool_checkouts_checked_in_by_fkey (full_name)
    `);

    if (filters.startDate) {
      query = query.gte("checkout_date", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("checkout_date", filters.endDate);
    }
    if (filters.toolId && filters.toolId !== "all") {
      query = query.eq("tool_id", filters.toolId);
    }
    if (filters.constructionSite) {
      query = query.ilike("construction_site", `%${filters.constructionSite}%`);
    }

    query = query.order("checkout_date", { ascending: false }).limit(5000);

    const { data, error } = await query;

    if (error) throw error;
    return data;
  };

  const fetchMaintenanceData = async () => {
    let query = supabase.from("maintenance_records").select(`
      *,
      tools (name, tag, brand),
      profiles (full_name, email)
    `);

    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate);
    }
    if (filters.toolId && filters.toolId !== "all") {
      query = query.eq("tool_id", filters.toolId);
    }

    query = query.order("created_at", { ascending: false }).limit(5000);

    const { data, error } = await query;

    if (error) throw error;
    return data;
  };

  const fetchInventoryData = async () => {
    let query = supabase.from("tools").select("*");

    if (filters.toolId && filters.toolId !== "all") {
      query = query.eq("id", filters.toolId);
    }

    query = query.order("name").limit(5000);

    const { data, error } = await query;

    if (error) throw error;
    return data;
  };

  const fetchVehicleCheckoutsData = async () => {
    let query = supabase.from("vehicle_checkouts").select(`
      *,
      vehicles!inner(name, plate, brand),
      profiles!vehicle_checkouts_user_id_fkey(full_name, email, category)
    `);

    if (filters.startDate) query = query.gte("checkout_date", filters.startDate);
    if (filters.endDate) query = query.lte("checkout_date", filters.endDate);
    if (filters.constructionSite && filters.constructionSite.trim()) {
      query = query.ilike("destination", `%${filters.constructionSite.trim()}%`);
    }

    query = query.order("checkout_date", { ascending: false }).limit(5000);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  const fetchFuelData = async () => {
    let query = supabase.from("fuel_records").select(`
      *,
      vehicles!inner(name, plate),
      profiles!fuel_records_user_id_fkey(full_name)
    `);

    if (filters.startDate) query = query.gte("refuel_date", filters.startDate);
    if (filters.endDate) query = query.lte("refuel_date", filters.endDate);

    query = query.order("refuel_date", { ascending: false }).limit(5000);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  const setQuickPeriod = (period: string) => {
    const today = new Date();
    let start = "";
    let end = format(today, "yyyy-MM-dd");

    switch (period) {
      case "7d":
        start = format(subDays(today, 7), "yyyy-MM-dd");
        break;
      case "30d":
        start = format(subDays(today, 30), "yyyy-MM-dd");
        break;
      case "this_month":
        start = format(startOfMonth(today), "yyyy-MM-dd");
        end = format(endOfMonth(today), "yyyy-MM-dd");
        break;
      case "last_month":
        const lastMonth = subMonths(today, 1);
        start = format(startOfMonth(lastMonth), "yyyy-MM-dd");
        end = format(endOfMonth(lastMonth), "yyyy-MM-dd");
        break;
      case "this_year":
        start = format(startOfYear(today), "yyyy-MM-dd");
        break;
    }

    setFilters({ ...filters, startDate: start, endDate: end });
  };

  const exportToPDF = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      let title = "";
      let columns: string[] = [];
      let rows: any[][] = [];

      switch (filters.reportType) {
        case "checkouts":
          data = await fetchReportData();
          title = "Relatório de Retiradas/Devoluções";
          columns = ["Ferramenta", "Usuário", "Retirada", "Devolução", "Status", "Obra"];
          rows = data.map((item: any) => [
            item.tools?.name || "-",
            item.profiles?.full_name || "-",
            format(new Date(item.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
            item.checkin_date ? format(new Date(item.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
            item.status === "checked_out" ? "Em Uso" : "Devolvida",
            item.construction_site || "-",
          ]);
          break;

        case "maintenance":
          data = await fetchMaintenanceData();
          title = "Relatório de Manutenções";
          columns = ["Ferramenta", "Tipo", "Descrição", "Realizado por", "Data", "Custo"];
          rows = data.map((item: any) => [
            item.tools?.name || "-",
            item.maintenance_type,
            item.description,
            item.profiles?.full_name || "-",
            format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR }),
            item.cost ? `R$ ${item.cost.toFixed(2)}` : "-",
          ]);
          break;

        case "inventory":
          data = await fetchInventoryData();
          title = "Relatório de Inventário";
          columns = ["Nome", "TAG", "Marca", "Condição", "Disponível", "Total"];
          rows = data.map((item: any) => [
            item.name,
            item.tag || "-",
            item.brand || "-",
            item.condition,
            item.quantity_available.toString(),
            item.quantity_total.toString(),
          ]);
          break;

        case "usage_summary":
          data = await fetchReportData();
          title = "Resumo de Uso de Ferramentas";
          const toolUsage = new Map();
          data.forEach((item: any) => {
            const toolName = item.tools?.name || "Desconhecido";
            if (!toolUsage.has(toolName)) {
              toolUsage.set(toolName, { count: 0, totalDays: 0 });
            }
            const usage = toolUsage.get(toolName);
            usage.count++;
            if (item.checkin_date) {
              const days = Math.ceil(
                (new Date(item.checkin_date).getTime() - new Date(item.checkout_date).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              usage.totalDays += days;
            }
          });
          columns = ["Ferramenta", "Total de Usos", "Total de Dias", "Média de Dias"];
          rows = Array.from(toolUsage.entries()).map(([name, usage]: [string, any]) => [
            name,
            usage.count.toString(),
            usage.totalDays.toString(),
            (usage.totalDays / usage.count).toFixed(1),
          ]);
          break;

        case "vehicle_checkouts":
          data = await fetchVehicleCheckoutsData();
          title = "Relatório de Movimentação de Veículos";
          columns = ["Veículo", "Placa", "Usuário", "Saída", "Chegada", "KM Saída", "KM Chegada", "Destino"];
          rows = data.map((item: any) => [
            item.vehicles?.name || "-",
            item.vehicles?.plate || "-",
            item.profiles?.full_name || "-",
            format(new Date(item.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
            item.checkin_date ? format(new Date(item.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
            item.km_checkout?.toString() || "-",
            item.km_checkin?.toString() || "-",
            item.destination || "-",
          ]);
          break;

        case "fuel_records":
          data = await fetchFuelData();
          title = "Relatório de Abastecimento";
          columns = ["Veículo", "Placa", "Litros", "Custo/L", "Total", "KM", "Posto", "Data"];
          rows = data.map((item: any) => [
            item.vehicles?.name || "-",
            item.vehicles?.plate || "-",
            item.liters?.toString() || "-",
            item.cost_per_liter ? `R$ ${Number(item.cost_per_liter).toFixed(2)}` : "-",
            item.total_cost ? `R$ ${Number(item.total_cost).toFixed(2)}` : "-",
            item.km_at_refuel?.toString() || "-",
            item.gas_station || "-",
            format(new Date(item.refuel_date), "dd/MM/yyyy", { locale: ptBR }),
          ]);
          break;
      }

      let subtitle = "";
      if (filters.startDate || filters.endDate) {
        subtitle = "Período: ";
        if (filters.startDate) {
          subtitle += format(new Date(filters.startDate), "dd/MM/yyyy", { locale: ptBR });
        }
        if (filters.endDate) {
          subtitle += ` até ${format(new Date(filters.endDate), "dd/MM/yyyy", { locale: ptBR })}`;
        }
      }

      // Extra section for vehicle_checkouts: KM total por veículo no período
      const extraSections: any[] = [];
      if (filters.reportType === "vehicle_checkouts") {
        const allVehicles = await supabase
          .from("vehicles")
          .select("id, name, plate")
          .order("name");
        const kmByVehicle = new Map<string, number>();
        const tripsByVehicle = new Map<string, number>();
        data.forEach((item: any) => {
          const vid = item.vehicle_id;
          if (!vid) return;
          if (item.km_checkin != null && item.km_checkout != null) {
            const km = Number(item.km_checkin) - Number(item.km_checkout);
            if (km > 0) kmByVehicle.set(vid, (kmByVehicle.get(vid) || 0) + km);
          }
          tripsByVehicle.set(vid, (tripsByVehicle.get(vid) || 0) + 1);
        });
        const vehicleRows: (string | number)[][] = (allVehicles.data || []).map((v: any) => [
          v.name || "-",
          v.plate || "-",
          (tripsByVehicle.get(v.id) || 0).toString(),
          (kmByVehicle.get(v.id) || 0).toLocaleString("pt-BR") + " km",
        ]);
        const totalKm = Array.from(kmByVehicle.values()).reduce((a, b) => a + b, 0);
        vehicleRows.push(["TOTAL", "", "", totalKm.toLocaleString("pt-BR") + " km"]);
        extraSections.push({
          title: "KM Total Rodado por Veículo (no período)",
          headers: ["Veículo", "Placa", "Viagens", "KM Rodado"],
          rows: vehicleRows,
        });
      }

      await exportPdfUtil({
        title,
        subtitle: subtitle || undefined,
        headers: columns,
        rows,
        filename: `Relatorio-${reportTypeFileLabel(filters.reportType)}-${format(new Date(), "yyyy-MM-dd")}`,
        extraSections,
      });
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao gerar relatório", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      let sheetName = "";

      switch (filters.reportType) {
        case "checkouts":
          data = await fetchReportData();
          sheetName = "Retiradas";
          data = data.map((item: any) => ({
            Ferramenta: item.tools?.name || "-",
            TAG: item.tools?.tag || "-",
            Usuário: item.profiles?.full_name || "-",
            Email: item.profiles?.email || "-",
            Categoria: item.profiles?.category || "-",
            Retirada: format(new Date(item.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
            Devolução: item.checkin_date
              ? format(new Date(item.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
              : "-",
            Status: item.status === "checked_out" ? "Em Uso" : "Devolvida",
            Obra: item.construction_site || "-",
            "Retirado por": item.checked_out_by_profile?.full_name || "-",
            "Devolvido por": item.checked_in_by_profile?.full_name || "-",
          }));
          break;

        case "maintenance":
          data = await fetchMaintenanceData();
          sheetName = "Manutenções";
          data = data.map((item: any) => ({
            Ferramenta: item.tools?.name || "-",
            TAG: item.tools?.tag || "-",
            Tipo: item.maintenance_type,
            Descrição: item.description,
            "Condição Antes": item.condition_before || "-",
            "Condição Depois": item.condition_after || "-",
            "Realizado por": item.profiles?.full_name || "-",
            Data: format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
            Custo: item.cost ? `R$ ${item.cost.toFixed(2)}` : "-",
            "Peças Substituídas": item.parts_replaced || "-",
          }));
          break;

        case "inventory":
          data = await fetchInventoryData();
          sheetName = "Inventário";
          data = data.map((item: any) => ({
            Nome: item.name,
            TAG: item.tag || "-",
            Marca: item.brand || "-",
            Descrição: item.description || "-",
            Condição: item.condition,
            Disponível: item.quantity_available,
            Total: item.quantity_total,
            "Apenas Funcionários": item.employee_only ? "Sim" : "Não",
          }));
          break;

        case "usage_summary":
          data = await fetchReportData();
          sheetName = "Resumo de Uso";
          const toolUsage = new Map();
          data.forEach((item: any) => {
            const toolName = item.tools?.name || "Desconhecido";
            if (!toolUsage.has(toolName)) {
              toolUsage.set(toolName, { count: 0, totalDays: 0 });
            }
            const usage = toolUsage.get(toolName);
            usage.count++;
            if (item.checkin_date) {
              const days = Math.ceil(
                (new Date(item.checkin_date).getTime() - new Date(item.checkout_date).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              usage.totalDays += days;
            }
          });
          data = Array.from(toolUsage.entries()).map(([name, usage]: [string, any]) => ({
            Ferramenta: name,
            "Total de Usos": usage.count,
            "Total de Dias": usage.totalDays,
            "Média de Dias por Uso": (usage.totalDays / usage.count).toFixed(1),
          }));
          break;

        case "vehicle_checkouts":
          data = await fetchVehicleCheckoutsData();
          sheetName = "Veículos";
          data = data.map((item: any) => ({
            Veículo: item.vehicles?.name || "-",
            Placa: item.vehicles?.plate || "-",
            Usuário: item.profiles?.full_name || "-",
            Categoria: item.profiles?.category === "engemase_employee" ? "Funcionário" : item.profiles?.category === "third_party" ? "Terceiro" : item.profiles?.category === "socios" ? "Sócio" : item.profiles?.category || "-",
            Saída: format(new Date(item.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
            Chegada: item.checkin_date ? format(new Date(item.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
            "KM Saída": item.km_checkout,
            "KM Chegada": item.km_checkin || "-",
            "KM Rodado": item.km_checkin ? item.km_checkin - item.km_checkout : "-",
            Destino: item.destination || "-",
            Finalidade: item.purpose || "-",
            Status: item.status === "checked_out" ? "Em Uso" : "Devolvido",
          }));
          break;

        case "fuel_records":
          data = await fetchFuelData();
          sheetName = "Combustível";
          data = data.map((item: any) => ({
            Veículo: item.vehicles?.name || "-",
            Placa: item.vehicles?.plate || "-",
            Responsável: item.profiles?.full_name || "-",
            Litros: item.liters,
            "Custo/Litro": item.cost_per_liter ? `R$ ${Number(item.cost_per_liter).toFixed(2)}` : "-",
            "Custo Total": item.total_cost ? `R$ ${Number(item.total_cost).toFixed(2)}` : "-",
            "KM no Abastecimento": item.km_at_refuel,
            Combustível: item.fuel_type === "gasoline" ? "Gasolina" : item.fuel_type === "ethanol" ? "Etanol" : item.fuel_type === "diesel" ? "Diesel" : item.fuel_type,
            Posto: item.gas_station || "-",
            Data: format(new Date(item.refuel_date), "dd/MM/yyyy", { locale: ptBR }),
          }));
          break;
      }

      const headers = data.length > 0 ? Object.keys(data[0]) : [];
      const rows = data.map((r: any) => headers.map((h) => r[h] ?? "-"));
      let subtitle = "";
      if (filters.startDate || filters.endDate) {
        subtitle = "Período: ";
        if (filters.startDate) subtitle += format(new Date(filters.startDate), "dd/MM/yyyy", { locale: ptBR });
        if (filters.endDate) subtitle += ` até ${format(new Date(filters.endDate), "dd/MM/yyyy", { locale: ptBR })}`;
      }
      exportXlsxUtil({
        title: `Relatório — ${sheetName}`,
        subtitle: subtitle || undefined,
        headers,
        rows,
        filename: `Relatorio-${reportTypeFileLabel(filters.reportType)}-${format(new Date(), "yyyy-MM-dd")}`,
      });
      toast.success("Relatório Excel gerado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao gerar relatório", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
        <p className="text-muted-foreground">Gere e exporte relatórios personalizados</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurar Relatório</CardTitle>
          <CardDescription>Selecione os filtros e o tipo de relatório desejado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reportType">Tipo de Relatório *</Label>
              <Select
                value={filters.reportType}
                onValueChange={(value) =>
                  setFilters({ ...filters, reportType: value as ReportFilters["reportType"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkouts">Retiradas/Devoluções (Ferramentas)</SelectItem>
                  
                  <SelectItem value="inventory">Inventário Atual</SelectItem>
                  <SelectItem value="usage_summary">Resumo de Uso (Ferramentas)</SelectItem>
                  <SelectItem value="vehicle_checkouts">Movimentação de Veículos</SelectItem>
                  
                </SelectContent>
              </Select>
            </div>

            {filters.reportType !== "vehicle_checkouts" && (
              <div className="space-y-2">
                <Label htmlFor="toolId">Ferramenta Específica</Label>
                <Select value={filters.toolId} onValueChange={(value) => setFilters({ ...filters, toolId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as ferramentas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ferramentas</SelectItem>
                    {tools.map((tool) => (
                      <SelectItem key={tool.id} value={tool.id}>
                        {tool.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filters.reportType === "checkouts" && (
              <div className="space-y-2">
                <Label htmlFor="constructionSiteTool">Obra (Trello)</Label>
                <Select
                  value={filters.constructionSite || "all"}
                  onValueChange={(v) => setFilters({ ...filters, constructionSite: v === "all" ? "" : v })}
                >
                  <SelectTrigger id="constructionSiteTool">
                    <SelectValue placeholder="Todas as obras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as obras</SelectItem>
                    {activeSites.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filters.reportType === "vehicle_checkouts" && (
              <div className="space-y-2">
                <Label htmlFor="constructionSiteVehicle">Obra (Trello)</Label>
                <Select
                  value={filters.constructionSite || "all"}
                  onValueChange={(v) => setFilters({ ...filters, constructionSite: v === "all" ? "" : v })}
                >
                  <SelectTrigger id="constructionSiteVehicle">
                    <SelectValue placeholder="Todas as obras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as obras</SelectItem>
                    {activeSites.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* Quick Period Presets */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Período Rápido
            </Label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setQuickPeriod("7d")}>Últimos 7 dias</Button>
              <Button size="sm" variant="outline" onClick={() => setQuickPeriod("30d")}>Últimos 30 dias</Button>
              <Button size="sm" variant="outline" onClick={() => setQuickPeriod("this_month")}>Este mês</Button>
              <Button size="sm" variant="outline" onClick={() => setQuickPeriod("last_month")}>Mês passado</Button>
              <Button size="sm" variant="outline" onClick={() => setQuickPeriod("this_year")}>Este ano</Button>
              <Button size="sm" variant="ghost" onClick={() => setFilters({ ...filters, startDate: "", endDate: "" })}>Limpar</Button>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <Button onClick={exportToPDF} disabled={loading} className="flex-1">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Exportar PDF
            </Button>
            <Button onClick={exportToExcel} disabled={loading} className="flex-1" variant="secondary">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de Relatórios Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Retiradas/Devoluções</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Histórico completo de check-in/check-out</li>
                  <li>• Informações do usuário e obra</li>
                  <li>• Status atual das ferramentas</li>
                  <li>• Datas de retirada e devolução</li>
                </ul>
              </CardContent>
            </Card>


            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inventário Atual</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Estado atual de todas as ferramentas</li>
                  <li>• Quantidades disponíveis e totais</li>
                  <li>• Condição de cada ferramenta</li>
                  <li>• Informações técnicas (TAG, marca)</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo de Uso</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-1">
                  <li>• Estatísticas de uso por ferramenta</li>
                  <li>• Total de dias em uso</li>
                  <li>• Média de dias por uso</li>
                  <li>• Ferramentas mais utilizadas</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}