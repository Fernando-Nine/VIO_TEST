# 10 — App VIO para Windows (Tauri 2)

> **Resumo:** Casca Tauri 2 + WebView2 que **empacota o cliente React** (build com `VITE_DESKTOP=1`) e o serve em `https://tauri.localhost`; só fala com o servidor do canal por HTTPS/WSS. O Rust lista telas/janelas/programas, captura imagem (WGC, Desktop Duplication ou PrintWindow) e áudio (WASAPI process loopback) e entrega à página: imagem por **SharedBuffer** NV12 (sem passar pelo IPC), áudio por PCM via `invoke` binário. A página vira `MediaStreamTrack` e publica pelo WebRTC de sempre. Atualização automática antes de abrir a janela, por `vio-releases`, com assinatura minisign.
>
> **Arquivos-chave:** `src-tauri/src/shell.rs` (janela, 12 comandos, updater, origem), `capture.rs` (áudio WASAPI + lista de programas), `video.rs` (lista de telas/janelas, miniaturas GDI/WGC), `stream.rs` (captura WGC → NV12 → SharedBuffer), `duplication.rs` (tela no Win10), `printwindow.rs` (janela no Win10), `programs.rs` (nome/ícone/quem toca som), `wire.rs` (formatos binários), `log.rs`, `main.rs`, `build.rs`, `capabilities/main.json`, `tauri.conf.json`, `tauri.updater.json`, `src/client/desktop/*.ts`, `scripts/desktop-channel.mjs`, `scripts/build-desktop.mjs`, `.github/workflows/windows.yml`.
>
> **Docs:** `docs/WINDOWS.md`, `docs/DESKTOP-WASAPI.md` (especificação inicial, parte desatualizada), `docs/WINDOWS-RELEASE.md`, `docs/decisoes/006-app-windows.md`.
>
> **Retrato:** commit `8bdc516` (5 nov 2026). Mudou o que esta ficha descreve? Atualize-a no mesmo PR.

## Como funciona hoje

### Janela e origem

1. `main.rs` só compila o app no Windows (`#[cfg(windows)]`); em outro SO imprime "VIO Desktop requires Windows x64." `windows_subsystem = "windows"` em release (sem console).
2. `shell.rs` › `run()` registra o plugin updater, 3 gerenciadores (`Manager` áudio, `VideoManager`, `StreamManager`) e os 12 comandos. No `setup`: inicia o log e, numa task assíncrona, **primeiro atualiza, depois abre a janela** (`update()` → `open()`). Se `open` falha, `exit(1)`.
3. `open()` cria a janela `main` com `WebviewUrl::App("index.html")` e `use_https_scheme(true)`: origem **`https://tauri.localhost`** (sem porta). 1280×800, mínimo 720×480. `.on_navigation(local)` recusa qualquer URL que não seja essa origem.
4. **O app empacota o cliente** (`frontendDist: ../dist/desktop`, gerado por `build-desktop.mjs`); não carrega a página remota. Só sinalização/Socket.IO vão ao servidor (`VITE_API_BASE` = servidor do canal; `VITE_WEB_URL` idem, para convites). O servidor precisa de `ALLOWED_APP_ORIGINS=https://tauri.localhost` (`src/server/config.ts` › `origemDeAppValida`, ~L73; `app.ts` ~L56/69/108 aceita a origem em CORS e Socket.IO). Está configurado nos dois Render (`docs/ESTADO.md`).
5. `watch_page`: handler `ProcessFailed` do WebView2; registra no log e **recarrega** se o processo de renderização morreu (`RENDER_PROCESS_EXITED`).
6. `on_window_event`: em `Destroyed`/`CloseRequested` para todo o áudio (`Manager.stop(None)`) e todo o vídeo (`StreamManager.stop(None)`).

### Ponte nativa (quem pode chamar o quê)

