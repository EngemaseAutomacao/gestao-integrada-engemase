# Corrigir sincronização automática das obras

## Diagnóstico
- A integração com o Trello está funcionando e retorna as 50 obras esperadas.
- O agendamento atual está configurado para rodar apenas uma vez por dia, às 03:00 UTC (00:00 de Brasília).
- A tela administrativa procura um agendamento antigo chamado `sync-trello-every-5min`, por isso o horário da última sincronização também pode aparecer incorreto.

## Implementação
1. Alterar apenas o agendamento da sincronização do Trello para executar a cada 5 minutos.
2. Preservar a função, as credenciais, as obras existentes e todas as demais automações.
3. Ajustar a tela administrativa para consultar o nome real do agendamento e exibir corretamente a última execução.
4. Atualizar a versão e a nota de atualização conforme a regra do projeto.

## Validação
- Confirmar que o novo agendamento está ativo com frequência de 5 minutos.
- Executar a sincronização e verificar resposta de sucesso sem inclusão ou exclusão indevida.
- Confirmar que as 50 obras continuam disponíveis.
