import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  tag: string | null;
  brand: string | null;
  quantity_available: number;
  quantity_total: number;
  employee_only: boolean;
}

export default function AdminTools() {
  const { profile } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tag: "",
    brand: "",
    quantity_total: 1,
    employee_only: false,
  });

  useEffect(() => {
    loadTools();
  }, []);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const loadTools = async () => {
    try {
      const { data, error } = await supabase
        .from("tools")
        .select("*")
        .order("name");

      if (error) throw error;
      setTools(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar ferramentas", {
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
      if (editingTool) {
        const { error } = await supabase
          .from("tools")
          .update({
            name: formData.name,
            description: formData.description || null,
            tag: formData.tag || null,
            brand: formData.brand || null,
            quantity_total: formData.quantity_total,
            employee_only: formData.employee_only,
          })
          .eq("id", editingTool.id);

        if (error) throw error;
        toast.success("Ferramenta atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("tools")
          .insert({
            name: formData.name,
            description: formData.description || null,
            tag: formData.tag || null,
            brand: formData.brand || null,
            quantity_total: formData.quantity_total,
            quantity_available: formData.quantity_total,
            employee_only: formData.employee_only,
            created_by: profile!.id,
          });

        if (error) throw error;
        toast.success("Ferramenta criada com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      loadTools();
    } catch (error: any) {
      toast.error("Erro ao salvar ferramenta", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      description: tool.description || "",
      tag: tool.tag || "",
      brand: tool.brand || "",
      quantity_total: tool.quantity_total,
      employee_only: tool.employee_only,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (toolId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta ferramenta?")) return;

    try {
      const { error } = await supabase
        .from("tools")
        .delete()
        .eq("id", toolId);

      if (error) throw error;
      toast.success("Ferramenta excluída com sucesso!");
      loadTools();
    } catch (error: any) {
      toast.error("Erro ao excluir ferramenta", {
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setEditingTool(null);
    setFormData({
      name: "",
      description: "",
      tag: "",
      brand: "",
      quantity_total: 1,
      employee_only: false,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciar Ferramentas</h2>
          <p className="text-muted-foreground">Administre o inventário de ferramentas</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Ferramenta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTool ? "Editar Ferramenta" : "Nova Ferramenta"}</DialogTitle>
              <DialogDescription>
                {editingTool ? "Atualize os dados da ferramenta" : "Adicione uma nova ferramenta ao inventário"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tag">TAG</Label>
                  <Input
                    id="tag"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity_total">Quantidade Total *</Label>
                <Input
                  id="quantity_total"
                  type="number"
                  min="1"
                  value={formData.quantity_total}
                  onChange={(e) => setFormData({ ...formData, quantity_total: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="employee_only"
                  checked={formData.employee_only}
                  onCheckedChange={(checked) => setFormData({ ...formData, employee_only: checked as boolean })}
                />
                <Label htmlFor="employee_only" className="text-sm font-normal cursor-pointer">
                  Restrito a funcionários Engemase
                </Label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingTool ? "Atualizar" : "Criar"} Ferramenta
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ferramentas Cadastradas</CardTitle>
          <CardDescription>Total: {tools.length} ferramentas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>TAG</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Disponível/Total</TableHead>
                  <TableHead>Restrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell className="font-medium">{tool.name}</TableCell>
                    <TableCell>{tool.tag || "-"}</TableCell>
                    <TableCell>{tool.brand || "-"}</TableCell>
                    <TableCell>
                      <span className={tool.quantity_available > 0 ? "text-success" : "text-destructive"}>
                        {tool.quantity_available}/{tool.quantity_total}
                      </span>
                    </TableCell>
                    <TableCell>
                      {tool.employee_only ? (
                        <Badge variant="outline">Apenas Funcionários</Badge>
                      ) : (
                        <Badge variant="secondary">Todos</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(tool)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(tool.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
