# 05 — Telas e reprodução (a experiência de quem assiste)

> **Resumo:** Quem assiste escolhe quais transmissões (`screen`) quer ver; cada escolha vira uma
> assinatura `main` individual por `publicationId`, e a tela aparece como widget no canvas. Foco,
> posição e tamanho só mudam apresentação. O vídeo do widget informa ao servidor uma "demanda"
> (`off/small/fit/focus` + altura) e quem transmite ajusta o envio para cada espectador. A prévia
> barata (tier `preview`) existe no controller, mas hoje **nenhuma tela viva a aciona** (ver Achados).
>
> **Arquivos-chave:** `src/client/room/watching.ts` (regras puras de assistir/focar),
> `src/client/room/controller.ts` (`watch`, `reconcile`, `previews`, `setVideoDemand`),
> `src/client/canvas/widgets.tsx` (`ScreenWidget`, demanda de vídeo), `src/client/canvas/RoomCanvas.tsx`
> (widget de tela, oferta de vaga, `<ScreenAudio>` em `.canvas-audio`), `src/client/components/{ScreenAudio,Media,Spectators,LiveScreens,ScreenVolume}.tsx`,
> `src/client/media/{screen-playback,picture-in-picture,video-quality,remote-stream}.ts`,
> `src/client/canvas/{CamerasWidget.tsx,camera-layout.ts,MyStreamWidget.tsx}`,
> `src/client/App.tsx` (tela cheia e PiP), `src/client/desktop/{video,native-video}.ts` (lado de quem envia no app Windows).
>
> **Docs:** `docs/MULTITELAS-UX.md` (desatualizado em parte, ver Achados), `docs/CANVAS.md` (layout dos widgets),
> `docs/NAVEGADORES.md` (PiP/tela cheia por navegador), `docs/DESKTOP-WASAPI.md`/`docs/WINDOWS.md` (app Windows).
> Negociação WebRTC (ofertas, round, ICE): outro tema, ver `src/client/media/peers.ts` › `signal`.
>
> **Retrato:** commit `8bdc516` (5 nov 2026). Mudou o que esta ficha descreve? Atualize-a no mesmo PR.

## Como funciona hoje

**A. Escolher o que assistir**

1. O snapshot da sala traz as publicações. `controller.ts` › `applySnapshot` (~L950) guarda cada `screen`
   em `screenCatalog` (nome, cor, publicação). Entrada sai do catálogo se não está mais presente e não é assistida.
2. Quem começa a transmitir vira aviso: `RoomCanvas.tsx` (~L640) cria um toast "começou a transmitir" com botão
   Assistir (só se `balloons.screens` ligado e a sala já estava "primed", ou seja, não avisa as telas que já existiam ao entrar)
   e um item no sino. `LiveScreens.tsx` é o ícone da barra (só existe com transmissões de outras pessoas):
   lista título, "Só som" (ícone `Music`) para `audioOnly`, e botão Assistir/Ouvir; hover abre, fecha 400 ms depois de sair.
3. `controller.watch(id, together, approved)` (~L1204): ignora id fora do catálogo; se há `watchRequest`
   (registrado pelo `RoomCanvas`), ele decide a vaga (slot livre, flutuante, ou diálogo "Todos os espaços estão ocupados")
   e devolve `false`, repetindo a chamada com `approved=true` depois. Se o volume da tela está acima de 100%, chama
   `playback.unlock()` (gesto do usuário para criar `AudioContext`).
4. `watching.ts` › `watchScreen`: já assistida = só muda `selected`; primeira = vira assistida e selecionada;
   `together` = acrescenta sem mudar o foco; senão **troca** a tela em foco pela nova. `unwatchScreen` remove e
   passa o foco para a primeira restante. `watchOnlyScreen` deixa só uma (sem remontar se já era a única).
   Foco nunca altera `watching` (comentário do arquivo).
5. `controller` chama `reconcile()` quando `watching` muda. Para cada publicação `screen` assistida cria
   a intenção `id:main`; chama `request("subscribe", {publicationId, tier:"main", nonce})` e `peers.accept(sub)`.
   Quem sai da lista é cancelado com `unsubscribe` (`controller.ts` › `reconcile` ~L1311).
