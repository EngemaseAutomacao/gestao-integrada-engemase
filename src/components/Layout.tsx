import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Home, Package, History, Users, Settings, LogOut, Wrench, ClipboardList, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import engemaseLogo from "@/assets/engemase-logo.png";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, loading, signOut } = useAuth();

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

  const isAdmin = profile.role === "admin";
  const categoryLabel = profile.category === "engemase_employee" ? "Funcionário" : "Terceirizado";
  const categoryColor = profile.category === "engemase_employee" ? "badge-employee" : "badge-thirdparty";

  const mainMenuItems = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "Ferramentas", url: "/tools", icon: Package },
    { title: "Meu Histórico", url: "/history", icon: History },
  ];

  const adminMenuItems = [
    { title: "Usuários", url: "/admin/users", icon: Users },
    { title: "Gerenciar Ferramentas", url: "/admin/tools", icon: Package },
    { title: "Logs do Sistema", url: "/admin/logs", icon: ClipboardList },
    { title: "Alterar Senha", url: "/admin/profile", icon: User },
    { title: "Entrada Manual", url: "/admin/manual", icon: Settings },
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
            <SidebarGroup>
              <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainMenuItems.map((item) => (
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

            {isAdmin && (
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
          <header className="h-16 border-b bg-card flex items-center px-4 gap-4">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Controle de Ferramentas Engemase</h1>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
