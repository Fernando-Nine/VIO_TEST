# Mapa do código

Índice de onde está cada coisa: pasta ou arquivo, o que faz, a ficha do tema e as ligações principais
(quem chama quem). Primeira consulta para "onde fica X?" e "o que liga a quê?"; só depois varra o
código. Feito a partir da árvore do commit `ae247d9` da `main` (7 nov 2026). Mudou, criou ou
apagou um arquivo relevante? Atualize este mapa no mesmo PR. Fichas: [README](README.md).

## Ligações principais

- **Protocolo:** `src/shared/protocol.ts` (zod) é usado pelo servidor (`rooms.ts`, `app.ts`) e pelo cliente
  (`room/controller.ts`, `media/peers.ts`). Mudou o contrato, mude aqui primeiro.
- **Sala (servidor):** `index.ts` → `config.ts` + `app.ts` → `rooms.ts` (estado em memória) →
  `widgets.ts` (widgets da sala) e `security.ts` (token, `Limits`, `Fault`).
- **Sala (cliente):** `main.tsx` → `App.tsx` → `room/controller.ts` (máquina de estado) → `media/peers.ts`
  (PeerConnections) e `media/capture.ts` (captura); a interface lê o `Controller` e desenha
  `components/` e `canvas/`.
- **App Windows:** `client/desktop/*` chama o Rust de `src-tauri/src/*` por `nativeInvoke`
  (`desktop/bridge.ts`); o resultado vira `MediaStream` e entra no mesmo caminho de `media/`.

## src/server (ficha [08](08-servidor-protocolo-seguranca.md), salas em [01](01-salas-identidade-presenca.md))

| Arquivo | O que faz | Liga a |
| --- | --- | --- |
| `index.ts` | Entrada: lê config, sobe HTTP e Socket.IO | `config.ts`, `app.ts` |
| `config.ts` | `readConfig`: ambiente, `SESSION_SECRET`, origens, TURN, recusas em produção | `index.ts`, testes |
| `app.ts` | `createApp`: Express, Helmet/CSP, rotas HTTP, Socket.IO, fallback do SPA | `rooms.ts`, `security.ts`, `protocol.ts` |
| `rooms.ts` | Coração: salas, membros, cargos, porta, grace, publicações, assinaturas, sinais | `widgets.ts`, `security.ts`, `shared/*` |
| `widgets.ts` | Estado efêmero dos widgets da sala; só `Rooms` informa o autor | `rooms.ts`, `shared/widgets.ts` |
| `security.ts` | `Fault`, `Limits`, token HMAC, `stableId` | `rooms.ts`, `app.ts` |
| `notes.ts` | Notas da sala (código morto, achado 01.11) | `rooms.ts` |

## src/shared (contrato único cliente/servidor; ficha [08](08-servidor-protocolo-seguranca.md))

| Arquivo | O que faz | Usado por |
| --- | --- | --- |
| `protocol.ts` | Esquemas zod de eventos, sinais, limites (`MAX_SCREENS`…) | servidor e cliente |
| `permissions.ts` | `canManageRoom`, `canEditPublic`, textos de recusa | `rooms.ts`, interface |
| `widgets.ts` | Blocos e conteúdo de widget, limite de voltas do cronômetro | `widgets.ts`, `canvas/` |
| `room-modules.ts` | Config de enquete e sorteio (módulos da sala) | `ModuleWidget`, `rooms.ts` |
| `dice.ts` | `rollDice`, parser limitado, sem `eval` | `CustomWidget`, `DiceFace` |
| `colors.ts`, `palettes.ts` | Cores de avatar, paletas do sorteador | `Avatar`, `RaffleFace` |
| `releases.ts`, `legacy-releases.json` | Versão, commit, notas; histórico nunca apagado | `Settings`, `scripts/build-info.ts` |

## src/client raiz e room (fichas [02](02-conexao-e-reconexao.md), [07](07-cliente-e-interface.md))