6. Servidor: `rooms.ts` › ação `subscribe` (~L1111) recusa publicação própria; `preview` só para `screen`; no máximo
   `maxPreviews` (=2) previews distintas por espectador (`PREVIEW_LIMIT`). O id da assinatura é HMAC estável de
   `publicationId:viewerId:tier:nonce`. Assinaturas antigas do mesmo tier/publicação são fechadas.
7. Quando a tela some do servidor (`publication-ended`) o cliente fecha o peer, apaga do catálogo e chama `stopWatching`.
   Se a pessoa cai ou o snapshot perde a tela, `missingScreens` dá **30 s** de graça com o peer ainda conectado
   antes de desistir (`reconcile`, `missingSince`).

**B. Layout das telas (multitelas) hoje: o canvas**

8. Cada tela assistida é um widget `screen:<publicationId>` no canvas (`RoomCanvas.tsx` ~L655: cria o widget se falta,
   remove se deixou de ser assistida ou virou só-som). Máximo de transmissões **por pessoa**: `MAX_SCREENS = 3`
   (`protocol.ts` L6); não há teto de telas assistidas ("a ausência de teto não garante desempenho", `MULTITELAS-UX.md`).
9. Foco no canvas: `focus(widgetId)` chama `store.focus` e, se é tela, `engine.watch(pub, false, true)`.
   Modo `single` (foco único) fica no `model.ts` (`s.single`). Layout de vagas/grade: ver `docs/CANVAS.md` e tema do canvas.
10. Painel "Tela cheia" e PiP usam sempre `.is-focused video`, a tela em foco (`App.tsx` ~L244, ~L334).

**C. Reprodução (vídeo e áudio)**

11. `Media.tsx`: `<video autoPlay playsInline muted>`; `srcObject = stream`, `play()` ao montar e a cada `addtrack`.
    Se `play()` rejeita (autoplay bloqueado) mostra o botão "Reproduzir vídeo/com áudio" (`play-blocked`), só para
    `className="main-video"`. O vídeo de tela é **sempre mudo** (`muted` no `ScreenWidget`); o som vem do `<audio>` abaixo.
12. `ScreenAudio.tsx`: `<audio data-screen-audio="native">` montado em `RoomCanvas.tsx` ~L1805, dentro de `.canvas-audio`,
    **fora** dos widgets, para cada tela assistida de outra pessoa. Assim mover, esconder ou focar o widget não reparenta o áudio.
    Volume nativo = `min(1, volume) * masterVolume`; mudo se `muted` do usuário ou `masterVolume === 0`.
    Só liga `srcObject` quando há faixa de áudio viva (evita `HAVE_NOTHING` no Chromium). `AbortError` do `play()` é ignorado.
    Autoplay bloqueado: botão `Ativar áudio de <nome>`.
13. Acima de 100% (até 300%, só com `fineAudio`): monta `AudioBoost` com `ScreenPlayback.create` (`screen-playback.ts`):
    `MediaStreamAudioSourceNode → GainNode → MediaStreamAudioDestinationNode`, ganho `setTargetAtTime(min(3,max(0,v)), now, 0.02)`.
    O `<audio>` nativo continua tocando, mudo, para não alimentar o grafo com silêncio (comentário do arquivo). Se o
    grafo falha, o nativo segue audível até 100% e aparece "Ativar amplificação".
    `ScreenPlayback.unlock()` cria/retoma um `AudioContext` e engole erros.
14. Volume padrão por tela: `screenVolume = 0.8`; `screenLevels` guarda volume/mudo por publicação (preferência local;
    volume nunca é enviado). Limite 1 sem `fineAudio`, 3 com (`controller.ts` › `setScreenLevel`). `ScreenVolume.tsx`
    mostra o controle no cabeçalho do widget; `FullscreenVolume` em tela cheia.
15. Streams remotos usam `remote-stream.ts` (`addRemoteTrack` dispara `addtrack` à mão).

