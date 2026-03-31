import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, QrCode, CheckCircle, AlertCircle, Clock, ArrowRight, ChevronDown, CalendarPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Tool {
  id: string;
  name: string;
  tag: string | null;
  description: string | null;
  quantity_available: number;
  quantity_total: number;
  employee_only: boolean;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { isOnline } = useOffline();
  const { data: cachedTools, saveToCache } = useOfflineStorage<Tool[]>("dashboard_tools", []);
  const [tools, setTools] = useState<Tool[]>(cachedTools || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [extendCheckoutId, setExtendCheckoutId] = useState<string | null>(null);
  const [extendToolName, setExtendToolName] = useState("");
  const [extendDate, setExtendDate] = useState<Date | undefined>(undefined);
  const [extendLoading, setExtendLoading] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch pending checkouts for the current user
  const { data: pendingCheckouts } = useQuery({
    queryKey: ["pending-tool-checkouts", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("tool_checkouts")
        .select(`id, tool_id, checkout_date, estimated_return_date, construction_site, tools (name, tag)`)
        .eq("user_id", profile.id)
        .eq("status", "checked_out")
        .order("checkout_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    if (!isOnline) {
      if (cachedTools && cachedTools.length > 0) {
        const filteredTools = cachedTools.filter(tool => {
          if (profile?.category === "third_party" && tool.employee_only) return false;
          return true;
        });
        setTools(filteredTools);
        toast.info("Modo offline - usando dados em cache");
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("tools")
        .select("*")
        .order("name");

      if (error) throw error;

      const filteredTools = data?.filter(tool => {
        if (profile?.category === "third_party" && tool.employee_only) {
          return false;
        }
        return true;
      }) || [];

      setTools(filteredTools);
      saveToCache(data || []);
    } catch (error: any) {
      // Fallback to cache on error
      if (cachedTools && cachedTools.length > 0) {
        const filteredTools = cachedTools.filter(tool => {
          if (profile?.category === "third_party" && tool.employee_only) return false;
          return true;
        });
        setTools(filteredTools);
        toast.info("Usando dados em cache");
      } else {
        toast.error("Erro ao carregar ferramentas", { description: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredTools = tools.filter((tool) =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.tag?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCheckout = (toolId: string) => {
    navigate(`/checkout?toolId=${toolId}`);
  };

  const handleCheckin = (toolId: string) => {
    navigate(`/checkin?toolId=${toolId}`);
  };

  const handleExtendDate = async () => {
    if (!extendCheckoutId || !extendDate || !profile?.id) return;
    setExtendLoading(true);
    try {
      const { error } = await supabase
        .from("tool_checkouts")
        .update({ estimated_return_date: extendDate.toISOString() })
        .eq("id", extendCheckoutId);
      if (error) throw error;

      // Notify all admins
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              userId: admin.id,
              type: "return_extended",
              title: "Devolução Prorrogada",
              body: `O usuário "${profile.full_name}" prorrogou a devolução da ferramenta "${extendToolName}" para ${format(extendDate, "dd/MM/yyyy")}.`,
            },
          });
        }
      }

      toast.success("Data de devolução prorrogada!");
      queryClient.invalidateQueries({ queryKey: ["pending-tool-checkouts"] });
      setExtendDialogOpen(false);
    } catch (error: any) {
      toast.error("Erro ao prorrogar", { description: error.message });
    } finally {
      setExtendLoading(false);
    }
  };

  const openExtendDialog = (checkoutId: string, toolName: string) => {
    setExtendCheckoutId(checkoutId);
    setExtendToolName(toolName);
    setExtendDate(addDays(new Date(), 3));
    setExtendDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Package className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 space-y-3 sm:space-y-4 pb-3 sm:pb-4">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Gerencie retiradas e devoluções de ferramentas</p>
        </div>

        {/* Pending Returns Alert - Collapsible */}
        {pendingCheckouts && pendingCheckouts.length > 0 && (
          <Card 
            className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20 cursor-pointer"
            onClick={() => setPendingExpanded(!pendingExpanded)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center justify-between text-orange-700 dark:text-orange-400">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Devoluções Pendentes ({pendingCheckouts.length})
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${pendingExpanded ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {pendingExpanded && (
              <CardContent className="space-y-2 max-h-[200px] overflow-y-auto pt-0" onClick={(e) => e.stopPropagation()}>
                {pendingCheckouts.map((checkout: any) => {
                  const isOverdue = checkout.estimated_return_date && new Date(checkout.estimated_return_date) < new Date();
                  return (
                    <div key={checkout.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-background/80">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{checkout.tools?.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {checkout.construction_site && <span>{checkout.construction_site}</span>}
                          {checkout.estimated_return_date && (
                            <span className={isOverdue ? "text-destructive font-medium" : ""}>
                              {isOverdue ? "⚠️ Atrasado" : `Devolver até ${format(new Date(checkout.estimated_return_date), "dd/MM", { locale: ptBR })}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {isOverdue && (
                          <Button size="sm" variant="ghost" className="text-xs gap-1 text-orange-600 dark:text-orange-400 hover:text-orange-700" onClick={() => openExtendDialog(checkout.id, checkout.tools?.name || "")}>
                            <CalendarPlus className="w-3 h-3" /> Prorrogar
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate(`/checkin?toolId=${checkout.tool_id}`)}>
                          Devolver <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        )}

        <div className="grid gap-2 sm:gap-4 grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ferramentas Disponíveis</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tools.reduce((acc, tool) => acc + tool.quantity_available, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Ferramentas</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tools.reduce((acc, tool) => acc + tool.quantity_total, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Uso</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tools.reduce((acc, tool) => acc + (tool.quantity_total - tool.quantity_available), 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Ferramentas</CardTitle>
          <CardDescription>Lista de ferramentas disponíveis</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ferramenta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {filteredTools.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma ferramenta encontrada
              </p>
            ) : (
              filteredTools.map((tool) => {
                const userHasTool = pendingCheckouts?.some((c: any) => c.tool_id === tool.id);
                return (
                <Card key={tool.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/tools/${tool.id}`)}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm sm:text-base capitalize">{tool.name.toLowerCase()}</h3>
                          {tool.tag && (
                            <Badge variant="secondary" className="text-xs">
                              {tool.tag}
                            </Badge>
                          )}
                          {tool.employee_only && (
                            <Badge variant="outline" className="text-xs">
                              Apenas Funcionários
                            </Badge>
                          )}
                        </div>
                        {tool.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                            {tool.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs sm:text-sm">
                          <span className={tool.quantity_available > 0 ? "text-success" : "text-destructive"}>
                            Disponível: {tool.quantity_available}/{tool.quantity_total}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 self-end sm:self-start" onClick={(e) => e.stopPropagation()}>
                        {userHasTool ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs sm:text-sm"
                            onClick={() => handleCheckin(tool.id)}
                          >
                            Devolver
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="text-xs sm:text-sm"
                            onClick={() => handleCheckout(tool.id)}
                            disabled={tool.quantity_available === 0}
                          >
                            Retirar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog para prorrogar data */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Prorrogar Devolução</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecione a nova data de devolução para <strong>{extendToolName}</strong>:
            </p>
            <Calendar
              mode="single"
              selected={extendDate}
              onSelect={setExtendDate}
              disabled={(date) => date <= new Date()}
              className={cn("p-3 pointer-events-auto mx-auto")}
              locale={ptBR}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleExtendDate} disabled={!extendDate || extendLoading}>
              {extendLoading ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
