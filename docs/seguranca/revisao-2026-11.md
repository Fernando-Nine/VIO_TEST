# Revisão de segurança — novembro de 2026

Revisão completa do servidor, do protocolo, das permissões, dos limites, da sessão, da configuração,
do TURN e do service worker, feita pela área Backend/Segurança sobre o commit `5916b05` da `main`
(commit de 14 nov 2026; revisão concluída em 15 nov 2026). Este documento só aponta; as correções ficam com o Backend, nas issues indicadas.

## Resumo

| Gravidade | Total | Issue                    |
| --------- | ----- | ------------------------ |
| P0        | 0     | —                        |
| P1        | 2     | #375 (S-01), #376 (S-02) |
| P2        | 7     | #377                     |
| P3        | 11    | #377                     |

- **Nenhum achado expõe dados de quem usa o app hoje.** Não há vazamento de token, de nome, de SDP
  nem de conteúdo de sala entre salas. Por isso nenhuma correção de código saiu desta revisão.
- Os dois P1 são **negação de serviço** que um visitante anônimo consegue sozinho, dentro dos limites
  atuais: derrubar o servidor por memória (S-01) e impedir a criação de salas (S-02).
- Os P2 são, na maioria, **permissão mais larga do que a interface promete** (S-04 a S-07) e
  credenciais que não expiram ou não são invalidadas (S-03, S-08).
- A base está sólida: token HMAC, esquemas zod estritos, autorização dos sinais, CSP, recusas do
  `readConfig` e escopo do service worker estão corretos (seção "O que está certo").

## Método e limites

- Leitura do código: `src/server/` inteiro, `src/shared/protocol.ts`, `permissions.ts`, `widgets.ts`,
  `room-modules.ts`, `public/sw.js`, `render.yaml`, `Dockerfile`, workflows da CI e os pontos do
  cliente que tocam credencial e convite. Três varreduras paralelas por subagente; todo achado delas
  foi conferido no código antes de entrar aqui.
- **Sem sondagem dos serviços no ar.** Nada foi testado contra a prévia nem contra a produção. O que
  depende da infraestrutura real está marcado "a conferir na prévia".
- Números de memória e de tempo são **estimativas**, indicadas como tais. A única medição foi o custo
  de um timer pendente (S-01), num modelo simplificado fora do servidor.
- Gravidade pela escala do `CLAUDE.md`: P0 quebra ou expõe; P1 falha real com contorno; P2 ajuste do
  que existe; P3 endurecimento.

## P1

### S-01 · Timers de revelação da enquete se acumulam sem limite — #375

- **Onde:** `src/server/rooms.ts:278-299` (`scheduleReveal`), chamado em `rooms.ts:1083-1084` e `:1173`.
- **Falha:** cada abertura de enquete com duração cria um `setTimeout` que nunca é guardado nem
  cancelado. O fechamento segura o objeto da sala e o do widget até o prazo, de até 86 400 s (24 h),
  mesmo depois de a enquete ser reiniciada, de o widget ser fechado ou de a sala ser apagada.
- **Cenário:** um visitante cria a própria sala (o dono tem `guestControl`), cria uma enquete com
  duração máxima e alterna `poll-control` `reset` e `start`. O limite de `module-interact` é 240 por
  minuto por identidade: 120 timers por minuto. Com os 20 sockets permitidos por IP, cerca de 2 400
  por minuto, e nenhum sai antes de 24 h. Medido: cerca de 0,4 KB por timer num modelo simplificado
  (o objeto real é um pouco maior). Estimativa: 1 a 2 MB por minuto por IP; algumas horas de um IP,
  ou menos com vários, esgotam a memória da instância do Render e o processo cai. Todas as salas,
  que vivem em memória, são perdidas.
- **Correção:** um timer por widget, guardado em `RoomWidgets` (`Map<id, Timeout>`), com
  `clearTimeout` em `reset`, novo `start`, `close`, remoção e `clear()`. O fechamento captura só o
  código da sala e o `id`. Teste: N aberturas da mesma enquete deixam no máximo um timer; fechar o
  widget ou apagar a sala deixa zero.
- **Por que não é P0:** exige ataque deliberado e sustentado por horas, não expõe dados, e o serviço
  volta sozinho ao reiniciar. É o primeiro a corrigir.

