import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Package, Clock, CheckCircle2, XCircle, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface RequestItem {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  notes: string | null;
}

interface MaterialRequest {
  id: string;
  requested_by_name: string;
  construction_site: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  items: RequestItem[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Pendente", variant: "secondary", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Aprovado", variant: "default", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: "Rejeitado", variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
};

export default function MateriaisAdmin() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (profile?.role !== "admin") return;
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("material_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const requestIds = data.map((r: any) => r.id);
    const { data: items } = await supabase
      .from("material_request_items")
      .select("*")
      .in("request_id", requestIds.length > 0 ? requestIds : ["__none__"]);

    const enriched = data.map((r: any) => ({
      ...r,
      items: (items || []).filter((i: any) => i.request_id === r.id),
    }));

    setRequests(enriched);
    setLoading(false);
  };

  const updateStatus = async (requestId: string, newStatus: string) => {
    const { error } = await supabase
      .from("material_requests")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    toast.success(`Status atualizado para ${statusConfig[newStatus]?.label || newStatus}`);
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
    );
  };

  const exportToExcel = (req: MaterialRequest) => {
    const rows = req.items.map((item) => ({
      Material: item.material_name,
      Quantidade: item.quantity,
      Unidade: item.unit,
      Observação: item.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Materiais");

    // Add header info
    XLSX.utils.sheet_add_aoa(ws, [
      [`Solicitação: ${req.id.slice(0, 8)}`],
      [`Solicitante: ${req.requested_by_name}`],
      [`Obra: ${req.construction_site || "N/A"}`],
      [`Data: ${format(new Date(req.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`],
      [],
    ], { origin: "E1" });

    XLSX.writeFile(wb, `requisicao_${req.id.slice(0, 8)}_${format(new Date(), "ddMMyyyy")}.xlsx`);
    toast.success("Excel exportado com sucesso!");
  };

  const filteredRequests = filterStatus === "all"
    ? requests
    : requests.filter((r) => r.status === filterStatus);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold text-foreground">Gerenciar Solicitações</h1>
        <p className="text-muted-foreground mt-1">Aprove, rejeite e exporte requisições de materiais</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const sc = statusConfig[req.status] || statusConfig.pending;
            return (
              <Card key={req.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base">
                        #{req.id.slice(0, 8)} — {req.requested_by_name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(req.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {req.construction_site && ` • Obra: ${req.construction_site}`}
                      </p>
                    </div>
                    <Badge variant={sc.variant} className="gap-1">
                      {sc.icon} {sc.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {req.notes && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Obs:</strong> {req.notes}
                    </p>
                  )}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">Material</th>
                          <th className="text-center p-2 font-medium">Qtd</th>
                          <th className="text-center p-2 font-medium">Un</th>
                          <th className="text-left p-2 font-medium hidden sm:table-cell">Obs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {req.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-2">{item.material_name}</td>
                            <td className="p-2 text-center">{item.quantity}</td>
                            <td className="p-2 text-center">{item.unit}</td>
                            <td className="p-2 hidden sm:table-cell text-muted-foreground">{item.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {req.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => updateStatus(req.id, "approved")}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprovar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => updateStatus(req.id, "rejected")}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Rejeitar
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => exportToExcel(req)}>
                      <FileDown className="w-3.5 h-3.5 mr-1" /> Exportar Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
