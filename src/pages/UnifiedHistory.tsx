import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SignedImage } from "@/components/SignedImage";
import { Loader2, Wrench, Car, Clock, Eye } from "lucide-react";
import { format, subDays, subMonths, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UnifiedEvent {
  id: string;
  type: "tool" | "vehicle" | "ponto";
  date: string;
  title: string;
  subtitle: string;
  status: string;
  endDate?: string | null;
  raw?: any;
}

interface UnifiedHistoryProps {
  embedded?: boolean;
  title?: string;
  description?: string;
}

export default function UnifiedHistory({
  embedded = false,
  title = "Meu Dia",
  description = "Visão unificada de ferramentas, veículos e ponto",
}: UnifiedHistoryProps) {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("tipo") || "all";
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("7d");
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [selected, setSelected] = useState<UnifiedEvent | null>(null);

  useEffect(() => {
    if (profile?.id) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, periodFilter]);

  const getStartDate = () => {
    const now = new Date();
    switch (periodFilter) {
      case "today": return startOfDay(now).toISOString();
      case "7d": return subDays(now, 7).toISOString();
      case "30d": return subDays(now, 30).toISOString();
      case "3m": return subMonths(now, 3).toISOString();
      default: return subDays(now, 7).toISOString();
    }
  };

  const loadAll = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const since = getStartDate();

    const [toolsRes, vehiclesRes, pontoRes] = await Promise.all([
      supabase
        .from("tool_checkouts")
        .select("id, checkout_date, checkin_date, status, construction_site, estimated_return_date, selected_tag, notes, checkout_photo_url, checkin_photo_url, checkout_signature_url, checkin_signature_url, tools(name, tag, brand)")
        .eq("user_id", profile.id)
        .gte("checkout_date", since)
        .order("checkout_date", { ascending: false })
        .limit(200),
      supabase
        .from("vehicle_checkouts")
        .select("id, checkout_date, checkin_date, status, destination, destination_address, km_checkout, km_checkin, refueled, notes, vehicles(name, plate, brand, model)")
        .eq("user_id", profile.id)
        .gte("checkout_date", since)
        .order("checkout_date", { ascending: false })
        .limit(200),
      supabase
        .from("time_entries")
        .select("id, clock_in, clock_out, status, construction_site, client_name, entry_type, clock_in_address, clock_out_address, notes")
        .eq("user_id", profile.id)
        .gte("clock_in", since)
        .order("clock_in", { ascending: false })
        .limit(200),
    ]);

    const unified: UnifiedEvent[] = [];

    (toolsRes.data || []).forEach((t: any) => {
      unified.push({
        id: `tool-${t.id}`,
        type: "tool",
        date: t.checkout_date,
        title: t.tools?.name || "Ferramenta",
        subtitle: t.construction_site || "Sem obra",
        status: t.status === "checked_out" ? "Em uso" : "Devolvido",
        endDate: t.checkin_date,
        raw: t,
      });
    });

    (vehiclesRes.data || []).forEach((v: any) => {
      unified.push({
        id: `vehicle-${v.id}`,
        type: "vehicle",
        date: v.checkout_date,
        title: `${v.vehicles?.name || "Veículo"} (${v.vehicles?.plate || ""})`,
        subtitle: v.destination || "Sem destino",
        status: v.status === "checked_out" ? "Em uso" : "Devolvido",
        endDate: v.checkin_date,
        raw: v,
      });
    });

    (pontoRes.data || []).forEach((p: any) => {
      const label = p.entry_type === "obra" ? (p.construction_site || "Obra") : (p.client_name || "Cliente");
      const duration = p.clock_out
        ? `${Math.round((new Date(p.clock_out).getTime() - new Date(p.clock_in).getTime()) / 60000)}min`
        : "Aberto";
      unified.push({
        id: `ponto-${p.id}`,
        type: "ponto",
        date: p.clock_in,
        title: `Ponto — ${label}`,
        subtitle: duration,
        status: p.status === "open" ? "Aberto" : "Fechado",
        endDate: p.clock_out,
        raw: p,
      });
    });

    unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEvents(unified);
    setLoading(false);
  };

  const iconMap = {
    tool: <Wrench className="w-4 h-4" aria-hidden="true" />,
    vehicle: <Car className="w-4 h-4" aria-hidden="true" />,
    ponto: <Clock className="w-4 h-4" aria-hidden="true" />,
  };

  const colorMap = {
    tool: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    vehicle: "bg-green-500/10 text-green-600 dark:text-green-400",
    ponto: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  };

  const filtered = typeFilter === "all" ? events : events.filter((e) => e.type === typeFilter);

  const grouped = filtered.reduce<Record<string, UnifiedEvent[]>>((acc, ev) => {
    const day = format(new Date(ev.date), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = [];
    acc[day].push(ev);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Carregando histórico</span>
      </div>
    );
  }

  const renderDetails = (ev: UnifiedEvent) => {
    const r = ev.raw || {};
    if (ev.type === "tool") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Ferramenta</p>
              <p className="font-semibold">{r.tools?.name}</p>
              {r.tools?.brand && <p className="text-xs text-muted-foreground">{r.tools.brand}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">TAG</p>
              <p className="font-mono text-sm">{r.selected_tag || r.tools?.tag || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Obra</p>
              <p>{r.construction_site || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={r.status === "checked_out" ? "default" : "secondary"}>
                {r.status === "checked_out" ? "Em Uso" : "Devolvida"}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Retirada</p>
              <p>{format(new Date(r.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Devolução</p>
              <p>{r.checkin_date ? format(new Date(r.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</p>
            </div>
            {r.estimated_return_date && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Devolução Prevista</p>
                <p>{format(new Date(r.estimated_return_date), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            )}
          </div>
          {(r.checkout_photo_url || r.checkin_photo_url) && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
              {r.checkout_photo_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Foto Retirada</p>
                  <SignedImage storagePath={r.checkout_photo_url} alt="Retirada" className="w-full h-32 object-cover rounded" />
                </div>
              )}
              {r.checkin_photo_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Foto Devolução</p>
                  <SignedImage storagePath={r.checkin_photo_url} alt="Devolução" className="w-full h-32 object-cover rounded" />
                </div>
              )}
            </div>
          )}
          {r.notes && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground">Observações</p>
              <p className="text-sm">{r.notes}</p>
            </div>
          )}
        </div>
      );
    }
    if (ev.type === "vehicle") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Veículo</p>
              <p className="font-semibold">{r.vehicles?.name}</p>
              <p className="text-xs text-muted-foreground">{r.vehicles?.plate}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Destino</p>
              <p>{r.destination || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">KM Saída</p>
              <p>{r.km_checkout?.toLocaleString() ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">KM Chegada</p>
              <p>{r.km_checkin?.toLocaleString() ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saída</p>
              <p>{format(new Date(r.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chegada</p>
              <p>{r.checkin_date ? format(new Date(r.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Abastecido</p>
              <p>{r.refueled === null || r.refueled === undefined ? "-" : r.refueled ? "Sim" : "Não"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={r.status === "checked_out" ? "default" : "secondary"}>
                {r.status === "checked_out" ? "Em Uso" : "Devolvido"}
              </Badge>
            </div>
          </div>
          {r.notes && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground">Observações</p>
              <p className="text-sm">{r.notes}</p>
            </div>
          )}
        </div>
      );
    }
    // ponto
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p>{r.entry_type === "obra" ? "Obra" : "Cliente"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Local</p>
            <p>{r.construction_site || r.client_name || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Entrada</p>
            <p>{format(new Date(r.clock_in), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            {r.clock_in_address && <p className="text-xs text-muted-foreground">{r.clock_in_address}</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saída</p>
            <p>{r.clock_out ? format(new Date(r.clock_out), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}</p>
            {r.clock_out_address && <p className="text-xs text-muted-foreground">{r.clock_out_address}</p>}
          </div>
        </div>
        {r.notes && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">Observações</p>
            <p className="text-sm">{r.notes}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto animate-fade-in">
      {!embedded && (
        <div className="hidden sm:block">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap" role="group" aria-label="Filtros do histórico">
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[140px]" aria-label="Filtrar por período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="3m">3 meses</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]" aria-label="Filtrar por módulo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os módulos</SelectItem>
            <SelectItem value="tool">Ferramentas</SelectItem>
            <SelectItem value="vehicle">Veículos</SelectItem>
            <SelectItem value="ponto">Ponto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma atividade no período selecionado
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([day, dayEvents]) => (
          <div key={day} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background py-1 z-10">
              {format(new Date(day), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            {dayEvents.map((ev) => (
              <Card key={ev.id} className="p-3 transition-shadow hover:shadow-soft">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full shrink-0 ${colorMap[ev.type]}`}>
                    {iconMap[ev.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(ev.date), "HH:mm")}</span>
                      {ev.endDate && <span>→ {format(new Date(ev.endDate), "HH:mm")}</span>}
                      <span>• {ev.subtitle}</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      ev.status === "Em uso" || ev.status === "Aberto" || ev.status === "Pendente"
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs shrink-0"
                  >
                    {ev.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={() => setSelected(ev)}
                    aria-label="Ver detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ))
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes — {selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && renderDetails(selected)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