### S-02 · Um único IP ocupa o limite de 200 salas — #376

- **Onde:** `src/server/rooms.ts:751` (teto), `:528` (sala vazia vive `roomTtl`, 300 s), `:615-622`
  (limite de `join`: 12 por minuto por identidade, 40 por minuto por IP), `src/server/app.ts:87`
  (30 identidades por minuto por IP), `render.yaml` (`MAX_ROOMS=200`).
- **Falha:** 40 salas por minuto × 5 minutos de vida da sala vazia = 200. Um IP, sem passar de
  nenhum limite, mantém o teto ocupado.
- **Cenário:** um script cria sala, sai e repete. Em cinco minutos qualquer pessoa que tente criar
  sala recebe `CAPACITY`, enquanto o script rodar. Salas existentes seguem funcionando e aceitando
  entradas.
- **Correção:** teto de salas vivas criadas por IP e limite próprio de criação, separado do `join`;
  sala que nunca teve segunda pessoa nem publicação expira em segundos; ao chegar no teto, descartar
  as vazias mais antigas antes de recusar. Liga-se à #357, mas vale sair antes.

## P2 — #377

### S-03 · Credencial da sala é portadora e não é invalidada

- **Onde:** `src/server/rooms.ts:838-846` (trava: basta `claim`, sem conferir `rank`), `:868-877`
  (retomada do cargo), `:471` e `:767` (`creatorRank = -1`), `src/client/room/controller.ts:581`
  (o cliente escolhe o código), `:497` (credencial em `localStorage`, 30 dias).
- **Falha:** qualquer credencial válida para aquele código passa pela trava da sala, mesmo a de quem
  já transferiu o cargo ou foi superado. Depois de reinício do servidor, ou quando a sala fica sem
  dono (`creatorRank = -1`), uma credencial antiga retoma o cargo de dono. Como o código de sala
  pode ser escolhido pelo cliente (4 a 24 caracteres), dá para reservar um código previsível.
- **Cenário:** alguém cria a sala `FILME`, guarda a credencial e sai. Dias depois, um grupo cria
  `FILME`; o servidor reiniciou no meio (o Render Free dorme) e a sala nasce sem dono firmado. O
  primeiro entra com a credencial guardada, vira dono, destrava, silencia e fecha widgets. Variante:
  ex-dono que transferiu o cargo de propósito continua entrando com a sala trancada.
- **Correção:** na trava, aceitar `claim` só se o `rank` não for inferior ao atual ou se a pessoa
  ainda constar como admin; ao criar sala, só código gerado pelo servidor (código escolhido só serve
  para entrar, ou para recriar com credencial); encurtar a validade. Sem banco não há revogação de
  verdade: registrar o limite no `docs/SEGURANCA.md`, que hoje afirma que transferir ou sair de
  propósito "invalida a credencial antiga". Mexe na experiência de voltar à sala: decisão do copiloto.

### S-04 · Silenciar para todos só cobre a voz

- **Onde:** `src/server/rooms.ts:1038-1041` (remove só publicações `voice`), `:1217` (só `voice` é
  recusada ao publicar).
- **Cenário:** o dono silencia alguém. A pessoa abre "só som" (`screen` com `audioOnly`), uma tela
  com som ou a câmera com `audio: true` e continua falando para a sala. `guestScreen` vem ligado.
- **Correção:** com `voiceBlocked`, recusar toda publicação com áudio e remover ou renegociar sem
  áudio as que já existem. Se a intenção for só o microfone, dizer isso na interface.

### S-05 · O criador restaura o widget que a moderação fechou

- **Onde:** `src/server/rooms.ts:1158-1173` (`mayClose` devolve cedo quando `target.owner === m.id`).
- **Cenário:** o dono fecha o widget de um convidado. O convidado manda `widget-restore` e o widget
  volta; repete a cada fechamento, dentro do limite de 30 por minuto. A restauração não confere
  `guestCreate`, então vale mesmo depois de o dono tirar a permissão de criar. Não existe expulsão.
- **Correção:** se quem fechou (`held.by`) não é o criador, só quem modera restaura; em qualquer
  caso, exigir a permissão de criar vigente.

### S-06 · "Convidados também controlam" libera editar

