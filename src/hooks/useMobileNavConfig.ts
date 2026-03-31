import { useState, useCallback } from "react";
import { Home, Wrench, Car, Clock, Shield, Settings, BarChart3, Package, History, Bell, Fuel } from "lucide-react";

export interface NavTabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  adminOnly?: boolean;
}

export const ALL_TAB_OPTIONS: NavTabItem[] = [
  { id: "home", label: "Início", icon: Home, path: "/" },
  { id: "ferramentas", label: "Ferramentas", icon: Wrench, path: "/ferramentas" },
  { id: "ferramentas-lista", label: "Lista Ferramentas", icon: Package, path: "/ferramentas/lista" },
  { id: "veiculos", label: "Veículos", icon: Car, path: "/veiculos" },
  { id: "veiculos-lista", label: "Lista Veículos", icon: Package, path: "/veiculos/lista" },
  { id: "combustivel", label: "Combustível", icon: Fuel, path: "/veiculos/combustivel" },
  { id: "ponto", label: "Ponto", icon: Clock, path: "/ponto" },
  { id: "historico-ferramentas", label: "Histórico Ferr.", icon: History, path: "/ferramentas/historico" },
  { id: "historico-veiculos", label: "Histórico Veíc.", icon: History, path: "/veiculos/historico" },
  { id: "admin", label: "Admin", icon: Shield, path: "/admin", adminOnly: true },
  { id: "admin-analytics", label: "Analytics", icon: BarChart3, path: "/admin/analytics", adminOnly: true },
  { id: "notificacoes", label: "Notificações", icon: Bell, path: "/admin/notifications", adminOnly: true },
];

const DEFAULT_TAB_IDS = ["home", "ferramentas", "veiculos", "ponto"];
const STORAGE_KEY = "mobile-tab-config";
const MAX_TABS = 4;

export function useMobileNavConfig() {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_TAB_IDS;
  });

  const save = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const reset = useCallback(() => {
    save(DEFAULT_TAB_IDS);
  }, [save]);

  const getSelectedTabs = useCallback(
    (isAdmin: boolean): NavTabItem[] => {
      return selectedIds
        .map((id) => ALL_TAB_OPTIONS.find((t) => t.id === id))
        .filter((t): t is NavTabItem => !!t && (!t.adminOnly || isAdmin));
    },
    [selectedIds]
  );

  return { selectedIds, save, reset, getSelectedTabs, maxTabs: MAX_TABS };
}
