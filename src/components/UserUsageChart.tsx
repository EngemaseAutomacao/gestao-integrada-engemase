import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";

interface UserUsageChartProps {
  userId: string;
}

export function UserUsageChart({ userId }: UserUsageChartProps) {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["user-usage-chart", userId],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();

        const [checkoutsRes, checkinsRes] = await Promise.all([
          supabase
            .from("tool_checkouts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("checkout_date", start)
            .lte("checkout_date", end),
          supabase
            .from("tool_checkouts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .not("checkin_date", "is", null)
            .gte("checkin_date", start)
            .lte("checkin_date", end),
        ]);

        months.push({
          month: format(date, "MMM", { locale: ptBR }),
          retiradas: checkoutsRes.count || 0,
          devoluções: checkinsRes.count || 0,
        });
      }
      return months;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = chartData?.some(d => d.retiradas > 0 || d.devoluções > 0);

  if (!hasData) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Meu Uso Mensal
        </CardTitle>
        <CardDescription className="text-xs">Retiradas e devoluções nos últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ 
                borderRadius: "8px", 
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--card-foreground))",
              }} 
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="retiradas" name="Retiradas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="devoluções" name="Devoluções" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
