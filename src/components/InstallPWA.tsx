import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, X } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Check if previously dismissed this session
    if (sessionStorage.getItem("pwa-banner-dismissed")) {
      return;
    }

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    // On iOS, show manual instructions banner
    if (ios) {
      setShowBanner(true);
      return;
    }

    // On Android/Desktop, listen for the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      toast.success("App instalado com sucesso!");
    }

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    sessionStorage.setItem("pwa-banner-dismissed", "true");
  };

  if (!showBanner || dismissed) return null;

  return (
    <div className="w-full max-w-md mx-auto bg-card border rounded-xl shadow-lg p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <img src="/icon.png" alt="App" className="w-10 h-10 rounded-lg object-contain" />
          <div>
            <p className="font-semibold text-sm text-foreground">Instalar Gestão de Ativos</p>
            <p className="text-xs text-muted-foreground">Acesse mais rápido pela tela inicial</p>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {isIOS ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
          <Share className="w-4 h-4 shrink-0 text-primary" />
          <span>
            Toque em <strong className="text-foreground">Compartilhar</strong> e depois em{" "}
            <strong className="text-foreground">"Adicionar à Tela de Início"</strong>
          </span>
        </div>
      ) : (
        <Button onClick={handleInstallClick} className="w-full gap-2" size="sm">
          <Download className="h-4 w-4" />
          Instalar Aplicativo
        </Button>
      )}
    </div>
  );
}
