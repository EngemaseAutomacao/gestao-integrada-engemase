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
import { Package, Search, ExternalLink, Filter, X, CheckSquare, Square, ShoppingCart } from "lucide-react";
import { SignedImage } from "@/components/SignedImage";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ListSkeleton } from "@/components/PageSkeleton";
import { cn } from "@/lib/utils";

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
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    if (!isOnline) {
      if (cachedTools && cachedTools.length > 0) {
        const filteredTools = cachedTools.filter(tool => {
          if (profile?.category === "third_party" && tool.employee_only) return false;
          return true;
        });
        setTools(filteredTools);
        toast.info("Modo offline - usando dados em cache");
      }
      setLoading(false);
      return;
    }

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
      saveToCache(data || []);
    } catch (error: any) {
      if (cachedTools && cachedTools.length > 0) {
        const filteredTools = cachedTools.filter(tool => {
          if (profile?.category === "third_party" && tool.employee_only) return false;
          return true;
        });
        setTools(filteredTools);
        toast.info("Usando dados em cache");
      } else {
        toast.error("Erro ao carregar ferramentas", { description: error.message });
      }
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

  const toggleToolSelection = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId) 
        : [...prev, toolId]
    );
  };

  const handleMultiCheckout = () => {
    if (selectedTools.length === 0) return;
    const toolIds = selectedTools.join(",");
    navigate(`/ferramentas/retirada-multipla?ids=${toolIds}`);
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
    return <ListSkeleton />;
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 sm:gap-6">
      <div className="shrink-0 hidden sm:block">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Catálogo de Ferramentas</h2>
        <p className="text-sm text-muted-foreground">Visualize todas as ferramentas disponíveis</p>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Ferramentas Disponíveis</CardTitle>
          <CardDescription>
            Total: {tools.length} ferramentas | Mostrando: {filteredTools.length} | Disponíveis: {filteredTools.reduce((acc, tool) => acc + tool.quantity_available, 0)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="flex gap-2 shrink-0">
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
              variant={selectionMode ? "default" : "outline"}
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) setSelectedTools([]);
              }}
              className="relative gap-2"
              title="Seleção Múltipla"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Selecionar Vários</span>
              {selectedTools.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] flex items-center justify-center rounded-full font-bold">
                  {selectedTools.length}
                </span>
              )}
            </Button>
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

          {selectionMode && selectedTools.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-medium">
                {selectedTools.length} {selectedTools.length === 1 ? "item selecionado" : "itens selecionados"}
              </span>
              <Button size="sm" onClick={handleMultiCheckout} className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                Retirar Selecionados
              </Button>
            </div>
          )}

          {filteredTools.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma ferramenta encontrada
            </p>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 content-start pr-1">
              {filteredTools.map((tool) => {
                const isSelected = selectedTools.includes(tool.id);
                const isAvailable = tool.quantity_available > 0;

                return (
                  <Card 
                    key={tool.id} 
                    className={cn(
                      "transition-all duration-200 relative", 
                      isSelected ? "border-primary ring-1 ring-primary shadow-md" : "hover:bg-accent/50",
                      selectionMode && isAvailable ? "cursor-pointer" : ""
                    )}
                    onClick={() => {
                      if (selectionMode && isAvailable) {
                        toggleToolSelection(tool.id);
                      }
                    }}
                  >
                    <CardContent className="p-4 relative">
                      {selectionMode && isAvailable && (
                        <div className="absolute top-3 right-3 z-10">
                          <div className={cn(
                            "w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center",
                            isSelected 
                              ? "bg-primary border-primary shadow-sm" 
                              : "border-muted-foreground/30 bg-background"
                          )}>
                            {isSelected && (
                              <CheckSquare className="w-4 h-4 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                      )}
                      <div className="space-y-3">
                        {tool.image_url && (
                          tool.image_url.startsWith("http") ? (
                            <img 
                              src={tool.image_url} 
                              alt={tool.name}
                              className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={(e) => {
                                if (selectionMode) {
                                  e.stopPropagation();
                                  toggleToolSelection(tool.id);
                                } else {
                                  setEnlargedImage(tool.image_url);
                                }
                              }}
                            />
                          ) : (
                            <SignedImage
                              storagePath={tool.image_url}
                              alt={tool.name}
                              className="w-full h-48 object-cover rounded-lg"
                            />
                          )
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
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/ferramentas/${tool.id}`);
                              }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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