import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation, NavLink } from "react-router-dom";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider, 
  SidebarTrigger,
  useSidebar 
} from "@/components/ui/sidebar";
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
  ArrowLeftCircle,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";
import { InstallPWA } from "@/components/InstallPWA";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import engemaseLogo from "@/assets/engemase-logo.png";

interface LayoutProps {
  children: React.ReactNode;
}

function SidebarMenuItemWithTooltip({ 
  item, 
  isActive,
  collapsed
}: { 
  item: { title: string; url: string; icon: any }; 
  isActive: boolean;
  collapsed: boolean;
}) {
  const content = (
    <SidebarMenuButton asChild className={cn(
      "transition-all duration-200",
      isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
    )}>
      <NavLink to={item.url} end>
        <item.icon className="w-4 h-4 shrink-0" />
        <span className={cn(
          "transition-all duration-200",
          collapsed && "opacity-0 w-0"
        )}>{item.title}</span>
      </NavLink>
    </SidebarMenuButton>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function SidebarContentWrapper() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isFerramentasModule = location.pathname.startsWith('/ferramentas') || 
                               location.pathname.startsWith('/tools') ||
                               location.pathname.startsWith('/checkout') ||
                               location.pathname.startsWith('/checkin') ||
                               location.pathname.startsWith('/history') ||
                               location.pathname.startsWith('/report-issue');
  const isVeiculosModule = location.pathname.startsWith('/veiculos');
  const isAdminModule = location.pathname.startsWith('/admin');
  const isHomePage = location.pathname === '/';

  const isAdmin = profile?.role === "admin";
  const categoryLabel = profile?.category === "engemase_employee" ? "Funcionário" : "Terceirizado";

  const ferramentasMenuItems = [
    { title: "Dashboard", url: "/ferramentas", icon: Wrench },
    { title: "Lista de Ferramentas", url: "/ferramentas/lista", icon: Package },
    { title: "Meu Histórico", url: "/ferramentas/historico", icon: History },
  ];

  const veiculosMenuItems = [
    { title: "Dashboard", url: "/veiculos", icon: Car },
    { title: "Lista de Veículos", url: "/veiculos/lista", icon: Package },
  ];

  const sistemaMenuItems = [
    { title: "Início", url: "/", icon: Home },
  ];

  const adminMenuItems = [
    { title: "Usuários", url: "/admin/users", icon: Users },
    { title: "Ferramentas", url: "/admin/tools", icon: Package },
    { title: "Manutenções", url: "/admin/maintenance", icon: Wrench },
    { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
    { title: "Relatórios", url: "/admin/reports", icon: FileText },
    { title: "Notificações", url: "/admin/notifications", icon: Bell },
    { title: "Logs", url: "/admin/logs", icon: ClipboardList },
    { title: "Entrada Manual", url: "/admin/manual", icon: Settings },
    { title: "Problemas", url: "/admin/issues", icon: AlertCircle },
  ];

  const isActiveRoute = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  return (
    <>
      {/* Logo and User Info */}
      <div className={cn(
        "border-b transition-all duration-200",
        collapsed ? "p-2" : "p-4"
      )}>
        <div className="flex items-center justify-center mb-3">
          <img 
            src={engemaseLogo} 
            alt="Engemase" 
            className={cn(
              "transition-all duration-200",
              collapsed ? "w-8 h-auto" : "w-28 h-auto"
            )} 
          />
        </div>
        {!collapsed && (
          <div className="text-center space-y-1.5">
            <p className="text-sm font-medium truncate">{profile?.full_name}</p>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs",
                profile?.category === "engemase_employee" 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "bg-warning/10 text-warning border-warning/20"
              )}
            >
              {categoryLabel}
            </Badge>
          </div>
        )}
      </div>

      <SidebarContent className="px-2">
        {/* Back to Home */}
        {!isHomePage && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuItemWithTooltip
                    item={{ title: "Voltar ao Menu", url: "/", icon: ArrowLeftCircle }}
                    isActive={false}
                    collapsed={collapsed}
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Home Menu */}
        {isHomePage && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">Sistema</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {sistemaMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuItemWithTooltip
                      item={item}
                      isActive={isActiveRoute(item.url)}
                      collapsed={collapsed}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Ferramentas Menu */}
        {isFerramentasModule && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">Ferramentas</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {ferramentasMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuItemWithTooltip
                      item={item}
                      isActive={isActiveRoute(item.url)}
                      collapsed={collapsed}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Veículos Menu */}
        {isVeiculosModule && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">Veículos</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {veiculosMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuItemWithTooltip
                      item={item}
                      isActive={isActiveRoute(item.url)}
                      collapsed={collapsed}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin Menu */}
        {isAdminModule && isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">Administração</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuItemWithTooltip
                      item={item}
                      isActive={isActiveRoute(item.url)}
                      collapsed={collapsed}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Logout - fixed at bottom */}
        <SidebarGroup className="mt-auto pb-4">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                {collapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton 
                        onClick={signOut}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="w-4 h-4" />
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">Sair</TooltipContent>
                  </Tooltip>
                ) : (
                  <SidebarMenuButton 
                    onClick={signOut}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  );
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <Wrench className="w-12 h-12 text-primary animate-pulse mx-auto" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          </div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/auth" />;
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

  // Home page: simple layout without sidebar
  if (isHomePage) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Simple Header for Home */}
        <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <img src={engemaseLogo} alt="Engemase" className="h-8 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <OfflineIndicator />
            <InstallPWA />
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
              <span className="text-sm font-medium text-foreground">{profile?.full_name}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    );
  }

  // Other pages: full layout with sidebar
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon" className="border-r">
          <SidebarContentWrapper />
        </Sidebar>

        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 gap-4 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8" />
              <div className="h-4 w-px bg-border hidden sm:block" />
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-1">
              <OfflineIndicator />
              <InstallPWA />
              <ThemeToggle />
              <NotificationBell />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
