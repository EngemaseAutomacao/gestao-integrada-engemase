import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

interface Checkout {
  id: string;
  tool_id: string;
  construction_site: string | null;
  estimated_return_date: string | null;
  tools: {
    name: string;
  };
}

export default function Checkin() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { isOnline, addPendingOperation } = useOffline();
  const { data: cachedCheckouts, saveToCache } = useOfflineStorage<Checkout[]>("checkouts", []);
  const navigate = useNavigate();
  const [checkouts, setCheckouts] = useState<Checkout[]>(cachedCheckouts || []);
  const [selectedCheckoutId, setSelectedCheckoutId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCheckouts, setLoadingCheckouts] = useState(true);
  const toolIdParam = searchParams.get("toolId");

  useEffect(() => {
    loadCheckouts();
  }, []);

  const loadCheckouts = async () => {
    try {
      if (!isOnline) {
        // Use cached data when offline
        if (cachedCheckouts && cachedCheckouts.length > 0) {
          setCheckouts(cachedCheckouts);
          toast.info("Modo offline - usando dados em cache");
        } else {
          toast.warning("Nenhum dado em cache disponível");
        }
        setLoadingCheckouts(false);
        return;
      }

      const { data, error } = await supabase
        .from("tool_checkouts")
        .select(`
          id,
          tool_id,
          construction_site,
          estimated_return_date,
          tools (name)
        `)
        .eq("user_id", profile!.id)
        .eq("status", "checked_out")
        .order("checkout_date", { ascending: false });

      if (error) throw error;

      setCheckouts(data || []);
      saveToCache(data || []);

      // Auto-select if toolId is provided
      if (toolIdParam && data) {
        const checkout = data.find(c => c.tool_id === toolIdParam);
        if (checkout) {
          setSelectedCheckoutId(checkout.id);
        }
      }
    } catch (error: any) {
      toast.error("Erro ao carregar retiradas", {
        description: error.message,
      });
    } finally {
      setLoadingCheckouts(false);
    }
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCheckoutId) {
      toast.error("Selecione uma retirada");
      return;
    }

    setLoading(true);

    try {
      const checkinData = {
        checkoutId: selectedCheckoutId,
        updates: {
          status: "checked_in" as const,
          checkin_date: new Date().toISOString(),
          checked_in_by: profile!.id,
          notes: notes.trim() ? notes : null,
        },
      };

      if (!isOnline) {
        // Save operation for later sync
        addPendingOperation("checkin", checkinData);
        toast.success("Ferramenta devolvida (offline)! Será sincronizada quando conectar.");
        navigate("/");
        return;
      }

      const { error } = await supabase
        .from("tool_checkouts")
        .update(checkinData.updates)
        .eq("id", selectedCheckoutId);

      if (error) throw error;

      toast.success("Ferramenta devolvida com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao devolver ferramenta", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Devolver Ferramenta</CardTitle>
          <CardDescription>Registre a devolução de uma ferramenta</CardDescription>
        </CardHeader>
        <CardContent>
          {checkouts.length === 0 && !loadingCheckouts ? (
            <p className="text-center text-muted-foreground py-8">
              Você não possui ferramentas para devolver
            </p>
          ) : (
            <form onSubmit={handleCheckin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="checkout">Ferramenta Retirada *</Label>
                <Select
                  value={selectedCheckoutId}
                  onValueChange={setSelectedCheckoutId}
                  disabled={loadingCheckouts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a ferramenta para devolver" />
                  </SelectTrigger>
                  <SelectContent>
                    {checkouts.map((checkout) => {
                      const isOverdue = checkout.estimated_return_date && new Date(checkout.estimated_return_date) < new Date();
                      return (
                        <SelectItem key={checkout.id} value={checkout.id}>
                          {checkout.tools.name}
                          {checkout.construction_site && ` - ${checkout.construction_site}`}
                          {isOverdue && " ⚠️ ATRASADO"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Adicione observações sobre o retorno..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-3">
                <Button type="submit" disabled={loading || !selectedCheckoutId} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Devolução
                </Button>
                {selectedCheckoutId && (
                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="w-full"
                  >
                    <Link to={`/report-issue?checkoutId=${selectedCheckoutId}`}>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Reportar Problema
                    </Link>
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => navigate("/")} className="w-full">
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
