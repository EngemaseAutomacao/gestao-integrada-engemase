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
    version: "1.46.0",
    date: "2026-06-20",
    title: "Cache do app mais robusto contra telas em branco após atualização",
    description: "O motor que cuida do cache do aplicativo foi modernizado: agora cada arquivo tem uma 'impressão digital' única gerada a cada nova versão, eliminando a chance do app ficar travado servindo arquivos antigos depois de uma atualização (causa comum de tela em branco). Todas as funcionalidades atuais — notificações push agrupadas, sincronização offline, lembretes em segundo plano e o banner de 'Atualizar' — continuam funcionando exatamente como antes.",
    changes: [
      { type: "improvement", text: "Cache de arquivos do app agora é versionado automaticamente a cada deploy (reduz risco de tela em branco)" },
      { type: "improvement", text: "Registro do Service Worker centralizado em wrapper único — nunca registra em ambientes de preview/desenvolvimento" },
      { type: "improvement", text: "Limpeza automática de caches obsoletos após cada nova versão" },
    ],
  },


  {
    version: "1.45.1",
    date: "2026-06-20",
    title: "Correção: usuários antigos não precisam mais trocar senha",
    description: "Quando a funcionalidade de 'primeiro acesso' foi adicionada, ela marcou todos os perfis existentes como se fossem novos — forçando até quem já usava o sistema há tempos a trocar a senha. Agora todo usuário que já logou pelo menos uma vez deixou de ver essa tela. Também foi agendada uma limpeza mensal de assinaturas de notificação inativas.",
    changes: [
      { type: "fix", text: "Usuários que já haviam logado pelo menos uma vez não veem mais a tela de troca de senha obrigatória" },
      { type: "improvement", text: "Limpeza mensal automática de assinaturas de notificação push sem uso há mais de 60 dias" },
    ],
  },

  {
    version: "1.45.0",
    date: "2026-06-20",
    title: "Notificações mais confiáveis, app mais rápido e backend mais seguro",
    description: "Reforço amplo no sistema: as notificações ficam mais rápidas e resilientes (com nova tentativa automática em caso de queda de rede), o banco de dados foi blindado para que funções internas só rodem pelo próprio sistema, listagens longas (notificações, histórico, retiradas) ficam mais ágeis com novos índices, e o app principal carrega mais rápido por dividir bibliotecas grandes em pacotes separados. Notificações importantes (aprovações, transferências, problemas resolvidos) agora ficam guardadas por 90 dias em vez de 7.",
    changes: [
      { type: "security", text: "Removida chave fixa do gatilho de envio de push — agora resistente a rotação de chaves" },
      { type: "security", text: "Funções internas (gatilhos, verificações automáticas, auditoria) não podem mais ser chamadas diretamente por usuários logados" },
      { type: "improvement", text: "Envio de push faz até 3 tentativas com espera progressiva quando a rede oscila" },
      { type: "improvement", text: "Notificações importantes (conta aprovada, transferências, problemas resolvidos) ficam guardadas por 90 dias" },
      { type: "improvement", text: "Novos índices aceleram listagem de notificações, retiradas atrasadas e histórico do sistema" },
      { type: "improvement", text: "Pacotes pesados (gráficos, animações, leitor de QR, ícones) carregam separadamente, deixando a abertura do app mais leve" },
      { type: "improvement", text: "Verificação automática de pendências reduzida de cada 10min para cada 15min (menos carga, mesma cobertura)" },
      { type: "improvement", text: "Registro de último uso por assinatura de push (base para futura limpeza de inativas)" },
    ],
  },

  {
    version: "1.44.0",
    date: "2026-06-20",
    title: "Mais cara de app: badge no ícone, vibração, compartilhar e lembretes",
    description: "O app agora se comporta mais como um aplicativo nativo: o ícone na tela inicial mostra um número de notificações não lidas (como WhatsApp), vibra ao confirmar ações importantes, permite compartilhar comprovantes de retirada/devolução por qualquer app instalado, agenda lembretes locais antes da devolução prevista e (em Android) sincroniza pendências em segundo plano.",
    changes: [
      { type: "feature", text: "Badge de notificações não lidas no ícone do app (suportado em Android e desktop)" },
      { type: "feature", text: "Botão 'Compartilhar' nos avisos de retirada e devolução de ferramentas" },
      { type: "feature", text: "Vibração leve ao confirmar saída/devolução de ferramentas" },
      { type: "feature", text: "Lembrete local automático 1 hora antes do horário previsto de devolução" },
      { type: "feature", text: "Sincronização periódica em segundo plano da fila offline (Android com permissão)" },
      { type: "improvement", text: "Download da Galeria pergunta onde salvar quando o navegador suporta (File System Access)" },
    ],
  },

  {
    version: "1.43.1",
    date: "2026-06-20",
    title: "Limpeza: páginas não utilizadas removidas",
    description: "Removidas seis telas antigas que já tinham sido substituídas por novas versões e ainda ficavam carregando código no fundo. O app fica mais leve, mais rápido para abrir e nada muda visualmente.",
    changes: [
      { type: "improvement", text: "Removidas telas legadas de Ferramentas (lista antiga), Histórico de Usuário, Lista e Histórico de Veículos, Painel de Ponto e Histórico de Ponto — todas já redirecionadas para as novas telas há tempos" },
      { type: "improvement", text: "Bundle reduzido e tempo de carregamento ligeiramente menor" },
    ],
  },

  {
    version: "1.43.0",
    date: "2026-06-20",
    title: "Modo Offline Híbrido: leitura, escrita e fila de pendências",
    description: "Agora o app continua funcional sem internet. As listas já vistas ficam disponíveis para consulta, retiradas/devoluções de ferramentas, ponto e relatos de problema podem ser feitos offline e enviados automaticamente ao reconectar. Há também uma nova tela 'Pendências' para acompanhar e refazer envios que falharam.",
    changes: [
      { type: "feature", text: "Leitura offline: ferramentas, veículos, obras e histórico abrem sem internet (dados em cache local por até 24h)" },
      { type: "feature", text: "Nova página /pendencias com a lista de envios aguardando sincronização e ações de 'Tentar novamente' ou 'Descartar'" },
      { type: "improvement", text: "Falhas permanentes podem ser reenviadas manualmente, sem precisar refazer a operação" },
      { type: "improvement", text: "Indicador de conexão no cabeçalho mostra contador de pendências" },
    ],
  },

  {
    version: "1.41.1",
    date: "2026-06-19",
    title: "Limpeza Interna: Código Duplicado Centralizado",
    description: "Manutenção técnica sem mudança visual: utilitários repetidos foram unificados para facilitar manutenção futura e reduzir o tamanho do app.",
    changes: [
      { type: "improvement", text: "Componente MenuCard unificado entre menus de Ferramentas e Veículos" },
      { type: "improvement", text: "Função formatDuration centralizada para as telas de Ponto" },
      { type: "improvement", text: "Helpers de Storage (detectBucket, extractStoragePath) unificados em um único módulo" },
    ],
  },

  {
    version: "1.41.0",
    date: "2026-06-19",
    title: "Tour Guiado no Primeiro Login (driver.js)",
    description: "Novos usuários agora recebem um tour interativo apontando para cada módulo da tela inicial. Os passos se adaptam ao papel: Admin vê todos os módulos incluindo Administração, Funcionário Engemase vê tudo exceto Administração, e Terceiro vê apenas os módulos pertinentes (sem Ponto Online e sem Admin).",
    changes: [
      { type: "feature", text: "Tour guiado interativo com setas e destaques nos cards reais da Home (driver.js)" },
      { type: "feature", text: "Passos personalizados por papel: Admin (9 passos), Funcionário Engemase (8 passos), Terceiro (7 passos)" },
      { type: "feature", text: "Inclui dica sobre a Busca Rápida (Ctrl + K) e finaliza marcando o primeiro login como concluído automaticamente" },
      { type: "improvement", text: "Modal antigo de boas-vindas substituído por experiência guiada in-context, mais clara para usuários novos" },
    ],
  },

  {
    version: "1.40.0",
    date: "2026-06-19",
    title: "Notificações Agrupadas e Sincronização Offline Confirmada",
    description: "Notificações push do mesmo tipo agora são agrupadas em uma única (\"Você tem N novas notificações\") em vez de empilhar várias. A sincronização offline real com fila de fotos no IndexedDB foi auditada e validada — checkin/checkout 100% offline já está em produção.",
    changes: [
      { type: "improvement", text: "Notificações push do mesmo grupo são consolidadas: chega 1 só notificação dizendo \"Você tem N novas notificações\"" },
      { type: "improvement", text: "Confirmada e auditada a sincronização offline de fotos (ferramentas, veículos e ponto) via IndexedDB com upload automático ao voltar a conexão" },
      { type: "fix", text: "Notificações agora usam renotify para vibrar/avisar mesmo quando agrupadas" },
    ],
  },

  {
    version: "1.39.0",
    date: "2026-06-19",
    title: "Monitoramento de Erros e Preparação para Múltiplos Idiomas",
    description: "Infraestrutura interna para detectar falhas em produção automaticamente (Sentry, opcional) e base pronta para tradução do sistema para outros idiomas no futuro.",
    changes: [
      { type: "improvement", text: "Integração opcional com Sentry para capturar erros em produção (basta configurar a variável VITE_SENTRY_DSN)" },
      { type: "improvement", text: "Infraestrutura de internacionalização (i18n) preparada — sistema continua em Português do Brasil, mas pronto para tradução futura" },
      { type: "improvement", text: "Erros do preview do editor são automaticamente ignorados pelo monitoramento para não gerar ruído" },
    ],
  },

  {
    version: "1.38.0",
    date: "2026-06-19",
    title: "Skeletons em Todas as Telas Principais e Exportação no Histórico de Ponto",
    description: "Telas de histórico e administração agora exibem esqueletos de carregamento (mais rápidas visualmente) e o histórico de ponto e o meu histórico unificado ganharam exportação em PDF e Excel.",
    changes: [
      { type: "feature", text: "Exportação em PDF e Excel no Histórico de Ponto, com totais de horas no cabeçalho" },
      { type: "feature", text: "Exportação em PDF e Excel no Meu Histórico Unificado (ferramentas, veículos e ponto)" },
      { type: "improvement", text: "Skeleton de carregamento substitui o spinner em: Histórico Geral, Histórico de Veículos, Meu Histórico, Histórico de Ponto, Painel de Ponto, Auditoria e Analytics" },
      { type: "improvement", text: "Sensação de carregamento mais rápida e sem flashes de tela em conexões lentas" },
    ],
  },

  {
    version: "1.37.0",
    date: "2026-06-19",
    title: "Busca Rápida (Ctrl+K), Listas Mais Leves e Exportação de Logs",
    description: "Encontre qualquer ferramenta, veículo, usuário ou tela pressionando Ctrl+K. Logs do sistema mais rápidos e com exportação em PDF e Excel.",
    changes: [
      { type: "feature", text: "Nova Busca Rápida global: pressione Ctrl+K (ou Cmd+K) em qualquer tela para buscar ferramentas, veículos, usuários e navegar para qualquer área" },
      { type: "feature", text: "Exportação dos Logs do Sistema em PDF (paisagem) e Excel direto do painel de admin" },
      { type: "improvement", text: "Painel de Logs com rolagem virtualizada: até 500 registros sem travar, mesmo em celulares mais antigos" },
      { type: "improvement", text: "Tela de carregamento dos Logs substituída por skeleton visual (sem mais spinner genérico)" },
      { type: "improvement", text: "Filtros do Painel de Logs reorganizados para acomodar os novos botões de exportação" },
    ],
  },

  {
    version: "1.36.0",
    date: "2026-06-19",
    title: "Retirada/Devolução Manual pelo Admin e Navegação Mais Fluida",
    description: "Administradores agora podem retirar e devolver ferramentas e veículos em nome de outros usuários, com registro completo. Navegação geral mais rápida e suave.",
    changes: [
      { type: "feature", text: "Admin pode registrar retirada de ferramentas e veículos em nome de qualquer usuário aprovado" },
      { type: "feature", text: "Admin pode dar baixa (devolução) de ferramentas e veículos de qualquer usuário" },
      { type: "feature", text: "Justificativa obrigatória (mínimo 5 caracteres) ao agir em nome de outro usuário" },
      { type: "feature", text: "Notificação automática ao responsável quando o admin retira ou devolve em seu nome" },
      { type: "feature", text: "Novo filtro \"Apenas Ações Manuais (Admin)\" no Painel de Logs, com badge âmbar de destaque" },
      { type: "improvement", text: "Badge \"Atribuído pelo admin\" nos cards de ferramentas para identificar retiradas manuais" },
      { type: "improvement", text: "Navegação entre páginas mais rápida com pré-carregamento das telas principais" },
      { type: "improvement", text: "Transições suaves entre rotas e cache estendido para reduzir esperas" },
      { type: "improvement", text: "Carregamento de imagens otimizado em históricos e galerias" },
    ],
  },

  {
    version: "1.35.0",
    date: "2026-06-19",
    title: "Sistema Mais Rápido e Atualizado em Tempo Real",
    description: "Listas e painéis agora carregam mais rápido e se atualizam sozinhos quando há mudanças.",
    changes: [
      { type: "improvement", text: "Dashboard, históricos e relatórios com carregamento mais ágil e menos espera" },
      { type: "improvement", text: "Painel de obras, clientes, ferramentas e veículos sincroniza automaticamente entre abas" },
      { type: "improvement", text: "Histórico do Ponto (usuário e admin) atualiza em segundo plano sem recarregar a página" },
      { type: "improvement", text: "Transferências de ativos e notificações administrativas com cache inteligente" },
    ],
  },
  {
    version: "1.34.4",
    date: "2026-05-12",
    title: "Correção Crítica na Devolução de Veículos",
    description: "Resolvido problema onde veículos permaneciam vinculados ao usuário após registro de chegada.",
    changes: [
      { type: "fix", text: "Garantia de que a devolução seja processada corretamente no banco de dados mesmo em caso de falha na leitura da IA" },
      { type: "improvement", text: "Nova validação: sistema agora exige confirmação manual do KM quando a IA não atinge a precisão necessária" },
      { type: "fix", text: "Correção no alerta de sucesso: mensagem agora só aparece se o registro for efetivado com sucesso" },
    ],
  },
  {
    version: "1.34.3",
    date: "2026-05-12",
    title: "Sistema 100% Operacional",
    description: "Correção crítica na atualização de status de veículos e sincronização de dados.",
    changes: [
      { type: "fix", text: "Correção no trigger de disponibilidade: veículos agora retornam corretamente para 'Disponível' após a devolução" },
      { type: "fix", text: "Liberação de veículos que estavam presos em nome de usuários devido a falhas na atualização de status" },
      { type: "improvement", text: "Otimização na lógica de validação de quilometragem para garantir consistência no banco de dados" },
      { type: "improvement", text: "Melhoria na detecção de novas versões para todos os dispositivos" },
    ],
  },
  {
    version: "1.34.1",
    date: "2026-05-12",
    title: "Correções no Controle de Veículos",
    description: "Melhorias na precisão do hodômetro e flexibilidade na devolução de veículos.",
    changes: [
      { type: "fix", text: "Correção na falha do registro de quilometragem de saída (km_checkout) nas retiradas" },
      { type: "improvement", text: "Permissão para finalizar devolução de veículos mesmo sem leitura automática do painel" },
      { type: "improvement", text: "Indicador visual de 'Registro Manual' no histórico para quilometragens informadas pelo usuário" },
      { type: "fix", text: "Atualização retroativa das quilometragens de saída zeradas nos últimos 30 dias" },
    ],
  },
  {
    version: "1.34.0",
    date: "2026-05-08",
    title: "Melhorias no Fluxo de Devolução",
    description: "Otimização da tela de devolução e automação do preenchimento de dados de obra e TAG.",
    changes: [
      { type: "improvement", text: "Botão 'Registrar Devolução' agora seleciona automaticamente a ferramenta e preenche Obra/TAG" },
      { type: "improvement", text: "Campos de Obra e TAG agora são exibidos separadamente em modo leitura na devolução" },
      { type: "improvement", text: "Padronização de textos e botões no card de devoluções pendentes" },
      { type: "feature", text: "Visualização em Tabela ou Timeline adicionada ao histórico individual do usuário" },
    ],
  },
  {
    version: "1.33.0",
    date: "2026-05-08",
    title: "Detalhes do Histórico e TAGs",
    description: "Melhorias na visualização detalhada do histórico para usuários e administradores.",
    changes: [
      { type: "feature", text: "Novo botão 'Ver Detalhes' adicionado ao histórico unificado (Meu Histórico) para todos os usuários" },
      { type: "improvement", text: "TAG do equipamento agora é exibida em todos os detalhes de movimentação de ferramentas" },
      { type: "improvement", text: "TAG adicionada à listagem principal e exportações (PDF/Excel) do histórico administrativo" },
      { type: "improvement", text: "Visualização detalhada no histórico unificado agora inclui fotos, KM, observações e destinos" },
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