- **Onde:** `src/shared/permissions.ts:75-87` (`canUseWidget` ignora `need` quando há concessão no
  widget), `src/server/rooms.ts:1136-1145`, texto em `src/client/canvas/WidgetFrame.tsx:518-530`.
- **Cenário:** o dono marca "Todos — Convidados também controlam" numa enquete ou num sorteio. Um
  convidado manda `widget-structure`: troca as opções, muda os pesos do sorteio ou zera os votos
  (mudança de estrutura limpa o `moduleState`).
- **Correção:** concessões separadas para controlar e para editar, conferindo `need` no servidor; no
  mínimo, recusar `widget-structure` pela concessão de controle.

### S-07 · `guestEdit` controla cronômetros e faz o alarme tocar de novo

- **Onde:** `src/server/rooms.ts:1137`, `src/server/widgets.ts:101-134` (`structure` copia o conteúdo
  do cliente), `src/shared/widgets.ts:32-47` (`startedAt`, `elapsed`, `silenced`, `laps` no bloco).
- **Cenário:** a sala permite editar, mas não controlar. Um convidado manda `widget-structure` com
  `startedAt` no passado e sem `silenced`: o cronômetro "termina" e o alarme toca para todos; ou
  zera um cronômetro em uso. Repetível a cada revisão.
- **Correção:** em `structure`, preservar os campos de execução dos blocos de cronômetro existentes
  (por `id`); na criação, forçar `startedAt: null`, `elapsed: 0`, sem `silenced` nem `laps`.

### S-08 · TURN com credencial estática

- **Onde:** `src/server/rooms.ts:1342-1347` (`ice`), `src/server/config.ts:118-145`.
- **Falha:** no modo estático, o mesmo usuário e senha, sem validade, vão para qualquer visitante
  que crie uma sala e peça `ice`. É o modo em uso na prévia.
- **Cenário:** alguém copia a credencial uma vez e usa o relay para tráfego próprio, até a cota do
  provedor acabar. A chamada de quem depende de TURN para de conectar; não há como revogar sem
  trocar a senha no provedor.
