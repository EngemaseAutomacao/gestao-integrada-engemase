import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, History, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface PontoCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

function PontoCard({ title, description, icon, to }: PontoCardProps) {
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

export default function PontoDashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Ponto Online</h1>
        <p className="text-muted-foreground mt-1">
          Registre e acompanhe seus pontos de atividades externas
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <PontoCard
          title="Registrar Ponto"
          description="Bater entrada ou saída com geolocalização"
          icon={<MapPin className="w-7 h-7 text-primary" />}
          to="/ponto/registrar"
        />
        <PontoCard
          title="Meu Histórico"
          description="Visualize seus registros de ponto"
          icon={<History className="w-7 h-7 text-primary" />}
          to="/ponto/historico"
        />
        {isAdmin && (
          <PontoCard
            title="Gerenciar Pontos"
            description="Visualizar e aprovar pontos dos funcionários"
            icon={<Users className="w-7 h-7 text-primary" />}
            to="/ponto/admin"
          />
        )}
      </div>
    </div>
  );
}
