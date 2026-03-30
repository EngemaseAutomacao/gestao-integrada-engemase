import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Wrench, Car, User, AlertTriangle, LogIn, LogOut, UserCheck, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";

interface SystemLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  user_name: string | null;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  checkout: "Retirada",
  checkin: "Devolução",
  user_registered: "Novo Cadastro",
  user_approved: "Usuário Aprovado",
  issue_reported: "Problema Reportado",
  issue_resolved: "Problema Resolvido",
};

const ENTITY_LABELS: Record<string, string> = {
  tool: "Ferramenta",
  vehicle: "Veículo",
  user: "Usuário",
  tool_issue: "Problema",
};

function getActionIcon(action: string, entityType: string) {
  if (entityType === "vehicle") return <Car className="w-4 h-4" />;
  if (entityType === "user") return <User className="w-4 h-4" />;
  if (entityType === "tool_issue") return <AlertTriangle className="w-4 h-4" />;
  if (action === "checkout") return <LogOut className="w-4 h-4" />;
  if (action === "checkin") return <LogIn className="w-4 h-4" />;
  return <Wrench className="w-4 h-4" />;
}

function getActionColor(action: string): string {
  switch (action) {
    case "checkout": return "border-l-orange-500";
    case "checkin": return "border-l-green-500";
    case "user_registered": return "border-l-blue-500";
    case "user_approved": return "border-l-emerald-500";
    case "issue_reported": return "border-l-red-500";
    case "issue_resolved": return "border-l-teal-500";
    default: return "border-l-primary";
  }
}

function getActionBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  switch (action) {
    case "checkout": return "default";
    case "checkin": return "secondary";
    case "issue_reported": return "destructive";
    default: return "outline";
  }
}

function buildDescription(log: SystemLog): string {
  const d = log.details;
  switch (log.action) {
    case "checkout":
      if (log.entity_type === "tool")
        return `Retirou a ferramenta "${d.tool_name || ""}"${d.construction_site ? ` para ${d.construction_site}` : ""}${d.selected_tag ? ` (TAG: ${d.selected_tag})` : ""}`;
      if (log.entity_type === "vehicle")
        return `Retirou o veículo "${d.vehicle_name || ""} (${d.plate || ""})"${d.destination ? ` - Destino: ${d.destination}` : ""}`;
      return "";
    case "checkin":
      if (log.entity_type === "tool") return `Devolveu a ferramenta "${d.tool_name || ""}"`;
      if (log.entity_type === "vehicle") return `Devolveu o veículo "${d.vehicle_name || ""} (${d.plate || ""})"`;
      return "";
    case "user_registered":
      return `Novo usuário registrado: ${d.email || ""} (${d.category === "engemase_employee" ? "Funcionário" : d.category === "third_party" ? "Terceirizado" : "Sócio"})`;
    case "user_approved":
      return `Aprovou o usuário "${d.approved_user || ""}" (${d.email || ""})`;
    case "issue_reported":
      return `Reportou problema "${d.title || ""}" na ferramenta "${d.tool_name || ""}" - Severidade: ${d.severity || ""}`;
    case "issue_resolved":
      return `Resolveu o problema "${d.title || ""}" na ferramenta "${d.tool_name || ""}"`;
    default:
      return JSON.stringify(d);
  }
}

export default function AdminLogs() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntity, setFilterEntity] = useState<string>("all");

  useEffect(() => {
    loadLogs();
  }, []);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs((data as SystemLog[]) || []);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== "all" && log.action !== filterAction) return false;
    if (filterEntity !== "all" && log.entity_type !== filterEntity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const desc = buildDescription(log).toLowerCase();
      const name = (log.user_name || "").toLowerCase();
      return desc.includes(q) || name.includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      <div className="shrink-0">
        <h2 className="text-xl sm:text-3xl font-bold tracking-tight">Logs do Sistema</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Histórico completo de ações no sistema</p>
      </div>

      <Card className="shrink-0">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nos logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Ações</SelectItem>
                <SelectItem value="checkout">Retiradas</SelectItem>
                <SelectItem value="checkin">Devoluções</SelectItem>
                <SelectItem value="user_registered">Cadastros</SelectItem>
                <SelectItem value="user_approved">Aprovações</SelectItem>
                <SelectItem value="issue_reported">Problemas</SelectItem>
                <SelectItem value="issue_resolved">Resoluções</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="tool">Ferramentas</SelectItem>
                <SelectItem value="vehicle">Veículos</SelectItem>
                <SelectItem value="user">Usuários</SelectItem>
                <SelectItem value="tool_issue">Problemas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0 pb-2">
          <CardTitle className="text-base">Registros de Atividade</CardTitle>
          <CardDescription>
            Mostrando {filteredLogs.length} de {logs.length} registros
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {filteredLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum registro encontrado
            </p>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id} className={`border-l-4 ${getActionColor(log.action)}`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-muted-foreground">
                      {getActionIcon(log.action, log.entity_type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {ENTITY_LABELS[log.entity_type] || log.entity_type}
                        </Badge>
                      </div>
                      <p className="text-sm">{buildDescription(log)}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{log.user_name || "Sistema"}</span>
                        <span>•</span>
                        <span>{format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
