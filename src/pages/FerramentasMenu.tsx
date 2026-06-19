import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Package, Upload, LogIn, History, BarChart3, AlertCircle, ClipboardList, Settings, ArrowRightLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUrgencyBadges } from "@/hooks/useUrgencyBadges";

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

export default function FerramentasMenu() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const { toolOverdue, toolIssuesOpen } = useUrgencyBadges();

  return (
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold text-foreground">Ferramentas</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie retiradas, devoluções e manutenções de ferramentas
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <MenuCard
          title="Painel Geral"
          description="Visão geral e status das ferramentas"
          icon={<Wrench className="w-6 h-6 text-primary" />}
          to="/ferramentas/dashboard"
        />
        <MenuCard
          title="Registrar Saída"
          description="Retirar uma ferramenta"
          icon={<Upload className="w-6 h-6 text-primary" />}
          to="/ferramentas/retirada"
        />
        <MenuCard
          title="Registrar Devolução"
          description="Devolver uma ferramenta"
          icon={<LogIn className="w-6 h-6 text-primary" />}
          to="/ferramentas/devolucao"
          badgeCount={toolOverdue}
        />
        <MenuCard
          title="Meu Histórico"
          description="Suas movimentações de ferramentas"
          icon={<History className="w-6 h-6 text-primary" />}
          to="/ferramentas/historico"
        />
        <MenuCard
          title="Reportar Problema"
          description="Informar defeito em ferramenta"
          icon={<AlertCircle className="w-6 h-6 text-primary" />}
          to="/report-issue"
          badgeCount={toolIssuesOpen}
        />
        <MenuCard
          title="Transferências"
          description="Transferir posse de ferramentas"
          icon={<ArrowRightLeft className="w-6 h-6 text-primary" />}
          to="/transferencias"
        />
        {isAdmin && (
          <>
            <MenuCard
              title="Sincronizações"
              description="Obras, clientes e ferramentas"
              icon={<Settings className="w-6 h-6 text-primary" />}
              to="/admin/construction-sites"
            />
            <MenuCard
              title="Problemas"
              description="Gerenciar problemas reportados"
              icon={<AlertCircle className="w-6 h-6 text-primary" />}
              to="/admin/issues"
            />
            <MenuCard
              title="Histórico Geral"
              description="Todas as movimentações"
              icon={<ClipboardList className="w-6 h-6 text-primary" />}
              to="/admin/history"
            />
          </>
        )}
      </div>
    </div>
  );
}
