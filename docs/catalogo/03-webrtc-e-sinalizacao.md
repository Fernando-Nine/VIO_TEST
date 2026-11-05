# 03 — WebRTC e sinalização

> **Resumo:** A mídia vai direto de quem transmite para cada espectador (malha P2P, sem SFU). O
> servidor só cria a "assinatura" (viewer x publicação x tier) e repassa SDP/ICE por Socket.IO. Cada
> assinatura é uma `RTCPeerConnection` própria; quem publica é sempre o ofertante, e cada espectador
> ganha uma codificação própria, com teto de bitrate/fps/resolução via `setParameters`.
>
> **Arquivos-chave:** `src/client/media/peers.ts` (classe `Peers`: PCs, negociação, recuperação, stats),
> `src/client/media/video-quality.ts` (números de codificação e divisão do teto de envio),
> `src/client/media/codecs.ts` (H.264 por hardware primeiro), `src/client/media/remote-stream.ts`,
> `src/client/media/deadline.ts`, `src/client/room/controller.ts` (`reconcile`, `refreshIce`,
> `flushVideoDemands`, `reconnectMedia`), `src/shared/protocol.ts` (`signalSchema`, `subscribe`, `demand`),
> `src/server/rooms.ts` (`publish`, `subscribe`, `demand`, `ice`, handler `signal`), `src/server/config.ts` (TURN/STUN).
>
> **Docs:** `docs/TURN.md` (3 caminhos de TURN), `docs/NAVEGADORES.md`, `docs/notas/midia.md`,
> `docs/decisoes/010-participantes-e-p2p.md`.
>
> **Retrato:** commit `8bdc516` (5 nov 2026). Mudou o que esta ficha descreve? Atualize-a no mesmo PR.

## Como funciona hoje

**Publicar**

1. Cliente captura (`captures`, ver tema de captura) e manda `publish {kind, key, audio, muted, audioOnly?, label?}`
   (`protocol.ts` › `schemas.publish`). `kind` ∈ `screen | voice | camera`.
2. Servidor (`rooms.ts` › `command` › `publish`) confere a permissão do papel (`guestScreen/Voice/Camera`),
   `voiceBlocked`, e cria `Publication` com `id = stableId(secret, owner:kind:key)` (HMAC estável: mesma
   chave de captura = mesmo id depois de reentrar). Voz e câmera substituem a anterior; tela soma até
   `MAX_SCREENS = 3` (`SCREEN_LIMIT`). Publicar voz/câmera marca `inCall = true`.
3. `broadcast` manda o snapshot a todos. Nada de mídia passa pelo servidor.

**Assinar (quem pede o quê, quando)** — `controller.ts` › `reconcile` (~L1310), chamado a cada snapshot/mudança.

4. Para cada publicação alheia: voz e câmera só se `inCall`; tela só se `watching.includes(id)` (tier `main`).
   Tela não assistida mas visível e com `previewsEnabled` vira tier `preview` (máx. `config.maxPreviews = 2`).
5. A intenção guarda um `nonce` (`freshKey()`). O cliente envia `subscribe {publicationId, tier, nonce}`.
6. Servidor (`rooms.ts` › `subscribe`): recusa a própria publicação (`NOT_FOUND`), `preview` de não-tela
   (`INVALID_REQUEST`) e mais de 2 previews de outras publicações (`PREVIEW_LIMIT`). `id = stableId(secret, pubId:viewer:tier:nonce)`. Assinatura antiga do mesmo par publicação+tier com outro id é fechada
   (`closeSub`). Emite `subscription` ao espectador **e** ao dono; em tela `main` também `screen-viewers`.
7. Ambos chamam `Peers.accept(sub)` (`peers.ts` ~L106). Dono (`publication.owner === me`) é `outgoing`.
8. Saída: `unsubscribe`, `unpublish`, `leave`, `call:false` (remove tudo menos telas) → `subscription-ended` /
   `publication-ended` → `Peers.close` / `closePublication`. Item que some do snapshot com PC conectada tem
   30 s de tolerância (`missingSince`, para reinício do servidor) antes de fechar.

