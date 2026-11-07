# 08 — Servidor, protocolo e segurança

> **Resumo:** Um único processo Node 24 (Express 5 + Socket.IO 4.8, só WebSocket) serve a SPA, três
> rotas de API, `/healthz` e o código-fonte AGPL. Toda ação do cliente entra por um evento `command`
> validado por zod `.strict()` e limitado por token bucket; o servidor só sinaliza, nunca leva mídia.
>
> **Arquivos-chave:** `src/server/index.ts` (boot e desligamento), `app.ts` (Express, Helmet, Socket.IO,
> rotas), `config.ts` (`readConfig`), `security.ts` (`Fault`, `Limits`, tokens, `log`), `rooms.ts`
> (despacho de comandos), `src/shared/protocol.ts` e `widgets.ts` (schemas), `scripts/build.mjs`
> (gera `dist/source.tar.gz`).
>
> **Docs:** `docs/SEGURANCA.md`, `docs/DEPLOY.md`, `docs/TURN.md`, `.env.example`, `render.yaml`.
> Conexão/reconexão do socket: outro tema.
>
> **Retrato:** commit `8bdc516` (5 nov 2026). Mudou o que esta ficha descreve? Atualize-a no mesmo PR.

## Como funciona hoje

1. `index.ts`: `readConfig` (aceita `--port N`), `createApp(config, --dev)`, `listen(port, "0.0.0.0")`,
   loga `listening`. `SIGINT`/`SIGTERM`: loga `shutdown`, `close()` (emite `server-restarting`, fecha
   Vite/io/http), `exit(0)`; se travar, `exit(1)` após 25 s.
2. `app.ts` › `createApp`: `x-powered-by` desligado; `trust proxy` = `config.trustProxy`; Helmet; cabeçalhos
   extras; CORS só em `/api`; rotas; Socket.IO; varredura `setInterval` de 10 s (`rooms.clean`,
   `limits.clean`, `unref`).
3. Dev (`--dev`): CSP desligada, Vite em modo middleware (HMR no mesmo servidor). Produção: serve
   `dist/client`, `/sw.js` (`no-cache`, `Service-Worker-Allowed: /`), `/source.tar.gz`, estáticos e
   fallback SPA.
4. Socket.IO: `allowRequest` (origem + 60 handshakes/min/IP + teto de sockets por IP) e `io.use`
   (`verifyToken`, ver tema 01). Eventos do cliente: `command` (com ack obrigatório) e `signal`.
5. `command` (`rooms.ts` › `bind`): ack é função? → sessão não expirou → `commandSchema` → limite da
   ação (`socket.data.id:ação`, 60 s) → (se `join`) limite por IP → schema da ação → `Rooms.command`. Falha
   que não é `Fault` vira `INVALID_REQUEST` ("Pedido inválido ou fora dos limites."). Resposta:
   `Reply = {ok:true,data} | {ok:false,code,message}`.
6. `Fault(code, message)` (`security.ts`): mensagem em português, nunca stack. Códigos vistos no servidor:
   `ORIGIN`, `RATE_LIMIT`, `CONNECTION_LIMIT`, `SESSION_EXPIRED`, `INVALID_REQUEST`, `NOT_JOINED`,
   `ALREADY_JOINED`, `SESSION_IN_USE`, `CAPACITY`, `FORBIDDEN`, `NOT_FOUND`, `WAITING`, `WAITING_FULL`,
   `ENTRY_REFUSED`, `VOICE_BLOCKED`, `SCREEN_LIMIT`, `PREVIEW_LIMIT`, `WIDGET_LIMIT`, `TURN_UNAVAILABLE`.
7. `signal`: 600/min por identidade; `signalSchema`; destinatário deduzido da assinatura (nunca de id
   enviado); offer só do dono da publicação, answer e `restart` só de quem assiste.

## Rotas HTTP

