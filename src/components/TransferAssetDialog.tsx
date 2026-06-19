import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRightLeft, Loader2 } from "lucide-react";

interface TransferAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetType: "tool" | "vehicle";
  checkoutId: string;
  assetName: string;
  onTransferCreated?: () => void;
}

interface UserOption {
  id: string;
  full_name: string;
  email: string;
}

export function TransferAssetDialog({
  open,
  onOpenChange,
  assetType,
  checkoutId,
  assetName,
  onTransferCreated,
}: TransferAssetDialogProps) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (open) {
      loadUsers();
      setSelectedUserId("");
      setNotes("");
    }
  }, [open]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.rpc("get_approved_users");

      if (error) throw error;
      setUsers((data || []).filter((u: any) => u.id !== profile!.id));
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUserId) {
      toast.error("Selecione o destinatário da transferência");
      return;
    }

    setLoading(true);
    try {
      const insertData: Record<string, unknown> = {
        asset_type: assetType,
        from_user_id: profile!.id,
        to_user_id: selectedUserId,
        notes: notes || null,
      };

      if (assetType === "tool") {
        insertData.tool_checkout_id = checkoutId;
      } else {
        insertData.vehicle_checkout_id = checkoutId;
      }

      const { error } = await supabase
        .from("asset_transfers")
        .insert(insertData as any);

      if (error) throw error;

      toast.success("Solicitação de transferência enviada! O destinatário será notificado.");
      onOpenChange(false);
      onTransferCreated?.();
    } catch (error: any) {
      console.error("Erro ao criar transferência:", error?.message, error?.details, error?.hint, error);
      toast.error(error?.message || "Erro ao solicitar transferência");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Transferir {assetType === "tool" ? "Ferramenta" : "Veículo"}
          </DialogTitle>
          <DialogDescription>
            Transferir a posse de <strong>{assetName}</strong> para outro usuário.
            O destinatário precisará aceitar e um administrador deverá aprovar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Transferir para</Label>
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando usuários...
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destinatário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              placeholder="Motivo da transferência..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleTransfer} disabled={loading || !selectedUserId}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Solicitar Transferência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
