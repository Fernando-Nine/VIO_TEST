# Frontend — handoff

Atualizado: 2026-10-27 (Frontend 11)

## Agora

Bloco do Frontend 11: #160 (rc.2, PR #212), #207 (rc.3, PR #214), #209 (rc.4). Próximas da
2.11.0: #162 Câmeras, #194.

## Feito recentemente

- #160 (PR #212, rc.2): widget `stream` "Minha transmissão" (`canvas/MyStreamWidget.tsx`,
  `my-stream.css`). Ações em `streamActions` (botões e menu via `useMenuItems`); pausa =
  `track.enabled` + `state` (verdade local em `streamPaused`), congela o `<video>`. Trocar =
  prop `replaceShare` (navegador: `startScreen(audio, true)`; app: painel `replace` com
  `NativeShare replace`). Tamanhos por container query: foco ≥ 640×400, empilhado ≤ 420 de
  largura e ≥ 320 de altura; tira = corpo < 170 px (JS). `restoreCanvas` tem `mergers`
  (Pessoas e Minha transmissão). Seletor ‹ 1/N › usa as publicações de tela próprias do
  snapshot; os controles agem na captura única (`publications.get("screen")`) — revisar na #194.
- #207 (PR #214, rc.3): avatar do chat usa `.ring-avatar` (colidia com `.person-avatar` do
  PeoplePanel, que pintava o vão de azul).
- #209 (rc.4): sino com grupos Agora/Antes, Limpar e ponto de não lida (`fresh`, só enquanto
  aberto); cronômetro mostra "Em andamento"/"Pausado"/"Parado"/"Concluído" a quem não
  controla; toque longo no cabeçalho abre o menu do widget (folha no celular, `.widget-menu`);
  arrasto por toque agora exige 8 px de movimento (antes: segurar 250 ms). "Sair da chamada"
  ficou; a spec `chamada.md` foi alinhada. Erro já tem "Reconectar" no aviso.

- #159 (PR #205, 2.11.0-rc.1): widget Pessoas (`canvas/PeopleWidget.tsx`, `people.css`) no
  tipo `people`; `call`/`mixer` saíram e migram em `restoreCanvas` (o primeiro vira Pessoas).
  Menu da pessoa em `components/PersonMenu.tsx` (`usePersonMenu`, `menuPoint`), usado também
  pelo PeoplePanel (`volume: true` põe o controle no topo do menu). Tira = corpo < 150 px
  (`height`); foco por container query; celular por `@media (max-width: 679px)`.
  `ParticipantCard` removido. 2.10.0 no histórico com `date: null` ("prevista" no CHANGELOG).

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

- #162: o selo de câmera e "Abrir câmera" do Pessoas devem abrir o widget Câmeras fixado.
- Roda do mouse ±5% na Tira (sugestão da spec) não feita: brigaria com a rolagem da tira.

## Próximo passo

#162 Câmeras, ligando o selo/menu do Pessoas.
