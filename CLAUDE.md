# VIO

Uma sala para compartilhar tela, conversar e assistir junto, direto do navegador.
O servidor **nunca** transporta vídeo/áudio — ele só apresenta as pessoas umas às outras
e repassa sinalização WebRTC. A mídia viaja peer-to-peer.

by NerdQuest Studios · fundado por Nine · AGPLv3 · Node 24

> Implementação nova, escrita do zero. Não compartilha código nem histórico com os
> repositórios `VIO` e `VIO_2`, que seguem existindo em paralelo. Antes de trazer qualquer
> coisa de lá, leia "Relação com o VIO_2", no fim deste arquivo.

## O que o VIO NÃO é

Decisão explícita de escopo, não limitação temporária:

- Sem contas, senhas ou banco de dados. A sala nasce quando alguém entra e some quando esvazia.
- Sem gravação, sem chat de texto, sem SFU / servidor de mídia.
- Teto de 2 a 6 pessoas por sala (`MAX_PARTICIPANTS`, padrão 4). Malha P2P completa não escala além disso.
- Não é Jitsi Meet. Feature que só faz sentido acima desse teto está fora.

## Arquitetura

- `@src/server/` — Express 5 + Socket.IO. Estado das salas em memória, some no restart.
  `rooms.ts` é o coração: comandos, assinaturas, snapshots e ICE.
- `@src/client/` — React 19 + Vite. `room/controller.ts` é a máquina de estado da sala;
  `media/peers.ts` cuida das PeerConnections; `media/capture.ts` da captura e do microfone.
- `@src/client/media/` — `peers.ts` (PeerConnections), `capture.ts` (captura e microfone),
  `audio-output.ts` (para onde o som sai, vale para voz e tela), `voice-activity.ts` (quem
  está falando, inclusive os outros), `sounds.ts`.
- `@src/shared/protocol.ts` — contrato **único** entre os dois lados: schemas zod e tipos.
  Mudou o protocolo? Muda aqui primeiro; os dois lados quebram junto no `typecheck`, que é o
  ponto.

### Publicação e assinatura

Não existe "quem está compartilhando". Existe **publicação**: uma pessoa publica um `kind`
(`screen` | `voice` | `camera`) e recebe um `publicationId`. Quem quer ver **assina** aquela
publicação. Uma pessoa pode publicar várias coisas ao mesmo tempo, e cada assinatura vira uma
PeerConnection própria.

Daí a regra que não pode ser quebrada: **nada que descreve uma transmissão é indexado pelo id
da pessoa.** É sempre pelo `publicationId`.

### `tier`: `main` e `preview`

A mesma publicação é entregue em duas qualidades. `main` é o que você está assistindo, com a
qualidade dos Ajustes. `preview` é a miniatura no cartão do participante, e é **deliberadamente
miserável**: 90 kbps, 5 fps, sem redução de escala (`peers.ts`). No máximo `maxPreviews` (2)
ao mesmo tempo.

Isso é o que torna as miniaturas ao vivo viáveis numa malha P2P. Mandar `main` para cada
cartão multiplicaria o upload de quem transmite pelo número de espectadores. **Nunca promova
uma prévia a `main` para "ficar mais bonito"** — o custo cai em cima de quem publica, não de
quem olha.

### Identidade estável

O participante tem um id próprio (UUID), independente do socket. Quando a conexão cai, ele
fica `online: false` e o servidor o segura por `grace` (padrão 90 s) antes de descartar. Na
volta, a mesma identidade e os mesmos `publicationId` voltam com ela.

A sessão é um **token HMAC** emitido em `/api/session`, com validade própria. É ele que prova
quem você é depois de uma queda — não o `socket.id`, que muda.

O `epoch` no snapshot identifica a instância da sala. Se ele mudar, o servidor reiniciou e o
cliente precisa refazer tudo do zero, não remendar.

### Negociação

Padrão *perfect negotiation*, com um contador `round` por conexão:

- Sinal com `round` menor que o atual é **ignorado**, não aplicado. É assim que a colisão de
  ofertas (glare) se resolve sem as duas pontas travarem.
- `rollback` quando uma oferta chega no meio da nossa.
- `restart: true` pede ICE restart. Conexão em `failed` ou `disconnected` chama `recover()`
  em vez de morrer calada.

Todo sinal passa pelo `signalSchema`, que exige **exatamente um** entre `description`,
`candidate` e `restart`. Payload com dois, ou com nenhum, é recusado antes de encostar na
PeerConnection.

### Voz

