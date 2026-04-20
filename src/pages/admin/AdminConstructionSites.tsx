import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Loader2, RefreshCw, Plus, Pencil, Trash2, Users, Search, Building2, Wrench, ExternalLink, Car, Cog } from "lucide-react";
import { DeleteWithReasonDialog } from "@/components/DeleteWithReasonDialog";

interface ConstructionSite {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  client_id: string | null;
  created_at: string;
  clients?: {
    name: string;
  } | null;
}

interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  active: boolean;
}

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

export default function AdminConstructionSites() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "obras";

  // Client state
  const [clientSearch, setClientSearch] = useState("");
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  
  // Site state
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<ConstructionSite | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | "none">("none");
  const [savingSite, setSavingSite] = useState(false);

  // Tools state
  const [toolSearch, setToolSearch] = useState("");
  const [syncingTools, setSyncingTools] = useState(false);

  // Vehicles state
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    name: "", plate: "", brand: "", model: "", year: "", color: "",
    vehicle_type: "vehicle" as "vehicle" | "platform",
  });
  const [deleteVehicleOpen, setDeleteVehicleOpen] = useState(false);
  const [deletingVehicle, setDeletingVehicle] = useState<any>(null);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  // ─── Obras ───
  const { data: sites, isLoading: loadingSites } = useQuery({
    queryKey: ["construction-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("construction_sites")
        .select("*, clients(name)")
        .order("name");
      if (error) throw error;
      return data as ConstructionSite[];
    },
  });

  // Last sync timestamps (proxy: most recent updated_at)
  const { data: lastSiteSync } = useQuery({
    queryKey: ["last-site-sync"],
    queryFn: async () => {
      const { data } = await supabase
        .from("construction_sites")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.updated_at as string | undefined;
    },
  });

  const { data: lastToolSync } = useQuery({
    queryKey: ["last-tool-sync"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tools")
        .select("updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.updated_at as string | undefined;
    },
  });

  const formatLastSync = (iso?: string) => {
    if (!iso) return "Nunca sincronizado";
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-trello");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro na sincronização");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["construction-sites"] });
      queryClient.invalidateQueries({ queryKey: ["last-site-sync"] });
      toast.success(`Sincronização concluída! ${data.summary.added} novas, ${data.summary.reactivated} reativadas, ${data.summary.deactivated} desativadas.`);
    },
    onError: (error: Error) => toast.error(`Erro ao sincronizar: ${error.message}`),
  });

  // ─── Clientes ───
  const { data: clients = [], isLoading: loadingClients, refetch: refetchClients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Client[];
    },
  });

  // ─── Ferramentas ───
  const { data: tools = [], isLoading: loadingTools, refetch: refetchTools } = useQuery({
    queryKey: ["admin-tools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Tool[];
    },
  });

  const syncToolsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");
      return data;
    },
    onSuccess: (data) => {
      const s = data.summary;
      toast.success("Sincronização concluída!", {
        description: `${s.added} adicionada(s), ${s.updated} atualizada(s), ${s.deleted} removida(s) de ${s.total_sheet_rows} linhas.`,
      });
      refetchTools();
      queryClient.invalidateQueries({ queryKey: ["last-tool-sync"] });
    },
    onError: (error: Error) => toast.error(`Erro ao sincronizar: ${error.message}`),
  });

  // ─── Veículos ───
  const { data: vehicles = [], isLoading: loadingVehicles, refetch: refetchVehicles } = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const filteredVehicles = vehicles.filter((v: any) =>
    !vehicleSearch ||
    v.name.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.plate?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.brand?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.model?.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  const resetVehicleForm = () => {
    setEditingVehicleId(null);
    setVehicleForm({ name: "", plate: "", brand: "", model: "", year: "", color: "", vehicle_type: "vehicle" });
  };

  const openNewVehicle = () => {
    resetVehicleForm();
    setVehicleDialogOpen(true);
  };

  const openEditVehicle = (v: any) => {
    setEditingVehicleId(v.id);
    setVehicleForm({
      name: v.name,
      plate: v.plate,
      brand: v.brand || "",
      model: v.model || "",
      year: v.year?.toString() || "",
      color: v.color || "",
      vehicle_type: (v.vehicle_type as "vehicle" | "platform") || "vehicle",
    });
    setVehicleDialogOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVehicle(true);
    try {
      const payload = {
        name: vehicleForm.name,
        plate: vehicleForm.plate.toUpperCase(),
        brand: vehicleForm.brand || null,
        model: vehicleForm.model || null,
        year: vehicleForm.year ? parseInt(vehicleForm.year) : null,
        color: vehicleForm.color || null,
        vehicle_type: vehicleForm.vehicle_type,
      };
      if (editingVehicleId) {
        const { error } = await supabase.from("vehicles").update(payload).eq("id", editingVehicleId);
        if (error) throw error;
        toast.success("Veículo atualizado!");
      } else {
        const { error } = await supabase.from("vehicles").insert({ ...payload, created_by: profile!.id });
        if (error) throw error;
        toast.success("Veículo cadastrado!");
      }
      setVehicleDialogOpen(false);
      resetVehicleForm();
      refetchVehicles();
      queryClient.invalidateQueries({ queryKey: ["vehicles-list-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-stats"] });
    } catch (err: any) {
      toast.error("Erro ao salvar", { description: err.message });
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteVehicleConfirm = async (reason: string) => {
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
      refetchVehicles();
      queryClient.invalidateQueries({ queryKey: ["vehicles-list-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-stats"] });
    } catch (err: any) {
      toast.error("Erro ao excluir", { description: err.message });
    }
  };

  const openNewClient = () => {
    setEditingClient(null);
    setFormName(""); setFormAddress("");
    setClientDialogOpen(true);
  };

  const openEditClient = (c: Client) => {
    setEditingClient(c);
    setFormName(c.name);
    setFormAddress(c.address || "");
    setClientDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (!formName.trim()) { toast.error("Nome é obrigatório"); return; }
    setSavingClient(true);
    const payload = {
      name: formName.trim(),
      address: formAddress.trim() || null,
    };

    if (editingClient) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editingClient.id);
      if (error) { toast.error("Erro ao atualizar"); setSavingClient(false); return; }
      toast.success("Cliente atualizado!");
    } else {
      const { error } = await supabase.from("clients").insert({ ...payload, created_by: profile!.id });
      if (error) { toast.error("Erro ao criar"); setSavingClient(false); return; }
      toast.success("Cliente criado!");
    }
    setSavingClient(false);
    setClientDialogOpen(false);
    refetchClients();
  };

  const toggleClientActive = async (c: Client) => {
    const { error } = await supabase.from("clients").update({ active: !c.active }).eq("id", c.id);
    if (error) { toast.error("Erro"); return; }
    toast.success(c.active ? "Cliente desativado" : "Cliente ativado");
    refetchClients();
  };

  const handleDeleteClient = async (c: Client) => {
    if (!confirm(`Excluir cliente "${c.name}"?`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Cliente excluído");
    refetchClients();
  };

  const openEditSite = (site: ConstructionSite) => {
    setEditingSite(site);
    setSelectedClientId(site.client_id || "none");
    setSiteDialogOpen(true);
  };

  const handleSaveSite = async () => {
    if (!editingSite) return;
    setSavingSite(true);
    
    const { error } = await supabase
      .from("construction_sites")
      .update({ 
        client_id: selectedClientId === "none" ? null : selectedClientId 
      })
      .eq("id", editingSite.id);

    if (error) {
      toast.error("Erro ao atualizar obra");
    } else {
      toast.success("Obra atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["construction-sites"] });
      setSiteDialogOpen(false);
    }
    setSavingSite(false);
  };

  const filteredClients = clients.filter((c) =>
    !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredTools = tools.filter((tool) =>
    !toolSearch || 
    tool.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
    tool.tag?.toLowerCase().includes(toolSearch.toLowerCase()) ||
    tool.brand?.toLowerCase().includes(toolSearch.toLowerCase())
  );

  const getConditionLabel = (condition: string) => {
    const map: Record<string, string> = {
      excellent: "Excelente",
      good: "Bom",
      fair: "Regular",
      poor: "Ruim",
      needs_maintenance: "Manutenção",
    };
    return map[condition] || condition;
  };

  const getConditionClass = (condition: string) => {
    const map: Record<string, string> = {
      excellent: "bg-green-500 text-white",
      good: "bg-blue-500 text-white",
      fair: "bg-yellow-500 text-white",
      poor: "bg-orange-500 text-white",
      needs_maintenance: "bg-red-500 text-white",
    };
    return map[condition] || "bg-red-500 text-white";
  };

  return (
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h2 className="text-3xl font-bold tracking-tight">Gestão Administrativa</h2>
        <p className="text-muted-foreground">Gerencie obras, clientes e inventário de ferramentas</p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val })} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="obras" className="gap-2">
            <Building2 className="w-4 h-4" />
            Obras
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2">
            <Users className="w-4 h-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="ferramentas" className="gap-2">
            <Wrench className="w-4 h-4" />
            Ferramentas
          </TabsTrigger>
        </TabsList>

        {/* ─── ABA OBRAS ─── */}
        <TabsContent value="obras" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Última sincronização: <span className="font-medium text-foreground">{formatLastSync(lastSiteSync)}</span>
            </p>
            <Button
              variant="outline"
              className="gap-2"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              Sincronizar Trello
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Obras Cadastradas
              </CardTitle>
              <CardDescription>{sites?.length || 0} obras no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSites ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !sites || sites.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma obra cadastrada</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Endereço</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sites.map((site) => (
                        <TableRow key={site.id}>
                          <TableCell className="font-medium">{site.name}</TableCell>
                          <TableCell>
                            {site.clients?.name ? (
                              <Badge variant="outline" className="font-normal">
                                {site.clients.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs italic">Não vinculado</span>
                            )}
                          </TableCell>
                          <TableCell>{site.address || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={site.active ? "default" : "secondary"}>
                              {site.active ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openEditSite(site)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA CLIENTES ─── */}
        <TabsContent value="clientes" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="pl-10" />
            </div>
            <Button onClick={openNewClient} className="gap-2">
              <Plus className="w-4 h-4" />Novo Cliente
            </Button>
          </div>

          {loadingClients ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredClients.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum cliente encontrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((c) => (
                <Card key={c.id} className={!c.active ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        {c.address && <CardDescription>{c.address}</CardDescription>}
                      </div>
                      <Badge variant={c.active ? "default" : "secondary"}>
                        {c.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => openEditClient(c)}>
                        <Pencil className="w-3 h-3 mr-1" />Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleClientActive(c)}>
                        {c.active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDeleteClient(c)}>
                        <Trash2 className="w-3 h-3 mr-1" />Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── ABA FERRAMENTAS ─── */}
        <TabsContent value="ferramentas" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar ferramenta, TAG ou marca..." 
                value={toolSearch} 
                onChange={(e) => setToolSearch(e.target.value)} 
                className="pl-10" 
              />
            </div>
            <Button
              variant="outline"
              className="gap-2"
              disabled={syncToolsMutation.isPending}
              onClick={() => syncToolsMutation.mutate()}
            >
              <RefreshCw className={`w-4 h-4 ${syncToolsMutation.isPending ? "animate-spin" : ""}`} />
              Sincronizar Planilha
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Última sincronização: <span className="font-medium text-foreground">{formatLastSync(lastToolSync)}</span>
          </p>

          <Card>
            <CardHeader>
              <CardTitle>Inventário de Ferramentas</CardTitle>
              <CardDescription>{tools.length} ferramentas catalogadas via Google Sheets</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTools ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredTools.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma ferramenta encontrada</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>TAG</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Condição</TableHead>
                        <TableHead>Qtd. Disp/Total</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTools.map((tool) => (
                        <TableRow key={tool.id}>
                          <TableCell className="font-medium">{tool.name}</TableCell>
                          <TableCell>{tool.tag || "-"}</TableCell>
                          <TableCell>{tool.brand || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getConditionClass(tool.condition)}>
                              {getConditionLabel(tool.condition)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tool.quantity_available}/{tool.quantity_total}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/ferramentas/${tool.id}`)}>
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Cliente */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Endereço do cliente" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveClient} disabled={savingClient}>
              {savingClient && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingClient ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog de Obra */}
      <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Cliente à Obra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Obra</Label>
              <Input value={editingSite?.name || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Cliente Responsável</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSiteDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSite} disabled={savingSite}>
              {savingSite && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Vínculo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
