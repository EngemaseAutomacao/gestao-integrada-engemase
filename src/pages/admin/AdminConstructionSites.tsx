import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { MapPin, Loader2, RefreshCw } from "lucide-react";

interface ConstructionSite {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  created_at: string;
}

export default function AdminConstructionSites() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const { data: sites, isLoading } = useQuery({
    queryKey: ["construction-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("construction_sites")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as ConstructionSite[];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-trello");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro na sincronização");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["construction-sites"] });
      toast.success(`Sincronização concluída! ${data.summary.added} novas, ${data.summary.reactivated} reativadas, ${data.summary.deactivated} desativadas.`);
    },
    onError: (error: Error) => toast.error(`Erro ao sincronizar: ${error.message}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="hidden sm:block">
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Obras</h2>
          <p className="text-muted-foreground">Obras sincronizadas via Trello</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled={syncMutation.isPending}
          onClick={() => syncMutation.mutate()}
        >
          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          Sincronizar Trello
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Obras Cadastradas
          </CardTitle>
          <CardDescription>{sites?.length || 0} obras no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !sites || sites.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma obra cadastrada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{site.address || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={site.active ? "default" : "secondary"}>
                          {site.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