**D. Demanda de vídeo (como a tela do espectador vira qualidade enviada)**

16. `widgets.tsx` › `ScreenWidget`: após **220 ms** sem mudança, chama `engine.setVideoDemand(id, {video, height})`.
    `video` = `off` se o widget não está visível ou a aba está oculta; `focus` se em foco; `small` se altura < 330 px;
    senão `fit`. `height` = `ceil(altura*min(devicePixelRatio,1.5)/120)*120`, limitada a 120..2160.
17. `controller.setVideoDemand` guarda e, em `flushVideoDemands`, manda `request("demand", {id, ...})` (só para assinaturas `main`,
    nunca `voice`; evita reenvio igual via `sentVideo`). Servidor (`rooms.ts` ~L1018) confere dono e repassa ao emissor
    como `video-demand`; o emissor chama `peers.demand` → `peers.parameters`.
18. No emissor (`peers.ts` › `parameters` ~L360): `off` desativa o encoding (`active:false`, solta a faixa); para tela com demanda,
    `resolution = min(resolução do emissor, demand.height)`; `small` => fps ≤ 12 e bitrate ≤ 450 kbps; `fit` => bitrate
    proporcional à altura pedida (mín. 500 kbps); `focus` => sem corte extra. Depois `RTCRtpSender.setParameters` com
    `video-quality.ts` › `videoEncoding`. Há um teto de upload do emissor (`splitBudget`, 8000 kbps, abaixo).

**E. Prévia barata (miniatura) vs principal**

19. `video-quality.ts` › `videoEncoding`: `tier === "preview"` => `{maxBitrate: 90000 (90 kbps), maxFramerate: 5, scaleResolutionDownBy: 1}`;
    sem áudio na prévia (a prévia só vai para `screen`). Regra no `reconcile`: tela assistida => `main`; senão, se
    `previewsEnabled` **e** o id está em `visiblePreviews` => `preview`. A lista de visíveis vem de `controller.previews(ids, source)`
    (exclui as assistidas, corta em `config.maxPreviews` = 2). Nunca se promove prévia a main: são assinaturas separadas (`id:preview` x `id:main`).
20. Ligar: Ajustes > Prévias > "Prévias ao vivo" (`Settings.tsx` ~L710, `setPreviews`; padrão **desligado**, `previewsEnabled === true`
    lido das preferências). **Quem chama `previews()` era `ScreenPicker.tsx`** (IntersectionObserver `threshold: 0.4`), mas `ScreenPicker` não é importado por ninguém (ver Achados).

**F. Espectadores**

21. Servidor: `rooms.ts` › `screenViewers` (~L291) agrupa, por `publicationId`, os `viewer` de assinaturas `tier === "main"` e `kind === "screen"`;
    `broadcastViewers` emite `screen-viewers` à sala; também vai no snapshot (`protocol.ts` L211). Prévias e voz/câmera não contam.
22. `Spectators.tsx` (no cabeçalho do widget de tela, `widgets.tsx` ~L319): botão olho + contagem; hover (mouse) abre painel 220 ms de atraso para fechar;
    lista nomes, " · você", " · reconectando" se `!online`; vazio => "Ninguém assistindo ainda."; nota: "Inclui áudio em segundo plano e pessoas conectando."
    `MyStreamWidget` mostra os mesmos espectadores com ping/perda por pessoa ("Instável" se perda > 2% ou RTT > 250 ms).

**G. Picture-in-Picture e tela cheia**

23. `picture-in-picture.ts` › `usePictureInPicture`: com Document PiP (`documentPictureInPicture.requestWindow`, 720x460),
    **move o `playerHost` inteiro** (a sala com dock) para a janela, copiando as folhas de estilo, e devolve ao fechar (`pagehide`).
    O host é um nó estável criado uma vez em `App.tsx` (~L121), logo nenhum `<video>`/`<audio>` é recriado. Sem Document PiP, cai no
    PiP nativo de vídeo (`video.requestPictureInPicture`) na tela em foco, exigindo `videoWidth > 0` (senão erro "Aguarde o vídeo carregar…").
    Abrir qualquer painel (`open(panel)`) fecha o PiP. O placeholder "A sessão está na janela flutuante" tem botão "Trazer de volta".
