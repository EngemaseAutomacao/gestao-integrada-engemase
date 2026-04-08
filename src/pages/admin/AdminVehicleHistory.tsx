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
import { Loader2, Search, Eye, FileText, FileSpreadsheet, Camera, Brain, Trash2 } from "lucide-react";
import { SignedImage } from "@/components/SignedImage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";
import { DeleteWithReasonDialog } from "@/components/DeleteWithReasonDialog";

interface VehicleHistoryEntry {
  id: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string | null;
  destination: string | null;
  km_checkout: number;
  km_checkin: number | null;
  refueled: boolean | null;
  notes: string | null;
  photo_front_checkout: string | null;
  photo_back_checkout: string | null;
  photo_left_checkout: string | null;
  photo_right_checkout: string | null;
  photo_dashboard_checkout: string | null;
  photo_front_checkin: string | null;
  photo_back_checkin: string | null;
  photo_left_checkin: string | null;
  photo_right_checkin: string | null;
  photo_dashboard_checkin: string | null;
  vehicles: {
    name: string;
    plate: string;
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
}

export default function AdminVehicleHistory() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<VehicleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<VehicleHistoryEntry | null>(null);
  const [aiEstimation, setAiEstimation] = useState<{
    checkout_km: number | null;
    checkin_km: number | null;
    distance_km: number | null;
    confidence: string;
    notes: string;
  } | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; entry: VehicleHistoryEntry | null }>({ open: false, entry: null });

  const handleDeleteEntry = async (reason: string) => {
    if (!deleteDialog.entry) return;
    try {
      const { error } = await supabase
        .from("vehicle_checkouts")
        .delete()
        .eq("id", deleteDialog.entry.id);

      if (error) throw error;

      await supabase.from("system_logs").insert({
        action: "delete_history",
        entity_type: "vehicle_checkout",
        entity_id: deleteDialog.entry.id,
        user_id: profile!.id,
        user_name: profile!.full_name,
        details: {
          vehicle_name: deleteDialog.entry.vehicles.name,
          plate: deleteDialog.entry.vehicles.plate,
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
        .from("vehicle_checkouts")
        .select(`
          id,
          checkout_date,
          checkin_date,
          status,
          destination,
          km_checkout,
          km_checkin,
          refueled,
          notes,
          photo_front_checkout,
          photo_back_checkout,
          photo_left_checkout,
          photo_right_checkout,
          photo_dashboard_checkout,
          photo_front_checkin,
          photo_back_checkin,
          photo_left_checkin,
          photo_right_checkin,
          photo_dashboard_checkin,
          vehicles (name, plate),
          profiles:profiles!vehicle_checkouts_user_id_fkey (full_name, category),
          checked_out_by_profile:profiles!vehicle_checkouts_checked_out_by_fkey (full_name),
          checked_in_by_profile:profiles!vehicle_checkouts_checked_in_by_fkey (full_name)
        `)
        .order("checkout_date", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading vehicle history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((entry) => {
    const matchesSearch =
      entry.vehicles.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.vehicles.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.destination && entry.destination.toLowerCase().includes(searchQuery.toLowerCase()));

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

  const hasPhotos = (entry: VehicleHistoryEntry) => {
    return entry.photo_front_checkout || entry.photo_front_checkin ||
      entry.photo_dashboard_checkout || entry.photo_dashboard_checkin;
  };

  const canEstimateKm = (entry: VehicleHistoryEntry) => {
    return entry.photo_dashboard_checkout && entry.photo_dashboard_checkin;
  };

  const estimateKm = async (entry: VehicleHistoryEntry) => {
    if (!entry.photo_dashboard_checkout || !entry.photo_dashboard_checkin) {
      toast.error("Fotos do painel de saída e devolução são necessárias");
      return;
    }

    setEstimating(true);
    setAiEstimation(null);

    try {
      const { data, error } = await supabase.functions.invoke("read-odometer", {
        body: {
          checkout_photo_path: entry.photo_dashboard_checkout,
          checkin_photo_path: entry.photo_dashboard_checkin,
        },
      });

      if (error) throw error;

      const estimation = data as {
        checkout_km: number | null;
        checkin_km: number | null;
        distance_km: number | null;
        confidence: string;
        notes: string;
      };

      setAiEstimation(estimation);

      if (estimation.confidence === "low" || estimation.checkin_km === null) {
        toast.warning("Baixa confiança na leitura. Verifique manualmente.");
        return;
      }

      const updateData: { km_checkin: number; km_checkout?: number } = {
        km_checkin: estimation.checkin_km,
      };

      if (estimation.checkout_km !== null && entry.km_checkout === 0) {
        updateData.km_checkout = estimation.checkout_km;
      }

      const { error: updateError } = await supabase
        .from("vehicle_checkouts")
        .update(updateData)
        .eq("id", entry.id);

      if (updateError) throw updateError;

      setHistory((prev) =>
        prev.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                km_checkin: estimation.checkin_km,
                km_checkout: updateData.km_checkout ?? item.km_checkout,
              }
            : item
        )
      );

      setSelectedEntry((prev) =>
        prev && prev.id === entry.id
          ? {
              ...prev,
              km_checkin: estimation.checkin_km,
              km_checkout: updateData.km_checkout ?? prev.km_checkout,
            }
          : prev
      );

      toast.success("Estimativa concluída e salva no histórico!");
    } catch (error) {
      console.error("Error estimating km:", error);
      toast.error("Erro ao estimar quilometragem");
    } finally {
      setEstimating(false);
    }
  };

  const exportPDF = () => {
    if (filteredHistory.length === 0) {
      toast.error("Nenhum registro para exportar");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.text("Histórico de Veículos", 14, 20);
    doc.setFontSize(11);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 28);
    doc.text(`Total: ${filteredHistory.length} registros`, 14, 34);

    autoTable(doc, {
      head: [["Veículo", "Placa", "Usuário", "Categoria", "Destino", "Saída", "KM Saída", "Chegada", "KM Chegada", "Status"]],
      body: filteredHistory.map((e) => [
        e.vehicles.name,
        e.vehicles.plate,
        e.profiles.full_name,
        e.profiles.category === "engemase_employee" ? "Funcionário" : e.profiles.category === "socios" ? "Sócio" : "Terceirizado",
        e.destination || "-",
        format(new Date(e.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        e.km_checkout.toLocaleString(),
        e.checkin_date ? format(new Date(e.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
        e.km_checkin !== null ? e.km_checkin.toLocaleString() : "-",
        e.status === "checked_out" ? "Em Uso" : "Devolvido",
      ]),
      startY: 40,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`historico-veiculos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportado!");
  };

  const exportExcel = () => {
    if (filteredHistory.length === 0) {
      toast.error("Nenhum registro para exportar");
      return;
    }
    const rows = filteredHistory.map((e) => ({
      Veículo: e.vehicles.name,
      Placa: e.vehicles.plate,
      Usuário: e.profiles.full_name,
      Categoria: e.profiles.category === "engemase_employee" ? "Funcionário" : e.profiles.category === "socios" ? "Sócio" : "Terceirizado",
      Destino: e.destination || "-",
      Saída: format(new Date(e.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      "KM Saída": e.km_checkout,
      Chegada: e.checkin_date ? format(new Date(e.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-",
      "KM Chegada": e.km_checkin !== null ? e.km_checkin : "-",
      "KM Percorridos": e.km_checkin !== null ? e.km_checkin - e.km_checkout : "-",
      Abastecido: e.refueled === null ? "-" : e.refueled ? "Sim" : "Não",
      Status: e.status === "checked_out" ? "Em Uso" : "Devolvido",
      "Retirado por": e.checked_out_by_profile?.full_name || "-",
      "Devolvido por": e.checked_in_by_profile?.full_name || "-",
      Observações: e.notes || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico Veículos");
    XLSX.writeFile(wb, `historico-veiculos-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Excel exportado!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const PhotoSection = ({ label, photos }: { label: string; photos: { label: string; path: string | null }[] }) => {
    const validPhotos = photos.filter(p => p.path);
    if (validPhotos.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {validPhotos.map((photo, i) => (
            <div key={i}>
              <p className="text-xs text-muted-foreground mb-1">{photo.label}</p>
              <SignedImage storagePath={photo.path!} alt={photo.label} className="w-full h-24 object-cover rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 sm:gap-6">
      <div className="shrink-0 flex items-center justify-between flex-wrap gap-4">
        <div className="hidden sm:block">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Histórico Geral de Veículos</h2>
          <p className="text-sm text-muted-foreground">Visualize todas as movimentações de veículos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2">
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
                placeholder="Buscar veículo, placa ou usuário..."
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
                <SelectItem value="checked_in">Devolvido</SelectItem>
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
                      <TableHead>Veículo</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead>Chegada</TableHead>
                      <TableHead>KM</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.vehicles.name}</TableCell>
                        <TableCell>{entry.vehicles.plate}</TableCell>
                        <TableCell>{entry.profiles.full_name}</TableCell>
                        <TableCell>{getCategoryBadge(entry.profiles.category)}</TableCell>
                        <TableCell>{entry.destination || "-"}</TableCell>
                        <TableCell>
                          {format(new Date(entry.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {entry.checkin_date
                            ? format(new Date(entry.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {entry.km_checkin !== null
                            ? `${(entry.km_checkin - entry.km_checkout).toLocaleString()} km`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.status === "checked_out" ? "default" : "secondary"}>
                            {entry.status === "checked_out" ? "Em Uso" : "Devolvido"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedEntry(entry); setAiEstimation(null); }}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  Ver
                                  {hasPhotos(entry) && <Camera className="w-3 h-3 ml-1" />}
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
                                        <p className="text-sm font-medium text-muted-foreground">Veículo</p>
                                        <p className="font-semibold">{selectedEntry.vehicles.name} - {selectedEntry.vehicles.plate}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                                        <p className="font-semibold">{selectedEntry.profiles.full_name}</p>
                                        {getCategoryBadge(selectedEntry.profiles.category)}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Destino</p>
                                        <p>{selectedEntry.destination || "Não informado"}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                                        <Badge variant={selectedEntry.status === "checked_out" ? "default" : "secondary"}>
                                          {selectedEntry.status === "checked_out" ? "Em Uso" : "Devolvido"}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Saída</p>
                                        <p>{format(new Date(selectedEntry.checkout_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                        <p className="text-xs text-muted-foreground">
                                          KM: {selectedEntry.km_checkout.toLocaleString()} | Por: {selectedEntry.checked_out_by_profile?.full_name || "-"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Chegada</p>
                                        <p>
                                          {selectedEntry.checkin_date
                                            ? format(new Date(selectedEntry.checkin_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                            : "Não devolvido"}
                                        </p>
                                        {selectedEntry.km_checkin !== null && (
                                          <p className="text-xs text-muted-foreground">
                                            KM: {selectedEntry.km_checkin.toLocaleString()} | Por: {selectedEntry.checked_in_by_profile?.full_name || "-"}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {selectedEntry.km_checkin !== null && (
                                      <div className="pt-4 border-t">
                                        <p className="text-sm font-medium text-muted-foreground">Distância Percorrida</p>
                                        <p className="text-lg font-bold text-primary">
                                          {(selectedEntry.km_checkin - selectedEntry.km_checkout).toLocaleString()} km
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Abastecido: {selectedEntry.refueled === null ? "Não informado" : selectedEntry.refueled ? "Sim" : "Não"}
                                        </p>
                                      </div>
                                    )}

                                    {canEstimateKm(selectedEntry) && (
                                      <div className="pt-4 border-t">
                                        <div className="flex items-center justify-between">
                                          <p className="text-sm font-medium text-muted-foreground">Estimativa por IA</p>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-2"
                                            onClick={() => estimateKm(selectedEntry)}
                                            disabled={estimating}
                                          >
                                            {estimating ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <Brain className="w-4 h-4" />
                                            )}
                                            {estimating ? "Analisando..." : "Estimar KM via IA"}
                                          </Button>
                                        </div>
                                        {aiEstimation && (
                                          <div className="mt-3 p-3 rounded-lg bg-muted/50 space-y-2">
                                            <div className="flex items-center gap-2">
                                              <Badge variant={
                                                aiEstimation.confidence === "high" ? "default" :
                                                aiEstimation.confidence === "medium" ? "secondary" : "destructive"
                                              }>
                                                {aiEstimation.confidence === "high" ? "Alta confiança" :
                                                 aiEstimation.confidence === "medium" ? "Média confiança" : "Baixa confiança"}
                                              </Badge>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                              <div>
                                                <p className="text-muted-foreground text-xs">KM Saída</p>
                                                <p className="font-medium">{aiEstimation.checkout_km?.toLocaleString() || "N/A"}</p>
                                              </div>
                                              <div>
                                                <p className="text-muted-foreground text-xs">KM Chegada</p>
                                                <p className="font-medium">{aiEstimation.checkin_km?.toLocaleString() || "N/A"}</p>
                                              </div>
                                              <div>
                                                <p className="text-muted-foreground text-xs">Distância</p>
                                                <p className="font-bold text-primary">{aiEstimation.distance_km?.toLocaleString() || "N/A"} km</p>
                                              </div>
                                            </div>
                                            {aiEstimation.notes && (
                                              <p className="text-xs text-muted-foreground">{aiEstimation.notes}</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {selectedEntry.notes && (
                                      <div className="pt-4 border-t">
                                        <p className="text-sm font-medium text-muted-foreground">Observações</p>
                                        <p className="text-sm">{selectedEntry.notes}</p>
                                      </div>
                                    )}

                                    {hasPhotos(selectedEntry) && (
                                      <div className="pt-4 border-t space-y-4">
                                        <h4 className="font-semibold">Fotos</h4>
                                        <PhotoSection
                                          label="Saída"
                                          photos={[
                                            { label: "Frente", path: selectedEntry.photo_front_checkout },
                                            { label: "Traseira", path: selectedEntry.photo_back_checkout },
                                            { label: "Esquerda", path: selectedEntry.photo_left_checkout },
                                            { label: "Direita", path: selectedEntry.photo_right_checkout },
                                            { label: "Painel", path: selectedEntry.photo_dashboard_checkout },
                                          ]}
                                        />
                                        <PhotoSection
                                          label="Devolução"
                                          photos={[
                                            { label: "Frente", path: selectedEntry.photo_front_checkin },
                                            { label: "Traseira", path: selectedEntry.photo_back_checkin },
                                            { label: "Esquerda", path: selectedEntry.photo_left_checkin },
                                            { label: "Direita", path: selectedEntry.photo_right_checkin },
                                            { label: "Painel", path: selectedEntry.photo_dashboard_checkin },
                                          ]}
                                        />
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
                  <Card key={entry.id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {entry.vehicles.name} - {entry.vehicles.plate}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.profiles.full_name} • {entry.destination || "Sem destino"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.checkout_date), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                          <Badge variant={entry.status === "checked_out" ? "default" : "secondary"} className="text-[10px]">
                            {entry.status === "checked_out" ? "Em Uso" : "Devolvido"}
                          </Badge>
                          {entry.km_checkin !== null && (
                            <span className="text-xs font-medium text-primary">
                              {(entry.km_checkin - entry.km_checkout).toLocaleString()} km
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedEntry(entry); setAiEstimation(null); }}>
                              <Eye className="w-4 h-4" />
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
                                    <p className="text-sm font-medium text-muted-foreground">Veículo</p>
                                    <p className="font-semibold">{selectedEntry.vehicles.name} - {selectedEntry.vehicles.plate}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                                    <p className="font-semibold">{selectedEntry.profiles.full_name}</p>
                                  </div>
                                </div>
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
