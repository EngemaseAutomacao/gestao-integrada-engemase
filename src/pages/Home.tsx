import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Car, Clock, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import engemaseLogo from "@/assets/engemase-logo.png";
import { useAuth } from "@/contexts/AuthContext";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to?: string;
  disabled?: boolean;
  comingSoon?: boolean;
  variant?: "default" | "admin";
}

function ModuleCard({ title, description, icon, to, disabled, comingSoon, variant = "default" }: ModuleCardProps) {
  const isAdmin = variant === "admin";
  
  const content = (
    <Card className={`relative overflow-hidden transition-all duration-300 ${
      disabled 
        ? 'opacity-60 cursor-not-allowed' 
        : 'hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-primary'
    } ${isAdmin ? 'border-orange-500/50 bg-orange-500/5' : ''}`}>
      {comingSoon && (
        <div className="absolute top-3 right-3 bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Em Breve
        </div>
      )}
      <CardHeader className="text-center pb-2">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          isAdmin ? 'bg-orange-500/10' : 'bg-primary/10'
        }`}>
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {!disabled && (
          <span className={`text-sm font-medium ${isAdmin ? 'text-orange-500' : 'text-primary'}`}>
            Acessar →
          </span>
        )}
      </CardContent>
    </Card>
  );

  if (disabled || !to) {
    return content;
  }

  return (
    <Link to={to} className="block">
      {content}
    </Link>
  );
}

export default function Home() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <img src={engemaseLogo} alt="Engemase Engenharia" className="w-48 h-auto mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Bem-vindo, {profile?.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground">
          Selecione o módulo que deseja acessar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
        <ModuleCard
          title="Controle de Ferramentas"
          description="Gerencie retiradas, devoluções e manutenções de ferramentas"
          icon={<Wrench className="w-8 h-8 text-primary" />}
          to="/ferramentas"
        />

        <ModuleCard
          title="Controle de Veículos"
          description="Registre entradas e saídas de veículos com fotos"
          icon={<Car className="w-8 h-8 text-muted-foreground" />}
          disabled
          comingSoon
        />

        {isAdmin && (
          <ModuleCard
            title="Painel Administrativo"
            description="Gerencie usuários, relatórios e configurações do sistema"
            icon={<Shield className="w-8 h-8 text-orange-500" />}
            to="/admin"
            variant="admin"
          />
        )}
      </div>
    </div>
  );
}
