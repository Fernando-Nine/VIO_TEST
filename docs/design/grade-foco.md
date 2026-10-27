# Grade: juntar espaços e fantasma do foco — spec (#195, escolha A + D + E)

Canvas da leva 4, linha "Escolhidas" (https://claude.ai/artifact/7ERZLFRtHn6xXE6mXcoPUf):
pranchas 195A, 195D (interativa) e 195E. Complementa [layout.md](layout.md).

## A · Juntar e separar com a alça

- Em hover (ou foco) num widget **encaixado** ou num espaço vazio da grade aparece a alça
  no canto inferior direito: 28×28 (44×44 em toque), fundo `#A6A9FF`, ícone `Maximize2`
  escuro. Widget **flutuante** não ganha alça: ele já tem o `widget-resizer` no mesmo canto.
- Arrastar a alça desenha o **fantasma** em células inteiras: fundo
  `rgba(39,39,245,.16)`, borda 2 px tracejada `#A6A9FF`, e um rótulo mono "2 × 2" ao lado
  do ponteiro. Só retângulos; limite da grade (3 × 4 no computador).
- Soltar junta. Widgets cobertos vão para o próximo espaço livre; sem espaço, para
  "Não exibidos" (como ao diminuir a grade). Esc durante o arraste cancela.
- **Separar**: arrastar a alça de volta para 1 × 1, ou botão direito ›
  **Separar espaços** (ícone `LayoutGrid`), na seção de ações do widget do menu.
- Teclado: com foco na alça, setas aumentam/diminuem uma célula, Enter aplica, Esc cancela.
- Reaproveitar `slot-spans.ts` (`rectangularUnion`) e `mergedIds` do modelo; a união
  hoje existe só na tira (botões "+" entre espaços) e passa a valer na grade.
- Celular (uma coluna): sem alça; espaços juntados viram um widget na largura toda.

## D · Posição do foco com miniaturas e fantasma

- Os botões Esquerda / Direita / Em cima / Embaixo viram miniaturas 56×40 do layout
  (bloco do foco + três da tira) com o nome curto embaixo (11 px). Escolhido: fundo
  `#1F2140`, borda `#A6A9FF`.
- Hover ou foco de teclado numa miniatura mostra o **fantasma** no canvas real: o layout
  atual fica a 35 % de opacidade; por cima, o foco em `rgba(39,39,245,.2)` com borda
  tracejada 2 px e a tira tracejada 1 px. Rótulo mono embaixo: "Foco à direita · 65%".
- Sair do hover tira o fantasma; clicar aplica. O controle "Tamanho do foco" continua
  aplicando ao vivo.
- Só apresentação: o fantasma é uma camada à parte; nada de mover hosts de vídeo,
  PeerConnections ou players (invariante de foco/layout).

## E · Arrastar até a borda

- Durante o arraste **com Shift** (o mesmo atalho que já encaixa nos espaços), aparecem
  quatro faixas de 6 px nas bordas do canvas (`rgba(166,169,255,.3)`). Sem Shift o arraste
  continua livre, como hoje.
- Chegar perto de uma borda (até 48 px) acende a faixa (`#A6A9FF`) e mostra o fantasma de
  Foco + tira daquele lado, com o widget arrastado no foco. Rótulo: "Shift · soltar: foco
  à direita".
- Soltar aplica Foco + tira naquele lado com o widget no foco; os outros vão para a tira.
- A faixa de baixo não cobre a área da doca (centro inferior), e a de cima não abre a
  barra do canvas durante o arraste.
- **Nenhum atalho novo.**

## Movimento

Fantasma entra e sai em 120 ms (opacidade); sem animação em movimento reduzido.

## Estado

Layout é pessoal, por sala (como em [layout.md](layout.md)).
