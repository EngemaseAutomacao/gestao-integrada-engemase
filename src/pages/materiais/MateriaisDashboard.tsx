import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, History, Package, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface MateriaisCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

function MateriaisCard({ title, description, icon, to }: MateriaisCardProps) {
  return (
    <Link to={to} className="block">
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-primary">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            {icon}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <span className="text-sm font-medium text-primary">Acessar →</span>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function MateriaisDashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold text-foreground">Materiais</h1>
        <p className="text-muted-foreground mt-1">
          Solicite materiais e acompanhe suas requisições
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MateriaisCard
          title="Nova Solicitação"
          description="Criar uma nova requisição de materiais"
          icon={<ClipboardList className="w-7 h-7 text-primary" />}
          to="/materiais/solicitar"
        />
        <MateriaisCard
          title="Minhas Solicitações"
          description="Acompanhe o status das suas requisições"
          icon={<History className="w-7 h-7 text-primary" />}
          to="/materiais/historico"
        />
        {isAdmin && (
          <MateriaisCard
            title="Gerenciar Solicitações"
            description="Aprovar, rejeitar e exportar requisições"
            icon={<Users className="w-7 h-7 text-primary" />}
            to="/materiais/admin"
          />
        )}
      </div>
    </div>
  );
}
