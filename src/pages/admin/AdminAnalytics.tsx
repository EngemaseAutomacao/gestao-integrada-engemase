import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Clock, AlertTriangle, Package } from "lucide-react";
import { Navigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

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

interface AnalyticsMetrics {
  totalCheckouts: number;
  averageUsageDays: number;
  totalDelays: number;
  activeCheckouts: number;
}

export default function AdminAnalytics() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    totalCheckouts: 0,
    averageUsageDays: 0,
    totalDelays: 0,
    activeCheckouts: 0,
  });
  const [topTools, setTopTools] = useState<ToolUsageData[]>([]);
  const [delaysBySite, setDelaysBySite] = useState<DelayRateData[]>([]);
  const [delaysByUser, setDelaysByUser] = useState<DelayRateData[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const loadAnalytics = async () => {
    try {
      // Fetch all checkouts
      const { data: checkouts, error } = await supabase
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
          profiles!tool_checkouts_user_id_fkey (full_name)
        `);

      if (error) throw error;

      // Calculate metrics
      const totalCheckouts = checkouts?.length || 0;
      const activeCheckouts = checkouts?.filter(c => c.status === "checked_out").length || 0;
      
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
      });

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
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Analítico</h2>
        <p className="text-muted-foreground">Métricas e estatísticas de uso das ferramentas</p>
      </div>

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
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCheckouts}</div>
            <p className="text-xs text-muted-foreground">Ferramentas não devolvidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Tools Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ferramentas Mais Requisitadas</CardTitle>
            <CardDescription>Top 10 ferramentas por número de retiradas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topTools}>
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
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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

        {/* Tool Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Uso</CardTitle>
            <CardDescription>Proporção das 5 ferramentas mais usadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topTools.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="count"
                >
                  {topTools.slice(0, 5).map((entry, index) => (
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
    </div>
  );
}
