import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SignedImage } from "@/components/SignedImage";
import { Search, FileText, FileSpreadsheet, Filter, X, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/PageSkeleton";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { PendingCheckoutsCard } from "@/components/dashboard/PendingCheckoutsCard";
import { ToolStats } from "@/components/dashboard/ToolStats";
import { ToolCard } from "@/components/dashboard/ToolCard";

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
  
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedCheckouts, setSelectedCheckouts] = useState<Set<string>>(new Set());
  const [bulkReturnLoading, setBulkReturnLoading] = useState(false);
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
  const [catalogSelectMode, setCatalogSelectMode] = useState(false);
  // toolId -> selected TAG ("" when not yet chosen / not applicable)
  const [catalogSelected, setCatalogSelected] = useState<Map<string, string>>(new Map());
  const [catalogTagError, setCatalogTagError] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const toggleCatalogTool = (id: string) =>
    setCatalogSelected(prev => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, "");
      return next;
    });
  const setCatalogTag = (id: string, tag: string) =>
    setCatalogSelected(prev => {
      const next = new Map(prev);
      next.set(id, tag);
      return next;
    });
  const exitCatalogSelect = () => { setCatalogSelectMode(false); setCatalogSelected(new Map()); };
  const confirmCatalogBulk = () => {
    setCatalogTagError("");
    if (catalogSelected.size === 0) { toast.error("Selecione ao menos uma ferramenta"); return; }
    // Validate TAG chosen for multi-tag tools
    for (const [toolId, tag] of catalogSelected) {
      const t = tools?.find((x: any) => x.id === toolId);
      if (!t) continue;
      const tags = (t.tag || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      if (tags.length > 1 && !tag) {
        const msg = `Selecione qual unidade de "${t.name}" você está retirando antes de continuar.`;
        setCatalogTagError(msg);
        toast.error(msg);
        return;
      }
    }
    const ids = Array.from(catalogSelected.keys()).join(",");
    const tagsParam = Array.from(catalogSelected.entries())
      .filter(([, tag]) => !!tag)
      .map(([id, tag]) => `${id}:${encodeURIComponent(tag)}`)
      .join(",");
    const qs = `bulk=1&toolIds=${ids}${tagsParam ? `&tags=${tagsParam}` : ""}`;
    navigate(`/ferramentas/retirada?${qs}`);
  };

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

  const handleCheckin = (checkoutId: string) => {
    navigate(`/ferramentas/devolucao?checkoutId=${checkoutId}`);
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

  const toggleSelectCheckout = (id: string) => {
    setSelectedCheckouts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!pendingCheckouts) return;
    if (selectedCheckouts.size === pendingCheckouts.length) {
      setSelectedCheckouts(new Set());
    } else {
      setSelectedCheckouts(new Set(pendingCheckouts.map((c: any) => c.id)));
    }
  };

  const exitMultiSelect = () => {
    setMultiSelectMode(false);
    setSelectedCheckouts(new Set());
  };

  const handleBulkReturn = async () => {
    if (selectedCheckouts.size === 0 || !profile?.id) return;
    setBulkReturnLoading(true);
    try {
      const ids = Array.from(selectedCheckouts);
      const { error } = await supabase
        .from("tool_checkouts")
        .update({
          status: "checked_in",
          checkin_date: new Date().toISOString(),
          checked_in_by: profile.id,
        })
        .in("id", ids);

      if (error) throw error;

      toast.success(`${ids.length} ferramenta(s) devolvida(s) com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["pending-tool-checkouts"] });
      exitMultiSelect();
    } catch (error: any) {
      toast.error("Erro ao devolver ferramentas", { description: error.message });
    } finally {
      setBulkReturnLoading(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 space-y-3 sm:space-y-4 pb-3 sm:pb-4">
        <div className="hidden sm:block">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Ferramentas</h2>
          <p className="text-sm text-muted-foreground">Painel e catálogo unificados — busque, filtre e gerencie retiradas e devoluções</p>
        </div>

        <PendingCheckoutsCard
          pendingCheckouts={(pendingCheckouts || []) as any}
          multiSelectMode={multiSelectMode}
          setMultiSelectMode={setMultiSelectMode}
          selectedCheckouts={selectedCheckouts}
          toggleSelectCheckout={toggleSelectCheckout}
          toggleSelectAll={toggleSelectAll}
          exitMultiSelect={exitMultiSelect}
          bulkReturnLoading={bulkReturnLoading}
          handleBulkReturn={handleBulkReturn}
          handleCheckin={handleCheckin}
          openExtendDialog={openExtendDialog}
        />

        <ToolStats tools={tools} />
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
            <div className="flex gap-1 flex-wrap">
              {catalogSelectMode ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={exitCatalogSelect}
                >
                  <X className="w-3.5 h-3.5" /> Sair da seleção
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  className="text-xs gap-1"
                  onClick={() => setCatalogSelectMode(true)}
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Selecionar várias
                </Button>
              )}
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
                const userCheckouts = pendingCheckouts?.filter((c: any) => c.tool_id === tool.id) || [];
                const isSelected = catalogSelected.has(tool.id);
                const isDisabled = catalogSelectMode && tool.quantity_available <= 0;
                if (catalogSelectMode) {
                  const tags = (tool.tag || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                  const selectedTag = catalogSelected.get(tool.id) || "";
                  // TAGs already in use by other active checkouts
                  const allCheckoutsForTool = (pendingCheckouts || []).filter((c: any) => c.tool_id === tool.id);
                  const usedTags: string[] = allCheckoutsForTool.map((c: any) => c.selected_tag).filter(Boolean);
                  const availableTags = tags.filter(t => !usedTags.includes(t));
                  return (
                    <div key={tool.id} className="relative">
                      <div className={cn("pointer-events-none transition-opacity", isDisabled && "opacity-50")}>
                        <ToolCard
                          tool={tool}
                          userCheckouts={userCheckouts}
                          conditionLabels={conditionLabels}
                          onNavigate={navigate}
                          onEnlargeImage={setEnlargedImage}
                          onCheckout={handleCheckout}
                          onCheckin={handleCheckin}
                          onExtend={openExtendDialog}
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => !isDisabled && toggleCatalogTool(tool.id)}
                        className={cn(
                          "absolute inset-0 rounded-lg border-2 transition-all",
                          isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-primary/40",
                          isDisabled && "cursor-not-allowed"
                        )}
                        aria-label={`Selecionar ${tool.name}`}
                      />
                      <div className="absolute top-2 left-2 z-10 pointer-events-none">
                        <div className="bg-background border-2 border-primary rounded p-0.5 shadow">
                          <Checkbox checked={isSelected} className="pointer-events-none" />
                        </div>
                      </div>
                      {isSelected && tags.length > 1 && (
                        <div className="absolute bottom-2 left-2 right-2 z-20 bg-background/95 backdrop-blur border rounded-md p-2 shadow">
                          <p className="text-[10px] font-medium text-muted-foreground mb-1">
                            Selecione a unidade:
                          </p>
                          <Select value={selectedTag} onValueChange={(v) => setCatalogTag(tool.id, v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder={availableTags.length === 0 ? "Todas em uso" : "Escolha a TAG"} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTags.map(t => (
                                <SelectItem key={t} value={t}>TAG {t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    userCheckouts={userCheckouts}
                    conditionLabels={conditionLabels}
                    onNavigate={navigate}
                    onEnlargeImage={setEnlargedImage}
                    onCheckout={handleCheckout}
                    onCheckin={handleCheckin}
                    onExtend={openExtendDialog}
                  />
                );
              })
            )}
          </div>
          {catalogSelectMode && (
            <div className="shrink-0 flex flex-col gap-2 p-3 border-t bg-background sticky bottom-0">
              <div
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                className={cn("text-sm font-medium", catalogTagError ? "text-destructive" : "sr-only")}
              >
                {catalogTagError}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {catalogSelected.size} selecionada{catalogSelected.size === 1 ? "" : "s"}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exitCatalogSelect}>Cancelar</Button>
                  <Button size="sm" disabled={catalogSelected.size === 0} onClick={confirmCatalogBulk}>
                    Continuar para Retirada
                  </Button>
                </div>
              </div>
            </div>
          )}
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