7. `tauri.conf.json` › `withGlobalTauri: true`: `window.__TAURI__` existe. `bridge.ts` › `nativeInvoke` só chama se `VITE_DESKTOP==="1"` **e** `__TAURI__.core.invoke` existir; senão rejeita com "Abra esta função no aplicativo VIO para Windows." (build web nunca expõe nativo).
8. `build.rs` declara os 12 comandos em `AppManifest::commands` → cada um exige permissão explícita (`allow-desktop-*`). `capabilities/main.json`: `local: true`, `windows: ["main"]`, as 12 permissões; **nenhuma** permissão `core:*`, de updater, fs, shell ou opener é concedida à página.
9. Defesa em profundidade em Rust: cada comando começa com `trusted(&window)`: label `main` **e** `window.url()` = `https://tauri.localhost` sem porta (`local()`). IDs de fonte/captura são validados por `valid_id` (32 hex). IDs são aleatórios (`capture.rs` › `key()`, 16 bytes de `BCryptGenRandom`); a página nunca vê PID, HWND, caminho.
10. CSP do app (`tauri.conf.json`): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; connect-src 'self' ipc: http://ipc.localhost https://<servidor> wss://<servidor>; worker-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none'`. `build-desktop`/`overlay()` troca o host do `connect-src` por canal.

Comandos (todos em `shell.rs`):

| Comando | Faz |
|---|---|
| `desktop_capabilities` | `{protocol:1, windowsBuild, processAudio: build>=19041}` |
| `desktop_sources` | lista "Só som": 1º "Todo o som do computador, sem o VIO" + programas (≤128) |
| `desktop_sound_icon` | ícone 48 px do programa (`VIOT`+RGBA) |
| `desktop_start_audio` / `desktop_read_audio` / `desktop_stop_audio` | inicia, lê pacote PCM, para a captura de áudio |
| `desktop_video_sources` | telas e janelas (estilo Alt+Tab) |
| `desktop_video_thumbnail` | miniatura ≤320×180 |
| `desktop_video_start` / `_wait` / `_stop` | captura de imagem, espera do próximo quadro, parada |
| `desktop_share_audio` | liga uma fonte de vídeo ao áudio do seu programa (ou PC inteiro sem VIO) |

### Captura de imagem (fluxo normal)

