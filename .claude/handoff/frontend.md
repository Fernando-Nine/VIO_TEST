# Frontend — handoff

Atualizado: 2026-10-25

## Agora

Nada em andamento. Prévia na 2.9.0-rc.6 (widgets novos, cor salva, limites).

Fila (copiloto, 2026-10-25), nesta ordem:
1. #104 widgets pessoais ou da sala, sem compartilhar — **esperar o contrato do Backend
   na issue** antes da interface; fazer junto com a #111.
2. #111 padrão dos widgets, #107 Pessoas, #108 Ajustes, #109 Transmissões, #110
   Chamada/Compartilhar. Specs em `docs/design/`. Usar as skills `vio-design-system`
   (ao implementar) e `vio-design-review` (antes de entregar).

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
- #93 (PR #97): cor pessoal salva em `vio:preferences.color`, aplicada após cada `join`.
- #92 (PR #98): `Limits` virou balde com reposição contínua; widgets com rajada
  (structure 120/min + 40, interact 240 + 60, operate 300 + 60); rolar/sortear 300 ms
  por widget. Na prévia: 2.9.0-rc.6.

## Decisões

- Cada widget novo tem componente e CSS próprios, importados no componente (chunk lazy,
  carrega depois do `workspace.css`). Não rodar prettier no `workspace.css` (não está
  formatado; reformatar gera diff enorme).
- Ferramentas do cabeçalho sempre também no menu ⋯ (gráfico, paletas, roleta, histórico).
- Input global tem `min-height: 50px` e margens: seletor do widget precisa vencer
  `(0,2,1)`.

## Pendente / bloqueios

- Aceite do usuário na prévia (visual e giro da roleta em aparelho real).

## Como testar a tela

Playwright global (`/opt/node-tools/node_modules/playwright`), sala nova pela landing,
widget pelo catálogo; `Adicionar à sala` para módulos; outras sessões entram com
`?sala=` e adicionam pela aba Sala. Reinicie `npm run dev` ao mudar `src/shared` ou
servidor (não recarrega sozinho). Viewports 1366×768 e 390×844.

## Próximo passo

Conferir se o contrato da #104 saiu; se não, começar pela #111 (sem tocar no modelo pessoal/sala).
