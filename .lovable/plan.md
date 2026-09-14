# Sincronizar obras das três listas do Trello

## Objetivo
Garantir que a lista de obras disponível aos usuários seja formada pela união destas três listas do Trello:

- A fazer — `620c56ba85aa9536c3cbc86d`
- Fazendo – Curto Prazo (≤ 3 meses) — `620c56bd53d96f7e9ac3c1a6`
- Fazendo – Longo Prazo (> 3 meses) — `68ee51cadc1f85da721361b7`

Uma obra continuará aparecendo se estiver em pelo menos uma dessas listas. Ela será removida do sistema somente quando não estiver em nenhuma das três.

## Implementação
- Ajustar apenas a função de sincronização para consultar obrigatoriamente os três IDs informados.
- Unificar os cartões pelo nome, sem duplicar obras presentes em mais de uma lista.
- Manter a proteção atual: se qualquer consulta ao Trello falhar, interromper antes de alterar as obras existentes.
- Preservar o agendamento diário às 03:00 de Brasília e o botão de sincronização manual.
- Publicar a função atualizada no backend.
- Atualizar a versão e registrar uma nota curta da correção.

## Validação
- Executar uma sincronização protegida e confirmar resposta bem-sucedida das três listas.
- Conferir que não existem obras duplicadas.
- Confirmar que uma obra presente em qualquer uma das três listas permanece ativa.
- Confirmar que o agendamento diário continua único e inalterado.
- Verificar que nenhuma tela ou fluxo não relacionado foi modificado.