**O indicador de fala dos outros depende do `RemoteVoice`, e isso não é óbvio.** Um
`AnalyserNode` alimentado por track remota de WebRTC lê **silêncio** enquanto essa track não
estiver presa a um `HTMLMediaElement` tocando. Medido nesta bancada (Chromium 141), com tom de
440 Hz atravessando uma `PeerConnection`:

| configuração | analisador |
|---|---|
| elemento tocando (mesmo objeto, ou outro envolvendo a track) | detecta 439 Hz |
| elemento tocando, porém **mudo** | detecta 439 Hz |
| sem elemento, analisador ligado ao destino por ganho zero | **silêncio** |

Ou seja: quem faz o indicador funcionar é o `<audio>` do `RemoteVoice`, não o dreno de ganho
zero do `voice-activity.ts`. **Tirar `RemoteVoice` da árvore, ou deixar de montá-lo antes do
cartão, mata o indicador sem erro nenhum** — e o dreno, sozinho, não segura. Se um dia o áudio
remoto passar a tocar por outro caminho, confira o indicador na mesma leva.

Grafo de áudio próprio em `capture.ts`: `fonte → analisador → portão (GainNode) → destino`.
O analisador fica **antes** do portão — com ele depois, o portão fechado zeraria o medidor e
nunca mais reabriria. O portão corta por ganho com retenção de 180 ms, e o limiar é em **dB**
(`threshold`, padrão −55), não numa escala inventada.

## Stack e convenções

- Node **24** (`.nvmrc`, `engines`). TypeScript estrito, sem `any` solto. React 19 sem
  Tailwind — CSS próprio em `styles.css`.
- **Identificadores e comentários em inglês; texto de interface em português.** É o oposto do
  VIO_2, e é intencional: o vocabulário do WebRTC é inglês, e traduzir `publication` ou
  `subscription` só criaria uma segunda língua para a mesma coisa.
- Prettier é a formatação. Não discuta estilo à mão.
- Ícones: `lucide-react`. Fontes: Manrope (interface) e IBM Plex Mono (leitura técnica —
  código da sala, ping, FPS, bitrate).
- Toda string visível ao usuário é frase completa em português, com acento.
- Erro que o usuário vê tem `code` e mensagem em português (`Fault`), nunca stack trace.

## Comandos

```
npm ci
cp .env.example .env     # gere SESSION_SECRET, veja o README
npm run dev              # http://localhost:3000
npm test                 # 13 suítes, servidor real, sem navegador
npm run typecheck
npm run build && npm start
npm run test:media       # bancada de mídia em navegador (tests/BrowserLab.tsx)
```

`ALLOWED_ORIGINS` precisa bater com a porta que você está usando. Subir em outra porta sem
ajustar isso faz a sessão ser recusada por origem — e a mensagem na tela é genérica, então é
fácil perder tempo com isso.

Teste manual obrigatório antes de fechar tarefa que toque em mídia:

1. Duas abas no mesmo PC, mesma sala — publicar, assinar, parar.
2. PC + celular na mesma rede, pelo IP local.
3. Reinício do servidor com a sala aberta (valida `grace`, `epoch` e o token de sessão).

## Segurança

Implementado, e é para continuar assim:

- **Todo payload passa por zod** com `.strict()` e tamanhos limitados. Campo desconhecido é
  recusado, não ignorado.
- **Token de sessão HMAC** verificado com `timingSafeEqual`. Nunca troque por `===`.
- **Config que se recusa a subir**: em produção, sem `SESSION_SECRET` de 32+ caracteres ou sem
  origem HTTPS explícita, o processo morre no boot. Falhar cedo é o comportamento desejado.
- **Helmet**, CSP, e `trust proxy` explícito (`TRUST_PROXY`), nunca `true`.
- **Limites por chave**: salas, participantes, sockets por IP, comandos por janela (`Limits`).
- **TURN com credencial efêmera** no formato REST do coturn: `username` = expiração + id,
  `credential` = HMAC-SHA1. O segredo nunca vai para o cliente.
- **Log estruturado** em JSON por linha (`log()`), sem dado pessoal.

Regras:

- Nunca logar nome de participante, código de sala completo, token ou SDP.
- Nunca aceitar ação de terceiros: toda operação sobre publicação ou assinatura confere o dono.
- `ENABLE_TEST_LAB=1` é recusado em produção pelo próprio `readConfig`. Não afrouxe isso.

## Falar com um servidor remoto

