import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";

interface LogEntry {
  id: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string;
  construction_site: string | null;
  estimated_return_date: string | null;
  notes: string | null;
  tools: {
    name: string;
    serial_number: string | null;
  };
  profiles: {
    full_name: string;
    category: "engemase_employee" | "third_party";
    email: string;
  };
  checked_out_by_profile: {
    full_name: string;
    email: string;
  } | null;
  checked_in_by_profile: {
    full_name: string;
    email: string;
  } | null;
}

export default function AdminLogs() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const loadLogs = async () => {
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
          tools (name, serial_number),
          profiles!tool_checkouts_user_id_fkey (full_name, category, email),
          checked_out_by_profile:profiles!tool_checkouts_checked_out_by_fkey (full_name, email),
          checked_in_by_profile:profiles!tool_checkouts_checked_in_by_fkey (full_name, email)
        `)
        .order("checkout_date", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((entry) => {
    const matchesSearch = 
      entry.tools.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.profiles.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.checked_out_by_profile?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.checked_in_by_profile?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.construction_site && entry.construction_site.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  const getCategoryBadge = (category: "engemase_employee" | "third_party") => {
    if (category === "engemase_employee") {
      return <Badge className="bg-badge-employee text-badge-employee-foreground">Funcionário</Badge>;
    }
    return <Badge className="bg-badge-thirdparty text-badge-thirdparty-foreground">Terceirizado</Badge>;
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
        <h2 className="text-3xl font-bold tracking-tight">Logs do Sistema</h2>
        <p className="text-muted-foreground">Visualize todas as ações registradas no sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar nos Logs</CardTitle>
          <CardDescription>Encontre registros por ferramenta, usuário, obra ou responsável</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar em todos os campos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Atividade</CardTitle>
          <CardDescription>
            Mostrando {filteredLogs.length} de {logs.length} registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum registro encontrado
            </p>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((entry) => (
                <Card key={entry.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{entry.tools.name}</h3>
                          {entry.tools.serial_number && (
                            <p className="text-sm text-muted-foreground">S/N: {entry.tools.serial_number}</p>
                          )}
                        </div>
                        <Badge variant={entry.status === "checked_out" ? "default" : "secondary"}>
                          {entry.status === "checked_out" ? "Em Uso" : "Devolvida"}
                        </Badge>
                      </div>

                      <div className="grid gap-2 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium text-foreground">Usuário:</span>
                            <p className="text-muted-foreground">{entry.profiles.full_name}</p>
                            <p className="text-xs text-muted-foreground">{entry.profiles.email}</p>
                            {getCategoryBadge(entry.profiles.category)}
                          </div>
                          {entry.construction_site && (
                            <div>
                              <span className="font-medium text-foreground">Obra:</span>
                              <p className="text-muted-foreground">{entry.construction_site}</p>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div>
                            <span className="font-medium text-foreground">Retirada:</span>
                            <p className="text-muted-foreground">
                              {format(new Date(entry.checkout_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Por: {entry.checked_out_by_profile?.full_name || "Sistema"}
                            </p>
                          </div>
                          {entry.estimated_return_date && (
                            <div>
                              <span className="font-medium text-foreground">Previsão de Devolução:</span>
                              <p className="text-muted-foreground">
                                {format(new Date(entry.estimated_return_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          )}
                        </div>

                        {entry.checkin_date && (
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div>
                              <span className="font-medium text-foreground">Devolução:</span>
                              <p className="text-muted-foreground">
                                {format(new Date(entry.checkin_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Por: {entry.checked_in_by_profile?.full_name || "Sistema"}
                              </p>
                            </div>
                          </div>
                        )}

                        {entry.notes && (
                          <div className="pt-2 border-t">
                            <span className="font-medium text-foreground">Observações:</span>
                            <p className="text-muted-foreground">{entry.notes}</p>
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
