import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoryEntry {
  id: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string;
  construction_site: string | null;
  estimated_return_date: string | null;
  tools: {
    name: string;
  };
  notes: string | null;
}

export default function UserHistory() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("tool_checkouts")
        .select(`
          id,
          checkout_date,
          checkin_date,
          status,
          construction_site,
          estimated_return_date,
          notes,
          tools (name)
        `)
        .eq("user_id", profile!.id)
        .order("checkout_date", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <HistoryIcon className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Meu Histórico</h2>
        <p className="text-muted-foreground">Histórico de retiradas e devoluções</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>
            Categoria: {profile?.category === "engemase_employee" ? "Funcionário Engemase" : "Usuário Terceirizado"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma movimentação encontrada
            </p>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{entry.tools.name}</h3>
                          <Badge variant={entry.status === "checked_out" ? "default" : "secondary"}>
                            {entry.status === "checked_out" ? "Em Uso" : "Devolvida"}
                          </Badge>
                          {entry.estimated_return_date && entry.status === "checked_out" && new Date(entry.estimated_return_date) < new Date() && (
                            <Badge variant="destructive">Atrasado</Badge>
                          )}
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {entry.construction_site && (
                            <p>
                              <span className="font-medium text-foreground">Obra:</span> {entry.construction_site}
                            </p>
                          )}
                          <p>
                            <span className="font-medium text-foreground">Retirada:</span> {format(new Date(entry.checkout_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {entry.estimated_return_date && (
                            <p className={entry.status === "checked_out" && new Date(entry.estimated_return_date) < new Date() ? "text-destructive font-medium" : ""}>
                              <span className="font-medium text-foreground">Previsão de Devolução:</span> {format(new Date(entry.estimated_return_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                          {entry.checkin_date && (
                            <p>
                              <span className="font-medium text-foreground">Devolução Real:</span> {format(new Date(entry.checkin_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                          {entry.notes && (
                            <p className="text-foreground mt-2">
                              <span className="font-medium">Obs:</span> {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
