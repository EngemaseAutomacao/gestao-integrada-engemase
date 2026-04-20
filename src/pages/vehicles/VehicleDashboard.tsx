import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, ArrowRight, ChevronDown, Search, FileText, FileSpreadsheet, Filter, X, Plus, Pencil, Trash2, Upload, Loader2, Cog } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SignedImage } from "@/components/SignedImage";
import { DeleteWithReasonDialog } from "@/components/DeleteWithReasonDialog";

interface VehicleForm {
  name: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  vehicle_type: "vehicle" | "platform";
}

const emptyForm: VehicleForm = { name: "", plate: "", brand: "", model: "", year: "", color: "", vehicle_type: "vehicle" };

export default function VehicleDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === "admin";

  const [myVehiclesExpanded, setMyVehiclesExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");

  // Admin CRUD state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VehicleForm>(emptyForm);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState<any>(null);

  const { data: stats } = useQuery({
    queryKey: ["vehicle-stats"],
    queryFn: async () => {
      const [vehiclesRes, checkoutsRes] = await Promise.all([
        supabase.from("vehicles").select("id, status"),
        supabase.from("vehicle_checkouts").select("id, status").eq("status", "checked_out")
      ]);
      const vehicles = vehiclesRes.data || [];
      const activeCheckouts = checkoutsRes.data || [];
      return {
        totalVehicles: vehicles.length,
        available: vehicles.filter(v => v.status === "available").length,
        inUse: vehicles.filter(v => v.status === "in_use").length,
        activeCheckouts: activeCheckouts.length
      };
    }
  });

  const { data: myVehicleCheckouts } = useQuery({
    queryKey: ["my-vehicle-checkouts", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("vehicle_checkouts")
        .select(`id, vehicle_id, checkout_date, destination, km_checkout, vehicles!inner(name, plate)`)
        .eq("user_id", profile.id)
        .eq("status", "checked_out")
        .order("checkout_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles-list-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    }
  });

  const brands = useMemo(() => {
    const u = [...new Set((vehicles || []).map((v: any) => v.brand).filter(Boolean))] as string[];
    return u.sort();
  }, [vehicles]);

  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all" || brandFilter !== "all";

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setBrandFilter("all");
  };

  const filteredVehicles = (vehicles || []).filter((v: any) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    const matchesType = typeFilter === "all" || v.vehicle_type === typeFilter;
    const matchesBrand = brandFilter === "all" || v.brand === brandFilter;
    return matchesSearch && matchesStatus && matchesType && matchesBrand;
  });

  const myActiveVehicleIds = new Set(
    (myVehicleCheckouts || []).map((c: any) => c.vehicle_id)
  );

  // Admin CRUD handlers
  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
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
      vehicle_type: (vehicle.vehicle_type as "vehicle" | "platform") || "vehicle",
    });
    
    setDialogOpen(true);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        plate: formData.plate.toUpperCase(),
        brand: formData.brand || null,
        model: formData.model || null,
        year: formData.year ? parseInt(formData.year) : null,
        color: formData.color || null,
        vehicle_type: formData.vehicle_type,
      };

      if (editingId) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Veículo atualizado!");
      } else {
        const { error } = await supabase.from("vehicles").insert({ ...payload, created_by: profile!.id });
        if (error) throw error;
        toast.success("Veículo cadastrado!");
      }
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["vehicles-list-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-stats"] });
    } catch (error: any) {
      toast.error("Erro ao salvar", { description: error.message });
    } finally {
      setSaving(false);
    }
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
      queryClient.invalidateQueries({ queryKey: ["vehicles-list-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-stats"] });
    } catch (error: any) {
      toast.error("Erro ao excluir", { description: error.message });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 space-y-3 sm:space-y-4 pb-3 sm:pb-4">
        <div className="hidden sm:block">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Car className="w-8 h-8 text-primary" />
            Veículos
          </h1>
          <p className="text-muted-foreground mt-1">
            Painel e lista unificados — busque, filtre e gerencie entradas e saídas
          </p>
        </div>

        {myVehicleCheckouts && myVehicleCheckouts.length > 0 && (
          <Card
            className="border-primary/50 bg-primary/5 cursor-pointer"
            onClick={() => setMyVehiclesExpanded(!myVehiclesExpanded)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base flex items-center justify-between text-primary">
                <span className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Meus Veículos em Uso ({myVehicleCheckouts.length})
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${myVehiclesExpanded ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {myVehiclesExpanded && (
              <CardContent className="space-y-2 max-h-[250px] overflow-y-auto pt-0" onClick={(e) => e.stopPropagation()}>
                {myVehicleCheckouts.map((checkout: any) => (
                  <div key={checkout.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-background/80">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {checkout.vehicles?.name} - {checkout.vehicles?.plate}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>KM: {checkout.km_checkout}</span>
                        <span>Saída: {format(new Date(checkout.checkout_date), "dd/MM HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs gap-1 shrink-0" onClick={() => navigate(`/veiculos/chegada`)}>
                      Devolução <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )}

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold text-success">{stats?.available || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">{stats?.totalVehicles || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Em Uso</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold text-warning">{stats?.inUse || 0}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Lista de Veículos</CardTitle>
              <CardDescription>
                {filteredVehicles.length} de {vehicles?.length || 0} veículos
              </CardDescription>
            </div>
            <div className="flex gap-1 flex-wrap">
              {isAdmin && (
                <Button size="sm" className="text-xs gap-1" onClick={openNew}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              )}
              <Button
                size="sm" variant="outline" className="text-xs gap-1"
                onClick={() => {
                  const headers = ["Nome", "Placa", "Marca", "Modelo", "Cor", "Status"];
                  const rows = filteredVehicles.map((v: any) => [
                    v.name, v.plate, v.brand || "-", v.model || "-", v.color || "-",
                    v.status === "available" ? "Disponível" : "Em uso",
                  ]);
                  exportToPDF("Relatório de Veículos", headers, rows, "veiculos.pdf");
                  toast.success("PDF exportado!");
                }}
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </Button>
              <Button
                size="sm" variant="outline" className="text-xs gap-1"
                onClick={() => {
                  const headers = ["Nome", "Placa", "Marca", "Modelo", "Cor", "Status"];
                  const rows = filteredVehicles.map((v: any) => [
                    v.name, v.plate, v.brand || "-", v.model || "-", v.color || "-",
                    v.status === "available" ? "Disponível" : "Em uso",
                  ]);
                  exportToExcel("Veículos", headers, rows, "veiculos.xlsx");
                  toast.success("Excel exportado!");
                }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="flex gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, placa, marca ou modelo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Buscar veículo"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"} size="icon"
              onClick={() => setShowFilters(!showFilters)} className="relative"
              aria-label="Mostrar filtros avançados" aria-pressed={showFilters}
            >
              <Filter className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="grid gap-3 sm:grid-cols-3 p-4 bg-muted/50 rounded-lg border animate-fade-in">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="in_use">Em uso</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="vehicle">Veículo</SelectItem>
                    <SelectItem value="platform">Plataforma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Marca</label>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as marcas</SelectItem>
                    {brands.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <div className="sm:col-span-3">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
                    <X className="w-3 h-3" /> Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : filteredVehicles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum veículo encontrado
              </p>
            ) : (
              filteredVehicles.map((vehicle: any) => {
                const userHasVehicle = myActiveVehicleIds.has(vehicle.id);
                const isAvailable = vehicle.status === "available";
                return (
                  <Card key={vehicle.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate(`/veiculos/${vehicle.id}`)}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex gap-3 flex-1 min-w-0">
                          <div
                            className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center"
                            onClick={(e) => { if (vehicle.image_url) { e.stopPropagation(); setEnlargedImage(vehicle.image_url); } }}
                          >
                            {vehicle.image_url ? (
                              vehicle.image_url.startsWith("http") ? (
                                <img src={vehicle.image_url} alt={vehicle.name} className="w-full h-full object-cover" />
                              ) : (
                                <SignedImage storagePath={vehicle.image_url} alt={vehicle.name} className="w-full h-full object-cover" />
                              )
                            ) : vehicle.vehicle_type === "platform" ? (
                              <Cog className="w-6 h-6 text-muted-foreground" />
                            ) : (
                              <Car className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm sm:text-base">{vehicle.name}</h3>
                              <Badge variant="secondary" className="text-xs font-mono">{vehicle.plate}</Badge>
                              {vehicle.vehicle_type === "platform" && (
                                <Badge variant="outline" className="text-xs">Plataforma</Badge>
                              )}
                              <span className={`text-xs font-medium ${isAvailable ? "text-success" : "text-warning"}`}>
                                {isAvailable ? "Disponível" : "Em uso"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                              {vehicle.brand && <span>{vehicle.brand}</span>}
                              {vehicle.model && <span>• {vehicle.model}</span>}
                              {vehicle.color && <span>• {vehicle.color}</span>}
                              {vehicle.year && <span>• {vehicle.year}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          {isAvailable && (
                            <Button size="sm" className="text-xs gap-1" onClick={() => navigate(`/veiculos/saida?vehicleId=${vehicle.id}`)}>
                              Registrar Saída
                            </Button>
                          )}
                          {userHasVehicle && (
                            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate("/veiculos/chegada")}>
                              Registrar Devolução
                            </Button>
                          )}
                          {isAdmin && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => openEdit(vehicle)} aria-label="Editar veículo">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setDeletingVehicle(vehicle); setDeleteDialogOpen(true); }} aria-label="Excluir veículo">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog (admin) */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Veículo" : "Adicionar Veículo"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Atualize os dados do veículo" : "Cadastre um novo veículo no sistema"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="v-type">Tipo *</Label>
              <Select value={formData.vehicle_type} onValueChange={(v: "vehicle" | "platform") => setFormData({ ...formData, vehicle_type: v })}>
                <SelectTrigger id="v-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vehicle">Veículo</SelectItem>
                  <SelectItem value="platform">Plataforma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="v-name">Nome *</Label>
                <Input id="v-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v-plate">{formData.vehicle_type === "platform" ? "Identificação *" : "Placa *"}</Label>
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
                  <Upload className="h-4 w-4" /> Escolher Foto
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


      <DeleteWithReasonDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Excluir Veículo"
        description="Esta ação não pode ser desfeita. Informe o motivo para registro de auditoria."
        itemName={deletingVehicle ? `${deletingVehicle.name} (${deletingVehicle.plate})` : ""}
      />
    </div>
  );
}
