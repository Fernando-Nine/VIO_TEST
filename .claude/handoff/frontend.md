# Frontend — handoff

Atualizado: 2026-10-23

## Agora

Bloco #52–#55 entregue (PRs #59, #60, #61, #53 na PR seguinte). Nada em andamento.

## Feito recentemente

- #52: `.widget-body` é contêiner de tamanho (`container: widget-body / size`); widgets
  usam `cqw/cqh` e `em` a partir de um `font-size` por widget. Cronômetro curto põe o
  relógio ao lado dos controles. Cabeçalho ≤300 px: uma linha, ferramentas no botão ⋯
  (`.widget-more`), que abre o mesmo menu do botão direito.
- #54: `canvas/InlineText.tsx` (clique edita, blur/Enter salva, Esc cancela). Placar e
  Notas sem janela; Sorteador/Tarefas editam dentro do widget (`ModuleFields`), cada campo
  salva ao sair (fila em `saveConfig`, revisão vinda da resposta do servidor). Sem setinhas
  em `input[type=number]`.
- #55: `useEndAlarm` em `TimerBlock.tsx`: toca a cada 1,2 s até "Desligar alarme" ou 1 min.
- #53: Votação configurada na própria face antes de abrir; votos ocultos até o fim
  (contrato do Backend em #53: `votes` só o próprio, `voters` total).

## Decisões

- Ação secundária vai para o menu do cabeçalho/⋯, nunca para o corpo.
- Toda ferramenta do cabeçalho também existe no menu (o ⋯ esconde as ferramentas).
- Esperar a CI verde antes do squash merge; `npm run build` local pega erro de CSS
  (lightningcss) que o typecheck não pega.

## Pendente / bloqueios

- Tira do celular (~190×150): Votação aberta com rótulos longos quebra a palavra e pode
  rolar um pouco; avaliar com o usuário.

## Como testar a tela

Script de screenshots: semeia `vio:canvas:v2` no localStorage (preset `strip-left`,
foco + 3 na tira) e entra numa sala nova com Playwright global
(`/opt/node-tools/node_modules/playwright`). Viewports 1366×768 e 390×844.

## Próximo passo

Pedir ao usuário o retorno da prévia e abrir issues do que ele apontar.
