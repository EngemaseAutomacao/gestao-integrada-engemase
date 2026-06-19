import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { uploadDataUrlImage } from "@/lib/storageUtils";
import { compressDataUrl } from "@/lib/imageCompression";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";


import { PhotoCapture } from "@/components/PhotoCapture";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

interface Checkout {
  id: string;
  tool_id: string;
  user_id: string;
  construction_site: string | null;
  estimated_return_date: string | null;
  selected_tag: string | null;
  tools: {
    name: string;
    tag: string | null;
  };
  profiles?: {
    full_name: string;
  } | null;
}

export default function Checkin() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { isOnline, addPendingOperation } = useOffline();
  const { data: cachedCheckouts, saveToCache } = useOfflineStorage<Checkout[]>("checkouts", []);
  const navigate = useNavigate();
  const [checkouts, setCheckouts] = useState<Checkout[]>(cachedCheckouts || []);
  const [selectedCheckoutId, setSelectedCheckoutId] = useState<string>("");
  const [selectedToolName, setSelectedToolName] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCheckouts, setLoadingCheckouts] = useState(true);
  const toolIdParam = searchParams.get("toolId");
  const checkoutIdParam = searchParams.get("checkoutId");

  // Photo state
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);

  // Warn on unsaved form data
  const hasUnsavedData = !!(notes || photoConfirmed);
  useUnsavedChanges(hasUnsavedData);

  useEffect(() => {
    loadCheckouts();
  }, []);

  const loadCheckouts = async () => {
    try {
      if (!isOnline) {
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
          user_id,
          construction_site,
          estimated_return_date,
          selected_tag,
          tools (name, tag),
          profiles!tool_checkouts_user_id_fkey (full_name)
        `)
        .eq("status", "checked_out")
        .order("checkout_date", { ascending: false });

      if (error) throw error;

      setCheckouts((data as any) || []);
      saveToCache((data as any) || []);

      if (checkoutIdParam && data) {
        const checkout = data.find(c => c.id === checkoutIdParam);
        if (checkout) {
          setSelectedCheckoutId(checkout.id);
          setSelectedToolName(checkout.tools.name);
          setSelectedTag(checkout.selected_tag || "");
          setSelectedSite(checkout.construction_site || "");
        }
      } else if (toolIdParam && data) {
        const checkout = data.find(c => c.tool_id === toolIdParam);
        if (checkout) {
          setSelectedCheckoutId(checkout.id);
          setSelectedToolName(checkout.tools.name);
          setSelectedTag(checkout.selected_tag || "");
          setSelectedSite(checkout.construction_site || "");
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

  const uploadImage = async (dataUrl: string, type: "photo" | "signature"): Promise<string | null> => {
    const compressed = await compressDataUrl(dataUrl);
    return uploadDataUrlImage(compressed, type, "ferramentas", "entradas");
  };

  const selectedCheckout = checkouts.find(c => c.id === selectedCheckoutId);
  const isAdminActingForOther = !!(isAdmin && selectedCheckout && selectedCheckout.user_id !== profile?.id);

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCheckoutId) {
      toast.error("Selecione uma retirada");
      return;
    }

    if (isAdminActingForOther && notes.trim().length < 5) {
      toast.error("Justificativa obrigatória", {
        description: "Informe uma observação (mín. 5 caracteres) ao devolver em nome de outro usuário.",
      });
      return;
    }

    if (isAdminActingForOther) {
      const confirmed = window.confirm(
        `Confirmar devolução de "${selectedCheckout!.tools.name}" em nome de ${selectedCheckout!.profiles?.full_name || "outro usuário"}?`
      );
      if (!confirmed) return;
    }

    setLoading(true);

    try {
      let photoUrl: string | null = null;

      if (photoDataUrl) {
        photoUrl = await uploadImage(photoDataUrl, "photo");
      }

      const checkinData = {
        checkoutId: selectedCheckoutId,
        updates: {
          status: "checked_in" as const,
          checkin_date: new Date().toISOString(),
          checked_in_by: profile!.id,
          notes: notes.trim() ? notes : null,
          checkin_photo_url: photoUrl,
        },
      };

      if (!isOnline) {
        addPendingOperation("checkin", checkinData);
        toast.success("Ferramenta devolvida (offline)! Será sincronizada quando conectar.");
        navigate("/ferramentas");
        return;
      }

      const { error } = await supabase
        .from("tool_checkouts")
        .update(checkinData.updates)
        .eq("id", selectedCheckoutId);

      if (error) throw error;

      toast.success("Ferramenta devolvida com sucesso!");
      navigate("/ferramentas");
    } catch (error: any) {
      toast.error("Erro ao devolver ferramenta", {
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
          <CardTitle>Devolver Ferramenta</CardTitle>
          <CardDescription>Registre a devolução de uma ferramenta</CardDescription>
        </CardHeader>
        <CardContent>
          {checkouts.length === 0 && !loadingCheckouts ? (
            <p className="text-center text-muted-foreground py-8">
              Você não possui ferramentas para devolver
            </p>
          ) : (
            <form onSubmit={handleCheckin} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="checkout">Ferramenta para Devolver *</Label>
                  <Select
                    value={selectedCheckoutId}
                    onValueChange={(id) => {
                      setSelectedCheckoutId(id);
                      const checkout = checkouts.find(c => c.id === id);
                      if (checkout) {
                        setSelectedToolName(checkout.tools.name);
                        setSelectedTag(checkout.selected_tag || "");
                        setSelectedSite(checkout.construction_site || "");
                      }
                    }}
                    disabled={loadingCheckouts}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a ferramenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {checkouts.map((checkout) => (
                        <SelectItem key={checkout.id} value={checkout.id}>
                          {checkout.tools.name}
                          {checkout.selected_tag ? ` (TAG: ${checkout.selected_tag})` : ""}
                          {isAdmin && checkout.profiles?.full_name ? ` — ${checkout.profiles.full_name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Obra de Origem</Label>
                  <Input 
                    value={selectedSite || "Sem obra registrada"} 
                    readOnly 
                    className="bg-muted cursor-default focus-visible:ring-0" 
                  />
                </div>

                <div className="space-y-2">
                  <Label>TAG Identificadora</Label>
                  <Input 
                    value={selectedTag ? `TAG ${selectedTag}` : "Sem TAG"} 
                    readOnly 
                    className="bg-muted cursor-default focus-visible:ring-0" 
                  />
                </div>
              </div>

              {selectedCheckoutId && (
                <div className="bg-muted/50 p-3 rounded-lg flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Item selecionado para devolução</span>
                </div>
              )}

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
                  <PhotoCapture onCapture={handlePhotoCapture} title="Registrar estado da ferramenta na devolução" />
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
                <Button type="button" variant="outline" onClick={() => navigate("/ferramentas")} className="w-full">
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