**Demanda de vídeo (#162)**

9. Espectador diz o que precisa: `setVideoDemand(pubId, {video: off|small|fit|focus, height})` →
   `flushVideoDemands` → `command demand {id, video, height}` (rate 360/min). Câmera sem demanda explícita = `off`
   (`cameraOff`, ninguém paga upload de câmera escondida). Servidor só aceita do espectador, tier `main`, não-voz,
   e repassa ao dono como `video-demand`. Dono: `Peers.demand` → `sub.demand` → `parameters`. Se a PC ainda
   não existe, guarda em `pendingVideoDemand` (máx. 512).

**Negociação** (`peers.ts`)

10. Ofertante único: o dono. `accept` cria `RTCPeerConnection({iceServers, iceTransportPolicy: forceRelay ? "relay" : "all"})`,
    faz `addTrack` de cada trilha (`source.stream`, ou o canvas de miniatura no `preview`), aplica
    `preferVideoCodecs` no sender de vídeo e chama `offer()` (`round++`, `createOffer`, `setLocalDescription`,
    envia `{id, round, description}`). `offer` não faz nada se offline ou `signalingState !== "stable"`.
11. O espectador **não cria transceivers**: só recebe a oferta (`signal` › `setRemoteDescription`), responde
    (`createAnswer`) com o mesmo `round` e copia o `round` da oferta para si. Dono só aceita `answer` com
    `round === peer.round` e estado `have-local-offer`.
12. Tudo passa por `serial()` (fila de promessas por PC, só roda se a entrada ainda é a mesma). `round` filtra
    obsoletos: descrição com round menor que o atual é ignorada; candidato com round menor é descartado; candidato
    sem `remoteDescription` ou de round maior vai para `peer.candidates` (máx. 128) e é aplicado (só os do round
    atual) depois da descrição.
13. `ontrack`: `addRemoteTrack(peer.stream, track)` e `changed()`. `onended` remove a trilha. Um `MediaStream` por PC;
    `Peers.stream(pubId, tier)` entrega o de `main` ou `preview` (preview nunca vira main: busca por tier exato).
14. `parameters(peer)` roda no dono depois de cada resposta, em `update(kind)` e em mudança de demanda/altura/divisão do
    teto (ver Números). Faz `sender.getParameters()`, mexe em `encodings[0]` (`maxBitrate`, `maxFramerate`,
    `scaleResolutionDownBy`, `active`) e `setParameters` sob `mediaDeadline` de 5 s. `demand.video === "off"` → `active:false` e
    `replaceTrack(null)` (para de codificar); reativar → `replaceTrack(source)`. Falha ao aplicar: mensagem em `info.error`.
15. `update(kind)`: troca de fonte sem renegociar (`replaceTrack` por sender); fonte nova com som e sem sender de áudio
    adiciona m-line e reoferta (`offer(peer,false)`).

**Recuperação** (`recover`, ~L290)

16. Toda PC não conectada (inclusive recém-criada) arma um timer; `failed`/`disconnected` também armam. Atraso =
    `min(2000·2^attempts, 30000)·(0,85…1,15)` ms (2 s, 4, 8, 16, 30, 30…); `attempts` sobe até 5 e zera ao conectar.
    Offline: reagenda sem contar. Ao disparar: renova ICE se faltam < 60 s, `setConfiguration`, e
    - dono: rollback se `have-local-offer`, depois `offer(iceRestart:true)`;
    - espectador: envia `{id, round, restart:true}` e o dono refaz oferta com `iceRestart`.
    Com `attempts ≥ 4` mostra "A mídia ainda não voltou…TURN". `accept` repetido em PC `failed` também chama `recover`.
17. `resume()` (volta de rede/visibilidade, reconexão do socket): dono recoloca oferta com restart; todos armam `recover`.
18. `reconnectMedia(forceRelay)` (botão "Reconectar mídia" / "Testar somente via TURN", `App.tsx` ~L967): recusa relay se
    `ice.turn` falso; troca `iceTransportPolicy` em todas as PCs; fecha e re-assina tudo com **novo nonce** (id novo,
    geração limpa, descarta ICE antigo); `restartOutgoing()` + `resume()`.
19. Socket reentra (`controller.ts` ~L772): `peers.closeAll()` (incrementa `generation`; `accept` em voo checa e aborta)
    e re-assina; `epoch` diferente = refazer tudo.

**ICE / credenciais**

20. `ice` (`rooms.ts` ~L1158, rate 12/min): STUN `STUN_URLS` (padrão `stun:stun.l.google.com:19302`) sempre; TURN por
    **um** de três caminhos exclusivos (validado em `readConfig`): (a) Cloudflare Realtime via `fetchCloudflareIce`
    (POST `…/generate-ice-servers`, `AbortSignal.timeout(8000)`, cache de 1 credencial para a sala até faltar 60 s; erro =
    `TURN_UNAVAILABLE`); (b) coturn com credencial efêmera `username = "<exp>:<participantId>"`, HMAC-SHA1 base64
    (TURN REST); (c) usuário/senha estático (não expira). Resposta `{iceServers, expiresAt, turn}`. No caminho
    Cloudflare, STUN não é adicionado pelo VIO (a lista vem pronta deles).
21. Cliente: `refreshIce` (dedupe por `icePending`), agenda a próxima em `max(30 s, expiresAt − agora − 60 s)`;
    `accept` renova se `expiresAt < agora`. Candidatos saem por `icecandidate` como `signal {candidate}` (trickle ICE).
22. Servidor repassa `signal` (`rooms.ts` ~L584): rate 600/min por pessoa, `signalSchema.parse`, exige que o remetente seja
    dono ou espectador da assinatura; `offer` só do dono, `answer` só do espectador, `restart` só do espectador. Não
    inspeciona SDP nem confere `round`. Erro vira `{ok:false, code:"FORBIDDEN"}`; cliente conta `rejectedSignals`.

## Números

| Parâmetro | Valor | Onde |
|---|---|---|
| Telas por pessoa | 3 (`MAX_SCREENS`) | `protocol.ts` |
| Previews por espectador | 2 (`maxPreviews`) | `config.ts`, `rooms.ts` |
| Preview: codificação | 90 kbps, 5 fps, escala 1; canvas 320×180, `captureStream(5)`, redesenho a cada 200 ms | `video-quality.ts` › `videoEncoding`; `capture.ts` › `createPreview` |
| Câmera captura | ideal 640×360, fps ideal 20 / máx 24 | `capture.ts` › `startCamera` |
| Câmera `focus`/sem demanda | 450 kbps, 20 fps, escala 1 | `video-quality.ts` › `cameraEncoding` |
| Câmera `fit` | 300 kbps, 20 fps, escala = altura/`demand.height` | idem |
| Câmera `small` | 120 kbps, 12 fps, altura alvo `min(demand.height,240)` | idem |
| Tela: presets | Alta 30 fps/4000 kbps/1080p; Média 24/1800/720; Baixa 15/700/480 | `protocol.ts` › `presets` |
| Tela extra (2ª, 3ª) | no máx. preset Baixa | `capture.ts` › `extraScreenQuality` |
| Tela com demanda `small` | fps ≤ 12, bitrate ≤ 450 kbps, altura ≤ `demand.height` | `peers.ts` › `parameters` |
| Tela com demanda `fit` | bitrate ≤ max(500, bitrate·alturaDemanda/alturaConfigurada) | idem |
| Teto de upload de telas | 8000 kbps no total (`screenUploadBudget`), piso 300 kbps por espectador | `video-quality.ts` › `splitBudget` |
| Alta × 6 espectadores | 17,9 → 7,7 Mbps medido, CPU 119% → 60% | `docs/notas/midia.md` (#23) |
| Altura de resolução | 240/480/720/1080/1440/2160; `scaleResolutionDownBy = max(1, alturaFonte/alvo)` (nunca amplia) | `protocol.ts`, `video-quality.ts` › `screenScale` |
| `setParameters` timeout | 5000 ms | `deadline.ts` › `mediaDeadline` |
| Ciclo de stats | 2000 ms (também reaplica `parameters` se mudou altura da fonte ou a divisão do teto) | `peers.ts` ctor, `stats` |
| Recuperação | 2·2^n s, teto 30 s, jitter ±15%, n ≤ 5; aviso a partir de 4 | `peers.ts` › `recover` |
| Fila de candidatos | 128 por PC | `peers.ts` › `signal` |
| `pendingVideoDemand` | 512 entradas | `peers.ts` › `demand` |
| Tolerância de publicação sumida | 30 s | `controller.ts` › `reconcile` |
| TTL da credencial TURN | `TURN_TTL_SECONDS` padrão 600 (60–3600) | `config.ts` |
| Rates por pessoa/min | subscribe 180, unsubscribe 180, demand 360, publish 30, state 100, ice 12, signal 600 | `rooms.ts` |
| Limites do `signalSchema` | SDP ≤ 60000, candidate ≤ 4096, round 0–10000, `id` ≤ 80 | `protocol.ts` |
| Aviso de carga P2P | a partir de 6 pessoas, sem bloquear | `config.ts` (`recommendedParticipants`), ADR 010 |
| Cloudflare: timeout | 8000 ms | `rooms.ts` › `fetchCloudflareIce` |

## Peças e técnicas

| Peça/técnica | Para que | Onde |
|---|---|---|
| Malha P2P, uma `RTCPeerConnection` por (publicação, espectador, tier) | Sem SFU; codificação por espectador | `peers.ts` |
| Socket.IO como canal de sinalização (`signal`, `subscription`, `video-demand`) | SDP, trickle ICE, pedido de restart | `rooms.ts`, `controller.ts` |
| Ofertante único (dono) + `round` + fila serial | Evita glare por construção | `peers.ts` › `offer`, `signal`, `serial` |
| Rollback explícito só no ofertante antes de ICE restart | Reabrir negociação presa em `have-local-offer` | `peers.ts` › `recover`, `restartOutgoing` |
| ICE restart (`createOffer({iceRestart:true})`) | Recuperar `failed`/`disconnected` | `peers.ts` › `offer` |
| Trickle ICE com fila e filtro por `round` | Não aplicar candidato antigo a oferta nova | `peers.ts` › `signal` |
| `RTCPeerConnection.setConfiguration` | Trocar servidores/`iceTransportPolicy` sem recriar a PC | `peers.ts`, `controller.ts` › `reconnectMedia` |
| `iceTransportPolicy: "relay"` (opcional, teste) | Forçar TURN para diagnóstico | `peers.ts` |
| STUN público Google + TURN (coturn HMAC, Cloudflare Realtime, estático) | Atravessar NAT | `config.ts`, `rooms.ts`, `docs/TURN.md` |
| `RTCRtpSender.setParameters` (`maxBitrate`, `maxFramerate`, `scaleResolutionDownBy`, `active`) | Teto por espectador | `peers.ts` › `parameters` |
| `RTCRtpSender.replaceTrack` (incl. `null`) | Trocar fonte sem renegociar; pausar vídeo por demanda | `peers.ts` |
| `RTCRtpTransceiver.setCodecPreferences` + `RTCRtpSender.getCapabilities` + `MediaCapabilities.encodingInfo` | H.264 à frente dos outros codecs (que continuam na lista) se a codificação for por hardware (`powerEfficient`); sem isso, vale a ordem padrão do navegador | `codecs.ts` |
| `MediaStreamTrackEvent` despachado à mão | Avisar consumidores quando se muda stream por script | `remote-stream.ts` |
| `RTCPeerConnection.getStats` a cada 2 s | RTT, rota relay x direta, bitrate, resolução, fps, perda, candidatos | `peers.ts` › `stats` |
| `canvas.captureStream(5)` | Miniatura ao vivo barata (preview) | `capture.ts` |
| Water-filling (`splitBudget`) | Dividir 8 Mbps entre espectadores de tela | `video-quality.ts` |
| `Promise.race` com timeout | Não travar em operação do navegador que não responde | `deadline.ts` |
| Sem simulcast/SVC (um `encodings[0]`), sem `degradationPreference`, sem `networkPriority` | (ausência confirmada por grep em `src/`) | — |
| `contentHint = "detail"` só na trilha nativa do app Windows | Evitar que o Chrome trate tela como câmera | `desktop/native-video.ts` › `asScreenContent` |
| `getDisplayMedia` com constraints de `displayVideo` (padrão `true`) | Captura de tela no navegador | `capture.ts` |
| HMAC-SHA1 (TURN REST) | Credencial efêmera de coturn | `rooms.ts` › `ice` |
| `stableId` (HMAC) | `publicationId` e id de assinatura estáveis e não adivinháveis | `rooms.ts` |

**Trocar o codec:** o ponto de mudança é `codecs.ts` (`rank`, `preferH264`, `videoCodecs`,
`preferVideoCodecs`). A sonda roda uma vez por página e só pergunta por `video/H264` em
1920×1080, 4 Mbps e 60 fps; pôr AV1 ou VP9 à frente pede uma sonda `powerEfficient` própria.

## Mercado (pesquisa nov 2026)

Comparado: negociação, recuperação, codecs e TURN do VIO contra o que MDN, Chrome, webrtcHacks e
fornecedores de WebRTC recomendam para malha P2P e compartilhamento de tela.

| Método do mercado | Resolve | No VIO | Custo | Recomendação |
| --- | --- | --- | --- | --- |
| Ofertante único (dono) + `round` + fila serial por PC | Negociação sem colisão quando só um lado oferece | sim | — | manter |
| Perfect negotiation (polite/impolite, rollback no receptor) | Os dois lados podem oferecer sem colisão | não | código nosso | não vale: no VIO só o dono oferece; acrescenta estados sem ganho |
| Política de ICE restart (só depois de `failed`, ou de `disconnected` por alguns segundos) | Não reiniciar uma conexão que ainda está nascendo | parcial: reinicia ~2 s após `new` (03.3) | código nosso | adotar: sem restart na primeira conexão |
| `connectionState` em vez de `iceConnectionState` | Estado único e confiável da conexão | sim | — | manter |
| Restart pendente (`pendingRestart`) | Não perder um restart que chega no meio de uma oferta | não (03.2) | código nosso | adotar |
| `contentHint` (`detail`/`text` para tela parada, `motion` para vídeo e jogo) | O codificador prioriza nitidez ou fluidez conforme o conteúdo | parcial: só no app nativo (ver [04](04-captura-tela-e-audio.md)) | código nosso | adotar |
| `degradationPreference` | Escolher o que cai com pouca banda: resolução ou fps | não | código nosso | depois; nunca `maintain-framerate-and-resolution` (congela) |
| Codec por preferência (`setCodecPreferences`: VP9 ou AV1) | Mais qualidade por bit; o AV1 tem ferramentas de tela (~45% menos bits em conteúdo de tela, segundo o Chrome) | parcial: H.264 primeiro quando há hardware; senão, a ordem padrão do navegador (VP8 primeiro no Chromium) | código nosso | depois: medir CPU; AV1 em software pesa |
| SVC (`scalabilityMode` L1T3) | Descartar camadas de fps sob perda, sem renegociar | não | código nosso | depois |
| Simulcast | Várias qualidades para um SFU escolher | não | — | não vale: sem SFU, cada espectador já tem a sua PC |
| Ajuste do Opus (estéreo, `maxaveragebitrate`, FEC, DTX) | Som de filme em estéreo; voz econômica | não | código nosso | depois; estéreo para tela com som vem primeiro |
| RED (redundância de áudio) | Áudio que resiste a perda de pacotes | não | código nosso | depois |
| `networkPriority`/`priority` | Voz antes de vídeo na fila de rede | não | código nosso | depois |
| `jitterBufferTarget` | Trocar atraso por estabilidade em quem assiste | não | código nosso | depois |
| `getStats` com `qualityLimitationReason`, `nackCount` | Saber por que a qualidade caiu (CPU ou banda) | parcial: `stats()` mostra o básico | código nosso | adotar |
| Limite da malha | Não passar do que o envio aguenta | sim: teto de envio dividido entre quem assiste (#23) | — | manter |
| TURN gerenciado: Cloudflare Realtime TURN (1.000 GB/mês grátis, depois US$ 0,05/GB) | Conectar redes que bloqueiam P2P | parcial: caminho pronto no código, sem prova entre redes (03.7) | código nosso (config) | adotar (#135) |
| coturn próprio | TURN sem fornecedor | parcial: caminho estático no código | código nosso + servidor | depois |
| TURN sobre TCP/TLS na porta 443 | Passar por firewall de empresa ou escola | parcial: `turns:` na 5349 | código nosso (config) | adotar a verificação da 443 |

**Fontes:** https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation ·
https://bloggeek.me/webrtcglossary/ice-restart/ ·
https://groups.google.com/a/chromium.org/g/blink-dev/c/FUlvv_Lmk-s ·
https://developer.chrome.com/blog/av1 · https://antmedia.io/webrtc-network-topology/ ·
https://getstream.io/resources/projects/webrtc/advanced/codecs ·
https://webrtchacks.com/the-hidden-av1-gift-in-google-meet/ ·
https://bugzilla.mozilla.org/show_bug.cgi?id=1418804 ·
https://lists.w3.org/Archives/Public/public-webrtc-logs/2017Jun/0622.html ·
https://lists.w3.org/Archives/Public/public-webrtc-logs/2024Nov/0035.html ·
https://developers.cloudflare.com/realtime/sfu/platform/pricing/ ·
https://datatracker.ietf.org/doc/html/draft-uberti-rtcweb-turn-rest-00

## Achados

| ID | Achado | Tipo | Confiança | Onde |
| --- | --- | --- | --- | --- |
| 03.2 | O espectador só entende `offer`. Se o dono está em `have-local-offer` e chega um `restart`, `offer()` retorna em silêncio (estado ≠ `stable`): o pedido se perde e só o próximo timer, em até 30 s, tenta de novo. | bug | média | `peers.ts` › `signal` (restart), `offer` |
| 03.3 | `recover` é armado já no `accept` para PC `new` e dispara em ~2 s: se o handshake (ou o TURN) demora mais, faz ICE restart (novo `round`) no meio da primeira conexão e pode atrapalhar redes lentas. | risco | média | `peers.ts` › `accept` (~L228), `recover` |
| 03.4 | O limite de `signal` é 600/min por pessoa. Com 3 telas + voz + câmera para vários espectadores e trickle ICE (dezenas de candidatos por PC, mais com TURN e reinícios), o balde pode esvaziar numa reconexão em massa; o sinal recusado só marca `rejectedSignals`, sem reenvio. | risco | baixa (conta não medida) | `rooms.ts` › handler `signal`; `controller.ts` (ack) |
| 03.5 | O VIO só põe H.264 à frente quando há codificação por hardware; fora isso vale a ordem padrão do navegador (VP8 primeiro no Chromium), e VP9 e AV1 ficam na lista sem preferência. Opus sem teto, DTX nem fmtp; simulcast e SVC sem uso. `degradationPreference` e `contentHint` não são definidos na tela capturada pelo navegador (só no app nativo): com pouca banda o navegador decide sozinho entre fps e resolução. | lacuna | média | `codecs.ts`; `peers.ts`; `desktop/native-video.ts` |
| 03.6 | O servidor repassa SDP e candidatos sem checar `round` nem conteúdo (só tamanho). Mitigado pela checagem de dono e espectador. | risco | média | `rooms.ts` › handler `signal` |
| 03.7 | Conectividade real via TURN entre redes diferentes ainda **não comprovada** (o próprio `TURN.md` diz). O doc manda usar "Sobre a sala → Testar somente via TURN"; o botão existe no painel de diagnóstico, falta confirmar que o caminho descrito leva até ele. | lacuna | média | `docs/TURN.md`; `docs/VALIDACAO.md`; `App.tsx` (~L967) |
| 03.8 | `stats()` usa `let selected: any`, contra a regra "sem `any` solto". | risco | alta | `peers.ts` › `stats` (~L534) |
| 03.9 | `docs/NAVEGADORES.md` bate com o código (miniaturas 320×180 até 5 fps; `applyConstraints` + `setParameters`), mas não cita o teto de envio de 8 Mbps (#23). Incompleto, não errado. | doc desatualizado | baixa | `docs/NAVEGADORES.md` |

Invariantes conferidos e **ok**: transmissão por `publicationId` (`Peers.stream(pubId, tier)`,
assinaturas por id derivado); prévia nunca vira `main` (tier exato na busca, `videoEncoding`
próprio); streams remotos só via `addRemoteTrack`/`removeRemoteTrack` (o único `stream.addTrack`
fora de `remote-stream.ts` é `desktop/capture.ts` ~L180, stream local sem consumidor remoto);
`RemoteVoice` mantém o `<audio>` montado e tocando, mudo se for o caso (`components/Media.tsx`);
`close()` não reparenta hosts de vídeo. O resto de "foco e layout só mudam apresentação" é tema
do canvas ([06](06-canvas-widgets-e-notas.md)).

## Perguntas em aberto

- Há teste automático de negociação com colisão (glare) ou de `restart` durante
  `have-local-offer`? O `tests/BrowserLab.tsx` usa adaptador sintético e servidor real, mas não
  vi esses casos (não li as 708 linhas inteiras).
- O que o Chrome faz sem `contentHint` em `getDisplayMedia`? O código assume que trata como
  tela; `notas/midia.md` só confirma o problema na trilha gerada.
- Qual bitrate e fmtp o Opus usa de fato na voz? Nenhum ajuste no código; vale o padrão do
  navegador.
- No caminho Cloudflare o servidor não acrescenta `STUN_URLS`; a lista da Cloudflare traz STUN?
- Efeito real do ICE restart aos ~2 s em redes lentas (03.3): não há medição no repositório.
