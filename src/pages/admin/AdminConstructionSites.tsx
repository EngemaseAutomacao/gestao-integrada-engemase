import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin, Loader2, RefreshCw } from "lucide-react";

interface ConstructionSite {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  created_at: string;
}

export default function AdminConstructionSites() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<ConstructionSite | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const { data: sites, isLoading } = useQuery({
    queryKey: ["construction-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("construction_sites")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as ConstructionSite[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nome é obrigatório");

      if (editingSite) {
        const { error } = await supabase
          .from("construction_sites")
          .update({ name: name.trim(), address: address.trim() || null })
          .eq("id", editingSite.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("construction_sites")
          .insert({ name: name.trim(), address: address.trim() || null, created_by: profile.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingSite ? "Obra atualizada!" : "Obra cadastrada!");
      queryClient.invalidateQueries({ queryKey: ["construction-sites"] });
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("construction_sites")
        .update({ active: !active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["construction-sites"] });
      toast.success("Status atualizado!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("construction_sites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["construction-sites"] });
      toast.success("Obra removida!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-trello");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro na sincronização");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["construction-sites"] });
      toast.success(`Sincronização concluída! ${data.summary.added} novas, ${data.summary.reactivated} reativadas.`);
    },
    onError: (error: Error) => toast.error(`Erro ao sincronizar: ${error.message}`),
  });


    setName("");
    setAddress("");
    setEditingSite(null);
    setDialogOpen(false);
  };

  const openEdit = (site: ConstructionSite) => {
    setEditingSite(site);
    setName(site.name);
    setAddress(site.address || "");
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="hidden sm:block">
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Obras</h2>
          <p className="text-muted-foreground">Cadastre e gerencie obras/canteiros</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sincronizar Trello
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Obra
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSite ? "Editar Obra" : "Nova Obra"}</DialogTitle>
              <DialogDescription>Preencha os dados da obra/canteiro</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Obra *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Residencial Centro" />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex: Rua das Flores, 123" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSite ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
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
          {isLoading ? (
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
                    <TableHead>Endereço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{site.address || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={site.active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleMutation.mutate({ id: site.id, active: site.active })}
                        >
                          {site.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(site)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => { if (confirm("Remover esta obra?")) deleteMutation.mutate(site.id); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
