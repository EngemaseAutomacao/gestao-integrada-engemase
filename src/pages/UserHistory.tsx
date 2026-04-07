import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History as HistoryIcon, Search, X, ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, subMonths, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HistorySkeleton } from "@/components/PageSkeleton";
import { TransferAssetDialog } from "@/components/TransferAssetDialog";
import { useTransferStatus } from "@/hooks/useTransferStatus";

interface HistoryEntry {
  id: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string;
  construction_site: string | null;
  estimated_return_date: string | null;
  tools: {
    name: string;
  };
  checked_out_by_profile: {
    full_name: string;
  } | null;
  checked_in_by_profile: {
    full_name: string;
  } | null;
  notes: string | null;
}

export default function UserHistory() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [transferDialog, setTransferDialog] = useState<{ open: boolean; checkoutId: string; toolName: string }>({ open: false, checkoutId: "", toolName: "" });
  const [cancellingTransfer, setCancellingTransfer] = useState<string | null>(null);

  const handleCancelTransfer = useCallback(async (transferId: string) => {
    setCancellingTransfer(transferId);
    try {
      const { error } = await supabase
        .from("asset_transfers")
        .update({ status: "cancelled" })
        .eq("id", transferId);
      if (error) throw error;
      toast.success("Transferência cancelada.");
      reloadTransfers();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao cancelar transferência");
    } finally {
      setCancellingTransfer(null);
    }
  }, [reloadTransfers]);

  const checkedOutIds = history.filter(e => e.status === "checked_out").map(e => e.id);
  const { transfers, reload: reloadTransfers } = useTransferStatus(checkedOutIds, "tool");

  useEffect(() => {
    loadHistory();
  }, []);

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
          tools (name),
          checked_out_by_profile:profiles!tool_checkouts_checked_out_by_fkey (full_name),
          checked_in_by_profile:profiles!tool_checkouts_checked_in_by_fkey (full_name)
        `)
        .eq("user_id", profile!.id)
        .order("checkout_date", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
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
      default: return null;
    }
  };

  const filteredHistory = history.filter((entry) => {
    const matchesSearch = 
      entry.tools.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.construction_site && entry.construction_site.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === "all" || entry.status === statusFilter;

    const dateRange = getDateRange();
    const matchesPeriod = !dateRange || (
      isAfter(new Date(entry.checkout_date), startOfDay(dateRange.start)) &&
      isBefore(new Date(entry.checkout_date), endOfDay(dateRange.end))
    );

    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const hasActiveFilters = searchQuery || statusFilter !== "all" || periodFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPeriodFilter("all");
  };

  if (loading) {
    return <HistorySkeleton />;
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      <div className="shrink-0 hidden sm:block">
        <h2 className="text-3xl font-bold tracking-tight">Meu Histórico</h2>
        <p className="text-muted-foreground">Histórico de retiradas e devoluções</p>
      </div>

      <Card className="shrink-0">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre suas movimentações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ferramenta ou obra..."
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ferramenta</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Retirada</TableHead>
                  <TableHead>Retirado Por</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead>Devolução</TableHead>
                  <TableHead>Devolvido Por</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.tools.name}</TableCell>
                    <TableCell>{entry.construction_site || "-"}</TableCell>
                    <TableCell>
                      {format(new Date(entry.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {entry.checked_out_by_profile?.full_name || "-"}
                    </TableCell>
                    <TableCell>
                      {entry.estimated_return_date
                        ? format(new Date(entry.estimated_return_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {entry.checkin_date
                        ? format(new Date(entry.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {entry.checked_in_by_profile?.full_name || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant={entry.status === "checked_out" ? "default" : "secondary"}>
                          {entry.status === "checked_out" ? "Em Uso" : "Devolvida"}
                        </Badge>
                        {entry.estimated_return_date && entry.status === "checked_out" && new Date(entry.estimated_return_date) < new Date() && (
                          <Badge variant="destructive">Atrasado</Badge>
                        )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.status === "checked_out" && (() => {
                          const transfer = transfers[entry.id];
                          if (transfer) {
                            const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" }> = {
                              pending: { label: "Transferência Pendente", variant: "outline" },
                              accepted: { label: "Aguardando Aprovação", variant: "default" },
                              approved: { label: "Transferência Concluída", variant: "secondary" },
                            };
                            const s = statusMap[transfer.status] || { label: transfer.status, variant: "outline" as const };
                            return (
                              <div className="flex flex-col gap-1">
                                <Badge variant={s.variant} className="gap-1 text-xs">
                                  <ArrowRightLeft className="w-3 h-3" />
                                  {s.label}
                                </Badge>
                                {transfer.to_user && (
                                  <span className="text-xs text-muted-foreground">→ {transfer.to_user}</span>
                                )}
                              </div>
                            );
                          }
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => setTransferDialog({ open: true, checkoutId: entry.id, toolName: entry.tools.name })}
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              Transferir
                            </Button>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <TransferAssetDialog
          open={transferDialog.open}
          onOpenChange={(open) => setTransferDialog((prev) => ({ ...prev, open }))}
          assetType="tool"
          checkoutId={transferDialog.checkoutId}
          assetName={transferDialog.toolName}
          onTransferCreated={() => { loadHistory(); reloadTransfers(); }}
        />
      </div>
    );
  }
