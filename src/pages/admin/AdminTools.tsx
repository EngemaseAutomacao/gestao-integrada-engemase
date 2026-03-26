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
import { Plus, Loader2, Pencil, Trash2, ExternalLink, Package, X, Upload, Search } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";

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

export default function AdminTools() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tag: "",
    brand: "",
    quantity_total: 1,
    employee_only: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const filteredTools = tools.filter((tool) =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = editingTool?.image_url !== undefined ? editingTool.image_url : null;

      // Upload image if a new one was selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('tool-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('tool-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

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
            image_url: imageUrl,
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
            image_url: imageUrl,
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
    setImagePreview(tool.image_url);
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
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Gerenciar Ferramentas</h2>
          <p className="text-sm text-muted-foreground">Administre o inventário de ferramentas</p>
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
                <Label>Foto da Ferramenta</Label>
                <div>
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => document.getElementById('image')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Escolher Foto
                  </Button>
                </div>
                {imagePreview && (
                  <div className="relative inline-block mt-2">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="h-32 w-32 object-cover rounded-lg border cursor-pointer"
                      onClick={() => setEnlargedImage(imagePreview)}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        if (editingTool) {
                          setEditingTool({ ...editingTool, image_url: null });
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
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
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, TAG, marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Foto</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>TAG</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Condição</TableHead>
                      <TableHead>Disponível/Total</TableHead>
                      <TableHead>Restrição</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTools.map((tool) => (
                      <TableRow key={tool.id}>
                        <TableCell>
                          {tool.image_url ? (
                            <img 
                              src={tool.image_url} 
                              alt={tool.name}
                              className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setEnlargedImage(tool.image_url)}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Package className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{tool.name}</TableCell>
                        <TableCell>{tool.tag || "-"}</TableCell>
                        <TableCell>{tool.brand || "-"}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              tool.condition === 'excellent' ? 'bg-green-500 text-white' :
                              tool.condition === 'good' ? 'bg-blue-500 text-white' :
                              tool.condition === 'fair' ? 'bg-yellow-500 text-white' :
                              tool.condition === 'poor' ? 'bg-orange-500 text-white' :
                              'bg-red-500 text-white'
                            }
                          >
                            {
                              tool.condition === 'excellent' ? 'Excelente' :
                              tool.condition === 'good' ? 'Bom' :
                              tool.condition === 'fair' ? 'Regular' :
                              tool.condition === 'poor' ? 'Ruim' :
                              'Precisa Manutenção'
                            }
                          </Badge>
                        </TableCell>
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
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/tools/${tool.id}`)}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
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
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredTools.map((tool) => (
                  <Card key={tool.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {tool.image_url ? (
                          <img 
                            src={tool.image_url} 
                            alt={tool.name}
                            className="w-14 h-14 object-cover rounded-lg shrink-0 cursor-pointer"
                            onClick={() => setEnlargedImage(tool.image_url)}
                          />
                        ) : (
                          <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{tool.name}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {tool.tag && <span className="text-xs text-muted-foreground">TAG: {tool.tag}</span>}
                            {tool.brand && <span className="text-xs text-muted-foreground">• {tool.brand}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                tool.condition === 'excellent' ? 'bg-green-500 text-white' :
                                tool.condition === 'good' ? 'bg-blue-500 text-white' :
                                tool.condition === 'fair' ? 'bg-yellow-500 text-white' :
                                tool.condition === 'poor' ? 'bg-orange-500 text-white' :
                                'bg-red-500 text-white'
                              }`}
                            >
                              {
                                tool.condition === 'excellent' ? 'Excelente' :
                                tool.condition === 'good' ? 'Bom' :
                                tool.condition === 'fair' ? 'Regular' :
                                tool.condition === 'poor' ? 'Ruim' :
                                'Manutenção'
                              }
                            </Badge>
                            <span className={`text-xs font-medium ${tool.quantity_available > 0 ? "text-success" : "text-destructive"}`}>
                              {tool.quantity_available}/{tool.quantity_total}
                            </span>
                            {tool.employee_only && (
                              <Badge variant="outline" className="text-xs">Funcionários</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/tools/${tool.id}`)}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(tool)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(tool.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto da ferramenta</DialogTitle>
          </DialogHeader>
          {enlargedImage && (
            <img
              src={enlargedImage}
              alt="Foto ampliada"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
