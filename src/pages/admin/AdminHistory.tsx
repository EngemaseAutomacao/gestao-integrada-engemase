import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Search, Eye, Camera, FileSignature, FileText, FileSpreadsheet, Trash2 } from "lucide-react";
import { SignedImage } from "@/components/SignedImage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";

interface HistoryEntry {
  id: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string;
  construction_site: string | null;
  estimated_return_date: string | null;
  checkout_photo_url: string | null;
  checkin_photo_url: string | null;
  checkout_signature_url: string | null;
  checkin_signature_url: string | null;
  tools: {
    name: string;
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
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

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
          estimated_return_date,
          notes,
          checkout_photo_url,
          checkin_photo_url,
          checkout_signature_url,
          checkin_signature_url,
          tools (name),
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

  const filteredHistory = history.filter((entry) => {
    const matchesSearch = 
      entry.tools.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || entry.status === statusFilter;
    
    const matchesCategory = 
      categoryFilter === "all" || entry.profiles.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

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

  const exportHistoryPDF = () => {
    if (filteredHistory.length === 0) {
      toast.error("Nenhum registro para exportar");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("Histórico de Ferramentas", 14, 20);
    doc.setFontSize(11);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 28);
    doc.text(`Total: ${filteredHistory.length} registros`, 14, 34);

    autoTable(doc, {
      head: [["Ferramenta", "Usuário", "Categoria", "Obra", "Retirada", "Devolução", "Status", "Observações"]],
      body: filteredHistory.map((e) => [
        e.tools.name,
        e.profiles.full_name,
        e.profiles.category === "engemase_employee" ? "Funcionário" : e.profiles.category === "socios" ? "Sócio" : "Terceirizado",
        e.construction_site || "-",
        format(new Date(e.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        e.checkin_date ? format(new Date(e.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
        e.status === "checked_out" ? "Em Uso" : "Devolvida",
        e.notes || "-",
      ]),
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`historico-ferramentas-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportado!");
  };

  const exportHistoryExcel = () => {
    if (filteredHistory.length === 0) {
      toast.error("Nenhum registro para exportar");
      return;
    }
    const rows = filteredHistory.map((e) => ({
      Ferramenta: e.tools.name,
      Usuário: e.profiles.full_name,
      Categoria: e.profiles.category === "engemase_employee" ? "Funcionário" : e.profiles.category === "socios" ? "Sócio" : "Terceirizado",
      Obra: e.construction_site || "-",
      Retirada: format(new Date(e.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      Devolução: e.checkin_date ? format(new Date(e.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
      Status: e.status === "checked_out" ? "Em Uso" : "Devolvida",
      "Retirado por": e.checked_out_by_profile?.full_name || "-",
      "Devolvido por": e.checked_in_by_profile?.full_name || "-",
      Observações: e.notes || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    XLSX.writeFile(wb, `historico-ferramentas-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ferramenta ou usuário..."
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
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>
            Mostrando {filteredHistory.length} de {history.length} registros
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma movimentação encontrada
            </p>
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