- **Correção:** recusar o modo estático em produção no `readConfig`, deixando-o só para a prévia, e
  seguir com a credencial efêmera (#135, #25).

### S-09 · `TRUST_PROXY=1` no Render — a conferir na prévia

- **Onde:** `render.yaml`, `src/server/app.ts:19`, `:158-163`, `:179-193`.
- **Risco:** se houver mais de um salto de proxy na frente do app, `req.ip` é o endereço da borda e
  os limites por IP (30 sessões e 60 handshakes por minuto, 20 sockets) ficam divididos entre
  pessoas sem relação: gente legítima é recusada e um atacante esgota o limite de todos. Com um
  salto só, o valor está certo e `X-Forwarded-For` não é forjável.
- **Correção:** conferir uma vez na prévia o tamanho de `req.ips` (registrar só a contagem, nunca o
  endereço) e ajustar o valor; anotar o resultado em `docs/DEPLOY.md`.

## P3 — #377

| Nº   | Achado                                                           | Onde                                                                      | Cenário                                                                                                                                                                                                                                                                         | Correção                                                                                                                              |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| S-10 | Validação fraca de `TRUST_PROXY`                                 | `config.ts:108-117`, `app.ts:158-163`                                     | Só a palavra `true` é recusada. `0.0.0.0/0`, `::/0` ou `TRUE` passam e deixam qualquer cliente forjar o IP e escapar dos limites. Lista com vírgula: o Express separa, o `proxyaddr.compile` recebe a string inteira.                                                           | Aceitar só número pequeno ou lista de redes privadas; recusar faixas totais; separar a lista antes de compilar.                       |
| S-11 | Produção definida só por `NODE_ENV`                              | `config.ts:49`                                                            | Subir sem a variável liga segredo aleatório, origem `http://`, laboratório de testes e erros com pilha, sem HSTS. O `Dockerfile` e o `render.yaml` definem o valor; o risco é outra hospedagem.                                                                                 | Recusar subir quando a origem é HTTPS pública e `NODE_ENV` não é `production`, ou avisar no log de início.                            |
| S-12 | Chave de assinatura no ambiente de builds de PR; actions sem SHA | `.github/workflows/windows.yml:48-86`, `ci.yml:20-21`                     | Uma action de terceiros comprometida (`dtolnay/rust-toolchain@stable`, `Swatinem/rust-cache@v2`) roda antes do passo de build no mesmo job. Só o script decide se assina.                                                                                                       | Passar a chave só quando `PUBLISH` for verdadeiro (`if:` no passo ou job separado) e fixar as actions por SHA.                        |
| S-13 | Convite na query string                                          | `src/client/endpoint.ts:48`                                               | O token fica no histórico do navegador, em prévias de link e nos logs de acesso da infraestrutura. Quem lê entra na sala trancada enquanto o convite valer.                                                                                                                     | Levar o convite no fragmento (`#`) e limpar a URL com `replaceState` ao ler.                                                          |
| S-14 | `widget-structure` sem `kind` pula as regras do tipo             | `src/server/widgets.ts:109`, `src/shared/widgets.ts:84-100`               | Quem pode editar manda blocos de outro tipo num widget (por exemplo, dois blocos num cronômetro) e deixa a tela dos outros num estado que a interface não espera.                                                                                                               | Validar sempre contra o tipo atual do widget, venha `kind` ou não.                                                                    |
| S-15 | Rolar, sortear e votar sem permissão reenviam o widget inteiro   | `rooms.ts:1068-1082`, `src/server/widgets.ts:303-360`                     | Um comando de cerca de 250 B dispara até 15 KB para cada pessoa da sala; o freio de 300 ms só vale para rolar e sortear. Um convidado gasta banda e CPU de todos.                                                                                                               | Evento incremental para o resultado e freio por pessoa também no voto.                                                                |
| S-16 | Caracteres de formato invisíveis aceitos                         | `src/shared/widgets.ts:13`, `:244`; `src/shared/room-modules.ts:6`, `:56` | U+202E e largura zero em chat, títulos, rótulos e responsável permitem texto invertido e nomes visualmente iguais (imitar outra pessoa numa tarefa ou opção).                                                                                                                   | Remover `\p{Cf}` (menos ZWJ de emoji) na normalização dos textos.                                                                     |
| S-17 | Mapas que só crescem                                             | `src/server/widgets.ts:351`, `rooms.ts:1025`                              | `lastMessages` guarda uma chave por pessoa e widget e nunca limpa; `revokedInvites` cresce a cada revogação (30 por minuto). Crescimento lento, limitado pela vida da sala. Revogação só em memória (#242).                                                                     | Limpar as chaves ao fechar o widget e na saída da pessoa; teto em `revokedInvites` (guardar só a geração mínima válida).              |
| S-18 | `id` de widget fechado reutilizado por outra pessoa              | `src/server/widgets.ts:139-143`                                           | Quem pode criar cria um widget com o `id` de um fechado de outra pessoa e o fecha: `drop(id)` apaga a cópia guardada e o "Desfazer" dela some.                                                                                                                                  | Recusar criação com `id` que está em `closed`, ou guardar as cópias por `id` + dono.                                                  |
| S-19 | Desenvolvimento escuta em `0.0.0.0`                              | `src/server/index.ts:10`, `vite.config.ts:8`                              | Em rede compartilhada, o servidor de desenvolvimento (segredo aleatório, laboratório ligado) fica acessível a vizinhos.                                                                                                                                                         | Fora de produção, escutar em `127.0.0.1` por padrão, com variável para abrir.                                                         |
| S-20 | Itens menores                                                    | `app.ts:28`; `rooms.ts:179`; `docs/SEGURANCA.md`                          | `style-src 'unsafe-inline'` na CSP; sem tratador de erro global do Express; limites por ação presos a identidades que se criam à vontade (#357); `cloudflare_turn_unreachable` registra `e.message`; `/healthz` mostra a versão e `/api/config` mostra `testLab` (informativo). | Tirar o inline quando o cliente permitir; tratador que responde `Fault` genérico; registrar só o nome do erro; atualizar o documento. |

Fora do alcance de correção, para constar: em P2P, quem assiste uma transmissão vê o IP de quem
transmite. É próprio do WebRTC; vale dizer na política de privacidade (Jurídico).

## Regras do `CLAUDE.md` quebradas

| Regra                                                                                     | Situação                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Toda ação sobre publicação, assinatura ou widget confere dono/permissão **no servidor**" | Confere, mas com permissão mais larga que a pedida em S-05, S-06 e S-07. Publicação e assinatura estão corretas.                                                                                                                                                            |
| "TURN por um único caminho (`docs/TURN.md`)"                                              | O código tem três modos (estático, coturn com `TURN_SECRET`, Cloudflare). São mutuamente exclusivos no `readConfig`, então nunca dois ao mesmo tempo, mas a regra e o código não dizem a mesma coisa. Ajustar o texto da regra ou tirar o modo estático da produção (S-08). |
| "`trust proxy` explícito, nunca `true`"                                                   | Só a palavra exata `true` é recusada; equivalentes passam (S-10).                                                                                                                                                                                                           |
| "Limites por chave (`Limits`)"                                                            | Existem, mas a chave por identidade é barata de trocar (S-20, #357) e não há limite para criação de sala (S-02).                                                                                                                                                            |
| "Logs JSON sem nome de participante, código de sala completo, token ou SDP"               | Cumprida. Ressalva pequena: `e.message` em `rooms.ts:179` (S-20). O `docs/SEGURANCA.md` diz que só início e fim são registrados; há também três eventos de TURN.                                                                                                            |
| "Código e comentários em inglês"                                                          | Comentários em português em `config.ts`, `app.ts` e `rooms.ts`. Convenção, não segurança.                                                                                                                                                                                   |

As demais regras da seção "Segurança (inegociável)" estão cumpridas.

## O que está certo

- **Sessão e token:** `verifyToken` limita o tamanho, compara com `timingSafeEqual` depois de
  conferir o comprimento, valida o formato do `id` e a validade. Credencial e convite usam prefixo
  de finalidade (`room.`, `invite.`), então um não vale no lugar do outro.
- **Origem:** obrigatória (ausente é recusada) em `/api/session`, em `/api/leave` e no handshake do
  socket. Sem cookies, logo sem CSRF. Só websocket, com `maxHttpBufferSize` de 64 KiB e sem parser
  JSON global.
- **Protocolo:** todos os esquemas são `.strict()` com tamanhos limitados. Todo sinal passa por
  `signalSchema`; só o dono da publicação oferta, só quem assiste responde ou pede reinício, e o
  sinal vai apenas para a outra ponta.
- **Sala:** o socket fica preso ao membro (`member()`); o que sai para os outros passa por lista de
  campos permitidos (`publicMember`); cargo, moderação, admissão e convite conferem quem pede;
  `canSetPermission` impede admin de mudar o que é do dono.
- **Widgets:** o autor do voto vem do servidor e os votos ficam ocultos com a enquete aberta; dados
  e sorteio usam `crypto.randomInt` no servidor, com parser limitado; tetos de 6 widgets por
  pessoa, 32 por sala e 4 chats.
- **Cabeçalhos:** Helmet com CSP sem `unsafe-eval`, `frame-ancestors` e `object-src` em `'none'`,
  HSTS em produção e `no-referrer`.
- **Configuração:** em produção o `readConfig` recusa `SESSION_SECRET` curto, origem sem HTTPS e
  `ENABLE_TEST_LAB=1`; os modos de TURN não se misturam.
- **Service worker:** só responde por `/assets/*` e ícones. Não toca navegação, `/api`, socket nem
  `?sala`.
- **Build e CI:** o pacote do código-fonte (AGPL) sai de uma lista fixa, sem `.env`; a CI não usa
  `pull_request_target` e roda com `contents: read`; o app Windows trava a navegação e confere a
  assinatura da atualização.
- **Cliente:** sem `dangerouslySetInnerHTML` e sem `href` ou `src` vindos de texto de usuário.

## A conferir na prévia

1. Número de saltos de proxy do Render e o valor de `TRUST_PROXY` (S-09).
2. Se os logs de acesso do Render guardam a query string, o que define a urgência do S-13.
3. Uso e cota do TURN estático da prévia (S-08).

## Ordem sugerida

1. S-01 (#375) e S-02 (#376).
2. S-04, S-05, S-06 e S-07: são pequenas, no mesmo trecho de `rooms.ts` e `widgets.ts`, e cada uma
   ganha um teste de servidor.
3. S-09 (uma conferência) e S-08 junto com a #135.
4. S-03, depois da decisão do copiloto sobre códigos escolhidos e validade da credencial.
5. Os P3, conforme o Backend passar pelos arquivos; S-10, S-12 e S-14 são os mais baratos.
