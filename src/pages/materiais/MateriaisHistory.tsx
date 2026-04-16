import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RequestItem {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  notes: string | null;
}

interface MaterialRequest {
  id: string;
  construction_site: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  rejection_reason: string | null;
  approved_at: string | null;
  items: RequestItem[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Pendente", variant: "secondary", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Aprovado", variant: "default", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: "Rejeitado", variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
};

export default function MateriaisHistory() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("material_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      // Fetch items for all requests
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
    load();
  }, [user]);

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
        <h1 className="text-3xl font-bold text-foreground">Minhas Solicitações</h1>
        <p className="text-muted-foreground mt-1">Acompanhe o status das suas requisições de materiais</p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const sc = statusConfig[req.status] || statusConfig.pending;
            return (
              <Card key={req.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base">
                        Solicitação #{req.id.slice(0, 8)}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(req.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant={sc.variant} className="gap-1">
                      {sc.icon} {sc.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {req.construction_site && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Obra:</strong> {req.construction_site}
                    </p>
                  )}
                  {req.notes && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Obs:</strong> {req.notes}
                    </p>
                  )}
                  {req.rejection_reason && (
                    <p className="text-sm text-destructive">
                      <strong>Motivo da rejeição:</strong> {req.rejection_reason}
                    </p>
                  )}
                  {req.approved_at && (
                    <p className="text-xs text-muted-foreground">
                      {req.status === "approved" ? "Aprovado" : req.status === "rejected" ? "Rejeitado" : "Atualizado"} em {format(new Date(req.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">Material</th>
                          <th className="text-center p-2 font-medium">Qtd</th>
                          <th className="text-center p-2 font-medium">Un</th>
                        </tr>
                      </thead>
                      <tbody>
                        {req.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-2">{item.material_name}</td>
                            <td className="p-2 text-center">{item.quantity}</td>
                            <td className="p-2 text-center">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
