import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ConstructionSiteAutocomplete } from "@/components/ConstructionSiteAutocomplete";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CheckCircle, CheckSquare, X } from "lucide-react";
import { PhotoCapture } from "@/components/PhotoCapture";
import { Badge } from "@/components/ui/badge";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  quantity_available: number;
  employee_only: boolean;
  tag: string | null;
}

interface BulkSelection {
  selectedTag?: string;
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { isOnline, addPendingOperation } = useOffline();
  const { data: cachedTools, saveToCache } = useOfflineStorage<Tool[]>("tools", []);
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>(cachedTools || []);
  const toolIdFromParam = searchParams.get("toolId") || "";
  const [selectedToolId, setSelectedToolId] = useState<string>(toolIdFromParam);
  const isToolLocked = !!toolIdFromParam;
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [constructionSite, setConstructionSite] = useState("");
  const [estimatedReturnDate, setEstimatedReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTools, setLoadingTools] = useState(true);

  // Bulk mode
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelections, setBulkSelections] = useState<Map<string, BulkSelection>>(new Map());
  const [bulkActiveTags, setBulkActiveTags] = useState<Record<string, string[]>>({});
  const [bulkSearch, setBulkSearch] = useState("");

  // Photo state
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);

  const selectedTool = tools.find(t => t.id === selectedToolId);
  const allToolTags = selectedTool?.tag ? selectedTool.tag.split(",").map(t => t.trim()).filter(Boolean) : [];
  const toolTags = allToolTags.filter(t => !activeTags.includes(t));
  const hasMultipleTags = allToolTags.length > 1;

  const { data: constructionSites } = useActiveConstructionSites();

  const hasUnsavedData = !!(constructionSite || notes || estimatedReturnDate || photoConfirmed || bulkSelections.size > 0);
  useUnsavedChanges(hasUnsavedData);

  useEffect(() => {
    loadTools();
  }, []);

  // Carrega TAGs já retiradas (modo único)
  useEffect(() => {
    if (!selectedToolId || !isOnline || bulkMode) {
      setActiveTags([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("tool_checkouts")
        .select("selected_tag")
        .eq("tool_id", selectedToolId)
        .eq("status", "checked_out");
      if (error) { setActiveTags([]); return; }
      const inUse = (data || []).map((r: any) => (r.selected_tag || "").trim()).filter(Boolean);
      setActiveTags(inUse);
    })();
  }, [selectedToolId, isOnline, bulkMode]);

  // Carrega TAGs já retiradas para todas as ferramentas com múltiplas tags (modo bulk)
  useEffect(() => {
    if (!bulkMode || !isOnline) return;
    const multiTagToolIds = tools.filter(t => (t.tag || "").split(",").map(s => s.trim()).filter(Boolean).length > 1).map(t => t.id);
    if (multiTagToolIds.length === 0) return;
    (async () => {
      const { data, error } = await supabase
        .from("tool_checkouts")
        .select("tool_id, selected_tag")
        .in("tool_id", multiTagToolIds)
        .eq("status", "checked_out");
      if (error) return;
      const map: Record<string, string[]> = {};
      (data || []).forEach((r: any) => {
        const t = (r.selected_tag || "").trim();
        if (!t) return;
        map[r.tool_id] = [...(map[r.tool_id] || []), t];
      });
      setBulkActiveTags(map);
    })();
  }, [bulkMode, isOnline, tools]);

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
        if (profile?.category === "third_party" && tool.employee_only) return false;
        return true;
      }) || [];
      setTools(filteredTools);
      saveToCache(filteredTools);
    } catch (error: any) {
      toast.error("Erro ao carregar ferramentas", { description: error.message });
    } finally {
      setLoadingTools(false);
    }
  };

  const uploadImage = async (dataUrl: string, type: "photo" | "signature"): Promise<string | null> => {
    const compressed = await compressDataUrl(dataUrl);
    return uploadDataUrlImage(compressed, type, "ferramentas", "saidas");
  };

  // Bulk helpers
  const toggleBulkTool = (toolId: string) => {
    setBulkSelections(prev => {
      const next = new Map(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.set(toolId, {});
      return next;
    });
  };

  const setBulkToolTag = (toolId: string, tag: string) => {
    setBulkSelections(prev => {
      const next = new Map(prev);
      next.set(toolId, { selectedTag: tag });
      return next;
    });
  };

  const filteredTools = useMemo(() => {
    const q = bulkSearch.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(t => t.name.toLowerCase().includes(q) || (t.tag || "").toLowerCase().includes(q));
  }, [tools, bulkSearch]);

  const enterBulkMode = () => {
    setBulkMode(true);
    setSelectedToolId("");
    setSelectedTag("");
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setBulkSelections(new Map());
    setBulkSearch("");
  };

  const handleBulkCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkSelections.size === 0) { toast.error("Selecione ao menos uma ferramenta"); return; }
    const finalSite = constructionSite.trim();
    if (!finalSite) { toast.error("Informe a obra de destino"); return; }
    if (!estimatedReturnDate) { toast.error("Informe a data estimada de devolução"); return; }

    // Validate multi-tag tools
    for (const [toolId, sel] of bulkSelections) {
      const tool = tools.find(t => t.id === toolId);
      if (!tool) continue;
      const tags = (tool.tag || "").split(",").map(s => s.trim()).filter(Boolean);
      if (tags.length > 1) {
        if (!sel.selectedTag) {
          toast.error(`Selecione a TAG da ferramenta "${tool.name}"`);
          return;
        }
        if ((bulkActiveTags[toolId] || []).includes(sel.selectedTag)) {
          toast.error(`A TAG ${sel.selectedTag} de "${tool.name}" já está em uso`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      let photoUrl: string | null = null;
      if (photoDataUrl) photoUrl = await uploadImage(photoDataUrl, "photo");

      const rows = Array.from(bulkSelections.entries()).map(([toolId, sel]) => {
        const tool = tools.find(t => t.id === toolId)!;
        const tags = (tool.tag || "").split(",").map(s => s.trim()).filter(Boolean);
        return {
          tool_id: toolId,
          user_id: profile!.id,
          checked_out_by: profile!.id,
          status: "checked_out" as const,
          construction_site: finalSite,
          estimated_return_date: new Date(estimatedReturnDate).toISOString(),
          notes: notes.trim() || null,
          checkout_photo_url: photoUrl,
          selected_tag: tags.length > 1 ? (sel.selectedTag || null) : (tags.length === 1 ? tags[0] : null),
        };
      });

      if (!isOnline) {
        rows.forEach(r => addPendingOperation("checkout", r));
        toast.success(`${rows.length} ferramenta(s) retirada(s) (offline)! Sincronizando ao conectar.`);
        navigate("/ferramentas");
        return;
      }

      const { error } = await supabase.from("tool_checkouts").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} ferramenta(s) retirada(s) com sucesso!`);
      navigate("/ferramentas");
    } catch (error: any) {
      toast.error("Erro ao retirar ferramentas", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToolId) { toast.error("Selecione uma ferramenta"); return; }
    if (hasMultipleTags && !selectedTag) { toast.error("Selecione qual TAG você está retirando"); return; }
    if (selectedTag && activeTags.includes(selectedTag)) {
      toast.error("Esta TAG já está em uso", { description: "Selecione outra TAG ou aguarde a devolução." });
      return;
    }
    const finalSite = constructionSite.trim();
    if (!finalSite) { toast.error("Informe a obra de destino"); return; }
    if (!estimatedReturnDate) { toast.error("Informe a data estimada de devolução"); return; }

    setLoading(true);
    try {
      let photoUrl: string | null = null;
      if (photoDataUrl) photoUrl = await uploadImage(photoDataUrl, "photo");

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

      const { error } = await supabase.from("tool_checkouts").insert(checkoutData);
      if (error) throw error;
      toast.success("Ferramenta retirada com sucesso!");
      navigate("/ferramentas");
    } catch (error: any) {
      toast.error("Erro ao retirar ferramenta", { description: error.message });
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>Registrar Saída</CardTitle>
              <CardDescription>
                {bulkMode ? "Selecione várias ferramentas para retirar de uma vez" : "Registre a saída de uma ferramenta"}
              </CardDescription>
            </div>
            {bulkMode ? (
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={exitBulkMode}>
                <X className="w-4 h-4" /> Sair do modo múltiplo
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={enterBulkMode}>
                <CheckSquare className="w-4 h-4" /> Selecionar várias
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {bulkMode ? (
            <form onSubmit={handleBulkCheckout} className="space-y-6">
              <div className="space-y-2">
                <Label>Ferramentas * ({bulkSelections.size} selecionada{bulkSelections.size === 1 ? "" : "s"})</Label>
                <Input
                  placeholder="Buscar por nome ou TAG..."
                  value={bulkSearch}
                  onChange={(e) => setBulkSearch(e.target.value)}
                />
                <div className="border rounded-md max-h-[360px] overflow-y-auto divide-y">
                  {filteredTools.length === 0 && (
                    <p className="text-sm text-muted-foreground p-3">Nenhuma ferramenta encontrada.</p>
                  )}
                  {filteredTools.map((tool) => {
                    const isSelected = bulkSelections.has(tool.id);
                    const tags = (tool.tag || "").split(",").map(s => s.trim()).filter(Boolean);
                    const activeForTool = bulkActiveTags[tool.id] || [];
                    const availableTags = tags.filter(t => !activeForTool.includes(t));
                    const sel = bulkSelections.get(tool.id);
                    return (
                      <div key={tool.id} className="flex flex-col gap-2 p-2 sm:p-3 hover:bg-muted/40">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleBulkTool(tool.id)} className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{tool.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Disponível: {tool.quantity_available}
                              {tags.length > 0 && ` · TAGs: ${tags.join(", ")}`}
                            </p>
                          </div>
                        </label>
                        {isSelected && tags.length > 1 && (
                          <div className="pl-8">
                            <Select
                              value={sel?.selectedTag || ""}
                              onValueChange={(v) => setBulkToolTag(tool.id, v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={availableTags.length === 0 ? "Todas as TAGs em uso" : "Selecione a TAG"} />
                              </SelectTrigger>
                              <SelectContent>
                                {availableTags.map((t) => (
                                  <SelectItem key={t} value={t}>TAG {t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="construction_site_bulk">Obra de Destino *</Label>
                  <ConstructionSiteAutocomplete
                    sites={constructionSites || []}
                    value={constructionSite}
                    onChange={setConstructionSite}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_return_bulk">Previsão de Devolução *</Label>
                  <input
                    id="estimated_return_bulk"
                    type="datetime-local"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={estimatedReturnDate}
                    onChange={(e) => setEstimatedReturnDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes_bulk">Observações (opcional)</Label>
                <Textarea
                  id="notes_bulk"
                  placeholder="Observação aplicada a todas as retiradas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Foto (opcional, aplicada a todas)</Label>
                  {photoConfirmed && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="w-3 h-3" /> Capturada
                    </Badge>
                  )}
                </div>
                {!photoConfirmed ? (
                  <PhotoCapture onCapture={handlePhotoCapture} title="Registrar estado das ferramentas" />
                ) : (
                  <div className="relative">
                    <img src={photoDataUrl!} alt="Foto capturada" className="w-full h-48 object-cover rounded-lg" />
                    <Button type="button" variant="outline" size="sm" className="absolute top-2 right-2"
                      onClick={() => { setPhotoConfirmed(false); setPhotoDataUrl(null); }}>
                      Refazer
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading || bulkSelections.size === 0 || !constructionSite.trim() || !estimatedReturnDate} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Saída de {bulkSelections.size || ""} {bulkSelections.size === 1 ? "Ferramenta" : "Ferramentas"}
                </Button>
                <Button type="button" variant="outline" onClick={exitBulkMode}>Cancelar</Button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleCheckout} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="tool">Ferramenta *</Label>
                <Select
                  key={selectedToolId || "empty"}
                  value={selectedToolId}
                  onValueChange={(val) => { setSelectedToolId(val); setSelectedTag(""); }}
                  disabled={loadingTools || isToolLocked}
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

              {selectedToolId && hasMultipleTags ? (
                <div className="space-y-2">
                  <Label>Selecione a TAG *</Label>
                  <Select value={selectedTag} onValueChange={setSelectedTag} disabled={toolTags.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={toolTags.length === 0 ? "Todas as TAGs estão em uso" : "Selecione qual TAG está retirando"} />
                    </SelectTrigger>
                    <SelectContent>
                      {toolTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>TAG {tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeTags.length > 0 && (
                    <p className="text-xs text-muted-foreground">TAGs já retiradas: {activeTags.join(", ")}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="construction_site">Obra de Destino *</Label>
                  <ConstructionSiteAutocomplete sites={constructionSites || []} value={constructionSite} onChange={setConstructionSite} />
                </div>
              )}

              {selectedToolId && hasMultipleTags && (
                <div className="space-y-2">
                  <Label htmlFor="construction_site">Obra de Destino *</Label>
                  <ConstructionSiteAutocomplete sites={constructionSites || []} value={constructionSite} onChange={setConstructionSite} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="estimated_return">Previsão de Devolução *</Label>
                <input
                  id="estimated_return"
                  type="datetime-local"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={estimatedReturnDate}
                  onChange={(e) => setEstimatedReturnDate(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Informe até quando você planeja usar a ferramenta</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea id="notes" placeholder="Adicione observações sobre o uso..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Foto da Ferramenta (opcional)</Label>
                {photoConfirmed && (
                  <Badge variant="secondary" className="gap-1"><CheckCircle className="w-3 h-3" /> Capturada</Badge>
                )}
              </div>
              {!photoConfirmed ? (
                <PhotoCapture onCapture={handlePhotoCapture} title="Registrar estado da ferramenta" />
              ) : (
                <div className="relative">
                  <img src={photoDataUrl!} alt="Foto capturada" className="w-full h-48 object-cover rounded-lg" />
                  <Button type="button" variant="outline" size="sm" className="absolute top-2 right-2"
                    onClick={() => { setPhotoConfirmed(false); setPhotoDataUrl(null); }}>
                    Refazer
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading || !selectedToolId || (hasMultipleTags && !selectedTag) || !constructionSite.trim() || !estimatedReturnDate} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Saída
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/ferramentas")}>Cancelar</Button>
            </div>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
