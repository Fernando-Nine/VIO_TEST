# 02 — Conexão e reconexão

> **Resumo:** O cliente abre um socket Socket.IO (só WebSocket) com um token HMAC de sessão, entra na sala com o
> comando `join` e recebe um `snapshot`. A identidade (id do token) sobrevive a quedas e recargas; o servidor segura
> quem caiu por 90 s como "offline" antes de removê-lo. Desde a #286, fechar a aba ou recarregar manda uma despedida
> (`POST /api/leave`): com outra pessoa online, quem saiu é removido em 8 s (`FAREWELL_SECONDS`) se não voltar; sozinho,
> vale o grace inteiro. Só a rede caída, sem despedida, ainda espera o grace.
>
> **Arquivos-chave:** `src/client/room/controller.ts` (`enter`, `rejoin`, `scheduleRecovery`, `retry`, `newSession`,
> `leave`, `heartbeat`, `getSession`), `src/client/room/recovery.ts` (backoff e erros permanentes),
> `src/client/room/presence-cues.ts` (sons de entrada/saída), `src/client/room/status.ts` (texto do chip de conexão),
> `src/client/components/RoomStatus.tsx` (chip), `src/client/room/recent-rooms.ts` (Recentes, só local; só o app os mostra),
> `src/client/endpoint.ts` (origem do socket), `src/client/id.ts` (`freshKey`), `src/client/App.tsx` (`pagehide`/`pageshow`,
> `goHome`, `enter`), `src/client/main.tsx` (cria o `Controller`, registra o service worker), `public/sw.js`,
> `src/server/app.ts` (`/api/session`, `io.use`, limites, ping do engine), `src/server/rooms.ts` (`join`, `leave`,
> `disconnect`, `clean`, `probePing`), `src/server/config.ts` (`grace`), `tests/recovery.test.ts`,
> `tests/RoomSwitchLab.tsx`.
>
> **Docs:** `docs/SEGURANCA.md` (~L85, grace de 90 s), `docs/DEPLOY.md` (~L68 Render Free dorme; ~L171 salas em memória),
> `docs/ESTADO.md` (Fila: #286 depende da #287), README (`RECONNECT_GRACE_SECONDS`).
>
> **Retrato:** commit `8bdc516` (5 nov 2026), atualizado pela #286 (seção G). Mudou o que esta ficha descreve? Atualize-a no mesmo PR.

## Como funciona hoje

### A. Primeira conexão (entrar numa sala)

1. `main.tsx` cria um único `Controller` e passa para `<App engine>`. Em dev, `/qa-switch` etc. montam laboratórios.
2. Usuário clica em entrar (`Home` no app, `Landing` no navegador → `App.tsx` ~L467/L487) → `Controller.enter(name, code?, recovering, invite?)`
   (`controller.ts` ~L510). Se já havia `intent` ou `socket`, chama `void this.leave()` antes (troca de sala, ver C).
3. `enter` incrementa `generation` (todo callback assíncrono confere `current()`), põe `status="connecting"`, grava
   `intent` `{name, code, color, invite}` e registra ouvintes `online`/`offline`/`visibilitychange` (ver F).
4. `initialize()` busca `GET /api/config` (timeout 15 s; falha → "O serviço está iniciando…"). Depois `getSession()`
   (~L415): lê `sessionStorage["vio:session"]` ou faz `POST /api/session` (timeout 15 s; 30/min por IP). O servidor
   devolve `{token, id, expiresAt}` com `issueToken` (id = `randomUUID`, TTL 3600 s). **A identidade é o `id` do token.**
5. Cria o socket com `io(url, opts)` (`connectSocket`, injetável em teste). Opções (~L568): `path` do config,
   `transports:["websocket"]`, `auth:{token}`, `autoConnect:false`, `reconnectionAttempts:Infinity`,
   `reconnectionDelay:1000`, `reconnectionDelayMax:30000`, `randomizationFactor:0.4`. URL: `config.signalingUrl` ou
   `socketOrigin()` = `apiBase || location.origin` (`endpoint.ts`; casca Tauri usa `VITE_API_BASE`).
6. Servidor: `allowRequest` confere `Origin` (ausente = recusa), limite 60 handshakes/min por IP e `maxSocketsPerIp`=20;
   `io.use` verifica o token (`verifyToken`) e põe `socket.data={id,expires,ip}`; erro vira `connect_error` com a
   mensagem `SESSION_EXPIRED` (só token inválido ou vencido), `CONNECTION_LIMIT` ou `CONNECTION_ERROR` (qualquer outra
   falha: o cliente tenta de novo **com o mesmo token**, #292) (`app.ts` ~L180–L193).
7. Evento `connect` → `rejoin()` (~L814): `request("join", {...intent, credential?})`. `request` rejeita se o socket não
   está conectado, usa `socket.timeout(10000)` e descarta resposta se `generation`/`socket`/`actor` mudaram
   (`AbortError "Room changed"`).
8. Servidor `command("join")` (`rooms.ts` ~L659): cria a sala se não existe (limite `maxRooms` 200), recusa
   `SESSION_IN_USE` se o membro já tem outro `socketId` vivo de **outra** página (D2.8), recusa `ALREADY_JOINED` se a identidade já está em outra sala,
   trata sala trancada (sala de espera, `WAITING`), cria/atualiza o `Member` (`online:true`, `socketId`, reaproveita
   `role`, `color`, `inCall` e **`publications`** do membro anterior), `socket.join(code)`, `broadcast`, reenvia
   `subscription` pendentes e devolve `{id, snapshot, credential?}`.
9. Cliente: em sucesso `status="connected"`, `heartbeat()`, `receiveSnapshot(snapshot,false)` (sem cues), primeiro
   `room-enter` local (`roomEntered`), `refreshIce()`, reanuncia chamada (`call`) e capturas (`syncCapture`), `reconcile()`,
   `peers.resume()`, zera `recoveryAttempt`, e reescreve a URL para `?sala=CODE` (só se `persist` e não `embedded`).
   `App.tsx` ~L272 grava a sala em Recentes (`touchRecent`, `localStorage["vio:recent-rooms"]`, máx. 12); desde a #285 o navegador não mostra Recentes, só o app.
10. Erros no `join`: `WAITING` → espera o evento `admission` (convite expirado = `turnAway("expired")`);
    `ENTRY_REFUSED`/`WAITING_FULL` → `turnAway("refused")` (sai); `FORBIDDEN`/`INVALID_REQUEST`/`ROOM_FULL` são
    **permanentes** (`recovery.ts` › `permanentRecoveryError` → `status="failed"` e `fail(e)`); qualquer outro →
    `scheduleRecovery(e)`.

### B. Snapshot, epoch e identidade estável

1. `Snapshot` traz `epoch` (= `Rooms.epoch`, `randomUUID()` por processo do servidor, `rooms.ts` ~L129), `code`,
   `participants[]` (com `online`, `pingMs`, `publications`), `serverTime`, widgets (só no join e em eventos próprios).
2. Broadcasts de sala omitem widgets; `receiveSnapshot` reaproveita `widgets` anteriores se `epoch` e `code` iguais
   (~L933). **Epoch diferente = servidor reiniciou**: o snapshot novo substitui tudo, `presenceCues` devolve `[]`
   (sem som de entrada/saída em massa), e o cliente refaz tudo pelo caminho normal do `rejoin` (join → `call` →
   `syncCapture` → `reconcile` → `peers.resume()`). Assinaturas guardam `epoch` (`subscriptions` ~L158, usado em ~L1321
   como `${epoch}:${joinAttempt}`) para o nonce não colidir. (O texto "refazer tudo" é do CLAUDE.md; não há um ramo único
   que teste `epoch` e reinicie; o efeito vem do rejoin completo.)
3. Identidade: o `id` vem do token e fica em `sessionStorage["vio:session"]` (por aba; sobrevive a recarga, não a nova
   aba). Reentrar com o mesmo id devolve o mesmo `Member` (cor, papel, `inCall`, publicações). Após restart do servidor o
   mesmo token ainda vale (HMAC com o mesmo `SESSION_SECRET`), a sala é recriada com `recreated=true`
   (criador provisório; credencial assinada de criador restaura o assento).
4. Renovação: `heartbeat` a cada 10 s; se `expiresAt < agora+300 s` pede `renew` (mesmo id, novo TTL) e atualiza
   `socket.auth`. Token expirado → `connect_error "SESSION_EXPIRED"` → `scheduleRecovery(SESSION_EXPIRED)` → `retry(true)`
   → `newSession()` (~L769): pede sessão **nova (id novo)**, fecha todos os peers, limpa publicações/assinaturas locais
   e faz `socket.disconnect().connect()`. Capturas e intenção sobrevivem.

### C. Sair, trocar de sala, entrar e sair rápido

1. `leave(announce=true)` (~L1514): toca `room-leave` local, zera `intent`, `generation++`, cancela timers
   (`ticker`, `iceTimer`, `reconnectTimer`), remove ouvintes de rede e do socket, e **se `socket.connected`** emite
   `command {action:"leave"}` com `timeout(1500)`; no ack **ou no timeout** chama `socket.disconnect()`. Se **não** está
   conectado, só `socket.disconnect()` (nada é dito ao servidor). Depois apaga `this.session` e
   `sessionStorage["vio:session"]` (**a identidade é descartada**: a próxima entrada recebe id novo), para capturas,
   `peers.closeAll()`, limpa catálogos, volta `view` a `idle`, limpa `?sala` da URL.
2. Servidor `leave` (`rooms.ts` ~L1039): `this.leave(room, m, true)` remove publicações e assinaturas do membro
   (`publication-ended`/`subscription-ended` para os outros), `members.delete`, `membership.delete`, transfere criador se
   preciso (explícito = passa o assento de verdade; por timeout = empresta, `provisional`), e `broadcast(room,true)`.
   Sala vazia reseta widgets/permissões e só é apagada por `clean()` depois de `roomTtl` (300 s).
3. **Trocar de sala** (`App.tsx` `enter` com sala aberta, ou Recentes, só no app): `enter()` chama `leave()` (acima) e segue com
   sessão nova. Na prática: id novo na sala nova; a sala velha recebe `leave` explícito se o socket estava conectado.
   `goHome()` (~L262) faz `await engine.leave()`.
4. **Entrar e sair rápido**: se `leave` vem antes do `connect`, `generation` mudou e todos os `current()` abortam
   (`enter`/`rejoin`/`request`); socket em conexão só recebe `disconnect()`. Se o `join` já foi enviado, o `leave` segue
   no mesmo socket e o servidor os processa em ordem (membro é criado antes do `await socket.join`). `RoomSwitchLab`
   segura o ack do primeiro `join` (servidor já aceitou) para provar esse caso.
5. **Fechar a aba / recarregar**: `App.tsx` ~L184 `pagehide` → `engine.farewell()`, `captures.stopAll()` e
   `engine.socket?.disconnect()` (desde a #301 não há `beforeunload`, que um link de download também dispara). Ver D2. Recarga mantém
   `sessionStorage` (mesmo id); depois do reload a pessoa precisa clicar em entrar de novo (não há reentrada automática;
   `Home`/`Landing` só pré-preenchem o código do `?sala`). Se reentrar dentro do grace, retoma o mesmo `Member`.

### D. Queda: o que o servidor faz e o grace

1. `socket.on("disconnect")` (`rooms.ts` ~L612): para qualquer motivo (aba fechada, rede, ping timeout, servidor
   reiniciando) se `m.socketId === socket.id` → `online=false`, `socketId=undefined`, `lastSeen=agora`, `broadcast(room)`.
   Publicações, assinaturas, `inCall` e papel **permanecem**.
2. `Rooms.clean()` roda a cada 10 s (`app.ts` `setInterval`, `unref`): remove membro com `!online && agora-lastSeen > grace` chamando `this.leave(room, m)` (não explícito). `grace = RECONNECT_GRACE_SECONDS` (padrão 90, mín. 10, máx. 300,
   `config.ts` ~L167). Logo a saída "por timeout" aparece 90–100 s depois do `disconnect` visto pelo servidor.
3. Detecção de queda sem FIN (rede some, notebook dorme): engine.io do servidor com `pingInterval:20000`,
   `pingTimeout:20000` (`app.ts` ~L105) → até ~40 s até o `disconnect`. Soma típica de "rede sumiu" → ghost removido:
   ~40 s + 90–100 s.
4. Quem reentra antes disso: `join` reaproveita o membro (sem remover/readicionar), então os outros não veem saída.

### D2. Despedida da página (#286)

1. Cada `Controller` gera um `page` (`crypto.randomUUID()`) e o manda em todo `join`; o servidor guarda em `Member.page`.
2. `pagehide` (`App.tsx`) chama `engine.farewell()`: grava a sala da aba em `sessionStorage` (`vio:room`, com
   `hiddenAt`) e envia `fetch(POST /api/leave, keepalive)` com `{ token, page }`. Não usa `sendBeacon` (sem `Origin`
   sob `no-referrer`). O corpo vai como `text/plain` (sem preflight), até 2 KB, e passa por `farewellSchema` (`.strict()`).
3. A rota confere origem, limite por IP (30/min, chave `ip:leave`), token HMAC e então `rooms.farewell(id, page)`.
   Só age se `page` for a da página que está na sala: uma despedida atrasada da página velha não derruba a nova.
4. `farewell` derruba o socket que sobrou, tira publicações e assinaturas (`dropMedia`) e marca `leavesAt = agora + 8 s`.
   `clean()` remove o membro quando `leavesAt` passou **e** há outra pessoa online; sozinho na sala, ninguém é removido
   antes do grace (a sala, os widgets e as permissões ficam como estavam).
5. `leave()` com o socket fora do ar (02.2) ou sem ack manda a despedida com `explicit: true`: saída imediata.
6. Recarregar até 60 s depois do `pagehide`, sem link para outra sala, volta sozinho (`engine.resume`, `tab-room.ts`).
   Microfone e câmera nunca reabrem sozinhos. Página nova indo para outra sala pede sessão nova (02.14).
7. `join` com `page` diferente da guardada solta as publicações da página anterior antes de reaproveitar o membro (02.4).
8. `SESSION_IN_USE`/`ALREADY_JOINED` tentam de novo após 1 s e 2 s (dentro do prazo da despedida) e então param com
   "Entrar nesta aba", que entra com sessão nova e **sem** a credencial de criador (`enterHere`). Antes, `enterHere`
   manda a despedida explícita da identidade velha (#301): se a página dona era esta, ela sai na hora; se é outra aba
   viva, o servidor ignora (a `page` não bate).
9. **#301, conflito falso**: a mesma página (mesma `page`) reconectando enquanto o servidor ainda segura o socket velho
   meio aberto (troca de rede) **assume o lugar** com a mídia: o socket velho é derrubado sem `dropMedia`. Página
   diferente: o `join` espera a `presence-probe` ao socket preso (2 s, `config.holderProbe`) e só o solta se ele não
   respondeu **e** está sem tráfego há 12 s (`config.holderQuiet`, pulsação de 10 s + folga); então entra na mesma
   chamada. Aba viva responde e o conflito segue. Aba congelada (celular, Safari em segundo plano) com tráfego recente
   não perde o lugar; as tentativas do cliente (1, 2 e 4 s, com as sondas) passam dos 12 s. Risco que fica: aba
   congelada por mais de 12 s perde o lugar para a página nova (o ping do engine a derrubaria pouco depois de qualquer
   jeito).
11. **#292, mesma aba com id novo**: `join` com `page` igual à de outro membro da sala (id diferente; os dois `page`
    definidos) troca o id velho pelo novo **num só snapshot**, sem sonda e sem `leave`: o novo herda papel (inclusive
    criador e `lentFromAdmin`), cor, `voiceBlocked`, `inCall` e widgets; a mídia do velho cai (`dropMedia`), o
    `membership` dele é apagado e o socket velho, se vivo, é derrubado. Vem de `newSession` (token vencido) ou de
    "Entrar nesta aba". Premissa: **`page` é segredo da aba** (`freshKey()` em memória, fora de `participantFields`,
    nunca difundido); o join ainda exige token válido e respeita `refused`. Sem `page`, ou com `page` diferente, é
    outra pessoa, como antes. A despedida atrasada do id velho não acha mais nada.
10. **#301, bfcache**: `pageshow` com `persisted` chama `engine.restored()`: `page` nova (a despedida atrasada do
    `pagehide` não derruba mais a página que voltou), PeerConnections, publicações e assinaturas zeradas, contagem de
    conflito zerada e reentrada. O canvas fica (sem reparentar hosts); telas que o primeiro snapshot não lista mais
    saem na hora. Microfone e câmera ficam fechados.

### E. O que os outros veem e as PeerConnections

- Membro offline continua em `participants` com `online:false`. UI: `PeopleWidget` (bolha `is-offline`, aria
  "reconectando"), `PeoplePanel` (estado "Reconectando"), `CamerasWidget`, `Spectators` (" · reconectando"), `PollFace`
  (conta só online). Não há contagem regressiva nem distinção entre "caiu" e "fechou a aba".
- `presence-cues.ts` › `presenceCues(prev,next,self)`: compara só **presença na lista** (ids), não `online`. Logo
  `room-leave` só toca quando o membro some do snapshot (fim do grace ou `leave`); ficar offline/voltar não toca nada.
  Ignora `epoch`/`code` diferentes e primeiro snapshot. `screen-new` se surgir publicação de tela de outra pessoa.
  Troca da mesma aba (D2.11): um id offline que some junto com um id novo no mesmo snapshot não toca nada.
- **Reinício (#292)**: no snapshot com `epoch` novo, `nextQuiet` guarda os ids e telas do snapshot anterior
  (`RestartQuiet`, por `code` e `epoch`, no controller). Quem desses volta não toca `room-enter` nem `screen-new`;
  quem é novo toca. A janela fecha quando todos voltam ou em 120 s (`RESTART_QUIET_MS`, `performance.now()`); é
  descartada em `enter`, `leave`, `restored()` e `newSession`. Uma saída de quem está online toca normalmente.
- **Limite do Render**: no deploy a instância nova sobe ao lado e a antiga vive ~60 s até o SIGTERM. Quem reconecta
  nesse meio-tempo cai na nova enquanto os outros seguem na velha: por até ~60 s a pessoa pode aparecer
  "reconectando" na velha. A garantia de "uma vez só" vale **dentro de uma instância**.
  `receiveSnapshot(announce)` só emite cues se `roomEntered` e `status==="connected"`.
- Chip da própria pessoa (`status.ts` › `connectionMetric`, `RoomStatus.tsx`): `status!=="connected"` →
  "Conectando" (warn) ou "Sem conexão" (bad, só `failed`); com telas e algum peer `failed|disconnected` →
  "Reconectando" (bad) "Uma conexão de tela foi interrompida"; senão RTT (`<100` good, `≤250` warn, resto bad).
- PeerConnections (só apontar; ver tema de WebRTC): servidor mantém assinaturas do offline durante o grace, então os
  peers dos outros vão a `disconnected/failed` e `peers.ts` › `recover` tenta de novo (backoff `min(2000·2^n,30000)· (0.85–1.15)`, `attempts` ≤5) até chegar `subscription-ended`/`publication-ended`. Na reconexão própria:
  `rejoin` → `peers.resume()`; só no `newSession` e no `leave` os peers são fechados (`closeAll`). Perda de rede mantém
  PCs vivos se o ICE sobreviver ("Seu áudio e vídeo podem continuar", aviso de `server-restarting`).

### F. Eventos de cliente durante a queda

1. `socket.on("disconnect", reason)` (~L595): `status="reconnecting"`; só se `reason==="io server disconnect"` agenda
   `scheduleRecovery()` própria. Para os demais motivos quem reconecta é o Manager do Socket.IO (1 s, ×2, até 30 s,
   ±40 %, infinitas tentativas).
2. `connect_error`: `SESSION_EXPIRED` → recuperação com sessão nova; outro erro (inclusive `CONNECTION_ERROR`, #292) → `status="reconnecting"`, `error="A conexão caiu. Tentando voltar…"`; se `!socket.active` (erro de middleware que o Manager não repete) →
   `scheduleRecovery(code=error.message)`. `reconnect_failed` nunca dispara com `Infinity` (ouvinte morto, ~L622).
3. `scheduleRecovery(error, soon)` (~L744): um só timer por vez; erro permanente → `failed`; atraso = `recoveryDelay (attempt)` = `min(30000, 1000·2^min(5,attempt))·(0.8+rand·0.4)`; `RATE_LIMIT`/`CONNECTION_LIMIT` → 60 s fixos. Ao
   disparar chama `retry()`: se socket conectado → `rejoin`; se existe socket → `socket.connect()`; senão `enter(..., recovering=true)` (mantém `recoveryAttempt`).
4. `window online` → se não conectado `scheduleRecovery(undefined,true)` (atraso ~0,8–1,2 s) senão `peers.resume()`;
   `offline` → só aviso em `view.notice`; `visibilitychange` visível → mesmo tratamento do `online`.
5. `server-restarting` (emitido por `app.close()` no desligamento limpo): `status="reconnecting"` + aviso. Em reinício
   sem aviso (Render dorme/crasha) vem só `disconnect`/`connect_error`; ao voltar, `join` recria a sala (`epoch` novo).
6. `heartbeat` (10 s): `request("ping")` mede `signalingPing` (RTT cliente→servidor→ack) e o servidor dispara
   `presence-probe` (ack imediato do cliente, 3 s) para medir `pingMs` por participante e emite `participant-ping` para a
   sala (`probePing`, `pingPending` evita sobreposição). Erro `SESSION_EXPIRED`/`NOT_JOINED` → `scheduleRecovery`;
   outros → `fail`.
7. Aba em segundo plano: timers são estrangulados pelo navegador (heartbeat pode ir a ≥1/min); o socket em si segue o
   ping do engine. Ao voltar, `visibilitychange` religa a recuperação. Nada de `pagehide`/`freeze` (não confirmado se
   há tratamento em outro arquivo: busca `grep` só achou `pagehide` no PiP).
8. Service worker (`public/sw.js`, cache `vio-static-2.6.0`): ignora não-GET, `navigate`, outras origens, URLs com
   `?sala` e tudo fora de `/assets/*.{js,css,woff2?,png,svg}`, ícones e `/favicon.svg`. Socket, `/api`, sala e sessão
   nunca passam por ele; sem `skipWaiting` para não derrubar chamada. Registrado só em produção e fora do app desktop.

## Números

| Parâmetro | Valor | Onde |
| --- | --- | --- |
| Grace de reconexão | 90 s (10–300; env `RECONNECT_GRACE_SECONDS`) | `server/config.ts` › `grace` (~L167) |
| Prazo depois da despedida | 8 s (2–60; env `FAREWELL_SECONDS`), só com outra pessoa online | `server/config.ts` › `farewell` |
| Volta sozinho depois de recarregar | até 60 s depois do `pagehide` | `client/room/tab-room.ts` › `RESUME_WINDOW` |
| Conflito de sessão | 3 tentativas (1 s, 2 s, 4 s), depois "Entrar nesta aba" | `client/room/recovery.ts` › `conflictDelay` |
| `POST /api/leave` | 2 KB, 30/min por IP | `server/app.ts` |
| Varredura de membros offline | a cada 10 s, remove se `> grace` | `server/app.ts` (`cleanup`), `rooms.ts` › `clean` |
| engine.io ping do servidor | `pingInterval` 20000 ms, `pingTimeout` 20000 ms | `server/app.ts` (~L105) |
| Transporte | só `websocket` (cliente e servidor) | `controller.ts` ~L569, `app.ts` |
| Reconexão do Manager | 1000 ms → máx. 30000 ms, fator 0.4, tentativas `Infinity` | `controller.ts` ~L572 |
| Backoff próprio | `min(30000, 1000·2^min(5,n))·(0.8–1.2)`; 1ª ~1 s, 6ª em diante ~32 s→teto 30 s | `recovery.ts` › `recoveryDelay` |
| Atraso por limite de taxa | 60 s | `controller.ts` › `scheduleRecovery` |
| Heartbeat do cliente | 10 s (`ping`) | `controller.ts` ~L738 |
| `presence-probe` | timeout 3 s | `rooms.ts` › `probePing` |
| Sonda do socket preso em `SESSION_IN_USE` | 2 s; solta só com 12 s sem tráfego | `config.ts` › `holderProbe`, `holderQuiet`; `rooms.ts` › `holderGone` |
| Timeout de comando | 10 s (`request`); `leave` 1,5 s | `controller.ts` |
| TTL da sessão / renovação | 3600 s (300–86400); renova quando faltam < 300 s | `config.ts` › `sessionTtl`; `heartbeat` |
| Limites de taxa | `join` 12/min por id e 40/min por IP; `leave` 12/min; `ping` 30/min; `renew` 12/min; `/api/session` 30/min/IP; handshake 60/min/IP | `rooms.ts` › `rates`, `app.ts` |
| Sockets por IP | 20 (4–200) | `config.ts` › `maxSocketsPerIp` |
| Sala vazia some após | 300 s (10–3600) | `config.ts` › `roomTtl`, `clean` |
| Recentes | até 12 salas; nome ≤32; rótulo ≤40; código `^[A-Z0-9]{4,24}$` | `recent-rooms.ts` |
| Backoff das PeerConnections | `min(2000·2^n,30000)·(0.85–1.15)`, `attempts` ≤5 | `media/peers.ts` › `recover` |
| Timeout de `/api/config` e `/api/session` | 15 s | `controller.ts` |
| Fila de espera / recusa | 5 min / 60 s | `rooms.ts` (`WAIT_TTL`, `REFUSED_FOR`) |

## Peças e técnicas

| Peça/técnica | Para que | Onde |
| --- | --- | --- |
| Socket.IO (client/server) só com transporte WebSocket, sem long-polling | Sinalização e estado; evita sticky session do polling | `controller.ts`, `app.ts` |
| Reconexão nativa do Socket.IO Manager com backoff exponencial e jitter | Voltar sozinho após queda | `controller.ts` ~L568 |
| Segunda camada de recuperação (timer + `retry`) | Casos que o Manager não repete (middleware, join recusado, sessão nova) | `controller.ts`, `recovery.ts` |
| Token de sessão HMAC (`id`,`exp`) em `auth`, `timingSafeEqual` | Identidade estável sem conta | `server/security.ts`, `app.ts` `io.use` |
| `sessionStorage` por aba para o token | Recarga mantém identidade; aba nova = outra pessoa | `controller.ts` › `getSession` |
| `generation` + `joinAttempt` como guarda de corrida | Descartar respostas de sala/tentativa antigas | `controller.ts` |
| Ack com `socket.timeout(ms).emit` | Comandos com resposta e falha por tempo | `controller.ts` › `request`, `leave` |
| Grace period em memória + faxina periódica | Tolerar quedas curtas sem reentrar | `rooms.ts` › `clean` |
| `epoch` por processo | Detectar reinício do servidor | `rooms.ts`, `presence-cues.ts` |
| Probe de presença server→client com ack | RTT de cada participante | `rooms.ts` › `probePing` |
| `online`/`offline`/`visibilitychange` | Acelerar a volta e avisar | `controller.ts` ~L533 |
| `pagehide` + `socket.disconnect()`; `pageshow` persistido → `restored()` | Soltar o socket ao fechar; voltar do bfcache | `App.tsx` ~L184 |
| Service worker cache-first com lista de permissão | Só estáticos imutáveis | `public/sw.js` |
| `localStorage` p/ Recentes, nome, credenciais de criador | Dados só no aparelho | `recent-rooms.ts`, `controller.ts` |
| `crypto.randomUUID` com fallback | Chaves de nonce/subscrição | `id.ts` › `freshKey` |
| `Limits` (token bucket) por chave | Proteger join/ações/handshake | `server/security.ts` |

## Mercado (pesquisa nov 2026)

Comparado: como apps de presença e de chamada tratam saída, queda curta e volta de página
(Socket.IO, Ably, Page Lifecycle e bfcache do Chrome, `sendBeacon`).

| Método do mercado | Resolve | No VIO | Custo | Recomendação |
| --- | --- | --- | --- | --- |
| `pagehide` + `visibilitychange` (Page Lifecycle) | Saída confiável no celular e com bfcache, onde `beforeunload` falha | parcial: só `beforeunload` | código nosso | adotar |
| `navigator.sendBeacon` ou `fetch` com `keepalive` para um `POST /api/leave` | Avisar a saída mesmo com a página morrendo | não | código nosso | adotar (rota nova, com token e limite) |
| Saída imediata + tolerância curta a queda (Ably: ~15 s) | Quem sai some na hora; queda curta não pisca | parcial: tolerância única de 90 s | código nosso | adotar |
| Grace curto para saída explícita, longo para queda | Recarga mantém a identidade sem fantasma longo | parcial: 90 s para tudo | código nosso | adotar, junto com o beacon |
| `reason` do `disconnect` no servidor | Separar "saiu de propósito" de "caiu" | não | código nosso | depois, com cuidado: aba fechada pode chegar como `transport close`, igual a uma queda; o beacon é mais confiável |
| Connection State Recovery (Socket.IO) | Reentregar eventos perdidos numa queda curta | não | código nosso (config) | não vale: o VIO reenvia o snapshot inteiro e refaz a sinalização |
| Ping mais curto (ex.: 10 s + 10 s) | Detectar queda em ~20 s em vez de ~40 s | parcial: 20 s + 20 s | código nosso | depois: mais tráfego; medir no Render |
| `freeze`/`resume` + `pageshow` com `persisted` | Reconectar ao voltar do bfcache ou de aba congelada | não | código nosso | adotar |
| Página elegível ao bfcache | Voltar instantâneo | parcial: sem `unload`; o `beforeunload` sempre registrado pode tirar a página do bfcache em alguns navegadores (não confirmado) | código nosso | depois: vem quase de graça ao trocar `beforeunload` por `pagehide` |
| Recuo exponencial com variação (jitter) | Evitar avalanche de reconexão | sim: `recovery.ts` + Manager | — | manter; tirar o ouvinte morto (02.11) |
| Reentrada idempotente | Reconectar sem duplicar o membro | sim: `rejoin` com o mesmo token | — | manter |
| Contagem regressiva em "Reconectando" | Dizer quanto falta para alguém sair | parcial: estado sem prazo | código nosso | depois |
| `epoch` + credencial assinada | Detectar servidor reiniciado e refazer tudo | sim | — | manter |

**Fontes:** https://socket.io/docs/v4/server-api/#event-disconnect ·
https://developer.chrome.com/docs/web-platform/page-lifecycle-api ·
https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon ·
https://oneuptime.com/blog/post/2026-08-11-browser-beacons-navigation-reliability/view ·
https://ably.com/docs/presence-occupancy/presence ·
https://socket.io/docs/v4/connection-state-recovery · https://web.dev/articles/bfcache

## Achados

Os cinco primeiros explicam a #286 ("quem sai, troca ou entra e sai rápido continua como
reconectando"). Rastro: evento → servidor → interface.

| ID | Achado | Tipo | Confiança | Onde |
| --- | --- | --- | --- | --- |
| 02.1 | **Resolvido (#286): despedida da página, seção D2.** **Causa principal da #286.** Fechar a aba ou recarregar só chama `socket.disconnect()` no `beforeunload`, sem `leave`. O servidor trata todo `disconnect` como queda: marca `online=false` e mantém o membro por 90–100 s (grace + varredura `clean` a cada 10 s). Nesse tempo os outros veem "reconectando", não há som de saída, e telas e voz dele continuam listadas (publicações só caem em `leave`); quem assistia vê o chip "Reconectando" até `publication-ended`. O desenho existe porque a recarga precisa do grace para manter a identidade. | bug | alta | `App.tsx` (~L188); `rooms.ts` › `disconnect` (~L612), `clean` (~L498); `config.ts` (~L167) |
| 02.2 | **Resolvido (#286): despedida explícita quando o `leave` não sai.** `leave()` só envia `leave` se `socket.connected`. Reconectando, ou com o pacote perdido, sobra só `disconnect()`; o tempo limite de 1,5 s do ack também desconecta sem confirmação. Como a identidade é descartada na hora (`session` e `sessionStorage` limpos), ninguém reivindica o membro antigo: fica fantasma o grace inteiro. | bug | média | `controller.ts` › `leave` (~L1533–1543) |
| 02.3 | **Resolvido (#286): duas tentativas e "Entrar nesta aba".** Aba duplicada copia o `sessionStorage` e usa o mesmo token; o servidor responde `SESSION_IN_USE`, que não está entre os erros permanentes (`FORBIDDEN`, `INVALID_REQUEST`, `ROOM_FULL`). `rejoin` agenda `scheduleRecovery` sem fim, e a aba nova fica "reconectando" para sempre. | bug | alta | `recovery.ts` › `permanentRecoveryError`; `rooms.ts` › `join` (~L700) |
| 02.4 | **Em parte (#286): `join` de página nova solta as publicações da anterior; a reconexão da mesma página ainda herda.** As publicações do membro offline ficam no servidor e são herdadas pelo próximo `join` do mesmo id (`publications: member?.publications`). Depois de recarregar, o cliente novo não tem as capturas, mas as publicações antigas continuam (sem `unpublish`) até `leave` ou fim do grace; se ele volta a tempo, viram transmissões mortas. Não achei limpeza posterior. | bug | média | `rooms.ts` › `join` (~L762); `controller.ts` › `rejoin` |
| 02.5 | `presenceCues` ignora `online`: não há aviso quando alguém cai, e o som `room-leave` só toca no fim do grace (90–100 s depois de a pessoa fechar a aba). | lacuna | alta | `room/presence-cues.ts` |
| 02.6 | Pior caso do fantasma: queda real ≈ 40 s (ping do engine, 20 s + 20 s) + 90–100 s = 130–140 s; aba fechada ≈ 90–100 s. Quem fica vê "reconectando" sem prazo. | desempenho | alta | `app.ts` (~L105); `rooms.ts` › `clean` (~L498) |
| 02.7 | **Em parte (#286, #301): `pagehide` manda a despedida e `pageshow` persistido reentra com `page` nova (D2.10); `beforeunload` saiu; `visibilitychange` e bfcache sem teste em aparelho.** Sem `pagehide` nem `visibilitychange`: no celular e no Safari o `beforeunload` falha (bfcache, aba descartada) e o socket só morre por tempo de ping. | lacuna | média (não confirmado em aparelho) | `App.tsx` (~L188) |
| 02.8 | **Resolvido (#286): `leave` sem socket manda a despedida explícita; outra sala pede sessão nova.** Trocar de sala é `leave` + sessão nova: deixa fantasma na sala velha só nos casos de 02.2 (socket não conectado, ou `enter` durante `reconnecting`/`connecting`). Conectado, o caminho é limpo (`RoomSwitchLab` cobre o ack atrasado). | bug | média | `controller.ts` › `enter` (~L518); `tests/RoomSwitchLab.tsx` |
| 02.9 | Entrar e sair rápido está protegido por `generation`; não achei corrida determinística. Só sobra fantasma se o `leave` sair com o socket desconectado depois de o servidor criar o membro, ou se o `leave` se perder. O mais provável é cair em 02.1 (fechar a aba logo depois de entrar). | risco | baixa | `controller.ts` › `enter`, `rejoin`; `rooms.ts` (~L698–780) |
| 02.10 | **Resolvido (#286): `tests/farewell.test.ts` cobre prazo, grace e `clean`.** Nenhum teste cobre grace nem `clean` (busca por `grace` em `tests/` vazia); `epoch` só é provado em `recovery.test.ts`, que reinicia o servidor e confere id e contagem. | lacuna | alta | `tests/recovery.test.ts`; `tests/server.test.ts` |
| 02.11 | Dois níveis de reconexão (Manager do Socket.IO e `scheduleRecovery`) com atrasos diferentes; `reconnect_failed` nunca dispara (`reconnectionAttempts: Infinity`): ouvinte morto. | código morto | alta | `controller.ts` (~L572, ~L622, ~L744) |
| 02.12 | `leave()` é `async` e `enter` chama `void this.leave()` sem esperar. Seguro hoje porque o corpo é síncrono; quebra em silêncio se alguém acrescentar um `await`. | risco | baixa | `controller.ts` (~L518, ~L1514) |
| 02.13 | **Resolvido (#286): `docs/SEGURANCA.md` descreve a despedida e a rota.** `docs/SEGURANCA.md` descreve o grace de 90 s, mas não diz que fechar a aba também cai nele. | doc desatualizado | média | `docs/SEGURANCA.md` (~L85) |
| 02.14 | **Resolvido (#286).** Página nova da mesma aba indo para outra sala reusava a sessão do `sessionStorage` e batia em `ALREADY_JOINED` enquanto o membro antigo existia. Agora pede sessão nova quando a sala da aba (`vio:room`) é outra. | bug | alta | `controller.ts` › `enter`; `tab-room.ts` › `needsFreshSession` |

## Perguntas em aberto

- Ninguém mediu em navegador real o que Chrome e Safari entregam ao servidor com `beforeunload` +
  WebSocket (chega como `client namespace disconnect`?), nem o que acontece com aba congelada
  em segundo plano.
- Como separar fechar de recarregar? Os dois disparam `beforeunload`/`pagehide` e o mesmo
  `socket.disconnect()`. A pesquisa sugere grace curto para saída explícita e longo para queda;
  falta decisão (#286).
- A publicação herdada após recarga (02.4) é limpa por algum caminho não visto (ex.: `reconcile`
  do cliente)?
- Render Free dormindo: quanto o `connect_error` demora de fato, e se o aviso "serviço
  iniciando" aparece fora do `/api/config` (só visto em `initialize`).
