import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignedImage } from "@/components/SignedImage";
import { Search, Clock, ArrowRight, ChevronDown, CalendarPlus, FileText, FileSpreadsheet, Filter, X, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/PageSkeleton";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";

interface Tool {
  id: string;
  name: string;
  tag: string | null;
  description: string | null;
  brand: string | null;
  condition: string | null;
  quantity_available: number;
  quantity_total: number;
  employee_only: boolean;
  image_url: string | null;
}

const conditionLabels: Record<string, string> = {
  excellent: "Excelente",
  good: "Bom",
  fair: "Regular",
  poor: "Ruim",
  needs_maintenance: "Precisa Manutenção",
};

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
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: pendingCheckouts } = useQuery({
    queryKey: ["pending-tool-checkouts", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("tool_checkouts")
        .select(`id, tool_id, checkout_date, estimated_return_date, construction_site, selected_tag, tools (name, tag)`)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (profile?.category === "third_party" && tool.employee_only) return false;
        return true;
      }) || [];

      setTools(filteredTools as Tool[]);
      saveToCache((data || []) as Tool[]);
    } catch (error: any) {
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

  const brands = useMemo(() => {
    const u = [...new Set(tools.map(t => t.brand).filter(Boolean))] as string[];
    return u.sort();
  }, [tools]);

  const conditions = useMemo(() => {
    const u = [...new Set(tools.map(t => t.condition).filter(Boolean))] as string[];
    return u.sort();
  }, [tools]);

  const hasActiveFilters =
    brandFilter !== "all" || conditionFilter !== "all" || availabilityFilter !== "all" || categoryFilter !== "all";

  const clearFilters = () => {
    setBrandFilter("all");
    setConditionFilter("all");
    setAvailabilityFilter("all");
    setCategoryFilter("all");
  };

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.brand?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBrand = brandFilter === "all" || tool.brand === brandFilter;
    const matchesCondition = conditionFilter === "all" || tool.condition === conditionFilter;
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && tool.quantity_available > 0) ||
      (availabilityFilter === "unavailable" && tool.quantity_available === 0);
    const matchesCategory =
      categoryFilter === "all" ||
      (categoryFilter === "employee_only" && tool.employee_only) ||
      (categoryFilter === "all_users" && !tool.employee_only);

    return matchesSearch && matchesBrand && matchesCondition && matchesAvailability && matchesCategory;
  });

  const handleCheckout = (toolId: string) => {
    navigate(`/ferramentas/retirada?toolId=${toolId}`);
  };

  const handleCheckin = (toolId: string) => {
    navigate(`/ferramentas/devolucao?toolId=${toolId}`);
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
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 space-y-3 sm:space-y-4 pb-3 sm:pb-4">
        <div className="hidden sm:block">
          <h2 className="text-3xl font-bold tracking-tight">Ferramentas</h2>
          <p className="text-sm text-muted-foreground">Painel e catálogo unificados — busque, filtre e gerencie retiradas e devoluções</p>
        </div>

        {pendingCheckouts && pendingCheckouts.length > 0 && (
          <Card
            className="border-warning/50 bg-warning/5 cursor-pointer"
            onClick={() => setPendingExpanded(!pendingExpanded)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center justify-between text-warning">
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
                          {checkout.estimated_return_date && (
                            <span className={isOverdue ? "text-destructive font-medium" : ""}>
                              {isOverdue ? "⚠️ Atrasado" : `Devolver até ${format(new Date(checkout.estimated_return_date), "dd/MM", { locale: ptBR })}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {isOverdue && (
                          <Button size="sm" variant="ghost" className="text-xs gap-1 text-warning hover:text-warning/80" onClick={() => openExtendDialog(checkout.id, checkout.tools?.name || "")}>
                            <CalendarPlus className="w-3 h-3" /> Prorrogar
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate(`/ferramentas/devolucao?checkoutId=${checkout.id}`)}>
                          Registrar Devolução <ArrowRight className="w-3 h-3" />
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
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold text-success">
                {tools.reduce((acc, tool) => acc + tool.quantity_available, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">
                {tools.reduce((acc, tool) => acc + tool.quantity_total, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Em Uso</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold text-warning">
                {tools.reduce((acc, tool) => acc + (tool.quantity_total - tool.quantity_available), 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Catálogo</CardTitle>
              <CardDescription>
                {filteredTools.length} de {tools.length} ferramentas
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1"
                onClick={async () => {
                  const headers = ["Nome", "Tag", "Marca", "Disponível", "Total", "Em Uso"];
                  const rows = filteredTools.map(t => [
                    t.name,
                    t.tag || "-",
                    t.brand || "-",
                    String(t.quantity_available),
                    String(t.quantity_total),
                    String(t.quantity_total - t.quantity_available),
                  ]);
                  await exportToPDF({ title: "Relatório de Ferramentas", headers, rows, filename: "ferramentas", generatedBy: profile?.full_name });
                  toast.success("PDF exportado!");
                }}
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1"
                onClick={() => {
                  const headers = ["Nome", "Tag", "Marca", "Disponível", "Total", "Em Uso"];
                  const rows = filteredTools.map(t => [
                    t.name,
                    t.tag || "-",
                    t.brand || "-",
                    String(t.quantity_available),
                    String(t.quantity_total),
                    String(t.quantity_total - t.quantity_available),
                  ]);
                  exportToExcel({ title: "Relatório de Ferramentas", headers, rows, filename: "ferramentas", generatedBy: profile?.full_name });
                  toast.success("Excel exportado!");
                }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="flex gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, descrição, TAG ou marca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Buscar ferramenta"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
              aria-label="Mostrar filtros avançados"
              aria-pressed={showFilters}
            >
              <Filter className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4 bg-muted/50 rounded-lg border animate-fade-in">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Marca</label>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger><SelectValue placeholder="Todas as marcas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as marcas</SelectItem>
                    {brands.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Condição</label>
                <Select value={conditionFilter} onValueChange={setConditionFilter}>
                  <SelectTrigger><SelectValue placeholder="Todas as condições" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as condições</SelectItem>
                    {conditions.map(condition => (
                      <SelectItem key={condition} value={condition}>
                        {conditionLabels[condition] || condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Disponibilidade</label>
                <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="unavailable">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Acesso</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="employee_only">Apenas Funcionários</SelectItem>
                    <SelectItem value="all_users">Todos os Usuários</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
                    <X className="w-3 h-3" /> Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {filteredTools.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma ferramenta encontrada
              </p>
            ) : (
              filteredTools.map((tool) => {
                const userCheckout = pendingCheckouts?.find((c: any) => c.tool_id === tool.id);
                const userHasTool = Boolean(userCheckout);
                const isOverdue = Boolean(
                  userCheckout?.estimated_return_date && new Date(userCheckout.estimated_return_date) < new Date()
                );
                const overdueDays = isOverdue && userCheckout?.estimated_return_date
                  ? Math.ceil((new Date().getTime() - new Date(userCheckout.estimated_return_date).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;
                return (
                  <Card key={tool.id} className={cn("cursor-pointer hover:bg-accent/50 transition-colors", isOverdue && "border-destructive/50")} onClick={() => navigate(`/ferramentas/${tool.id}`)}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex gap-3 flex-1 min-w-0">
                          {tool.image_url && (
                            <div
                              className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted"
                              onClick={(e) => { e.stopPropagation(); setEnlargedImage(tool.image_url); }}
                            >
                              {tool.image_url.startsWith("http") ? (
                                <img src={tool.image_url} alt={tool.name} className="w-full h-full object-cover" />
                              ) : (
                                <SignedImage storagePath={tool.image_url} alt={tool.name} className="w-full h-full object-cover" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm sm:text-base capitalize">{tool.name.toLowerCase()}</h3>
                              {tool.tag && <Badge variant="secondary" className="text-xs">{tool.tag}</Badge>}
                              {tool.brand && <Badge variant="outline" className="text-xs">{tool.brand}</Badge>}
                              {tool.employee_only && <Badge variant="outline" className="text-xs">Apenas Funcionários</Badge>}
                              {tool.condition && (
                                <Badge variant="outline" className="text-xs">
                                  {conditionLabels[tool.condition] || tool.condition}
                                </Badge>
                              )}
                              {isOverdue && (
                                <Badge variant="destructive" className="text-xs gap-1">
                                  ⚠️ Atrasado {overdueDays}d
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
                        </div>
                        <div className="flex flex-wrap gap-2 self-end sm:self-start" onClick={(e) => e.stopPropagation()}>
                          {userHasTool ? (
                            <>
                              {isOverdue && userCheckout && (
                                <Button size="sm" variant="ghost" className="text-xs sm:text-sm" onClick={() => openExtendDialog(userCheckout.id, tool.name)}>
                                  <CalendarPlus className="w-3 h-3" /> Prorrogar
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="text-xs sm:text-sm" onClick={() => handleCheckin(tool.id)}>
                                Registrar Devolução
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              className="text-xs sm:text-sm"
                              onClick={() => handleCheckout(tool.id)}
                              disabled={tool.quantity_available === 0}
                            >
                              Registrar Saída
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-xs" onClick={() => navigate(`/ferramentas/${tool.id}`)} aria-label="Ver detalhes">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
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

      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto da ferramenta</DialogTitle>
          </DialogHeader>
          {enlargedImage && (
            enlargedImage.startsWith("http") ? (
              <img src={enlargedImage} alt="Foto ampliada" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
            ) : (
              <SignedImage storagePath={enlargedImage} alt="Foto ampliada" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
