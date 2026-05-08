# Notas de Atualização - v1.33.0

## [1.33.0] - 2026-05-08

### Adicionado
- Opção de visualização em tabela ou linha do tempo (timeline) no histórico de ferramentas do usuário, padronizando com o histórico geral.

### Alterado
- **Fluxo de Devolução:** O botão "Registrar Devolução" agora redireciona o usuário diretamente para a tela de devolução com a ferramenta já selecionada.
- **Interface de Devolução:** 
    - Organização dos campos em grade (grid) para melhor visibilidade.
    - Separação dos campos de Ferramenta, Obra e TAG.
    - Preenchimento automático dos campos "Obra" e "TAG" com base no registro de saída original (somente leitura).
- **Padronização:** Botão no card de devoluções pendentes alterado de "Devolver" para "Registrar Devolução".

### Corrigido
- Ajuste na rota `/ferramentas/devolucao` para garantir o funcionamento correto do redirecionamento e seleção automática.
