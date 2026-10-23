# VIO

Plataforma leve para reunir pessoas e **assistir algo juntas**: uma tela compartilhada,
conversa por voz e widgets na mesma sala, direto do navegador. Não substitui o Discord;
funciona bem ao lado dele. Público hoje: o fundador e amigos. Meta: crescer, construir
comunidade e, depois, monetizar sem perder a originalidade.

by NerdQuest Studios · fundado por Nine · AGPLv3 · Node 24

## Leia antes de qualquer tarefa

1. Este arquivo.
2. `docs/ESTADO.md` — versão em cada ambiente, prioridades e decisões. **Fonte única de estado.**
3. Seu papel em `.claude/agents/<área>.md` e seu handoff em `.claude/handoff/<área>.md`.

O resto de `docs/` é referência técnica; `docs/arquivo/` é histórico e **não** descreve o presente.

## Equipe

| Área              | Papel                                                              | Handoff       |
| ----------------- | ------------------------------------------------------------------ | ------------- |
| Copiloto          | Chat central: decisões, prioridades, escopo, revisão e coordenação | `copiloto.md` |
| Frontend/UX       | Interface, canvas, widgets, sons de interface, acessibilidade      | `frontend.md` |
| Mídia             | WebRTC, captura, áudio, TURN, futuro app Windows/celular           | `midia.md`    |
| Backend/Segurança | Servidor, protocolo, permissões, limites, revisão de segurança     | `backend.md`  |
| QA/Release        | CI, testes, BrowserLab, versões, promoção para o VIO               | `qa.md`       |
| Design/Produto    | Rascunhos visuais, landing, página de download, identidade         | `design.md`   |

Cada área trabalha dentro do seu escopo. Mudança que cruza áreas: registre na issue e
avise o copiloto pelo handoff; não reescreva o território do outro em silêncio.

## Autonomia

Agentes são **autônomos**. Corrigiu um erro pequeno? Corrija e siga, sem relatório.
Pergunte ao usuário **apenas** quando a decisão puder prejudicar usuários em geral
(privacidade, segurança, perda de dados, custo) ou mudar a visão do produto.
Respostas ao usuário: **curtas**, em português. Detalhe só quando a decisão exigir.

## Ambientes e fluxo

|          | Repositório            | Render (deploy automático da `main`) |
| -------- | ---------------------- | ------------------------------------ |
| Prévia   | Fernando-Nine/VIO_TEST | https://vio-test.onrender.com        |
| Produção | Fernando-Nine/VIO      | https://vio-quest.onrender.com       |

- **Tarefas** são Issues no VIO_TEST, com etiqueta de área (`frontend`, `midia`, `backend`,
  `qa`, `docs`) e Milestone da versão. Não existem mais "rodadas".
- **Trabalho**: um branch curto por tarefa → PR no VIO*TEST → CI verde → o próprio agente
  faz \_squash merge*. Sem revisão humana obrigatória. Antes do push: `npm run typecheck`
  e os testes do que mudou.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- **Versão**: semver. Fonte única `src/shared/releases.ts` (+ `package.json`). Correção =
  PATCH, funcionalidade = MINOR. Prévias usam `-rc.N`. Histórico em `legacy-releases.json`
  e a marca `systemChange` da 2.0.0 **nunca** são apagados.
- **Produção**: o VIO recebe o **mesmo código** do VIO_TEST, só depois do aval do usuário
  na prévia. QA/copiloto abre a PR de release no VIO e cria a tag `vX.Y.Z`. Nunca push
  direto na `main` do VIO.

## Contexto e troca de chat

Chats são substituídos para poupar créditos. Ao passar de ~60% do contexto (`/context`)
ou ao concluir uma entrega grande: atualize seu `.claude/handoff/<área>.md` no formato
de `.claude/handoff/README.md`, faça commit e avise. O chat novo começa lendo
`CLAUDE.md`, papel e handoff — nada mais é necessário.

## Arquitetura (resumo)

- `src/server/` — Express 5 + Socket.IO, estado em memória. `rooms.ts` é o coração.
- `src/client/` — React 19 + Vite, CSS próprio (sem Tailwind). `room/controller.ts` é a
  máquina de estado; `media/` cuida de PeerConnections, captura e áudio; `canvas/` do layout
  e widgets.
