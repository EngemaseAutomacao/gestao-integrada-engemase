import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { uploadDataUrlImage } from "@/lib/storageUtils";
import { compressDataUrl } from "@/lib/imageCompression";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useActiveConstructionSites } from "@/hooks/useConstructionSites";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConstructionSiteAutocomplete } from "@/components/ConstructionSiteAutocomplete";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CheckCircle, Trash2, Plus } from "lucide-react";
import { PhotoCapture } from "@/components/PhotoCapture";
import { Badge } from "@/components/ui/badge";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { cn } from "@/lib/utils";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  quantity_available: number;
  employee_only: boolean;
  tag: string | null;
}

interface SelectedTool {
  toolId: string;
  tag: string;
}

export default function MultiCheckout() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { isOnline, addPendingOperation } = useOffline();
  const { data: cachedTools, saveToCache } = useOfflineStorage<Tool[]>("tools", []);
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>(cachedTools || []);
  const [selectedTools, setSelectedTools] = useState<SelectedTool[]>([]);
  const [constructionSite, setConstructionSite] = useState("");
  const [estimatedReturnDate, setEstimatedReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTools, setLoadingTools] = useState(true);
  
  // Photo state
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);

  const { data: constructionSites } = useActiveConstructionSites();

  // Warn on unsaved form data
  const hasUnsavedData = !!(constructionSite || notes || estimatedReturnDate || photoConfirmed || selectedTools.length > 0);
  useUnsavedChanges(hasUnsavedData);

  useEffect(() => {
    loadTools();
  }, []);

  useEffect(() => {
    if (tools.length > 0 && selectedTools.length === 0) {
      const idsFromUrl = searchParams.get("ids");
      if (idsFromUrl) {
        const ids = idsFromUrl.split(",");
        const initialSelected = ids.map(id => {
          const tool = tools.find(t => t.id === id);
          // Only auto-select tag if there's exactly one
          const toolTags = tool?.tag ? tool.tag.split(",").map(t => t.trim()).filter(Boolean) : [];
          return {
            toolId: id,
            tag: toolTags.length === 1 ? toolTags[0] : ""
          };
        }).filter(item => item.toolId);
        
        if (initialSelected.length > 0) {
          setSelectedTools(initialSelected);
        }
      }
    }
  }, [tools, searchParams]);

  const loadTools = async () => {
    try {
      if (!isOnline) {
        if (cachedTools && cachedTools.length > 0) {
          setTools(cachedTools);
          toast.info("Modo offline - usando dados em cache");
        }
        setLoadingTools(false);
        return;
      }

      const { data, error } = await supabase
        .from("tools")
        .select("*")
        .gt("quantity_available", 0)
        .order("name");

      if (error) throw error;

      const filteredTools = data?.filter(tool => {
        if (profile?.category === "third_party" && tool.employee_only) {
          return false;
        }
        return true;
      }) || [];

      setTools(filteredTools);
      saveToCache(filteredTools);
    } catch (error: any) {
      toast.error("Erro ao carregar ferramentas", {
        description: error.message,
      });
    } finally {
      setLoadingTools(false);
    }
  };

  const addToolRow = () => {
    setSelectedTools([...selectedTools, { toolId: "", tag: "" }]);
  };

  const removeToolRow = (index: number) => {
    const newSelected = [...selectedTools];
    newSelected.splice(index, 1);
    setSelectedTools(newSelected);
  };

  const updateToolRow = (index: number, toolId: string) => {
    const newSelected = [...selectedTools];
    const tool = tools.find(t => t.id === toolId);
    const toolTags = tool?.tag ? tool.tag.split(",").map(t => t.trim()).filter(Boolean) : [];
    
    newSelected[index] = { 
      toolId, 
      tag: toolTags.length === 1 ? toolTags[0] : "" 
    };
    setSelectedTools(newSelected);
  };

  const updateTagRow = (index: number, tag: string) => {
    const newSelected = [...selectedTools];
    newSelected[index].tag = tag;
    setSelectedTools(newSelected);
  };

  const uploadImage = async (dataUrl: string, type: "photo" | "signature"): Promise<string | null> => {
    const compressed = await compressDataUrl(dataUrl);
    return uploadDataUrlImage(compressed, type, "ferramentas", "saidas");
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedTools.length === 0) {
      toast.error("Selecione pelo menos uma ferramenta");
      return;
    }

    const invalidTools = selectedTools.some(st => {
      const tool = tools.find(t => t.id === st.toolId);
      const toolTags = tool?.tag ? tool.tag.split(",").map(t => t.trim()).filter(Boolean) : [];
      return !st.toolId || (toolTags.length > 1 && !st.tag);
    });

    if (invalidTools) {
      toast.error("Verifique se todas as ferramentas e TAGs foram selecionadas");
      return;
    }

    const finalSite = constructionSite.trim();
    if (!finalSite) {
      toast.error("Informe a obra de destino");
      return;
    }

    if (!estimatedReturnDate) {
      toast.error("Informe a data estimada de devolução");
      return;
    }

    setLoading(true);

    try {
      let photoUrl: string | null = null;
      if (photoDataUrl) {
        photoUrl = await uploadImage(photoDataUrl, "photo");
      }

      const checkouts = selectedTools.map(st => ({
        tool_id: st.toolId,
        user_id: profile!.id,
        checked_out_by: profile!.id,
        status: "checked_out" as const,
        construction_site: finalSite,
        estimated_return_date: new Date(estimatedReturnDate).toISOString(),
        notes: notes.trim() || null,
        checkout_photo_url: photoUrl,
        selected_tag: st.tag || null,
      }));

      if (!isOnline) {
        checkouts.forEach(data => addPendingOperation("checkout", data));
        toast.success("Retiradas registradas (offline)! Serão sincronizadas em breve.");
        navigate("/ferramentas");
        return;
      }

      const { error } = await supabase
        .from("tool_checkouts")
        .insert(checkouts);

      if (error) throw error;

      toast.success(`${selectedTools.length} ferramentas retiradas com sucesso!`);
      navigate("/ferramentas");
    } catch (error: any) {
      toast.error("Erro ao retirar ferramentas", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoCapture = (dataUrl: string) => {
    setPhotoDataUrl(dataUrl);
    setPhotoConfirmed(true);
    toast.success("Foto confirmada!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/ferramentas")} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Retirada Múltipla</CardTitle>
          <CardDescription>Retire várias ferramentas para a mesma obra de uma só vez</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheckout} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Ferramentas selecionadas *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addToolRow} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Ferramenta
                </Button>
              </div>

              {selectedTools.map((selected, index) => {
                const tool = tools.find(t => t.id === selected.toolId);
                const toolTags = tool?.tag ? tool.tag.split(",").map(t => t.trim()).filter(Boolean) : [];
                
                return (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 p-3 border rounded-lg bg-muted/30">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Ferramenta</Label>
                      <Select
                        value={selected.toolId}
                        onValueChange={(val) => updateToolRow(index, val)}
                        disabled={loadingTools}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tools.map((t) => (
                            <SelectItem key={t.id} value={t.id} disabled={selectedTools.some((st, i) => st.toolId === t.id && i !== index)}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">TAG {toolTags.length > 1 ? "*" : ""}</Label>
                      <Select 
                        value={selected.tag} 
                        onValueChange={(val) => updateTagRow(index, val)}
                        disabled={!selected.toolId}
                      >
                        <SelectTrigger className={cn(!selected.tag && toolTags.length > 1 && "border-destructive/50 ring-destructive/20")}>
                          <SelectValue placeholder={toolTags.length > 1 ? "Selecione a TAG..." : "Nenhuma TAG"} />
                        </SelectTrigger>
                        <SelectContent>
                          {toolTags.length > 0 ? (
                            toolTags.map((tag) => (
                              <SelectItem key={tag} value={tag}>TAG {tag}</SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-tag" disabled>Sem TAG cadastrada</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end pb-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeToolRow(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {selectedTools.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
                  Nenhuma ferramenta adicionada. Clique no botão acima para começar.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="construction_site">Obra de Destino *</Label>
                <ConstructionSiteAutocomplete
                  sites={constructionSites || []}
                  value={constructionSite}
                  onChange={setConstructionSite}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_return">Previsão de Devolução *</Label>
                <input
                  id="estimated_return"
                  type="datetime-local"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={estimatedReturnDate}
                  onChange={(e) => setEstimatedReturnDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Observações válidas para todas as ferramentas selecionadas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Foto do Conjunto (opcional)</Label>
                {photoConfirmed && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Capturada
                  </Badge>
                )}
              </div>
              {!photoConfirmed ? (
                <PhotoCapture onCapture={handlePhotoCapture} title="Foto das ferramentas" />
              ) : (
                <div className="relative">
                  <img src={photoDataUrl!} alt="Foto capturada" className="w-full h-48 object-cover rounded-lg" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => { setPhotoConfirmed(false); setPhotoDataUrl(null); }}
                  >
                    Refazer
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                type="submit" 
                disabled={loading || selectedTools.length === 0 || !constructionSite.trim() || !estimatedReturnDate} 
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Saída de {selectedTools.length} {selectedTools.length === 1 ? "Ferramenta" : "Ferramentas"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/ferramentas")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
