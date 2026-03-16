import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Loader2, AlertCircle, Package, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminNotifications() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/" />;
  }

  const runNotificationChecks = async () => {
    setLoading(true);
    try {
      
      
      const { data, error } = await supabase.functions.invoke('check-notifications', {
        body: {},
      });

      if (error) throw error;

      
      toast.success("Verificação concluída!", {
        description: "As notificações foram verificadas e criadas com sucesso.",
      });
    } catch (error: any) {
      console.error("Error running notification checks:", error);
      toast.error("Erro ao verificar notificações", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Sistema de Notificações</h2>
        <p className="text-muted-foreground">Gerencie e teste o sistema de notificações automáticas</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Este sistema verifica automaticamente ferramentas atrasadas, estoque baixo e envia lembretes de devolução.
          As verificações são executadas automaticamente, mas você pode testá-las manualmente aqui.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Ferramentas Atrasadas
            </CardTitle>
            <CardDescription>
              Notifica usuários quando ferramentas não são devolvidas na data prevista
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Verifica a cada verificação</li>
              <li>• Notifica apenas uma vez por dia</li>
              <li>• Baseado na data de devolução estimada</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-warning" />
              Estoque Baixo
            </CardTitle>
            <CardDescription>
              Alerta administradores quando ferramentas estão com estoque crítico
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Quantidade disponível ≤ 2</li>
              <li>• Ou menos de 30% do total</li>
              <li>• Notifica a cada 7 dias</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Lembretes de Devolução
            </CardTitle>
            <CardDescription>
              Lembra usuários de devolver ferramentas próximo à data prevista
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• 3 dias antes da devolução</li>
              <li>• Notifica apenas uma vez por dia</li>
              <li>• Ajuda a evitar atrasos</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executar Verificação Manual</CardTitle>
          <CardDescription>
            Clique no botão abaixo para executar todas as verificações de notificações manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runNotificationChecks} 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Bell className="mr-2 h-4 w-4" />
            {loading ? "Verificando..." : "Executar Verificações"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automatização (Opcional)</CardTitle>
          <CardDescription>
            Para executar as verificações automaticamente a cada hora, você pode configurar um cron job
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Configuração via SQL (Supabase)</p>
              <p className="text-sm mb-2">Execute este comando SQL no painel do Supabase para configurar verificações automáticas a cada hora:</p>
              <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar verificação a cada hora
SELECT cron.schedule(
  'check-notifications-hourly',
  '0 * * * *', -- A cada hora
  $$
  SELECT net.http_post(
    url:='https://ivkqzjwzdaneylitrsgt.supabase.co/functions/v1/check-notifications',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);`}
              </pre>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}