export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: {
    type: "feature" | "improvement" | "fix" | "security";
    text: string;
  }[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "1.16.0",
    date: "2026-04-10",
    title: "Retenção de Dados",
    description: "Controle de limpeza automática de dados antigos.",
    changes: [
      { type: "feature", text: "Painel de controle de retenção de dados" },
      { type: "feature", text: "Limpeza automática de fotos e históricos antigos" },
      { type: "improvement", text: "Revisão geral de estabilidade do sistema" },
    ],
  },
  {
    version: "1.15.0",
    date: "2026-04-08",
    title: "Notificações e Histórico",
    description: "Melhorias nas notificações push e gestão de histórico.",
    changes: [
      { type: "feature", text: "Notificações push em tempo real mesmo com app fechado" },
      { type: "feature", text: "Exclusão de registros no histórico pelo administrador" },
      { type: "improvement", text: "Melhorias gerais de estabilidade" },
    ],
  },
  {
    version: "1.14.1",
    date: "2026-04-07",
    title: "Melhorias nas Transferências",
    description: "Ajustes no fluxo de transferência e notas de atualização.",
    changes: [
      { type: "feature", text: "Opção de cancelar transferências pendentes" },
      { type: "improvement", text: "Notas de atualização mais enxutas" },
      { type: "fix", text: "Correções de bugs gerais" },
    ],
  },
  {
    version: "1.14.0",
    date: "2026-04-07",
    title: "Transferência de Posse",
    description: "Transfira ferramentas e veículos entre usuários.",
    changes: [
      { type: "feature", text: "Transferência de posse de ferramentas e veículos" },
      { type: "feature", text: "Notificações automáticas nas transferências" },
      { type: "improvement", text: "Fluxo de aprovação pelo administrador" },
    ],
  },
  {
    version: "1.13.0",
    date: "2026-04-04",
    title: "Menus e Materiais",
    description: "Novos menus de módulos e solicitação de materiais.",
    changes: [
      { type: "feature", text: "Módulo de solicitação de materiais" },
      { type: "feature", text: "Menus visuais para cada módulo" },
      { type: "improvement", text: "Navegação mobile simplificada" },
    ],
  },
  {
    version: "1.12.1",
    date: "2026-04-02",
    title: "Correções na Sincronização",
    description: "Ajustes na sincronização com planilha.",
    changes: [
      { type: "improvement", text: "Gestão de ferramentas via Google Sheets" },
      { type: "fix", text: "Correções de quantidades incorretas" },
    ],
  },
  {
    version: "1.12.0",
    date: "2026-04-02",
    title: "Sincronização com Planilha",
    description: "Ferramentas sincronizadas automaticamente.",
    changes: [
      { type: "feature", text: "Sincronização com Google Sheets" },
      { type: "improvement", text: "Proteção de ferramentas em uso" },
    ],
  },
  {
    version: "1.11.2",
    date: "2026-04-02",
    title: "Correções de Notificações",
    description: "Notificações mais confiáveis.",
    changes: [
      { type: "fix", text: "Correção de notificações duplicadas" },
      { type: "improvement", text: "Maior confiabilidade no envio" },
    ],
  },
  {
    version: "1.11.0",
    date: "2026-04-02",
    title: "Fotos Offline",
    description: "Fotos salvas offline e enviadas ao reconectar.",
    changes: [
      { type: "feature", text: "Fotos offline para veículos" },
      { type: "improvement", text: "Melhorias no modo sem internet" },
    ],
  },
  {
    version: "1.10.9",
    date: "2026-04-01",
    title: "Dashboard de Veículos",
    description: "Nova interface do módulo de veículos.",
    changes: [
      { type: "improvement", text: "Redesign do dashboard de veículos" },
      { type: "fix", text: "Correções de notificações push" },
    ],
  },
  {
    version: "1.10.0",
    date: "2026-03-31",
    title: "Relatórios e Exportação",
    description: "Relatórios exportáveis em PDF e Excel.",
    changes: [
      { type: "feature", text: "Relatórios com exportação em PDF e Excel" },
      { type: "feature", text: "Filtros rápidos de período" },
      { type: "improvement", text: "Melhorias no painel administrativo" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-01",
    title: "Lançamento do Sistema",
    description: "Primeira versão do sistema de gestão integrada.",
    changes: [
      { type: "feature", text: "Controle de ferramentas com QR Code" },
      { type: "feature", text: "Retirada e devolução com assinatura" },
      { type: "feature", text: "Painel administrativo" },
      { type: "feature", text: "Funciona offline no celular" },
    ],
  },
];
