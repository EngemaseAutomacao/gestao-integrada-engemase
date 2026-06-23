import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronRight, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingItem {
  id: string;
  tool_id: string;
  estimated_return_date: string | null;
  selected_tag: string | null;
  tools: { name: string } | null;
}

interface HomePendingCardProps {
  userId: string;
}

export function HomePendingCard({ userId }: HomePendingCardProps) {
  const { data: pending, isLoading } = useQuery({
    queryKey: ["home-pending-tool-checkouts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_checkouts")
        .select("id, tool_id, estimated_return_date, selected_tag, tools (name)")
        .eq("user_id", userId)
        .eq("status", "checked_out")
        .order("estimated_return_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as PendingItem[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  if (isLoading || !pending) return null;

  const total = pending.length;
  const overdueCount = pending.filter(
    (p) => p.estimated_return_date && new Date(p.estimated_return_date) < new Date()
  ).length;

  // Top 3 mais urgentes (atrasadas primeiro, depois mais próximas)
  const sorted = [...pending].sort((a, b) => {
    const aDate = a.estimated_return_date ? new Date(a.estimated_return_date).getTime() : Infinity;
    const bDate = b.estimated_return_date ? new Date(b.estimated_return_date).getTime() : Infinity;
    return aDate - bDate;
  });
  const top = sorted.slice(0, 3);

  if (total === 0) {
    return (
      <div className="rounded-2xl border bg-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm">Nenhuma pendência</p>
          <p className="text-xs text-muted-foreground">Você não tem ferramentas para devolver.</p>
        </div>
      </div>
    );
  }

  const headerClass = overdueCount > 0 ? "text-destructive" : "text-warning";
  const headerBg = overdueCount > 0 ? "bg-destructive/10" : "bg-warning/10";
  const borderClass = overdueCount > 0 ? "border-destructive/30" : "border-warning/30";

  return (
    <div className={`rounded-2xl border ${borderClass} bg-card overflow-hidden`}>
      <div className="p-3 sm:p-4 flex items-center gap-3 border-b">
        <div className={`w-10 h-10 rounded-xl ${headerBg} ${headerClass} flex items-center justify-center shrink-0`}>
          <Clock className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm">
            Devoluções pendentes
          </p>
          <p className="text-xs text-muted-foreground">
            {total} ferramenta{total > 1 ? "s" : ""} para devolver
            {overdueCount > 0 && (
              <span className="text-destructive font-medium"> · {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
        {total > top.length && (
          <Link
            to="/ferramentas/dashboard"
            className="text-[11px] font-semibold text-primary hover:underline shrink-0"
          >
            Ver todas →
          </Link>
        )}
      </div>

      <ul className="divide-y">
        {top.map((p) => {
          const overdue = p.estimated_return_date && new Date(p.estimated_return_date) < new Date();
          return (
            <li key={p.id}>
              <Link
                to={`/ferramentas/${p.tool_id}`}
                className="flex items-center gap-3 px-3 sm:px-4 py-2.5 hover:bg-muted/40 transition-colors active:scale-[0.99]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{p.tools?.name || "Ferramenta"}</p>
                    {p.selected_tag && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                        {p.selected_tag}
                      </Badge>
                    )}
                  </div>
                  <p className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {p.estimated_return_date
                      ? overdue
                        ? `⚠️ Atrasada desde ${format(new Date(p.estimated_return_date), "dd/MM", { locale: ptBR })}`
                        : `Devolver até ${format(new Date(p.estimated_return_date), "dd/MM", { locale: ptBR })}`
                      : "Sem data prevista"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
