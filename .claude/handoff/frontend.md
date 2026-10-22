# Frontend — handoff

Atualizado: 2026-10-22

## Agora

Backlog do usuário concluído: #7, #8, #9, #10, #11, #12, #13, #14, #15, #16 e as do
diagnóstico (#36, #37, #45). Nada em andamento.

## Feito recentemente

- Infra de widget: `canvas/header-tools.tsx` (`HeaderTools` = portal para a linha do
  título, `ScopeBadge`, `useRename`, `useMenuItems`); `components/ContextMenu.tsx`
  (menu de botão direito; `origin` o mantém dentro de diálogo modal);
  `WidgetDefinition.menu`; título editável (duplo clique/F2/menu); arraste do mouse
  exige 4 px (antes um clique soltava o widget).
- `canvas/TimerBlock.tsx` (tempo no lugar, modo, repetir, som); `EmojiPicker`;
  chat agrupado por autor/5 min; votação com som e vencedor; Dados com sugestão;
  painel Pessoas com ⋯/botão direito; chip "ao vivo" na barra do canvas.
- Sons novos (aba Aplicativo): timer-end, poll-open, poll-end, screen-new,
  chat-message (coalescido 4 s).
- Layout: canvas de borda a borda; `--dock-lift` (dock acima da tira de baixo);
  widgets sob o dock ganham `under-dock` e reservam `--dock-height`.

## Decisões

- Ação secundária vai para o menu do cabeçalho/linha, nunca para o corpo.
- Escopo do widget é só ícone (pessoa/grupo) com `title`.
- Não rodar Prettier em arquivo inteiro fora do que mudou (#20 é do QA).
- Esperar a CI verde antes do squash merge.

## Pendente / bloqueios

- Cabeçalho de widget estreito (~190 px na tira do celular) ainda quebra em 2 linhas.
- Na tira do celular o Cronômetro fica no limite da altura.

## Próximo passo

Pedir ao usuário o retorno da prévia e abrir issues do que ele apontar.

## Como testar a tela

`npm run dev` + Playwright global (`/opt/node-tools/node_modules/playwright`); um
contexto de navegador por sala (o layout persiste no localStorage). Para tela
compartilhada: `--auto-select-desktop-capture-source=Entire screen`.
