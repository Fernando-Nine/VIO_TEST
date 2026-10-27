# Frontend — handoff

Atualizado: 2026-10-27

## Agora

Fila 2.10.0: só falta a **#158** (cabeçalho −/×/Desfazer; servidor pronto na main, PR #171,
contrato comentado na #158; spec `docs/design/cabecalho-widget.md`). PR #185 (#163) pode
estar aguardando CI/merge: conferir antes de começar.

## Feito recentemente

- #161 (PR #183, rc.2): `RoomTimer` no topo após o código; `ScreenTimer` no cabeçalho de
  cada tela (`HeaderAccessory`). `formatDuration` limita em `99:59:59+`. Widget `time` saiu
  do registro; `restoreCanvas` descarta `notes`/`time`. No celular o ping não reserva 86 px.
- #167 (PR #184, rc.3): `components/VolumeSlider.tsx` (trilho, marca 100%, dourado acima,
  setas ±5%, PgUp/PgDn ±25%, duplo clique = 100%). `ScreenVolumeSlider` no popover, no menu
  do botão direito da tela (header do `ContextMenu`, + "Janela flutuante") e
  `FullscreenVolume` vertical na barra da tela cheia. Pessoa: menu do PeoplePanel (0–200%).
- #163 (PR #185, rc.4): Ajustes com busca (`searchable` em `Settings.tsx`) e grupos;
  `ApplicationSettings.tsx` virou `MasterVolume`/`NotificationSettings`/`ParticipantColors`.
  `engine.balloons` (people/screens) e `engine.motion` em `vio:preferences`;
  `components/motion.ts` (`applyMotion`, `reducedMotion`). Desativar áudio (deaf) não cala
  mais as telas; `remoteMute` removido.

## Decisões

- Balão de Erros é "Sempre" (erro pode pedir Reconectar). Reduzir movimento só tem
  Seguir o sistema / Sempre; "Nunca" exigiria duplicar regras `prefers-reduced-motion`
  (perguntar ao copiloto se vale).
- Cada PR sobe uma rc e regenera o `CHANGELOG.md` (`npm run build`); merge sequencial.
- CSS sem prettier em `workspace.css`; blocos novos no fim; conferir chaves.
- Screenshots: branch em :3000, worktree da main em :3001; Playwright com duas pessoas
  (segundo contexto pela URL; "Assistir" em `.live-screens-trigger`). Cabeçalho da tela só
  aparece com o mouse em cima.

## Pendente / bloqueios

- #158: botões − / × no cabeçalho, renomear "Desconectar"/"Remover" para "Fechar só para
  mim"/"Fechar para todos", motivo nas linhas de "não exibidos" e separar ocultos por − dos
  ocultos pela grade. Toast de Desfazer com `kind: "important"`, `duration: 8000`.
- Widget Pessoas (bolha com volume, `docs/design/widget-pessoas.md`) não está na fila.

## Próximo passo

Ler a #158 (com o comentário do contrato) e `docs/design/cabecalho-widget.md`.
