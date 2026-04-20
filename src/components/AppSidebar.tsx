import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Wrench,
  Car,
  Clock,
  Package,
  Shield,
  Upload,
  LogIn,
  History,
  Settings,
  AlertCircle,
  BarChart3,
  ClipboardList,
  Users,
  FileText,
  Bell,
  Fuel,
  ArrowRightLeft,
  CalendarDays,
  Building2,
  Database,
  Image as ImageIcon,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUrgencyBadges } from "@/hooks/useUrgencyBadges";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import engemaseLogo from "@/assets/engemase-logo.png";

type Item = {
  title: string;
  url: string;
  icon: React.ElementType;
  badge?: number;
};

type Group = {
  label: string;
  items: Item[];
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { toolBadgeCount, vehicleBadgeCount } = useUrgencyBadges();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const groups: Group[] = [
    {
      label: "Principal",
      items: [
        { title: "Início", url: "/", icon: Home },
        { title: "Meu Dia", url: "/meu-dia", icon: CalendarDays },
        { title: "Transferências", url: "/transferencias", icon: ArrowRightLeft },
      ],
    },
    {
      label: "Ferramentas",
      items: [
        { title: "Painel", url: "/ferramentas/dashboard", icon: BarChart3 },
        { title: "Catálogo", url: "/ferramentas/lista", icon: Package },
        { title: "Registrar Saída", url: "/ferramentas/retirada", icon: Upload },
        {
          title: "Registrar Devolução",
          url: "/ferramentas/devolucao",
          icon: LogIn,
          badge: toolBadgeCount,
        },
        { title: "Meu Histórico", url: "/ferramentas/historico", icon: History },
      ],
    },
    {
      label: "Veículos",
      items: [
        { title: "Painel", url: "/veiculos/dashboard", icon: BarChart3 },
        { title: "Lista", url: "/veiculos/lista", icon: Package },
        { title: "Registrar Saída", url: "/veiculos/saida", icon: Upload },
        {
          title: "Registrar Devolução",
          url: "/veiculos/chegada",
          icon: LogIn,
          badge: vehicleBadgeCount,
        },
        { title: "Meu Histórico", url: "/veiculos/historico", icon: History },
        ...(isAdmin
          ? [
              { title: "Combustível", url: "/veiculos/combustivel", icon: Fuel },
              { title: "Analytics", url: "/veiculos/analytics", icon: BarChart3 },
            ]
          : []),
      ],
    },
    ...(isAdmin
      ? [
          {
            label: "Ponto Online",
            items: [
              { title: "Painel", url: "/ponto", icon: Clock },
              { title: "Registrar", url: "/ponto/registrar", icon: Clock },
              { title: "Histórico", url: "/ponto/historico", icon: History },
              { title: "Gerenciar", url: "/ponto/admin", icon: Users },
            ],
          },
          {
            label: "Materiais",
            items: [
              { title: "Painel", url: "/materiais", icon: Package },
              { title: "Solicitar", url: "/materiais/solicitar", icon: ClipboardList },
              { title: "Histórico", url: "/materiais/historico", icon: History },
              { title: "Gerenciar", url: "/materiais/admin", icon: Users },
            ],
          },
          {
            label: "Administração",
            items: [
              { title: "Dashboard", url: "/admin", icon: Shield },
              { title: "Usuários", url: "/admin/users", icon: Users },
              { title: "Ferramentas", url: "/admin/tools", icon: Wrench },
              { title: "Manutenções", url: "/admin/maintenance", icon: Settings },
              { title: "Problemas Ferramentas", url: "/admin/issues", icon: AlertCircle },
              { title: "Histórico Ferramentas", url: "/admin/history", icon: ClipboardList },
              { title: "Histórico Veículos", url: "/admin/vehicle-history", icon: ClipboardList },
              { title: "Problemas Veículos", url: "/admin/vehicle-issues", icon: AlertCircle },
              { title: "Obras e Clientes", url: "/admin/construction-sites", icon: Building2 },
              { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
              { title: "Relatórios", url: "/admin/reports", icon: FileText },
              { title: "Notificações", url: "/admin/notifications", icon: Bell },
              { title: "Galeria", url: "/admin/gallery", icon: ImageIcon },
              { title: "Logs", url: "/admin/logs", icon: ClipboardList },
              { title: "Auditoria", url: "/admin/audit", icon: ShieldCheck },
              { title: "Retenção de Dados", url: "/admin/data-retention", icon: Database },
              { title: "Entrada Manual", url: "/admin/manual", icon: Settings },
            ],
          },
        ]
      : []),
  ];

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <NavLink
          to="/"
          className={cn(
            "flex items-center gap-2 px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors",
            collapsed && "justify-center px-0"
          )}
          aria-label="Ir para a página inicial"
        >
          <img src={engemaseLogo} alt="Engemase" className="h-7 w-auto shrink-0" />
          {!collapsed && (
            <span className="text-sm font-semibold truncate">Engemase</span>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={collapsed ? item.title : undefined}
                      >
                        <NavLink
                          to={item.url}
                          className={cn(
                            "flex items-center gap-2 w-full",
                            active && "font-medium text-sidebar-primary-foreground"
                          )}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {!collapsed && (
                            <span className="flex-1 truncate">{item.title}</span>
                          )}
                          {!collapsed && item.badge && item.badge > 0 ? (
                            <Badge
                              variant="destructive"
                              className="h-5 min-w-5 px-1.5 text-[10px]"
                              aria-label={`${item.badge} pendentes`}
                            >
                              {item.badge > 99 ? "99+" : item.badge}
                            </Badge>
                          ) : null}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
