import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Eye, Camera, FileSignature, FileText, FileSpreadsheet, Trash2, X, List, Clock, ChevronDown, ChevronRight, SlidersHorizontal, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AssetTimeline } from "@/components/admin/AssetTimeline";
import { SignedImage } from "@/components/SignedImage";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { toast } from "sonner";
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";
import { DeleteWithReasonDialog } from "@/components/DeleteWithReasonDialog";
import { HistorySkeleton } from "@/components/PageSkeleton";

type HistoryCategory = "engemase_employee" | "third_party" | "socios" | null;

interface HistoryEntry {
  id: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string;
  construction_site: string | null;
  selected_tag: string | null;
  estimated_return_date: string | null;
  checkout_photo_url: string | null;
  checkin_photo_url: string | null;
  checkout_signature_url: string | null;
  checkin_signature_url: string | null;
  tools: {
    name: string;
    tag: string | null;
  } | null;
  profiles: {
    full_name: string;
    category: HistoryCategory;
  } | null;
  checked_out_by_profile: {
    full_name: string;
  } | null;
  checked_in_by_profile: {
    full_name: string;
  } | null;
  notes: string | null;
}

export default function AdminHistory() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: history = [], isLoading: loading } = useQuery<HistoryEntry[]>({
    queryKey: ["admin-history"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_general_tool_history");
      if (error) throw error;
      return (data || []).map((entry) => ({
        id: entry.id,
        checkout_date: entry.checkout_date,
        checkin_date: entry.checkin_date,
        status: entry.status,
        construction_site: entry.construction_site,
        selected_tag: entry.selected_tag,
        estimated_return_date: entry.estimated_return_date,
        checkout_photo_url: entry.checkout_photo_url,
        checkin_photo_url: entry.checkin_photo_url,
        checkout_signature_url: entry.checkout_signature_url,
        checkin_signature_url: entry.checkin_signature_url,
        tools: entry.tool_name || entry.tool_tag ? { name: entry.tool_name || "Ferramenta", tag: entry.tool_tag } : null,
        profiles: { full_name: entry.user_full_name || "Usuário não encontrado", category: entry.user_category as HistoryCategory },
        checked_out_by_profile: entry.checked_out_by_full_name ? { full_name: entry.checked_out_by_full_name } : null,
        checked_in_by_profile: entry.checked_in_by_full_name ? { full_name: entry.checked_in_by_full_name } : null,
        notes: entry.notes,
      }));
    },
    staleTime: 30_000,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; entry: HistoryEntry | null }>({ open: false, entry: null });
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<HistoryEntry | null>(null);
  const [editForm, setEditForm] = useState({ construction_site: "", notes: "", checkout_date: "", checkin_date: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = (entry: HistoryEntry) => {
    const toLocal = (iso: string | null) => {
      if (!iso) return "";
      const d = new Date(iso);
      const off = d.getTimezoneOffset();
      const local = new Date(d.getTime() - off * 60000);
      return local.toISOString().slice(0, 16);
    };
    setEditForm({
      construction_site: entry.construction_site || "",
      notes: entry.notes || "",
      checkout_date: toLocal(entry.checkout_date),
      checkin_date: toLocal(entry.checkin_date),
    });
    setEditEntry(entry);
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;
    setSavingEdit(true);
    try {
      const payload = {
        construction_site: editForm.construction_site.trim() || null,
        notes: editForm.notes.trim() || null,
        checkout_date: new Date(editForm.checkout_date).toISOString(),
        checkin_date: editForm.checkin_date ? new Date(editForm.checkin_date).toISOString() : null,
      };
      const { error } = await supabase.from("tool_checkouts").update(payload).eq("id", editEntry.id);
      if (error) throw error;
      await supabase.from("system_logs").insert({
        action: "edit_history",
        entity_type: "tool_checkout",
        entity_id: editEntry.id,
        user_id: profile!.id,
        user_name: profile!.full_name,
        details: {
          tool_name: editEntry.tools?.name,
          user_name: editEntry.profiles?.full_name,
          changes: payload as unknown as Record<string, string | null>,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["admin-history"] });
      toast.success("Registro atualizado com sucesso");
      setEditEntry(null);
    } catch (err) {
      console.error("Erro ao editar registro:", err);
      toast.error("Erro ao atualizar registro");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEntry = async (reason: string) => {
    if (!deleteDialog.entry) return;
    try {
      const { error } = await supabase
        .from("tool_checkouts")
        .delete()
        .eq("id", deleteDialog.entry.id);

      if (error) throw error;

      // Log the deletion
      await supabase.from("system_logs").insert({
        action: "delete_history",
        entity_type: "tool_checkout",
        entity_id: deleteDialog.entry.id,
        user_id: profile!.id,
        user_name: profile!.full_name,
        details: {
          tool_name: deleteDialog.entry.tools?.name,
          user_name: deleteDialog.entry.profiles?.full_name,
          reason,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["admin-history"] });
      toast.success("Registro excluído com sucesso");
    } catch (error) {
      console.error("Erro ao excluir registro:", error);
      toast.error("Erro ao excluir registro");
      throw error;
    }
  };

  if (!profile) {
    return <Navigate to="/" />;
  }
  const isAdmin = profile.role === "admin";


  const getDateRange = () => {
    const now = new Date();
    switch (periodFilter) {
      case "7d": return { start: subDays(now, 7), end: now };
      case "30d": return { start: subDays(now, 30), end: now };
      case "90d": return { start: subDays(now, 90), end: now };
      case "6m": return { start: subMonths(now, 6), end: now };
      case "1y": return { start: subMonths(now, 12), end: now };
      default: return null;
    }
  };

  const filteredHistory = history.filter((entry) => {
    const matchesSearch = 
      entry.tools?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.construction_site && entry.construction_site.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === "all" || entry.status === statusFilter;
    
    const matchesCategory = 
      categoryFilter === "all" || entry.profiles?.category === categoryFilter;

    const dateRange = getDateRange();
    const matchesPeriod = !dateRange || (
      isAfter(new Date(entry.checkout_date), startOfDay(dateRange.start)) &&
      isBefore(new Date(entry.checkout_date), endOfDay(dateRange.end))
    );

    return matchesSearch && matchesStatus && matchesCategory && matchesPeriod;
  });

  const hasActiveFilters = searchQuery || statusFilter !== "all" || categoryFilter !== "all" || periodFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPeriodFilter("all");
  };

  const getCategoryLabel = (category: HistoryCategory | undefined) => {
    if (category === "engemase_employee") return "Funcionário";
    if (category === "socios") return "Sócio";
    if (category === "third_party") return "Terceirizado";
    return "-";
  };

  const getCategoryBadge = (category: HistoryCategory | undefined) => {
    if (category === "engemase_employee") {
      return <Badge className="bg-badge-employee text-badge-employee-foreground">Funcionário</Badge>;
    }
    if (category === "socios") {
      return <Badge className="bg-primary text-primary-foreground">Sócio</Badge>;
    }
    if (!category) {
      return <span className="text-muted-foreground">-</span>;
    }
    return <Badge className="bg-badge-thirdparty text-badge-thirdparty-foreground">Terceirizado</Badge>;
  };

  const isOverdue = (estimatedReturnDate: string | null, status: string) => {
    if (!estimatedReturnDate || status !== "checked_out") return false;
    return new Date(estimatedReturnDate) < new Date();
  };

  const hasMedia = (entry: HistoryEntry) => {
    return entry.checkout_photo_url || entry.checkin_photo_url || 
           entry.checkout_signature_url || entry.checkin_signature_url;
  };

  const exportHistoryPDF = async () => {
    if (filteredHistory.length === 0) {
      toast.error("Nenhum registro para exportar");
      return;
    }
    const headers = ["Ferramenta", "TAG", "Usuário", "Categoria", "Obra", "Retirada", "Devolução", "Status", "Observações"];
    const rows = filteredHistory.map((e) => [
      e.tools?.name,
      e.selected_tag || e.tools?.tag || "-",
      e.profiles?.full_name || "Usuário não encontrado",
      getCategoryLabel(e.profiles?.category),
      e.construction_site || "-",
      format(new Date(e.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      e.checkin_date ? format(new Date(e.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
      e.status === "checked_out" ? "Em Uso" : "Devolvida",
      e.notes || "-",
    ]);
    await exportToPDF({
      title: "Histórico de Ferramentas",
      subtitle: `Total: ${filteredHistory.length} registros`,
      headers, rows,
      filename: `historico-ferramentas-${format(new Date(), "yyyy-MM-dd")}`,
      orientation: "landscape",
    });
    toast.success("PDF exportado!");
  };

  const exportHistoryExcel = () => {
    if (filteredHistory.length === 0) {
      toast.error("Nenhum registro para exportar");
      return;
    }
    const headers = ["Ferramenta", "TAG", "Usuário", "Categoria", "Obra", "Retirada", "Devolução", "Status", "Retirado por", "Devolvido por", "Observações"];
    const rows = filteredHistory.map((e) => [
      e.tools?.name,
      e.selected_tag || e.tools?.tag || "-",
      e.profiles?.full_name || "Usuário não encontrado",
      getCategoryLabel(e.profiles?.category),
      e.construction_site || "-",
      format(new Date(e.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      e.checkin_date ? format(new Date(e.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
      e.status === "checked_out" ? "Em Uso" : "Devolvida",
      e.checked_out_by_profile?.full_name || "-",
      e.checked_in_by_profile?.full_name || "-",
      e.notes || "-",
    ]);
    exportToExcel({
      title: "Histórico de Ferramentas",
      subtitle: `Total: ${filteredHistory.length} registros`,
      headers, rows,
      filename: `historico-ferramentas-${format(new Date(), "yyyy-MM-dd")}`,
    });
    toast.success("Excel exportado!");
  };

  if (loading) {
    return <HistorySkeleton />;
  }

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (periodFilter !== "all" ? 1 : 0);

  return (
    <div className="flex flex-col h-full min-h-0 gap-3 sm:gap-4">
      {/* Barra de ações + filtros recolhíveis */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="shrink-0 flex items-center justify-between flex-wrap gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={cn("w-4 h-4 transition-transform", filtersOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
                <X className="w-3 h-3" />
                Limpar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportHistoryPDF} className="gap-2">
              <FileText className="w-4 h-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportHistoryExcel} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
          </div>
        </div>

        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <Card className="shrink-0 mt-2">
            <CardContent className="p-3 sm:p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar ferramenta, usuário ou obra..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="checked_out">Em Uso</SelectItem>
                    <SelectItem value="checked_in">Devolvida</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                    <SelectItem value="engemase_employee">Funcionários</SelectItem>
                    <SelectItem value="third_party">Terceirizados</SelectItem>
                    <SelectItem value="socios">Sócios</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Período" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo o período</SelectItem>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="90d">Últimos 90 dias</SelectItem>
                    <SelectItem value="6m">Últimos 6 meses</SelectItem>
                    <SelectItem value="1y">Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Histórico de Movimentações</CardTitle>
            <CardDescription>
              Mostrando {filteredHistory.length} de {history.length} registros
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("table")}
              title="Visualização em tabela"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "timeline" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("timeline")}
              title="Visualização em timeline"
            >
              <Clock className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma movimentação encontrada
            </p>
          ) : viewMode === "timeline" ? (
            <AssetTimeline
              events={filteredHistory.map((entry) => ({
                id: entry.id,
                date: entry.status === "checked_in" && entry.checkin_date ? entry.checkin_date : entry.checkout_date,
                action: entry.status === "checked_out" ? "Retirada" : "Devolução",
                description: `${entry.tools?.name}${entry.construction_site ? ` — ${entry.construction_site}` : ""}`,
                user: entry.profiles?.full_name,
                type: entry.status === "checked_out" ? "checkout" : "checkin",
              }))}
            />
          ) : (
            <>
              {/* Desktop Table — densa, com zebra, header sticky e expansão inline */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="[&_th]:h-9 [&_th]:py-2">
                      <TableHead className="w-8" />
                      <TableHead className="min-w-[180px]">Ferramenta</TableHead>
                      <TableHead className="min-w-[140px]">Obra</TableHead>
                      <TableHead className="min-w-[160px]">Usuário</TableHead>
                      <TableHead className="w-[120px]">Categoria</TableHead>
                      <TableHead className="w-[140px]">Retirada</TableHead>
                      <TableHead className="w-[140px]">Devolução</TableHead>
                      <TableHead className="w-[130px]">Status</TableHead>
                      <TableHead className="w-[100px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="[&_tr[data-row='main']:nth-child(4n+1)]:bg-muted/30 [&_tr[data-row='main']:hover]:bg-accent/40 [&_tr[data-row='main']]:transition-colors [&_td]:py-2">
                    {filteredHistory.map((entry) => {
                      const isExpanded = expandedId === entry.id;
                      return (
                        <Fragment key={entry.id}>
                          <TableRow
                            data-row="main"
                            className="cursor-pointer"
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          >
                            <TableCell className="w-8 pr-0">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex flex-col leading-tight">
                                <span className="truncate max-w-[240px]" title={entry.tools?.name}>{entry.tools?.name}</span>
                                {(entry.selected_tag || entry.tools?.tag) && (
                                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                    TAG: {entry.selected_tag || entry.tools?.tag}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="truncate max-w-[180px]" title={entry.construction_site || ""}>
                              {entry.construction_site || "-"}
                            </TableCell>
                            <TableCell className="truncate max-w-[200px]" title={entry.profiles?.full_name}>
                              {entry.profiles?.full_name}
                            </TableCell>
                            <TableCell>{getCategoryBadge(entry.profiles?.category)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs tabular-nums">
                              {format(new Date(entry.checkout_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs tabular-nums">
                              {entry.checkin_date
                                ? format(new Date(entry.checkin_date), "dd/MM/yy HH:mm", { locale: ptBR })
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {entry.status === "checked_out" ? (
                                isOverdue(entry.estimated_return_date, entry.status) ? (
                                  <Badge variant="destructive" className="text-[10px] py-0 h-5">Atrasado</Badge>
                                ) : (
                                  <Badge variant="default" className="text-[10px] py-0 h-5">Em Uso</Badge>
                                )
                              ) : (
                                <Badge variant="secondary" className="text-[10px] py-0 h-5">Devolvida</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                  title={isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteDialog({ open: true, entry })}
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow data-row="details" className="bg-muted/50 hover:bg-muted/50">
                              <TableCell colSpan={9} className="p-4">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Ferramenta</p>
                                      <p className="font-semibold text-sm">{entry.tools?.name}</p>
                                      {(entry.selected_tag || entry.tools?.tag) && (
                                        <p className="text-[10px] font-mono text-muted-foreground uppercase mt-0.5">
                                          TAG: {entry.selected_tag || entry.tools?.tag}
                                        </p>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Usuário</p>
                                      <p className="text-sm">{entry.profiles?.full_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Obra</p>
                                      <p className="text-sm">{entry.construction_site || "Não informado"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                                      <Badge variant={entry.status === "checked_out" ? "default" : "secondary"}>
                                        {entry.status === "checked_out" ? "Em Uso" : "Devolvida"}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                                    <div>
                                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Data de Retirada</p>
                                      <p className="text-sm">{format(new Date(entry.checkout_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                      <p className="text-xs text-muted-foreground">Por: {entry.checked_out_by_profile?.full_name || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Data de Devolução</p>
                                      <p className="text-sm">
                                        {entry.checkin_date
                                          ? format(new Date(entry.checkin_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                          : "Não devolvida"}
                                      </p>
                                      {entry.checked_in_by_profile && (
                                        <p className="text-xs text-muted-foreground">Por: {entry.checked_in_by_profile.full_name}</p>
                                      )}
                                    </div>
                                  </div>
                                  {entry.notes && (
                                    <div className="pt-3 border-t">
                                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Observações</p>
                                      <p className="text-sm mt-1 whitespace-pre-wrap">{entry.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredHistory.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm truncate flex items-center gap-2">
                            {entry.tools?.name}
                            {(entry.selected_tag || entry.tools?.tag) && (
                              <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 uppercase">
                                {entry.selected_tag || entry.tools?.tag}
                              </Badge>
                            )}
                          </h3>
                          <p className="text-xs text-muted-foreground">{entry.profiles?.full_name}</p>
                          {entry.construction_site && (
                            <p className="text-xs text-muted-foreground">Obra: {entry.construction_site}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant={entry.status === "checked_out" ? "default" : "secondary"} className="text-xs">
                            {entry.status === "checked_out" ? "Em Uso" : "Devolvida"}
                          </Badge>
                          {isOverdue(entry.estimated_return_date, entry.status) && (
                            <Badge variant="destructive" className="text-xs">Atrasado</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>Retirada: {format(new Date(entry.checkout_date), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                          {entry.checkin_date && (
                            <p>Devolução: {format(new Date(entry.checkin_date), "dd/MM/yy HH:mm", { locale: ptBR })}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(entry)}>
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Movimentação</DialogTitle>
                              </DialogHeader>
                              {selectedEntry && (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Ferramenta</p>
                                      <p className="font-semibold">
                                        {selectedEntry.tools?.name}
                                        {(selectedEntry.selected_tag || selectedEntry.tools?.tag) && (
                                          <span className="ml-2 text-xs font-mono text-muted-foreground bg-muted px-1 rounded uppercase">
                                            TAG: {selectedEntry.selected_tag || selectedEntry.tools?.tag}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                                      <p className="font-semibold">{selectedEntry.profiles?.full_name}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Obra</p>
                                      <p>{selectedEntry.construction_site || "Não informado"}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                                      <Badge variant={selectedEntry.status === "checked_out" ? "default" : "secondary"}>
                                        {selectedEntry.status === "checked_out" ? "Em Uso" : "Devolvida"}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Data de Retirada</p>
                                      <p>{format(new Date(selectedEntry.checkout_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Data de Devolução</p>
                                      <p>
                                        {selectedEntry.checkin_date 
                                          ? format(new Date(selectedEntry.checkin_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                          : "Não devolvida"}
                                      </p>
                                    </div>
                                  </div>
                                  {selectedEntry.notes && (
                                    <div className="pt-4 border-t">
                                      <p className="text-sm font-medium text-muted-foreground">Observações</p>
                                      <p className="mt-1">{selectedEntry.notes}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteDialog({ open: true, entry })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}

                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DeleteWithReasonDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, entry: open ? deleteDialog.entry : null })}
        onConfirm={handleDeleteEntry}
        title="Excluir Registro do Histórico"
        description="Esta ação é irreversível. O registro será removido permanentemente do histórico."
        itemName={deleteDialog.entry ? `${deleteDialog.entry.tools?.name} - ${deleteDialog.entry.profiles?.full_name}` : ""}
      />
    </div>
  );
}
