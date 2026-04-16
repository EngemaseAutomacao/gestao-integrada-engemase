import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Fuel, Plus, Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fuelTypes: Record<string, string> = {
  gasoline: "Gasolina",
  ethanol: "Etanol",
  diesel: "Diesel",
  gnv: "GNV",
};

export default function FuelRecords() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === "admin";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [fuelType, setFuelType] = useState("gasoline");
  const [liters, setLiters] = useState("");
  const [costPerLiter, setCostPerLiter] = useState("");
  const [kmAtRefuel, setKmAtRefuel] = useState("");
  const [gasStation, setGasStation] = useState("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("id, name, plate").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["fuel-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fuel_records")
        .select(`
          *,
          vehicles (name, plate),
          profiles (full_name)
        `)
        .order("refuel_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      if (!vehicleId) throw new Error("Selecione um veículo");
      if (!liters || parseFloat(liters) <= 0) throw new Error("Informe a quantidade de litros");
      if (!kmAtRefuel) throw new Error("Informe a quilometragem");

      const totalCost = costPerLiter ? parseFloat(liters) * parseFloat(costPerLiter) : null;

      const { error } = await supabase.from("fuel_records").insert({
        vehicle_id: vehicleId,
        user_id: user.id,
        fuel_type: fuelType,
        liters: parseFloat(liters),
        cost_per_liter: costPerLiter ? parseFloat(costPerLiter) : null,
        total_cost: totalCost,
        km_at_refuel: parseInt(kmAtRefuel),
        gas_station: gasStation.trim() || null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Abastecimento registrado!");
      queryClient.invalidateQueries({ queryKey: ["fuel-records"] });
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetForm = () => {
    setVehicleId("");
    setFuelType("gasoline");
    setLiters("");
    setCostPerLiter("");
    setKmAtRefuel("");
    setGasStation("");
    setNotes("");
    setDialogOpen(false);
  };

  const filteredRecords = records?.filter((r: any) =>
    r.vehicles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.vehicles?.plate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.gas_station?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Aggregate stats
  const totalLiters = records?.reduce((sum: number, r: any) => sum + parseFloat(r.liters), 0) || 0;
  const totalCost = records?.reduce((sum: number, r: any) => sum + (parseFloat(r.total_cost) || 0), 0) || 0;

  return (
    <div className="flex flex-col h-full min-h-0 gap-6">
      <div className="shrink-0 flex items-center justify-between flex-wrap gap-4">
        <div className="hidden sm:block">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Fuel className="w-8 h-8 text-primary" />
            Controle de Combustível
          </h1>
          <p className="text-muted-foreground mt-1">Registre e acompanhe abastecimentos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Abastecimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Abastecimento</DialogTitle>
              <DialogDescription>Preencha os dados do abastecimento</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Veículo *</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name} - {v.plate}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Combustível *</Label>
                  <Select value={fuelType} onValueChange={setFuelType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(fuelTypes).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Litros *</Label>
                  <Input type="number" step="0.01" placeholder="Ex: 45.5" value={liters} onChange={(e) => setLiters(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço/Litro (R$)</Label>
                  <Input type="number" step="0.01" placeholder="Ex: 5.89" value={costPerLiter} onChange={(e) => setCostPerLiter(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>KM Atual *</Label>
                  <Input type="number" placeholder="Ex: 45000" value={kmAtRefuel} onChange={(e) => setKmAtRefuel(e.target.value)} />
                </div>
              </div>
              {liters && costPerLiter && (
                <p className="text-sm font-medium text-primary">
                  Total: R$ {(parseFloat(liters) * parseFloat(costPerLiter)).toFixed(2)}
                </p>
              )}
              <div className="space-y-2">
                <Label>Posto</Label>
                <Input placeholder="Nome do posto" value={gasStation} onChange={(e) => setGasStation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea placeholder="Observações..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
                {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Litros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLiters.toFixed(1)} L</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Histórico de Abastecimentos</CardTitle>
          <CardDescription>Todos os registros de abastecimento</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por veículo ou posto..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filteredRecords || filteredRecords.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum registro encontrado</p>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Veículo</TableHead>
                    <TableHead>Combustível</TableHead>
                    <TableHead>Litros</TableHead>
                    <TableHead>R$/L</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>km/l</TableHead>
                    <TableHead>Posto</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {filteredRecords.map((record: any, idx: number) => {
                    // Calculate km/l: find previous record for same vehicle
                    let kmPerLiter: number | null = null;
                    if (records) {
                      const sameVehicleRecords = records
                        .filter((r: any) => r.vehicle_id === record.vehicle_id)
                        .sort((a: any, b: any) => new Date(b.refuel_date).getTime() - new Date(a.refuel_date).getTime());
                      const currentIdx = sameVehicleRecords.findIndex((r: any) => r.id === record.id);
                      const prevRecord = sameVehicleRecords[currentIdx + 1];
                      if (prevRecord && record.km_at_refuel > prevRecord.km_at_refuel && parseFloat(record.liters) > 0) {
                        kmPerLiter = (record.km_at_refuel - prevRecord.km_at_refuel) / parseFloat(record.liters);
                      }
                    }
                    return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.vehicles?.name}
                        <br />
                        <span className="text-xs text-muted-foreground">{record.vehicles?.plate}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{fuelTypes[record.fuel_type] || record.fuel_type}</Badge>
                      </TableCell>
                      <TableCell>{parseFloat(record.liters).toFixed(1)}L</TableCell>
                      <TableCell>{record.cost_per_liter ? `R$ ${parseFloat(record.cost_per_liter).toFixed(2)}` : "-"}</TableCell>
                      <TableCell className="font-medium">{record.total_cost ? `R$ ${parseFloat(record.total_cost).toFixed(2)}` : "-"}</TableCell>
                      <TableCell>{record.km_at_refuel.toLocaleString()}</TableCell>
                      <TableCell>
                        {kmPerLiter !== null ? (
                          <Badge variant={kmPerLiter >= 8 ? "secondary" : "destructive"} className="text-xs">
                            {kmPerLiter.toFixed(1)} km/l
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{record.gas_station || "-"}</TableCell>
                      <TableCell>{format(new Date(record.refuel_date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell>{record.profiles?.full_name || "-"}</TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
