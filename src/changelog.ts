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
    version: "1.10.4",
    date: "2026-03-31",
    title: "Menu mobile e correções",
    description: "Melhorias no menu rápido do celular e organização interna.",
    changes: [
      { type: "feature", text: "Ajuda, Notas de Atualização e Alterar Senha acessíveis pelo menu 'Mais'" },
      { type: "fix", text: "Correção de rota duplicada que podia causar erro" },
      { type: "improvement", text: "Links antigos agora redirecionam automaticamente para os novos" },
    ],
  },
  {
    version: "1.10.3",
    date: "2026-03-31",
    title: "Visual mais uniforme",
    description: "Todas as telas dos módulos agora seguem o mesmo padrão visual.",
    changes: [
      { type: "improvement", text: "Telas de Veículos e Ponto com visual padronizado" },
      { type: "improvement", text: "Melhor aproveitamento do espaço no celular" },
      { type: "improvement", text: "Botões e cards com aparência uniforme em todos os módulos" },
    ],
  },
  {
    version: "1.10.2",
    date: "2026-03-31",
    title: "Detalhes da Ferramenta no Celular",
    description: "Página de detalhes da ferramenta mais fácil de usar no celular.",
    changes: [
      { type: "improvement", text: "Visualização de detalhes da ferramenta otimizada para celular" },
      { type: "improvement", text: "Histórico, manutenções e problemas mais compactos no celular" },
    ],
  },
  {
    version: "1.10.1",
    date: "2026-03-31",
    title: "Página de Ajuda e melhorias visuais",
    description: "Nova página de perguntas frequentes e melhorias na navegação.",
    changes: [
      { type: "feature", text: "Nova página de Ajuda com perguntas frequentes" },
      { type: "improvement", text: "Navegação e visual melhorados no celular" },
      { type: "fix", text: "Correção nos botões da personalização do menu" },
    ],
  },
  {
    version: "1.10.0",
    date: "2026-03-31",
    title: "Relatórios e melhorias no painel",
    description: "Novos relatórios exportáveis e melhorias na gestão de veículos.",
    changes: [
      { type: "feature", text: "Relatórios de veículos e combustível com exportação em PDF e Excel" },
      { type: "feature", text: "Filtros rápidos de período nos relatórios" },
      { type: "feature", text: "Confirmação de exclusão com motivo obrigatório" },
      { type: "feature", text: "Visualização dos seus veículos em uso com devolução rápida" },
    ],
  },
  {
    version: "1.9.1",
    date: "2026-03-31",
    title: "Notas de Atualização",
    description: "Agora você pode ver todas as novidades de cada versão.",
    changes: [
      { type: "feature", text: "Página com histórico completo de atualizações" },
      { type: "feature", text: "Aviso automático quando o sistema é atualizado" },
    ],
  },
  {
    version: "1.9.0",
    date: "2026-03-31",
    title: "Busca, resumos e atualizações em tempo real",
    description: "Novas funcionalidades para facilitar o dia a dia.",
    changes: [
      { type: "feature", text: "Resumo na tela inicial com ferramentas, veículos e ponto" },
      { type: "feature", text: "Busca rápida por ferramentas, veículos e usuários" },
      { type: "feature", text: "Movimentações atualizadas em tempo real" },
      { type: "feature", text: "Novos gráficos e métricas de uso de veículos" },
      { type: "security", text: "Maior rastreabilidade nas exclusões" },
    ],
  },
  {
    version: "1.8.8",
    date: "2026-03-30",
    title: "Melhorias de navegação",
    description: "Navegação mais fluida nas páginas de listagem e histórico.",
    changes: [
      { type: "improvement", text: "Cabeçalho fixo com rolagem apenas no conteúdo" },
      { type: "improvement", text: "Visual mais consistente nas páginas de administração" },
    ],
  },
  {
    version: "1.8.0",
    date: "2026-03-28",
    title: "Ponto Online e Fotos de Veículos",
    description: "Novo módulo de ponto eletrônico e fotos na movimentação de veículos.",
    changes: [
      { type: "feature", text: "Registro de ponto online com localização" },
      { type: "feature", text: "Fotos do veículo na saída e na entrada" },
      { type: "feature", text: "Notificações no celular sobre suas movimentações" },
      { type: "improvement", text: "Galeria de imagens no painel administrativo" },
    ],
  },
  {
    version: "1.7.0",
    date: "2026-03-25",
    title: "Controle de Veículos",
    description: "Novo módulo para gerenciar a frota de veículos da empresa.",
    changes: [
      { type: "feature", text: "Cadastro e controle de veículos" },
      { type: "feature", text: "Registro de saída e entrada com quilometragem" },
      { type: "feature", text: "Controle de abastecimentos" },
      { type: "feature", text: "Gráficos de uso dos veículos" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-01",
    title: "Lançamento do Sistema",
    description: "Primeira versão do sistema de gestão integrada.",
    changes: [
      { type: "feature", text: "Controle de ferramentas com QR Code" },
      { type: "feature", text: "Retirada e devolução com assinatura e foto" },
      { type: "feature", text: "Painel administrativo com relatórios" },
      { type: "feature", text: "Login com aprovação de cadastro" },
      { type: "feature", text: "Funciona no celular mesmo sem internet" },
    ],
  },
];
