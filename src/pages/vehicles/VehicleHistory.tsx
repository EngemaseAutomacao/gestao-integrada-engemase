import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Car, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VehicleHistoryEntry {
  id: string;
  checkout_date: string;
  checkin_date: string | null;
  status: string | null;
  destination: string | null;
  km_checkout: number;
  km_checkin: number | null;
  refueled: boolean | null;
  notes: string | null;
  vehicles: {
    name: string;
    plate: string;
  };
  checked_out_by_profile: {
    full_name: string;
  } | null;
  checked_in_by_profile: {
    full_name: string;
  } | null;
}

export default function VehicleHistory() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<VehicleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicle_checkouts")
        .select(`
          id,
          checkout_date,
          checkin_date,
          status,
          destination,
          km_checkout,
          km_checkin,
          refueled,
          notes,
          vehicles (name, plate),
          checked_out_by_profile:profiles!vehicle_checkouts_checked_out_by_fkey (full_name),
          checked_in_by_profile:profiles!vehicle_checkouts_checked_in_by_fkey (full_name)
        `)
        .eq("user_id", profile!.id)
        .order("checkout_date", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading vehicle history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((entry) => {
    const matchesSearch =
      entry.vehicles.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.vehicles.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.destination && entry.destination.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || entry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Car className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      <div className="shrink-0 hidden sm:block">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Meu Histórico de Veículos</h2>
        <p className="text-sm text-muted-foreground">Histórico de saídas e chegadas de veículos</p>
      </div>

      <Card className="shrink-0">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre suas movimentações de veículos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por veículo, placa ou destino..."
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
                <SelectItem value="checked_in">Devolvido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>
            Mostrando {filteredHistory.length} de {history.length} registros
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma movimentação encontrada
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>KM Saída</TableHead>
                    <TableHead>Chegada</TableHead>
                    <TableHead>KM Chegada</TableHead>
                    <TableHead>Abastecido</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.vehicles.name}</TableCell>
                      <TableCell>{entry.vehicles.plate}</TableCell>
                      <TableCell>{entry.destination || "-"}</TableCell>
                      <TableCell>
                        {format(new Date(entry.checkout_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{entry.km_checkout.toLocaleString()}</TableCell>
                      <TableCell>
                        {entry.checkin_date
                          ? format(new Date(entry.checkin_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {entry.km_checkin ? entry.km_checkin.toLocaleString() : "-"}
                      </TableCell>
                      <TableCell>
                        {entry.refueled === null ? "-" : entry.refueled ? "Sim" : "Não"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.status === "checked_out" ? "default" : "secondary"}>
                          {entry.status === "checked_out" ? "Em Uso" : "Devolvido"}
                        </Badge>
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