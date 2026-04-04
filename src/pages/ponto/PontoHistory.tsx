import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Loader2, Calendar, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimeEntry {
  id: string;
  entry_date: string;
  clock_in: string;
  clock_out: string | null;
  clock_in_address: string | null;
  clock_out_address: string | null;
  construction_site: string | null;
  notes: string | null;
  status: string;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}min`;
}

export default function PontoHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchEntries();
  }, [user]);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", user!.id)
      .order("clock_in", { ascending: false })
      .limit(50);

    if (!error && data) {
      setEntries(data as TimeEntry[]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      <div className="shrink-0 hidden sm:block">
        <h1 className="text-3xl font-bold text-foreground">Meu Histórico de Ponto</h1>
        <p className="text-muted-foreground mt-1">Seus registros de entrada e saída</p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum registro de ponto encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          {entries.map((entry) => {
            const duration = entry.clock_out
              ? differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in))
              : null;

            return (
              <Card key={entry.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {format(new Date(entry.clock_in), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                    </CardTitle>
                    <Badge variant={entry.status === "open" ? "default" : "secondary"}>
                      {entry.status === "open" ? "Aberto" : "Fechado"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Entrada:</span>
                      <span>{format(new Date(entry.clock_in), "HH:mm")}</span>
                    </div>
                    {entry.clock_out && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-red-500" />
                        <span className="font-medium">Saída:</span>
                        <span>{format(new Date(entry.clock_out), "HH:mm")}</span>
                      </div>
                    )}
                    {duration !== null && (
                      <Badge variant="outline">{formatDuration(duration)}</Badge>
                    )}
                  </div>

                  {entry.clock_in_address && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{entry.clock_in_address.split(",").slice(0, 3).join(",")}</span>
                    </p>
                  )}

                  {entry.notes && (
                    <p className="text-xs text-muted-foreground italic">"{entry.notes}"</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
