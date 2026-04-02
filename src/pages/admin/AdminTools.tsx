import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ExternalLink, Package, Search, RefreshCw } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  tag: string | null;
  brand: string | null;
  condition: string;
  quantity_available: number;
  quantity_total: number;
  employee_only: boolean;
}

export default function AdminTools() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const loadTools = async () => {
    try {
      const { data, error } = await supabase
        .from("tools")
        .select("*")
        .order("name");

      if (error) throw error;
      setTools(data || []);
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
    tool.tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSyncGoogleSheets = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets");
      if (error) throw error;
      if (data?.success) {
        const s = data.summary;
        toast.success("Sincronização concluída!", {
          description: `${s.added} adicionada(s), ${s.updated} atualizada(s), ${s.deleted} removida(s) de ${s.total_sheet_rows} linhas.`,
        });
        loadTools();
      } else {
        throw new Error(data?.error || "Erro desconhecido");
      }
    } catch (error: any) {
      toast.error("Erro ao sincronizar com Google Sheets", {
        description: error.message,
      });
    } finally {
      setSyncing(false);
    }
  };

  const getConditionLabel = (condition: string) => {
    const map: Record<string, string> = {
      excellent: "Excelente",
      good: "Bom",
      fair: "Regular",
      poor: "Ruim",
      needs_maintenance: "Manutenção",
    };
    return map[condition] || condition;
  };

  const getConditionClass = (condition: string) => {
    const map: Record<string, string> = {
      excellent: "bg-green-500 text-white",
      good: "bg-blue-500 text-white",
      fair: "bg-yellow-500 text-white",
      poor: "bg-orange-500 text-white",
      needs_maintenance: "bg-red-500 text-white",
    };
    return map[condition] || "bg-red-500 text-white";
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 sm:gap-6">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="hidden sm:block">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Gerenciar Ferramentas</h2>
          <p className="text-sm text-muted-foreground">Inventário sincronizado via Google Sheets</p>
        </div>
        
        <Button variant="outline" className="gap-2" onClick={handleSyncGoogleSheets} disabled={syncing}>
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sincronizar Planilha
        </Button>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>Ferramentas Cadastradas</CardTitle>
          <CardDescription>Total: {tools.length} ferramentas</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, TAG, marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>TAG</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Condição</TableHead>
                      <TableHead>Disponível/Total</TableHead>
                      <TableHead>Restrição</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTools.map((tool) => (
                      <TableRow key={tool.id}>
                        <TableCell className="font-medium">{tool.name}</TableCell>
                        <TableCell>{tool.tag || "-"}</TableCell>
                        <TableCell>{tool.brand || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getConditionClass(tool.condition)}>
                            {getConditionLabel(tool.condition)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tool.quantity_available === 0 ? (
                            <Badge variant="destructive">Indisponível</Badge>
                          ) : (
                            <span className="text-success">
                              {tool.quantity_available}/{tool.quantity_total}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tool.employee_only ? (
                            <Badge variant="outline">Apenas Funcionários</Badge>
                          ) : (
                            <Badge variant="secondary">Todos</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/tools/${tool.id}`)}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredTools.map((tool) => (
                  <Card key={tool.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{tool.name}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {tool.tag && <span className="text-xs text-muted-foreground">TAG: {tool.tag}</span>}
                            {tool.brand && <span className="text-xs text-muted-foreground">• {tool.brand}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={`text-xs ${getConditionClass(tool.condition)}`}>
                              {getConditionLabel(tool.condition)}
                            </Badge>
                            {tool.quantity_available === 0 ? (
                              <Badge variant="destructive" className="text-xs">Indisponível</Badge>
                            ) : (
                              <span className="text-xs font-medium text-success">
                                {tool.quantity_available}/{tool.quantity_total}
                              </span>
                            )}
                            {tool.employee_only && (
                              <Badge variant="outline" className="text-xs">Funcionários</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/tools/${tool.id}`)}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
