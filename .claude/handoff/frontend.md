# Frontend — handoff

Atualizado: 2026-10-27

## Agora

Fila do milestone 2.10.0 (ordem do copiloto): ~~#166~~ ~~#164~~ ~~#165~~ → #161 (tempos nos
cabeçalhos) → #167 (volume da tela) → #163 (Ajustes + Desativar áudio) → #158 (cabeçalho
−/×/Desfazer; servidor pronto na main, PR #171, contrato comentado na #158).
Specs em `docs/design/`; canvas da leva 3 na seção "Escolhidas".

## Feito recentemente

- #166 (PR #175, rc.21): presets `grid-RxC` + `autoGrid`/`gridSize` em `canvas/model.ts`
  (migra `grid-N`/`focus-*`); matriz `canvas/GridPicker.tsx`; Foco único saiu da barra.
  Diminuir a grade manda o excesso para `state.hidden` ("N não exibidos",
  `canvas/NotShown.tsx`, `store.show(id)`); aumentar traz de volta; a tira mostra todos.
  Celular: uma coluna, foco 16:9 no topo (`--compact-row`), painel só "Foco no topo".
- #164 (PR #177, rc.22): fila global `components/Toasts.tsx` (`toasts.push/close`,
  kinds info/important/error). Entrou/saiu e nova tela no `RoomCanvas`; erro/aviso da
  sala via `App.tsx`. `ScreenToast` removido. O Desfazer da #158 usa `kind: "important"`,
  `duration: 8000`.
- #165 (PR #178, rc.23): `canvas/WidgetCatalog.tsx` (painel e dentro do espaço vazio),
  busca sem acento em `canvas/catalog-search.ts`; escolha Mim/Sala no segmentado
  (`vio:widget-scope`), o diálogo de escopo saiu. Seção "Não exibidos" no painel.

## Decisões

- Versões seguem `2.9.0-rc.N` até o QA separar 2.9/2.10 nas notas (avisado ao copiloto).
- Cada PR sobe uma rc e regenera o `CHANGELOG.md` com `npm run build`; merge sequencial,
  juntando a `main` na próxima (conflitos em releases/package/CHANGELOG).
- `workspace.css` sem prettier; blocos novos no fim. Conferir chaves balanceadas.
- Screenshots: dev em :3000 e worktree da `main` em :3001 (`.env` com PORT/ALLOWED_ORIGINS
  próprios); scripts Playwright no scratchpad (duas pessoas: segundo contexto pela URL).

## Pendente / bloqueios

- #158 ainda precisa: botões − / × no cabeçalho, motivo nas linhas de "não exibidos"
  ("Você fechou" / "Novo, de Lia") e separar ocultos por − dos ocultos pela grade.
- Balão desligado em Ajustes › Notificações (spec de avisos) entra com a #163.

## Próximo passo

#161: ler `docs/design/tempos.md` e a issue.
