import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History as HistoryIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoryEntry {
  id: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string;
  construction_site: string | null;
  estimated_return_date: string | null;
  tools: {
    name: string;
  };
  checked_out_by_profile: {
    full_name: string;
  } | null;
  checked_in_by_profile: {
    full_name: string;
  } | null;
  notes: string | null;
}

export default function UserHistory() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadHistory();
  }, []);

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
          tools (name),
          checked_out_by_profile:profiles!tool_checkouts_checked_out_by_fkey (full_name),
          checked_in_by_profile:profiles!tool_checkouts_checked_in_by_fkey (full_name)
        `)
        .eq("user_id", profile!.id)
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
      (entry.construction_site && entry.construction_site.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === "all" || entry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <HistoryIcon className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      <div className="shrink-0">
        <h2 className="text-3xl font-bold tracking-tight">Meu Histórico</h2>
        <p className="text-muted-foreground">Histórico de retiradas e devoluções</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre suas movimentações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ferramenta ou obra..."
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ferramenta</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Retirada</TableHead>
                  <TableHead>Retirado Por</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead>Devolução</TableHead>
                  <TableHead>Devolvido Por</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.tools.name}</TableCell>
                    <TableCell>{entry.construction_site || "-"}</TableCell>
                    <TableCell>
                      {format(new Date(entry.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {entry.checked_out_by_profile?.full_name || "-"}
                    </TableCell>
                    <TableCell>
                      {entry.estimated_return_date
                        ? format(new Date(entry.estimated_return_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {entry.checkin_date
                        ? format(new Date(entry.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {entry.checked_in_by_profile?.full_name || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Badge variant={entry.status === "checked_out" ? "default" : "secondary"}>
                          {entry.status === "checked_out" ? "Em Uso" : "Devolvida"}
                        </Badge>
                        {entry.estimated_return_date && entry.status === "checked_out" && new Date(entry.estimated_return_date) < new Date() && (
                          <Badge variant="destructive">Atrasado</Badge>
                        )}
                      </div>
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
