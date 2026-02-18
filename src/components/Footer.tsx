import { Wrench } from "lucide-react";
import { APP_VERSION } from "@/version";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-card/50 backdrop-blur-sm py-3 px-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-primary" />
          <span>Sistema de Gestão de Ativos</span>
        </div>
        <div className="flex items-center gap-4">
          <span>© {currentYear} Engemase Engenharia</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">v{APP_VERSION}</span>
        </div>
      </div>
    </footer>
  );
}
