# Frontend — handoff

Atualizado: 2026-10-27

## Agora

Fila 2.10.0 do Frontend concluída (#161, #167, #163, #158, #189, #190, #198). Aguardando o
copiloto/QA para a próxima fila (2.11.0: #159, #160, #162).

## Feito recentemente

- #189 (PR #200, rc.6): `scrollbar-gutter` e recuo da tira só com `.canvas-strip.is-scrollable`
  (`stripScrolls`, mesma condição das setas da tira).
- #190 (PR #202, rc.7): "Para a sala" só lista `roomKind` (módulos, timer, chat); selo
  "Só para você" removido. Grupo Telas (props `screens`/`showScreen`) no topo do catálogo,
  também no espaço vazio; a aba Telas saiu.
- #198 (rc.8): sem linha Erros em Notificações (`balloon: "always"` removido); ícone
  `PersonStanding` em Acessibilidade.

- #158 (rc.5): cabeçalho com − (widget da sala, só para mim) e × (fechar para todos, para quem
  pode: `endsForEveryone` em `WidgetFrame`); pessoal só ×. Menu: "Fechar só para mim" /
  "Fechar para todos". `engine.widgetClosed` (controller) avisa antes de o widget sair:
  quem fechou recebe toast Desfazer (`widget-restore`, 8 s); os outros, item no sino.
  `restoreSpots` recoloca o widget no mesmo espaço quando volta. Fechados com − ficam em
  `vio:widgets:closed` (`canvas/closed-widgets.ts`). "N não exibidos" junta grade
  (`state.hidden`, "Sem espaço na grade") e widgets da sala fora do layout ("Você fechou",
  "Novo, de X", "Criado por você"). Sem espaço livre, Mostrar abre o `.slot-picker`
  (`store.replace`; o substituído vira não exibido; Esc cancela).
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

- Widget Pessoas (bolha com volume, `docs/design/widget-pessoas.md`) não está na fila.

## Próximo passo

Pegar a próxima issue com etiqueta `frontend` no Milestone 2.11.0 (#159, #160 ou #162).
