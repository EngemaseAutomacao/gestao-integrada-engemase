import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ModuleHero } from "@/components/ModuleHero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PendingItem {
  id: string;
  tool_id: string;
  checkout_date: string;
  estimated_return_date: string | null;
  selected_tag: string | null;
  construction_site: string | null;
  tools: { name: string; tag: string | null } | null;
}

export default function DevolucoesPendentes() {
  const { profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["devolucoes-pendentes", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("tool_checkouts")
        .select(
          "id, tool_id, checkout_date, estimated_return_date, selected_tag, construction_site, tools (name, tag)"
        )
        .eq("user_id", profile.id)
        .eq("status", "checked_out")
        .order("estimated_return_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as PendingItem[];
    },
    enabled: !!profile?.id,
  });

  const items = data || [];
  const overdueCount = items.filter(
    (p) => p.estimated_return_date && new Date(p.estimated_return_date) < new Date()
  ).length;

  return (
    <div className="space-y-4">
      <ModuleHero
        eyebrow="Módulo · Pendências"
        title="Devoluções Pendentes"
        subtitle={
          items.length === 0
            ? "Nenhuma ferramenta aguardando devolução"
            : `${items.length} ferramenta${items.length > 1 ? "s" : ""} para devolver${
                overdueCount > 0 ? ` · ${overdueCount} atrasada${overdueCount > 1 ? "s" : ""}` : ""
              }`
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-success" />
            <p className="font-medium">Tudo em dia!</p>
            <p className="text-sm mt-1">Você não tem ferramentas para devolver.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y">
            {items.map((p) => {
              const overdue =
                p.estimated_return_date && new Date(p.estimated_return_date) < new Date();
              return (
                <li key={p.id}>
                  <Link
                    to={`/ferramentas/${p.tool_id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors active:scale-[0.99]"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        overdue
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {p.tools?.name || "Ferramenta"}
                        </p>
                        {p.selected_tag && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4 font-mono"
                          >
                            {p.selected_tag}
                          </Badge>
                        )}
                      </div>
                      <p
                        className={`text-xs ${
                          overdue
                            ? "text-destructive font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {p.estimated_return_date
                          ? overdue
                            ? `⚠️ Atrasada desde ${format(
                                new Date(p.estimated_return_date),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )}`
                            : `Devolver até ${format(
                                new Date(p.estimated_return_date),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )}`
                          : `Retirada em ${format(new Date(p.checkout_date), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}`}
                      </p>
                      {p.construction_site && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          Obra: {p.construction_site}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
