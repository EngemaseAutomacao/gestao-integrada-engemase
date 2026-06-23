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
    version: "1.60.0",
    date: "2026-06-23",
    title: "Pendências na Home e navegação mais fluida",
    description: "Novo card de devoluções pendentes na tela inicial com acesso direto aos detalhes da ferramenta. Transições entre páginas ficaram mais rápidas e sem o flash do layout antigo.",
    changes: [
      { type: "feature", text: "Card de Devoluções Pendentes na Home" },
      { type: "improvement", text: "Clique no nome da ferramenta abre a tela de detalhes" },
      { type: "improvement", text: "Skeleton exibido imediatamente ao mudar de página" },
      { type: "improvement", text: "Pré-carregamento das páginas principais em segundo plano" },
    ],
  },
  {
    version: "1.59.1",
    date: "2026-06-23",
    title: "Detalhes e Histórico no novo padrão visual",
    description: "Páginas de detalhe de ferramenta/veículo e Histórico Geral agora usam o cabeçalho azul ModuleHero. Botão de voltar removido do header mobile (a navegação já está disponível na barra inferior).",
    changes: [
      { type: "improvement", text: "Detalhe de Ferramenta com ModuleHero" },
      { type: "improvement", text: "Detalhe de Veículo com ModuleHero" },
      { type: "improvement", text: "Histórico Geral (admin) com ModuleHero" },
      { type: "improvement", text: "Header mobile sem botão de voltar redundante" },
    ],
  },
  {
    version: "1.59.0",
    date: "2026-06-23",
    title: "Módulos Ponto Online e Transferências removidos",
    description: "Os módulos de Ponto Online e Transferências foram descontinuados. A navegação, Home, sidebar e atalhos foram atualizados.",
    changes: [
      { type: "improvement", text: "Cards de Ponto e Transferências removidos da Home" },
      { type: "improvement", text: "Sidebar e barra mobile sem entradas de Ponto/Transferências" },
      { type: "improvement", text: "Rotas /ponto/* e /transferencias redirecionam para a Home" },
      { type: "improvement", text: "Tutorial de onboarding e seção de Ajuda atualizados" },
    ],
  },
  {
    version: "1.58.0",
    date: "2026-06-23",
    title: "Nova tela de login",
    description: "Tela de login redesenhada com identidade Engemase: fundo com brilho azul suave, cartão arredondado, campos com ícones e botão de acesso destacado.",
    changes: [
      { type: "improvement", text: "Login com layout moderno alinhado ao novo padrão visual" },
      { type: "improvement", text: "Campos de usuário e senha com ícones e melhor contraste" },
      { type: "improvement", text: "Background decorativo com gradiente e padrão sutil de pontos" },
    ],
  },
  {
    version: "1.57.0",
    date: "2026-06-23",
    title: "Hero unificado em todos os módulos",
    description: "Os painéis de Veículos, Histórico, Transferências e Registrar Ponto agora compartilham o mesmo hero azul gradiente do painel de Ferramentas, criando uma experiência visual consistente em todo o sistema.",
    changes: [
      { type: "improvement", text: "Painel de Veículos com hero gradiente e cartões flutuantes" },
      { type: "improvement", text: "Histórico, Transferências e Ponto com cabeçalho azul unificado" },
      { type: "improvement", text: "Componente ModuleHero reutilizável para futuras telas" },
    ],
  },
  {
    version: "1.56.0",
    date: "2026-06-23",
    title: "Painel de Ferramentas com hero unificado",
    description: "O dashboard de Ferramentas agora abre com o mesmo hero azul gradiente do painel inicial e dos menus de módulo, com cartões flutuantes de estatísticas (Disponíveis, Total, Em Uso) sobrepostos ao hero.",
    changes: [
      { type: "improvement", text: "Hero azul gradiente no topo do painel de Ferramentas" },
      { type: "improvement", text: "Cartões de estatísticas flutuantes com sombra elevada" },
      { type: "improvement", text: "Padrão visual consistente entre painel inicial, menus e dashboards" },
    ],
  },
  {
    version: "1.55.0",
    date: "2026-06-23",
    title: "Layouts dos módulos refinados no desktop",
    description: "Os menus internos dos módulos (Ferramentas, Veículos) agora seguem o mesmo padrão visual do painel inicial no desktop: destaque grande para o módulo principal, cards com hover elevado e seção de administração com banners completos.",
    changes: [
      { type: "improvement", text: "Tile principal em destaque no desktop com gradiente e informação ampliada" },
      { type: "improvement", text: "Cards dos módulos com hover elevado e rótulo de ação 'Acessar'" },
      { type: "improvement", text: "Seção de administração com banners largos no estilo do painel inicial" },
    ],
  },
  {
    version: "1.53.0",
    date: "2026-06-23",
    title: "Foto de perfil no painel inicial",
    description: "O quadrado do logo no cabeçalho do painel agora aceita uma foto de perfil opcional. Basta clicar para enviar uma imagem (até 5MB). A foto aparece apenas ali no painel.",
    changes: [
      { type: "feature", text: "Clique no quadrado do logo para enviar uma foto de perfil" },
      { type: "feature", text: "Cada usuário controla sua própria foto, salva com segurança" },
      { type: "improvement", text: "Sem foto enviada, o logo da Engemase continua aparecendo normalmente" },
    ],
  },
  {
    version: "1.52.0",
    date: "2026-06-23",
    title: "Visual de app também no desktop",
    description: "O painel inicial e os menus de Ferramentas/Veículos no desktop agora compartilham o mesmo estilo do celular: hero azul com gradiente, cartão flutuante de status e bento grid com módulo principal em destaque.",
    changes: [
      { type: "feature", text: "Hero azul com saudação personalizada no topo do painel inicial em telas grandes" },
      { type: "feature", text: "Bento grid: módulo principal (Ferramentas) ocupa célula grande à esquerda; demais módulos à direita" },
      { type: "feature", text: "Menus de Ferramentas e Veículos com mesmo hero unificado no desktop" },
      { type: "improvement", text: "Cartão flutuante de status (ferramentas, veículos, ponto) sobreposto ao hero" },
    ],
  },
  {
    version: "1.51.0",
    date: "2026-06-23",
    title: "Visual de app aplicado a Ferramentas e Veículos",
    description: "Os menus de Ferramentas e Veículos agora compartilham o mesmo visual de aplicativo do painel inicial no celular: cabeçalho colorido, tile principal em destaque e bento grid.",
    changes: [
      { type: "feature", text: "Menu de Ferramentas no celular com hero azul, Painel Geral em destaque e grade 2 colunas" },
      { type: "feature", text: "Menu de Veículos no celular com mesmo padrão visual unificado" },
      { type: "feature", text: "Seção 'Administração' separada com destaque amarelo para administradores" },
      { type: "improvement", text: "Desktop e tablet mantêm o layout em grade já existente" },
    ],
  },
  {
    version: "1.50.0",
    date: "2026-06-23",
    title: "Painel inicial com cara de app no celular",
    description: "O painel inicial no celular foi totalmente redesenhado com visual de aplicativo nativo: cabeçalho colorido com saudação, cartão flutuante de status e bento grid de módulos.",
    changes: [
      { type: "feature", text: "Cabeçalho azul com gradiente, saudação personalizada e identificação do perfil (Administrador, Colaborador, Terceiro)" },
      { type: "feature", text: "Cartão flutuante de status (ferramentas em uso, veículos, ponto) sobreposto ao cabeçalho" },
      { type: "feature", text: "Módulo principal em destaque (tile grande) + grade 2 colunas (bento) para os demais módulos" },
      { type: "feature", text: "Faixa exclusiva de Administração com destaque visual em amarelo para administradores" },
      { type: "improvement", text: "Badges de urgência e pendências mais visíveis em cada módulo" },
    ],
  },
  {
    version: "1.49.0",
    date: "2026-06-23",
    title: "Layout dedicado para celular",
    description: "O painel inicial agora detecta o dispositivo e mostra um layout otimizado para celular (lista vertical estilo app) e outro para desktop (grade de cards).",
    changes: [
      { type: "feature", text: "No celular, os módulos aparecem como linhas com ícone, título, descrição, badge de pendências e seta — visual de app nativo" },
      { type: "feature", text: "Cabeçalho compacto no mobile (logo pequeno + 'Olá, [nome]') libera espaço para a lista" },
      { type: "improvement", text: "No desktop e tablet, mantida a grade de cards lançada na v1.48.0" },
      { type: "improvement", text: "Mesmo conteúdo nos dois layouts — sem perda de funcionalidade" },
    ],
  },
  {
    version: "1.48.0",
    date: "2026-06-23",
    title: "Painel inicial mais profissional e interativo",
    description: "Os cards do painel inicial foram redesenhados com nova tipografia (Space Grotesk + DM Sans), ícone destacado, badges de status (Ativo, Pendente, Urgente) e microinterações no hover.",
    changes: [
      { type: "improvement", text: "Cards de módulo com ícone à esquerda, status à direita e link 'Acessar →' separado por divisória" },
      { type: "improvement", text: "Hover com elevação, sombra suave e troca de cor do ícone para o azul institucional" },
      { type: "improvement", text: "Tipografia atualizada: Space Grotesk nos títulos e DM Sans no corpo" },
      { type: "improvement", text: "Grid uniforme (2 colunas no celular, 4 no desktop) substituindo o layout flex antigo" },
      { type: "improvement", text: "Badges padronizadas para usar tokens semânticos (compatível com tema claro e escuro)" },
    ],
  },
  {
    version: "1.47.0",
    date: "2026-06-23",
    title: "Módulos de Combustível e Analytics removidos",
    description: "Os módulos de Registro de Combustível e Analytics de Veículos foram removidos do sistema por não serem utilizados. O manual do usuário foi atualizado.",
    changes: [
      { type: "improvement", text: "Removido o módulo 'Combustível' do menu, da paleta de comandos e do menu de Veículos" },
      { type: "improvement", text: "Removido o módulo 'Analytics de Veículos' do menu lateral" },
      { type: "improvement", text: "Rotas antigas /veiculos/combustivel e /veiculos/analytics agora redirecionam para o painel de Veículos" },
      { type: "improvement", text: "FAQ da Ajuda atualizado, sem referência a abastecimento" },
      { type: "improvement", text: "Manual do usuário (PDF) regenerado sem as seções removidas" },
    ],
  },
  {
    version: "1.46.16",
    date: "2026-06-22",
    title: "Aviso claro para senhas bloqueadas",
    description: "O medidor de senha no admin deixou de chamar o formato de 'senha válida' quando a proteção do backend ainda pode bloquear senhas comuns ou vazadas.",
    changes: [
      { type: "fix", text: "Texto do medidor alterado para 'Requisitos atendidos' para não contradizer o bloqueio de segurança" },
      { type: "improvement", text: "Erro de senha bloqueada agora também aparece abaixo do campo, além do aviso lateral" },
    ],
  },
  {
    version: "1.46.15",
    date: "2026-06-22",
    title: "Medidor de força na tela do admin",
    description: "O diálogo 'Alterar Senha do Usuário' (admin) agora mostra medidor de força, checklist de requisitos e botão de mostrar/ocultar senha.",
    changes: [
      { type: "improvement", text: "Medidor de força e requisitos visíveis ao alterar senha de outro usuário" },
      { type: "feature", text: "Botão de olho para mostrar/ocultar a senha no diálogo administrativo" },
    ],
  },
  {
    version: "1.46.14",
    date: "2026-06-22",
    title: "Regras de senha ajustadas",
    description: "A senha agora exige 8 caracteres com maiúscula, minúscula e número. O medidor de força e o botão de mostrar senha foram corrigidos.",
    changes: [
      { type: "improvement", text: "Senha exige 8+ caracteres, letra maiúscula, minúscula e número (símbolo opcional)" },
      { type: "fix", text: "Medidor de força da senha exibido corretamente" },
      { type: "fix", text: "Botão de mostrar/ocultar senha (olho) funcionando" },
    ],
  },
  {
    version: "1.46.13",
    date: "2026-06-22",
    title: "Senha mínima simplificada",
    description: "A alteração de senha voltou a exigir apenas 8 caracteres obrigatórios, mantendo as demais dicas apenas como recomendação visual.",
    changes: [
      { type: "fix", text: "A senha agora é liberada com 8 caracteres, sem obrigar maiúscula, minúscula, número e símbolo" },
      { type: "improvement", text: "O medidor de força continua aparecendo, mas não bloqueia o salvamento da senha" },
      { type: "fix", text: "A tela administrativa de alteração de senha também informa corretamente o mínimo de 8 caracteres" },
    ],
  },
  {
    version: "1.46.12",
    date: "2026-06-22",
    title: "Tela de alterar senha melhorada",
    description: "A tela de alteração de senha agora mostra os requisitos em tempo real, um medidor de força e um botão de olho para ver a senha digitada.",
    changes: [
      { type: "feature", text: "Botão de olho para mostrar/ocultar a senha" },
      { type: "feature", text: "Lista de requisitos da senha com check em tempo real (8 caracteres, maiúscula, minúscula, número, símbolo)" },
      { type: "feature", text: "Medidor visual de força da senha (Muito fraca → Muito forte)" },
      { type: "improvement", text: "Mínimo aumentado de 6 para 8 caracteres + confirmação de que as senhas coincidem em tempo real" },
    ],
  },
  {
    version: "1.46.11",
    date: "2026-06-22",
    title: "Barra de título azul no app instalado",
    description: "A barra superior (com os botões fechar/minimizar/maximizar) do app instalado no computador agora usa o azul Engemase em vez de branco.",
    changes: [
      { type: "improvement", text: "Cor de tema do PWA alterada para azul Engemase (#264a6b)" },
    ],
  },
  {
    version: "1.46.10",
    date: "2026-06-22",
    title: "Botão para verificar atualizações",
    description: "Agora você pode checar manualmente se há uma nova versão direto da tela de Notas de Atualização, sem precisar esperar a verificação automática.",
    changes: [
      { type: "feature", text: "Botão 'Verificar atualizações' na tela de Notas de Atualização" },
      { type: "improvement", text: "Se houver nova versão, um aviso aparece com botão para atualizar imediatamente" },
    ],
  },
  {
    version: "1.46.9",
    date: "2026-06-22",
    title: "Inspeção geral e correções de estabilidade",
    description: "Varredura completa do sistema corrigindo inconsistências que poderiam impedir o app de carregar ou atualizar corretamente.",
    changes: [
      { type: "fix", text: "Arquivo de versão sincronizado — evita banner de atualização em loop" },
      { type: "fix", text: "Detecção correta de ambiente preview vs produção no monitoramento de erros" },
      { type: "improvement", text: "Removidos imports de páginas obsoletas, reduzindo o tamanho do bundle" },
    ],
  },
  {
    version: "1.46.8",
    date: "2026-06-22",
    title: "Botão de atualização agora funciona",
    description: "O botão 'Atualizar' do banner de nova versão não estava aplicando a atualização — o app continuava na versão antiga após recarregar. Agora o app desregistra o service worker e limpa todos os caches antes de recarregar, garantindo que a nova versão seja carregada.",
    changes: [
      { type: "fix", text: "Botão 'Atualizar' do banner agora força o carregamento da nova versão" },
    ],
  },
  {
    version: "1.46.7",
    date: "2026-06-22",
    title: "Novo ícone do app",
    description: "Atualizamos o ícone do PWA (tela inicial, favicon, splash) para a nova versão circular do símbolo Engemase.",
    changes: [
      { type: "improvement", text: "Novo ícone aplicado em todos os tamanhos (Android, iOS, desktop, favicon)" },
    ],
  },
  {
    version: "1.46.6",
    date: "2026-06-22",
    title: "Correção da tela de carregamento travada",
    description: "Em algumas situações (especialmente na tela de login), a tela de splash inicial permanecia visível indefinidamente, impedindo o acesso ao app. Agora ela é removida automaticamente assim que o app carrega, em qualquer rota.",
    changes: [
      { type: "fix", text: "Splash inicial não trava mais em rotas públicas como tela de login" },
    ],
  },
  {
    version: "1.46.5",
    date: "2026-06-22",
    title: "Mensagem clara ao alterar senha de usuário",
    description: "Quando um administrador tentava definir uma senha que já apareceu em vazamentos públicos (proteção contra senhas comuns), o sistema mostrava apenas 'Ocorreu um erro'. Agora a mensagem explica exatamente o motivo e orienta o admin a escolher uma senha mais forte.",
    changes: [
      { type: "improvement", text: "Aviso específico quando a senha escolhida está em listas de vazamentos públicos" },
      { type: "improvement", text: "Mensagens de erro do painel de administração de usuários ficaram mais claras" },
    ],
  },
  {
    version: "1.46.4",
    date: "2026-06-20",
    title: "Botão 'Atualizar' agora funciona sem precisar limpar cache manualmente",
    description: "O botão de atualizar do banner de nova versão estava servindo a tela antiga do cache em vez de buscar a versão nova do servidor, obrigando o usuário a forçar a limpeza do cache. Corrigido: o app agora sempre busca o index.html mais recente da rede em cada navegação (estratégia NetworkFirst), e o clique em 'Atualizar' ativa o novo Service Worker e recarrega com a versão correta.",
    changes: [
      { type: "fix", text: "Botão 'Atualizar' do banner de nova versão agora carrega a versão nova sem necessidade de limpar cache manualmente" },
      { type: "fix", text: "Service Worker passou a usar NetworkFirst para navegações HTML (antes era cache-first, causa raiz do problema)" },
      { type: "improvement", text: "Fluxo de update preserva precache de assets — mais rápido, sem re-baixar tudo do zero" },
    ],
  },
  {
    version: "1.46.3",
    date: "2026-06-20",
    title: "Ícone do app agora usa o símbolo hexagonal Engemase",
    description: "Todos os ícones do PWA (Android, iOS, desktop, favicon, splash) foram atualizados para usar o símbolo hexagonal oficial da Engemase (azul + laranja) sobre fundo branco, no lugar do logo horizontal com texto. Mais reconhecível em tamanhos pequenos.",
    changes: [
      { type: "improvement", text: "Ícones do PWA atualizados para o símbolo hexagonal Engemase em todas as plataformas" },
      { type: "improvement", text: "Favicon do navegador também atualizado para o novo símbolo" },
    ],
  },
  {
    version: "1.46.2",
    date: "2026-06-20",
    title: "Ícone do iOS com tamanho igual ao Android",
    description: "O ícone do app no iOS aparecia menor que no Android porque o Android corta automaticamente as bordas dos ícones (maskable) e o iOS não. Agora o ícone do iOS/desktop tem o logo ampliado para compensar essa diferença — visualmente igual em todas as plataformas.",
    changes: [
      { type: "fix", text: "Logo do ícone no iOS ampliado de ~78% para ~85% da área (compensa ausência de corte do iOS)" },
      { type: "improvement", text: "Paridade visual entre ícone Android (com crop) e iOS/desktop (sem crop)" },
    ],
  },
  {
    version: "1.46.1",
    date: "2026-06-20",
    title: "Ícone do app com fundo branco e abertura mais fluida",
    description: "O ícone do PWA agora tem fundo branco (antes era azul), combinando com a tela de carregamento. Resultado: ao abrir o app instalado, a tela inicial do sistema operacional e a tela de carregamento do app se fundem visualmente, dando a sensação de uma única tela contínua em vez de duas telas separadas.",
    changes: [
      { type: "improvement", text: "Ícone do PWA agora tem fundo branco (Android, iOS e área de trabalho)" },
      { type: "improvement", text: "Cor de tema do PWA alterada para branco — splash do sistema operacional agora combina com a tela de carregamento do app" },
      { type: "improvement", text: "Transição mais fluida ao abrir o app instalado: sem mudança brusca de cor entre splash do SO e carregamento do app" },
    ],
  },

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
