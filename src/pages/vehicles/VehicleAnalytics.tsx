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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export default function VehicleAnalytics() {
  const { profile } = useAuth();

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-analytics"],
    queryFn: async () => {
      const [checkoutsRes, vehiclesRes, fuelRes] = await Promise.all([
        supabase.from("vehicle_checkouts").select(`
          id, checkout_date, checkin_date, km_checkout, km_checkin, status, destination, refueled,
          vehicles!inner(id, name, plate),
          profiles!vehicle_checkouts_user_id_fkey(full_name)
        `),
        supabase.from("vehicles").select("*"),
        supabase.from("fuel_records").select(`*, vehicles(name, plate)`),
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

  const exportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Veículos - KM por Veículo", 14, 20);
    doc.setFontSize(11);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 28);
    autoTable(doc, {
      head: [["Veículo", "Placa", "KM Total", "Viagens", "Média KM/Viagem"]],
      body: data.kmData.map(v => [v.name, v.plate, v.totalKm.toLocaleString(), v.trips.toString(), v.trips > 0 ? Math.round(v.totalKm / v.trips).toLocaleString() : "0"]),
      startY: 34, styles: { fontSize: 9 }, headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`relatorio-veiculos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportado!");
  };

  const exportExcel = () => {
    if (!data) return;
    const rows = data.kmData.map(v => ({ Veículo: v.name, Placa: v.plate, "KM Total": v.totalKm, Viagens: v.trips, "Média KM": v.trips > 0 ? Math.round(v.totalKm / v.trips) : 0 }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KM por Veículo");
    XLSX.writeFile(wb, `relatorio-veiculos-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Excel exportado!");
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics de Veículos</h2>
          <p className="text-muted-foreground">Métricas e estatísticas da frota</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2"><FileText className="w-4 h-4" /> PDF</Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2"><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
        </div>
      </div>

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
