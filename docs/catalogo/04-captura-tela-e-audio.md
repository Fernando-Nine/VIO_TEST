# 04 — Captura de tela e áudio (o que entra no VIO a partir do aparelho)

> **Resumo:** `Captures` (`media/capture.ts`) guarda até 1 voz, 1 câmera e 3 telas (`MAX_SCREENS`).
> No navegador a tela vem de `getDisplayMedia` e a voz de `getUserMedia` passando por um grafo Web
> Audio com portão em dB. No app Windows o mesmo `Captures` troca de adaptador (`windowsCapture`):
> vídeo nativo e PCM do WASAPI entram por uma ponte e viram `MediaStream`. Tudo o que é volume
> (geral, por pessoa, por tela, ganho até 300%) é só reprodução local.
>
> **Arquivos-chave:** `src/client/media/capture.ts` (Captures, adaptadores, portão), `media/voice-activity.ts`
> (indicador de fala), `media/audio-output.ts` (setSinkId), `media/sounds.ts` + `sound-preferences.ts`
> (sons de interface), `media/screen-playback.ts` (ganho Web Audio), `components/ShareDialog.tsx` +
> `share-options.ts` (escolha da fonte), `components/Media.tsx` (`Media`, `RemoteVoice`, `useSpeaking`),
> `ScreenAudio.tsx`, `ScreenVolume.tsx`, `SoundSources.tsx`, `VolumeSlider.tsx`, `desktop/capture.ts`,
> `desktop/share.ts`, `desktop/pcm-worklet.js`.
>
> **Docs:** `docs/DESKTOP-WASAPI.md` (contrato da captura nativa; **desatualizado**, ver Achados),
> `docs/notas/midia.md` (#24, #23, #267), `docs/decisoes/008-desativar-audio.md`, `docs/decisoes/006-app-windows.md`.
>
> **Retrato:** commit `8bdc516` (5 nov 2026). Mudou o que esta ficha descreve? Atualize-a no mesmo PR.

`ScreenPicker.tsx` **não** escolhe fonte de captura: é o cartão de miniatura de quem assiste (ver passo 18).

## Como funciona hoje

### A. Tela no navegador

1. Botão abre `ShareDialog` (`components/ShareDialog.tsx` › `ShareDialog`). Abas: Tela inteira, Janela do
   aplicativo, e "Aba do navegador" só em Chromium (`share-options.ts` › `chromium()`: `userAgentData.brands` ou
   UA com `Chrome/` sem `Firefox/`). Escolhas persistem em `localStorage["vio:share"]` (`loadShareChoice`/`saveShareChoice`,
   com `try/catch`; valores inválidos voltam ao padrão 720p / 30 fps / com som). Nunca vão para a sala.
2. Sem app nativo (`native.state === "off"`) o painel só avisa "o navegador pede para escolher a aba/janela/tela".
   O clique em Compartilhar chama `setDisplayVideo(displayVideo(tab, choice))` e `engine.startScreen(...)` **no mesmo
   clique** (comentário "must open within this click's user activation", ~L368).
3. `displayVideo()` monta as constraints de vídeo: `displaySurface` (dica do seletor), `frameRate {ideal: fps, max: fps}`
   e, se a resolução não for "Fonte", `width.max = round(res*16/9)` e `height.max = res`. Não usa `surfaceSwitching`,
   `preferCurrentTab`, `selfBrowserSurface`, `systemAudio`, `monitorTypeSurfaces` nem `contentHint` na captura web
   (grep em `src/` e `docs/`: só `contentHint` em `desktop/native-video.ts`).
4. `browserCapture.screen(audio)` (`media/capture.ts` ~L43): `getDisplayMedia({video: displayVideo, audio: audio ? {echoCancellation:false, noiseSuppression:false, autoGainControl:false} : false})`. `displayVideo` é variável de módulo (`setDisplayVideo`), `true` se vazio.
5. `Captures.startScreen(audio, replace, slot)` (~L232): `bumpGeneration(slot)` (descarta resposta velha se o usuário parou/trocou
   durante o diálogo), depois `applyConstraints` de áudio com os três processamentos desligados sob `mediaDeadline` de 5 s
   (falha vira `audioMessage`, não erro), confere geração de novo, monta `audioMessage` (com/sem áudio; aviso de eco se
   `displaySurface === "monitor"`), chama `save()` e `applyQuality()`.
6. `save()` (~L156): mantém a **mesma `key`** ao substituir (mesma publicação, peers só trocam a trilha; #160), reaplica o
   mute de tela (`silenced`), preserva vídeo pausado, repassa a miniatura, para as trilhas antigas e liga `ended` → `stop(slot)`.
7. `applyQuality()` (~L448): só `track.applyConstraints({frameRate:{ideal, max}})` (5 s). Falha vira `qualityMessage`. Resolução
   e bitrate **não** vão na captura: vão no remetente WebRTC (`peers.ts` › `parameters()` → `videoEncoding`: `maxBitrate`,
   `maxFramerate`, `scaleResolutionDownBy`). Depois `Controller.quality()` chama `peers.update("screen")`.
8. Teto de upload: `shareQuality()` limita o bitrate pedido a 8000 kbps; além disso `screenUploadBudget = 8000` (`video-quality.ts`)
   é dividido entre todos os espectadores das telas por `splitBudget` (water-filling, mínimo 300 kbps por pessoa) em
   `peers.ts` › `screenShare()`; `peer.info.capped` sinaliza quando cortou. O ciclo de stats (2 s) reaplica (nota #23).
9. Telas extras (2ª e 3ª): `nextScreen()` → `screenSlots`; começam leves (`extraScreenQuality`: o menor entre a qualidade atual e a
   preset Baixa 15 fps / 700 kbps / 480p). Acima de 3, o diálogo mostra "Você já transmite 3 telas" e o botão fica desabilitado
   (`ready` exige `slot`); o servidor também recusa.
10. Erro: `mediaError()` traduz `NotAllowed/NotFound/NotReadable/Overconstrained/InvalidState` para português; o resto usa a
    mensagem do `Error`. Caminho do diálogo: `.catch(e => engine.fail(e))`. O diálogo fecha antes de a captura terminar.
11. Parar: `Captures.stop(slot)` para trilhas, `adapter.stopScreen`, miniatura e `silenced`; `ended` do navegador (botão "parar de
    compartilhar" do Chrome) chega pelo mesmo caminho.

### B. Tela e som no app Windows (só a ponte do lado web)

12. `desktop` (de `desktop/bridge`) decide: no app, `ShareDialog` lista fontes nativas (`listVideoSources`, `desktop_capabilities`),
    miniaturas em 3 workers paralelos na ordem da lista (#247), id válido só para uma listagem (relista a cada troca de aba).
    Abas: Tela inteira, Janela, **Só som** (se `caps.protocol === 1 && caps.processAudio`, e não em troca `replace`).
13. `startNativeShare` (`desktop/share.ts`): pede `desktop_share_audio {sourceId, system}` (janela → `app`, tela inteira → `system`
    = PC sem o VIO), faz `selectProcess` + `selectVideo(source, {width,height,fps})`, `engine.startScreen`, `engine.quality`.
    `captureRate(fps)` arredonda para 15/30/60 nativos; a trilha corta o resto.
14. `windowsCapture.screen()` (`desktop/capture.ts`): vídeo = `startNativeVideo` (trilha nativa) ou, se nada foi escolhido,
    `getDisplayMedia({video:true, audio:false})` do WebView2 (chamado antes do primeiro `await`, por causa da ativação do usuário).
    Áudio: `AudioContext({sampleRate:48000, latencyHint:"interactive"})` + `AudioWorkletNode "vio-process-audio"` (0 entradas, 1 saída, 2 canais)
    → `MediaStreamAudioDestination`, **sem ligar ao `destination` local** ("never route to local speakers").
15. Início do áudio: `desktop_start_audio {sourceId}` → laço `desktop_read_audio` até `packet.state != 0`; `state >= 2` = erro
    ("O Windows não liberou este áudio…"); timeout 7000 ms; se o contexto não roda após `resume()`, erro "Não foi possível ativar o áudio".
    Depois um laço assíncrono (um pedido binário por vez, ritmo do evento nativo, espera máx. 20 ms segundo o comentário) empurra PCM
    ao worklet com `postMessage` transferível. `dropped` mudou → manda `"reset"`. Fim/erro → `end()`: `stop()` + dispara `ended`
    manualmente (`track.stop()` não emite `ended`; comentário L202).
16. Troca (`replace`, #160/#246/#229): o novo vídeo é pedido antes; só então `previous.releaseAudio()` libera o som (o mesmo app não pode ser
    capturado duas vezes), espera `released` e inicia o novo. Se falhar, o espectador fica com a imagem anterior. `pending` x `active` por slot.
    "Só som" (#229): `selectSoundOnly(true)` → `MediaStream` vazio + trilha de áudio; `soundLabels` dá o nome do programa (`Captures.save` → `source.label`).
17. `pcm-worklet.js` (`StereoQueue`): fila circular de 9600 quadros estéreo; recusa pacote ímpar ou > 9600 amostras; limita a [-1,1] e troca NaN
    por 0; se entrar mais que 4800 quadros acumulados, descarta o que tinha (`dropped`) para "alcançar"; só começa a tocar com ≥ 960 quadros
    (20 ms); interpolação linear por `ratio = 48000/sampleRate`; sub-execução conta `underruns` e rebufferiza.
    Limites do lado nativo: `MAX_AUDIO = 3` em `src-tauri/src/capture.rs` (espelhado em `maxSounds = 3` no diálogo).

### C. Escolha de fonte para quem assiste (ScreenPicker)

18. `ScreenPicker.tsx`: cartão por publicação na lista de pessoas. Miniatura só se `previewsEnabled`, visível (IntersectionObserver, limiar 0,4)
    e ainda não assistida. Própria tela: usa `captures.sources.get("screen").stream` direto (slot `screen` apenas); remota: `peers.stream(id, "preview")`.
    Ações: Assistir / Só esta / Em conjunto / Focar / parar. Não captura nada. A miniatura enviada por quem transmite vem de `Captures.previewStream`
    (canvas 320×180, redesenho a cada 200 ms, `captureStream(5)`), alinhada ao invariante "preview é barato" (90 kbps, 5 fps em `videoEncoding`).

### D. Microfone

19. `startVoice()` (~L274): `new AudioContext()` + `resume()`; `adapter.device({audio:{echoCancellation, noiseSuppression, autoGainControl:{exact}, deviceId?:{exact}}, video:false})`.
    Se o `Captures` for parado durante o `await` (contexto trocado/fechado), trilhas e contexto são encerrados sem publicar.
    O construtor desliga `autoGainControl` se `getSupportedConstraints()` não o reconhece.
20. Grafo: `MediaStreamSource → Analyser (fftSize 512)` e, em paralelo, `→ gate (Gain, começa em 0) → voiceGain → MediaStreamDestination`.
    O analisador lê a entrada **antes** do portão (invariante respeitado: "analisador antes do portão"). `voiceGain` = 1 se AGC do navegador está ligado, senão `manualGain` (0,2–3).
21. Laço de 50 ms (`setInterval`): RMS do analisador → `db = 20·log10(rms+1e-8)` → `inputDb`. `db > threshold` (padrão −55 dB; UI −65…−20) estende
    `hold = agora + 180 ms`. Portão abre se `agora < hold && !micMuted && !deaf`; ganho vai a 1 com constante de tempo 0,008 s (abre) e a 0 com 0,04 s (fecha).
    `voiceLevel` = média móvel (0,55/0,45) de `min(1, rms·8)` só quando aberto; é o que o indicador local usa.
22. Mudo / desativar áudio: `syncMute()` põe `enabled=false` na trilha crua e na trilha publicada; o servidor recebe o estado `muted` da publicação
    (`Controller` ~L1015: `micMuted || deaf`). ADR 008: desativar áudio = mic desligado + vozes mudas, **telas continuam**. No código: `RemoteVoice muted={!inCall || deaf}`;
    `ScreenAudio` só olha `mutedByUser || masterVolume === 0`. `joinCall()`/`leaveCall()` forçam `micMuted = true` e `deaf = false`.
23. Trocar microfone (`changeMicrophone`): novo `getUserMedia`, reconecta `input` ao mesmo analisador e portão (sem renegociar), para a trilha velha, `syncMute()`.
    `setVoiceSettings`: `applyConstraints` na trilha viva (5 s); depois `setManualGain`.
24. Parar voz: limpa timer, para trilhas, desconecta nós, `context.close()`, zera `voiceLevel` e `inputDb = −100`.

### E. Indicador de fala e por que depende do `<audio>`

25. `voice-activity.ts`: **um** `AudioContext` e **um** `setInterval(80 ms)` para todos os indicadores (#24: 8→1 contextos, CPU 11%→5%). Cada observador cria um
    `MediaStreamSource(new MediaStream([track]))` → `Analyser (fftSize 256)` → `sink` (ganho 0 → destino; analisadores só rodam se puxados). Nível = RMS·8; `> 0,025` estende `hold` 200 ms.
    Só mede se a trilha está `live`, não `muted` e o contexto `running`. Contexto fecha quando o último indicador sai. `pointerdown`/`keydown` retomam o contexto.
    `shareVoiceActivity` guarda um observador por `MediaStream` remoto (várias telas — Pessoas, Câmeras — dividem o mesmo analisador).
26. Dependência do `<audio>`: comentários em `Media.tsx` (~L82) e `ScreenAudio.tsx` (~L13): sem um elemento de mídia tocando o stream remoto, o Chromium pode alimentar silêncio
    no Web Audio. Por isso `RemoteVoice` mantém `<audio autoPlay>` sempre montado (mudo quando preciso, nunca desmontado) e `App.tsx` o renderiza para toda publicação de voz de outra pessoa.
    O amplificador (`AudioBoost`) toca **uma segunda cópia**; o `<audio>` nativo continua tocando mudo.

### F. Saída de áudio e volumes

27. `AudioOutput` (`audio-output.ts`): registra cada `<audio>/<video>` e o `AudioContext` de sons (`register`); `select(id)` aplica a todos em fila serial (`serial`), valida
    com um `<audio>` descartável se não há alvos, e **desfaz** (rollback para a saída anterior) em falha; se o rollback falha, `fallback` volta ao padrão do sistema e avisa.
    `restore(id)` (preferência salva) confere `enumerateDevices` e mantém `pendingDeviceId` + `restoreMessage` se o aparelho sumiu (precisa de confirmação com gesto). `watchDevices` escuta `devicechange`.
    `supported` exige contexto seguro e `HTMLMediaElement.prototype.setSinkId`.
28. Camadas de volume, tudo local: volume geral (`masterVolume`, 0–1, Ajustes › Áudio › Saída) × volume por pessoa (`setPersonVolume`, 0–2) para vozes; × volume por tela
    (`setScreenLevel`, 0–1 normal, 0–3 com "Ajuste fino das telas") para telas. `ScreenAudio`: `element.volume = min(1,volume)·master`; acima de 100% monta `AudioBoost`
    (`ScreenPlayback.create`: `MediaStreamSource → Gain (0–3) → MediaStreamDestination` → outro `<audio>`). Se o ganho falhar, o nativo continua até 100% e aparece botão "Ativar amplificação".
    Master = 0 silencia vozes, telas e sons de interface (`updateCueVolume`: `master × soundVolume`). Nada disso altera o que é enviado (invariante respeitado).
29. UI: `ScreenVolume` (popover no cabeçalho da tela; clique silencia, hover/foco abre; toque abre), `FullscreenVolume` (barra vertical), `SoundSources` (um chip por som sem imagem, com barras animadas via `useSpeaking`),
    `VolumeSlider` (setas ±5%, PageUp/Down ±25%, marca em 100%, ouro acima; `clampVolume` arredonda a 0,01). O dono não vê controle de volume da própria tela (`owner === view.id` → `null`).

### G. Câmera

30. `startCamera(deviceId, facing)`: `video {width ideal 640, height ideal 360, frameRate ideal 20 max 24, deviceId exact OU facingMode ideal}`, `audio:false`; usa `generation` para descartar resposta atrasada. Envio por espectador:
    `cameraEncoding` (`video-quality.ts`): padrão 450 kbps / 20 fps; `fit` 300 kbps / 20 fps; `small` 120 kbps / 12 fps (altura ≤ 240).

### H. Sons de interface (só de passagem)

31. `SoundCues` (`sounds.ts`): osciladores `sine`, 14 sinais (tabela `notes`), cada nota 85 ms de intervalo, envelope 0 → 0,12 em 12 ms → 0,0001 até 130 ms, `stop` em +140 ms. Mesmo sinal repetido em < 0,28 s é descartado
    (retorna `true`). Volume padrão 0,7. O `AudioContext` dos sons também registra no `AudioOutput` (segue a saída escolhida). `sound-preferences.ts`: lista dos 14 eventos, `readSoundEvents` (padrão ligado, só `false` desliga),
    `volumePreference` (0–1), balões `people`/`screens`, tabela da UI "Balão × Som".

## Números

| Parâmetro | Valor | Onde |
|---|---|---|
| Telas por pessoa | 3 (`MAX_SCREENS`) | `shared/protocol.ts` L6 |
| Presets Alta / Média / Baixa | 30 fps·4000 kbps·1080p / 24·1800·720p / 15·700·480p | `shared/protocol.ts` › `presets` |
| Resoluções do diálogo | 480, 720, 1080, 0 ("Fonte", teto 2160p) | `share-options.ts` › `shareResolutions`, `shareQuality` |
| FPS do diálogo | 15, 30, 60 | `shareRates` |
| Bitrate base (kbps) por resolução | 700 / 1800 / 4000 / 6000 (Fonte) | `baseBitrate` |
| Fator por fps | 15→0,75; 30→1; 60→1,5; arredonda a 50 kbps | `rateFactor`, `shareQuality` |
| Teto de bitrate por tela | 8000 kbps (`Math.min(8000, …)`) | `shareQuality` |
| Orçamento de upload (todas as telas) | 8000 kbps, mínimo 300 por espectador | `video-quality.ts` › `screenUploadBudget`, `minimumShare` |
| Prévia enviada | 90 kbps, 5 fps | `video-quality.ts` › `videoEncoding` |
| Miniatura local da própria tela | 320×180, redesenho 200 ms, `captureStream(5)` | `capture.ts` › `createPreview` |
| Tela extra | min(qualidade, Baixa) | `extraScreenQuality` |
| Câmera (captura) | 640×360 ideal, 20 fps ideal, máx. 24 | `startCamera` |
| Câmera (envio) | 450 / 300 / 120 kbps; 20 / 20 / 12 fps | `cameraEncoding` |
| Prazo de confirmações do navegador | 5000 ms | `deadline.ts` › `mediaDeadline` |
| Portão: limiar | −55 dB padrão; faixa UI −65…−20; carga clampa igual | `capture.ts`, `Settings.tsx`, `controller.ts` L270 |
| Portão: laço / retenção / ataque / soltura | 50 ms / 180 ms / 0,008 s / 0,04 s | `startVoice` |
| Analisador do portão | `fftSize` 512 | `startVoice` |
| Ganho manual do microfone | 0,2–3 (UI 20–300%, passo 5) | `setManualGain`, `Settings.tsx` |
| Indicador de fala | laço 80 ms; `fftSize` 256; limiar 0,025 (RMS·8); retenção 200 ms | `voice-activity.ts` |
| Volume por pessoa | 0–2 (>1 usa Web Audio) | `controller.ts` › `setPersonVolume` |
| Volume por tela | 0–1; 0–3 com ajuste fino; padrão `screenVolume` 0,8 | `controller.ts` L180, L1142 |
| Volume geral | 0–1, padrão 1 | `controller.ts` L184, `ApplicationSettings.tsx` |
| Volume dos sons de interface | 0–1, padrão 0,7 (× geral) | `controller.ts` L183, `sounds.ts` |
| Sons de interface | 14 sinais; dedupe 0,28 s; nota 85 ms; envelope 0,12 | `sounds.ts` |
| Chat: som no máximo a cada | 4 s | `sound-preferences.ts` (texto), `controller.ts` › `chatCue` (não lido a fundo) |
| Sons nativos simultâneos | 3 | `ShareDialog.tsx` › `maxSounds`; `src-tauri/src/capture.rs` › `MAX_AUDIO` |
| Áudio nativo | 48 kHz, estéreo, espera máx. 7000 ms pelo 1º pacote | `desktop/capture.ts` |
| Fila do worklet | 9600 quadros; limite de atraso 4800; início com 960 (20 ms) | `pcm-worklet.js` |
| Miniaturas de fontes nativas | 3 em paralelo | `ShareDialog.tsx` |
| Cartão de tela (IntersectionObserver) | limiar 0,4 | `ScreenPicker.tsx` |
| Fechar popover de volume | 600 ms (cabeçalho), 300 ms (tela cheia) | `ScreenVolume.tsx` |

## Peças e técnicas

| Peça/técnica | Para que | Onde |
|---|---|---|
| `getDisplayMedia` com `displaySurface`, `frameRate`, `width/height.max` | Captura de tela web com dica do seletor e teto de tamanho | `share-options.ts`, `capture.ts` |
| `getDisplayMedia` audio com EC/NS/AGC `false` + `applyConstraints` | Som de aba/sistema sem processamento de voz | `capture.ts` |
| `MediaStreamTrack.applyConstraints` (`frameRate`) | Ajustar fps depois da captura | `applyQuality` |
| `RTCRtpSender.setParameters` (`maxBitrate`, `maxFramerate`, `scaleResolutionDownBy`) + `splitBudget` | Teto por espectador e orçamento total de upload | `peers.ts`, `video-quality.ts` |
| `RTCRtpSender.replaceTrack` com a mesma `key` | Trocar fonte sem reconectar | `Captures.save`, `Peers.update` |
| `getUserMedia` com `deviceId: {exact}` e `autoGainControl: {exact}` | Microfone e câmera | `startVoice`, `startCamera` |
| Web Audio: `MediaStreamSource`, `AnalyserNode`, `GainNode.setTargetAtTime`, `MediaStreamDestination` | Portão de voz por dB, ganho manual | `startVoice` |
| Portão por RMS no tempo (`getFloatTimeDomainData`) com retenção | Abrir/fechar o microfone | `startVoice` |
| `AudioContext` único + analisador por trilha, ganho 0 até o destino | Indicador de fala de todos | `voice-activity.ts` |
| `<audio>` sempre montado | Manter o renderizador WebRTC do Chromium alimentando o Web Audio | `Media.tsx`, `ScreenAudio.tsx` |
| Ganho Web Audio sobre cópia do stream (até 300%) | Volume acima de 100% sem mexer no envio | `screen-playback.ts`, `AudioBoost` |
| `HTMLMediaElement.setSinkId` / `AudioContext.setSinkId` + fila serial e rollback | Saída de áudio escolhida | `audio-output.ts` |
| `navigator.mediaDevices.selectAudioOutput` + `devicechange` | Permissão de saída e queda de dispositivo | `Settings.tsx`, `watchDevices` |
| `AudioWorklet` (`vio-process-audio`) + fila circular com interpolação | PCM do WASAPI → MediaStream no app | `pcm-worklet.js`, `desktop/capture.ts` |
| Tauri `invoke` + pacote binário (`decodePacket`) | Ponte para o Rust (`desktop_start_audio`, `desktop_read_audio`, `desktop_stop_audio`, `desktop_sources`, `desktop_capabilities`) | `desktop/bridge`, `desktop/capture.ts`, `share.ts` |
| `OffscreenCanvas.convertToBlob` + `URL.createObjectURL` | Ícones de programas do "Só som" | `desktop/share.ts` › `soundIcon` |
| Osciladores `sine` com envelope | Sons de interface sintetizados, sem arquivos | `sounds.ts` |
| `canvas.captureStream(5)` | Miniatura ao vivo que alimenta o peer de prévia | `createPreview` |
| `IntersectionObserver` | Só pedir prévia do que está visível | `ScreenPicker.tsx` |
| `localStorage` com `try/catch` | `vio:share` e `vio:preferences` | `share-options.ts`, `controller.ts` |
| Rádio/tab com setas (roving tabindex) | Acessibilidade do diálogo | `ShareDialog.tsx` › `roving` |

## Mercado (pesquisa nov 2026)

Comparado: opções de `getDisplayMedia`, tratamento de voz e escolha de saída do VIO contra o que
Chrome, MDN, Jitsi e bibliotecas de voz oferecem em 2026.

| Método do mercado | Resolve | No VIO | Custo | Recomendação |
| --- | --- | --- | --- | --- |
| `selfBrowserSurface: "exclude"`, `surfaceSwitching: "include"`, `systemAudio: "include"` | Esconder a própria aba do VIO (sem eco nem espelho infinito); trocar a aba compartilhada sem parar; oferecer o som do sistema | não | código nosso | adotar |
| `restrictOwnAudio` + `suppressLocalAudioPlayback` | Não capturar o som do próprio VIO junto; não tocar duas vezes o som da aba compartilhada | não | código nosso | adotar, com detecção de suporte |
| `contentHint` na trilha capturada (`detail`, `text` ou `motion`) | O codificador sabe se é texto parado ou vídeo em movimento | parcial: só no app nativo (#267) | código nosso | adotar (04.1) |
| `CaptureController.setFocusBehavior` | Não pular para a aba compartilhada ao começar | não | código nosso | depois |
| Captured Surface Control (rolar e dar zoom na aba capturada) | Mexer na aba sem sair da sala | não | código nosso | depois (P3; só Chrome) |
| Region Capture / Element Capture | Recortar parte de uma aba | não | código nosso | não vale: o VIO compartilha tela ou janela inteira |
| RNNoise em WASM | Supressão de ruído melhor que a do navegador | não | dependência nova (BSD) | depois |
| Silero VAD | Portão que distingue fala de ruído por rede neural | não | dependência nova (MIT), pesada | depois |
| Pré-roll no portão de voz | Não cortar a primeira sílaba | parcial: retenção de 180 ms, sem pré-roll (04.8) | código nosso | depois |
| Push-to-talk | Falar só com a tecla apertada | não | código nosso | depois: atalho global só no app (Tauri) |
| `setSinkId` | Escolher fone ou caixa de saída | sim | — | manter |

**Fontes:** https://developer.chrome.com/docs/web-platform/screen-sharing-controls ·
https://groups.google.com/a/chromium.org/g/blink-dev/c/5SZfg29iwPc ·
https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/restrictOwnAudio ·
https://developer.chrome.com/docs/web-platform/captured-surface-control ·
https://jitsi.org/blog/enhanced-noise-suppression-in-jitsi-meet ·
https://forasoft.com/learn/ai-for-video-engineering/articles-ai/real-time-noise-suppression-krisp-rnnoise-deepfilternet-integration ·
https://docs.vad.ricky0123.com/user-guide/browser/

## Achados

| ID | Achado | Tipo | Confiança | Onde |
| --- | --- | --- | --- | --- |
| 04.1 | A captura pelo navegador não define `contentHint = "detail"`; a nativa define (nota #267: sem isso o Chrome trata a tela como câmera e derruba 1080p). A tela web pode perder resolução; não há medida registrada. | risco | média | `media/capture.ts` › `browserCapture`; `docs/notas/midia.md` |
| 04.2 | Sem `surfaceSwitching`, `selfBrowserSurface`, `systemAudio` nem `restrictOwnAudio` na web: o seletor do Chrome pode oferecer a própria aba do VIO e o botão "Compartilhar esta aba" (eco e espelho infinito); "Aba do navegador" é só dica (`displaySurface`). | lacuna | média | `components/share-options.ts` › `displayVideo` |
| 04.3 | `changeMicrophone` grava `this.micDevice = deviceId` **antes** de abrir o aparelho. Se `getUserMedia` falhar, a preferência aponta para o microfone que não abriu, enquanto a captura segue no antigo. | bug | alta | `media/capture.ts` › `changeMicrophone` (~L350) |
| 04.4 | `docs/DESKTOP-WASAPI.md` diz que "não existe binário WASAPI entregue ou validado" e descreve uma prova futura; o código já tem captura nativa de vídeo e de áudio completa (3 sons, Só som, troca, `MAX_AUDIO`). O mesmo doc aparece em [10](10-app-windows.md) (10.8). | doc desatualizado | alta | `docs/DESKTOP-WASAPI.md`; `desktop/capture.ts` |
| 04.5 | O indicador de fala remoto depende do `<audio>` do `RemoteVoice` montado e tocando, e nada na CI prende isso: `tests/ScreenAudioLab.tsx` cobre no navegador, mas só roda na bancada manual (`npm run test:media`). | risco | média | `components/Media.tsx`; `tests/ScreenAudioLab.tsx` |
| 04.6 | Pouca cobertura do tema: há `audio-output.test.ts` (7 casos), `share-options.test.ts`, `volume-slider.test.ts`, `voice-block.test.ts` e `desktop*.test.ts`, mas nenhum teste de `Captures` (portão, geração, troca) nem do worklet. | lacuna | alta | `tests/` |
| 04.7 | `Captures.stop("voice")` chama `void this.context?.close()` sem `.catch`; com o contexto já fechado a promessa rejeita sem tratamento (o outro caminho, em `startVoice`, usa `.catch(() => {})`). | bug | baixa | `media/capture.ts` › `stop` (~L560) |
| 04.8 | O portão lê 512 amostras (~10,7 ms a 48 kHz) a cada 50 ms: um início de fala entre leituras atrasa a abertura em até ~40 ms (o ataque é 8 ms). Há retenção de 180 ms, mas não há pré-roll, e a primeira sílaba pode ser cortada. | desempenho | baixa | `media/capture.ts` › `startVoice` |
| 04.9 | Ganhos por tela e por pessoa somem ao sair da sala (`screenLevels.clear()`; `volumes` não é salvo). Só `masterVolume`, `fineAudio` e a saída são preferências salvas. Pode ser escolha, mas nenhum doc diz. | lacuna | média | `room/controller.ts` (~L1556) |

Invariantes de captura e volume conferidos e **ok**: analisador antes do portão; limiar em dB;
volume geral só na reprodução local (`ScreenAudio`, `RemoteVoice`, `SoundCues`); `<audio>` nativo
sempre montado; trilhas remotas escutam `addtrack` (o `addTrack` por script só ocorre em stream
local no app, e `ended` é disparado à mão). A 4ª tela é recusada no servidor (`rooms.ts`, handler
de publicação, ~L1069, `SCREEN_LIMIT`; `MAX_SCREENS = 3` em `protocol.ts`).

## Perguntas em aberto

- A tela web chega em 1080p estável sem `contentHint` (04.1)? Nenhuma medida registrada.
- O `ShareDialog` do app no estado `off` (app sem seletor nativo, #192) ainda é caminho usado?
  `selectProcess(undefined)` com `soundBlocked = "Atualize o app…"` sugere que ali só o vídeo do
  WebView2 funciona.
- O limite "som de chat no máximo a cada 4 s" está descrito em `sound-preferences.ts`, mas
  `chatCue` não foi lido a fundo.
