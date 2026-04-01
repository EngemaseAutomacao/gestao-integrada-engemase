import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, Search, Plus, Loader2, Pencil, Trash2, Upload, X } from "lucide-react";
import { DeleteWithReasonDialog } from "@/components/DeleteWithReasonDialog";
import { SignedImage } from "@/components/SignedImage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface VehicleForm {
  name: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
}

const emptyForm: VehicleForm = { name: "", plate: "", brand: "", model: "", year: "", color: "" };

export default function VehicleList() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VehicleForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState<any>(null);
  const isAdmin = profile?.role === "admin";

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    }
  });

  const filteredVehicles = vehicles?.filter(vehicle =>
    vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-success/10 text-success border-success/20">Disponível</Badge>;
      case "in_use":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Em Uso</Badge>;
      case "maintenance":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Manutenção</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setImageFile(null);
    setImagePreview(null);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (vehicle: any) => {
    setEditingId(vehicle.id);
    setFormData({
      name: vehicle.name,
      plate: vehicle.plate,
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      year: vehicle.year?.toString() || "",
      color: vehicle.color || "",
    });
    setImagePreview(vehicle.image_url);
    setDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let imageUrl = editingId ? (imagePreview?.startsWith("data:") ? null : imagePreview) : null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const seq = String(Date.now()).slice(-6);
        const dateFolder = new Date().toISOString().slice(0, 10);
        const filePath = `veiculos/catalogo/${dateFolder}/veiculo_${seq}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("imagens").upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        imageUrl = filePath;
      }

      // If image was removed
      if (!imagePreview && !imageFile) {
        imageUrl = null;
      }

      const payload = {
        name: formData.name,
        plate: formData.plate.toUpperCase(),
        brand: formData.brand || null,
        model: formData.model || null,
        year: formData.year ? parseInt(formData.year) : null,
        color: formData.color || null,
        image_url: imageUrl,
      };

      if (editingId) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Veículo atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("vehicles").insert({ ...payload, created_by: profile!.id });
        if (error) throw error;
        toast.success("Veículo cadastrado com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-stats"] });
    } catch (error: any) {
      toast.error("Erro ao salvar veículo", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (vehicle: any) => {
    setDeletingVehicle(vehicle);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!deletingVehicle) return;
    try {
      await supabase.from("system_logs").insert({
        action: "delete_reason",
        entity_type: "vehicle",
        entity_id: deletingVehicle.id,
        user_id: profile!.id,
        user_name: profile!.full_name,
        details: { vehicle_name: deletingVehicle.name, plate: deletingVehicle.plate, reason },
      });

      const { error } = await supabase.from("vehicles").delete().eq("id", deletingVehicle.id);
      if (error) throw error;
      toast.success("Veículo excluído!");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-stats"] });
    } catch (error: any) {
      toast.error("Erro ao excluir veículo", { description: error.message });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      <div className="shrink-0 hidden sm:block">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Car className="w-8 h-8 text-primary" />
          Lista de Veículos
        </h1>
        <p className="text-muted-foreground mt-1">
          Todos os veículos cadastrados no sistema
        </p>
      </div>

      {/* Search + Add Button */}
      <div className="shrink-0 flex gap-2 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, placa, marca ou modelo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && (
          <Button onClick={openNew} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Veículo
          </Button>
        )}
      </div>

      {/* Vehicle Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <Car className="w-12 h-12 text-muted-foreground animate-pulse mx-auto" />
          <p className="text-muted-foreground mt-2">Carregando veículos...</p>
        </div>
      ) : filteredVehicles && filteredVehicles.length > 0 ? (
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start pr-1">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Car className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                      <CardDescription className="font-mono">{vehicle.plate}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(vehicle.status || "available")}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {vehicle.brand && vehicle.model && (
                    <p>{vehicle.brand} {vehicle.model}</p>
                  )}
                  {vehicle.year && <p>Ano: {vehicle.year}</p>}
                  {vehicle.color && <p>Cor: {vehicle.color}</p>}
                </div>
                {isAdmin && (
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(vehicle)}>
                      <Pencil className="w-4 h-4 mr-1" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(vehicle)}>
                      <Trash2 className="w-4 h-4 mr-1 text-destructive" /> Excluir
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "Nenhum veículo encontrado" : "Nenhum veículo cadastrado"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Veículo" : "Adicionar Veículo"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Atualize os dados do veículo" : "Cadastre um novo veículo no sistema"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="v-name">Nome *</Label>
                <Input id="v-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v-plate">Placa *</Label>
                <Input id="v-plate" value={formData.plate} onChange={(e) => setFormData({ ...formData, plate: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="v-brand">Marca</Label>
                <Input id="v-brand" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v-model">Modelo</Label>
                <Input id="v-model" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="v-year">Ano</Label>
                <Input id="v-year" type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v-color">Cor</Label>
                <Input id="v-color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto do Veículo</Label>
              <div>
                <input id="v-image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                <Button type="button" variant="outline" className="gap-2" onClick={() => document.getElementById("v-image")?.click()}>
                  <Upload className="h-4 w-4" />
                  Escolher Foto
                </Button>
              </div>
              {imagePreview && (
                <div className="relative inline-block mt-2">
                  <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg border cursor-pointer" onClick={() => setEnlargedImage(imagePreview)} />
                  <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Atualizar" : "Cadastrar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enlarged Image Dialog */}
      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto do veículo</DialogTitle>
          </DialogHeader>
          {enlargedImage && (
            <img src={enlargedImage} alt="Foto ampliada" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      <DeleteWithReasonDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Excluir Veículo"
        description="Esta ação não pode ser desfeita. Informe o motivo da exclusão para registro de auditoria."
        itemName={deletingVehicle ? `${deletingVehicle.name} (${deletingVehicle.plate})` : ""}
      />
    </div>
  );
}
