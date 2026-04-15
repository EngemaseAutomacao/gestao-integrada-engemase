import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Car, Clock, Shield, Download, Package, Loader2, Building2, Share } from "lucide-react";
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

  // iOS: show manual instructions
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
}

function ModuleCard({ title, description, icon, to, disabled, comingSoon, variant = "default", badgeCount }: ModuleCardProps) {
  const isAdmin = variant === "admin";
  
  const content = (
    <Card className={`relative overflow-hidden transition-all duration-300 ${
      disabled 
        ? 'opacity-60 cursor-not-allowed' 
        : 'hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-primary'
    } ${isAdmin ? 'border-orange-500/50 bg-orange-500/5' : ''}`}>
      {comingSoon && (
        <div className="absolute top-2 right-2 bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          Em Breve
        </div>
      )}
      {badgeCount && badgeCount > 0 ? (
        <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
          {badgeCount}
        </div>
      ) : null}
      <CardHeader className="text-center pb-1 px-3 pt-4">
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
          isAdmin ? 'bg-orange-500/10' : 'bg-primary/10'
        }`}>
          {icon}
        </div>
        <CardTitle className="text-sm sm:text-base leading-tight">{title}</CardTitle>
        <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
      </CardHeader>
      <CardContent className="text-center pb-3 px-3 pt-0">
        {!disabled && (
          <span className={`text-xs font-medium ${isAdmin ? 'text-orange-500' : 'text-primary'}`}>
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
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full">
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
  );
}

export default function Home() {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === "admin";
  const { toolBadgeCount, vehicleBadgeCount } = useUrgencyBadges();

  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-6 flex-1">
      <div className="text-center mb-4 sm:mb-6">
        <img src={engemaseLogo} alt="Engemase Engenharia" className="w-28 sm:w-48 h-auto mx-auto mb-2 sm:mb-4" />
        <h1 className="text-xl sm:text-3xl font-bold text-foreground mb-0.5 sm:mb-2">
          Bem-vindo, {profile?.full_name?.split(' ')[0]}!
        </h1>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 max-w-5xl w-full">
        <ModuleCard
          title="Ferramentas"
          description="Retiradas, devoluções e manutenções"
          icon={<Wrench className="w-6 h-6 text-primary" />}
          to="/ferramentas"
          badgeCount={toolBadgeCount}
        />

        <ModuleCard
          title="Veículos"
          description="Entradas e saídas de veículos"
          icon={<Car className="w-6 h-6 text-primary" />}
          to="/veiculos"
          badgeCount={vehicleBadgeCount}
        />

        <ModuleCard
          title="Ponto Online"
          description={isAdmin ? "Registre pontos em atividades externas" : "Módulo restrito a administradores"}
          icon={<Clock className="w-6 h-6 text-primary" />}
          to={isAdmin ? "/ponto" : undefined}
          disabled={!isAdmin}
          comingSoon={!isAdmin}
        />

        <ModuleCard
          title="Materiais"
          description={isAdmin ? "Solicite e gerencie requisições de materiais" : "Módulo restrito a administradores"}
          icon={<Package className="w-6 h-6 text-primary" />}
          to={isAdmin ? "/materiais" : undefined}
          disabled={!isAdmin}
          comingSoon={!isAdmin}
        />

        {isAdmin && (
          <div className="col-span-2 lg:col-span-1 flex justify-center">
            <div className="w-1/2 lg:w-full">
              <ModuleCard
                title="Administração"
                description="Usuários, relatórios e configurações"
                icon={<Shield className="w-6 h-6 text-orange-500" />}
                to="/admin"
                variant="admin"
              />
            </div>
          </div>
        )}

        {!isStandalone && (
          <InstallPWACard isIOS={isIOS} />
        )}
      </div>
    </div>
  );
}
