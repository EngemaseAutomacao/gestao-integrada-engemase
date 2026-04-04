import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConstructionSiteAutocomplete } from "@/components/ConstructionSiteAutocomplete";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { PhotoCapture } from "@/components/PhotoCapture";
import { Badge } from "@/components/ui/badge";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  quantity_available: number;
  employee_only: boolean;
  tag: string | null;
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { isOnline, addPendingOperation } = useOffline();
  const { data: cachedTools, saveToCache } = useOfflineStorage<Tool[]>("tools", []);
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>(cachedTools || []);
  const [selectedToolId, setSelectedToolId] = useState<string>(searchParams.get("toolId") || "");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [constructionSite, setConstructionSite] = useState("");
  const [estimatedReturnDate, setEstimatedReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTools, setLoadingTools] = useState(true);
  
  // Photo state
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);

  // Get tags for selected tool
  const selectedTool = tools.find(t => t.id === selectedToolId);
  const toolTags = selectedTool?.tag ? selectedTool.tag.split(",").map(t => t.trim()).filter(Boolean) : [];
  const hasMultipleTags = toolTags.length > 1;

  const { data: constructionSites } = useQuery({
    queryKey: ["construction-sites-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("construction_sites")
        .select("id, name")
        .eq("active", true)
        .order("name", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      if (!isOnline) {
        if (cachedTools && cachedTools.length > 0) {
          setTools(cachedTools);
          toast.info("Modo offline - usando dados em cache");
        } else {
          toast.warning("Nenhum dado em cache disponível");
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

  const uploadImage = async (dataUrl: string, type: "photo" | "signature"): Promise<string | null> => {
    try {
      const base64Data = dataUrl.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: type === "photo" ? "image/jpeg" : "image/png" });

      const seq = String(Date.now()).slice(-6);
      const dateFolder = new Date().toISOString().slice(0, 10);
      const fileName = `ferramentas/saidas/${dateFolder}/saida_${type}_${seq}.${type === "photo" ? "jpg" : "png"}`;
      
      const { error: uploadError } = await supabase.storage
        .from("imagens")
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      return fileName;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      return null;
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedToolId) {
      toast.error("Selecione uma ferramenta");
      return;
    }

    if (hasMultipleTags && !selectedTag) {
      toast.error("Selecione qual TAG você está retirando");
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

    // Photo is optional

    setLoading(true);

    try {
      let photoUrl: string | null = null;

      if (photoDataUrl) {
        photoUrl = await uploadImage(photoDataUrl, "photo");
      }

      const checkoutData = {
        tool_id: selectedToolId,
        user_id: profile!.id,
        checked_out_by: profile!.id,
        status: "checked_out" as const,
        construction_site: finalSite,
        estimated_return_date: new Date(estimatedReturnDate).toISOString(),
        notes: notes.trim() || null,
        checkout_photo_url: photoUrl,
        selected_tag: hasMultipleTags ? selectedTag : (toolTags.length === 1 ? toolTags[0] : null),
      };

      if (!isOnline) {
        addPendingOperation("checkout", checkoutData);
        toast.success("Ferramenta retirada (offline)! Será sincronizada quando conectar.");
        navigate("/ferramentas");
        return;
      }

      const { error } = await supabase
        .from("tool_checkouts")
        .insert(checkoutData);

      if (error) throw error;

      toast.success("Ferramenta retirada com sucesso!");
      navigate("/ferramentas");
    } catch (error: any) {
      toast.error("Erro ao retirar ferramenta", {
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
          <CardTitle>Registrar Saída</CardTitle>
          <CardDescription>Registre a saída de uma ferramenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheckout} className="space-y-6">
            {/* Two-column grid on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="tool">Ferramenta *</Label>
                <Select
                  key={selectedToolId || "empty"}
                  value={selectedToolId}
                  onValueChange={(val) => { setSelectedToolId(val); setSelectedTag(""); }}
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

              {/* Tag Selection for tools with multiple tags */}
              {selectedToolId && hasMultipleTags ? (
                <div className="space-y-2">
                  <Label>Selecione a TAG *</Label>
                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione qual TAG está retirando" />
                    </SelectTrigger>
                    <SelectContent>
                      {toolTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          TAG {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="construction_site">Obra de Destino *</Label>
                  <Select value={constructionSite} onValueChange={setConstructionSite}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a obra" />
                    </SelectTrigger>
                    <SelectContent>
                      {constructionSites?.map((site) => (
                        <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
                      ))}
                      <SelectItem value="__custom__">Outra (digitar)</SelectItem>
                    </SelectContent>
                  </Select>
                  {constructionSite === "__custom__" && (
                    <Input
                      placeholder="Digite o nome da obra..."
                      value={customConstructionSite}
                      onChange={(e) => setCustomConstructionSite(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              )}

              {/* Show construction site in its own row if tag selection is visible */}
              {selectedToolId && hasMultipleTags && (
                <div className="space-y-2">
                  <Label htmlFor="construction_site">Obra de Destino *</Label>
                  <Select value={constructionSite} onValueChange={setConstructionSite}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a obra" />
                    </SelectTrigger>
                    <SelectContent>
                      {constructionSites?.map((site) => (
                        <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
                      ))}
                      <SelectItem value="__custom__">Outra (digitar)</SelectItem>
                    </SelectContent>
                  </Select>
                  {constructionSite === "__custom__" && (
                    <Input
                      placeholder="Digite o nome da obra..."
                      value={customConstructionSite}
                      onChange={(e) => setCustomConstructionSite(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              )}

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
                <p className="text-xs text-muted-foreground">
                  Informe até quando você planeja usar a ferramenta
                </p>
              </div>
            </div>

            {/* Full-width fields */}
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

            {/* Photo Capture */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Foto da Ferramenta (opcional)</Label>
                {photoConfirmed && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Capturada
                  </Badge>
                )}
              </div>
              {!photoConfirmed ? (
                <PhotoCapture onCapture={handlePhotoCapture} title="Registrar estado da ferramenta" />
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
                disabled={loading || !selectedToolId || (hasMultipleTags && !selectedTag) || (!constructionSite || (constructionSite === "__custom__" && !customConstructionSite.trim())) || !estimatedReturnDate} 
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Saída
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