Na web tudo é relativo e o mesmo processo Node serve página, API e socket — é o caso
normal, e o padrão. Uma casca nativa carrega a página do esquema dela, onde `/api/session`
resolveria contra a própria casca, então a build dela preenche duas variáveis
(`@src/client/endpoint.ts`):

- `VITE_API_BASE` — onde o servidor mora, para as chamadas e o socket.
- `VITE_WEB_URL` — o que entra num convite. Separada de propósito: ninguém consegue abrir
  um link `tauri://`.

Do lado do servidor, `ALLOWED_APP_ORIGINS` aceita a origem da casca. Ela é **uma lista à
parte** de `ALLOWED_ORIGINS`, e isso não é arrumação: a exigência de HTTPS em produção
protege a web e não pode ser afrouxada para caber um esquema próprio. `http(s)` só passa
nessa lista em host local (`http://tauri.localhost`, que é o que o Tauri usa no Windows) —
senão ela viraria a porta dos fundos da regra que existe logo acima dela.

Origem **ausente** continua recusada, como sempre foi. A decisão mora num lugar só,
`origemPermitida` em `@src/server/app.ts`; havia duas cópias dessa condição, e duas cópias
de uma regra de segurança é uma a mais do que se consegue manter iguais.

## Implantação

`render.yaml` (Blueprint), `Dockerfile` multi-stage e `compose.yaml`. Health check em
`/healthz`. `SESSION_SECRET` usa `generateValue: true` — a plataforma gera, ninguém commita.
A origem do Render vem de `RENDER_EXTERNAL_URL` em runtime; `ALLOWED_ORIGINS` só é necessária
para domínio adicional.

O build gera `dist/source.tar.gz` e o app oferece o próprio código-fonte. Isso é a AGPL sendo
cumprida, não enfeite — **não remova**.

## Versionamento

Fonte da verdade: `@src/shared/releases.ts`. Servidor e cliente leem a versão de lá, e o
histórico que o app mostra sai do mesmo lugar. Uma release mexe num arquivo só.

O histórico anterior vive em `@src/shared/legacy-releases.json` (16 entradas, 0.1.0 a 1.9.0),
herdado do projeto que veio antes. A 2.0.0 carrega `systemChange: true` e é a fronteira: daí
para trás, o histórico descreve um app que por dentro não existe mais. **Não apague essa
marca** — sem ela o histórico mente por omissão.

Semver: correção = PATCH, feature nova = MINOR. Versão atual: 2.1.0.

## Fora de limite

- Nunca rotear mídia pelo servidor. Se a solução exige o servidor tocar no stream, ela está
  errada para o VIO (exceção: TURN, que é relay de rede, não de aplicação).
- Nunca indexar transmissão por id de pessoa. Sempre `publicationId`.
- Nunca mandar `main` para cartão de participante.
- Nunca adicionar dependência sem aprovação explícita. São 11 diretas hoje, e isso é um teto,
  não um ponto de partida.
- Nunca commitar `.env`, segredo de TURN ou token.
- Não subir `maxParticipants` acima de 6 sem SFU. A malha não aguenta, e o limite é validado
  no `readConfig` de propósito.

## Relação com o VIO_2

O VIO_2 está em produção com usuários; este aqui está em 0.1.0 e **ainda não passou por uma
sessão real com várias pessoas**. Duas lições que o VIO_2 aprendeu apanhando, e que valem aqui
sem desconto:

1. **Teste que chama função interna não prova interface.** No VIO_2, sete suítes passavam
   enquanto a sala não funcionava, porque todas chamavam a função de foco direto pelo console
   em vez de clicar. As suítes daqui são de servidor — boas, mas cegas para a interface. A
   `BrowserLab` existe para cobrir esse buraco; use-a.
2. **Bug visual não aparece em teste de estado.** No VIO_2, a placa de iniciais cobria a
   prévia: o vídeo estava lá, tocando, com a conexão saudável, e ninguém via. Nenhuma asserção
   sobre estado pegaria isso. Olhe a tela.

A 2.0.0 fechou a lista que faltava: PWA com service worker, saída de áudio, indicador de fala
dos outros, duração da sala e o histórico herdado. O service worker **nunca** intercepta
navegação, sala, sessão ou socket — há teste para isso, e é o que o mantém inofensivo.

O que aqui é melhor desde o começo: portão de ruído (em dB), TURN com credencial efêmera,
validação de payload, identidade estável na reconexão, e miniaturas ao vivo por encoding
barato em vez de conexão cheia.

Este repositório não tem hooks do Claude Code. As regras acima são pedido, não portão — ao
contrário do VIO_2, onde `.claude/hooks/guard.js` as cumpre de verdade.
