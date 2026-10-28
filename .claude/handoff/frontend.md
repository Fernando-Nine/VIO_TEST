# Frontend — handoff

Atualizado: 2026-10-28 (Frontend 13)

## Agora

Bloco do Frontend 12: #191 (rc.9), #221 (rc.10), #228 (rc.11), #222 (rc.12). Pendente
humano: aval do seletor no app Windows (miniaturas reais) e medir CPU 1080p60 (#192).

## Feito recentemente

- #236 (PR #237, rc.15): Só som. Protocolo `publish.audioOnly` + `label` (servidor valida:
  só `screen` com som; `label` só com `audioOnly`). Cliente: `soundOnly(source)` no
  controller; nome via `CaptureAdapter.soundLabel` (desktop). Quem ouve:
  `components/SoundSources.tsx` + `sound.css` (chip na barra, popover com volume, Silenciar,
  Parar de ouvir); RoomCanvas não cria widget para som (`publications[].sound`,
  `screenList` sem sons, `showPublication` só assiste). Pessoas/PeoplePanel/PersonMenu,
  aviso/sino, Ao vivo, Minha transmissão (`SoundPreview`) e "Parar som" no rodapé.

- #191 (PR #225, rc.9): `components/ShareDialog.tsx` + `share.css` + `share-options.ts`
  (`vio:share`). App com #192: `listVideoSources`/`videoThumbnail`/`startNativeShare`; navegador
  ou app sem #192: `setDisplayVideo` (em `media/capture.ts`) leva `displaySurface` + teto de
  tamanho/FPS ao `getDisplayMedia`. Várias telas (#194): o modal recebe o `slot`
  (`captures.nextScreen()` ou o da troca); doca tem + e "Parar telas (N)"; Minha transmissão
  usa `slotOf(engine, publicationId)` e age no slot. No app, só uma tela leva som.
  `NativeShare.tsx` e `desktop.css` saíram.
- #221 (rc.10): `canvas/GridTools.tsx` (alça `SpanHandle`, `FocusGhost`, `FocusThumb`,
  `EdgeBands`, `edgeAt`) + `grid-tools.css`. Modelo: `gridPlacement` (slots em ordem de
  linha da célula superior esquerda) e `CanvasStore.resizeSlot` (1 × 1 separa; `splitSlot`
  na grade chama ele). Grade com `gridArea` explícita; spans 2D persistem; mudar a grade ou ir
  para a tira achata. Shift + borda (48 px) aplica `strip-<lado>` + `focus`. Fantasma do
  Layout é `position: fixed; z-index: -1` dentro do diálogo (fica sob a folha).
- #228 (rc.11): botão Foco único/Voltar ao conjunto na barra (`toggleSingle`, não persiste).
- #222 (rc.12): `WidgetCatalog` com abas por intenção (`vio:catalog-tab`), ações por item,
  rodapé Widgets da sala (`roomWidgets`), `community`; `catalog.css`. Placar (`custom`)
  criável para mim e para a sala. Chat só "Para a sala".

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

Ver `docs/ESTADO.md` com o copiloto. Faltam do Design: rótulo "Dividir espaço" (tira) vs
"Separar espaços" (grade) poderia unificar.