| Rota | Resposta | Onde |
| --- | --- | --- |
| `GET /healthz` | `{ok:true, version}` (health check do Render) | `app.ts` ~L71 |
| `GET /api/config` | `{signalingUrl, socketPath, maxParticipants:null, recommendedParticipants, maxPreviews, testLab}` | ~L72 |
| `POST /api/session` | Token `{token,id,expiresAt}`; exige `Origin` permitida (web ou app) senão 403; 30/min/IP (429) | ~L82 |
| `POST /api/leave` | Despedida da página (#286): `text/plain` ≤ 2 KB, `farewellSchema` `{token, page, explicit?}`; exige `Origin` permitida (403), 30/min/IP (429), token HMAC válido (403); 204 sem corpo. Erros em JSON sem stack (413/400) | `app.ts` |
| `/api/*` (todas) | `Cache-Control: no-store`; CORS só devolve `Access-Control-Allow-Origin` para origem permitida (`Vary: Origin`) | ~L53 |
| `GET /sw.js` (prod) | arquivo do cliente, `no-cache` | ~L164 |
| `GET /source.tar.gz` (prod) | download `vio-<versão>-source.tar.gz` (AGPL), 404 com texto se não houver build | ~L169 |
| `GET /{*path}` (prod) | `index.html` (SPA) | ~L179 |
| `/socket.io` (configurável) | Socket.IO, só WebSocket | `config.socketPath` |

## Números

| Parâmetro | Valor | Onde |
| --- | --- | --- |
| `maxHttpBufferSize` | 65536 (64 KiB) | `app.ts` Socket.IO |
| `transports` | `["websocket"]` (sem long-polling) | idem |
| `pingInterval` / `pingTimeout` | 20000 / 20000 ms | idem |
| `serveClient` | false | idem |
| Varredura | 10 s | `app.ts` |
| Parada forçada | 25 s | `index.ts` |
| Limite sessão / handshake / join-IP | 30 / 60 / 40 por min por IP | `app.ts`, `rooms.ts` |
| Sockets por IP | 20 (4–200) | `MAX_SOCKETS_PER_IP` |
| Limite por ação (por min, burst) | role 20, moderate 30, admit 120, invite-create 20, invite-revoke 10, room-permissions 30, chat-send 45, module-interact 240 (burst 60), widget-permission 30, widget-create 20, widget-structure 120 (40), widget-delete 30, widget-restore 30, widget-operate 300 (60), demand 360, join 12, leave 12, call 30, color 20, publish 30, unpublish 30, state 100, subscribe 180, unsubscribe 180, ping 30, ice 12, renew 12; `signal` 600 | `rooms.ts` › `bind` |
| Limites TURN | `ice` 12/min; credencial Cloudflare guardada até faltar 60 s; chamada com timeout 8 s | `rooms.ts` |
| Widgets | 32 por sala, 6 por criador, 4 chats; 6 blocos por widget | `widgets.ts`, `shared/widgets.ts` |
| Chat | 100 mensagens / 32000 caracteres por sala; texto ≤ 2000 | `chatBudget` |
| Teto de payload de texto | SDP ≤ 60000; candidate ≤ 4096; `id` ≤ 80; `round` ≤ 10000 | `signalSchema` |
| Prévias por pessoa | 2 | `maxPreviews` |

### Variáveis de ambiente (`readConfig`)

| Variável | Padrão | Limites / regra |
| --- | --- | --- |
| `NODE_ENV` | — | `production` liga as travas abaixo |
| `PORT` | 3000 | inteiro 0–65535 |
| `SESSION_SECRET` | aleatório (dev) | ≥ 32 caracteres; em produção é obrigatório |
| `ALLOWED_ORIGINS` | `http://localhost:PORT,http://127.0.0.1:PORT` (dev) | em produção só `https://`; `null` e vazio recusados |
| `RENDER_EXTERNAL_URL` | — | origem acrescentada automaticamente |
| `ALLOWED_APP_ORIGINS` | vazio | só casca nativa (`tauri://`, `capacitor://`); http(s) só em `localhost`/`*.localhost`; sem caminho; `*` e `null` recusados |
| `TRUST_PROXY` | `false` | número de saltos 0–5 ou CIDRs; `true` recusado |
| `SESSION_TTL_SECONDS` | 3600 | 300–86400 |
| `RECONNECT_GRACE_SECONDS` | 90 | 10–300 |
| `FAREWELL_SECONDS` | 8 | 2–60; prazo depois da despedida, só com outra pessoa online |
| `ROOM_TTL_SECONDS` | 300 | 10–3600 |
| `MAX_ROOMS` | 200 | 1–10000 |
| `MAX_SOCKETS_PER_IP` | 20 | 4–200 |
| `SOCKET_PATH` | `/socket.io` | — |
| `SIGNALING_URL` | vazio (mesma origem) | — |
| `STUN_URLS` | `stun:stun.l.google.com:19302` | lista por vírgula |
| `TURN_URLS`, `TURN_SECRET`, `TURN_USERNAME`, `TURN_PASSWORD`, `TURN_TTL_SECONDS` (600; 60–3600), `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN` | vazio | um caminho só (`docs/TURN.md`); `TURN_SECRET` ≥ 32; URLs `turn:`/`turns:` |
| `WEB_CONCURRENCY` | — | qualquer valor ≠ "1" recusa subir |
| `ENABLE_TEST_LAB` | 0 | `1` em produção recusa subir |
| Fixos (sem variável) | `recommendedParticipants` 6, `maxPreviews` 2 | `MAX_PARTICIPANTS` legado ignorado |

## Cabeçalhos e CSP (`app.ts`)

- Helmet 8 com padrões, mais CSP em produção: `default-src 'self'`; `script-src 'self'`;
  `style-src 'self' 'unsafe-inline'`; `font-src 'self'`; `img-src 'self' data:`; `connect-src 'self'` +
  `ALLOWED_ORIGINS` + as mesmas em `ws(s)://`; `media-src 'self' blob:`; `object-src 'none'`;
  `frame-ancestors 'none'`; `upgrade-insecure-requests` só em produção. `crossOriginEmbedderPolicy`
  desligado; HSTS só em produção.
- `Permissions-Policy: camera=(self), microphone=(self), display-capture=(self), fullscreen=(self), speaker-selection=(self)`; `Referrer-Policy: no-referrer`.
- `trust proxy` é `0–5` saltos ou lista CIDR (`proxy-addr`); o IP real vem de `proxyaddr(req, trust)`
  tanto no handshake quanto no `io.use`. Render usa `TRUST_PROXY=1`.

## Protocolo (`shared/protocol.ts`, `shared/widgets.ts`)

- **Cliente → servidor:** `command {action, data}` (ack) e `signal`. As 27 ações:
  sala `join leave call color role moderate room-permissions admit invite-create invite-revoke`;
  mídia `publish unpublish state subscribe unsubscribe demand ice`; sessão `ping renew`; widgets
  `widget-create widget-structure widget-operate widget-delete widget-restore widget-permission module-interact chat-send`. Todos `.strict()`; ids são `uuid`; `publicationId`/`id` ≤ 80; `label`
  1–64; `chat-send` texto 1–2000.
- **Servidor → cliente:** `snapshot`, `widget-updated`, `chat-message`, `screen-viewers`,
  `publication-ended`, `subscription`, `subscription-ended`, `signal`, `video-demand`, `room-credential`,
  `waiting`, `waiting-list`, `admission`, `presence-probe` (ack, 3 s), `participant-ping`,
  `server-restarting`.
- `Snapshot`: `epoch, code, createdAt, serverTime, participants, widgets?, notices?, creatorId, permissions, screenViewers, maxParticipants:null, recommendedParticipants`.
- Mensagens de erro vão para o usuário em português; a UI mapeia `code`.

## Logs (`security.ts` › `log`)

JSON em stdout, uma linha: `{time, event, ...detalhe}`, detalhe só `string|number|boolean`. Eventos hoje:
`listening{port}`, `shutdown`, `cloudflare_turn_unreachable{error}`, `cloudflare_turn_error{status}`,
`cloudflare_turn_bad_response`. **Nunca** vão: nome, código de sala, token, credencial, convite, SDP, IP.
Nenhum log por comando ou conexão.

## Peças e técnicas

| Peça/técnica | Para que | Onde |
| --- | --- | --- |
| Express 5.1 | HTTP e estáticos | `app.ts` |
| Socket.IO 4.8 (só WebSocket, `allowRequest`, `io.use`) | Sinalização e comandos | `app.ts` |
| Helmet 8 + CSP própria | Cabeçalhos de segurança | `app.ts` |
| `proxy-addr` 2.0.8 | IP real atrás do proxy | `app.ts` |
| Zod 4.6 `.strict()` | Validação de entrada | `protocol.ts` |
| Token bucket `Limits` (burst + reposição contínua, `clean`) | Rate limit por chave | `security.ts` |
| HMAC + `timingSafeEqual` | Tokens | `security.ts` |
| `vite` em middleware (dev) | HMR no mesmo servidor | `app.ts` |
| `res.download` | Entrega do AGPL | `app.ts` |
| `fetch` + `AbortSignal.timeout(8000)` | Credenciais TURN da Cloudflare | `rooms.ts` |
| Config que recusa subir | Segurança por falha rápida | `config.ts` |

## Mercado (pesquisa nov 2026)

Comparado: proteção do servidor, cuidado com dependências e escala contra o que guias de
segurança de Node e de varredura de dependências recomendam em 2026.

| Método do mercado | Resolve | No VIO | Custo | Recomendação |
| --- | --- | --- | --- | --- |
| Helmet + CSP + `trust proxy` explícito + limites por chave + zod `.strict()` | Base de segurança de um servidor Node exposto | sim | — | manter; CSP com nonce ou hash (para tirar `'unsafe-inline'`) não foi pesquisada |
| Varredura de dependências na CI (`npm audit`, Dependabot, OSV-Scanner) | Saber de dependência vulnerável sem olhar à mão | parcial: `npm audit --omit=dev --audit-level=high` na CI; sem Dependabot nem OSV-Scanner | código nosso (config) | adotar |
| SBOM (CycloneDX) | Lista formal do que vai no build | não | código nosso | depois |
| Estado compartilhado em Redis ou Valkey | Mais de uma instância do servidor | não: uma instância só (08.7) | dependência nova / pago | depois |

**Fontes:** https://oneuptime.com/blog/post/2026-01-30-dependency-scanning-integration/view ·
Helmet, CSP, SBOM e Redis: conhecimento geral.

## Achados

| ID | Achado | Tipo | Confiança | Onde |
| --- | --- | --- | --- | --- |
| 08.1 | A contagem de sockets por IP só sobe no evento `connection`, mas o teto é conferido antes, no `allowRequest` (~L117) e no middleware (~L129). Handshakes simultâneos do mesmo IP podem passar do teto antes de a contagem subir; o limite de 60 handshakes por IP freia. | risco | baixa | `app.ts` (~L112–140) |
| 08.2 | `/api/session` responde 403 para todo erro que não seja `RATE_LIMIT`. Hoje só há dois erros esperados (origem, 403; limite, 429), mas uma falha interna também sairia como 403, com o `e.message` cru na resposta. | risco | alta | `app.ts` (~L82–91) |
| 08.3 | O fallback da SPA (`/{*path}`) responde `index.html` com 200 para qualquer `/api/…` desconhecido e para arquivo que falta (`.map`, pedaço de um build antigo): sem 404, um pedido errado parece dar certo. | lacuna | alta | `app.ts` (~L179) |
| 08.4 | `style-src 'unsafe-inline'` na CSP; o motivo não está escrito. | risco | média | `app.ts` (~L27) |
| 08.5 | `docs/SEGURANCA.md` diz que os logs só registram início e encerramento; o servidor também registra falhas do TURN da Cloudflare (`cloudflare_turn_unreachable`, `cloudflare_turn_error`, `cloudflare_turn_bad_response`). | doc desatualizado | alta | `docs/SEGURANCA.md` (~L43–46); `rooms.ts` (~L167–186) |
| 08.6 | O log `cloudflare_turn_unreachable` leva o `e.message` do erro de rede. Hoje sem dado pessoal, mas o texto vem de fora. | risco | média | `rooms.ts` (~L167) |
| 08.7 | Uma instância só: o estado vive em memória e `readConfig` recusa `WEB_CONCURRENCY` diferente de 1. Sem escala horizontal. | lacuna | alta | `config.ts` (~L153) |
| 08.8 | A origem é conferida só pelo cabeçalho `Origin`, que um cliente fora do navegador forja; a defesa real é o token e os limites. Aceito. | risco | alta | `app.ts` › `origemPermitida` |
| 08.9 | `connect-src` não inclui `ALLOWED_APP_ORIGINS`; deve bastar, porque o app nativo tem CSP própria. | lacuna | baixa (não confirmado) | `app.ts` (~L30–34) |

Conferido e **ok**: os 27 limites de ação ficam num `Record<Action, number>` (`rooms.ts` ›
`bind`), então ação nova sem limite não compila; `RENDER_EXTERNAL_URL` entra nas origens sem
exigir HTTPS fora de produção e, em produção, passa pela regra de HTTPS (`config.ts` ~L55).

## Perguntas em aberto

- Por que `style-src 'unsafe-inline'` continua: estilo dinâmico do React ou de alguma biblioteca?
- `/api/*` desconhecido deveria responder 404 em JSON?
- O app Tauri precisa de algo em `connect-src` no servidor, ou só na própria casca?
