# VIO

Uma sala para compartilhar tela, conversar e assistir junto, direto do navegador.
O servidor **nunca** transporta vídeo/áudio — ele só apresenta as pessoas umas às outras
e repassa sinalização WebRTC. A mídia viaja peer-to-peer.

by NerdQuest Studios · fundado por Nine · AGPLv3 · Node 24

> Implementação nova. Em 11/10/2026 o usuário autorizou substituir VIO/main por
> esta base, preservando o histórico, e publicar o serviço VIO no Render.
> VIO_TEST/main é o ambiente de prévia; a Fase 2 da rodada E só vai à produção
> após novo aval. VIO_2 e vio-test-canvas-preview permanecem fora do escopo.

## O que o VIO NÃO é

Decisão explícita de escopo, não limitação temporária:

- Sem contas, senhas ou banco de dados. A sala nasce quando alguém entra e some quando esvazia.
- Sem gravação, sem SFU / servidor de mídia. Chat de texto em memória foi aprovado na rodada E; Fase 2 só no vio-test.
- Por pedido explícito do usuário na 2.3.0, salas não têm teto de participantes. A partir de 6 pessoas, avisar do custo da malha P2P; `MAX_PARTICIPANTS` foi aposentada.
- A arquitetura continua P2P; não apresentar ausência de teto como garantia de capacidade.

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

Na 2.5.0, por pedido do usuário, cada espectador pode escolher várias telas
para assistir em `main`, com áudio independente, sem teto de duas. As telas menores
não são miniaturas passivas. O custo de rede e processamento continua crescendo. Foco só muda apresentação: preservar IDs, RTCPeerConnections,
MediaStreams e elementos de vídeo. Nunca abrir uma publicação nova automaticamente.


A mesma publicação é entregue em duas qualidades. `main` é o que você está assistindo, com a
qualidade dos Ajustes. `preview` é a miniatura no cartão do participante, e é **deliberadamente
miserável**: 90 kbps, 5 fps, sem redução de escala (`peers.ts`). No máximo `maxPreviews` (2)
ao mesmo tempo.

Isso é o que torna as miniaturas ao vivo viáveis numa malha P2P. Mandar `main` para cada
cartão multiplicaria o upload de quem transmite pelo número de espectadores. **Nunca promova
uma prévia a `main` para "ficar mais bonito"** — o custo cai em cima de quem publica, não de
quem olha.

### Preferências locais e cores

A aba Aplicativo controla `masterVolume` (0–1) e `soundVolume` (0–1). O volume geral
multiplica somente a reprodução local de voz, telas e efeitos. Nunca aplicar esse
fator à captura/enviada. Ajustar volume de voz não deve reassociar ou pausar o stream.
No ganho de tela, a decisão de manter o grafo depende do volume individual acima de
100%, não do produto com o volume geral; zero não desmonta o grafo.

`Participant.color` aceita somente HEX de seis dígitos no protocolo. O comando
`color` altera o membro autenticado, sem aceitar id de terceiro, limitado a 20/min.
O seletor faz prévia local; só Aplicar cor envia. Cor é da sala, preservada nas
reconexões e descartada na saída explícita. Alertas e ping não recebem essa cor.
Preferências de sons/aparência ficam no navegador, não no snapshot.

Sons de presença distinguem entrada/saída de oscilação de `online`; primeiro snapshot,
repetições e mudança de epoch não geram uma sequência de avisos de outras pessoas.

### Identidade estável

O participante tem um id próprio (UUID), independente do socket. Quando a conexão cai, ele
fica `online: false` e o servidor o segura por `grace` (padrão 90 s) antes de descartar. Na
volta, a mesma identidade e os mesmos `publicationId` voltam com ela.

A sessão é um **token HMAC** emitido em `/api/session`, com validade própria. É ele que prova
quem você é depois de uma queda — não o `socket.id`, que muda.

O `epoch` no snapshot identifica a instância da sala. Se ele mudar, o servidor reiniciou e o
cliente precisa refazer tudo do zero, não remendar.

Saída explícita invalida a geração local imediatamente e libera a interface sem
esperar ACK. A sessão anônima é renovada na próxima entrada; reconexões automáticas
preservam a identidade. Respostas de gerações antigas nunca podem alterar a nova sala.
Presença na chamada é `Participant.inCall`, independente de publicar voz.

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

