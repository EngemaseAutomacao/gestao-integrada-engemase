import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Package, Wrench, History, Calendar, User, MapPin, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { SignedImage } from "@/components/SignedImage";
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
  image_url: string | null;
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

interface CheckoutRecord {
  id: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string;
  construction_site: string | null;
  selected_tag: string | null;
  notes: string | null;
  user_profile: {
    full_name: string;
    email: string;
    category: string;
  };
}

interface ToolIssue {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  reporter: {
    full_name: string;
  };
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
  const [checkouts, setCheckouts] = useState<CheckoutRecord[]>([]);
  const [issues, setIssues] = useState<ToolIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const tags = tool?.tag ? tool.tag.split(",").map(t => t.trim()).filter(Boolean) : [];
  const hasMultipleTags = tags.length > 1;

  useEffect(() => {
    if (id) {
      loadToolData();
      loadIssues();
    }
  }, [id]);

  const loadToolData = async () => {
    try {
      const { data: toolData, error: toolError } = await supabase
        .from("tools")
        .select("*")
        .eq("id", id)
        .single();

      if (toolError) throw toolError;
      setTool(toolData);

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

      const { data: checkoutData, error: checkoutError } = await supabase
        .from("tool_checkouts")
        .select(`
          id,
          checkout_date,
          checkin_date,
          status,
          construction_site,
          selected_tag,
          notes,
          user_profile:profiles!tool_checkouts_user_id_fkey (full_name, email, category)
        `)
        .eq("tool_id", id)
        .order("checkout_date", { ascending: false });

      if (checkoutError) throw checkoutError;
      setCheckouts(checkoutData as any || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadIssues = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("tool_issues")
        .select(`
          *,
          reporter:profiles!reported_by(full_name)
        `)
        .eq("tool_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIssues(data as any || []);
    } catch (error) {
      console.error("Error loading issues:", error);
    }
  };

  const getCheckoutsForTag = (tag: string) => {
    return checkouts.filter(c => c.selected_tag === tag);
  };

  const getDaysUsed = (checkout: CheckoutRecord) => {
    const start = new Date(checkout.checkout_date);
    const end = checkout.checkin_date ? new Date(checkout.checkin_date) : new Date();
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const renderCheckoutCard = (checkout: CheckoutRecord, showTag = false) => (
    <Card key={checkout.id}>
      <CardContent className="p-3 md:p-4">
        <div className="space-y-2 md:space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm md:text-base truncate">{checkout.user_profile.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{checkout.user_profile.email}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {showTag && checkout.selected_tag && (
                <Badge variant="outline" className="text-xs">
                  {checkout.selected_tag}
                </Badge>
              )}
              <Badge variant={checkout.status === "checked_out" ? "default" : "secondary"} className="text-xs">
                {checkout.status === "checked_out" ? "Em Uso" : "Devolvida"}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-muted-foreground">Retirada</p>
                <p>{format(new Date(checkout.checkout_date), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            </div>
            
            {checkout.checkin_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground">Devolução</p>
                  <p>{format(new Date(checkout.checkin_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
            {checkout.construction_site && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{checkout.construction_site}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>{getDaysUsed(checkout)} dias</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading || !tool) {
    return (
      <div className="flex items-center justify-center h-full">
        <Package className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <h2 className="text-xl md:text-3xl font-bold tracking-tight truncate">{tool.name}</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Detalhes e histórico completo</p>
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
        <CardContent className="space-y-4 p-4 md:p-6">
          {tool.image_url && (
            <div className="w-full max-w-xs md:max-w-md mx-auto">
              {tool.image_url.startsWith("http") ? (
                <img 
                  src={tool.image_url} 
                  alt={tool.name}
                  className="w-full h-48 md:h-64 object-cover rounded-lg"
                />
              ) : (
                <SignedImage
                  storagePath={tool.image_url}
                  alt={tool.name}
                  className="w-full h-48 md:h-64 object-cover rounded-lg"
                />
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {tool.tag && (
              <div>
                <p className="text-xs md:text-sm font-medium">TAG</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {tool.brand && (
              <div>
                <p className="text-xs md:text-sm font-medium">Marca</p>
                <p className="text-sm text-muted-foreground">{tool.brand}</p>
              </div>
            )}
            <div>
              <p className="text-xs md:text-sm font-medium">Disponível/Total</p>
              <p className="text-sm text-muted-foreground">
                {tool.quantity_available}/{tool.quantity_total}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm font-medium">Condição</p>
              <Badge className={conditionColors[tool.condition]}>
                {conditionLabels[tool.condition]}
              </Badge>
            </div>
          </div>
          {tool.description && (
            <>
              <Separator />
              <div>
                <p className="text-xs md:text-sm font-medium mb-1">Descrição</p>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Wrench className="w-4 h-4 md:w-5 md:h-5" />
            Histórico de Manutenções
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {maintenanceRecords.length} manutenções registradas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {maintenanceRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Nenhuma manutenção registrada
            </p>
          ) : (
            <div className="space-y-3">
              {maintenanceRecords.map((record) => (
                <Card key={record.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-3 md:p-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {maintenanceTypes[record.maintenance_type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(record.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm">{record.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>{record.profiles.full_name}</span>
                        </div>
                        {record.cost && <span>• R$ {record.cost.toFixed(2)}</span>}
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
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <History className="w-4 h-4 md:w-5 md:h-5" />
            Histórico de Uso
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {checkouts.length} registros de uso
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {checkouts.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Nenhum uso registrado
            </p>
          ) : hasMultipleTags ? (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="w-full flex flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="text-xs">
                  Todos ({checkouts.length})
                </TabsTrigger>
                {tags.map((tag) => (
                  <TabsTrigger key={tag} value={tag} className="text-xs">
                    TAG {tag} ({getCheckoutsForTag(tag).length})
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="all" className="space-y-3 mt-3">
                {checkouts.map((checkout) => renderCheckoutCard(checkout, true))}
              </TabsContent>
              {tags.map((tag) => (
                <TabsContent key={tag} value={tag} className="space-y-3 mt-3">
                  {getCheckoutsForTag(tag).length === 0 ? (
                    <p className="text-center text-muted-foreground py-6 text-sm">
                      Nenhum uso registrado para TAG {tag}
                    </p>
                  ) : (
                    getCheckoutsForTag(tag).map((checkout) => renderCheckoutCard(checkout))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="space-y-3">
              {checkouts.map((checkout) => renderCheckoutCard(checkout, true))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issues History */}
      <Card>
        <CardHeader className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
              Histórico de Problemas
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              {issues.length} problemas reportados
            </CardDescription>
          </div>
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link to={`/report-issue?toolId=${id}`}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Reportar Problema
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {issues.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              Nenhum problema reportado
            </p>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <Card key={issue.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-3 md:p-4">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {issue.status === "resolved" || issue.status === "closed" ? (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                          )}
                          <h4 className="font-semibold text-sm truncate">{issue.title}</h4>
                        </div>
                        <Badge className="shrink-0 text-xs" variant={
                          issue.severity === "critical" ? "destructive" :
                          issue.severity === "high" ? "destructive" :
                          issue.severity === "medium" ? "default" : "secondary"
                        }>
                          {issue.severity === "low" ? "Baixa" :
                           issue.severity === "medium" ? "Média" :
                           issue.severity === "high" ? "Alta" : "Crítica"}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm">{issue.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          <span>{issue.reporter.full_name}</span>
                        </div>
                        <span>{format(new Date(issue.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                        <Badge variant="outline" className="text-xs">
                          {issue.status === "open" ? "Aberto" :
                           issue.status === "in_progress" ? "Em Progresso" :
                           issue.status === "resolved" ? "Resolvido" : "Fechado"}
                        </Badge>
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
