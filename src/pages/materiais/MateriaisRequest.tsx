import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ConstructionSiteAutocomplete } from "@/components/ConstructionSiteAutocomplete";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

interface RequestItem {
  material_name: string;
  quantity: number;
  unit: string;
  notes: string;
}

const UNITS = ["un", "m", "m²", "m³", "kg", "g", "l", "ml", "cx", "pc", "rolo", "saco", "par"];

export default function MateriaisRequest() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [constructionSite, setConstructionSite] = useState("");
  const [notes, setNotes] = useState("");
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<RequestItem[]>([
    { material_name: "", quantity: 1, unit: "un", notes: "" },
  ]);

  const hasUnsavedData = !!(constructionSite || notes || items.some(i => i.material_name));
  useUnsavedChanges(hasUnsavedData);

  useEffect(() => {
    supabase
      .from("construction_sites")
      .select("id, name")
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        if (data) setSites(data);
      });
  }, []);

  const addItem = () => {
    setItems([...items, { material_name: "", quantity: 1, unit: "un", notes: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof RequestItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async () => {
    if (!user || !profile) return;

    const validItems = items.filter((item) => item.material_name.trim());
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um material");
      return;
    }

    setLoading(true);
    try {
      // Create the request
      const { data: request, error: reqError } = await supabase
        .from("material_requests")
        .insert({
          user_id: user.id,
          requested_by_name: profile.full_name,
          construction_site: constructionSite || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // Create items
      const itemsToInsert = validItems.map((item) => ({
        request_id: request.id,
        material_name: item.material_name,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from("material_request_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success("Solicitação enviada com sucesso!");
      navigate("/materiais/historico");
    } catch (error: any) {
      console.error("Error creating request:", error);
      toast.error("Erro ao enviar solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold text-foreground">Nova Solicitação</h1>
        <p className="text-muted-foreground mt-1">Preencha os materiais que deseja solicitar</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações da Solicitação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Obra / Canteiro</Label>
            <ConstructionSiteAutocomplete
              sites={sites}
              value={constructionSite}
              onChange={setConstructionSite}
            />
          </div>
          <div>
            <Label>Observações Gerais</Label>
            <Textarea
              placeholder="Observações sobre a solicitação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Itens</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="p-3 border rounded-lg space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Item {index + 1}
                </span>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-destructive h-7 px-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              <div>
                <Label>Material *</Label>
                <Input
                  placeholder="Nome do material"
                  value={item.material_name}
                  onChange={(e) => updateItem(index, "material_name", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select value={item.unit} onValueChange={(v) => updateItem(index, "unit", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Observação do item</Label>
                <Input
                  placeholder="Ex: marca preferida, especificação..."
                  value={item.notes}
                  onChange={(e) => updateItem(index, "notes", e.target.value)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={loading} className="w-full" size="lg">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        Enviar Solicitação
      </Button>
    </div>
  );
}
