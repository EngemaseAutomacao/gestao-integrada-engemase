import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, ClipboardEdit } from "lucide-react";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";

interface Tool {
  id: string;
  name: string;
  quantity_available: number;
}

interface User {
  id: string;
  full_name: string;
  category: "engemase_employee" | "third_party" | "socios";
}

interface Checkout {
  id: string;
  checkout_date: string;
  tools: {
    name: string;
  };
  profiles: {
    full_name: string;
  };
}

export default function ManualEntry() {
  const { profile } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Checkout form
  const [checkoutForm, setCheckoutForm] = useState({
    toolId: "",
    userId: "",
    constructionSite: "",
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    estimatedReturnDate: "",
    notes: "",
  });

  // Check-in form
  const [checkinForm, setCheckinForm] = useState({
    checkoutId: "",
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const loadData = async () => {
    try {
      // Load tools
      const { data: toolsData, error: toolsError } = await supabase
        .from("tools")
        .select("id, name, quantity_available")
        .gt("quantity_available", 0)
        .order("name");

      if (toolsError) throw toolsError;
      setTools(toolsData || []);

      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, full_name, category")
        .order("full_name");

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Load active checkouts
      const { data: checkoutsData, error: checkoutsError } = await supabase
        .from("tool_checkouts")
        .select(`
          id,
          checkout_date,
          tools (name),
          profiles!tool_checkouts_user_id_fkey (full_name)
        `)
        .eq("status", "checked_out")
        .order("checkout_date", { ascending: false });

      if (checkoutsError) throw checkoutsError;
      setCheckouts(checkoutsData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados", {
        description: error.message,
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleManualCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkoutForm.toolId || !checkoutForm.userId || !checkoutForm.constructionSite || !checkoutForm.estimatedReturnDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("tool_checkouts")
        .insert({
          tool_id: checkoutForm.toolId,
          user_id: checkoutForm.userId,
          checked_out_by: profile!.id,
          checkout_date: new Date(checkoutForm.date).toISOString(),
          construction_site: checkoutForm.constructionSite.trim(),
          estimated_return_date: new Date(checkoutForm.estimatedReturnDate).toISOString(),
          status: "checked_out",
          notes: checkoutForm.notes.trim() || null,
        });

      if (error) throw error;

      toast.success("Retirada registrada manualmente com sucesso!");
      setCheckoutForm({
        toolId: "",
        userId: "",
        constructionSite: "",
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        estimatedReturnDate: "",
        notes: "",
      });
      loadData();
    } catch (error: any) {
      toast.error("Erro ao registrar retirada", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkinForm.checkoutId) {
      toast.error("Selecione uma retirada");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("tool_checkouts")
        .update({
          status: "checked_in",
          checkin_date: new Date(checkinForm.date).toISOString(),
          checked_in_by: profile!.id,
          notes: checkinForm.notes.trim() || null,
        })
        .eq("id", checkinForm.checkoutId);

      if (error) throw error;

      toast.success("Devolução registrada manualmente com sucesso!");
      setCheckinForm({
        checkoutId: "",
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        notes: "",
      });
      loadData();
    } catch (error: any) {
      toast.error("Erro ao registrar devolução", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Entrada Manual</h2>
        <p className="text-muted-foreground">
          Registre retiradas e devoluções manualmente para correções ou operações offline
        </p>
      </div>

      <Tabs defaultValue="checkout" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="checkout">Registrar Retirada</TabsTrigger>
          <TabsTrigger value="checkin">Registrar Devolução</TabsTrigger>
        </TabsList>

        <TabsContent value="checkout">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Retirada Manual</CardTitle>
              <CardDescription>
                Use este formulário para registrar retiradas que ocorreram offline ou para correções
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualCheckout} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tool">Ferramenta *</Label>
                    <Select
                      value={checkoutForm.toolId}
                      onValueChange={(value) => setCheckoutForm({ ...checkoutForm, toolId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma ferramenta" />
                      </SelectTrigger>
                      <SelectContent>
                        {tools.map((tool) => (
                          <SelectItem key={tool.id} value={tool.id}>
                            {tool.name} (Disponível: {tool.quantity_available})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user">Usuário *</Label>
                    <Select
                      value={checkoutForm.userId}
                      onValueChange={(value) => setCheckoutForm({ ...checkoutForm, userId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.category === "engemase_employee" ? "Funcionário" : "Terceirizado"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="construction-site">Obra de Destino *</Label>
                  <Input
                    id="construction-site"
                    placeholder="Ex: Obra Residencial Centro, Edifício Comercial..."
                    value={checkoutForm.constructionSite}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, constructionSite: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="checkout-date">Data e Hora da Retirada *</Label>
                    <input
                      id="checkout-date"
                      type="datetime-local"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={checkoutForm.date}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimated-return">Previsão de Devolução *</Label>
                    <input
                      id="estimated-return"
                      type="datetime-local"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={checkoutForm.estimatedReturnDate}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, estimatedReturnDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkout-notes">Observações</Label>
                  <Textarea
                    id="checkout-notes"
                    placeholder="Motivo da entrada manual, condições especiais, etc..."
                    value={checkoutForm.notes}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <ClipboardEdit className="mr-2 h-4 w-4" />
                  Registrar Retirada Manual
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkin">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Devolução Manual</CardTitle>
              <CardDescription>
                Use este formulário para registrar devoluções que ocorreram offline ou para correções
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualCheckin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="checkout-select">Retirada em Aberto *</Label>
                  <Select
                    value={checkinForm.checkoutId}
                    onValueChange={(value) => setCheckinForm({ ...checkinForm, checkoutId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma retirada para devolver" />
                    </SelectTrigger>
                    <SelectContent>
                      {checkouts.map((checkout) => (
                        <SelectItem key={checkout.id} value={checkout.id}>
                          {checkout.tools.name} - {checkout.profiles.full_name} (
                          {format(new Date(checkout.checkout_date), "dd/MM/yyyy HH:mm")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkin-date">Data e Hora da Devolução *</Label>
                  <input
                    id="checkin-date"
                    type="datetime-local"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={checkinForm.date}
                    onChange={(e) => setCheckinForm({ ...checkinForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkin-notes">Observações</Label>
                  <Textarea
                    id="checkin-notes"
                    placeholder="Motivo da entrada manual, condições da ferramenta, etc..."
                    value={checkinForm.notes}
                    onChange={(e) => setCheckinForm({ ...checkinForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <ClipboardEdit className="mr-2 h-4 w-4" />
                  Registrar Devolução Manual
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
