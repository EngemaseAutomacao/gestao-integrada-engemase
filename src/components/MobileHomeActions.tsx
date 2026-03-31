import { Link } from "react-router-dom";
import { Wrench, Car, Clock, Package, ArrowDownToLine, ArrowUpFromLine, Fuel } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon: React.ElementType;
  to: string;
  color: string;
  bgColor: string;
}

const actions: QuickAction[] = [
  {
    label: "Retirar Ferramenta",
    icon: ArrowUpFromLine,
    to: "/ferramentas/retirada",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 border-blue-500/20",
  },
  {
    label: "Devolver Ferramenta",
    icon: ArrowDownToLine,
    to: "/ferramentas/devolucao",
    color: "text-green-600",
    bgColor: "bg-green-500/10 border-green-500/20",
  },
  {
    label: "Saída Veículo",
    icon: Car,
    to: "/veiculos/saida",
    color: "text-purple-600",
    bgColor: "bg-purple-500/10 border-purple-500/20",
  },
  {
    label: "Chegada Veículo",
    icon: Car,
    to: "/veiculos/chegada",
    color: "text-orange-600",
    bgColor: "bg-orange-500/10 border-orange-500/20",
  },
  {
    label: "Registrar Ponto",
    icon: Clock,
    to: "/ponto/registrar",
    color: "text-teal-600",
    bgColor: "bg-teal-500/10 border-teal-500/20",
  },
  {
    label: "Abastecer",
    icon: Fuel,
    to: "/veiculos/combustivel",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10 border-amber-500/20",
  },
];

export function MobileHomeActions() {
  return (
    <div className="w-full space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Ações Rápidas
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border transition-all active:scale-95",
              action.bgColor
            )}
          >
            <action.icon className={cn("w-5 h-5 shrink-0", action.color)} />
            <span className={cn("text-sm font-medium", action.color)}>
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
