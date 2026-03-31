import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, Pencil, Trash2, Wrench, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MaintenanceRecord {
  id: string;
  tool_id: string;
  performed_by: string;
  maintenance_type: string;
  description: string;
  condition_before: string | null;
  condition_after: string | null;
  cost: number | null;
  parts_replaced: string | null;
  next_maintenance_date: string | null;
  created_at: string;
  tools: {
    name: string;
    tag: string | null;
  };
  profiles: {
    full_name: string;
  };
}

interface Tool {
  id: string;
  name: string;
  tag: string | null;
  condition: string;
}

const maintenanceTypes = {
  preventive: "Preventiva",
  corrective: "Corretiva",
  inspection: "Inspeção",
  calibration: "Calibração",
  cleaning: "Limpeza",
  repair: "Reparo",
};

const conditionLabels = {
  excellent: "Excelente",
  good: "Bom",
  fair: "Regular",
  poor: "Ruim",
  needs_maintenance: "Precisa Manutenção",
};

const conditionColors = {
  excellent: "bg-green-500",
  good: "bg-blue-500",
  fair: "bg-yellow-500",
  poor: "bg-orange-500",
  needs_maintenance: "bg-red-500",
};

export default function AdminMaintenance() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tool_id: "",
    maintenance_type: "preventive",
    description: "",
    condition_before: "",
    condition_after: "",
    cost: "",
    parts_replaced: "",
    next_maintenance_date: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const loadData = async () => {
    try {
      const [recordsRes, toolsRes] = await Promise.all([
        supabase
          .from("maintenance_records")
          .select(`
            *,
            tools (name, tag),
            profiles (full_name)
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("tools")
          .select("id, name, tag, condition")
          .order("name"),
      ]);

      if (recordsRes.error) throw recordsRes.error;
      if (toolsRes.error) throw toolsRes.error;

      setRecords(recordsRes.data as any || []);
      setTools(toolsRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("maintenance_records").insert({
        tool_id: formData.tool_id,
        performed_by: profile!.id,
        maintenance_type: formData.maintenance_type,
        description: formData.description,
        condition_before: formData.condition_before || null,
        condition_after: formData.condition_after || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        parts_replaced: formData.parts_replaced || null,
        next_maintenance_date: formData.next_maintenance_date || null,
      });

      if (error) throw error;

      // Update tool condition if provided
      if (formData.condition_after) {
        const { error: updateError } = await supabase
          .from("tools")
          .update({ condition: formData.condition_after })
          .eq("id", formData.tool_id);

        if (updateError) throw updateError;
      }

      toast.success("Manutenção registrada com sucesso!");
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error("Erro ao registrar manutenção", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;

    try {
      const { error } = await supabase
        .from("maintenance_records")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Registro excluído com sucesso!");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao excluir registro", {
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      tool_id: "",
      maintenance_type: "preventive",
      description: "",
      condition_before: "",
      condition_after: "",
      cost: "",
      parts_replaced: "",
      next_maintenance_date: "",
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      <div className="shrink-0 flex items-center justify-between">
        <div className="hidden sm:block">
          <h2 className="text-3xl font-bold tracking-tight">Manutenções</h2>
          <p className="text-muted-foreground">Registre e acompanhe manutenções das ferramentas</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Manutenção
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Manutenção</DialogTitle>
              <DialogDescription>
                Registre uma nova manutenção realizada em uma ferramenta
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tool_id">Ferramenta *</Label>
                <Select
                  value={formData.tool_id}
                  onValueChange={(value) => {
                    const tool = tools.find(t => t.id === value);
                    setFormData({ 
                      ...formData, 
                      tool_id: value,
                      condition_before: tool?.condition || ""
                    });
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a ferramenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {tools.map((tool) => (
                      <SelectItem key={tool.id} value={tool.id}>
                        {tool.name} {tool.tag && `(${tool.tag})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maintenance_type">Tipo de Manutenção *</Label>
                  <Select
                    value={formData.maintenance_type}
                    onValueChange={(value) => setFormData({ ...formData, maintenance_type: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(maintenanceTypes).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost">Custo (R$)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                  placeholder="Descreva o serviço realizado..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="condition_before">Condição Antes</Label>
                  <Select
                    value={formData.condition_before}
                    onValueChange={(value) => setFormData({ ...formData, condition_before: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(conditionLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition_after">Condição Depois</Label>
                  <Select
                    value={formData.condition_after}
                    onValueChange={(value) => setFormData({ ...formData, condition_after: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(conditionLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parts_replaced">Peças Substituídas</Label>
                <Textarea
                  id="parts_replaced"
                  value={formData.parts_replaced}
                  onChange={(e) => setFormData({ ...formData, parts_replaced: e.target.value })}
                  rows={2}
                  placeholder="Liste as peças substituídas (se houver)..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="next_maintenance_date">Próxima Manutenção</Label>
                <Input
                  id="next_maintenance_date"
                  type="date"
                  value={formData.next_maintenance_date}
                  onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar Manutenção
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Histórico de Manutenções</CardTitle>
          <CardDescription>Total: {records.length} registros</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <Card key={record.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Wrench className="w-5 h-5" />
                            {record.tools.name}
                            {record.tools.tag && (
                              <span className="text-sm text-muted-foreground">({record.tools.tag})</span>
                            )}
                          </h3>
                          <Badge variant="outline" className="mt-1">
                            {maintenanceTypes[record.maintenance_type as keyof typeof maintenanceTypes]}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="text-sm space-y-2">
                        <p className="text-muted-foreground">{record.description}</p>
                        
                        {(record.condition_before || record.condition_after) && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Condição:</span>
                            {record.condition_before && (
                              <Badge variant="outline" className={conditionColors[record.condition_before as keyof typeof conditionColors]}>
                                {conditionLabels[record.condition_before as keyof typeof conditionLabels]}
                              </Badge>
                            )}
                            {record.condition_before && record.condition_after && (
                              <ArrowRight className="w-4 h-4" />
                            )}
                            {record.condition_after && (
                              <Badge variant="outline" className={conditionColors[record.condition_after as keyof typeof conditionColors]}>
                                {conditionLabels[record.condition_after as keyof typeof conditionLabels]}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div>
                            <span className="font-medium">Realizado por:</span>
                            <p className="text-muted-foreground">{record.profiles.full_name}</p>
                          </div>
                          <div>
                            <span className="font-medium">Data:</span>
                            <p className="text-muted-foreground">
                              {format(new Date(record.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        {record.cost && (
                          <div>
                            <span className="font-medium">Custo:</span>
                            <span className="text-muted-foreground ml-2">
                              R$ {record.cost.toFixed(2)}
                            </span>
                          </div>
                        )}

                        {record.parts_replaced && (
                          <div>
                            <span className="font-medium">Peças Substituídas:</span>
                            <p className="text-muted-foreground">{record.parts_replaced}</p>
                          </div>
                        )}

                        {record.next_maintenance_date && (
                          <div>
                            <span className="font-medium">Próxima Manutenção:</span>
                            <span className="text-muted-foreground ml-2">
                              {format(new Date(record.next_maintenance_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        )}
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