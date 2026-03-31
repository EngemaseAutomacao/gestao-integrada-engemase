import { changelog } from "@/changelog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Zap, Bug, Shield } from "lucide-react";
import { APP_VERSION } from "@/version";

const typeConfig = {
  feature: { label: "Novo", icon: Sparkles, className: "bg-primary/10 text-primary border-primary/20" },
  improvement: { label: "Melhoria", icon: Zap, className: "bg-chart-2/10 text-chart-2 border-chart-2/20" },
  fix: { label: "Correção", icon: Bug, className: "bg-destructive/10 text-destructive border-destructive/20" },
  security: { label: "Segurança", icon: Shield, className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
};

export default function Changelog() {
  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Notas de Atualização</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Versão atual: <span className="font-semibold text-primary">{APP_VERSION}</span>
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {changelog.map((entry) => {
          const isCurrent = entry.version === APP_VERSION;
          return (
            <Card key={entry.version} className={isCurrent ? "border-primary/50 shadow-md" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">v{entry.version}</CardTitle>
                    {isCurrent && (
                      <Badge variant="default" className="text-[10px]">Atual</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                </div>
                <p className="text-sm font-medium">{entry.title}</p>
                <p className="text-xs text-muted-foreground">{entry.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {entry.changes.map((change, i) => {
                    const config = typeConfig[change.type];
                    const Icon = config.icon;
                    return (
                      <li key={i} className="flex items-start gap-2">
                        <Badge variant="outline" className={`shrink-0 text-[10px] gap-1 ${config.className}`}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                        <span className="text-sm">{change.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