24. Tela cheia (`App.tsx` › `fullscreen` ~L323): `player.requestFullscreen()` (a sala toda, não só o vídeo) com o dock em modo `is-fullscreen`;
    fallback iOS: `webkitEnterFullscreen` no vídeo em foco; sem nenhum: erro "Tela cheia indisponível neste navegador.".

**H. Câmeras e "Minha transmissão"**

25. `CamerasWidget.tsx` + `camera-layout.ts`: destaque automático = quem fala sem parar por `SPEAKER_HOLD_MS = 1500` (`nextFeatured`; checa a cada **250 ms**);
    sua câmera vai por último na ordem. Modos: `strip` (altura < 200), `row` (focado ou altura >= 420), `column`. Laterais: 3 em `column`, 4 em `row` (3 se
    largura < 500), 0 em `strip`; colunas `minmax(0,1fr) 118px`, linha inferior `112px`. Câmera fixada ("Fixar só a câmera de…", botão direito ou toque longo 500 ms)
    mostra só ela. Cada câmera mantém seu elemento; só `gridRow/gridColumn` muda (invariante).
26. Demanda por câmera (`CameraTile`): `off` se escondida/aba oculta/widget fora de vista; `focus` se destaque e widget em foco; `fit` se destaque com altura >= 330;
    senão `small`. `cameraEncoding` (`video-quality.ts`): `small` 120 kbps/12 fps/altura ≤ 240; `fit` 300 kbps/20 fps; sem demanda ou `focus` 450 kbps/20 fps.
    Ao desmontar, o tile manda `off`. `SpeakerProbe` usa o áudio de voz de **todas** as câmeras (mesmo escondidas) para mover o destaque.
