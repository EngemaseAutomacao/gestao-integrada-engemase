import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, History, Package, Users, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface MenuCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  badgeCount?: number;
}

function MenuCard({ title, description, icon, to, badgeCount }: MenuCardProps) {
  return (
    <Link to={to} className="block h-full">
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-primary h-full flex flex-col">
        {badgeCount && badgeCount > 0 ? (
          <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center z-10">
            {badgeCount}
          </div>
        ) : null}
        <CardHeader className="text-center pb-2 flex-1 flex flex-col items-center justify-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            {icon}
          </div>
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center pt-0">
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

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <MenuCard
          title="Nova Solicitação"
          description="Criar uma nova requisição de materiais"
          icon={<ClipboardList className="w-6 h-6 text-primary" />}
          to="/materiais/solicitar"
        />
        <MenuCard
          title="Minhas Solicitações"
          description="Acompanhe o status das suas requisições"
          icon={<History className="w-6 h-6 text-primary" />}
          to="/materiais/historico"
        />
        {isAdmin && (
          <MenuCard
            title="Gerenciar Solicitações"
            description="Aprovar, rejeitar e exportar requisições"
            icon={<Users className="w-6 h-6 text-primary" />}
            to="/materiais/admin"
          />
        )}
      </div>
    </div>
  );
}
