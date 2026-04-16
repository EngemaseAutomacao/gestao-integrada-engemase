import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { uploadDataUrlImage } from "@/lib/storageUtils";
import { compressDataUrl } from "@/lib/imageCompression";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { PhotoCapture } from "@/components/PhotoCapture";

interface Tool {
  id: string;
  name: string;
}

export default function ReportIssue() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);

  const [formData, setFormData] = useState({
    toolId: searchParams.get("toolId") || "",
    checkoutId: searchParams.get("checkoutId") || "",
    title: "",
    description: "",
    severity: "medium" as "low" | "medium" | "high" | "critical",
  });

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const { data, error } = await supabase
        .from("tools")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setTools(data || []);
    } catch (error) {
      console.error("Error loading tools:", error);
      toast.error("Erro ao carregar ferramentas");
    } finally {
      setLoadingData(false);
    }
  };

  const handlePhotoCapture = (dataUrl: string) => {
    setPhotoDataUrl(dataUrl);
    setPhotoConfirmed(true);
    toast.success("Foto capturada!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.toolId || !formData.title || !formData.description) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      let photoUrl: string | null = null;
      if (photoDataUrl) {
        const compressed = await compressDataUrl(photoDataUrl);
        photoUrl = await uploadDataUrlImage(compressed, "photo", "ferramentas", "problemas");
      }

      const issueData: any = {
        tool_id: formData.toolId,
        reported_by: user?.id,
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        status: "open",
        photo_url: photoUrl,
      };

      if (formData.checkoutId) {
        issueData.checkout_id = formData.checkoutId;
      }

      const { error } = await supabase
        .from("tool_issues")
        .insert(issueData);

      if (error) throw error;

      toast.success("Problema reportado com sucesso!");
      navigate(-1);
    } catch (error) {
      console.error("Error reporting issue:", error);
      toast.error("Erro ao reportar problema");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Reportar Problema</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="toolId">Ferramenta *</Label>
              <Select
                value={formData.toolId}
                onValueChange={(value) => setFormData({ ...formData, toolId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a ferramenta" />
                </SelectTrigger>
                <SelectContent>
                  {tools.map((tool) => (
                    <SelectItem key={tool.id} value={tool.id}>
                      {tool.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Gravidade *</Label>
              <Select
                value={formData.severity}
                onValueChange={(value: any) => setFormData({ ...formData, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título do Problema *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Broca danificada"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o problema em detalhes..."
                rows={5}
                required
              />
            </div>

            {/* Photo Capture */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Foto do Problema (opcional)</Label>
                {photoConfirmed && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Capturada
                  </Badge>
                )}
              </div>
              {!photoConfirmed ? (
                <PhotoCapture onCapture={handlePhotoCapture} title="Registrar evidência do problema" />
              ) : (
                <div className="relative">
                  <img src={photoDataUrl!} alt="Foto do problema" className="w-full h-48 object-cover rounded-lg" />
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

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Reportando..." : "Reportar Problema"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
