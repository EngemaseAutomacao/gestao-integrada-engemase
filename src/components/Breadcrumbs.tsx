import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  "": "Início",
  "ferramentas": "Ferramentas",
  "lista": "Lista",
  "historico": "Meu Histórico",
  "checkout": "Retirada",
  "checkin": "Devolução",
  "veiculos": "Veículos",
  "admin": "Administração",
  "users": "Usuários",
  "tools": "Gerenciar Ferramentas",
  "maintenance": "Manutenções",
  "analytics": "Dashboard Analítico",
  "reports": "Relatórios",
  "notifications": "Notificações",
  "logs": "Logs do Sistema",
  "manual": "Entrada Manual",
  "issues": "Problemas",
  "report-issue": "Reportar Problema",
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  if (pathnames.length === 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Início</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;
          const label = routeLabels[value] || value;

          return (
            <BreadcrumbItem key={to}>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
              {isLast ? (
                <BreadcrumbPage className="font-medium">{label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={to} className="text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
