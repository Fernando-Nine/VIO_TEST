# 01 — Salas, identidade e presença

> **Resumo:** Uma sala é um objeto em memória (`Room`) criado no primeiro `join` com um código
> (aleatório de 64 bits ou escolhido). A pessoa é identificada por um id de sessão assinado com HMAC
> (token de 1 h, renovável), nunca pelo `socket.id`. O cargo de criador sobrevive a reinício do
> servidor por uma credencial assinada guardada no navegador. Sala trancada manda quem é novo para
> uma "porta" (sala de espera); convite assinado entra direto. Nada é gravado em disco.
>
> **Arquivos-chave:** `src/server/rooms.ts` (classe `Rooms`: join, cargos, porta, convite, limpeza),
> `src/server/security.ts` (token, credencial, convite, `Limits`, `generateCode`),
> `src/server/config.ts` (TTLs e limites), `src/shared/permissions.ts` (regras de cargo, puras),
> `src/shared/protocol.ts` (schemas `join`, `admit`, `invite-*`, `role`, `moderate`,
> `room-permissions`; tipos `Snapshot`, `Participant`), `src/client/room/controller.ts`
> (`rejoin`, credencial, porta), `src/client/components/RoomLock.tsx` (painel de entrada),
> `Door.tsx` (tela de espera), `src/client/room/invite-text.ts` (validade), `src/client/endpoint.ts`
> (`invite()`).
>
> **Docs:** `docs/SEGURANCA.md`, `docs/notas/backend.md` (#226, #242, #71, #122),
> `docs/decisoes/010-participantes-e-p2p.md`, `docs/decisoes/009-contas-e-banco-adiados.md`.
> Ciclo de conexão/reconexão do socket: outro tema (aqui só se aponta).
>
> **Retrato:** commit `8bdc516` (5 nov 2026). Mudou o que esta ficha descreve? Atualize-a no mesmo PR.

## Como funciona hoje

### Identidade

1. `POST /api/session` (`app.ts`) emite `issueToken(secret, sessionTtl)` (`security.ts` › `issueToken`):
   corpo `{id: randomUUID, exp}` em base64url + "." + HMAC-SHA256 do corpo. Sem prefixo de finalidade
   (credencial e convite usam prefixo `room.`/`invite.`, então nunca valem como sessão).
2. No handshake, `io.use` (`app.ts`) chama `verifyToken`: limite de 600 caracteres, exatamente duas
   partes, `timingSafeEqual` (compara tamanhos antes), `id` com 36 caracteres hex/hífen e `exp` no
   futuro. Falha vira `Fault("SESSION_EXPIRED")`. O id vai para `socket.data.id`; `socket.data.expires`
   guarda o `exp`.
3. A cada `command`, `rooms.ts` › `bind` confere `socket.data.expires < Date.now()` →
   `SESSION_EXPIRED`. O cliente pede `renew` (12/min), que reemite o token **com o mesmo id** e
   estende `expires`.
4. O cliente guarda a sessão em `sessionStorage["vio:session"]` (uma por aba) e as credenciais em
   `localStorage["vio:room-credentials"]` (`controller.ts` › `getSession`, `storeCredential`).
   Consequência: cada aba é uma identidade; saída explícita gera sessão nova (SEGURANCA.md).
5. `stableId(secret, valor)` (HMAC, 32 caracteres base64url) gera ids de publicação e assinatura; não
   é identidade de pessoa.

### Criar e entrar numa sala (`rooms.ts` › `command`, ramo `join`, ~L659)

1. `join` (schema em `protocol.ts`, `.strict()`): `name` 1–32 sem caracteres de controle/formatação;
   `code` opcional (`roomCode`: trim, maiúsculas, `[A-Z0-9]{4,24}`); `color` `#RRGGBB`; `credential`
   ≤ 2048; `invite` ≤ 512.
2. Sem `code` e sem sala atual: `generateCode()` = 8 bytes aleatórios em hex maiúsculo (16
   caracteres, 64 bits). Com `code` ou já em uma sala: `recreated = true`.
3. Já em outra sala (`membership`) com código diferente → `ALREADY_JOINED`.
4. Sala inexistente: se `rooms.size >= maxRooms` (200) → `CAPACITY`; senão cria `Room` com
   `creatorId = quem chegou`, permissões padrão, `inviteGen` novo. `creatorRank = recreated ? -1 : Date.now()`; `provisional = fresh = recreated`. Ou seja: **qualquer código bem formado cria sala**;
   quem chega primeiro a um código "conhecido" é criador provisório.
5. Mesma sessão já online em outro socket da sala → `SESSION_IN_USE`.
6. Credencial: `verifyRoomCredential` (ver "Credencial"). Sala trancada, não vazia, quem entra não é
   membro e não trouxe credencial válida: confere convite; se não for conhecido (`room.known`), nem
   admin restaurado, nem convite válido e não revogado → `knock` (porta).
7. Sala vazia: quem entra vira `creatorId`. Se a credencial vence a disputa (`reclaim`), assume o
   cargo, restaura permissões (se `fresh`), admins da credencial e rebaixa o criador provisório
   anterior (`previous`) com `room-credential: null` para ele.
8. Cria/atualiza `Member` (`role`, `color` mantida se já era membro, `online: true`, `lastSeen`),
   registra em `membership`, chama `remember` (entra em `known`), `socket.join(code)`, faz `broadcast`
   (snapshot individual por membro, widgets só para quem entrou) e devolve `JoinResult {id, snapshot, credential?}` (credencial só ao criador).
9. Erros do `join` chegam no ack como `{ok:false, code, message}`. Falha de schema ou limite vira
   `INVALID_REQUEST` ("Pedido inválido ou fora dos limites.") ou `RATE_LIMIT`.

### Membros, presença e fim da sala

1. `Member` (interno) = `Participant` + `socketId` + `lastSeen`. O snapshot remove `socketId` e
   `lastSeen`: **o cliente vê só `online`**, nunca "visto por último" (`snapshot()`, ~L212).
2. `disconnect` (~L612): se o socket é o do membro, `online=false`, `socketId=undefined`,
   `lastSeen=now`, `broadcast`. Não remove da sala.
3. `clean()` roda a cada 10 s (`app.ts`, `setInterval`): remove recusas vencidas, expira esperas
   (5 min, `admission` "Ninguém respondeu a tempo"), faz `leave` de quem está offline há mais que
   `grace` (90 s), apaga a sala vazia após `roomTtl` (300 s sem `touched`). O atraso real de remoção é
   `grace` + até 10 s.
4. `leave(room, member, explicit)`: encerra publicações e assinaturas, apaga o membro, `forget` nos
   widgets, `membership.delete`. Último a sair: limpa widgets e avisos, zera permissões (volta ao padrão
   **inclusive destrancada**), `creatorRank=-1`, `provisional=fresh=true`, esvazia `restoredAdmins` e
   dispensa a fila de espera ("Todos saíram da sala").
5. Criador saiu e restam pessoas: sucessor = admin online > qualquer online > admin offline > primeiro.
   Saída explícita (`leave` pelo usuário) e criador não provisório → `creatorRank = Date.now()`
   (transferência definitiva); queda por tempo → `provisional=true` (empréstimo; aviso "até X voltar").
6. `epoch`: `Rooms.epoch = randomUUID()` por processo, enviado em todo `Snapshot`. Mudou = servidor
   reiniciou; o cliente refaz tudo (`controller.ts` › `receiveSnapshot` compara `previous.epoch`).
7. Reinício do servidor apaga todas as salas (estado em memória). Daí a credencial (abaixo).

### Credencial de cargo da sala (#226)

1. `issueRoomCredential` (`security.ts`): corpo `{code, rank, admins[≤16], permissions, exp}` assinado
   com prefixo `room.`; `exp = now + 30 dias` (`CREDENTIAL_TTL`).
2. `verifyRoomCredential`: máx. 2048 caracteres, `timingSafeEqual`, schema `.strict()`, código igual
   ao da sala, não expirada. Devolve `null` em qualquer falha (sem distinguir motivo).
3. Emissão: no `join` do criador, e `room-credential` (evento) após `room-permissions`, `role` e
   sucessão. `rank` provisório é assinado como 0.
4. Vence a disputa quem tem `rank` maior que `room.creatorRank`, ou `>=` se o criador atual é
   provisório. Transferência (`role: transfer`) e saída explícita dão rank novo; a credencial antiga
   perde. Queda por tempo não invalida.
5. Admins nomeados na credencial ficam em `restoredAdmins` até voltarem; a credencial carrega no
   máximo 16 (`CREDENTIAL_ADMINS`), os mais recentes.
6. Cliente: guarda até 20 salas (`slice(-20)`), reapresenta no `join`; `room-credential` com `null` =
   esquecer.

### Cargos e permissões (`permissions.ts`, `protocol.ts`)

1. Cargos: `creator`, `admin`, `guest` (`roomRole`/`role()`); só o criador promove/rebaixa/transfere
   (`role`: `promote|revoke|transfer`, 20/min) e silencia voz (`moderate`, só `voice`, não vale para o
   criador).
2. `RoomPermissions` (`.strict()`): `guestControl`, `guestEdit`, `guestCreate`, `guestChat`,
   `guestScreen`, `guestVoice`, `guestCamera`, `adminCreate`, `adminClose`, `locked?`.
   Padrão (`defaultPermissions`): chat, tela e voz ligados; controle, edição, criação e câmera
   desligados; `adminCreate` e `adminClose` ligados; `locked` ausente (de propósito, para não virar
   interruptor e manter credenciais antigas válidas).
3. `roleAllows`: criador sempre; chave `admin*` só para admin e se ligada; demais chaves: admin sempre,
   convidado se ligada. `canSetPermission`: criador muda tudo; admin só chaves `guest*` e `locked`.
4. `canUseWidget`: permissão da sala **ou** `allGuestsEdit` **ou** estar em `guestEditors` do widget.
5. `room-permissions` (30/min): exige gerente (`creator`/`admin`); mescla; se `locked` ficou falso →
   `admitAll`; `enforcePublications` encerra publicações que o cargo não pode mais; reemite credencial;
   `broadcast`.
6. Cada ação do servidor confere permissão do chamador (`require`, `useWidget`, `deny`); a recusa
   cita o texto de `permissionText` ("A sala não permite que convidados possam …").

### Sala trancada e porta (#242)

1. Gerente liga `locked` (`RoomLock.tsx` › `EntryPanel`, interruptor "Sala trancada").
2. Quem entra e não é conhecido: `knock` (`rooms.ts` ~L398). Recusado há < 60 s → `ENTRY_REFUSED`.
   Primeira batida: limites `pessoa+sala` 5 por 10 min e IP 20 por 10 min; fila cheia (20) →
   `WAITING_FULL`. Cria `Waiting {id: randomUUID (id do pedido, não da pessoa), name, color, since, expiresAt = +5 min}`. Mesma pessoa batendo de novo mantém o lugar (aba antiga recebe
   `admission {allowed:false, "Você está esperando em outra aba."}`).
3. O servidor responde `Fault WAITING` ao `join`, emite `waiting {expiresAt}` ao candidato e
   `waiting-list` aos gerentes (campos visíveis: `id, name, color, since, expiresAt`).
4. `admit {id, allow}` (120/min, só gerente): aceitar → `remember` + `admission {allowed:true}` (o
   cliente refaz `join`); recusar → `refused` por 60 s + `admission {allowed:false}`.
5. Candidato desconectado ou `leave` durante a espera: `stopWaiting`. Quem perde o cargo recebe
   `waiting-list` vazio (`emitWaiting(room, true)` após `role`).
6. Cliente: `Door.tsx` mostra 3 estados (esperando, convite expirado, recusado/fila cheia).
   `inviteExpired` (`controller.ts` ~L76) lê o `exp` do convite sem validar assinatura; convite vencido
   que só bate na porta mostra "Esse convite expirou." em vez de esperar. Gerentes ouvem o som `knock`
   quando surge pedido novo.
7. "Conhecido" = `room.known` (ids de sessão que já foram membros, máx. 500, os mais antigos saem) +
   `restoredAdmins`. Destrancar libera todos da fila.

### Convite (#242)

1. `invite-create {ttl: "1h"|"1d"|"7d"}` (20/min, só gerente) → `{invite, expiresAt}`; corpo `{code, gen, exp}` assinado com `invite.`, máx. 512 caracteres.
2. Link: `invite(code, token)` (`endpoint.ts`) → `?sala=CÓDIGO&convite=TOKEN`; `webBase` garante URL
   web mesmo dentro do app nativo. Cliente lê `convite` em `App.tsx` ~L106 e `recent-rooms.ts` ~L117.
3. Servidor aceita o convite se a assinatura, o código e a validade batem e `gen` **não** está em
   `revokedInvites`. Não compara com `room.inviteGen` atual.
4. `invite-revoke` (10/min, só gerente): põe a geração atual em `revokedInvites` e cria outra. **Só em
   memória**: após reinício (ou sala apagada por `roomTtl`) convites revogados voltam a valer até vencer.
5. UI: três validades (padrão "1 dia", salvo em `localStorage["vio:invite-ttl"]`), caixa "Entra direto,
   mesmo trancada" (sem ela copia só o link do código), confirmação em dois cliques para revogar (volta
   após 3 s).

