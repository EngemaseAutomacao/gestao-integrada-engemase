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
    version: "1.22.0",
    date: "2026-04-15",
    title: "Otimizações de Performance, Segurança e Acessibilidade",
    description: "Melhorias baseadas em auditoria técnica: compressão de fotos, cache com expiração, proteção em produção e acessibilidade.",
    changes: [
      { type: "improvement", text: "Compressão automática de fotos no módulo de Ponto (reduz de 3-8MB para ~300KB)" },
      { type: "improvement", text: "routeTitleMap otimizado como constante de módulo (menos alocações de memória)" },
      { type: "security", text: "Cache de perfil no localStorage agora expira após 24 horas" },
      { type: "security", text: "ErrorBoundary não exibe stack trace em produção" },
      { type: "improvement", text: "Botões de ícone com rótulos acessíveis (aria-label)" },
      { type: "feature", text: "Instrução de instalação PWA para dispositivos iOS" },
      { type: "improvement", text: "Mensagem mais clara em módulos restritos" },
    ],
  },
  {
    version: "1.21.0",
    date: "2026-04-13",
    title: "Melhorias no Módulo de Ponto e Clientes",
    description: "Registro de ponto com fotos, validação de localização por obra e cadastro simplificado de clientes.",
    changes: [
      { type: "feature", text: "Registro fotográfico obrigatório ao bater ponto" },
      { type: "feature", text: "Validação de GPS com alerta ao registrar ponto fora da área da obra" },
      { type: "feature", text: "Opção de registro de ponto por Obra ou por Cliente" },
      { type: "improvement", text: "Cadastro de clientes simplificado com nome e endereço" },
    ],
  },
  {
    version: "1.20.0",
    date: "2026-04-13",
    title: "Refatoração e Qualidade de Código",
    description: "Centralização de lógica duplicada, tipos de domínio, tratamento de erros global e compressão de imagens.",
    changes: [
      { type: "improvement", text: "Tipos de domínio centralizados em src/types/domain.ts — elimina interfaces duplicadas" },
      { type: "improvement", text: "Geolocalização e geocoding centralizados (useGeolocation + lib/geocoding)" },
      { type: "improvement", text: "Hook useActiveConstructionSites evita queries duplicadas de obras" },
      { type: "improvement", text: "Utilitário de compressão de imagens para reduzir uploads de 3-5MB para ~300KB" },
      { type: "improvement", text: "Tratamento de erros global no QueryClient com mensagens amigáveis em português" },
      { type: "fix", text: "Removidos componentes não utilizados (Breadcrumbs, UserUsageChart)" },
    ],
  },
  {
    version: "1.19.0",
    date: "2026-04-12",
    title: "Performance e Estabilidade",
    description: "Melhorias de performance no carregamento e maior estabilidade geral do sistema.",
    changes: [
      { type: "improvement", text: "Carregamento mais rápido com lazy loading em todas as páginas" },
      { type: "improvement", text: "Tela de erro amigável em caso de falhas inesperadas" },
      { type: "improvement", text: "Código de upload de imagens centralizado e otimizado" },
    ],
  },
  {
    version: "1.18.0",
    date: "2026-04-10",
    title: "Badges de Urgência e Exportação nos Dashboards",
    description: "Indicadores visuais de pendências nos módulos e exportação PDF/Excel nos painéis de ferramentas e veículos.",
    changes: [
      { type: "feature", text: "Badges vermelhos nos cards de Ferramentas e Veículos indicando devoluções atrasadas e problemas abertos" },
      { type: "feature", text: "Exportação para PDF e Excel no dashboard de ferramentas" },
      { type: "feature", text: "Exportação para PDF e Excel no dashboard de veículos" },
      { type: "improvement", text: "Hook reutilizável useUrgencyBadges com atualização automática a cada minuto" },
      { type: "improvement", text: "Utilitário centralizado de exportação (exportUtils) para PDF e Excel" },
    ],
  },
  {
    version: "1.17.0",
    date: "2026-04-10",
    title: "Filtros Avançados, Sync Queue e Auditoria",
    description: "Melhorias significativas em filtros, modo offline e painel de auditoria.",
    changes: [
      { type: "feature", text: "Filtros avançados por período, categoria e status em todos os históricos" },
      { type: "feature", text: "Botão de limpar filtros nos históricos" },
      { type: "feature", text: "Fila de sincronização offline visível com status de cada operação" },
      { type: "feature", text: "Painel de Auditoria com registro detalhado de todas as ações do sistema" },
      { type: "feature", text: "Exportação de relatório de auditoria em PDF e Excel" },
      { type: "improvement", text: "Busca nos históricos agora inclui pesquisa por obra" },
      { type: "improvement", text: "Filtro de categoria de sócios adicionado ao histórico de ferramentas" },
    ],
  },
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
