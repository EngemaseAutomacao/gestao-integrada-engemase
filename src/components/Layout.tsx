import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Home, Package, History, Users, Settings, LogOut, Wrench, ClipboardList, BarChart3, Bell, FileText, AlertCircle, Car, ArrowLeftCircle } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";
import { InstallPWA } from "@/components/InstallPWA";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import engemaseLogo from "@/assets/engemase-logo.png";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();

  // Check if we're in the ferramentas module
  const isFerramentasModule = location.pathname.startsWith('/ferramentas') || 
                               location.pathname.startsWith('/tools') ||
                               location.pathname.startsWith('/checkout') ||
                               location.pathname.startsWith('/checkin') ||
                               location.pathname.startsWith('/history') ||
                               location.pathname.startsWith('/report-issue');

  // Check if we're in the admin module
  const isAdminModule = location.pathname.startsWith('/admin');

  // Check if we're on the home page
  const isHomePage = location.pathname === '/';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Wrench className="w-12 h-12 text-primary animate-pulse mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/auth" />;
  }

  // Check if user is approved
  if (!profile.approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4">
        <div className="text-center space-y-4 max-w-md">
          <Wrench className="w-16 h-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">Aguardando Aprovação</h1>
          <p className="text-muted-foreground">
            Sua conta foi criada com sucesso, mas ainda não foi aprovada por um administrador.
            Por favor, aguarde a aprovação para acessar o sistema.
          </p>
          <button 
            onClick={signOut}
            className="text-primary hover:underline"
          >
            Sair e tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = profile.role === "admin";
  const categoryLabel = profile.category === "engemase_employee" ? "Funcionário" : "Terceirizado";
  const categoryColor = profile.category === "engemase_employee" ? "badge-employee" : "badge-thirdparty";

  const ferramentasMenuItems = [
    { title: "Início Ferramentas", url: "/ferramentas", icon: Wrench },
    { title: "Lista de Ferramentas", url: "/ferramentas/lista", icon: Package },
    { title: "Meu Histórico", url: "/ferramentas/historico", icon: History },
  ];

  // General system menu - shown when not in a specific module
  const sistemaMenuItems = [
    { title: "Início", url: "/", icon: Home },
  ];

  const adminMenuItems = [
    { title: "Usuários", url: "/admin/users", icon: Users },
    { title: "Gerenciar Ferramentas", url: "/admin/tools", icon: Package },
    { title: "Manutenções", url: "/admin/maintenance", icon: Wrench },
    { title: "Dashboard Analítico", url: "/admin/analytics", icon: BarChart3 },
    { title: "Relatórios", url: "/admin/reports", icon: FileText },
    { title: "Notificações", url: "/admin/notifications", icon: Bell },
    { title: "Logs do Sistema", url: "/admin/logs", icon: ClipboardList },
    { title: "Entrada Manual", url: "/admin/manual", icon: Settings },
    { title: "Problemas", url: "/admin/issues", icon: AlertCircle },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-center">
              <img src={engemaseLogo} alt="Engemase Engenharia" className="w-32 h-auto" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <Badge className={`mt-2 w-full justify-center bg-${categoryColor} text-${categoryColor}-foreground`}>
                {categoryLabel}
              </Badge>
            </div>
          </div>

          <SidebarContent>
            {/* Sistema Menu - shown when on home page or not in a specific module */}
            {isHomePage && (
              <SidebarGroup>
                <SidebarGroupLabel>Sistema</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {sistemaMenuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink to={item.url} end className={({ isActive }) => isActive ? "bg-sidebar-accent" : ""}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Back to Home button - shown when in a module */}
            {!isHomePage && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <NavLink to="/" className="text-muted-foreground hover:text-foreground">
                          <ArrowLeftCircle className="w-4 h-4" />
                          <span>Voltar ao Menu</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Ferramentas Menu - only show when in ferramentas module */}
            {isFerramentasModule && (
              <SidebarGroup>
                <SidebarGroupLabel>Ferramentas</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {ferramentasMenuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink to={item.url} end className={({ isActive }) => isActive ? "bg-sidebar-accent" : ""}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Admin Menu - only show when in admin module */}
            {isAdminModule && isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Administração</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminMenuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink to={item.url} className={({ isActive }) => isActive ? "bg-sidebar-accent" : ""}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={signOut}>
                      <LogOut className="w-4 h-4" />
                      <span>Sair</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card flex items-center justify-between px-4 gap-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">Sistema de Gestão Engemase</h1>
            </div>
            <div className="flex items-center gap-2">
              <OfflineIndicator />
              <InstallPWA />
              <NotificationBell />
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
