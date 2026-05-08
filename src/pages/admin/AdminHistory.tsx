import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Search, Eye, Camera, FileSignature, FileText, FileSpreadsheet, Trash2, CalendarIcon, X, List, Clock } from "lucide-react";
import { AssetTimeline } from "@/components/admin/AssetTimeline";
import { SignedImage } from "@/components/SignedImage";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { toast } from "sonner";
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";
import { DeleteWithReasonDialog } from "@/components/DeleteWithReasonDialog";

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
  };
  profiles: {
    full_name: string;
    category: "engemase_employee" | "third_party" | "socios";
  };
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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; entry: HistoryEntry | null }>({ open: false, entry: null });
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");

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
          tool_name: deleteDialog.entry.tools.name,
          user_name: deleteDialog.entry.profiles.full_name,
          reason,
        },
      });

      setHistory((prev) => prev.filter((e) => e.id !== deleteDialog.entry!.id));
      toast.success("Registro excluído com sucesso");
    } catch (error) {
      console.error("Erro ao excluir registro:", error);
      toast.error("Erro ao excluir registro");
      throw error;
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

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
          selected_tag,
          estimated_return_date,
          notes,
          checkout_photo_url,
          checkin_photo_url,
          checkout_signature_url,
          checkin_signature_url,
          tools (name, tag),
          profiles!tool_checkouts_user_id_fkey (full_name, category),
          checked_out_by_profile:profiles!tool_checkouts_checked_out_by_fkey (full_name),
          checked_in_by_profile:profiles!tool_checkouts_checked_in_by_fkey (full_name)
        `)
        .order("checkout_date", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

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
      entry.tools.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.construction_site && entry.construction_site.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === "all" || entry.status === statusFilter;
    
    const matchesCategory = 
      categoryFilter === "all" || entry.profiles.category === categoryFilter;

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

  const getCategoryBadge = (category: "engemase_employee" | "third_party" | "socios") => {
    if (category === "engemase_employee") {
      return <Badge className="bg-badge-employee text-badge-employee-foreground">Funcionário</Badge>;
    }
    if (category === "socios") {
      return <Badge className="bg-primary text-primary-foreground">Sócio</Badge>;
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
    const headers = ["Ferramenta", "Usuário", "Categoria", "Obra", "Retirada", "Devolução", "Status", "Observações"];
    const rows = filteredHistory.map((e) => [
      e.tools.name,
      e.profiles.full_name,
      e.profiles.category === "engemase_employee" ? "Funcionário" : e.profiles.category === "socios" ? "Sócio" : "Terceirizado",
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
    const headers = ["Ferramenta", "Usuário", "Categoria", "Obra", "Retirada", "Devolução", "Status", "Retirado por", "Devolvido por", "Observações"];
    const rows = filteredHistory.map((e) => [
      e.tools.name,
      e.profiles.full_name,
      e.profiles.category === "engemase_employee" ? "Funcionário" : e.profiles.category === "socios" ? "Sócio" : "Terceirizado",
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
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 sm:gap-6">
      <div className="shrink-0 flex items-center justify-between flex-wrap gap-4">
        <div className="hidden sm:block">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Histórico Completo</h2>
          <p className="text-sm text-muted-foreground">Visualize todas as movimentações de ferramentas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportHistoryPDF} className="gap-2">
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportHistoryExcel} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
        </div>
      </div>

      <Card className="shrink-0">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre o histórico por diferentes critérios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ferramenta, usuário ou obra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="checked_out">Em Uso</SelectItem>
                <SelectItem value="checked_in">Devolvida</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                <SelectItem value="engemase_employee">Funcionários</SelectItem>
                <SelectItem value="third_party">Terceirizados</SelectItem>
                <SelectItem value="socios">Sócios</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
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

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
              <X className="w-3 h-3" />
              Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

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
                description: `${entry.tools.name}${entry.construction_site ? ` — ${entry.construction_site}` : ""}`,
                user: entry.profiles.full_name,
                type: entry.status === "checked_out" ? "checkout" : "checkin",
              }))}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ferramenta</TableHead>
                      <TableHead>Obra</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Retirada</TableHead>
                      <TableHead>Devolução</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.tools.name}</TableCell>
                        <TableCell>{entry.construction_site || "-"}</TableCell>
                        <TableCell>{entry.profiles.full_name}</TableCell>
                        <TableCell>{getCategoryBadge(entry.profiles.category)}</TableCell>
                        <TableCell>
                          {format(new Date(entry.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {entry.checkin_date
                            ? format(new Date(entry.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Badge variant={entry.status === "checked_out" ? "default" : "secondary"}>
                              {entry.status === "checked_out" ? "Em Uso" : "Devolvida"}
                            </Badge>
                            {isOverdue(entry.estimated_return_date, entry.status) && (
                              <Badge variant="destructive">Atrasado</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(entry)}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  Ver
                                  {hasMedia(entry) && (
                                    <span className="ml-1 flex gap-1">
                                      {(entry.checkout_photo_url || entry.checkin_photo_url) && 
                                        <Camera className="w-3 h-3" />}
                                      {(entry.checkout_signature_url || entry.checkin_signature_url) && 
                                        <FileSignature className="w-3 h-3" />}
                                    </span>
                                  )}
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
                                        <p className="font-semibold">{selectedEntry.tools.name}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                                        <p className="font-semibold">{selectedEntry.profiles.full_name}</p>
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
                                        <p className="text-xs text-muted-foreground">
                                          Por: {selectedEntry.checked_out_by_profile?.full_name || "-"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Data de Devolução</p>
                                        <p>
                                          {selectedEntry.checkin_date 
                                            ? format(new Date(selectedEntry.checkin_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                            : "Não devolvida"}
                                        </p>
                                        {selectedEntry.checked_in_by_profile && (
                                          <p className="text-xs text-muted-foreground">
                                            Por: {selectedEntry.checked_in_by_profile.full_name}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    {hasMedia(selectedEntry) && (
                                      <div className="pt-4 border-t space-y-4">
                                        <h4 className="font-semibold">Fotos e Assinaturas</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <p className="text-sm font-medium">Retirada</p>
                                            {selectedEntry.checkout_photo_url && (
                                              <div>
                                                <p className="text-xs text-muted-foreground mb-1">Foto:</p>
                                                <SignedImage storagePath={selectedEntry.checkout_photo_url} alt="Foto na retirada" className="w-full h-40 object-cover rounded-lg" />
                                              </div>
                                            )}
                                            {selectedEntry.checkout_signature_url && (
                                              <div>
                                                <p className="text-xs text-muted-foreground mb-1">Assinatura:</p>
                                                <div className="border rounded-lg p-2 bg-white">
                                                  <SignedImage storagePath={selectedEntry.checkout_signature_url} alt="Assinatura na retirada" className="w-full h-20 object-contain" />
                                                </div>
                                              </div>
                                            )}
                                            {!selectedEntry.checkout_photo_url && !selectedEntry.checkout_signature_url && (
                                              <p className="text-sm text-muted-foreground">Sem registros</p>
                                            )}
                                          </div>
                                          <div className="space-y-2">
                                            <p className="text-sm font-medium">Devolução</p>
                                            {selectedEntry.checkin_photo_url && (
                                              <div>
                                                <p className="text-xs text-muted-foreground mb-1">Foto:</p>
                                                <SignedImage storagePath={selectedEntry.checkin_photo_url} alt="Foto na devolução" className="w-full h-40 object-cover rounded-lg" />
                                              </div>
                                            )}
                                            {selectedEntry.checkin_signature_url && (
                                              <div>
                                                <p className="text-xs text-muted-foreground mb-1">Assinatura:</p>
                                                <div className="border rounded-lg p-2 bg-white">
                                                  <SignedImage storagePath={selectedEntry.checkin_signature_url} alt="Assinatura na devolução" className="w-full h-20 object-contain" />
                                                </div>
                                              </div>
                                            )}
                                            {!selectedEntry.checkin_photo_url && !selectedEntry.checkin_signature_url && (
                                              <p className="text-sm text-muted-foreground">Sem registros</p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteDialog({ open: true, entry })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                          <h3 className="font-semibold text-sm truncate">{entry.tools.name}</h3>
                          <p className="text-xs text-muted-foreground">{entry.profiles.full_name}</p>
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
                                      <p className="font-semibold">{selectedEntry.tools.name}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                                      <p className="font-semibold">{selectedEntry.profiles.full_name}</p>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteDialog({ open: true, entry })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
        itemName={deleteDialog.entry ? `${deleteDialog.entry.tools.name} - ${deleteDialog.entry.profiles.full_name}` : ""}
      />
    </div>
  );
}
