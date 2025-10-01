import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  quantity_available: number;
  employee_only: boolean;
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>(searchParams.get("toolId") || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTools, setLoadingTools] = useState(true);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const { data, error } = await supabase
        .from("tools")
        .select("*")
        .gt("quantity_available", 0)
        .order("name");

      if (error) throw error;

      // Filter out employee-only tools for third-party users
      const filteredTools = data?.filter(tool => {
        if (profile?.category === "third_party" && tool.employee_only) {
          return false;
        }
        return true;
      }) || [];

      setTools(filteredTools);
    } catch (error: any) {
      toast.error("Erro ao carregar ferramentas", {
        description: error.message,
      });
    } finally {
      setLoadingTools(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedToolId) {
      toast.error("Selecione uma ferramenta");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("tool_checkouts")
        .insert({
          tool_id: selectedToolId,
          user_id: profile!.id,
          checked_out_by: profile!.id,
          status: "checked_out",
          notes: notes.trim() || null,
        });

      if (error) throw error;

      toast.success("Ferramenta retirada com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao retirar ferramenta", {
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
          <CardTitle>Retirar Ferramenta</CardTitle>
          <CardDescription>Registre a retirada de uma ferramenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tool">Ferramenta *</Label>
              <Select
                value={selectedToolId}
                onValueChange={setSelectedToolId}
                disabled={loadingTools}
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
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações sobre o uso..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading || !selectedToolId} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Retirada
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
