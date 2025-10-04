import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Package, Wrench, History, Calendar, User, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  tag: string | null;
  brand: string | null;
  condition: string;
  quantity_available: number;
  quantity_total: number;
  employee_only: boolean;
}

interface MaintenanceRecord {
  id: string;
  maintenance_type: string;
  description: string;
  condition_before: string | null;
  condition_after: string | null;
  cost: number | null;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface UsageHistory {
  checkout_id: string;
  user_name: string;
  user_email: string;
  user_category: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string;
  construction_site: string | null;
  days_used: number;
}

const conditionLabels: Record<string, string> = {
  excellent: "Excelente",
  good: "Bom",
  fair: "Regular",
  poor: "Ruim",
  needs_maintenance: "Precisa Manutenção",
};

const conditionColors: Record<string, string> = {
  excellent: "bg-green-500",
  good: "bg-blue-500",
  fair: "bg-yellow-500",
  poor: "bg-orange-500",
  needs_maintenance: "bg-red-500",
};

const maintenanceTypes: Record<string, string> = {
  preventive: "Preventiva",
  corrective: "Corretiva",
  inspection: "Inspeção",
  calibration: "Calibração",
  cleaning: "Limpeza",
  repair: "Reparo",
};

export default function ToolDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tool, setTool] = useState<Tool | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadToolData();
    }
  }, [id]);

  const loadToolData = async () => {
    try {
      // Load tool details
      const { data: toolData, error: toolError } = await supabase
        .from("tools")
        .select("*")
        .eq("id", id)
        .single();

      if (toolError) throw toolError;
      setTool(toolData);

      // Load maintenance records
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from("maintenance_records")
        .select(`
          *,
          profiles (full_name)
        `)
        .eq("tool_id", id)
        .order("created_at", { ascending: false });

      if (maintenanceError) throw maintenanceError;
      setMaintenanceRecords(maintenanceData as any || []);

      // Load usage history
      const { data: usageData, error: usageError } = await supabase
        .rpc("get_tool_usage_history", { tool_uuid: id });

      if (usageError) throw usageError;
      setUsageHistory(usageData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !tool) {
    return (
      <div className="flex items-center justify-center h-full">
        <Package className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{tool.name}</h2>
          <p className="text-muted-foreground">Detalhes e histórico completo</p>
        </div>
      </div>

      {/* Tool Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Informações da Ferramenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tool.tag && (
              <div>
                <p className="text-sm font-medium">TAG</p>
                <p className="text-muted-foreground">{tool.tag}</p>
              </div>
            )}
            {tool.brand && (
              <div>
                <p className="text-sm font-medium">Marca</p>
                <p className="text-muted-foreground">{tool.brand}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium">Disponível/Total</p>
              <p className="text-muted-foreground">
                {tool.quantity_available}/{tool.quantity_total}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Condição</p>
              <Badge className={conditionColors[tool.condition]}>
                {conditionLabels[tool.condition]}
              </Badge>
            </div>
          </div>
          {tool.description && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Descrição</p>
                <p className="text-muted-foreground">{tool.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Histórico de Manutenções
          </CardTitle>
          <CardDescription>
            {maintenanceRecords.length} manutenções registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {maintenanceRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma manutenção registrada
            </p>
          ) : (
            <div className="space-y-4">
              {maintenanceRecords.map((record) => (
                <Card key={record.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">
                          {maintenanceTypes[record.maintenance_type]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(record.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm">{record.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        {record.profiles.full_name}
                        {record.cost && <span className="ml-4">• Custo: R$ {record.cost.toFixed(2)}</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Uso
          </CardTitle>
          <CardDescription>
            {usageHistory.length} registros de uso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usageHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum uso registrado
            </p>
          ) : (
            <div className="space-y-4">
              {usageHistory.map((usage) => (
                <Card key={usage.checkout_id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{usage.user_name}</p>
                          <p className="text-sm text-muted-foreground">{usage.user_email}</p>
                        </div>
                        <Badge variant={usage.status === "checked_out" ? "default" : "secondary"}>
                          {usage.status === "checked_out" ? "Em Uso" : "Devolvida"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Retirada</p>
                            <p>{format(new Date(usage.checkout_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                          </div>
                        </div>
                        
                        {usage.checkin_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Devolução</p>
                              <p>{format(new Date(usage.checkin_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        {usage.construction_site && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{usage.construction_site}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{usage.days_used} dias</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}