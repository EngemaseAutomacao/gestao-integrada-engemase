import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Search, Eye, Camera, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";

interface HistoryEntry {
  id: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string;
  construction_site: string | null;
  estimated_return_date: string | null;
  checkout_photo_url: string | null;
  checkin_photo_url: string | null;
  checkout_signature_url: string | null;
  checkin_signature_url: string | null;
  tools: {
    name: string;
  };
  profiles: {
    full_name: string;
    category: "engemase_employee" | "third_party" | "socios";
  };
  checked_out_by_profile: {
    full_name: string;
  } | null;
  checked_in_by_profile: {
    full_name: string;
  } | null;
  notes: string | null;
}

export default function AdminHistory() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("tool_checkouts")
        .select(`
          id,
          checkout_date,
          checkin_date,
          status,
          construction_site,
          estimated_return_date,
          notes,
          checkout_photo_url,
          checkin_photo_url,
          checkout_signature_url,
          checkin_signature_url,
          tools (name),
          profiles!tool_checkouts_user_id_fkey (full_name, category),
          checked_out_by_profile:profiles!tool_checkouts_checked_out_by_fkey (full_name),
          checked_in_by_profile:profiles!tool_checkouts_checked_in_by_fkey (full_name)
        `)
        .order("checkout_date", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((entry) => {
    const matchesSearch = 
      entry.tools.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || entry.status === statusFilter;
    
    const matchesCategory = 
      categoryFilter === "all" || entry.profiles.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getCategoryBadge = (category: "engemase_employee" | "third_party" | "socios") => {
    if (category === "engemase_employee") {
      return <Badge className="bg-badge-employee text-badge-employee-foreground">Funcionário</Badge>;
    }
    if (category === "socios") {
      return <Badge className="bg-primary text-primary-foreground">Sócio</Badge>;
    }
    return <Badge className="bg-badge-thirdparty text-badge-thirdparty-foreground">Terceirizado</Badge>;
  };

  const isOverdue = (estimatedReturnDate: string | null, status: string) => {
    if (!estimatedReturnDate || status !== "checked_out") return false;
    return new Date(estimatedReturnDate) < new Date();
  };

  const hasMedia = (entry: HistoryEntry) => {
    return entry.checkout_photo_url || entry.checkin_photo_url || 
           entry.checkout_signature_url || entry.checkin_signature_url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Histórico Completo</h2>
        <p className="text-muted-foreground">Visualize todas as movimentações de ferramentas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre o histórico por diferentes critérios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ferramenta ou usuário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="checked_out">Em Uso</SelectItem>
                <SelectItem value="checked_in">Devolvida</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                <SelectItem value="engemase_employee">Funcionários</SelectItem>
                <SelectItem value="third_party">Terceirizados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>
            Mostrando {filteredHistory.length} de {history.length} registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma movimentação encontrada
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ferramenta</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Retirada</TableHead>
                    <TableHead>Devolução</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.tools.name}</TableCell>
                      <TableCell>{entry.construction_site || "-"}</TableCell>
                      <TableCell>{entry.profiles.full_name}</TableCell>
                      <TableCell>{getCategoryBadge(entry.profiles.category)}</TableCell>
                      <TableCell>
                        {format(new Date(entry.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {entry.checkin_date
                          ? format(new Date(entry.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant={entry.status === "checked_out" ? "default" : "secondary"}>
                            {entry.status === "checked_out" ? "Em Uso" : "Devolvida"}
                          </Badge>
                          {isOverdue(entry.estimated_return_date, entry.status) && (
                            <Badge variant="destructive">Atrasado</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(entry)}>
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                              {hasMedia(entry) && (
                                <span className="ml-1 flex gap-1">
                                  {(entry.checkout_photo_url || entry.checkin_photo_url) && 
                                    <Camera className="w-3 h-3" />}
                                  {(entry.checkout_signature_url || entry.checkin_signature_url) && 
                                    <FileSignature className="w-3 h-3" />}
                                </span>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Detalhes da Movimentação</DialogTitle>
                            </DialogHeader>
                            {selectedEntry && (
                              <div className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Ferramenta</p>
                                    <p className="font-semibold">{selectedEntry.tools.name}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Usuário</p>
                                    <p className="font-semibold">{selectedEntry.profiles.full_name}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Obra</p>
                                    <p>{selectedEntry.construction_site || "Não informado"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                                    <Badge variant={selectedEntry.status === "checked_out" ? "default" : "secondary"}>
                                      {selectedEntry.status === "checked_out" ? "Em Uso" : "Devolvida"}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Data de Retirada</p>
                                    <p>{format(new Date(selectedEntry.checkout_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Por: {selectedEntry.checked_out_by_profile?.full_name || "-"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Data de Devolução</p>
                                    <p>
                                      {selectedEntry.checkin_date 
                                        ? format(new Date(selectedEntry.checkin_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                        : "Não devolvida"}
                                    </p>
                                    {selectedEntry.checked_in_by_profile && (
                                      <p className="text-xs text-muted-foreground">
                                        Por: {selectedEntry.checked_in_by_profile.full_name}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Photos and Signatures */}
                                {hasMedia(selectedEntry) && (
                                  <div className="pt-4 border-t space-y-4">
                                    <h4 className="font-semibold">Fotos e Assinaturas</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      {/* Checkout Media */}
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">Retirada</p>
                                        {selectedEntry.checkout_photo_url && (
                                          <div>
                                            <p className="text-xs text-muted-foreground mb-1">Foto:</p>
                                            <img 
                                              src={selectedEntry.checkout_photo_url} 
                                              alt="Foto na retirada" 
                                              className="w-full h-40 object-cover rounded-lg"
                                            />
                                          </div>
                                        )}
                                        {selectedEntry.checkout_signature_url && (
                                          <div>
                                            <p className="text-xs text-muted-foreground mb-1">Assinatura:</p>
                                            <div className="border rounded-lg p-2 bg-white">
                                              <img 
                                                src={selectedEntry.checkout_signature_url} 
                                                alt="Assinatura na retirada" 
                                                className="w-full h-20 object-contain"
                                              />
                                            </div>
                                          </div>
                                        )}
                                        {!selectedEntry.checkout_photo_url && !selectedEntry.checkout_signature_url && (
                                          <p className="text-sm text-muted-foreground">Sem registros</p>
                                        )}
                                      </div>

                                      {/* Checkin Media */}
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">Devolução</p>
                                        {selectedEntry.checkin_photo_url && (
                                          <div>
                                            <p className="text-xs text-muted-foreground mb-1">Foto:</p>
                                            <img 
                                              src={selectedEntry.checkin_photo_url} 
                                              alt="Foto na devolução" 
                                              className="w-full h-40 object-cover rounded-lg"
                                            />
                                          </div>
                                        )}
                                        {selectedEntry.checkin_signature_url && (
                                          <div>
                                            <p className="text-xs text-muted-foreground mb-1">Assinatura:</p>
                                            <div className="border rounded-lg p-2 bg-white">
                                              <img 
                                                src={selectedEntry.checkin_signature_url} 
                                                alt="Assinatura na devolução" 
                                                className="w-full h-20 object-contain"
                                              />
                                            </div>
                                          </div>
                                        )}
                                        {!selectedEntry.checkin_photo_url && !selectedEntry.checkin_signature_url && (
                                          <p className="text-sm text-muted-foreground">Sem registros</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Notes */}
                                {selectedEntry.notes && (
                                  <div className="pt-4 border-t">
                                    <p className="text-sm font-medium text-muted-foreground">Observações</p>
                                    <p className="mt-1">{selectedEntry.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
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
