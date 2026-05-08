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
    version: "1.36.3",
    date: "2026-05-08",
    title: "Restauração do Layout de Alerta",
    description: "Retorno ao padrão visual de alerta azul na parte inferior da tela.",
    changes: [
      { type: "improvement", text: "Restaurado layout azul de aviso de atualização na parte inferior" },
      { type: "fix", text: "Removida duplicidade de lógica de versionamento" },
    ],
  },
  {
    version: "1.36.2",
    date: "2026-05-08",
    title: "Alertas de Atualização Críticos",
    description: "Sistema de notificação de novas versões redesenhado para garantir que todos os usuários vejam as atualizações.",
    changes: [
      { type: "improvement", text: "Aviso de atualização agora aparece no topo da tela com cor de destaque (Amarelo)" },
      { type: "improvement", text: "Intervalo de verificação reduzido para detecção mais rápida" },
      { type: "fix", text: "Correção na lógica de cache para forçar o carregamento do novo código" },
    ],
  },
  {
    version: "1.36.1",
    date: "2026-05-08",
    title: "Sincronização de Versão",
    description: "Atualização forçada para sincronizar o cache do navegador com as últimas melhorias.",
    changes: [
      { type: "fix", text: "Ajuste no sistema de detecção de novas versões para contornar cache persistente" },
    ],
  },
  {
    version: "1.36.0",
    date: "2026-05-08",
    title: "Devolução em Lote",
    description: "Agora é possível selecionar várias ferramentas pendentes e registrar a devolução de todas de uma vez.",
    changes: [
      { type: "feature", text: "Novo modo 'Devolver várias' no card de Devoluções Pendentes com checkboxes e seleção múltipla" },
      { type: "feature", text: "Tela de devolução exibe a lista de ferramentas selecionadas e aplica observações/foto a todas" },
    ],
  },
  {
    version: "1.35.2",
    date: "2026-05-08",
    title: "TAG nas Devoluções Pendentes",
    description: "Cada item da lista de Devoluções Pendentes agora exibe a TAG da ferramenta ao lado do nome.",
    changes: [
      { type: "improvement", text: "Badge com TAG exibido junto ao nome da ferramenta na lista de devoluções pendentes" },
    ],
  },
  {
    version: "1.35.1",
    date: "2026-05-08",
    title: "Pré-seleção na Devolução",
    description: "Ao clicar em 'Registrar Devolução' no painel, a ferramenta agora vem selecionada automaticamente na próxima tela.",
    changes: [
      { type: "fix", text: "Corrigido fluxo que perdia a ferramenta selecionada ao redirecionar para a página de devolução" },
    ],
  },
  {
    version: "1.35.0",
    date: "2026-05-08",
    title: "Novo Layout de Devolução",
    description: "A página de 'Registrar Devolução' foi redesenhada para oferecer a mesma experiência e agilidade do registro de saída.",
    changes: [
      { type: "improvement", text: "Layout em duas colunas no desktop, idêntico à tela de saída (retirada)" },
      { type: "improvement", text: "Preenchimento automático inteligente: ao iniciar uma devolução, a ferramenta e a obra de origem são identificadas e exibidas automaticamente" },
      { type: "improvement", text: "Bloqueio automático do seletor quando a devolução é iniciada a partir de um atalho direto" },
      { type: "improvement", text: "Campo de 'Obra de Origem' agora é exibido de forma clara como somente leitura" },
      { type: "improvement", text: "Padronização total da nomenclatura para 'Registrar Devolução' em todo o sistema" },
    ],
  },
  {
    version: "1.34.0",
    date: "2026-05-08",
    title: "Indicadores Visuais de Pendências",
    description: "Novos badges coloridos na tela inicial para distinguir ferramentas em uso e ferramentas atrasadas.",
    changes: [
      { type: "feature", text: "Dois indicadores nos cards da tela inicial: amarelo para itens pendentes (no prazo) e vermelho para itens atrasados" },
      { type: "improvement", text: "Badges posicionados nos cantos superiores para facilitar a leitura rápida" },
      { type: "improvement", text: "Suporte aos novos indicadores tanto para Ferramentas quanto para Veículos" },
      { type: "improvement", text: "Atualização automática dos contadores a cada minuto" },
    ],
  },
  {
    version: "1.33.0",
    date: "2026-05-08",
    title: "Devolução Mais Rápida e Detalhes no Histórico",
    description: "Atalhos de devolução pré-selecionam a ferramenta e os detalhes de cada movimentação agora aparecem também no Meu Histórico.",
    changes: [
      { type: "improvement", text: "Indicador vermelho em 'Registrar Devolução' mostra o total de ferramentas pendentes do usuário" },
      { type: "improvement", text: "Ao clicar em 'Registrar Devolução' no painel, a ferramenta já vem selecionada na próxima tela" },
      { type: "improvement", text: "Botão renomeado para 'Registrar Devolução' para padronizar a nomenclatura" },
      { type: "feature", text: "Detalhes da movimentação agora estão disponíveis também no Meu Histórico (cada usuário pode ver os próprios)" },
      { type: "improvement", text: "TAG do equipamento incluída na tela de detalhes do Histórico Geral" },
    ],
  },
  {
    version: "1.32.0",
    date: "2026-05-05",
    title: "Resumo de KM nos Relatórios de Veículos",
    description: "Relatórios de veículos agora incluem um resumo com a quilometragem total rodada por veículo no período.",
    changes: [
      { type: "feature", text: "Nova seção de resumo no relatório de veículos com KM total rodado e quantidade de viagens por veículo" },
      { type: "improvement", text: "Resumo é exibido em página separada no PDF e em aba adicional no Excel" },
      { type: "improvement", text: "Plataformas são automaticamente excluídas do resumo (não possuem registro de KM)" },
      { type: "improvement", text: "Marca d'água 'Engemase' ajustada na diagonal dos relatórios PDF" },
    ],
  },
  {
    version: "1.30.0",
    date: "2026-04-27",
    title: "Notificações Mais Rápidas e Ponto Simplificado",
    description: "Redução no tempo de entrega de alertas e simplificação do registro de ponto para uso interno.",
    changes: [
      { type: "improvement", text: "Alertas automáticos agora são verificados a cada 10 minutos (antes era a cada 1 hora)" },
      { type: "improvement", text: "Módulo de Ponto simplificado: agora focado exclusivamente em 'Uso Interno'" },
      { type: "improvement", text: "Removida necessidade de selecionar obra ou cliente no registro de ponto" },
      { type: "improvement", text: "Removida validação de geofence (GPS) para maior agilidade no registro" },
    ],
  },
  {
    version: "1.29.0",
    date: "2026-04-21",
    title: "Navegação Mais Rápida e Acessibilidade Aprimorada",
    description: "Transição entre páginas quase instantânea e melhorias visuais para legibilidade e SEO.",
    changes: [
      { type: "improvement", text: "Troca de páginas muito mais rápida: o layout (menu, cabeçalho e notificações) não recarrega mais a cada navegação" },
      { type: "improvement", text: "Logo otimizada para carregamento mais rápido na tela de login" },
      { type: "improvement", text: "Cor primária ajustada para melhor contraste e leitura conforme padrões de acessibilidade" },
      { type: "improvement", text: "Link 'Criar conta' agora aparece sublinhado para melhor distinção visual" },
    ],
  },
  {
    version: "1.28.0",
    date: "2026-04-21",
    title: "Reforço de Segurança e Privacidade",
    description: "Auditoria OWASP aplicada: dados de contato dos clientes protegidos e políticas de armazenamento padronizadas.",
    changes: [
      { type: "security", text: "Dados sensíveis de clientes (e-mail, telefone, endereço) agora são acessíveis apenas para administradores" },
      { type: "security", text: "Listagem de clientes no Ponto passa a usar função segura que expõe somente nome e identificador" },
      { type: "security", text: "Políticas do bucket de imagens de ferramentas padronizadas com a verificação canônica de admin" },
      { type: "improvement", text: "Tabela de clientes blindada por RLS estrita, eliminando exposição de PII a usuários comuns" },
    ],
  },
  {
    version: "1.27.0",
    date: "2026-04-20",
    title: "Modo Offline Mais Confiável",
    description: "Correções importantes na sincronização offline e no cache para evitar perda de fotos e dados desatualizados.",
    changes: [
      { type: "fix", text: "Fotos do ponto de saída agora vão para a pasta correta" },
      { type: "fix", text: "Fotos pendentes não são mais apagadas quando há falhas de sincronização" },
      { type: "improvement", text: "Sincronização imediata ao registrar operação com conexão ativa" },
      { type: "security", text: "Cache do app não armazena mais respostas autenticadas que poderiam exibir dados de outros usuários" },
    ],
  },
  {
    version: "1.26.0",
    date: "2026-04-20",
    title: "Painel Administrativo Responsivo",
    description: "Layout do painel de Obras, Clientes, Ferramentas e Veículos totalmente adaptado para mobile, tablet e desktop.",
    changes: [
      { type: "improvement", text: "Cards no mobile e tabelas no desktop nas abas administrativas" },
      { type: "improvement", text: "Cabeçalhos padronizados com busca e ações alinhadas" },
      { type: "improvement", text: "Exibição da última sincronização real do Trello e Google Sheets" },
      { type: "fix", text: "Correção de desalinhamentos visuais nas abas de gerenciamento" },
    ],
  },
  {
    version: "1.25.0",
    date: "2026-04-16",
    title: "Modo Offline Robusto",
    description: "Reescrita completa do sistema offline com sincronização confiável, retry inteligente e Background Sync.",
    changes: [
      { type: "fix", text: "Correção do bug de perda de dados ao registrar ponto offline (mapeamento de IDs)" },
      { type: "feature", text: "Sincronização automática em segundo plano (Background Sync)" },
      { type: "improvement", text: "Fotos offline agora usam IndexedDB em todos os módulos" },
      { type: "improvement", text: "Retry inteligente com backoff exponencial e categorização de erros" },
      { type: "improvement", text: "Indicador offline mostra idade dos dados e operações pendentes" },
    ],
  },
  {
    version: "1.24.0",
    date: "2026-04-16",
    title: "Melhorias de Usabilidade e Histórico Unificado",
    description: "Botão devolver no card, rascunho automático de materiais e timeline consolidada.",
    changes: [
      { type: "feature", text: "Botão 'Devolver' direto no card da ferramenta em uso no Dashboard" },
      { type: "feature", text: "Página 'Meu Dia' com timeline unificada de ferramentas, veículos e ponto" },
      { type: "improvement", text: "Rascunho automático na solicitação de materiais" },
      { type: "improvement", text: "Badges de atraso nos cards de ferramentas e veículos do Dashboard" },
    ],
  },
  {
    version: "1.23.0",
    date: "2026-04-15",
    title: "Busca Global Mobile, Proteção de Formulários e Refatoração",
    description: "Busca acessível no mobile, alerta ao sair com dados não salvos e refatoração do módulo de Ponto.",
    changes: [
      { type: "feature", text: "Busca global disponível no mobile via ícone no header" },
      { type: "improvement", text: "Alerta ao sair de formulários com dados não salvos (Checkout, Checkin, Ponto)" },
      { type: "improvement", text: "PontoRegister refatorado em componentes menores (PontoEntryCard, PontoFormFields)" },
    ],
  },
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
