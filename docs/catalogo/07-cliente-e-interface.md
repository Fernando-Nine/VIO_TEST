# 07 — Cliente e interface

> **Resumo:** O cliente é um SPA React 19.3 + Vite 8.3 sem roteador. Um único `Controller` (store externo) guarda o estado da sala; o `App` o assina com `useSyncExternalStore` e escolhe a tela (landing, início só no app, porta, sala) por campos do estado. Preferências ficam em `localStorage` (`vio:*`). CSS próprio, sem Tailwind, só tema escuro.
>
> **Arquivos-chave:** `src/client/main.tsx` (entrada), `src/client/App.tsx` (decide a tela), `src/client/room/controller.ts` (estado, 1593 linhas), `src/client/endpoint.ts` (URLs), `src/client/components/*` (UI), `src/client/styles.css` e outros `.css` (tokens), `src/client/media/sounds.ts` e `sound-preferences.ts` (sons e opções), `src/client/webmcp.ts`, `public/sw.js`, `public/manifest.webmanifest`.
>
> **Docs:** `docs/ARVORE.md` (mapa de arquivos; desatualizado, ver Achados), `docs/decisoes/002` e `003` (003 diverge do código), `docs/ESTADO.md` (Fila: #261 transições, #270 notificações, #168 Ajustes, #269 responsividade).
>
> **Retrato:** commit `8bdc516` (5 nov 2026). Mudou o que esta ficha descreve? Atualize-a no mesmo PR.

## Como funciona hoje

1. **Build.** `vite.config.ts`: `build.outDir "dist/client"`, `sourcemap false`; em dev `server.middlewareMode true` (o Express hospeda o Vite), `host 0.0.0.0`, `allowedHosts ["terminal.local"]`. `scripts/build.mjs` roda `viteBuild()` e depois esbuild para o servidor. Fontes via `@fontsource-variable/bricolage-grotesque` e `@fontsource/ibm-plex-mono/400.css`. Ícones: `lucide-react`.
2. **Entrada.** `main.tsx` cria `new Controller(desktop ? windowsCapture : undefined)`, chama `registerRoomTools(engine)` e monta `<App engine>`. Só em DEV, os caminhos `/qa`, `/qa-layout`, `/qa-watch` e `/qa-switch` carregam `tests/BrowserLab` por import dinâmico (se falhar, cai no `App`). Em PROD e fora do app Windows, registra `/sw.js` no evento `load` com `updateViaCache:"none"`. No HMR, desregistra e chama `engine.destroy()`.
3. **Assinatura do estado.** `Controller` expõe `subscribe` e `getSnapshot` como propriedades-seta (`controller.ts` › `subscribe`, `bump`). `bump()` troca `this.view` por uma cópia com `revision+1` e avisa os ouvintes. `App` usa `useSyncExternalStore(engine.subscribe, engine.getSnapshot)`. Os filhos recebem `engine` por prop e leem `engine.*` no render; dependem de o `App` re-renderizar a cada bump (sem `memo`, sem seletores).
4. **Campos de `View`.** `revision`, `status` (idle, connecting, connected, reconnecting, failed), `snapshot`, `id`, `selected`, `watching`, `error`, `notice`, `signalingPing`, `waiting`, `turnedAway` (refused ou expired), `knocks`.
5. **Outros stores.** `CanvasStore` (`canvas/model.ts`, `subscribe`/`getSnapshot` próprios, `structuredClone`), `ToastQueue` (singleton `toasts` em `components/Toasts.tsx`, `useSyncExternalStore`), `useNarrow` em `Settings` (`matchMedia("(max-width: 640px)")`).
6. **Qual tela mostrar** (`App.tsx`, classe do contêiner e JSX; sem roteador):
   - `view.snapshot` existe: classe `in-room`, `<main className="room" id="main-content">`; `RoomCanvas` é `lazy` com `Suspense`.
   - `view.waiting` ou `view.turnedAway` sem snapshot: classe `in-door`, `<Door>` (espera, recusado, convite expirado).
   - `home = !view.snapshot && desktop` (`App.tsx` ~L97): classe `home-page`, `<Home>`. Desde a #285 a Home só existe no app Windows; o navegador sempre mostra a landing, e o botão do logo que voltava para a landing saiu. `Splash` aparece quando `home && splash`; `splash` começa igual a `desktop` (~L99).
   - Senão: classe `landing-page`, `<Landing>` (página de venda e formulário "Chega mais").
7. **URL e histórico** (#309). Sem roteador. `?sala=` e `?convite=` são lidos uma vez no `useState` inicial (`App.tsx`). `room/room-history.ts` › `RoomHistory` (criado no `Controller` só se `persist && !embedded`; o app Tauri tem `embedded`) guarda a barra de endereço numa fila serial. No início de `enter` (antes do `join`, para valer também na porta, na recusa e no convite vencido) `show` empilha a entrada: se a atual não é de sala, ela vira o início (`/`, sem `?sala` nem convite) e `pushState({vioRoom})` empilha a sala (`""` enquanto a sala nova não tem código); o sucesso do `join` só troca a entrada pelo link com código. Reconexão, recarga ou outra sala fazem `replaceState` (nunca empilha). A marca é o `history.state` (`isRoomEntry`/`roomEntry`, código validado pela regex do `roomCode`), não a URL. `App.tsx` ouve `popstate` e pergunta a `engine.popped`: `"ignore"` (o próprio `back()` do Sair, ainda a caminho), `"start"` (com `engine.inRoom` chama `goHome()`, o mesmo do Sair, despedida explícita) ou `{room}` (fora da sala, `setCode` e, com nome, `enter`, com o convite do link se for a mesma sala). Sair, `turnAway` e falha final da entrada (`dropEntry`) passam por `leave` → `RoomHistory.leave`: `history.back()` quando este documento criou o início logo abaixo (`ownsStart`, zerado ao usar), senão troca a entrada pelo início; o `show` seguinte espera esse `back()` (ou 1 s), então ele nunca cai na entrada de uma sala nova; se o `popstate` dele chega depois do prazo, o primeiro que não é de sala é engolido (`late`) e a entrada da sala nova volta, e o `App` só chama `goHome()` se a entrada atual não é a da sala ativa (`engine.showsRoom`). Um Voltar ou Avançar do usuário durante esse `back()` pendente é ignorado. Uma falha final da entrada remove a URL da sala (volta ao início). `enter` e `destroy` chamam `leave(true, false)` e não mexem na URL. `resume` (#286) só volta sozinho se a entrada atual é a da sala (`resumes(history.state, code)`): recarregar continua na sala, mas Voltar depois de uma recarga (o início é de outro documento, carga completa) não reentra; ali a saída é a despedida comum do `pagehide` (some após `FAREWELL_SECONDS`). O servidor serve o fallback do SPA em `/{*path}`, mas o cliente nunca lê o caminho, só `?sala`. `endpoint.ts`: `apiBase` (`VITE_API_BASE`), `webBase` (`VITE_WEB_URL`), `embedded`, `api()`, `socketOrigin()`, `invite(code, token)`. `desktop = VITE_DESKTOP === "1"` (`desktop/bridge.ts`).
8. **Painéis.** Estado `panel` no `App`: people, settings, color, about, share, replace, history ou null. Cada um abre num `<Dialog>` com título (people não é modal).
9. **Ociosidade.** A interface "dorme" após 1000 ms (ponteiro) ou 4000 ms (toque). Não dorme com arrasto, `dialog[open]`, foco em textarea/input de widget, menu de volume de tela, popover ancorado ou `:focus-visible`.
10. **Bater na porta.** Pedido de entrada vira toast com 15000 ms e ações "Deixar entrar" e "Agora não". Erros e avisos do engine vão ao toast de id "engine" (com "Reconectar" se `failed`). O aviso leva `role="alert"` ou `status`. Fora da sala (landing, Home) e dentro de painéis abertos, o aviso é o `.notice` inline, hoje `position: fixed` no topo (`room.css`, #281): sobrepõe a tela e não ocupa espaço no fluxo.
11. **Toasts.** `Toasts.tsx`: `MAX_SHOWN=2`; info entra em fila (um por vez); importante/erro vai ao topo; mesmo id atualiza no lugar; deslize FLIP de 180 ms (pulado com movimento reduzido). O fechamento automático depende de `onAnimationEnd` da `.toast-bar` (CSS `vio-toast-bar` sobre `--toast-duration`, padrão 4 s); a barra pausa em hover/foco. Toast de erro não tem barra.
12. **Sino.** `Notifications.tsx` (usado em `canvas/RoomCanvas.tsx` ~L1341) é só dentro do app. Grupos "Agora" (última hora, 3600000 ms) e "Antes". Ações "Assistir/Ouvir", "Aceitar", "Abrir", "Limpar", "Excluir". Ponto de não lido, `aria-live polite`. Alimentado por eventos de tela, widgets oferecidos, chat não lido e `snapshot.notices`.
13. **Preferências.** `Controller.savePreferences` grava `vio:preferences` (JSON). Leituras e escritas de storage ficam em try/catch; `persist=false` (laboratórios) não grava. Construtor: `Controller(adapter, persist=true, connectSocket=io)`.
14. **Movimento.** `components/motion.ts`: `applyMotion(motion)` põe `documentElement.dataset.motion="reduce"` (ou tira). `reducedMotion()` é verdadeiro com `data-motion=reduce` ou `matchMedia("(prefers-reduced-motion: reduce)")`. Opção em Ajustes › Acessibilidade › "Reduzir movimento" ("Seguir o sistema" / "Sempre"). CSS: `preferences.css` ~L625 `:root[data-motion="reduce"] *` zera durações (0.01ms !important); `styles.css` ~L1401 tem regra global `@media (prefers-reduced-motion: reduce)` com `animation:none!important; transition:none!important; scroll-behavior:auto!important`. Os dois modos quebram o fechamento automático do toast (ver 07.1). Decisão 020: o modo também serve de interruptor para PC fraco ou internet ruim, e o padrão agora é animação completa.
15. **Ponto da marca.** `data-ponto` tem os valores baixar, landing, ao-vivo, download, inicio, pessoa, logo, espera. Nenhum CSS ou JS lê esse atributo. Os pontos de estado em repouso (`live-pulse`, `live-dot`, `connection-dot`, `call-count i`, `screen-caption i`, bolinha de não lida, marcador do kicker) são quadrados de raio 2–2,5 px (#338); avatares e contadores com texto seguem redondos até a fase 3. O que existe são animações locais: `Splash` (`home.css` ~L414; timer de 700 ms, pula com pointerdown/keydown; ponto em 0 ms, "vio" escrito a partir de 300 ms, saída em 540 ms + 160 ms), `dot-pulse` de 2.4 s em `.landing-dot.is-pulsing`, `door-dot.is-waiting`.
15b. **Cursor do VIO.** `styles.css` (topo, #266): `--cursor-pointer` e `--cursor-hand` valem `default`/`pointer` e, em `(hover: hover) and (pointer: fine)`, as setas de `public/cursors/vio-pointer.svg` (ponto 4 3) e `vio-hand.svg` (13 3). `html` usa o ponteiro (vale em portais no `body` e na janela flutuante); `label` herda (o navegador põe `default`); `:where(:root) :where(button, a[href], summary, select, [role=button|menuitem|tab], input range/checkbox/radio/color)` usa a mãozinha com especificidade zero, para os cursores de função de uma classe vencerem. Desativado usa o ponteiro, nunca `not-allowed`. Ficam nativos só os de função: `text`, `grab`/`grabbing`, `nwse-resize`, `crosshair` (cor) e `none` (vídeo ocioso). Barra de rolagem e borda da janela do Windows não aceitam cursor por CSS. CSS novo: use as variáveis, nunca `pointer`/`default` direto.
16. **Sons de interface.** `media/sounds.ts` › `SoundCues` (Web Audio). Cada som é uma sequência de `OscillatorNode` sine por um `GainNode`; passo entre notas 0.085 s; envelope com ataque de 0.012 s até 0.12 e queda exponencial até 0.0001 em 0.13 s; cada oscilador para em +0.14 s. O mesmo som é ignorado dentro de 0.28 s. 14 sons: room-enter, room-leave, share-on, share-off, unmute, mute, deafen, undeafen, screen-new, chat-message, poll-open, poll-end, timer-end, knock. Se existe `setSinkId`, sai pelo destino escolhido via `AudioOutput.register`. `unlock()` retoma o `AudioContext`. Volume = `sounds ? masterVolume*soundVolume : 0`. O som de chat sai no máximo a cada 4 s (`Controller.chatCue`).
17. **Notificações (tabela Balão × Som).** `media/sound-preferences.ts`: lista `soundEvents` com rótulos, `readSoundEvents`, `volumePreference` (0..1), `balloonKinds` (people, screens), `notificationRows`. UI em `ApplicationSettings` › `NotificationSettings`. "Balão" = toast. Não existe API `Notification` do navegador (nenhum `new Notification` nem `showNotification`).
18. **PWA.** `manifest.webmanifest`: id "/", name "VIO — sua sala, sua companhia", short_name VIO, display standalone, cores #0b0c13, ícones 192, 512 e maskable-512, lang pt-BR. `sw.js` (`CACHE="vio-static-2.6.0"`): instala pré-cacheando só 3 ícones; sem `skipWaiting`; ativa apagando caches `vio-static-*` de outro nome. No fetch só trata GET do mesmo origin, não-navegação, sem `?sala=`, que case `/^\/assets\/[^/]+\.(js|css|woff2?|png|svg)$/`, os ícones ou `/favicon.svg`; cache-first, guarda só resposta `ok` e `basic`. Nunca intercepta navegação, /api, socket, /sala nem downloads. Servidor (`src/server/app.ts` ~L164): `/sw.js` com `Cache-Control: no-cache` e `Service-Worker-Allowed: /`. `InstallApp` trata `beforeinstallprompt`/`appinstalled`, detecta standalone e mostra dica para iOS/Android; só aparece na `Landing`.
19. **CSP** (helmet, desligado em dev; `app.ts`): default/script/font/object `'self'`/`'none'`; style `'self'` + `'unsafe-inline'`; img `'self' data:`; media `'self' blob:`; connect `'self'` + origens e variantes ws; frame-ancestors none.
20. **WebMCP.** `webmcp.ts` › `registerRoomTools(engine)` usa a API experimental `document.modelContext.registerTool`, com `AbortController`; não faz nada se a API não existe. Ferramentas: `get_vio_room` (somente leitura: status, participantes com id, nome, online e telas, selected, watching; sem tokens) e `select_vio_screen` (zod `.strict()`, `publicationId` até 80, confere se a tela existe, chama `engine.select`).
21. **Idioma e telemetria.** Todo texto é pt-BR fixo, sem biblioteca de i18n; `index.html` tem `lang="pt-BR"`; datas e listas usam `toLocale*("pt-BR")`, `Intl.ListFormat`, `Intl.NumberFormat`. Telemetria: nenhuma encontrada no cliente (busca por analytics, sentry etc. sem resultado).
22. **Encerramento.** `beforeunload` chama `captures.stopAll` e `socket.disconnect`. A meta `theme-color` é fixada em `#0b0c13`.

## Números

| Parâmetro | Valor | Onde |
| --- | --- | --- |
| Versões | React 19.3.0, Vite 8.3.0 | `package.json` |
| Linhas do `Controller` | 1593 | `room/controller.ts` |
| Ociosidade da UI | 1000 ms ponteiro, 4000 ms toque | `App.tsx` › idle/`wake` |
| Toast de bater na porta | 15000 ms | `App.tsx` |
| Toasts visíveis | 2 (`MAX_SHOWN`) | `Toasts.tsx` |
| Deslize de toast | 180 ms ease-out | `Toasts.tsx` |
| Duração padrão da barra | 4 s (`--toast-duration`) | `workspace.css` ~L2929 |
| Sino, janela "Agora" | 3600000 ms | `Notifications.tsx` |
| Splash | 700 ms | `home.css` ~L414 |
| Pulso do ponto | 2.4 s | `landing.css` (`dot-pulse`) |
| Sons | 14 sons, passo 0.085 s, dedupe 0.28 s, chat a cada 4 s | `media/sounds.ts` |
| Volume do som (padrão) | 0.7; geral 1; limiar -65..-20 dB | `Controller` |
| Credenciais de sala | máx. 20 | `vio:room-credentials` |
| Salas recentes | máx. 12, padrão `^[A-Z0-9]{4,24}$` | `room/recent-rooms.ts` |
| Nome | máx. 32 caracteres | `vio:name` |
| Widgets fechados | máx. 100 | `vio:widgets:closed` |
| Canvas salvo | recusa > 150000 caracteres | `vio:canvas:v2` (v1 como reserva) |
| Aviso de carga P2P | a partir de 6 pessoas | `RoomStatus` › `RoomLimit` |
| Emojis no seletor | 40 fixos | `EmojiPicker` |
| CSS | `styles.css` 1735, `workspace.css` 3449, `landing.css` 1269, `finish.css` 826, `room.css` 774, `preferences.css` 633, `home.css` 461, `multiscreen.css` 334, `door.css` 323, `share.css` 242, `grid-tools.css` 211, `catalog.css` 163 linhas | `src/client/*.css` |
| Cores fixas no CSS | ~712 hex de 6 dígitos | grep em `src/client` |
| Uso de `aria-*` | ~240 em components | grep |
| Tela estreita | `max-width: 640px` | `Settings` › `useNarrow` |
| Testes | preferences 166, features 187, floating-position 33, popover-position 44 linhas | `tests/` |
| Laboratórios | BrowserLab 708, FeatureLab 211, LayoutLab 73, PreferencesLab 156, RoomSwitchLab 88, ScreenAudioLab 396, WatchLab 250 linhas | `tests/` |

Chaves de armazenamento (todas em `localStorage`, exceto a última):

| Chave | Conteúdo |
| --- | --- |
| `vio:preferences` | `micMuted`, `micDevice`, `cameraDevice`, `sounds`, `soundEvents`, `soundVolume`, `masterVolume`, `participantColors`, `peopleHidden`, `fineAudio`, `previewsEnabled`, `balloons`, `motion`, `color`, `outputDevice`, `manualGain`, `threshold`, `voiceSettings` |
| `vio:room-credentials`, `vio:recent-rooms`, `vio:name` | credenciais de salas trancadas, recentes, nome |
| `vio:share` | padrão 720p, 30 fps, áudio ligado |
| `vio:invite-ttl` | 1h, 1d (padrão) ou 7d |
| `vio:widgets:closed`, `vio:canvas:v2`, `vio:catalog-tab`, `vio:raffle-wheel`, `vio:poll-chart` | estado de widgets e canvas |
| `vio:session` | `sessionStorage`; sessão da aba |

## Peças e técnicas

| Peça/técnica | Para que | Onde |
| --- | --- | --- |
| React 19.3 (`lazy`, `Suspense`, portal) | Interface; `RoomCanvas` sob demanda; player em `playerHost` | `App.tsx` |
| `useSyncExternalStore` | Assinar `Controller`, `CanvasStore`, `toasts` | `App.tsx`, `Toasts.tsx`, `canvas/model.ts` |
| Vite 8.3 + `@vitejs/plugin-react` | Bundler; modo middleware em dev | `vite.config.ts` |
| `<dialog>` nativo (`showModal`/`show`) | Painéis, Esc, foco devolvido | `components/Dialog.tsx` |
| Popover API (`popover="manual"`) com portal de reserva | Popovers ancorados; fecha em clique fora, Esc, tela cheia | `components/AnchoredPopover.tsx` |
| Posição de popover com flip e `visualViewport` | Não sair da tela, teclado e zoom | `components/popover-position.ts` |
| Encaixe em 6 âncoras | Painel de pessoas arrastável | `components/floating-position.ts`, `FloatingPeople` |
| Menu de contexto (tecla ContextMenu, Shift+F10, setas, Home/End) | Menu de pessoa | `ContextMenu.tsx`, `PersonMenu.tsx` |
| FLIP manual | Deslize de toasts | `Toasts.tsx` |
| Web Audio (`OscillatorNode`, `GainNode`) | Sons de interface sem arquivos de áudio | `media/sounds.ts` |
| `HTMLMediaElement.setSinkId` | Saída de áudio escolhida também para os sons | `media/sounds.ts` |
| `matchMedia` | Movimento reduzido, tela estreita | `motion.ts`, `Settings.tsx` |
| `history.pushState`/`popstate` | Uma entrada por visita à sala; Voltar sai, Avançar volta (#309) | `room/room-history.ts`, `App.tsx` |
| Service worker cache-first | Cache de `/assets/*` e ícones | `public/sw.js` |
| `beforeinstallprompt` | Botão instalar | `InstallApp.tsx` |
| WebMCP (`document.modelContext`) | Expor a sala a agentes | `webmcp.ts` |
| Contraste AA calculado | Cor da pessoa legível (`colorInk` ≥ 4.5, `readableAccent` contra #242838) | `shared/colors.ts`, `ColorPicker.tsx` |
| Referrer-Policy `no-referrer`, só https | Foto de avatar de terceiros | `Avatar.tsx` |
| Fontes variáveis auto-hospedadas | Bricolage Grotesque, IBM Plex Mono | `main.tsx`, `styles.css` |
| Variáveis CSS em `:root` | Tokens (`--bg`, `--panel`, `--raised`, `--line`, `--muted`, `--text`, `--blue`, `--blue-light`, `--live`, `--danger`, `--focus`, `--radius` 18px, `--space` 8px, `--ease` 160ms) | `styles.css` |
| Componentes (uma linha cada) | Landing: página de venda, formulário, botão de download, `MiniRoom`, `InstallApp`. Home (só no app): início (criar/entrar, recentes, Esquecer) e `Splash`. Door: espera, recusa, convite expirado. Settings: 7 categorias (Áudio, Vídeo, Notificações, Aparência, Acessibilidade, Aplicativo, Sala), busca sem acento, `VoiceMeter`. ApplicationSettings: `MasterVolume`, `NotificationSettings`, `ParticipantColors`. PeoplePanel: linhas de 48 px com avatar, nome, papel, estado de chamada. PersonMenu: menu de voz e papéis. FloatingPeople: painel arrastável. Avatar: anel com foto opcional. ContextMenu, Dialog, AnchoredPopover: base de menus e janelas. EmojiPicker: 40 emojis sem dependência. ColorPicker: predefinidos e HSV/hex com checagem AA. InstallApp: instalar PWA. Logo: SVG com o ponto. RoomStatus: `RoomTimer`, `ScreenTimer`, `RoomLimit`, `ConnectionStatus`. RoomLock: `RoomCode` e painel de trava/convite com trava de Tab. Toasts e Notifications: avisos. | `src/client/components/` |

## Mercado (pesquisa nov 2026)

Comparado: estado, renderização, movimento, PWA e acessibilidade do cliente contra React 19, o
React Compiler, Vite 8, View Transitions e as práticas de service worker.

| Método do mercado | Resolve | No VIO | Custo | Recomendação |
| --- | --- | --- | --- | --- |
| Seletores com `useSyncExternalStore` | Cada parte da tela só redesenha quando o seu dado muda | parcial: usado em `Toasts`, `Settings`, `App`, `RaffleFace`, `PollFace` e `RoomCanvas`, mas `bump()` redesenha o `App` inteiro (07.8) | código nosso | adotar |
| React Compiler 1.0 | Memoização automática, sem `useMemo` à mão | não | dependência nova | depois |
| `lazy`/`Suspense` + divisão de pacote do Vite 8 | Baixar só o que a tela usa | sim (`RoomCanvas` é lazy) | — | manter; medir o pacote e separar Ajustes e o catálogo |
| View Transitions (Baseline desde out 2025: Chrome e Edge 111, Safari 18, Firefox 144) | Transição entre telas com o ponto da marca levando de um lugar a outro | não (07.4) | código nosso | adotar na #261 |
| Movimento reduzido sem depender de `animationend` | Reduzir movimento sem quebrar o que espera o fim da animação | parcial: os dois modos quebram o toast (07.1) | código nosso | adotar |
| Nome do cache do service worker por build | Cada versão limpa o cache da anterior | não: `vio-static-2.6.0` fixo, nada o atualiza (07.3) | código nosso | adotar |
| Regiões vivas (`aria-live`, `role="status"` e `"alert"`) | O leitor de tela anuncia os avisos | sim | — | manter |
| `color-scheme` e tema escolhido | Tema claro ou escuro pela preferência | parcial: só `color-scheme: dark` (07.5) | código nosso | depois; unificar os tokens antes (07.6) |

**Fontes:** https://react.dev/blog/2025/10/07/react-compiler-1 ·
https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available ·
seletores e cache do service worker: conhecimento geral.

## Achados

| ID | Achado | Tipo | Confiança | Onde |
| --- | --- | --- | --- | --- |
| 07.1 | O toast quebra nos dois modos de movimento reduzido. Pelo sistema: a regra global de `styles.css` (~L1401–1409, `animation: none !important`) vence a de `workspace.css` (~L2929–2936); a `.toast-bar` (~L2907) não anima, `onAnimationEnd` (`Toasts.tsx` ~L165–170) nunca dispara e o toast **não fecha sozinho**. Por Ajustes (`data-motion="reduce"`): `preferences.css` (~L625–631) põe 0,01 ms e o toast fecha na hora, inclusive o da batida na porta (15 s). Correção provável: prazo em JS, não no fim da animação. | bug | alta (pela cascata do CSS; não reproduzido) | `components/Toasts.tsx`; `styles.css`; `workspace.css`; `preferences.css` |
| 07.2 | A regra de movimento reduzido apaga toda animação e transição, inclusive esmaecimentos, contra o CLAUDE.md ("reduzem a só esmaecimento"). O piscar do ponto da porta é cancelado (`door.css` ~L310), e as variantes reduzidas do `Splash` (`home.css` ~L452) perdem para o `!important`. | risco | alta | `styles.css`; `preferences.css`; `door.css`; `home.css` |
| 07.3 | `public/sw.js` fixa `vio-static-2.6.0` com o app na 2.12.0-rc.6: o cache nunca troca de nome e os `/assets/*` de builds antigos se acumulam no aparelho. Não há casca offline: o pré-cache tem só 3 ícones (o `features.test.ts` fala em "4 recursos"; conferir). Ver [09](09-hospedagem-deploy-release.md) (09.1). | risco | alta | `public/sw.js` |
| 07.4 | `data-ponto` é só marcação (`Landing.tsx` ~L50, ~L149, ~L272): nenhum CSS ou JS o lê, e não há View Transition nem FLIP do ponto entre telas. A #261 segue aberta. | lacuna | alta | `components/Landing.tsx`; `components/Logo.tsx`; `home.css`; `door.css` |
| 07.5 | A decisão 003 diz que o tema Noite se escolhe em Ajustes; não há seletor de tema, `prefers-color-scheme` nem `data-theme`, só `color-scheme: dark`. | doc desatualizado | alta | `docs/decisoes/003*`; `components/Settings.tsx`; `styles.css` |
| 07.6 | Tokens duplicados: `room.css` redefine `:root` (`--panel` #151722 contra #14151f; `--raised` #22263b contra #1b1c29; também `--line`, `--muted`, `--text` e `--focus`), e `landing.css` tem um terceiro conjunto (`--paper`, `--ink`, `--accent`, `--brand`). Cerca de 712 cores hex soltas no CSS. | risco | alta | `styles.css`; `room.css`; `landing.css` |
| 07.7 | Resolvido na #309: Voltar sai da sala e Avançar volta. Resta: Voltar logo depois de recarregar a sala sai pela despedida comum (não explícita), porque o início pertence ao documento anterior. | lacuna | média | `room/room-history.ts`; `App.tsx`; `room/controller.ts` › `resume` |
| 07.8 | `bump()` redesenha o `App` inteiro a cada mudança; não há `memo` nem seletores no caminho principal. | desempenho | baixa (não medido) | `room/controller.ts` › `bump`; `App.tsx` |
| 07.9 | `docs/ARVORE.md` cita `VolumeControl.tsx`, que não existe (hoje `VolumeSlider` e `ScreenVolume`), e não lista `Home`, `Door`, `Notifications`, `Toasts`, `PeoplePanel` e outros. | doc desatualizado | alta | `docs/ARVORE.md` |
| 07.10 | `vio:room-credentials` guarda as credenciais de sala (até 20, inclusive de salas trancadas) em texto puro no `localStorage`: qualquer script na origem as lê. A CSP é a defesa. | risco | média | `room/controller.ts` |
| 07.11 | Recentes continuam sendo salvos no navegador (`saveRecent`, `App.tsx` ~L272), mas desde a #285 só o app os mostra (decisão do usuário). Falta decidir se o navegador para de salvar. | lacuna | alta | `App.tsx`; `room/recent-rooms.ts` |
| 07.12 | Miúdos: `theme-color` fixo (#0b0c13); `EmojiPicker` com 40 emojis fixos; o atalho de encaixe do canvas é só Shift; o WebMCP não faz nada. | lacuna | média | `App.tsx`; `components/EmojiPicker.tsx`; `canvas/shortcuts.ts`; `webmcp.ts` |
| 07.13 | Não achei link "pular para o conteúdo" (há `<main id="main-content">` e `h1.sr-only`). | lacuna | baixa (não confirmado) | `App.tsx` |

Testes do tema: `preferences.test.ts`, `features.test.ts`, `floating-position.test.ts`,
`popover-position.test.ts`, `recent-rooms.test.ts`, `toasts.test.ts`, `volume-slider.test.ts`,
`room-lock-client.test.ts` e `share-options.test.ts`. Os laboratórios (`tests/*Lab.tsx`) só rodam
em DEV ou com `ENABLE_TEST_LAB`. Nenhum teste cobre o toast nos dois modos de movimento reduzido.

## Perguntas em aberto

- Para que serve `data-ponto`: gancho para a #261 ou resto de uma tentativa?
- 07.1 acontece de fato num navegador, nos dois modos? Deduzido pelo CSS, não reproduzido.
- Há link "pular para o conteúdo"? A busca foi incompleta.
- Tamanho do pacote e do pedaço lazy do `RoomCanvas`: não medido.
- Como o sino ("Agora" e "Antes") se comporta depois de uma reconexão: não confirmado.
- Decisão 003: corrigir o doc ou criar o seletor de tema?
