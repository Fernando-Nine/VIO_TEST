# Rodada D — 2.7.0-rc.5

D1–D11 foram tratados antes de D12–D13. D14 e D15 são propostas, aguardando escolha.
D6 substitui C18; D8 substitui C6; D12 implementa C24; D14 reabre C25; D15 substitui a proposta anterior de C26.

## Entregue

- D1: olho removido do card Compartilhamento; permanece na própria transmissão.
- D2–D4: Layout sem seção Mover widget; Foco único sem seletor; títulos sem numeração.
- D5: volume sem X; saída do mouse agenda fechamento em 600 ms, retorno cancela; toque fora, Escape e perda de foco fecham.
- D6: fullscreen começa recolhido, gatilho de 4 px; mantém aberto sobre a barra ou com foco de teclado visível. Descida em 150 ms, subida em 350 ms; toque só no ambiente sem hover.
- D7: roda em captura no ancestral comum da tira e dos hosts. Conteúdo interno rola primeiro; evento isolado avança um card em 300 ms, sequência abaixo de 150 ms segue continuamente, parada faz um snap. Ctrl+roda preservado, deltaMode tratado, movimento reduzido respeitado. Toque e teclado mantêm o caminho existente.
- D8: setas flutuam sobre as pontas; removida a reserva inferior de 50 px.
- D9–D10: dica usa `canvasShortcuts`; modificador atualizado em teclado e ponteiro; limpeza em blur, visibilitychange, fim/cancelamento. Destaque depende do encaixe ativo.
- D11: novo layout padrão é Foco à esquerda + tira, com quatro slots. Preferência explicitamente salva continua respeitada.
- D12: até seis caixas tituladas; copiar, salvar e enviar cópia. Notas recebidas entram no catálogo Da sala, com remetente/hora, e podem virar notas individuais. Edição conjunta permanece separada.
- D13: botão Pessoas com badge abre painel; widget não é criado automaticamente. Painel mostra presença, chamada, transmissão, cor, coroa do criador e ping individual de sinalização.

## Diagnósticos

**D6:** `:focus-within` mantinha a barra aberta pelo foco deixado no botão de fullscreen, e a zona de 64 px era larga. Não havia temporizador de recolhimento próprio: a visibilidade dependia dos eventos. A entrada agora limpa foco/estado; o CSS considera apenas `:focus-visible`.

**D7:** os cards são irmãos do scroller. O handler do ancestral encaminhava somente eventos sobre hosts por `scrollBy` instantâneo, enquanto os espaços usavam scroll-snap nativo. Não havia stopPropagation de roda nos cards (o stopPropagation existente é de clique após swipe). Os dois percursos competiam; agora existe um único tratamento em captura, com snap CSS suspenso durante a roda/animação.

**D10:** o modificador dependia apenas de keydown/keyup/blur; o fim do arraste não limpava snap e o CSS pintava is-drop-target sem verificar se o encaixe continuava ativo. Ponteiro, visibilidade e cancelamento agora sincronizam o estado e condicionam o destaque.

## Dados e limites

Cópias de notas são imutáveis, com autor/hora atribuídos no servidor e idempotência por id. Máximo de 2.000 caracteres por caixa, seis caixas por widget, 12 cópias por pessoa/sala e 60 por sala; envio limitado a 12/min. Cópias compartilhadas somem quando a sala esvazia ou reinicia. Refresh de uma aba não apaga dados dos outros; cópias adicionadas ao layout são locais.

O criador é a primeira pessoa da vida atual da sala. A coroa é informativa, sem poderes de moderação; não é transferida enquanto a sala existe. A sala vazia começa uma nova autoria na próxima entrada. Ping é ida e volta navegador-servidor por confirmação Socket.IO, atualizado no heartbeat existente; não é latência de mídia nem valor autodeclarado pelo cliente.

## Validação

Fase 1: suíte completa executada uma vez (71 casos). Uma expectativa antiga de um slot precisou acompanhar o novo padrão de quatro; os 20 testes afetados passaram no reteste direcionado. TypeScript aprovado.
Fase 2: suíte completa executada uma vez, **74 testes aprovados**. Inclui isolamento de notas entre salas, payload estrito, autoria, idempotência, cotas, persistência na reentrada, limpeza ao esvaziar, criador e ping com servidor/Socket.IO reais. Build e TypeScript conferidos; sem dependências novas.

Ensaio visual concluído na rc.5 em 11/10/2026: duas sessões confirmaram cópias independentes e painel Pessoas; fullscreen recolheu automaticamente e respondeu à zona de 4 px; tira preservou rolagem interna e alinhamento. Evidência e limites complementares ficam em VALIDACAO.md. Mídia física, toque/trackpad real, aparelhos móveis e leitores de tela continuam no roteiro de aceite; testes de estado não certificam esses dispositivos.

## D14 — módulos propostos (nenhum implementado)

- Lista de tarefas: título, itens, ordem e estado concluído editáveis.
- Votação: pergunta, opções e duração editáveis; cada participante pode trocar seu voto.
- Sorteador: nomes/opções, pesos e retirada de resultados anteriores editáveis.
- Dados: quantidade, faces e modificador editáveis, com resultado compartilhado.
- Agenda da sessão: etapas, duração prevista, ordem e etapa atual editáveis.
- Links úteis: títulos, URLs e ordem editáveis; abertura explícita, sem incorporar páginas externas.

## D15 — mesclar vizinhos (nenhum implementado)

1. Layout → Mesclar slots: selecionar dois ou três vizinhos e confirmar. Selecionar o grupo e Separar desfaz.
2. Ação Juntar ao próximo no slot: repetir para juntar três. Separar devolve os slots originais.

O modelo atual v1 não possui spans: lista de slots e CSS com três unidades visíveis. Implementar exige agrupamento que preserve os ids originais e indique extensão de 1–3 unidades; na tira é span em um único eixo. Uma fusão de três ocupa toda a área lateral/inferior, alinhada ao foco, sem criar flutuantes.

A rolagem deve avançar por grupos e recalcular seus pontos de parada, para não parar no meio de um grupo fundido. O final precisa compensação de espaço para alinhar o último grupo quando seus tamanhos não somarem um múltiplo da janela de três unidades. Separar restaura ids, ordem e ocupantes; fusão com múltiplos conteúdos exige escolher qual permanece visível e preservar os demais para restauração, sem encerrar mídia. A migração do estado só será implementada depois da escolha.