| Arquivo | O que faz | Liga a |
| --- | --- | --- |
| `main.tsx` | Monta o app; laboratórios `/qa*` só em dev; service worker | `App.tsx`, `tests/*Lab.tsx` |
| `App.tsx` | Telas, painéis, atalhos, `pagehide`/`pageshow`, `popstate`, `?sala=` | `Controller`, `components/`, `canvas/` |
| `endpoint.ts` | `apiBase`, `webBase`, `embedded`, `invite()` | `controller.ts`, `App.tsx` |
| `id.ts` | `freshKey` | `controller.ts` |
| `webmcp.ts` | Ferramentas WebMCP da sala | `controller.ts` |
| `room/controller.ts` | Máquina de estado: socket, `epoch`, entrar/sair, publicações, widgets | `media/*`, `recovery.ts`, `shared/protocol.ts` |
| `room/recovery.ts` | Atraso de reconexão e classificação de erro | `controller.ts` |
| `room/room-history.ts` | Entrada da sala no histórico: Voltar sai, Avançar volta (#309) | `controller.ts`, `App.tsx` |
| `room/tab-room.ts` | Sala da aba para retomar após recarregar | `controller.ts` |
| `room/recent-rooms.ts` | Recentes (limite 10) | `Home.tsx` |
| `room/watching.ts` | Quais telas se assiste; foco não muda assinatura | `controller.ts`, `ScreenStage` |
| `room/presence-cues.ts` | Quando uma entrada/saída vira aviso | `LiveScreens`, `Toasts` |
| `room/status.ts`, `invite-text.ts` | Formatação de tempo/ping; textos e validade de convite | `RoomStatus`, `ShareDialog` |

## src/client/media (fichas [03](03-webrtc-e-sinalizacao.md), [04](04-captura-tela-e-audio.md), [05](05-telas-e-reproducao.md))

| Arquivo | O que faz | Liga a |
| --- | --- | --- |
| `peers.ts` | PeerConnections, negociação (ofertante único, `round`), ICE, bitrate | `controller.ts`, `codecs.ts`, `video-quality.ts` |
| `capture.ts` | Microfone, portão, câmera, tela; `fonte → analisador → portão → destino` | `controller.ts`, `voice-activity.ts` |
| `stall-watch.ts` | Vigia de vídeo recebido parado: ICE restart, depois reassinatura (#345) | `peers.ts` |
| `remote-stream.ts` | `addRemoteTrack`/`removeRemoteTrack` com eventos | `peers.ts` |
| `codecs.ts`, `video-quality.ts` | Preferência H.264; resolução, taxa e orçamento de envio | `peers.ts`, `capture.ts` |
| `voice-activity.ts` | Leitura do indicador de fala num tick comum | `capture.ts`, `Media.tsx` |
| `audio-output.ts`, `screen-playback.ts` | `setSinkId`; reprodução e amplificação da tela | `Media.tsx`, `ScreenAudio.tsx` |
| `picture-in-picture.ts` | PiP por portal estável | `ScreenStage.tsx` |
| `sounds.ts`, `sound-preferences.ts` | Sons de interface e preferências | `Notifications`, `Settings` |
| `deadline.ts` | `mediaDeadline`, prazo de operação de mídia | `capture.ts`, `peers.ts` |

## src/client/canvas (ficha [06](06-canvas-widgets-e-notas.md))

| Arquivo | O que faz |
| --- | --- |
| `RoomCanvas.tsx` | Grade/faixa de vagas, layout do aparelho, arrasto; usa `model`, `drag`, `geometry`, `slot-spans`, `strip-*` |
| `WidgetFrame.tsx`, `header-tools.tsx` | Moldura do widget e ponte do corpo para o cabeçalho |
| `widgets.tsx` | `widgetRegistry` e `createWidget`; liga cada tipo ao componente |
| `WidgetCatalog.tsx`, `catalog-search.ts`, `closed-widgets.ts`, `NotShown.tsx` | Catálogo, busca sem acento, fechados, lista dos não vistos |
| `ChatWidget`, `PeopleWidget`, `CamerasWidget`, `MyStreamWidget` | Widgets de chat, pessoas, câmeras (`camera-layout.ts`), minha transmissão |
| `CustomWidget`, `ModuleWidget`, `TimerBlock`, `DiceFace`/`dice-parts`, `PollFace`, `RaffleFace` | Widgets da sala: notas, dados, cronômetro, enquete, sorteio (estado no servidor) |
| `GridPicker`, `GridTools`, `shortcuts.ts`, `model.ts` | Preset de grade, ferramentas de grade, atalhos, modelo (`CanvasStore`) |
| `ColorFields`, `InlineText`, `NoteActions`, `room-content.ts` | Campos de cor, edição direta, ações de nota, conteúdo inicial "Para a sala" |
| `*.css` (`cameras`, `dice`, `my-stream`, `people`) | Estilos por widget |

## src/client/components (fichas [05](05-telas-e-reproducao.md), [07](07-cliente-e-interface.md))

| Arquivo | O que faz |
| --- | --- |
| `Landing`, `MiniRoom`, `Home`, `Door`, `InstallApp`, `Logo` | Entrada: landing, sala de demonstração, início, porta, instalar, marca |
| `Media.tsx` (`RemoteVoice`, `useSpeaking`) | `<audio>` remoto; o indicador de fala depende dele tocando |
| `ScreenStage`, `ScreenPicker`, `ScreenAudio`, `ScreenVolume`, `SoundSources`, `LiveScreens`, `Spectators`, `screen-layout.ts` | Palco de telas, escolha, som, volume, avisos, espectadores |
| `ShareDialog`, `share-options.ts` | Compartilhar tela (resolução, taxa, áudio); escolhas pessoais |
| `Settings`, `ApplicationSettings` | Ajustes, busca, áudio, notificações, cores |
| `PeoplePanel`, `PersonMenu`, `FloatingPeople`, `Avatar`, `participant-style.ts` | Pessoas e menu de botão direito |
| `RoomLock`, `RoomStatus` | Código, trava, relógio, ping, limite da sala |
| `Dialog`, `ContextMenu`, `AnchoredPopover`, `ColorPicker`, `EmojiPicker`, `VolumeSlider`, `Toasts`, `Notifications` | Peças de interface reutilizáveis |
| `motion.ts`, `floating-position.ts`, `popover-position.ts` | Movimento reduzido; posicionamento de flutuantes |

## src/client/desktop (ficha [10](10-app-windows.md))

| Arquivo | O que faz | Liga a |
| --- | --- | --- |
| `bridge.ts` | `desktop`, capacidades, `nativeInvoke`; nada nativo no navegador | todo `desktop/` |
| `capture.ts`, `share.ts` | Escolha de fonte e início da captura nativa | `src-tauri/src/capture.rs`, `stream.rs` |
| `video.ts`, `native-video.ts` | Lista de telas/janelas; leitura do buffer compartilhado NV12 | `video.rs`, `wire.rs` |
| `pcm-worklet.js` / `.d.ts` | AudioWorklet que toca PCM do som nativo | `share.ts` |
| `ducking.ts` | Provisório (#344, sai com #352): opção Comunicações do Windows | `ducking.rs`; `room/controller.ts`, `Settings.tsx` |

## src-tauri (ficha [10](10-app-windows.md))

| Arquivo | O que faz |
| --- | --- |
| `src/main.rs` | Entrada do Tauri 2, comandos expostos ao WebView |
| `src/shell.rs` | Janela, atualização e canais |
| `src/capture.rs` | Captura WASAPI (som por processo, loopback); `Manager`, `Source` |
| `src/stream.rs`, `src/video.rs`, `src/duplication.rs` | Captura de vídeo (WGC/duplicação), codificação, buffer |
| `src/printwindow.rs` | Captura de janela por `PrintWindow` |
| `src/programs.rs` | Quais programas tocam som; árvore de processos |
| `src/wire.rs`, `src/log.rs` | Formato dos pacotes e miniaturas; log |
| `src/ducking.rs` | Provisório (#344, sai com #352): lê e grava `UserDuckingPreference` |
| `capabilities/main.json`, `tauri.conf.json`, `tauri.updater.json`, `Cargo.toml` | Permissões, configuração, feed de atualização, dependências |

## tests e scripts (ficha [11](11-testes-e-ci.md); build em [09](09-hospedagem-deploy-release.md))

| Caminho | O que faz |
| --- | --- |
| `tests/*.test.ts` | `npm test` (`node --test`); `server.test.ts` sobe o servidor real |
| `tests/*Lab.tsx`, `media-runner.ts`, `synthetic.ts` | BrowserLab (`npm run test:media`): mídia sintética no navegador |
| `scripts/build.mjs`, `build-info.ts` | Build e `build-info.json` (commit, notas de `changes/`) |
| `scripts/build-desktop.mjs`, `desktop-channel.mjs` | Build do app e canais `stable`/`beta` |
| `scripts/check-deployment.mjs` | Confere a implantação (não roda na CI) |
| `public/sw.js`, `manifest.webmanifest` | Service worker (nunca intercepta navegação/sala/socket) e PWA |