### Expulsão

**Não existe** comando de expulsar (`kick`/`ban`). O mais próximo: recusar na porta, `moderate`
(silenciar voz) e trancar a sala. SEGURANCA.md confirma ("Não há um moderador que possa expulsar
terceiros").

### Limite de participantes

Sem teto (`maxParticipants: null` em snapshot e `/api/config`). `recommendedParticipants` = 6 fixo
em `readConfig`, sem variável de ambiente (`MAX_PARTICIPANTS` legado é ignorado; teste em
`tests/server.test.ts` ~L30). Decisão: `docs/decisoes/010`. Aviso de carga na interface: não achei
(ver Achados).

## Números

| Parâmetro | Valor | Onde |
| --- | --- | --- |
| Validade do token de sessão | 3600 s (300–86400) | `config.ts` › `SESSION_TTL_SECONDS` |
| Tolerância offline (grace) | 90 s (10–300) | `RECONNECT_GRACE_SECONDS` |
| Sala vazia vive | 300 s (10–3600) | `ROOM_TTL_SECONDS` |
| Máx. de salas | 200 (1–10000) | `MAX_ROOMS` |
| Participantes recomendados | 6 (fixo; sem teto) | `config.ts` |
| Varredura de limpeza | 10 s | `app.ts` › `setInterval` |
| Código gerado | 16 hex maiúsculos (64 bits) | `security.ts` › `generateCode` |
| Código aceito | 4–24 `[A-Z0-9]` | `protocol.ts` › `roomCode` |
| Nome | 1–32, sem controle/formatação | `protocol.ts` › `join` |
| Token máx. | 600 caracteres | `security.ts` › `verifyToken` |
| Credencial: validade / tamanho / admins | 30 dias / 2048 / 16 | `rooms.ts` `CREDENTIAL_TTL`; `security.ts` |
| Credenciais guardadas no cliente | 20 salas | `controller.ts` › `storeCredential` |
| Convite: validade / tamanho | 1 h, 1 d, 7 d / 512 | `rooms.ts` `inviteTtl`; `security.ts` |
| Espera na porta | 5 min | `rooms.ts` `WAIT_TTL` |
| Fila de espera | 20 | `MAX_WAITING` |
| Recusado espera | 60 s | `REFUSED_FOR` |
| Conhecidos por sala | 500 | `MAX_KNOWN` |
| Bater na porta | 5/10 min por pessoa+sala; 20/10 min por IP | `knock` |
| Limites por pessoa/min | join 12, leave 12, role 20, moderate 30, admit 120, invite-create 20, invite-revoke 10, room-permissions 30, renew 12, ice 12 | `bind` › `rates` |
| `join` por IP | 40/min; `/api/session` 30/min; handshake 60/min | `bind`; `app.ts` |
| Sockets simultâneos por IP | 20 (4–200) | `MAX_SOCKETS_PER_IP` |
| Notas de aviso por sala | 30 | `rooms.ts` › `notice` |
| Telas por pessoa | 3 | `protocol.ts` › `MAX_SCREENS` |

## Peças e técnicas

| Peça/técnica | Para que | Onde |
| --- | --- | --- |
| HMAC-SHA256 (`node:crypto` `createHmac`) | Token de sessão, credencial, convite | `security.ts` |
| `timingSafeEqual` | Comparar assinaturas sem vazar tempo | `verifyToken`, `verifySigned` |
| Prefixo de finalidade (`room.`, `invite.`) | Um tipo de token nunca vale como outro | `sign`, `verifySigned` |
| Token "portador" sem banco | Cargo de criador sobrevive a reinício | `issueRoomCredential` |
| Zod 4 `.strict()` | Validar payloads e corpos assinados | `protocol.ts`, `security.ts` |
| Token bucket (`Limits`) | Rate limit por chave com rajada | `security.ts` |
| `crypto.randomUUID` / `randomBytes` | Ids, códigos, geração de convite | `rooms.ts`, `security.ts` |
| `Map`/`Set` em memória | Salas, membros, conhecidos, fila, revogados | `rooms.ts` (sem persistência) |
| `sessionStorage` / `localStorage` | Sessão por aba; credenciais, validade do convite | `controller.ts`, `invite-text.ts` |
| Socket.IO rooms (`socket.join(code)`) | Difusão por sala | `rooms.ts` |
| Snapshot completo por membro | Estado de sala/participantes (widgets só no join) | `rooms.ts` › `broadcast` |
| `AnchoredPopover` + armadilha de foco | Painel de entrada acessível | `RoomLock.tsx` |
| `navigator.clipboard.writeText` | Copiar convite | `RoomLock.tsx` |
| `toLocaleTimeString("pt-BR")` | "Vale até amanhã, 21:40." | `invite-text.ts` |

## Mercado (pesquisa nov 2026)

Comparado: identidade sem conta, presença e estado de sala do VIO contra serviços de presença
(Ably, Liveblocks, PartyKit, Phoenix) e padrões do próprio navegador.

| Método do mercado | Resolve | No VIO | Custo | Recomendação |
| --- | --- | --- | --- | --- |
| Token assinado (HMAC) sem banco | Identidade estável sem conta nem banco | sim: sessão de 1 h renovada; credencial de sala de 30 dias | código nosso | manter |
| Saída imediata + tolerância curta a queda (Ably: ~15 s) | Quem sai some na hora; queda curta não vira saída | parcial: só a tolerância, de 90 s, e fechar a aba conta como queda | código nosso | adotar, pela [02](02-conexao-e-reconexao.md) |
| Aba duplicada detectada no cliente (`BroadcastChannel` ou Web Locks) | A segunda aba não disputa a mesma sessão | não: o servidor responde `SESSION_IN_USE` e a aba nova fica presa (02.3) | código nosso | adotar |
| Aviso de carga da malha (fornecedores: malha pura deixa de ser prática acima de 4–5 pessoas com vídeo) | Avisar antes de a sala pesar | parcial: `recommendedParticipants` chega ao cliente, mas nenhuma tela o mostra (01.4) | código nosso | adotar |
| Estado durável (Redis/Valkey ou SQLite) | Sobreviver a reinício; permitir mais de uma instância | não: tudo em memória | dependência nova / pago | depois: quando houver contas ou mais de uma instância (decisão 009) |
| Presença como serviço (Liveblocks, PartyKit, Phoenix Presence) | Presença e estado compartilhado prontos | não | pago / dependência nova | não vale: o nosso cobre o caso, e trocar exigiria reescrever o servidor |

**Fontes:** https://ably.com/docs/presence-occupancy/presence ·
https://antmedia.io/webrtc-network-topology/ · aba duplicada, estado durável e serviços de
presença: conhecimento geral, sem fonte própria na pesquisa.

## Achados

| ID | Achado | Tipo | Confiança | Onde |
| --- | --- | --- | --- | --- |
| 01.1 | Sala trancada que esvazia volta destrancada e aberta por até 300 s: o primeiro a chegar com o código vira criador provisório. O lacre só volta com a credencial do criador (`fresh`). | risco | média | `rooms.ts` › `leave` (~L459), `join` |
| 01.2 | Qualquer credencial válida, inclusive de ex-criador (até 30 dias), pula a porta: o teste é só `!claim`, antes de olhar `rank`. | risco | média | `rooms.ts` › `join` (~L712) |
| 01.3 | Convite revogado volta a valer depois de reinício do servidor ou de a sala ser apagada (`revokedInvites` vive em memória). Está documentado, mas é uma brecha real do "revogar". | risco | alta | `rooms.ts` › `revokedInvites`; `docs/SEGURANCA.md` |
| 01.4 | O aviso de carga P2P a partir de 6 pessoas está no CLAUDE.md, na decisão 010 e no `.env.example`, mas nenhuma tela o mostra: `recommendedParticipants` só trafega nos dados e `App.tsx` mostra só a contagem. | lacuna | média | `App.tsx` (~L427); grep `recommended` em `src/client` |
| 01.5 | `known` e `refused` são por id de sessão (por aba). Quem volta com sessão nova bate na porta de novo, e o recusado contorna o bloqueio de 1 min com sessão nova (freio: 20 batidas por 10 min por IP). | risco | média | `rooms.ts` › `knock`, `known` |
| 01.6 | Não há expulsão nem convite de uso único: `gen` só serve para revogar, e `verifyInvite` aceita convite de geração antiga enquanto ninguém revoga. | lacuna | alta | `rooms.ts` › `verifyInvite` (~L714) |
| 01.7 | `broadcast` manda o snapshot inteiro a cada membro a cada mudança (O(n²) por sala), sem teto de pessoas. | desempenho | média | `rooms.ts` › `broadcast` |
| 01.8 | Qualquer código bem formado (4 a 24 letras e números) cria sala; o escolhido pode ter só 4 caracteres e ser adivinhado. O aleatório tem 64 bits. Risco aceito e registrado. | risco | alta | `protocol.ts` › `roomCode`; `rooms.ts` (~L662); `docs/SEGURANCA.md` (~L52) |
| 01.9 | Dois criadores provisórios com credencial de `rank` 0 disputam com `>=`: o último a voltar leva o cargo. | bug | baixa | `rooms.ts` › `reclaim` |
| 01.10 | `docs/SEGURANCA.md` diz "enquanto houver vaga", mas não há teto de vagas (decisão 010). | doc desatualizado | alta | `docs/SEGURANCA.md` (~L52–55) |
| 01.11 | `src/server/notes.ts` (`RoomNotes`) só é usado por `tests/notes.test.ts`; as Notas foram substituídas pelo Chat. | código morto | alta | `src/server/notes.ts` |
| 01.12 | `role()` e `roomRole()` repetem a regra de cargo (servidor e `shared`); mudar uma sem a outra diverge em silêncio. | risco | média | `rooms.ts` (~L217); `permissions.ts` (~L64) |
| 01.13 | `roleAllows(…, "locked")` não tem efeito (chave sem prefixo `admin`); só `canSetPermission` trata `locked`. | código morto | baixa | `permissions.ts` (~L54–63) |

O registro de falhas de TURN nos logs, que o `SEGURANCA.md` não cita, está em
[08](08-servidor-protocolo-seguranca.md) (08.5).

## Perguntas em aberto

- A credencial de ex-criador entrar direto numa sala trancada (01.2) é intencional?
- Sala que esvazia deve voltar destrancada (para o criador reclamar com `fresh`) ou lembrar o
  lacre até `roomTtl` (01.1)?
- Convite que volta a valer após reinício (01.3): o `SEGURANCA.md` registra, mas não há decisão
  formal.
- 01.4: falta conferir numa sala real com 6 pessoas se algum aviso aparece por outro caminho.