27. `MyStreamWidget.tsx`: prévia local da própria captura (nunca o vídeo remoto), envio em Mbps, quadros/s + altura, ping, perda, gráfico dos últimos 60 s
    (amostra a cada 2 s, `historyLength` amostras), lista de espectadores, seletor de resolução (`screenResolutions` 240–2160), fps (5, 15, 24, 30, 60) e limite por espectador (0,45–8 Mbps), cada um só da tela mostrada (#343; inline em foco e no celular alto; nos outros tamanhos, item "Qualidade" do botão direito abre o mesmo seletor num `AnchoredPopover`). "dividido"
    quando `capped` (`peers.ts` › `screenShare` < bitrate pedido). Até 3 telas próprias, navegáveis com setas.
28. Vídeo nativo do app Windows (`desktop/native-video.ts`) é **lado de quem envia**: o app grava quadros NV12 num `SharedBuffer` do WebView2
    (cabeçalho 64 bytes, 3 slots, seqlock) e a página os escreve num `MediaStreamTrackGenerator` com `contentHint = "detail"`. Para o espectador é uma faixa de vídeo normal. `desktop/video.ts` lista fontes e decodifica miniatura `VIOT` (máx. 320x180).

## Números

| Parâmetro | Valor | Onde |
| --- | --- | --- |
| Prévia (tier `preview`) | 90 kbps, 5 fps, sem corte de resolução | `media/video-quality.ts` › `videoEncoding` |
| Prévias simultâneas por espectador | 2 (`maxPreviews`) | `server/config.ts` L172; `rooms.ts` ~L1124; `controller.ts` ~L1299 |
| Tela principal (pelo preset do emissor) | Alta 1080p/30 fps/4000 kbps; Média 720p/24/1800; Baixa 480p/15/700 | `shared/protocol.ts` › `presets` |
| Resoluções / fps escolhíveis (emissor) | 240, 480, 720, 1080, 1440, 2160; fps 5, 15, 24, 30, 60 | `protocol.ts` › `screenResolutions`; `MyStreamWidget.tsx` |
| Demanda `small` de tela | fps ≤ 12, bitrate ≤ 450 kbps (quando altura do widget < 330 px) | `peers.ts` › `parameters`; `widgets.tsx` |
| Demanda `fit` de tela | bitrate proporcional à altura pedida, mín. 500 kbps | `peers.ts` › `parameters` |
| Debounce da demanda | 220 ms | `widgets.tsx` › `ScreenWidget`; `CamerasWidget.tsx` |
| Altura pedida | arredondada a 120 px (tela, 120..2160) / 60 px (câmera, 120..720); `devicePixelRatio` capado em 1,5 | `widgets.tsx`; `CamerasWidget.tsx` |
| Teto de upload de telas | 8000 kbps no total, mínimo 300 kbps por espectador | `video-quality.ts` › `screenUploadBudget`, `minimumShare`, `splitBudget` |
| Câmera `small` / `fit` / cheia | 120 kbps·12 fps·h ≤ 240 / 300 kbps·20 fps / 450 kbps·20 fps | `video-quality.ts` › `cameraEncoding` |
| Retenção do destaque da câmera | 1500 ms de fala contínua | `camera-layout.ts` › `SPEAKER_HOLD_MS` |
| Laterais de câmera | 3 (coluna), 4 (fileira), 3 se largura < 500 px, 0 (tira) | `camera-layout.ts` › `sideCount` |
| Transmissões por pessoa | 3 (`MAX_SCREENS`) | `shared/protocol.ts` L6 |
| Tolerância de tela sumida | 30 s | `controller.ts` › `reconcile` (`missingScreens`, `missingSince`) |
| Volume padrão de tela | 0,8; teto 1 (ou 3 com `fineAudio`); ganho suavizado 20 ms | `controller.ts` (`screenVolume`); `screen-playback.ts` |
| Janela Document PiP | 720x460 | `media/picture-in-picture.ts` |
| Layout de janelas (código sem uso) | largura mín. 144 px, razão 16:9, lacuna 10, faixa 46% (máx. 650) ou 52% da altura, máx. 340 px por janela, ímã 18 px | `components/screen-layout.ts`, `ScreenStage.tsx` |
| Painel LiveScreens / Spectators: atraso de fechar | 400 ms / 220 ms | `LiveScreens.tsx`; `Spectators.tsx` |
| Buffer de vídeo nativo | cabeçalho 64 B, 3 slots, espera de 5 s pelo buffer, limite de miniatura 320x180 | `desktop/native-video.ts`, `desktop/video.ts` |

## Peças e técnicas

| Peça/técnica | Para que | Onde |
| --- | --- | --- |
| Assinatura `main` por `publicationId` (P2P, uma `RTCPeerConnection` por espectador x publicação) | Cada espectador recebe uma codificação própria | `controller.ts` › `reconcile`; `rooms.ts` › `subscribe` |
| Tier `preview` separado do `main` | Miniatura barata, sem promover a principal | `video-quality.ts`; `controller.ts` |
| `RTCRtpSender.setParameters` (`maxBitrate`, `maxFramerate`, `scaleResolutionDownBy`, `active`) | Teto de qualidade por espectador e desligar o envio sem ninguém olhando | `peers.ts` › `parameters` |
| Demanda de vídeo `off/small/fit/focus` via socket (`demand` / `video-demand`) | O espectador diz quanto vídeo precisa | `widgets.tsx`; `controller.ts`; `rooms.ts` |
| Orçamento de upload `splitBudget` (água-enchente: quem pede menos que a cota igual fica com o que pede) | Não saturar a internet de casa com muitos espectadores | `video-quality.ts` |
| `IntersectionObserver` (limiar 0,4) | Só assinar prévia visível | `ScreenPicker.tsx` (sem uso) |
| `ResizeObserver` | Altura real do tile para decidir `small/fit` e layout de câmera | `CamerasWidget.tsx` |
| `document.visibilityState` / `visibilitychange` | Pedir `off` com aba oculta | `widgets.tsx`; `CamerasWidget.tsx` |
| Web Audio: `AudioContext`, `GainNode`, `MediaStreamAudioDestinationNode` | Amplificar tela até 300% sem mexer no que é enviado | `screen-playback.ts`; `ScreenAudio.tsx` › `AudioBoost` |
| `HTMLMediaElement.setSinkId` (via `AudioOutput.register`) | Saída de áudio escolhida (detalhe em outro tema) | `ScreenAudio.tsx`, `Media.tsx` |
| Document Picture-in-Picture API | Janela flutuante com a sala inteira | `picture-in-picture.ts` |
| Video PiP nativo (`requestPictureInPicture`) | Fallback | idem |
| Fullscreen API + `webkitEnterFullscreen` | Tela cheia da sala; iOS | `App.tsx` › `fullscreen` |
| Host de player estável (`playerHost`) + `createPortal` | Mover a sala (PiP) sem recriar vídeo/áudio | `App.tsx` ~L121, ~L817 |
| `MediaStreamTrackGenerator` + `VideoFrame` NV12 + WebView2 `SharedBuffer` (leitura com seqlock) | Tela nativa do app Windows (lado emissor) | `desktop/native-video.ts` |
| `contentHint = "detail"` | Evitar que o encoder reduza resolução de tela | `native-video.ts` › `asScreenContent` |
| `CSS grid` com posições nomeadas, sem reparentar | Layout das câmeras | `camera-layout.ts` › `cameraGrid` |
| Medição de voz compartilhada (`shareVoiceActivity`) | Destaque da câmera de quem fala | `Media.tsx` › `useSpeaking` |
| Pointer Events + teclado (setas, Shift = passo 40, base 12, Esc cancela) | Mover/redimensionar janelas (WCAG 2.5.7) | `ScreenStage.tsx` (sem uso) |
| `AnchoredPopover` | Painéis de espectadores e transmissões ao vivo | `Spectators.tsx`, `LiveScreens.tsx` |
| Suítes: `node:test` | `screen-layout.test.ts` (4 casos de limites e proporção, cobre código sem uso), `cameras.test.ts` (destaque após 1,5 s, laterais por modo, câmera pequena barata) | `tests/` |
| WatchLab (bancada no navegador, mídia sintética + servidor real) | Prova continuidade: mesmo `srcObject`, `currentTime` avançando, sem pause, áudio vivo, depois de foco/layout | `tests/WatchLab.tsx` |

## Mercado (pesquisa nov 2026)

Comparado: como o VIO mostra e toca as telas (PiP, autoplay, miniaturas, demanda por tamanho)
contra as APIs do navegador citadas pelo Chrome, caniuse e Mozilla.

| Método do mercado | Resolve | No VIO | Custo | Recomendação |
| --- | --- | --- | --- | --- |
| Document Picture-in-Picture (janela flutuante com HTML próprio) | Assistir por cima de outros apps, com controles | sim: só no Chromium; fora dele, PiP de vídeo simples (05.7) | — | manter |
| `requestVideoFrameCallback` | Medir os quadros que chegam de fato (fps real, travadas) | não | código nosso | depois: base para um indicador de qualidade para quem assiste; sem fonte direta na pesquisa |
| Desbloqueio de autoplay (gesto antes de tocar som) | O navegador não bloqueia o som da sala | sim (`audio-unlock`) | — | manter |
| Miniaturas ao vivo baratas (trilha de baixa qualidade, ou quadro via `captureStream`/`MediaStreamTrackProcessor`) | Ver o que cada tela mostra sem pagar qualidade cheia | parcial: o tier `preview` existe, mas nada o assina (05.2) | código nosso | adotar uma decisão agora: religar ou apagar. `MediaStreamTrackProcessor` só no Chrome e no Safari 18+, sem Firefox segundo o caniuse |
| Demanda por tamanho na tela (`off`, `small`, `fit`, `focus`) | Enviar só a qualidade que quem assiste usa | sim | — | manter |

**Fontes:** https://developer.chrome.com/docs/web-platform/document-picture-in-picture ·
https://caniuse.com/mdn-api_mediastreamtrackprocessor ·
https://blog.mozilla.org/webrtc/unbundling-mediastreamtrackprocessor-and-videotrackgenerator/

## Achados

| ID | Achado | Tipo | Confiança | Onde |
| --- | --- | --- | --- | --- |
| 05.1 | `ScreenStage.tsx`, `screen-layout.ts`, `ScreenPicker.tsx`, `controller.arrangeScreens` e `screenArrangement` não são importados nem chamados por nada em `src/` (grep). A multitela real é o canvas (`RoomCanvas` + `ScreenWidget`); `tests/screen-layout.test.ts` testa só esse código. O `ScreenPicker` ainda mostrava a própria tela com o stream cheio e ignorava as telas 2 e 3. | código morto | alta | `components/ScreenStage.tsx`, `components/screen-layout.ts`, `components/ScreenPicker.tsx`; `room/controller.ts` (~L178, ~L1169) |
| 05.2 | Prévia barata inalcançável: `controller.previews()` só era chamada pelo `ScreenPicker`. O ajuste "Prévias ao vivo" liga `previewsEnabled`, que só põe a classe `live-previews` no `.player`; nenhum caminho assina `tier: "preview"` e nenhuma miniatura aparece. A regra "prévia 90 kbps / 5 fps" existe no servidor, no `reconcile` e no `videoEncoding`, sem consumidor. É botão morto pela regra do CLAUDE.md. | código morto | média (grep não achou outro chamador) | `components/Settings.tsx` (~L85, ~L710); `room/controller.ts` (~L1291, ~L1336) |
| 05.3 | `docs/MULTITELAS-UX.md` descreve janelas sobrepostas com menu de seis posições, barra de tamanho e teclado nas alças: é o `ScreenStage` sem uso, não o canvas. O "cartão de cada pessoa" com Assistir, Só esta, Em conjunto e Focar é o `ScreenPicker`; hoje a entrada é o `PersonMenu` (`watch(id, true)` e `watch(id, true, true)`), `LiveScreens`, o aviso e o catálogo. | doc desatualizado | alta | `docs/MULTITELAS-UX.md`; `components/PersonMenu.tsx` (~L89) |
| 05.4 | `Spectators` conta qualquer assinatura `main` de tela: inclui quem só ouve em segundo plano (o `ScreenWidget` fora da vista pede `off` para o vídeo, mas o `<audio>` segue no `.canvas-audio`) e quem ainda está conectando. Não separa "vendo" de "assinatura aberta". | lacuna | alta | `rooms.ts` › `screenViewers`; `components/Spectators.tsx`; `canvas/widgets.tsx` (~L105) |
| 05.5 | Tela cheia põe a **sala inteira** (`.player`) em tela cheia, não só o vídeo. O PiP simples usa `.is-focused video`, que pode não existir se o foco é uma tela só de som ou se a seleção mudou: o botão pode ficar ativo sem alvo (não confirmado). | risco | baixa | `App.tsx` (~L244, ~L323) |
| 05.6 | O Document PiP copia as folhas de estilo com `try/catch` silencioso e pula as que o navegador não deixa ler (CORS): a janela pode abrir sem parte do estilo. | risco | baixa | `media/picture-in-picture.ts` (~L66) |
| 05.7 | Document PiP só existe no Chromium; nos outros navegadores o PiP é só o vídeo, sem controles. | lacuna | alta | `media/picture-in-picture.ts`; `docs/NAVEGADORES.md` |

Invariante "foco e layout só mudam apresentação" conferido e **ok** no caminho vivo: o foco só
altera `selected` (`watching.ts`), o `<audio>` fica fora do widget (`.canvas-audio`), as câmeras
mudam só estilos de grade e o PiP move um host estável. `tests/WatchLab.tsx` é a prova
automática, mas só roda na bancada manual (ver [11](11-testes-e-ci.md)).

## Perguntas em aberto

- A prévia (tier `preview`) foi abandonada de propósito quando o canvas substituiu o
  `ScreenPicker`, ou é regressão a religar (05.2)? Não achei issue nem decisão.
- `ScreenStage`, `screen-layout`, `ScreenPicker` e o teste podem sair, ou voltam como janelas
  flutuantes? O canvas já tem janelas soltas (`store.add(…, true)`); a acessibilidade delas está
  em [06](06-canvas-widgets-e-notas.md).
