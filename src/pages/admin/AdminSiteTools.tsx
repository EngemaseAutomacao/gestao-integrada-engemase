import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Package, User, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SiteWithTools {
  id: string;
  name: string;
  active: boolean;
  client_name: string | null;
  tools: {
    id: string;
    tool_name: string;
    user_name: string;
    checkout_date: string;
    status: string;
  }[];
}

export default function AdminSiteTools() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: sitesWithTools, isLoading } = useQuery({
    queryKey: ["admin-site-tools"],
    queryFn: async () => {
      // 1. Get all construction sites and their clients
      const { data: sitesData, error: sitesError } = await supabase
        .from("construction_sites")
        .select(`
          id,
          name,
          active,
          clients (name)
        `)
        .order("name");

      if (sitesError) throw sitesError;

      // 2. Get all active tool checkouts
      const { data: checkoutsData, error: checkoutsError } = await supabase
        .from("tool_checkouts")
        .select(`
          id,
          construction_site,
          checkout_date,
          status,
          tools (name),
          profiles!tool_checkouts_user_id_fkey (full_name)
        `)
        .eq("status", "checked_out");

      if (checkoutsError) throw checkoutsError;

      // 3. Group tools by site
      return (sitesData || []).map(site => {
        const siteTools = (checkoutsData || [])
          .filter(c => c.construction_site === site.name)
          .map(c => ({
            id: c.id,
            tool_name: c.tools?.name || "Desconhecido",
            user_name: c.profiles?.full_name || "Desconhecido",
            checkout_date: c.checkout_date,
            status: c.status
          }));

        return {
          id: site.id,
          name: site.name,
          active: site.active,
          client_name: site.clients?.name || null,
          tools: siteTools
        };
      }) as SiteWithTools[];
    }
  });

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const filteredSites = sitesWithTools?.filter(site => 
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.tools.some(t => t.tool_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h2 className="text-3xl font-bold tracking-tight">Ferramentas por Obra</h2>
        <p className="text-muted-foreground">Localização atual de todas as ferramentas em obras e clientes</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por obra, cliente ou ferramenta..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredSites?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma obra ou ferramenta encontrada com os filtros atuais.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSites?.map((site) => (
            <Card key={site.id} className={!site.active ? "opacity-60" : ""}>
              <CardHeader className="pb-3 border-b bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary shrink-0" />
                      <span className="truncate">{site.name}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <User className="w-3.5 h-3.5" />
                      {site.client_name || "Sem cliente vinculado"}
                    </CardDescription>
                  </div>
                  <Badge variant={site.active ? "default" : "secondary"}>
                    {site.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Ferramentas no Local</span>
                    <Badge variant="outline">{site.tools.length}</Badge>
                  </div>
                  
                  {site.tools.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-2">
                      Nenhuma ferramenta vinculada a esta obra no momento.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {site.tools.map((tool) => (
                        <div key={tool.id} className="text-sm p-2 rounded-md bg-muted/50 border border-border/50">
                          <div className="flex items-center gap-2 font-medium">
                            <Package className="w-3.5 h-3.5 text-primary" />
                            {tool.tool_name}
                          </div>
                          <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" /> {tool.user_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {format(new Date(tool.checkout_date), "dd/MM/yy")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