Na reprodução de tela, manter o `<audio>` original conectado à faixa remota e tocando,
mesmo mudo durante amplificação. Até 100%, usar reprodução nativa; ganho acima disso
é opcional e sua falha deve retornar ao caminho nativo. Esperar uma faixa de áudio
antes de associar um stream inicialmente vazio ao elemento.

Streams remotos são montados manualmente por `Peers.ontrack`. Usar os helpers de
`media/remote-stream.ts`: `addTrack()` e `removeTrack()` chamados por script **não**
emitem eventos de faixa. Sem notificação, ganho e indicador podem permanecer ligados
ao estado vazio. A bancada ScreenAudioLab cobre o componente real e FeatureLab usa
os mesmos helpers de produção para a chegada tardia.

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
- Ícones: `lucide-react`. Fontes: Bricolage Grotesque (interface) e IBM Plex Mono (leitura técnica —
  código da sala, ping, FPS, bitrate).
- Toda string visível ao usuário é frase completa em português, com acento.
- Erro que o usuário vê tem `code` e mensagem em português (`Fault`), nunca stack trace.

## Comandos

```
npm ci
cp .env.example .env     # gere SESSION_SECRET, veja o README
npm run dev              # http://localhost:3000
npm test                 # 15 suítes, servidor real, sem navegador
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
- **TURN por três caminhos mutuamente exclusivos** (`docs/TURN.md`), e `readConfig` recusa
  subir se mais de um vier preenchido: credencial efêmera do coturn (`username` = expiração
  + id, `credential` = HMAC-SHA1), Cloudflare Realtime (a credencial vem da API deles) ou
  par usuário/senha estático. Nos dois primeiros, o segredo nunca vai para o cliente. O
  terceiro existe porque plano gratuito de TURN gerenciado costuma só dar par fixo — e é o
  mais fraco dos três, porque essa credencial **não expira**. Use-o para descobrir se TURN
  resolve o caso de alguém, não como arranjo permanente.
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

Semver: correção = PATCH, feature nova = MINOR. Versão de produção: 2.6.0. Prévia em revisão: 2.7.0-rc.5.

## Fora de limite

- Nunca rotear mídia pelo servidor. Se a solução exige o servidor tocar no stream, ela está
  errada para o VIO (exceção: TURN, que é relay de rede, não de aplicação).
- Nunca indexar transmissão por id de pessoa. Sempre `publicationId`.
- Nunca mandar `main` para cartão de participante.
- Nunca adicionar dependência sem aprovação explícita. A inclusão de `@dnd-kit/react` 0.5.0 foi aprovada em 05/10/2026 para o canvas; outras dependências continuam exigindo aprovação.
- Nunca commitar `.env`, segredo de TURN ou token.
- Preservar o aviso de carga P2P a partir de 6 pessoas, sem impedir entrada: decisão explícita do usuário para a 2.3.0. Não apresentar a remoção do teto como garantia de capacidade de mídia ilimitada.

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

## Canvas aprovado em 05/10/2026

O estado do layout é individual e versionado em `canvas/model.ts`. O núcleo não conhece tipos de widgets; o registro e o renderer ficam fora dele. O espaço grande faz parte do grid. Focar troca posições; foco único é uma ação separada e preserva todas as assinaturas e áudios. Nunca destacar telas automaticamente ao trocar o foco. Widgets compartilhados replicam apenas conteúdo, nunca geometria.

Cada publicação mantém um host de vídeo e um player de áudio estáveis. Não reparentar hosts nem usar clones de vídeo durante drag. Encodings de vídeo podem pausar por assinante, sem desligar a track da captura e sem tocar no sender de áudio. `replaceTrack(null)` é fallback somente do vídeo daquela assinatura.

O servidor verifica a sessão e a sala de cada ação de widget. Na prévia da rodada E, criador e administradores editam públicos; convidados precisam de permissão. Encerram quem compartilhou, criador e administradores; demais fecham só localmente. Revisões impedem perda silenciosa de texto. Ao sair o último membro, apagar imediatamente os widgets, mesmo durante o TTL residual da sala. Código de terceiros não é executado nesta versão.
