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
    version: "1.13.0",
    date: "2026-04-04",
    title: "Menus de módulos, materiais e melhorias no ponto",
    description: "Cada módulo agora tem sua própria tela de menu com acesso rápido a todas as funcionalidades.",
    changes: [
      { type: "feature", text: "Novos menus visuais com cards para Ferramentas, Veículos, Ponto, Materiais e Administração" },
      { type: "feature", text: "Módulo de Solicitação de Materiais com lista de itens e seleção de obra" },
      { type: "feature", text: "Registro de ponto agora permite vincular a uma obra" },
      { type: "improvement", text: "Seletor de obras com autocomplete em todos os módulos (Ferramentas, Veículos, Ponto e Materiais)" },
      { type: "improvement", text: "Navegação mobile simplificada — barra inferior mostra apenas os módulos principais" },
      { type: "improvement", text: "Menu do cabeçalho desktop simplificado, sem dropdown de sub-páginas" },
      { type: "improvement", text: "Cards dos menus com altura uniforme no celular" },
      { type: "improvement", text: "Título do cabeçalho mobile centralizado corretamente" },
      { type: "improvement", text: "Card de Administração centralizado na tela inicial" },
    ],
  },
  {
    version: "1.12.1",
    date: "2026-04-02",
    title: "Correções na sincronização e gestão somente leitura",
    description: "Ferramentas e obras agora são gerenciadas exclusivamente pela sincronização com a planilha.",
    changes: [
      { type: "improvement", text: "Ferramentas e obras agora são gerenciadas apenas pela sincronização com o Google Sheets" },
      { type: "improvement", text: "Ferramentas com quantidade 0 aparecem como 'Indisponível' no sistema" },
      { type: "fix", text: "Corrigido bug onde ferramentas com quantidade 0 na planilha apareciam com quantidade 1" },
      { type: "improvement", text: "Removidas opções de edição manual de ferramentas e obras no painel admin" },
    ],
  },
  {
    version: "1.12.0",
    date: "2026-04-02",
    title: "Sincronização com Google Sheets",
    description: "Reativada a funcionalidade de sincronização do catálogo de ferramentas com o Google Sheets.",
    changes: [
      { type: "feature", text: "Botão de sincronização com Google Sheets na página de ferramentas do admin" },
      { type: "feature", text: "Importa, atualiza e remove ferramentas automaticamente com base na planilha" },
      { type: "improvement", text: "Ferramentas com checkouts ativos não são removidas na sincronização" },
    ],
  },
  {
    version: "1.11.2",
    date: "2026-04-02",
    title: "Correção definitiva de notificações vazias",
    description: "Removido sistema duplicado que causava notificações vazias e repetidas.",
    changes: [
      { type: "fix", text: "Removido gatilho duplicado que enviava notificações vazias ao dispositivo" },
      { type: "fix", text: "Notificações push agora são enviadas apenas pelo sistema principal, sem duplicidade" },
      { type: "improvement", text: "Maior confiabilidade no envio de notificações push" },
    ],
  },
  {
    version: "1.11.1",
    date: "2026-04-02",
    title: "Notificações em segundo plano e correções",
    description: "As notificações automáticas agora chegam mesmo com o app fechado, e notificações vazias foram eliminadas.",
    changes: [
      { type: "feature", text: "Notificações push agora chegam mesmo com o app fechado ou em segundo plano" },
      { type: "improvement", text: "Alertas automáticos (uso prolongado, atraso na devolução, etc.) agora enviam push diretamente ao dispositivo" },
      { type: "fix", text: "Notificações vazias ou sem conteúdo não são mais exibidas" },
    ],
  },
  {
    version: "1.11.0",
    date: "2026-04-02",
    title: "Fotos offline e melhorias no modo sem internet",
    description: "Agora as fotos de veículos são salvas no dispositivo quando você está sem internet e enviadas automaticamente ao reconectar.",
    changes: [
      { type: "feature", text: "Fotos de veículos agora são salvas no dispositivo quando offline e enviadas ao reconectar" },
      { type: "improvement", text: "Dados em cache não expiram mais — ficam salvos até uma nova versão do app" },
      { type: "improvement", text: "Indicador offline agora mostra quantas fotos estão salvas localmente" },
      { type: "improvement", text: "Botão de envio funciona offline mesmo sem todas as fotos" },
      { type: "improvement", text: "Limpeza automática das fotos locais após sincronização bem-sucedida" },
    ],
  },
  {
    version: "1.10.9",
    date: "2026-04-01",
    title: "Dashboard de veículos e notificações",
    description: "Nova interface do módulo de veículos e correção de notificações duplicadas.",
    changes: [
      { type: "improvement", text: "Dashboard de veículos redesenhado com lista pesquisável, igual ao de ferramentas" },
      { type: "improvement", text: "Botões de veículos agora mostram 'Registrar Saída' e 'Registrar Devolução'" },
      { type: "fix", text: "Corrigido problema de notificações push duplicadas e vazias" },
      { type: "fix", text: "Limpeza automática de assinaturas push antigas para evitar notificações repetidas" },
    ],
  },
  {
    version: "1.10.7",
    date: "2026-04-01",
    title: "Alertas de veículos, modo escuro e tutorial",
    description: "Alertas automáticos para veículos atrasados, modo escuro refinado e tutorial para novos usuários.",
    changes: [
      { type: "feature", text: "Alerta automático quando veículo passa da hora estimada de retorno" },
      { type: "feature", text: "Tutorial de onboarding interativo para novos usuários" },
      { type: "improvement", text: "Modo escuro com cores mais refinadas e melhor contraste" },
      { type: "improvement", text: "Notificações enviadas ao motorista e administradores sobre atraso" },
    ],
  },
  {
    version: "1.10.6",
    date: "2026-04-01",
    title: "Sincronização inteligente e melhorias visuais",
    description: "Obras removidas do Trello são desativadas automaticamente e a interface ficou mais organizada.",
    changes: [
      { type: "feature", text: "Obras removidas da coluna 'Fazendo' no Trello são desativadas automaticamente" },
      { type: "improvement", text: "Barra de pesquisa centralizada no cabeçalho do desktop" },
      { type: "improvement", text: "Resumo de ferramentas, veículos e ponto centralizado na tela inicial" },
    ],
  },
  {
    version: "1.10.5",
    date: "2026-04-01",
    title: "Integração Trello e ordenação de obras",
    description: "As obras agora são sincronizadas automaticamente do Trello e a lista foi reordenada.",
    changes: [
      { type: "feature", text: "Sincronização automática de obras a partir do quadro Trello (a cada 5 minutos)" },
      { type: "improvement", text: "Lista de obras ordenada do mais recente para o mais antigo (2026 → 2023)" },
      { type: "improvement", text: "Botão de sincronização manual do Trello na Gestão de Obras" },
    ],
  },
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
