import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, Check, X, Clock, Loader2, ArrowRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { DeleteWithReasonDialog } from "@/components/DeleteWithReasonDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Transfer {
  id: string;
  asset_type: string;
  tool_checkout_id: string | null;
  vehicle_checkout_id: string | null;
  from_user_id: string;
  to_user_id: string;
  status: string;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  accepted_at: string | null;
  approved_at: string | null;
  from_user: { full_name: string } | null;
  to_user: { full_name: string } | null;
  approved_by_profile: { full_name: string } | null;
  asset_name?: string;
}

export default function Transfers() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; transferId: string | null }>({ open: false, transferId: null });
  const [rejectionReason, setRejectionReason] = useState("");
  const isAdmin = profile?.role === "admin";
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; transfer: Transfer | null }>({ open: false, transfer: null });

  const { data: transfers = [], isLoading: loading, refetch } = useQuery<Transfer[]>({
    queryKey: ["asset-transfers"],
    queryFn: fetchTransfers,
    staleTime: 30_000,
  });

  const invalidateTransfers = () => queryClient.invalidateQueries({ queryKey: ["asset-transfers"] });

  const handleDeleteTransfer = async (reason: string) => {
    if (!deleteDialog.transfer) return;
    try {
      const { error } = await supabase
        .from("asset_transfers")
        .delete()
        .eq("id", deleteDialog.transfer.id);

      if (error) throw error;

      await supabase.from("system_logs").insert({
        action: "delete_history",
        entity_type: "asset_transfer",
        entity_id: deleteDialog.transfer.id,
        user_id: profile!.id,
        user_name: profile!.full_name,
        details: {
          asset_name: deleteDialog.transfer.asset_name,
          from_user: deleteDialog.transfer.from_user?.full_name,
          to_user: deleteDialog.transfer.to_user?.full_name,
          reason,
        },
      });

      setTransfers((prev) => prev.filter((t) => t.id !== deleteDialog.transfer!.id));
      toast.success("Registro de transferência excluído");
    } catch (error) {
      console.error("Erro ao excluir transferência:", error);
      toast.error("Erro ao excluir transferência");
      throw error;
    }
  };

  useEffect(() => {
    loadTransfers();

    const channel = supabase
      .channel("transfers-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "asset_transfers" }, () => {
        loadTransfers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from("asset_transfers")
        .select(`
          *,
          from_user:profiles!asset_transfers_from_user_id_fkey(full_name),
          to_user:profiles!asset_transfers_to_user_id_fkey(full_name),
          approved_by_profile:profiles!asset_transfers_approved_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with asset names
      const enriched = await Promise.all(
        (data || []).map(async (t: any) => {
          let asset_name = "";
          if (t.asset_type === "tool" && t.tool_checkout_id) {
            const { data: tc } = await supabase
              .from("tool_checkouts")
              .select("tools(name)")
              .eq("id", t.tool_checkout_id)
              .single();
            asset_name = (tc as any)?.tools?.name || "Ferramenta";
          } else if (t.asset_type === "vehicle" && t.vehicle_checkout_id) {
            const { data: vc } = await supabase
              .from("vehicle_checkouts")
              .select("vehicles(name, plate)")
              .eq("id", t.vehicle_checkout_id)
              .single();
            const v = (vc as any)?.vehicles;
            asset_name = v ? `${v.name} (${v.plate})` : "Veículo";
          }
          return { ...t, asset_name };
        })
      );

      setTransfers(enriched);
    } catch (error) {
      console.error("Erro ao carregar transferências:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (transferId: string) => {
    setActionLoading(transferId);
    try {
      const { error } = await supabase
        .from("asset_transfers")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", transferId);

      if (error) throw error;
      toast.success("Transferência aceita! Aguardando aprovação do administrador.");
      loadTransfers();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao aceitar transferência");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.transferId) return;
    setActionLoading(rejectDialog.transferId);
    try {
      const { error } = await supabase
        .from("asset_transfers")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          rejected_by: profile!.id,
          rejection_reason: rejectionReason || null,
        })
        .eq("id", rejectDialog.transferId);

      if (error) throw error;
      toast.success("Transferência rejeitada.");
      setRejectDialog({ open: false, transferId: null });
      setRejectionReason("");
      loadTransfers();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao rejeitar transferência");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (transferId: string) => {
    setActionLoading(transferId);
    try {
      // First approve
      const { error: updateError } = await supabase
        .from("asset_transfers")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: profile!.id,
        })
        .eq("id", transferId);

      if (updateError) throw updateError;

      // Execute the transfer
      const { error: execError } = await supabase.rpc("execute_asset_transfer", {
        transfer_id: transferId,
      });

      if (execError) throw execError;

      toast.success("Transferência aprovada e executada com sucesso!");
      loadTransfers();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao aprovar transferência");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (transferId: string) => {
    setActionLoading(transferId);
    try {
      const { error } = await supabase
        .from("asset_transfers")
        .update({ status: "cancelled" })
        .eq("id", transferId);

      if (error) throw error;
      toast.success("Transferência cancelada.");
      loadTransfers();
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao cancelar transferência");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
      case "accepted": return <Badge className="gap-1 bg-warning text-warning-foreground"><Clock className="w-3 h-3" /> Aguardando Aprovação</Badge>;
      case "approved": return <Badge className="gap-1 bg-primary text-primary-foreground"><Check className="w-3 h-3" /> Aprovada</Badge>;
      case "rejected": return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" /> Rejeitada</Badge>;
      case "cancelled": return <Badge variant="secondary" className="gap-1">Cancelada</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const pendingForMe = transfers.filter(
    (t) => t.to_user_id === profile?.id && t.status === "pending"
  );
  const pendingApproval = transfers.filter(
    (t) => t.status === "accepted" && isAdmin
  );
  const myTransfers = transfers.filter(
    (t) => t.from_user_id === profile?.id || t.to_user_id === profile?.id
  );

  const renderTransferCard = (transfer: Transfer, showActions: "accept" | "approve" | "cancel" | "none") => (
    <Card key={transfer.id} className="mb-3">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{transfer.asset_type === "tool" ? "Ferramenta" : "Veículo"}</Badge>
              {getStatusBadge(transfer.status)}
            </div>
            <p className="font-medium text-sm mt-1">{transfer.asset_name}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{transfer.from_user?.full_name || "Usuário"}</span>
              <ArrowRight className="w-3 h-3" />
              <span>{transfer.to_user?.full_name || "Usuário"}</span>
            </div>
            {transfer.notes && (
              <p className="text-xs text-muted-foreground">Obs: {transfer.notes}</p>
            )}
            {transfer.rejection_reason && (
              <p className="text-xs text-destructive">Motivo: {transfer.rejection_reason}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {format(new Date(transfer.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            {showActions === "accept" && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleAccept(transfer.id)}
                  disabled={actionLoading === transfer.id}
                >
                  {actionLoading === transfer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Aceitar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectDialog({ open: true, transferId: transfer.id })}
                  disabled={actionLoading === transfer.id}
                >
                  <X className="w-4 h-4" />
                  Recusar
                </Button>
              </>
            )}
            {showActions === "approve" && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleApprove(transfer.id)}
                  disabled={actionLoading === transfer.id}
                >
                  {actionLoading === transfer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectDialog({ open: true, transferId: transfer.id })}
                  disabled={actionLoading === transfer.id}
                >
                  <X className="w-4 h-4" />
                  Rejeitar
                </Button>
              </>
            )}
            {showActions === "cancel" && transfer.status === "pending" && transfer.from_user_id === profile?.id && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCancel(transfer.id)}
                disabled={actionLoading === transfer.id}
              >
                {actionLoading === transfer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Cancelar
              </Button>
            )}
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteDialog({ open: true, transfer })}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <ArrowRightLeft className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      <div className="shrink-0 hidden sm:block">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Transferências</h2>
        <p className="text-sm text-muted-foreground">Gerencie transferências de ferramentas e veículos</p>
      </div>

      <Tabs defaultValue={pendingForMe.length > 0 ? "received" : isAdmin && pendingApproval.length > 0 ? "approval" : "all"} className="flex-1 min-h-0 flex flex-col">
        <TabsList className="shrink-0">
          <TabsTrigger value="received" className="relative">
            Recebidas
            {pendingForMe.length > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
                {pendingForMe.length}
              </span>
            )}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="approval" className="relative">
              Aprovar
              {pendingApproval.length > 0 && (
                <span className="ml-1 bg-warning text-warning-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {pendingApproval.length}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="flex-1 min-h-0 overflow-y-auto mt-4">
          {pendingForMe.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma transferência pendente</p>
          ) : (
            pendingForMe.map((t) => renderTransferCard(t, "accept"))
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="approval" className="flex-1 min-h-0 overflow-y-auto mt-4">
            {pendingApproval.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma transferência aguardando aprovação</p>
            ) : (
              pendingApproval.map((t) => renderTransferCard(t, "approve"))
            )}
          </TabsContent>
        )}

        <TabsContent value="all" className="flex-1 min-h-0 overflow-y-auto mt-4">
          {myTransfers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma transferência encontrada</p>
          ) : (
            myTransfers.map((t) => renderTransferCard(t, t.from_user_id === profile?.id ? "cancel" : "none"))
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => { setRejectDialog({ open, transferId: open ? rejectDialog.transferId : null }); setRejectionReason(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Transferência</DialogTitle>
            <DialogDescription>Informe o motivo da rejeição (opcional).</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Motivo</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Motivo da rejeição..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, transferId: null })}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!actionLoading}>
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteWithReasonDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, transfer: open ? deleteDialog.transfer : null })}
        onConfirm={handleDeleteTransfer}
        title="Excluir Registro de Transferência"
        description="Esta ação é irreversível. O registro será removido permanentemente."
        itemName={deleteDialog.transfer ? `${deleteDialog.transfer.asset_name || 'Item'} (${deleteDialog.transfer.from_user?.full_name} → ${deleteDialog.transfer.to_user?.full_name})` : ""}
      />
    </div>
  );
}
