import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Clock, AlertTriangle, Package, Users, Wrench, Trophy, CalendarIcon } from "lucide-react";
import { Navigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { format, subMonths, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface ToolUsageData {
  name: string;
  count: number;
}

interface DelayRateData {
  name: string;
  delays: number;
  total: number;
  rate: number;
}

interface MonthlyData {
  month: string;
  checkouts: number;
  checkins: number;
  delays: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface UserRankingData {
  name: string;
  checkouts: number;
  category: string;
}

interface AnalyticsMetrics {
  totalCheckouts: number;
  averageUsageDays: number;
  totalDelays: number;
  activeCheckouts: number;
  totalTools: number;
  toolsInUse: number;
  totalUsers: number;
  maintenanceCount: number;
  totalVehicleCheckouts: number;
  totalKmDriven: number;
  activeVehicles: number;
}

interface VehicleMonthlyData {
  month: string;
  checkouts: number;
  km: number;
}

export default function AdminAnalytics() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    totalCheckouts: 0,
    averageUsageDays: 0,
    totalDelays: 0,
    activeCheckouts: 0,
    totalTools: 0,
    toolsInUse: 0,
    totalUsers: 0,
    maintenanceCount: 0,
    totalVehicleCheckouts: 0,
    totalKmDriven: 0,
    activeVehicles: 0,
  });
  const [topTools, setTopTools] = useState<ToolUsageData[]>([]);
  const [delaysBySite, setDelaysBySite] = useState<DelayRateData[]>([]);
  const [delaysByUser, setDelaysByUser] = useState<DelayRateData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [userRanking, setUserRanking] = useState<UserRankingData[]>([]);
  const [vehicleMonthlyData, setVehicleMonthlyData] = useState<VehicleMonthlyData[]>([]);

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

  useEffect(() => {
    loadAnalytics();
  }, [periodFilter, startDate, endDate]);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const loadAnalytics = async () => {
    try {
      // Fetch all checkouts
      let query = supabase
        .from("tool_checkouts")
        .select(`
          id,
          checkout_date,
          checkin_date,
          status,
          construction_site,
          estimated_return_date,
          user_id,
          tool_id,
          tools (name),
          profiles!tool_checkouts_user_id_fkey (full_name, category)
        `);

      const range = getDateRange();
      if (range.from) query = query.gte("checkout_date", range.from.toISOString());
      if (range.to) query = query.lte("checkout_date", range.to.toISOString());

      const { data: checkouts, error } = await query;

      if (error) throw error;

      // Fetch tools count
      const { data: tools } = await supabase.from("tools").select("id, quantity_available, quantity_total");
      
      // Fetch users count
      const { data: users } = await supabase.from("profiles").select("id, category");
      
      // Fetch maintenance count
      const { data: maintenances } = await supabase.from("maintenance_records").select("id");

      // Fetch vehicle checkouts
      let vQuery = supabase
        .from("vehicle_checkouts")
        .select("id, checkout_date, checkin_date, km_checkout, km_checkin, status");
      if (range.from) vQuery = vQuery.gte("checkout_date", range.from.toISOString());
      if (range.to) vQuery = vQuery.lte("checkout_date", range.to.toISOString());
      const { data: vehicleCheckouts } = await vQuery;

      // Calculate metrics
      const totalCheckouts = checkouts?.length || 0;
      const activeCheckouts = checkouts?.filter(c => c.status === "checked_out").length || 0;
      const totalTools = tools?.length || 0;
      const toolsInUse = tools?.filter(t => t.quantity_available < t.quantity_total).length || 0;
      const totalUsers = users?.length || 0;
      const maintenanceCount = maintenances?.length || 0;
      const totalVehicleCheckouts = vehicleCheckouts?.length || 0;
      const activeVehicles = vehicleCheckouts?.filter(v => v.status === "checked_out").length || 0;
      const totalKmDriven = vehicleCheckouts?.reduce((sum, v) => {
        if (v.km_checkin && v.km_checkout) return sum + (v.km_checkin - v.km_checkout);
        return sum;
      }, 0) || 0;
      
      // Calculate average usage time
      const completedCheckouts = checkouts?.filter(c => c.checkin_date) || [];
      const totalDays = completedCheckouts.reduce((sum, c) => {
        const checkout = new Date(c.checkout_date);
        const checkin = new Date(c.checkin_date!);
        const days = (checkin.getTime() - checkout.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      const averageUsageDays = completedCheckouts.length > 0 
        ? Math.round(totalDays / completedCheckouts.length) 
        : 0;

      // Count delays
      const totalDelays = checkouts?.filter(c => {
        if (!c.estimated_return_date) return false;
        const returnDate = c.checkin_date ? new Date(c.checkin_date) : new Date();
        return returnDate > new Date(c.estimated_return_date);
      }).length || 0;

      setMetrics({
        totalCheckouts,
        averageUsageDays,
        totalDelays,
        activeCheckouts,
        totalTools,
        toolsInUse,
        totalUsers,
        maintenanceCount,
        totalVehicleCheckouts,
        totalKmDriven,
        activeVehicles,
      });

      // Vehicle monthly trend
      const vMonthlyStats: VehicleMonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        const monthVCheckouts = vehicleCheckouts?.filter(v => {
          const d = new Date(v.checkout_date);
          return d >= monthStart && d <= monthEnd;
        }) || [];
        const monthKm = monthVCheckouts.reduce((sum, v) => {
          if (v.km_checkin && v.km_checkout) return sum + (v.km_checkin - v.km_checkout);
          return sum;
        }, 0);
        vMonthlyStats.push({
          month: format(date, "MMM/yy", { locale: ptBR }),
          checkouts: monthVCheckouts.length,
          km: monthKm,
        });
      }
      setVehicleMonthlyData(vMonthlyStats);

      // Top 10 most requested tools
      const toolCounts: Record<string, number> = {};
      checkouts?.forEach(c => {
        const toolName = c.tools?.name || "Desconhecido";
        toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
      });
      const topToolsData = Object.entries(toolCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTopTools(topToolsData);

      // Delays by construction site
      const siteDelays: Record<string, { delays: number; total: number }> = {};
      checkouts?.forEach(c => {
        const site = c.construction_site || "Sem Obra";
        if (!siteDelays[site]) {
          siteDelays[site] = { delays: 0, total: 0 };
        }
        siteDelays[site].total += 1;
        if (c.estimated_return_date) {
          const returnDate = c.checkin_date ? new Date(c.checkin_date) : new Date();
          if (returnDate > new Date(c.estimated_return_date)) {
            siteDelays[site].delays += 1;
          }
        }
      });
      const siteDelayData = Object.entries(siteDelays)
        .map(([name, data]) => ({
          name,
          delays: data.delays,
          total: data.total,
          rate: Math.round((data.delays / data.total) * 100),
        }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5);
      setDelaysBySite(siteDelayData);

      // Delays by user
      const userDelays: Record<string, { delays: number; total: number }> = {};
      checkouts?.forEach(c => {
        const userName = c.profiles?.full_name || "Desconhecido";
        if (!userDelays[userName]) {
          userDelays[userName] = { delays: 0, total: 0 };
        }
        userDelays[userName].total += 1;
        if (c.estimated_return_date) {
          const returnDate = c.checkin_date ? new Date(c.checkin_date) : new Date();
          if (returnDate > new Date(c.estimated_return_date)) {
            userDelays[userName].delays += 1;
          }
        }
      });
      const userDelayData = Object.entries(userDelays)
        .map(([name, data]) => ({
          name,
          delays: data.delays,
          total: data.total,
          rate: Math.round((data.delays / data.total) * 100),
        }))
        .filter(d => d.delays > 0)
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5);
      setDelaysByUser(userDelayData);

      // Monthly trend (last 6 months)
      const monthlyStats: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        const monthCheckouts = checkouts?.filter(c => {
          const checkoutDate = new Date(c.checkout_date);
          return checkoutDate >= monthStart && checkoutDate <= monthEnd;
        }) || [];
        
        const monthCheckins = checkouts?.filter(c => {
          if (!c.checkin_date) return false;
          const checkinDate = new Date(c.checkin_date);
          return checkinDate >= monthStart && checkinDate <= monthEnd;
        }) || [];
        
        const monthDelays = monthCheckouts.filter(c => {
          if (!c.estimated_return_date) return false;
          const returnDate = c.checkin_date ? new Date(c.checkin_date) : new Date();
          return returnDate > new Date(c.estimated_return_date);
        }).length;
        
        monthlyStats.push({
          month: format(date, "MMM/yy", { locale: ptBR }),
          checkouts: monthCheckouts.length,
          checkins: monthCheckins.length,
          delays: monthDelays,
        });
      }
      setMonthlyData(monthlyStats);

      // Category distribution
      const employeeCheckouts = checkouts?.filter(c => c.profiles?.category === "engemase_employee").length || 0;
      const thirdPartyCheckouts = checkouts?.filter(c => c.profiles?.category === "third_party").length || 0;
      setCategoryData([
        { name: "Funcionários", value: employeeCheckouts },
        { name: "Terceirizados", value: thirdPartyCheckouts },
      ]);

      // User ranking - top 10 users by checkouts
      const userCounts: Record<string, { count: number; category: string }> = {};
      checkouts?.forEach(c => {
        const userName = c.profiles?.full_name || "Desconhecido";
        const userCat = c.profiles?.category === "engemase_employee" ? "Funcionário" : "Terceirizado";
        if (!userCounts[userName]) {
          userCounts[userName] = { count: 0, category: userCat };
        }
        userCounts[userName].count += 1;
      });
      const userRankingData = Object.entries(userCounts)
        .map(([name, data]) => ({ name, checkouts: data.count, category: data.category }))
        .sort((a, b) => b.checkouts - a.checkouts)
        .slice(0, 10);
      setUserRanking(userRankingData);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Analítico</h2>
          <p className="text-muted-foreground">Métricas e estatísticas de uso das ferramentas</p>
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

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Retiradas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCheckouts}</div>
            <p className="text-xs text-muted-foreground">Todas as movimentações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Uso</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageUsageDays} dias</div>
            <p className="text-xs text-muted-foreground">Média de todas as devoluções</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Atrasos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDelays}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalCheckouts > 0 
                ? `${Math.round((metrics.totalDelays / metrics.totalCheckouts) * 100)}% das retiradas`
                : "0% das retiradas"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Uso Atualmente</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCheckouts}</div>
            <p className="text-xs text-muted-foreground">Ferramentas não devolvidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ferramentas</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTools}</div>
            <p className="text-xs text-muted-foreground">{metrics.toolsInUse} em uso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manutenções</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.maintenanceCount}</div>
            <p className="text-xs text-muted-foreground">Registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Atraso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalCheckouts > 0 
                ? `${Math.round((metrics.totalDelays / metrics.totalCheckouts) * 100)}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">Geral</p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saídas de Veículos</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalVehicleCheckouts}</div>
            <p className="text-xs text-muted-foreground">{metrics.activeVehicles} em uso agora</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KM Total Rodado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalKmDriven.toLocaleString("pt-BR")} km</div>
            <p className="text-xs text-muted-foreground">Todas as viagens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KM Médio por Viagem</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalVehicleCheckouts > 0 
                ? Math.round(metrics.totalKmDriven / metrics.totalVehicleCheckouts).toLocaleString("pt-BR")
                : 0} km
            </div>
            <p className="text-xs text-muted-foreground">Média geral</p>
          </CardContent>
        </Card>
      </div>
      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência Mensal</CardTitle>
          <CardDescription>Retiradas, devoluções e atrasos nos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="checkouts" name="Retiradas" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
              <Area type="monotone" dataKey="checkins" name="Devoluções" stackId="2" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} />
              <Area type="monotone" dataKey="delays" name="Atrasos" stackId="3" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Tools Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ferramentas Mais Requisitadas</CardTitle>
            <CardDescription>Top 10 ferramentas por número de retiradas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topTools} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Uso por Categoria</CardTitle>
            <CardDescription>Distribuição de retiradas por tipo de usuário</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Tools Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Ranking de Ferramentas
            </CardTitle>
            <CardDescription>Ferramentas mais retiradas do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topTools.slice(0, 10).map((tool, index) => (
                <div key={tool.name} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    index === 0 ? "bg-yellow-500/20 text-yellow-600" :
                    index === 1 ? "bg-gray-300/30 text-gray-600" :
                    index === 2 ? "bg-orange-400/20 text-orange-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate capitalize">{tool.name.toLowerCase()}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{tool.count} usos</span>
                </div>
              ))}
              {topTools.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sem dados disponíveis</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Users Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Ranking de Usuários
            </CardTitle>
            <CardDescription>Usuários que mais utilizam o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userRanking.map((user, index) => (
                <div key={user.name} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    index === 0 ? "bg-yellow-500/20 text-yellow-600" :
                    index === 1 ? "bg-gray-300/30 text-gray-600" :
                    index === 2 ? "bg-orange-400/20 text-orange-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.category}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{user.checkouts} retiradas</span>
                </div>
              ))}
              {userRanking.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sem dados disponíveis</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Delays by Site Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Atraso por Obra</CardTitle>
            <CardDescription>Top 5 obras com maior taxa de atraso</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={delaysBySite}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value, name) => {
                    if (name === "rate") return [`${value}%`, "Taxa de Atraso"];
                    return [value, name === "delays" ? "Atrasos" : "Total"];
                  }}
                />
                <Bar dataKey="rate" fill="hsl(var(--destructive))" name="Taxa (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Delays by User Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Taxa de Atraso por Usuário</CardTitle>
            <CardDescription>Top 5 usuários com maior taxa de atraso</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={delaysByUser}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value, name) => {
                    if (name === "rate") return [`${value}%`, "Taxa de Atraso"];
                    return [value, name === "delays" ? "Atrasos" : "Total"];
                  }}
                />
                <Bar dataKey="rate" fill="hsl(var(--warning))" name="Taxa (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
