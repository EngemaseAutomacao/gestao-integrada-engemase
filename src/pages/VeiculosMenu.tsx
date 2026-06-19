import { Car, Upload, LogIn, History, Fuel, AlertCircle, ClipboardList, ArrowRightLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUrgencyBadges } from "@/hooks/useUrgencyBadges";
import { MenuCard } from "@/components/MenuCard";


export default function VeiculosMenu() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const { vehicleIssuesOpen } = useUrgencyBadges();

  return (
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Veículos</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie a entrada e saída de veículos da frota
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <MenuCard
          title="Painel Geral"
          description="Visão geral da frota"
          icon={<Car className="w-6 h-6 text-primary" />}
          to="/veiculos/dashboard"
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
          badgeCount={vehicleIssuesOpen}
        />
        <MenuCard
          title="Transferências"
          description="Transferir posse de veículos"
          icon={<ArrowRightLeft className="w-6 h-6 text-primary" />}
          to="/transferencias"
        />
        {isAdmin && (
          <>
            <MenuCard
              title="Problemas"
              description="Gerenciar problemas reportados"
              icon={<AlertCircle className="w-6 h-6 text-primary" />}
              to="/admin/vehicle-issues"
              badgeCount={vehicleIssuesOpen}
            />
            <MenuCard
              title="Histórico Geral"
              description="Todas as movimentações"
              icon={<ClipboardList className="w-6 h-6 text-primary" />}
              to="/admin/vehicle-history"
            />
          </>
        )}
      </div>
    </div>
  );
}
