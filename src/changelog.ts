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
    version: "1.10.2",
    date: "2026-03-31",
    title: "Detalhes da Ferramenta - Layout Mobile",
    description: "Melhoria do layout da página de detalhes das ferramentas para dispositivos móveis.",
    changes: [
      { type: "improvement", text: "Layout responsivo otimizado na página de detalhes da ferramenta" },
      { type: "improvement", text: "Cards de histórico de uso, manutenções e problemas compactos no mobile" },
      { type: "improvement", text: "Botão 'Reportar Problema' em largura total no mobile" },
      { type: "improvement", text: "Tipografia e espaçamentos ajustados para telas pequenas" },
    ],
  },
  {
    version: "1.10.1",
    date: "2026-03-31",
    title: "Padronização Mobile e Página de Ajuda",
    description: "Layout mobile padronizado em todos os módulos, botão de ajuda no cabeçalho e página de FAQ.",
    changes: [
      { type: "feature", text: "Página de Ajuda (FAQ) acessível pelo ícone no cabeçalho" },
      { type: "improvement", text: "Layout mobile padronizado em todos os dashboards (Ferramentas, Veículos, Admin)" },
      { type: "fix", text: "Botões de salvar/padrão fixos na página de personalização do menu mobile" },
      { type: "improvement", text: "Cards de estatísticas compactos e responsivos em todos os módulos" },
      { type: "improvement", text: "Cards do painel Admin com layout centralizado igual ao módulo Ponto" },
    ],
  },
  {
    version: "1.10.0",
    date: "2026-03-31",
    title: "Relatórios, Exclusão com Motivo e Dashboard do Usuário",
    description: "Exportação de relatórios aprimorada, confirmação de exclusão com motivo para auditoria e dashboard com itens em uso do usuário.",
    changes: [
      { type: "feature", text: "Relatórios de veículos e combustível com exportação PDF/Excel" },
      { type: "feature", text: "Filtros rápidos de período nos relatórios (7 dias, 30 dias, este mês, mês passado, este ano)" },
      { type: "feature", text: "Confirmação de exclusão com campo de motivo obrigatório (ferramentas e veículos)" },
      { type: "improvement", text: "Motivo da exclusão registrado nos logs de auditoria" },
      { type: "feature", text: "Seção 'Meus Veículos em Uso' no dashboard de veículos com botão de devolução rápida" },
    ],
  },
  {
    version: "1.9.1",
    date: "2026-03-31",
    title: "Notas de Atualização",
    description: "Sistema de changelog com página dedicada e modal automático.",
    changes: [
      { type: "feature", text: "Página de changelog (/changelog) com histórico completo de versões" },
      { type: "feature", text: "Modal automático ao atualizar mostrando novidades da versão" },
      { type: "improvement", text: "Link clicável da versão no rodapé para acessar o changelog" },
    ],
  },
  {
    version: "1.9.0",
    date: "2026-03-31",
    title: "Melhorias Gerais do Sistema",
    description: "Novas funcionalidades de busca, resumo, analytics e auditoria.",
    changes: [
      { type: "feature", text: "Cards resumo na tela inicial (ferramentas em uso, veículos fora, ponto aberto)" },
      { type: "feature", text: "Busca global no header para ferramentas, veículos e usuários" },
      { type: "feature", text: "Realtime ativado para movimentações de ferramentas e veículos" },
      { type: "feature", text: "Analytics enriquecido com métricas e gráficos de veículos (KM rodado)" },
      { type: "security", text: "Triggers de auditoria para exclusão de ferramentas e veículos" },
    ],
  },
  {
    version: "1.8.8",
    date: "2026-03-30",
    title: "Melhorias de Layout e Scroll",
    description: "Padrão de scroll fixo aplicado em todas as páginas de histórico e listagem.",
    changes: [
      { type: "improvement", text: "Cabeçalho e rodapé fixos com scroll apenas na lista em todas as páginas" },
      { type: "improvement", text: "Layout consistente em AdminTools, AdminMaintenance, AdminIssues e Ponto" },
    ],
  },
  {
    version: "1.8.0",
    date: "2026-03-28",
    title: "Sistema de Ponto Online e Veículos",
    description: "Módulo completo de controle de ponto e melhorias no módulo de veículos.",
    changes: [
      { type: "feature", text: "Módulo de ponto online com registro de entrada/saída e geolocalização" },
      { type: "feature", text: "Fotos de veículos (5 de saída e 5 de entrada) com dashboard e painel" },
      { type: "feature", text: "Sistema de notificações push com criptografia VAPID" },
      { type: "improvement", text: "Galeria de imagens no painel administrativo" },
    ],
  },
  {
    version: "1.7.0",
    date: "2026-03-25",
    title: "Módulo de Veículos",
    description: "Controle completo de entrada e saída de veículos da empresa.",
    changes: [
      { type: "feature", text: "Cadastro e gerenciamento de veículos" },
      { type: "feature", text: "Checkout/checkin de veículos com quilometragem" },
      { type: "feature", text: "Registro de abastecimentos com histórico" },
      { type: "feature", text: "Analytics de uso de veículos" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-01",
    title: "Lançamento Inicial",
    description: "Sistema de gestão integrada para controle de ferramentas.",
    changes: [
      { type: "feature", text: "Cadastro e controle de ferramentas com QR Code" },
      { type: "feature", text: "Sistema de retirada e devolução com assinatura e foto" },
      { type: "feature", text: "Painel administrativo com analytics e relatórios" },
      { type: "feature", text: "Autenticação com aprovação de usuários" },
      { type: "feature", text: "PWA com suporte offline" },
    ],
  },
];
