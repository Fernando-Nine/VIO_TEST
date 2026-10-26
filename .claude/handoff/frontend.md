# Frontend — handoff

Atualizado: 2026-10-26

## Agora

Fila 2.9.0 concluída. Última PR: #156 (#145, rc.19), squash quando a CI ficar verde.

## Feito recentemente

- #115 (PR #138, rc.14): `color` no Cronômetro/Personalizado, cor por opção + `palette` na
  Votação. Seletor comum `canvas/ColorFields.tsx`; helpers em `shared/palettes.ts`.
- #81 + #143 (PR #139, rc.15): tira reordena arrastando (`stripDrop` no `RoomCanvas`);
  recorte ignora cortes < 2 px (snap fracionário); `scrollbar-gutter` + respiro na tira.
- #142 (PR #151, rc.16): anel de foco interno nos campos dos widgets.
- #141 (PR #152, rc.17): Dados em fichas para N# e mais de 3 dados; histórico truncado.
- #144 (PR #154, rc.18): borda da tela some em tela cheia inativa.
- #145 (PR #156, rc.19): rodapé Entrar na chamada → Compartilhar → Flutuante à esquerda;
  volume por tela no cabeçalho (`components/ScreenVolume.tsx`, substitui `VolumeControl`).

## Decisões

- Cada PR sobe um `-rc.N` e regenera o `CHANGELOG.md` com `npm run build` (a CI confere).
- Várias PRs abertas: merge sequencial; a cada squash, juntar a `main` na próxima e subir
  a rc (conflitos só em releases/package/CHANGELOG e CSS anexado no fim).
- `workspace.css` segue sem prettier; blocos novos vão no fim.
- Sem force push (trava). Matar o servidor local pela porta.
- Screenshots com duas pessoas: segundo contexto do Playwright entra pelo código da sala e
  compartilha com `--auto-select-desktop-capture-source`.

## Pendente / bloqueios

- Widget Personalizado não está no catálogo; o menu "Cor" aparece se ele existir.
- Em tela cheia inativa, as bordas tracejadas dos espaços vazios continuam visíveis.

## Próximo passo

Pedir ao copiloto a próxima fila.
