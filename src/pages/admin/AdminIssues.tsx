import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  tool: {
    name: string;
  };
  reporter: {
    full_name: string;
  };
  resolver: {
    full_name: string;
  } | null;
}

export default function AdminIssues() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    if (profile?.role !== "admin") {
      navigate("/");
      return;
    }
    loadIssues();
  }, [profile, navigate]);

  const loadIssues = async () => {
    try {
      const { data, error } = await supabase
        .from("tool_issues")
        .select(`
          *,
          tool:tools(name),
          reporter:profiles!reported_by(full_name),
          resolver:profiles!resolved_by(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIssues(data as any || []);
    } catch (error) {
      console.error("Error loading issues:", error);
      toast.error("Erro ao carregar problemas");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedIssue) return;

    setResolving(true);
    try {
      const { error } = await supabase
        .from("tool_issues")
        .update({
          status: "resolved",
          resolved_by: profile?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq("id", selectedIssue.id);

      if (error) throw error;

      toast.success("Problema marcado como resolvido!");
      setSelectedIssue(null);
      setResolutionNotes("");
      loadIssues();
    } catch (error) {
      console.error("Error resolving issue:", error);
      toast.error("Erro ao resolver problema");
    } finally {
      setResolving(false);
    }
  };

  const handleUpdateStatus = async (issueId: string, newStatus: "open" | "in_progress" | "resolved" | "closed") => {
    try {
      const { error } = await supabase
        .from("tool_issues")
        .update({ status: newStatus })
        .eq("id", issueId);

      if (error) throw error;

      toast.success("Status atualizado!");
      loadIssues();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      low: { variant: "secondary", label: "Baixa" },
      medium: { variant: "default", label: "Média" },
      high: { variant: "destructive", label: "Alta" },
      critical: { variant: "destructive", label: "Crítica" },
    };
    const config = variants[severity] || variants.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      open: <AlertCircle className="h-4 w-4 text-yellow-500" />,
      in_progress: <Clock className="h-4 w-4 text-blue-500" />,
      resolved: <CheckCircle className="h-4 w-4 text-green-500" />,
      closed: <XCircle className="h-4 w-4 text-gray-500" />,
    };
    return icons[status] || icons.open;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Aberto",
      in_progress: "Em Progresso",
      resolved: "Resolvido",
      closed: "Fechado",
    };
    return labels[status] || status;
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.tool.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || issue.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 p-4">
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader>
          <CardTitle>Gerenciar Problemas Reportados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <Input
                placeholder="Buscar por título, descrição ou ferramenta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gravidade</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredIssues.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum problema encontrado
              </p>
            ) : (
              filteredIssues.map((issue) => (
                <Card key={issue.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(issue.status)}
                          <h3 className="font-semibold">{issue.title}</h3>
                          {getSeverityBadge(issue.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground">{issue.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>Ferramenta: <strong>{issue.tool.name}</strong></span>
                          <span>Reportado por: <strong>{issue.reporter.full_name}</strong></span>
                          <span>Data: {new Date(issue.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        {issue.resolved_at && (
                          <div className="text-sm text-muted-foreground">
                            <span>Resolvido por: <strong>{issue.resolver?.full_name}</strong></span>
                            {issue.resolution_notes && (
                              <p className="mt-1">Notas: {issue.resolution_notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Select
                          value={issue.status}
                          onValueChange={(value) => handleUpdateStatus(issue.id, value as "open" | "in_progress" | "resolved" | "closed")}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Aberto</SelectItem>
                            <SelectItem value="in_progress">Em Progresso</SelectItem>
                            <SelectItem value="resolved">Resolvido</SelectItem>
                            <SelectItem value="closed">Fechado</SelectItem>
                          </SelectContent>
                        </Select>
                        {issue.status !== "resolved" && issue.status !== "closed" && (
                          <Button
                            size="sm"
                            onClick={() => setSelectedIssue(issue)}
                          >
                            Resolver
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Problema</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Problema</Label>
              <p className="text-sm mt-1">{selectedIssue?.title}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolution">Notas de Resolução</Label>
              <Textarea
                id="resolution"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Descreva como o problema foi resolvido..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleResolve} disabled={resolving} className="flex-1">
                {resolving ? "Salvando..." : "Marcar como Resolvido"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedIssue(null)}
                disabled={resolving}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
