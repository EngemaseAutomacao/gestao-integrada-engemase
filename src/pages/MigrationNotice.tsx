import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export const NEW_APP_URL = "https://gestao-integrada-engemase.vercel.app/";
const SECONDS = 30;

/** Aviso de migração exibido somente no endereço antigo (lovable.app). */
export default function MigrationNotice() {
  const [left, setLeft] = useState(SECONDS);
  const target = NEW_APP_URL.replace(/\/$/, "") + window.location.pathname + window.location.search;

  useEffect(() => {
    if (left <= 0) {
      window.location.replace(target);
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, target]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-xl border bg-card p-8 text-center shadow-sm space-y-5">
        <h1 className="text-2xl font-bold text-foreground">O sistema mudou de endereço</h1>
        <p className="text-muted-foreground">
          A Gestão Integrada Engemase agora está em um novo endereço. Salve o novo link nos seus favoritos.
        </p>
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-left text-sm text-foreground space-y-2">
          <p className="font-semibold">Usa o app instalado no celular?</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Desinstale o app antigo (segure o ícone e toque em "Desinstalar" ou "Remover").</li>
            <li>Abra o novo endereço abaixo no navegador.</li>
            <li>Instale o app novamente pelo menu do navegador ("Instalar app" ou "Adicionar à tela inicial").</li>
          </ol>
        </div>
        <p className="font-medium text-primary break-all">{NEW_APP_URL}</p>
        <Button className="w-full" onClick={() => window.location.replace(target)}>
          Ir para o novo endereço <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Redirecionando automaticamente em {Math.max(left, 0)}s...
        </p>
      </div>
    </main>
  );
}
