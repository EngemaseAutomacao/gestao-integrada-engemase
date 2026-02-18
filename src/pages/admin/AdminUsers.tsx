import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { UserPlus, Loader2, Pencil, Trash2, Key, CheckCircle, Clock } from "lucide-react";
import { Navigate } from "react-router-dom";
import { z } from "zod";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  category: "engemase_employee" | "third_party" | "socios";
  role: "admin" | "employee" | "third_party";
  approved: boolean;
}

export default function AdminUsers() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    username: "",
    category: "engemase_employee" as "engemase_employee" | "third_party" | "socios",
    role: "employee" as "admin" | "employee" | "third_party",
  });
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    email: "",
    username: "",
    category: "engemase_employee" as "engemase_employee" | "third_party" | "socios",
    role: "employee" as "admin" | "employee" | "third_party",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          username: formData.username,
          category: formData.category,
          role: formData.role,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Usuário criado com sucesso!");
      setDialogOpen(false);
      setFormData({
        email: "",
        password: "",
        fullName: "",
        username: "",
        category: "engemase_employee",
        role: "employee",
      });
      loadUsers();
    } catch (error: any) {
      toast.error("Erro ao criar usuário", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (user: Profile) => {
    setSelectedUser(user);
    setEditFormData({
      fullName: user.full_name,
      email: user.email,
      username: user.username || "",
      category: user.category,
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: selectedUser.id,
          fullName: editFormData.fullName,
          email: editFormData.email,
          username: editFormData.username,
          category: editFormData.category,
          role: editFormData.role,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Usuário atualizado com sucesso!");
      setEditDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      toast.error("Erro ao atualizar usuário", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Usuário excluído com sucesso!");
      loadUsers();
    } catch (error: any) {
      toast.error("Erro ao excluir usuário", {
        description: error.message,
      });
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approved: true } as any)
        .eq("id", userId);

      if (error) throw error;

      toast.success("Usuário aprovado com sucesso!");
      loadUsers();
    } catch (error: any) {
      toast.error("Erro ao aprovar usuário", { description: error.message });
    }
  };

  const handleOpenPasswordDialog = (user: Profile) => {
    setSelectedUser(user);
    setNewPassword("");
    setPasswordError("");
    setPasswordDialogOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    const passwordSchema = z.string().min(6, "A senha deve ter no mínimo 6 caracteres");
    const validation = passwordSchema.safeParse(newPassword);

    if (!validation.success) {
      setPasswordError(validation.error.errors[0].message);
      return;
    }

    if (!selectedUser) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: {
          userId: selectedUser.id,
          newPassword: newPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Senha de ${selectedUser.full_name} alterada com sucesso!`);
      setPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedUser(null);
    } catch (error: any) {
      toast.error("Erro ao alterar senha", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    if (category === "engemase_employee") {
      return <Badge className="bg-badge-employee text-badge-employee-foreground">Funcionário</Badge>;
    }
    if (category === "socios") {
      return <Badge className="bg-primary text-primary-foreground">Sócio</Badge>;
    }
    return <Badge className="bg-badge-thirdparty text-badge-thirdparty-foreground">Terceirizado</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, string> = {
      admin: "bg-destructive text-destructive-foreground",
      employee: "bg-primary text-primary-foreground",
      third_party: "bg-secondary text-secondary-foreground",
    };

    const labels: Record<string, string> = {
      admin: "Admin",
      employee: "Funcionário",
      third_party: "Terceirizado",
    };

    return <Badge className={variants[role]}>{labels[role]}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h2>
          <p className="text-muted-foreground">Administre usuários e permissões</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Adicione um novo usuário ao sistema
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Nome de Usuário *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="usuario.sobrenome"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: "engemase_employee" | "third_party" | "socios") =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engemase_employee">Funcionário Engemase</SelectItem>
                    <SelectItem value="third_party">Terceirizado</SelectItem>
                    <SelectItem value="socios">Sócio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Função *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "admin" | "employee" | "third_party") =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="employee">Funcionário</SelectItem>
                    <SelectItem value="third_party">Terceirizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Usuário
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
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>Total: {users.length} usuários</CardDescription>
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
                   <TableHead>Email</TableHead>
                   <TableHead>Categoria</TableHead>
                   <TableHead>Função</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead className="text-right">Ações</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getCategoryBadge(user.category)}</TableCell>
                     <TableCell>{getRoleBadge(user.role)}</TableCell>
                     <TableCell>
                       {user.approved ? (
                         <Badge className="bg-green-500/10 text-green-600 gap-1">
                           <CheckCircle className="w-3 h-3" />
                           Aprovado
                         </Badge>
                       ) : (
                         <Badge className="bg-yellow-500/10 text-yellow-600 gap-1">
                           <Clock className="w-3 h-3" />
                           Pendente
                         </Badge>
                       )}
                     </TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                         {!user.approved && (
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleApproveUser(user.id)}
                             title="Aprovar usuário"
                             className="text-green-600 hover:text-green-700"
                           >
                             <CheckCircle className="w-4 h-4" />
                           </Button>
                         )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditDialog(user)}
                          title="Editar usuário"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenPasswordDialog(user)}
                          title="Alterar senha"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.id === profile.id}
                          title="Excluir usuário"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar usuário */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize os dados de {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Nome Completo *</Label>
              <Input
                id="editFullName"
                value={editFormData.fullName}
                onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editUsername">Nome de Usuário *</Label>
              <Input
                id="editUsername"
                value={editFormData.username}
                onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editEmail">Email *</Label>
              <Input
                id="editEmail"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editCategory">Categoria *</Label>
              <Select
                value={editFormData.category}
                onValueChange={(value: "engemase_employee" | "third_party" | "socios") =>
                  setEditFormData({ ...editFormData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engemase_employee">Funcionário Engemase</SelectItem>
                  <SelectItem value="third_party">Terceirizado</SelectItem>
                  <SelectItem value="socios">Sócio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editRole">Função *</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value: "admin" | "employee" | "third_party") =>
                  setEditFormData({ ...editFormData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="employee">Funcionário</SelectItem>
                  <SelectItem value="third_party">Terceirizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para alterar senha */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha do Usuário</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha (mínimo 6 caracteres)"
                required
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alterar Senha
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setPasswordDialogOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
