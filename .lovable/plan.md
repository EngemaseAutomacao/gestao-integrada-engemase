# Aceitar devolução com KM igual à saída

## Objetivo
Garantir que, quando a quilometragem de devolução for igual à quilometragem de saída, o sistema conclua o registro normalmente e contabilize 0 km rodado, sem erro ou marcação de pendência.

## Alterações
- Ajustar a validação da devolução para tratar KM igual como um valor válido.
- Manter somente valores menores, inválidos ou ilegíveis marcados para conferência, sem bloquear o registro.
- Ajustar a leitura automática para a IA reconhecer valores iguais como distância zero válida.
- Atualizar a versão e a nota de atualização conforme a regra existente do sistema.

## Validação
- Conferir o fluxo com KM de entrada igual ao KM de saída.
- Confirmar que a devolução é salva com diferença de 0 km e sem aviso de conferência.
- Confirmar que falhas de leitura continuam sem bloquear a devolução.

## Detalhes técnicos
A alteração ficará restrita ao fluxo de devolução de veículos e à instrução da leitura do hodômetro. Nenhuma tela ou outro fluxo será modificado.
