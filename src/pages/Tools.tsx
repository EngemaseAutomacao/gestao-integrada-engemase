import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/contexts/OfflineContext";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Search, ExternalLink, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  tag: string | null;
  brand: string | null;
  condition: string | null;
  quantity_available: number;
  quantity_total: number;
  employee_only: boolean;
  image_url: string | null;
}

const conditionLabels: Record<string, string> = {
  excellent: "Excelente",
  good: "Bom",
  fair: "Regular",
  poor: "Ruim",
  needs_maintenance: "Precisa Manutenção",
};

export default function Tools() {
  const { profile } = useAuth();
  const { isOnline } = useOffline();
  const { data: cachedTools, saveToCache } = useOfflineStorage<Tool[]>("catalog_tools", []);
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>(cachedTools || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

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

  const brands = useMemo(() => {
    const uniqueBrands = [...new Set(tools.map(t => t.brand).filter(Boolean))] as string[];
    return uniqueBrands.sort();
  }, [tools]);

  const conditions = useMemo(() => {
    const uniqueConditions = [...new Set(tools.map(t => t.condition).filter(Boolean))] as string[];
    return uniqueConditions.sort();
  }, [tools]);

  const hasActiveFilters = brandFilter !== "all" || conditionFilter !== "all" || availabilityFilter !== "all" || categoryFilter !== "all";

  const clearFilters = () => {
    setBrandFilter("all");
    setConditionFilter("all");
    setAvailabilityFilter("all");
    setCategoryFilter("all");
  };

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.brand?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBrand = brandFilter === "all" || tool.brand === brandFilter;
    const matchesCondition = conditionFilter === "all" || tool.condition === conditionFilter;
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && tool.quantity_available > 0) ||
      (availabilityFilter === "unavailable" && tool.quantity_available === 0);
    const matchesCategory =
      categoryFilter === "all" ||
      (categoryFilter === "employee_only" && tool.employee_only) ||
      (categoryFilter === "all_users" && !tool.employee_only);

    return matchesSearch && matchesBrand && matchesCondition && matchesAvailability && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Package className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Catálogo de Ferramentas</h2>
        <p className="text-sm text-muted-foreground">Visualize todas as ferramentas disponíveis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ferramentas Disponíveis</CardTitle>
          <CardDescription>
            Total: {tools.length} ferramentas | Mostrando: {filteredTools.length} | Disponíveis: {filteredTools.reduce((acc, tool) => acc + tool.quantity_available, 0)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, descrição, TAG ou marca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Marca</label>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as marcas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as marcas</SelectItem>
                    {brands.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Condição</label>
                <Select value={conditionFilter} onValueChange={setConditionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as condições" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as condições</SelectItem>
                    {conditions.map(condition => (
                      <SelectItem key={condition} value={condition}>
                        {conditionLabels[condition] || condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Disponibilidade</label>
                <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="unavailable">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Acesso</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="employee_only">Apenas Funcionários</SelectItem>
                    <SelectItem value="all_users">Todos os Usuários</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
                    <X className="w-3 h-3" />
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          )}

          {filteredTools.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma ferramenta encontrada
            </p>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
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
                          <h3 className="font-semibold text-lg capitalize">{tool.name.toLowerCase()}</h3>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {tool.tag && (
                              <p>TAG: {tool.tag}</p>
                            )}
                            {tool.brand && (
                              <p>Marca: {tool.brand}</p>
                            )}
                            {tool.condition && (
                              <p>Condição: {conditionLabels[tool.condition] || tool.condition}</p>
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