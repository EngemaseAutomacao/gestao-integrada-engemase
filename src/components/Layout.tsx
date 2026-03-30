import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation, NavLink } from "react-router-dom";
import { 
  Home, 
  Package, 
  History, 
  Users, 
  Settings, 
  LogOut, 
  Wrench, 
  ClipboardList, 
  BarChart3, 
  Bell, 
  FileText, 
  AlertCircle, 
  Car, 
  ChevronDown,
  ArrowLeft,
  Fuel,
  MapPin
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";

import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";

import { Footer } from "@/components/Footer";
import { PermissionsRequest } from "@/components/PermissionsRequest";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import engemaseLogo from "@/assets/engemase-logo.png";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();
  
  const isHomePage = location.pathname === '/';
  const adminToolRoutes = ['/admin/tools', '/admin/maintenance', '/admin/issues', '/admin/history'];
  const isAdminToolRoute = adminToolRoutes.some(r => location.pathname.startsWith(r));
  const isFerramentasModule = location.pathname.startsWith('/ferramentas') || 
                               location.pathname.startsWith('/tools') ||
                               location.pathname.startsWith('/checkout') ||
                               location.pathname.startsWith('/checkin') ||
                               location.pathname.startsWith('/history') ||
                               location.pathname.startsWith('/report-issue') ||
                               isAdminToolRoute;
  const isVeiculosModule = location.pathname.startsWith('/veiculos');
  const isAdminModule = location.pathname.startsWith('/admin') && !isAdminToolRoute;

  const isAdmin = profile?.role === "admin";

  const ferramentasMenuItems = [
    { title: "Dashboard", url: "/ferramentas", icon: Wrench },
    { title: "Lista de Ferramentas", url: "/ferramentas/lista", icon: Package },
    { title: "Meu Histórico", url: "/ferramentas/historico", icon: History },
    ...(isAdmin ? [
      { title: "Gerenciar Ferramentas", url: "/admin/tools", icon: Settings },
      { title: "Manutenções", url: "/admin/maintenance", icon: Wrench },
      { title: "Problemas", url: "/admin/issues", icon: AlertCircle },
      { title: "Histórico Geral", url: "/admin/history", icon: ClipboardList },
    ] : []),
  ];

  const veiculosMenuItems = [
    { title: "Dashboard", url: "/veiculos", icon: Car },
    { title: "Lista de Veículos", url: "/veiculos/lista", icon: Package },
    { title: "Combustível", url: "/veiculos/combustivel", icon: Fuel },
    { title: "Meu Histórico", url: "/veiculos/historico", icon: History },
    ...(isAdmin ? [
      { title: "Analytics", url: "/veiculos/analytics", icon: BarChart3 },
    ] : []),
  ];

  const adminMenuItems = [
    { title: "Dashboard", url: "/admin", icon: BarChart3 },
    { title: "Usuários", url: "/admin/users", icon: Users },
    { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
    { title: "Relatórios", url: "/admin/reports", icon: FileText },
    { title: "Obras", url: "/admin/construction-sites", icon: MapPin },
    { title: "Notificações", url: "/admin/notifications", icon: Bell },
    { title: "Logs", url: "/admin/logs", icon: ClipboardList },
    { title: "Entrada Manual", url: "/admin/manual", icon: Settings },
  ];

  const getCurrentModuleInfo = () => {
    if (isFerramentasModule) {
      return { 
        title: "Ferramentas", 
        icon: Wrench, 
        items: ferramentasMenuItems,
        color: "text-primary"
      };
    }
    if (isVeiculosModule) {
      return { 
        title: "Veículos", 
        icon: Car, 
        items: veiculosMenuItems,
        color: "text-primary"
      };
    }
    if (isAdminModule && isAdmin) {
      return { 
        title: "Administração", 
        icon: Settings, 
        items: adminMenuItems,
        color: "text-orange-500"
      };
    }
    return null;
  };

  const currentModule = getCurrentModuleInfo();

  const isActiveRoute = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  // Hide splash screen when auth is done loading
  if (!loading) {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 300);
    }
  }

  if (loading) {
    return null; // Keep HTML splash visible
  }

  if (!user || !profile) {
    return <Navigate to="/auth" />;
  }

  if (profile.first_login) {
    return <Navigate to="/change-password" />;
  }

  if (!profile.approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        <div className="text-center space-y-4 max-w-md bg-card p-8 rounded-xl shadow-lg border">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Wrench className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Aguardando Aprovação</h1>
          <p className="text-muted-foreground">
            Sua conta foi criada com sucesso, mas ainda não foi aprovada por um administrador.
            Por favor, aguarde a aprovação para acessar o sistema.
          </p>
          <Button variant="ghost" onClick={signOut} className="text-primary">
            Sair e tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <img src={engemaseLogo} alt="Engemase" className="h-8 w-auto" />
          </NavLink>

          {/* Back button + Module Dropdown (only on non-home pages) */}
          {!isHomePage && currentModule && (
            <>
              <div className="h-6 w-px bg-border hidden sm:block" />
              
              {/* Back to Home */}
              <NavLink to="/">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Menu</span>
                </Button>
              </NavLink>

              {/* Module Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("gap-2", currentModule.color)}>
                    <currentModule.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{currentModule.title}</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-popover border shadow-lg z-50">
                  <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                    {currentModule.title}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {currentModule.items.map((item) => (
                    <DropdownMenuItem key={item.url} asChild>
                      <NavLink 
                        to={item.url} 
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          isActiveRoute(item.url) && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.title}
                      </NavLink>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

            </>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <OfflineIndicator />
          
          <ThemeToggle />
          <NotificationBell />
          
          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 max-w-[180px]">
                <span className="text-sm font-medium truncate hidden sm:inline">
                  {profile?.full_name?.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border shadow-lg z-50">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "w-fit text-xs mt-1",
                      profile?.category === "engemase_employee" 
                        ? "bg-primary/10 text-primary" 
                        : "bg-orange-500/10 text-orange-500"
                    )}
                  >
                    {profile?.category === "engemase_employee" ? "Funcionário" : "Terceirizado"}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={signOut}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-auto p-4 md:p-6">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