11. UI chama `listVideoSources` (`video.ts`) → `VideoManager.sources()`; miniaturas por `videoThumbnail` (`video.rs` › `thumbnail`): **GDI primeiro** (telas escaladas do desktop; janelas via `PrintWindow` com `PW_RENDERFULLCONTENT`), WGC só se o GDI vir preto (conteúdo protegido/fullscreen exclusivo). Máx. 3 miniaturas GDI em paralelo, 1 WGC por vez, cache de 4 s. Janela minimizada: devolve o ícone do programa.
12. `startNativeShare` (`share.ts`): se há áudio, chama `desktop_share_audio` (pede ao Rust a fonte de áudio ligada à janela, ou o PC inteiro); `selectProcess` + `selectVideo`; depois `engine.startScreen(...)` e `engine.quality(...)`. Tamanho pedido = `resolution*16/9` × `resolution`, fps arredondado para 15/30/60 (`captureRate`).
13. `windowsCapture.screen` (`capture.ts`) chama `startNativeVideo` (`native-video.ts`) → `desktop_video_start` (`stream.rs` › `StreamManager.start`): exige fps ∈ {15,30,60}; rejeita se já há > 3 capturas na tabela (permite 4 durante troca); `wire::fit` calcula o maior tamanho par com a proporção da fonte, **sem ampliar**, limitado a 3840×2160; cria o **SharedBuffer** (`CreateSharedBuffer`, `PostSharedBufferToScript` somente leitura, metadado `{"vio":"video","captureId":...}`) com 64 B de cabeçalho + 3 slots NV12.
14. Thread de captura escolhe o motor: **tela em Windows < 20348 (Win10) → Desktop Duplication** (`duplication.rs`, desenha o cursor à mão, sem borda amarela); **janela em Win10 → PrintWindow** (`printwindow.rs`, recorta a moldura visível, 100 ms de espera para minimizada/travada); **Windows 11, ou falha de qualquer um → WGC** (`stream.rs` › `capture`, `Direct3D11CaptureFramePool` com 2 buffers, `SetIsBorderRequired(false)`, `SetIsCursorCaptureEnabled(cursor)`, `SetMinUpdateInterval`). `borderless()` pede `GraphicsCaptureAccessKind::Borderless` (Win11, app não empacotado).
15. Cada quadro: GPU (D3D11 video processor) escala+converte para **NV12 BT.709 faixa limitada**; lê só o NV12 de volta (staging); sem video processor (driver básico/VM) cai no `wire::bgra_to_nv12` na CPU. `Writer.due()` descarta quadros adiantados (pacing); quadros atrasados na fila WGC são descartados (mantém só o mais novo). `publish` escreve no slot `sequence % 3` entre duas marcas de sequência (seqlock).
16. Página: laço `desktop_video_wait` (espera até 100 ms por quadro novo, 1 espera por vez) → `readSlot` (descarta o quadro se as duas marcas diferem) → `new VideoFrame(NV12)` → `MediaStreamTrackGenerator.writable`. Trilha marcada `contentHint="detail"` (#267, para o Chrome não encolher a tela); `getSettings`/`applyConstraints` são sobrescritos (o menu de qualidade limita o fps). O estado vem no `Tick`: `state` 0 iniciando, 1 rodando, 2 encerrada, 3 falhou; `state>=2` dispara `ended` explícito.
17. Parar: `desktop_video_stop` → `Stream.stop` (evento de parada, `join` da thread, fecha o buffer na thread principal). Pânico na thread de captura vira `state=3` e erro "O Windows interrompeu a captura da imagem." (`panic = "unwind"` no release).

### Captura de áudio (WASAPI)

18. `capture.rs` › `enumerate`: um programa por processo com janela Alt+Tab (`video::app_windows`, resolve apps da Store via `ApplicationFrameHost`/CoreWindow) mais os que estão **tocando sem janela** (`programs::playing`: sessões de áudio ativas em qualquer saída). Auxiliares de um programa listado (processo de áudio do navegador) ficam de fora. Exclui a árvore do próprio VIO (`own_tree`, snapshot ToolHelp, fecho por pai→filho: inclui os subprocessos WebView2). Nomes: `FileDescription`, ou nome de exibição do app da Store (AUMID).
19. `Capture.start`: revalida (janela ainda existe e é do mesmo PID; processo com mesmo horário de início e vivo), cria thread MTA que chama `ActivateAudioInterfaceAsync(VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK)` com `INCLUDE_TARGET_PROCESS_TREE` (programa + filhos) ou, para "som do PC sem VIO", `EXCLUDE_TARGET_PROCESS_TREE` sobre o próprio processo (as vozes da chamada, tocadas por filhos do VIO, ficam de fora; sem eco). Espera a ativação até 5 s.
20. Formato fixo pedido: PCM 16-bit, 2 canais, 48 kHz, `SHARED | LOOPBACK | EVENTCALLBACK | AUTOCONVERTPCM`. Thread espera `WaitForMultipleObjects` (parada, processo-alvo morreu, dados; timeout 1 s). Dados vão a um anel (`VecDeque<f32>`) de 9600 quadros (200 ms): ao encher descarta o mais antigo; descontinuidade limpa o anel e incrementa `dropped`; `SILENT` vira zeros.
21. `Capture.read` (`desktop_read_audio`): espera até 20 ms por ≥960 quadros (10 ms), entrega até `MAX_FRAMES`=4800 quadros (100 ms) em pacote `VIOA` (cabeçalho 32 B: magic, versão 1, estado, sequência, dropped, quadros, 48000, erro HRESULT; floats LE). Uma leitura pendente por vez. Estados: 0 iniciando, 1 rodando, 2 encerrado, 3 falha.
22. Página (`capture.ts`): `AudioContext({sampleRate:48000, latencyHint:"interactive"})` + `AudioWorkletNode "vio-process-audio"` (`pcm-worklet.js`, fila estéreo 9600 quadros, reamostra linear, só começa com ≥960 quadros, descarta tudo se passar de 4800) → `MediaStreamAudioDestination` (**não** vai ao alto-falante local). Espera o primeiro pacote com estado ≥1 (timeout 7 s; estado ≥2 = erro "O Windows não liberou este áudio"). Depois um laço com 1 `invoke` pendente. `dropped` mudou → `postMessage("reset")`. Sem AGC/ruído/eco (a trilha é só a captura).
23. Regras de áudio (`audio_conflict`): máx. **3 sons** simultâneos; "som do PC" não convive com outro; o mesmo programa não entra duas vezes. "Só som" (#229) usa um slot de tela sem imagem (`selectSoundOnly`, `startNativeSound`).
24. Troca de fonte (#160/#246): a captura nova só substitui a anterior depois de pronta; o áudio da antiga é liberado antes (`previous.releaseAudio()` + `await released`) porque o mesmo app não pode ser capturado duas vezes.

### Atualização, build e distribuição

25. `update()` (`shell.rs`): `updater_builder().timeout(20 s)`; checa, `download_and_install`, `app.restart()`. Erro (sem rede, sem release, assinatura inválida) é ignorado e o app abre a versão atual. Só roda **antes** da sala abrir (nunca no meio de uma chamada). No canal teste usa `version_comparator(update.version != current)` (aceita "versão menor" de pré-lançamento). `installMode: passive`.
26. Dois canais (`desktop-channel.mjs`): **stable** "VIO" (`studio.nerdquest.vio`, servidor vio-quest, feed `latest.json` em `releases/latest/download/`, instalador `VIO-x64-setup.exe`, tag `vX.Y.Z`) e **beta** "VIO Teste" (`studio.nerdquest.vio.test`, vio-test, `beta.json` no release fixo `beta`, instalador `VIO-Teste-<versão>-x64-setup.exe`, ícone com selo). Cada um tem **chave pública minisign própria** (IDs `7D499EB91F0CA1FE` produção, `3123E38BB793CE0D` teste, ver WINDOWS-RELEASE); o beta nunca instala o stable. Versão beta = `<package.json>.<GITHUB_RUN_NUMBER>` (ex. `2.12.0-rc.6.123`; sem prerelease → `-rc.0.<run>`).
27. `build-desktop.mjs`: Vite com `NODE_ENV=production`, `VITE_DESKTOP=1`, `outDir dist/desktop`, sem sourcemap, `assetsInlineLimit 0`. `desktop-channel.mjs config` gera `src-tauri/tauri.channel.json` (productName, version, identifier, CSP, ícone, pubkey, endpoint) e, no stable em tag, **aborta se a tag ≠ `v<versão>`**.
28. `windows.yml` (runner `windows-latest`, timeout 40 min): `npm ci` → `npm run build` (gera `dist/source.tar.gz`, embutido no instalador como recurso, AGPL) → `build:desktop` → config → `cargo test --locked` → testes `--ignored` de troca (`native_swap`, `audio_swap`, bloqueantes) e de CPU/miniaturas (`continue-on-error`) → `tauri build --bundles nsis` (com `tauri.updater.json` e chave só se `PUBLISH` e há segredo) → artefato `VIO-Windows-x64` (14 dias) → publica no `vio-releases` com `gh` (token `VIO_RELEASES_TOKEN`). Beta: sobe instalador antes do feed (o feed antigo continua válido), edita notas, apaga instaladores antigos do release. Sem segredos: só gera o artefato e avisa.
29. Instalador NSIS `currentUser` (sem admin), PT-BR, WebView2 por `downloadBootstrapper` silencioso, **sem assinatura de código** (SmartScreen avisa; decisão da ADR 006). Licença `LICENSE` no instalador.

### Logs

30. `log.rs`: um arquivo `vio.log` em `app_log_dir()`, rotacionado para `vio.old.log` acima de **256 KB**; linha = `<epoch s> <tipo> <texto>`, sem caracteres de controle, ≤400 caracteres; só códigos/locais (HRESULT, `arquivo:linha`), nunca nome, sala, título de janela ou token; nunca enviado. Um panic hook grava `panic`. Tipos usados: `start`, `panic`, `webview`, `audio`, `video`, `duplication`, `printwindow`.

### Requisitos de Windows

31. App só x64 (`windows-x86_64` no feed). Áudio por processo: `MIN_BUILD = 19041` (Win10 2004); abaixo disso `processAudio=false` e a UI mostra "O som precisa do Windows 10 versão 2004 ou mais recente." (`ShareDialog.tsx` ~L311). WGC sem borda amarela: build ≥ 20348 (Win11); Win10 usa Duplication/PrintWindow. `MediaStreamTrackGenerator` e `chrome.webview` são exigidos do WebView2 (senão "Atualize o Windows"). Landing diz "Windows 10 e 11".

## Números

| Parâmetro | Valor | Onde |
|---|---|---|
| Origem do app | `https://tauri.localhost`, sem porta | `shell.rs` › `local` |
| Janela | 1280×800, mín. 720×480 | `shell.rs` › `open` |
| Comandos nativos | 12 | `build.rs`, `capabilities/main.json` |
| Id de fonte/captura | 32 hex (16 bytes aleatórios) | `capture.rs` › `key`, `shell.rs` › `valid_id` |
| Build mínimo para áudio por processo | 19041 | `capture.rs` › `MIN_BUILD` |
| Build para WGC sem borda | 20348 | `duplication.rs` › `wanted` |
| Áudio: formato | PCM16 estéreo 48 kHz → float | `capture.rs` › `run` |
| Anel de áudio (Rust / worklet) | 9600 quadros (200 ms) / 9600 quadros | `capture.rs` › `RING_FRAMES`, `pcm-worklet.js` |
| Pacote de áudio | cabeçalho 32 B, ≤4800 quadros (≤38 432 B) | `wire.rs`, `bridge.ts` › `decodePacket` |
| Espera de leitura de áudio | 20 ms por 960 quadros (10 ms) | `Capture.read` |
| Limite da fila do worklet | descarta tudo se >4800 quadros; começa com ≥960 | `pcm-worklet.js` |
| Ativação do loopback | timeout 5 s (Rust); 7 s até o 1º pacote (página) | `capture.rs`, `capture.ts` |
| Sons simultâneos | 3 | `capture.rs` › `MAX_AUDIO` |
| Telas simultâneas (nativas) | 3 (4 durante troca) | `stream.rs` › `MAX_STREAMS` |
| Resolução máx. de captura | 3840×2160, sem ampliar | `stream.rs` |
| FPS aceitos | 15 / 30 / 60 | `StreamManager.start`, `captureRate` |
| Slots do SharedBuffer | 3; cabeçalho 64 B; slot alinhado a 64 B (16 B de marcas + NV12) | `wire.rs` |
| Espera de quadro | 100 ms | `Stream.wait` |
| Início da captura / buffer | 5 s cada | `StreamManager.start`, `shared_buffer`, `bufferFor` |
| Primeiro quadro (miniatura WGC) | 800 ms | `video.rs` › `FIRST_FRAME` |
| Miniatura | ≤320×180 (JPEG 0,85; ícone PNG) | `wire.rs`, `video.ts` |
| Miniaturas | 3 GDI paralelas, cache 4 s | `video.rs` |
| Lista de fontes | ≤128 janelas/programas; cooldown 700 ms; válida 60 s | `video.rs`, `capture.rs` |
| Ícone de programa | 48 px | `programs.rs` › `ICON` |
| Updater | timeout 20 s | `shell.rs` |
| Log | 256 KB, linha ≤400 | `log.rs` |
| Workflow | timeout 40 min | `windows.yml` |

## Peças e técnicas

| Peça/técnica | Para que | Onde |
|---|---|---|
| Tauri 2.12.5 (lock) + WebView2, `webview2-com 0.39`, crate `windows 0.62` | casca, acesso Win32/WinRT | `Cargo.toml`/`Cargo.lock` |
| `tauri-plugin-updater 2.14` (minisign) | atualização automática assinada | `shell.rs`, `tauri.conf.json` |
| Windows.Graphics.Capture (`Direct3D11CaptureFramePool`, `IGraphicsCaptureItemInterop`) | tela/janela no Win11; fallback no Win10 | `stream.rs`, `video.rs` |
| DXGI Output Duplication | tela no Win10 sem borda amarela | `duplication.rs` |
| `PrintWindow` + `PW_RENDERFULLCONTENT` | janela no Win10 sem borda; miniaturas | `printwindow.rs`, `video.rs` |
| D3D11 Video Processor (escala + BGRA→NV12 na GPU) e conversor CPU | converter sem custo de CPU / driver básico | `stream.rs`, `wire.rs` |
| WebView2 SharedBuffer (`CreateSharedBuffer`, `PostSharedBufferToScript`, evento `sharedbufferreceived`) | quadros sem passar pelo IPC | `stream.rs`, `native-video.ts` |
| Seqlock de 3 slots | ler quadro sem travar escritor | `wire.rs`, `native-video.ts` › `readSlot` |
| `MediaStreamTrackGenerator` + `VideoFrame` NV12 | virar trilha WebRTC | `native-video.ts` |
| `contentHint="detail"` | evitar redução de resolução do codificador | `native-video.ts` › `asScreenContent` |
| WASAPI `ActivateAudioInterfaceAsync` com process loopback (INCLUDE / EXCLUDE tree) | áudio por programa e do PC sem o VIO | `capture.rs` |
| IAudioSessionManager (sessões ativas) | saber quem toca som | `programs.rs` › `playing` |
| ToolHelp snapshot | árvore de processos (própria e pai/filho) | `capture.rs` › `own_tree`, `programs.rs` |
| `invoke` binário (`tauri::ipc::Response`) | pacotes de áudio, miniaturas, ícones | `shell.rs` |
| AudioWorklet + `MediaStreamAudioDestination` | PCM → trilha de áudio | `pcm-worklet.js`, `capture.ts` |
| Palavras mágicas `VIOA`, `VIOT`, `VIOV` | contratos binários versionados | `wire.rs`, `bridge.ts`, `video.ts` |
| `catch_unwind` + `panic=unwind` + hook de log | falha de captura não derruba o app | `capture.rs`, `stream.rs`, `log.rs` |
| `CoIncrementMTAUsage` (`keep_mta`) | evitar crash por MTA derrubada entre threads curtas (#247) | `video.rs` |
| NSIS por usuário, `downloadBootstrapper` | instalador | `tauri.conf.json` |
| minisign (chaves por canal) | assinar atualizações | `desktop-channel.mjs`, workflow |
| GitHub Releases em `vio-releases` | hospedar instaladores e feed | `windows.yml` |

## Mercado (pesquisa nov 2026)

Comparado: captura nativa, segurança da casca e distribuição do app Windows contra a
documentação da Microsoft e do Tauri, fóruns do OBS sobre anti-cheat e serviços de assinatura.

| Método do mercado | Resolve | No VIO | Custo | Recomendação |
| --- | --- | --- | --- | --- |
| Windows.Graphics.Capture (WGC) | Captura de janela e de tela pela API oficial | sim | — | manter |
| `IsBorderRequired = false` + `RequestAccessAsync` (build 20348 ou mais) | Captura sem a borda amarela | sim | — | manter |
| Desktop Duplication e `PrintWindow` como reserva | Captura quando o WGC falha | sim | — | depois: testar num jogo protegido (10.2) |
| Gancho no jogo (injeção de DLL no D3D, como o "Game Capture" do OBS) | Captura de tela cheia exclusiva | não | código nosso, arriscado | não vale: anti-cheat trata injeção como trapaça |
| Loopback por processo (`AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS`) | Som de um programa só | sim | — | manter |
| Codificação por hardware no nativo (Media Foundation, NVENC) | Menos CPU ao transmitir | não: o WebView2 codifica | código nosso | depois |
| Buffer compartilhado (`SharedBuffer`, NV12) | Quadros sem cópia extra entre Rust e página | sim | — | manter |
| Capabilities do Tauri 2 | A página só chama os comandos liberados | sim | — | manter |
| Consentimento nativo no Rust antes de capturar | Script malicioso não captura sem a pessoa ver | não (10.1) | código nosso | **adotar agora** |
| Updater com assinatura minisign | Atualização que não pode ser trocada no caminho | sim | — | manter |
| SignPath Foundation (assinatura grátis para código aberto) | Instalador assinado, menos alerta do SmartScreen | não | grátis; exige repositório público, build automático, licença OSI e crédito no README; leva 1–2 semanas; o alerta do SmartScreen não some na hora | adotar ao abrir ao público |
| Azure Artifact Signing (~US$ 10/mês; só EUA e Canadá) | Assinatura comercial | não | pago | depois |
| winget ou MSIX | Instalar e atualizar pela loja ou pela linha de comando | não: NSIS | código nosso | depois |

**Fontes:**
https://learn.microsoft.com/en-us/uwp/api/windows.graphics.capture.graphicscapturesession.isborderrequired ·
https://learn.microsoft.com/en-us/windows/win32/api/audioclientactivationparams/ns-audioclientactivationparams-audioclient_process_loopback_params ·
https://obsproject.com/forum/threads/valorant-lagging-and-will-not-capture-on-obs.182710/post-674014 ·
https://obsproject.com/forum/threads/black-screen-game-capture-easyanticheat.113475/ ·
https://kitemetric.com/blogs/valorant-and-obs-a-definitive-guide-to-fixing-capture-issues (fonte
fraca) · https://v2.tauri.app/security/capabilities/ ·
https://about.signpath.io/product/open-source ·
https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options

## Achados

| ID | Achado | Tipo | Confiança | Onde |
| --- | --- | --- | --- | --- |
| 10.1 | Qualquer script que rode na origem `https://tauri.localhost` (um XSS no cliente empacotado) pode listar janelas e telas e iniciar captura de imagem e de som **sem diálogo do Windows nem do Rust**: o consentimento é só a interface da página. Não há checagem de gesto nem confirmação nativa. Mitigações: CSP `script-src 'self'`, `connect-src` restrito ao servidor, `frame-src 'none'` e navegação travada; `style-src 'unsafe-inline'` e `worker-src blob:` afrouxam um pouco. | risco | alta | `src-tauri/src/shell.rs` › `desktop_start_audio` (~L75), `desktop_video_start` (~L129); `tauri.conf.json` |
| 10.2 | Anti-cheat (EAC, BattlEye, Vanguard): o app não injeta DLL, não faz gancho no D3D/DXGI nem lê memória de outro processo; usa APIs oficiais e abre cada processo com direitos mínimos (`PROCESS_QUERY_LIMITED_INFORMATION`, `PROCESS_SYNCHRONIZE`). Resta: `PrintWindow` manda mensagem ao thread da janela do jogo (Windows 10), e WGC ou Duplication podem dar tela preta em tela cheia exclusiva ou protegida. Não há parecer escrito (o `ESTADO.md` o lista como pendente) nem teste com jogo real. | risco | média | `capture.rs` › `open_process`; `printwindow.rs`; `docs/ESTADO.md` |
| 10.3 | A Microsoft documenta o loopback por processo a partir do build 20348, e o app o libera desde o 19041 (`MIN_BUILD`, com comentário dizendo que funciona em Windows 10 atualizado). Num 19041–19044 sem atualização pode falhar. | risco | média | `capture.rs` (~L41–43) |
| 10.4 | O `paths` do `windows.yml` não inclui `scripts/desktop-channel.mjs`, que o job usa (~L62, ~L106–114): mudar o canal ou o feed não dispara o build do Windows. (`tauri.updater.json` fica em `src-tauri/**`, que já dispara.) | bug | alta | `.github/workflows/windows.yml` (~L9–29) |
| 10.5 | Instalador sem assinatura de código; a atualização é assinada só por minisign. A chave privada de produção vive só como secret no repositório VIO: perdê-la obriga reinstalação manual. O updater não tem volta de versão nem versão mínima no canal estável. | risco | alta | decisão 006; `windows.yml` |
| 10.6 | O `tauri.conf.json` versionado traz os valores do canal **beta** (pubkey, endpoint, CSP do vio-test): um build sem o `tauri.channel.json` sairia como "VIO Teste". | risco | média | `src-tauri/tauri.conf.json`; `scripts/desktop-channel.mjs` |
| 10.7 | O canal de teste aceita qualquer versão diferente da atual (`!=`), inclusive mais antiga (de propósito, diz o comentário). Um feed adulterado só passa com assinatura válida: depende de a chave de teste não vazar. | risco | média | `shell.rs` › `update` (~L195) |
| 10.8 | `docs/DESKTOP-WASAPI.md` diz que "não existe binário WASAPI entregue ou validado" e que nenhuma origem nativa foi liberada no Render; as duas coisas já existem. Também descreve janela flutuante e uma "Ordem de entrega" que o código não tem. Ver [04](04-captura-tela-e-audio.md) (04.4). | doc desatualizado | alta | `docs/DESKTOP-WASAPI.md` |
| 10.9 | `docs/WINDOWS.md` diz que a imagem se escolhe "no seletor do Windows" (hoje há seletor próprio com `desktop_video_*`; o do WebView2 é só reserva) e que o loopback por processo é "Windows 11" (o código libera desde o 19041). | doc desatualizado | alta | `docs/WINDOWS.md` |
| 10.10 | A tabela do `docs/WINDOWS-RELEASE.md` cita estável 2.9.0 e beta `2.9.0-rc.11.<n>`; hoje são 2.11.0 e 2.12.0-rc.6. | doc desatualizado | alta | `docs/WINDOWS-RELEASE.md` (~L9) |
| 10.11 | O comentário de `config.ts` e um teste do servidor falam em `http://tauri.localhost`, mas o app usa `use_https_scheme(true)` (`https://tauri.localhost`). O validador aceita os dois, mas o exemplo da mensagem de erro induz a configurar `http`. | doc desatualizado | média | `src/server/config.ts` (~L70, ~L97); `tests/server.test.ts` (~L582) |
| 10.12 | Os testes nativos pesados são `#[ignore]` e rodam só no runner sem GPU (WARP); o desempenho real só é medido no PC do usuário, e o teste de CPU roda com `continue-on-error`. | lacuna | média | `windows.yml` (~L71); `stream.rs` |
| 10.13 | Janela nova (`window.open`, Document PiP) é **recusada** pelo wry 0.57: sem `on_new_window` no `shell.rs`, o handler `NewWindowRequested` faz `SetHandled(true)` sem janela. Bom para a segurança; por isso o PiP não funciona no app e o botão Flutuante fica escondido nele (#280). Janela flutuante nativa seria feature nova: a mídia viva não passa de um WebView para outro. | lacuna | alta | `shell.rs` › `open` (~L212); `wry/src/webview2/mod.rs` (~L782); `media/picture-in-picture.ts` |
| 10.14 | `OpenProcess` por janela e snapshot do ToolHelp a cada listagem pesam num PC com centenas de processos; a pausa de 700 ms entre listagens atenua. | desempenho | baixa | `capture.rs`; `video.rs` |

## Perguntas em aberto

- Existe parecer sobre anti-cheat? Só consta como pendente, e não há teste com jogo protegido.
- `PrintWindow` numa janela de jogo no Windows 10 tem efeito colateral no jogo? Não confirmado.
- Quantas sessões de áudio `playing()` enumera num PC carregado (`programs.rs` não lido a fundo)?
- A casca do Tauri bloqueia `window.open` além do `on_navigation`? Depende do plugin.
- Como o NSIS trata dois instaladores abertos ao mesmo tempo (o do updater e um antigo)?
- `desktop.test.ts` (7 casos) e `desktop-swap.test.ts` (2) cobrem a fila do worklet, os
  decodificadores `VIOA`, `VIOT` e `VIOV`, fps, `contentHint` e a troca de fontes com falsos; nada
  exercita o Rust fora da CI do Windows.
