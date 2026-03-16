import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Car, Clock, Shield, Download, Share } from "lucide-react";
import { Link } from "react-router-dom";
import engemaseLogo from "@/assets/engemase-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function InstallPWACard({ isIOS }: { isIOS: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

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
    } else {
      setShowManualInstructions(true);
    }
  };

  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|OPR/.test(navigator.userAgent);

  return (
    <Card
      className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-primary border-dashed border-2"
      onClick={!isIOS ? handleInstall : undefined}
    >
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-accent/20">
          <Download className="w-8 h-8 text-accent-foreground" />
        </div>
        <CardTitle className="text-xl">Instalar Aplicativo</CardTitle>
        <CardDescription>
          {isIOS
            ? "Toque em Compartilhar e \"Adicionar à Tela de Início\""
            : showManualInstructions
              ? isChrome
                ? "No menu do Chrome (⋮), toque em \"Instalar aplicativo\" ou \"Adicionar à tela inicial\""
                : "No menu do navegador, toque em \"Adicionar à tela inicial\""
              : "Instale o app para acesso rápido pela tela inicial"}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {isIOS ? (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Share className="w-4 h-4" /> Compartilhar → Tela de Início
          </span>
        ) : showManualInstructions ? (
          <span className="text-sm text-muted-foreground">Use o menu do navegador ⋮</span>
        ) : (
          <span className="text-sm font-medium text-primary">Instalar →</span>
        )}
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
}

function ModuleCard({ title, description, icon, to, disabled, comingSoon, variant = "default" }: ModuleCardProps) {
  const isAdmin = variant === "admin";
  
  const content = (
    <Card className={`relative overflow-hidden transition-all duration-300 ${
      disabled 
        ? 'opacity-60 cursor-not-allowed' 
        : 'hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-primary'
    } ${isAdmin ? 'border-orange-500/50 bg-orange-500/5' : ''}`}>
      {comingSoon && (
        <div className="absolute top-3 right-3 bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Em Breve
        </div>
      )}
      <CardHeader className="text-center pb-2">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          isAdmin ? 'bg-orange-500/10' : 'bg-primary/10'
        }`}>
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {!disabled && (
          <span className={`text-sm font-medium ${isAdmin ? 'text-orange-500' : 'text-primary'}`}>
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

export default function Home() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 flex-1">
      <div className="text-center mb-6 sm:mb-8">
        <img src={engemaseLogo} alt="Engemase Engenharia" className="w-32 sm:w-48 h-auto mx-auto mb-3 sm:mb-4" />
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
          Bem-vindo, {profile?.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Selecione o módulo que deseja acessar
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-4xl w-full">
        <ModuleCard
          title="Controle de Ferramentas"
          description="Gerencie retiradas, devoluções e manutenções de ferramentas"
          icon={<Wrench className="w-8 h-8 text-primary" />}
          to="/ferramentas"
        />

        <ModuleCard
          title="Controle de Veículos"
          description="Registre entradas e saídas de veículos com quilometragem"
          icon={<Car className="w-8 h-8 text-primary" />}
          to="/veiculos"
        />

        {isAdmin && (
          <ModuleCard
            title="Ponto Online"
            description="Registre seus pontos de entrada e saída em atividades externas"
            icon={<Clock className="w-8 h-8 text-primary" />}
            to="/ponto"
          />
        )}

        {isAdmin && (
          <ModuleCard
            title="Painel Administrativo"
            description="Gerencie usuários, relatórios e configurações do sistema"
            icon={<Shield className="w-8 h-8 text-orange-500" />}
            to="/admin"
            variant="admin"
          />
        )}

        {!isStandalone && (
          <InstallPWACard isIOS={isIOS} />
        )}
      </div>
    </div>
  );
}
