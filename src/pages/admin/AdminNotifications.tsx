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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
              <li>• Verifica a cada execução</li>
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

        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-green-500" />
              Checkout/Checkin Ferramentas
            </CardTitle>
            <CardDescription>
              Notificação automática em tempo real via trigger
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Admins notificados em cada retirada</li>
              <li>• Admins notificados em cada devolução</li>
              <li>• Usuário recebe confirmação</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              Checkout/Checkin Veículos
            </CardTitle>
            <CardDescription>
              Notificação automática em tempo real via trigger
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Admins notificados em cada retirada</li>
              <li>• Admins notificados em cada devolução</li>
              <li>• Usuário recebe confirmação</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Problemas Reportados
            </CardTitle>
            <CardDescription>
              Admins notificados quando problemas são reportados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Notificação imediata ao admin</li>
              <li>• Inclui severidade do problema</li>
              <li>• Link para a ferramenta afetada</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-500" />
              Novo Usuário
            </CardTitle>
            <CardDescription>
              Admins notificados quando usuário se registra
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Notificação imediata ao admin</li>
              <li>• Usuário aguardando aprovação</li>
              <li>• Inclui nome do usuário</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Ferramenta em Atraso (Usuário)
            </CardTitle>
            <CardDescription>
              Lembrete diário ao usuário com ferramenta atrasada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Notificação diária ao usuário</li>
              <li>• Informa quantos dias de atraso</li>
              <li>• Incentiva a devolução</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" />
              Conta Aprovada
            </CardTitle>
            <CardDescription>
              Usuário notificado quando sua conta é aprovada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Notificação imediata (trigger)</li>
              <li>• Informa que já pode usar o sistema</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-cyan-500" />
              Problema Resolvido
            </CardTitle>
            <CardDescription>
              Usuário notificado quando seu problema é resolvido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Notificação imediata (trigger)</li>
              <li>• Inclui notas de resolução</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-rose-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-500" />
              Veículo em Uso Prolongado
            </CardTitle>
            <CardDescription>
              Lembrete ao usuário após 24h com veículo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Após 24h sem devolução</li>
              <li>• Lembrete diário ao usuário</li>
              <li>• Informa horas de uso</li>
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

      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-500" />
            Automatização Ativa
          </CardTitle>
          <CardDescription>
            As verificações periódicas são executadas automaticamente a cada hora
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Ferramentas atrasadas (admin + usuário)</li>
            <li>• Estoque baixo (admin)</li>
            <li>• Lembretes de devolução (usuário)</li>
            <li>• Manutenção preventiva (admin)</li>
            <li>• Veículos em uso prolongado (usuário)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}