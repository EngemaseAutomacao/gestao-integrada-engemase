import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Rocket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { profile } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Projeto</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {profile?.full_name?.split(' ')[0] || 'usuário'}! Seu projeto em branco está pronto para ser construído.
          </p>
        </div>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Comece por aqui</CardTitle>
            <CardDescription>
              Adicione novos componentes, páginas ou funcionalidades.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button className="w-full gap-2">
              <PlusCircle className="w-4 h-4" />
              Criar Primeira Funcionalidade
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          O sistema de autenticação e banco de dados já estão configurados.
        </p>
      </div>
    </div>
  );
}
