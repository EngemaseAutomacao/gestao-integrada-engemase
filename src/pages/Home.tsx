import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Car, Clock, Shield, Download, Package, Loader2, Building2, Share, History, ArrowRightLeft } from "lucide-react";
import { Link } from "react-router-dom";
import engemaseLogo from "@/assets/engemase-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useUrgencyBadges } from "@/hooks/useUrgencyBadges";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function InstallPWACard({ isIOS }: { isIOS: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isIOS) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isIOS]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  if (isIOS) {
    return (
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg border-dashed border-2">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-accent/20">
            <Share className="w-6 h-6 text-accent-foreground" />
          </div>
          <CardTitle className="text-base">Instalar App</CardTitle>
        </CardHeader>
        <CardContent className="text-center pt-0">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Toque em <strong>Compartilhar</strong> <Share className="w-3 h-3 inline" /> e depois em <strong>"Adicionar à Tela de Início"</strong>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <Card
      className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-primary border-dashed border-2"
      onClick={handleInstall}
    >
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-accent/20">
          <Download className="w-6 h-6 text-accent-foreground" />
        </div>
        <CardTitle className="text-base">Instalar App</CardTitle>
      </CardHeader>
      <CardContent className="text-center pt-0">
        <span className="text-sm font-medium text-primary">Instalar →</span>
      </CardContent>
    </Card>
  );
}

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to?: string;
  disabled?: boolean;
  comingSoon?: boolean;
  variant?: "default" | "admin";
  badgeCount?: number;
  pendingCount?: number;
  overdueCount?: number;
}

function ModuleCard({
  title,
  description,
  icon,
  to,
  disabled,
  comingSoon,
  variant = "default",
  badgeCount,
  pendingCount,
  overdueCount,
}: ModuleCardProps) {
  const isAdmin = variant === "admin";
  const urgentCount = overdueCount || badgeCount || 0;

  const statusBadge = (() => {
    if (comingSoon) {
      return { label: "Em Breve", className: "bg-muted text-muted-foreground" };
    }
    if (urgentCount > 0) {
      return {
        label: `${urgentCount} Urgente${urgentCount > 1 ? "s" : ""}`,
        className: "bg-destructive/10 text-destructive dark:bg-destructive/20",
      };
    }
    if (pendingCount && pendingCount > 0) {
      return {
        label: `${pendingCount} Pendente${pendingCount > 1 ? "s" : ""}`,
        className: "bg-warning/10 text-warning dark:bg-warning/20",
      };
    }
    if (!disabled) {
      return { label: "Ativo", className: "bg-success/10 text-success dark:bg-success/20" };
    }
    return null;
  })();

  const content = (
    <Card
      className={`group relative h-full overflow-hidden border transition-all duration-300 ${
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "cursor-pointer hover:-translate-y-1 hover:shadow-elevated hover:border-primary/60"
      } ${isAdmin ? "border-warning/40 bg-warning/5" : "bg-card"}`}
    >
      <div className="p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div
            className={`p-3 rounded-lg transition-colors ${
              isAdmin
                ? "bg-warning/10 text-warning group-hover:bg-warning group-hover:text-warning-foreground"
                : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
            }`}
          >
            {icon}
          </div>
          {statusBadge && (
            <span
              className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          )}
        </div>

        <h3 className="font-display text-lg font-bold leading-tight mb-1 text-foreground">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>

        <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {disabled
              ? "Indisponível"
              : isAdmin
              ? "Painel administrativo"
              : "Abrir módulo"}
          </span>
          {!disabled && (
            <span
              className={`font-semibold transition-transform group-hover:translate-x-0.5 ${
                isAdmin ? "text-warning" : "text-primary"
              }`}
            >
              Acessar →
            </span>
          )}
        </div>
      </div>
    </Card>
  );

  if (disabled || !to) {
    return content;
  }

  return (
    <Link to={to} className="block h-full">
      {content}
    </Link>
  );
}

interface HomeSummary {
  toolsInUse: number;
  vehiclesOut: number;
  pontoOpen: boolean;
}

