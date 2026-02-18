import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  tag: string | null;
  brand: string | null;
  quantity_available: number;
  quantity_total: number;
  employee_only: boolean;
  image_url: string | null;
}

export default function Tools() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const { data, error } = await supabase
        .from("tools")
        .select("*")
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
      setLoading(false);
    }
  };

  const filteredTools = tools.filter((tool) =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Package className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Catálogo de Ferramentas</h2>
        <p className="text-muted-foreground">Visualize todas as ferramentas disponíveis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ferramentas Disponíveis</CardTitle>
          <CardDescription>
            Total: {tools.length} ferramentas | Disponíveis: {tools.reduce((acc, tool) => acc + tool.quantity_available, 0)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, descrição, TAG ou marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredTools.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma ferramenta encontrada
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredTools.map((tool) => (
                <Card key={tool.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {tool.image_url && (
                        <img 
                          src={tool.image_url} 
                          alt={tool.name}
                          className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setEnlargedImage(tool.image_url)}
                        />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{tool.name}</h3>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {tool.tag && (
                              <p>TAG: {tool.tag}</p>
                            )}
                            {tool.brand && (
                              <p>Marca: {tool.brand}</p>
                            )}
                          </div>
                        </div>
                        <Package className="w-5 h-5 text-primary shrink-0" />
                      </div>

                      {tool.description && (
                        <p className="text-sm text-muted-foreground">
                          {tool.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={tool.quantity_available > 0 ? "default" : "destructive"}
                            className={tool.quantity_available > 0 ? "bg-success" : ""}
                          >
                            {tool.quantity_available > 0 ? "Disponível" : "Indisponível"}
                          </Badge>
                          {tool.employee_only && (
                            <Badge variant="outline" className="text-xs">
                              Apenas Funcionários
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {tool.quantity_available}/{tool.quantity_total}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/tools/${tool.id}`)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto da ferramenta</DialogTitle>
          </DialogHeader>
          {enlargedImage && (
            <img
              src={enlargedImage}
              alt="Foto ampliada"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