- `src/shared/protocol.ts` — contrato **único** cliente/servidor (zod). Mudou o protocolo,
  muda aqui primeiro.
- O servidor **nunca** transporta mídia: só sinalização WebRTC. Mídia é P2P (TURN é relay
  de rede e é aceito).

### Invariantes técnicos (quebrá-los causa bug silencioso)

- Transmissão é indexada por `publicationId`, **nunca** pelo id da pessoa.
- `preview` é deliberadamente barato (90 kbps, 5 fps). Nunca promover prévia a `main`.
- Foco/layout só mudam apresentação: preservar PeerConnections, MediaStreams, hosts de
  vídeo e players de áudio. Não reparentar hosts nem clonar vídeo no drag.
- O indicador de fala remoto depende do `<audio>` do `RemoteVoice` tocando (mesmo mudo).
  Tirá-lo da árvore mata o indicador sem erro.
- Streams remotos: usar `media/remote-stream.ts` (`addTrack` por script não emite eventos).
- Captura: `fonte → analisador → portão → destino`; analisador **antes** do portão; limiar em dB.
- Volume geral multiplica só a reprodução local, nunca o que é enviado.
- Negociação _perfect negotiation_ com `round`; todo sinal passa por `signalSchema`.
- Identidade estável por token HMAC (não `socket.id`); `epoch` mudou = refazer tudo.
- Service worker nunca intercepta navegação, sala, sessão ou socket.
- Widget compartilhado é **um só estado para a sala**: toda ação (iniciar, pausar, desligar
  alarme, votar, rolar, sortear, editar) vale para todos, via servidor. Estado só local é
  permitido apenas em widget individual ou em preferência pessoal (volume, posição).

## Convenções

- Código e comentários em **inglês**; interface em **português**, frases completas com acento.
- TypeScript estrito, sem `any` solto. Prettier formata. Ícones `lucide-react`.
- Fontes: Bricolage Grotesque (interface) e IBM Plex Mono (código da sala, ping, números).
- Erro visível ao usuário: `Fault` com `code` e mensagem em português, nunca stack trace.
- Interface enxuta: sem texto que explique o óbvio, sem aviso repetido, sem botão morto.
  Prefira edição direta, hover e menu de botão direito a painéis de ajustes.

## Segurança (inegociável)

- Todo payload passa por zod `.strict()` com tamanhos limitados.
- Token HMAC comparado com `timingSafeEqual`. Toda ação sobre publicação, assinatura ou
  widget confere dono/permissão **no servidor**.
- Em produção, `readConfig` recusa subir sem `SESSION_SECRET` ≥ 32 e origem HTTPS, e recusa
  `ENABLE_TEST_LAB=1`. TURN por um único caminho (`docs/TURN.md`). Não afrouxar.
- Helmet + CSP; `trust proxy` explícito, nunca `true`. Limites por chave (`Limits`).
- Logs JSON sem nome de participante, código de sala completo, token ou SDP.
- Nunca commitar `.env`, segredo ou token. `dist/source.tar.gz` (AGPL) **não** é removido.

## Escopo

Agora: sem contas, banco de dados ou gravação no servidor — **adiados**, não proibidos
(clips gravados no próprio aparelho são um objetivo futuro). Sem SFU. Aviso de carga P2P
a partir de 6 pessoas, sem bloquear entrada.
Futuro: app Windows (prioridade), depois celular; comunidade e monetização.
Dependência nova exige aprovação do usuário (aprovadas: as do `package.json` atual).

## Comandos

```
npm ci
cp .env.example .env     # gere SESSION_SECRET (README)
npm run dev              # http://localhost:3000 — ALLOWED_ORIGINS deve bater com a porta
npm test                 # servidor real, sem navegador
npm run typecheck
npm run build && npm start
npm run test:media       # bancada de mídia no navegador (tests/BrowserLab.tsx)
```

Teste de servidor não prova interface: em mudança visual, **olhe a tela** (BrowserLab ou
screenshot). Mídia: o aceite final é humano, na prévia, pelo usuário.

## Travas

`.claude/settings.json` + `.claude/hooks/guard.mjs` bloqueiam: commit de `.env`/segredos,
force push e push direto na `main`. O resto deste arquivo é regra, não portão — cumpra.
