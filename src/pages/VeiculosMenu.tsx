import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Package, Upload, LogIn, History, Fuel, BarChart3, AlertCircle, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface MenuCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

function MenuCard({ title, description, icon, to }: MenuCardProps) {
  return (
    <Link to={to} className="block h-full">
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-primary h-full flex flex-col">
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

export default function VeiculosMenu() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold text-foreground">Veículos</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie a entrada e saída de veículos da frota
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <MenuCard
          title="Dashboard"
          description="Visão geral da frota"
          icon={<Car className="w-6 h-6 text-primary" />}
          to="/veiculos/dashboard"
        />
        <MenuCard
          title="Lista de Veículos"
          description="Todos os veículos cadastrados"
          icon={<Package className="w-6 h-6 text-primary" />}
          to="/veiculos/lista"
        />
        <MenuCard
          title="Registrar Saída"
          description="Registrar saída de veículo"
          icon={<Upload className="w-6 h-6 text-primary" />}
          to="/veiculos/saida"
        />
        <MenuCard
          title="Registrar Devolução"
          description="Registrar chegada do veículo"
          icon={<LogIn className="w-6 h-6 text-primary" />}
          to="/veiculos/chegada"
        />
        {isAdmin && (
          <MenuCard
            title="Combustível"
            description="Registros de abastecimento"
            icon={<Fuel className="w-6 h-6 text-primary" />}
            to="/veiculos/combustivel"
          />
        )}
        <MenuCard
          title="Meu Histórico"
          description="Suas movimentações de veículos"
          icon={<History className="w-6 h-6 text-primary" />}
          to="/veiculos/historico"
        />
        <MenuCard
          title="Reportar Problema"
          description="Informar defeito em veículo"
          icon={<AlertCircle className="w-6 h-6 text-primary" />}
          to="/veiculos/report-issue"
        />
        {isAdmin && (
          <>
            <MenuCard
              title="Problemas"
              description="Gerenciar problemas reportados"
              icon={<AlertCircle className="w-6 h-6 text-primary" />}
              to="/admin/vehicle-issues"
            />
            <MenuCard
              title="Histórico Geral"
              description="Todas as movimentações"
              icon={<ClipboardList className="w-6 h-6 text-primary" />}
              to="/admin/vehicle-history"
            />
            <MenuCard
              title="Analytics"
              description="Estatísticas da frota"
              icon={<BarChart3 className="w-6 h-6 text-primary" />}
              to="/veiculos/analytics"
            />
          </>
        )}
      </div>
    </div>
  );
}
