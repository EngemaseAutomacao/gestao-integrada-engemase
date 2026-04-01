import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Wrench, BarChart3, FileText, Bell, ClipboardList, Settings, AlertCircle, Images, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface AdminCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

function AdminCard({ title, description, icon, to }: AdminCardProps) {
  return (
    <Link to={to} className="block">
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-orange-500 border-orange-500/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
            {icon}
          </div>
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center pt-0">
          <span className="text-sm font-medium text-orange-500">Acessar →</span>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AdminDashboard() {
  const { profile } = useAuth();

  // Redirect non-admins
  if (profile?.role !== "admin") {
    return <Navigate to="/" />;
  }

  const adminItems = [
    { title: "Usuários", description: "Gerenciar contas e permissões", icon: <Users className="w-5 h-5 text-orange-500" />, to: "/admin/users" },
    { title: "Analytics", description: "Dashboard analítico", icon: <BarChart3 className="w-5 h-5 text-orange-500" />, to: "/admin/analytics" },
    { title: "Relatórios", description: "Gerar e exportar relatórios", icon: <FileText className="w-5 h-5 text-orange-500" />, to: "/admin/reports" },
    { title: "Notificações", description: "Configurar alertas", icon: <Bell className="w-5 h-5 text-orange-500" />, to: "/admin/notifications" },
    { title: "Logs", description: "Histórico do sistema", icon: <ClipboardList className="w-5 h-5 text-orange-500" />, to: "/admin/logs" },
    { title: "Entrada Manual", description: "Registros manuais", icon: <Settings className="w-5 h-5 text-orange-500" />, to: "/admin/manual" },
    { title: "Galeria de Imagens", description: "Visualizar fotos do sistema", icon: <Images className="w-5 h-5 text-orange-500" />, to: "/admin/gallery" },
    { title: "Obras", description: "Gerenciar canteiros e obras", icon: <Building2 className="w-5 h-5 text-orange-500" />, to: "/admin/construction-sites" },
  ];

  return (
    <div className="space-y-6">
      <div className="hidden sm:block">
        <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie todos os aspectos do sistema
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {adminItems.map((item) => (
          <AdminCard
            key={item.title}
            title={item.title}
            description={item.description}
            icon={item.icon}
            to={item.to}
          />
        ))}
      </div>
    </div>
  );
}
