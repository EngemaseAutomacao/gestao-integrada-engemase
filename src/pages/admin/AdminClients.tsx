import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Users, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  active: boolean;
}

export default function AdminClients() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formContactName, setFormContactName] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formContactEmail, setFormContactEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");

  useEffect(() => {
    if (profile?.role === "admin") fetchClients();
  }, [profile]);

  if (profile?.role !== "admin") return <Navigate to="/" />;

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");
    if (!error && data) setClients(data as Client[]);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setFormName("");
    setFormContactName("");
    setFormContactPhone("");
    setFormContactEmail("");
    setFormAddress("");
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setFormName(c.name);
    setFormContactName(c.contact_name || "");
    setFormContactPhone(c.contact_phone || "");
    setFormContactEmail(c.contact_email || "");
    setFormAddress(c.address || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);

    const payload = {
      name: formName.trim(),
      contact_name: formContactName.trim() || null,
      contact_phone: formContactPhone.trim() || null,
      contact_email: formContactEmail.trim() || null,
      address: formAddress.trim() || null,
    };

    if (editing) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); setSaving(false); return; }
      toast.success("Cliente atualizado!");
    } else {
      const { error } = await supabase.from("clients").insert({ ...payload, created_by: profile!.id });
      if (error) { toast.error("Erro ao criar"); setSaving(false); return; }
      toast.success("Cliente criado!");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchClients();
  };

  const toggleActive = async (c: Client) => {
    const { error } = await supabase.from("clients").update({ active: !c.active }).eq("id", c.id);
    if (error) { toast.error("Erro"); return; }
    toast.success(c.active ? "Cliente desativado" : "Cliente ativado");
    fetchClients();
  };

  const handleDelete = async (c: Client) => {
    if (!confirm(`Excluir cliente "${c.name}"?`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Cliente excluído");
    fetchClients();
  };

  const filtered = clients.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      <div className="shrink-0 hidden sm:block">
        <h1 className="text-3xl font-bold text-foreground">Gerenciar Clientes</h1>
        <p className="text-muted-foreground mt-1">Cadastre e gerencie os clientes da empresa</p>
      </div>

      <div className="shrink-0 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />Novo Cliente
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum cliente encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          {filtered.map((c) => (
            <Card key={c.id} className={!c.active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    {c.contact_name && <CardDescription>{c.contact_name}</CardDescription>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.active ? "default" : "secondary"}>
                      {c.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {c.contact_phone && <span>📞 {c.contact_phone}</span>}
                  {c.contact_email && <span>✉️ {c.contact_email}</span>}
                  {c.address && <span>📍 {c.address}</span>}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                    <Pencil className="w-3 h-3 mr-1" />Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(c)}>
                    {c.active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(c)}>
                    <Trash2 className="w-3 h-3 mr-1" />Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label>Contato</Label>
              <Input value={formContactName} onChange={(e) => setFormContactName(e.target.value)} placeholder="Nome do contato" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={formContactPhone} onChange={(e) => setFormContactPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={formContactEmail} onChange={(e) => setFormContactEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Endereço do cliente" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
