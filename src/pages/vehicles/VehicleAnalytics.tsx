import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Car, Fuel, TrendingUp, FileText, FileSpreadsheet, CalendarIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, subMonths, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export default function VehicleAnalytics() {
  const { profile } = useAuth();
  const [periodFilter, setPeriodFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const getDateRange = (): { from: Date | null; to: Date | null } => {
    const now = new Date();
    switch (periodFilter) {
      case "7d": return { from: subDays(now, 7), to: now };
      case "30d": return { from: subDays(now, 30), to: now };
      case "90d": return { from: subDays(now, 90), to: now };
      case "6m": return { from: subMonths(now, 6), to: now };
      case "1y": return { from: startOfYear(now), to: now };
      case "custom": return { from: startDate || null, to: endDate || null };
      default: return { from: null, to: null };
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-analytics", periodFilter, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const range = getDateRange();
      
      let checkoutQuery = supabase.from("vehicle_checkouts").select(`
          id, checkout_date, checkin_date, km_checkout, km_checkin, status, destination, refueled,
          vehicles!inner(id, name, plate),
          profiles!vehicle_checkouts_user_id_fkey(full_name)
        `);
      
      if (range.from) checkoutQuery = checkoutQuery.gte("checkout_date", range.from.toISOString());
      if (range.to) checkoutQuery = checkoutQuery.lte("checkout_date", range.to.toISOString());

      let fuelQuery = supabase.from("fuel_records").select(`*, vehicles(name, plate)`);
      if (range.from) fuelQuery = fuelQuery.gte("refuel_date", range.from.toISOString());
      if (range.to) fuelQuery = fuelQuery.lte("refuel_date", range.to.toISOString());

      const [checkoutsRes, vehiclesRes, fuelRes] = await Promise.all([
        checkoutQuery,
        supabase.from("vehicles").select("*"),
        fuelQuery,
      ]);

      if (checkoutsRes.error) throw checkoutsRes.error;
      if (vehiclesRes.error) throw vehiclesRes.error;

      const checkouts = checkoutsRes.data || [];
      const vehicles = vehiclesRes.data || [];
      const fuelRecords = fuelRes.data || [];

      // KM per vehicle
      const kmByVehicle: Record<string, { name: string; plate: string; totalKm: number; trips: number }> = {};
      checkouts.forEach((c: any) => {
        if (c.km_checkin && c.km_checkout) {
          const key = c.vehicles.id;
          if (!kmByVehicle[key]) {
            kmByVehicle[key] = { name: c.vehicles.name, plate: c.vehicles.plate, totalKm: 0, trips: 0 };
          }
          kmByVehicle[key].totalKm += c.km_checkin - c.km_checkout;
          kmByVehicle[key].trips += 1;
        }
      });
      const kmData = Object.values(kmByVehicle).sort((a, b) => b.totalKm - a.totalKm).slice(0, 10);

      // Monthly trend
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const ms = startOfMonth(date);
        const me = endOfMonth(date);
        const monthCheckouts = checkouts.filter((c: any) => {
          const d = new Date(c.checkout_date);
          return d >= ms && d <= me;
        });
        const totalKm = monthCheckouts.reduce((sum: number, c: any) => {
          if (c.km_checkin && c.km_checkout) return sum + (c.km_checkin - c.km_checkout);
          return sum;
        }, 0);
        monthlyData.push({ month: format(date, "MMM/yy", { locale: ptBR }), viagens: monthCheckouts.length, km: totalKm });
      }

      // Destination ranking
      const destCounts: Record<string, number> = {};
      checkouts.forEach((c: any) => {
        const dest = c.destination || "Sem destino";
        destCounts[dest] = (destCounts[dest] || 0) + 1;
      });
      const destData = Object.entries(destCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

      // Fuel stats per vehicle
      const fuelByVehicle: Record<string, { name: string; liters: number; cost: number }> = {};
      fuelRecords.forEach((f: any) => {
        const key = f.vehicle_id;
        if (!fuelByVehicle[key]) fuelByVehicle[key] = { name: f.vehicles?.name || "?", liters: 0, cost: 0 };
        fuelByVehicle[key].liters += parseFloat(f.liters);
        fuelByVehicle[key].cost += parseFloat(f.total_cost || 0);
      });
      const fuelData = Object.values(fuelByVehicle).sort((a, b) => b.cost - a.cost).slice(0, 10);

      return {
        kmData, monthlyData, destData, fuelData,
        totalTrips: checkouts.length,
        totalKmAll: Object.values(kmByVehicle).reduce((s, v) => s + v.totalKm, 0),
        refueledCount: checkouts.filter((c: any) => c.refueled === true).length,
        vehicleCount: vehicles.length,
      };
    },
  });

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  const exportPDF = async () => {
    if (!data) return;
    const headers = ["Veículo", "Placa", "KM Total", "Viagens", "Média KM/Viagem"];
    const rows = data.kmData.map(v => [v.name, v.plate, v.totalKm.toLocaleString(), v.trips.toString(), v.trips > 0 ? Math.round(v.totalKm / v.trips).toLocaleString() : "0"]);
    await exportToPDF({ title: "Relatório de Veículos — KM por Veículo", headers, rows, filename: `relatorio-veiculos-${format(new Date(), "yyyy-MM-dd")}` });
    toast.success("PDF exportado!");
  };

  const exportExcel = () => {
    if (!data) return;
    const headers = ["Veículo", "Placa", "KM Total", "Viagens", "Média KM"];
    const rows = data.kmData.map(v => [v.name, v.plate, v.totalKm, v.trips, v.trips > 0 ? Math.round(v.totalKm / v.trips) : 0]);
    exportToExcel({ title: "Relatório de Veículos — KM por Veículo", headers, rows, filename: `relatorio-veiculos-${format(new Date(), "yyyy-MM-dd")}` });
    toast.success("Excel exportado!");
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="hidden sm:block">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics de Veículos</h2>
          <p className="text-muted-foreground">Métricas e estatísticas da frota</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2"><FileText className="w-4 h-4" /> PDF</Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2"><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
        </div>
      </div>

      {/* Period Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Período</p>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="1y">Este ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {periodFilter === "custom" && (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium">De</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : "Início"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Até</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yyyy") : "Fim"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Viagens</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.totalTrips}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KM Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.totalKmAll.toLocaleString()} km</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frota</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.vehicleCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abastecidos na Volta</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{data.refueledCount}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>KM por Veículo</CardTitle>
            <CardDescription>Top 10 veículos por quilometragem</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.kmData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
                <Bar dataKey="totalKm" name="KM Total" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Destinos Frequentes</CardTitle>
            <CardDescription>Destinos mais visitados</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.destData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {data.destData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendência Mensal</CardTitle>
          <CardDescription>Viagens e KM nos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
              <Legend />
              <Bar yAxisId="left" dataKey="viagens" name="Viagens" fill="hsl(var(--primary))" />
              <Bar yAxisId="right" dataKey="km" name="KM" fill="hsl(var(--chart-2))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {data.fuelData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custo de Combustível por Veículo</CardTitle>
            <CardDescription>Top 10 por gasto</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.fuelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                <Bar dataKey="cost" name="Custo (R$)" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
