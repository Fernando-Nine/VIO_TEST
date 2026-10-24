# Frontend — handoff

Atualizado: 2026-10-24

## Agora

Nada em andamento. Visual novo dos 4 widgets na prévia como 2.9.0-rc.1…rc.4.

## Feito recentemente

- #75 (PR #88): Cronômetro em anel (`TimerBlock.tsx` + `canvas/timer.css`). Voltas são
  estado da sala: `laps` no bloco timer (máx. 20) e operação `lap`.
- #76 (PR #89): Votação em `PollFace.tsx` + `poll.css`. Servidor manda `voterIds`
  (quem votou, máx. 100) enquanto aberta. Gráfico (barras/pizza/sem) é preferência
  pessoal em localStorage `vio:poll-chart`.
- #77 (PR #90): Dados em `DiceFace.tsx` + `dice.css`; funções puras em `dice-parts.ts`.
- #78 (PR #91): Sorteador em `RaffleFace.tsx` + `raffle.css`; paletas em
  `shared/palettes.ts`. Opção ganhou `color`, módulo ganhou `palette`; `moduleResets`
  ignora cor/paleta (não zera o sorteio). Roleta visível: localStorage `vio:raffle-wheel`.

## Decisões

- Cada widget novo tem componente e CSS próprios, importados no componente (chunk lazy,
  carrega depois do `workspace.css`). Não rodar prettier no `workspace.css` (não está
  formatado; reformatar gera diff enorme).
- Ferramentas do cabeçalho sempre também no menu ⋯ (gráfico, paletas, roleta, histórico).
- Input global tem `min-height: 50px` e margens: seletor do widget precisa vencer
  `(0,2,1)`.

## Pendente / bloqueios

- Aceite do usuário na prévia (visual e giro da roleta em aparelho real).
- Limite de frequência compartilha rolar/sortear: rolar logo após sortear mostra
  "Espere um instante" (comportamento anterior; avaliar com Backend se incomodar).

## Como testar a tela

Playwright global (`/opt/node-tools/node_modules/playwright`), sala nova pela landing,
widget pelo catálogo; `Adicionar à sala` para módulos; outras sessões entram com
`?sala=` e adicionam pela aba Sala. Reinicie `npm run dev` ao mudar `src/shared` ou
servidor (não recarrega sozinho). Viewports 1366×768 e 390×844.

## Próximo passo

Pedir ao usuário o retorno da 2.9.0-rc.4 e abrir issues do que ele apontar.