function SummaryCards({ userId }: { userId: string }) {
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [toolsRes, vehiclesRes, pontoRes] = await Promise.all([
          supabase
            .from("tool_checkouts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "checked_out"),
          supabase
            .from("vehicle_checkouts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "checked_out"),
          supabase
            .from("time_entries")
            .select("id")
            .eq("user_id", userId)
            .eq("status", "open")
            .limit(1),
        ]);

        setSummary({
          toolsInUse: toolsRes.count || 0,
          vehiclesOut: vehiclesRes.count || 0,
          pontoOpen: (pontoRes.data?.length || 0) > 0,
        });
      } catch (e) {
        console.error("Error loading summary:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) return null;

  const items = [
    {
      label: "Ferramentas em uso",
      value: summary.toolsInUse,
      icon: <Wrench className="w-4 h-4" />,
      color: summary.toolsInUse > 0 ? "text-primary" : "text-muted-foreground",
      bgColor: summary.toolsInUse > 0 ? "bg-primary/10" : "bg-muted",
    },
    {
      label: "Veículos em uso",
      value: summary.vehiclesOut,
      icon: <Car className="w-4 h-4" />,
      color: summary.vehiclesOut > 0 ? "text-primary" : "text-muted-foreground",
      bgColor: summary.vehiclesOut > 0 ? "bg-primary/10" : "bg-muted",
    },
    {
      label: "Ponto",
      value: summary.pontoOpen ? "Aberto" : "Fechado",
      icon: <Clock className="w-4 h-4" />,
      color: summary.pontoOpen ? "text-success" : "text-muted-foreground",
      bgColor: summary.pontoOpen ? "bg-success/10" : "bg-muted",
    },
  ];

  return (
    <Link to="/historico" className="block w-full">
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full hover:opacity-80 transition-opacity">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${item.bgColor}`}
          >
            <span className={item.color}>{item.icon}</span>
            <span className={`text-xs font-medium ${item.color}`}>
              {typeof item.value === "number" ? `${item.value} ${item.label.toLowerCase()}` : `${item.label}: ${item.value}`}
            </span>
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] text-muted-foreground mt-1">Toque para ver seu histórico unificado →</p>
    </Link>
  );
}

export default function Home() {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { 
    toolBadgeCount, 
    vehicleBadgeCount, 
    toolPending, 
    toolOverdue, 
    toolIssuesOpen,
    vehiclePending,
    vehicleOverdue,
    vehicleIssuesOpen 
  } = useUrgencyBadges();

  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-6 flex-1">
      <div className="text-center mb-4 sm:mb-6">
        <img src={engemaseLogo} alt="Engemase Engenharia logotipo" className="w-28 sm:w-48 h-auto mx-auto mb-2 sm:mb-4" />
        <h1 className="text-xl sm:text-3xl font-bold text-foreground mb-0.5 sm:mb-2">
          Sistema de Gestão de Ativos — Engemase Engenharia
        </h1>
        <p className="text-sm sm:text-lg text-foreground mt-1">
          Bem-vindo, {profile?.full_name?.split(' ')[0]}!
        </p>
        <p className="text-xs sm:text-base text-muted-foreground">
          Selecione o módulo que deseja acessar
        </p>
      </div>

      {/* Summary Cards */}
      {user && (
        <div className="mb-4 sm:mb-6">
          <SummaryCards userId={user.id} />
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 sm:gap-6 max-w-5xl w-full">
        <div id="tour-ferramentas" className="w-[calc(50%-0.375rem)] lg:w-[calc(25%-1.125rem)]">
          <ModuleCard
            title="Ferramentas"
            description="Retiradas, devoluções e manutenções"
            icon={<Wrench className="w-6 h-6 text-primary" />}
            to="/ferramentas"
            pendingCount={toolPending}
            overdueCount={toolOverdue + toolIssuesOpen}
          />
        </div>

        <div id="tour-veiculos" className="w-[calc(50%-0.375rem)] lg:w-[calc(25%-1.125rem)]">
          <ModuleCard
            title="Veículos"
            description="Entradas e saídas de veículos"
            icon={<Car className="w-6 h-6 text-primary" />}
            to="/veiculos"
            pendingCount={vehiclePending}
            overdueCount={vehicleOverdue + vehicleIssuesOpen}
          />
        </div>

        <div id="tour-ponto" className="w-[calc(50%-0.375rem)] lg:w-[calc(25%-1.125rem)]">
          <ModuleCard
            title="Ponto Online"
            description="Registre pontos em atividades externas"
            icon={<Clock className="w-6 h-6 text-primary" />}
            to="/ponto"
          />
        </div>

        <div id="tour-historico" className="w-[calc(50%-0.375rem)] lg:w-[calc(25%-1.125rem)]">
          <ModuleCard
            title="Meu Histórico"
            description="Veja todas as suas movimentações"
            icon={<History className="w-6 h-6 text-primary" />}
            to="/historico"
          />
        </div>

        <div id="tour-transferencias" className="w-[calc(50%-0.375rem)] lg:w-[calc(25%-1.125rem)]">
          <ModuleCard
            title="Transferências"
            description="Handover de ferramentas e veículos"
            icon={<ArrowRightLeft className="w-6 h-6 text-primary" />}
            to="/transferencias"
          />
        </div>

        {isAdmin && (
          <div id="tour-admin" className="w-[calc(50%-0.375rem)] lg:w-[calc(25%-1.125rem)]">
            <ModuleCard
              title="Administração"
              description="Usuários, relatórios e configurações"
              icon={<Shield className="w-6 h-6 text-orange-500" />}
              to="/admin"
              variant="admin"
            />
          </div>
        )}

        {!isStandalone && (
          <div className="w-[calc(50%-0.375rem)] lg:w-[calc(25%-1.125rem)]">
            <InstallPWACard isIOS={isIOS} />
          </div>
        )}
      </div>
    </div>
  );
}
