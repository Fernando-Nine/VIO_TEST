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

O resto de `docs/` é referência técnica. `docs/catalogo/` retrata o código por tema (como funciona,
números, mercado, achados) e é a **primeira consulta** para saber onde e como algo está: veja o
`mapa.md` (onde fica cada arquivo e quem chama quem) e leia só a ficha da tarefa, antes de varrer o
código ou mandar um `crawler`. O `GUIA.md` de lá explica os porquês para leigos.
`docs/arquivo/` é histórico e **não** descreve o presente.

## Equipe

| Área               | Papel                                                                                                                                                                                  | Handoff         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Copiloto           | Chat central: decisões, prioridades, escopo, revisão e coordenação                                                                                                                     | `copiloto.md`   |
| Frontend/UX        | Interface, canvas, widgets, sons de interface, acessibilidade                                                                                                                          | `frontend.md`   |
| Mídia              | WebRTC, captura, áudio, TURN, futuro app Windows/celular                                                                                                                               | `midia.md`      |
| Backend/Segurança  | Servidor, protocolo, permissões, limites, revisão de segurança                                                                                                                         | `backend.md`    |
| QA/Release         | CI, testes, BrowserLab, versões, promoção para o VIO                                                                                                                                   | `qa.md`         |
| Design/Produto     | Rascunhos visuais, landing, página de download, identidade                                                                                                                             | `design.md`     |
| Jurídico           | LGPD, menores, direitos autorais, termos e política de privacidade                                                                                                                     | `juridico.md`   |
| Roteirista         | Ideias novas e crítica de funções antigas; propõe, não implementa                                                                                                                      | `roteirista.md` |
| Apoio (subagentes) | `goldfish` (revisa plano/diff sem memória), `crawler` (varre código), `pesquisador` (web), `escriba` (organiza aprendizados), `seguranca` (revisa segurança de diff ou de área, só lê) | sem handoff     |

Cada área trabalha dentro do seu escopo. Mudança que cruza áreas: registre na issue e
avise o copiloto pelo handoff; não reescreva o território do outro em silêncio.

## Autonomia

Agentes são **autônomos**. Corrigiu um erro pequeno? Corrija e siga, sem relatório.
Pergunte ao usuário **apenas** quando a decisão puder prejudicar usuários em geral
(privacidade, segurança, perda de dados, custo) ou mudar a visão do produto.
Decisões complexas ou muitas perguntas de uma vez saem numa **página de decisões** (formato da fase 1): contexto curto e simples, opções marcáveis com a recomendada indicada, observação por item e botão "respondi"; o chat só manda o link. O resto segue pelo chat.
Respostas ao usuário: **curtas**, em português. Detalhe só quando a decisão exigir.
**Áreas trabalham em silêncio**: sem narrar passos nem mandar avisos parciais. Uma mensagem ao
copiloto só no fim do bloco (≤ 4 linhas) ou quando houver erro que a área não resolve ou que
depende do usuário. Só o copiloto mantém conversa longa.
Comentário do usuário não é pedido: produzir (Design, telas, animações) só com pedido explícito; na dúvida, perguntar.
Guia ou documento que pede aval do usuário (sugestões, perguntas) é publicado como página de leitura com comentários, não só mesclado em Markdown.

**Economia de créditos:** rode só os testes ligados ao que mudou (a CI roda o resto) e não
releia arquivos que não mudaram desde a última leitura. Suíte completa, BrowserLab e
screenshots só quando a mudança tocar aquela parte. Leia trechos (grep, offset) em vez de
arquivos inteiros; para varreduras amplas use um subagente (Explore), que devolve só a
conclusão. Carregue só as skills da tarefa (`.claude/skills/`, papel de cada área).
**Saídas de ferramenta:** peça só os campos necessários (`fields`, `minimal_output`,
`tail_lines`, `head`); nunca liste eventos de outra sessão sem filtro (`kinds`, `limit`).

**Copiloto conversa, subagentes executam.** O copiloto delega a execução (release, pesquisa,
arrumação de issues e docs, varreduras) a subagentes (ferramenta Agent, em segundo plano), que
devolvem ≤ 10 linhas; cria subagentes sem pedir ao usuário (aval de 5 nov). As áreas também usam
subagentes para leitura pesada.

**Esforço e ultracode:** ao abrir sessão de área ou pedir trabalho grande, o copiloto diz ao usuário qual
esforço usar (alto, extra ou max) e se vale ligar o ultracode (`/effort ultracode`, ou `ultracode:` no
início de um prompt): o Claude monta workflows com vários subagentes em segundo plano; serve para
auditorias, migrações de muitos arquivos e pesquisa cruzada; gasta mais e não vale para tarefa pequena.

**Modelo por tarefa** (o copiloto passa o modelo ao abrir a sessão da área):

| Modelo | Tarefas                                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Opus   | Mídia/WebRTC, segurança (incl. `seguranca`), interface complexa e animações (animações com raciocínio no máximo)        |
| Sonnet | QA, textos/docs, Jurídico, Roteirista, Backend de rotina, bugs P1 simples, `goldfish`/`crawler`/`pesquisador`/`escriba` |
| Haiku  | Buscas simples                                                                                                          |

## Ambientes e fluxo

|          | Repositório            | Render (deploy automático da `main`) |
| -------- | ---------------------- | ------------------------------------ |
| Prévia   | Fernando-Nine/VIO_TEST | https://vio-test.onrender.com        |
| Produção | Fernando-Nine/VIO      | https://vio-quest.onrender.com       |

- **Tarefas** são Issues no VIO_TEST, com etiqueta de área (`frontend`, `midia`, `backend`,
  `qa`, `docs`, `design`) e Milestone da versão.
- **Prioridade**: toda issue tem um nível. **P0** quebra (crash, segurança, perda de dados, sala ou
  chamada parada) · **P1** bug com contorno · **P2** ajuste de layout ou de função existente ·
  **P3** feature nova. Não se começa um nível com o de cima aberto na mesma área. A ordem fica na
  seção Fila do `ESTADO.md`; a área pega a primeira com a sua etiqueta. Dentro do mesmo nível, desempate: afeta mais gente →
  desbloqueia outras tarefas → sai mais barato.
- **Em andamento**: no máximo **1 issue por área** ao mesmo tempo. Issue parada esperando decisão
  ou ação do usuário leva a etiqueta `aguarda-usuario` (e sai da vez da área).
- **Pronto** quando: CI verde; tela conferida se mudou interface; nota em `changes/` se quem usa
  percebe; `ESTADO.md`/handoff atualizados se mudou estado ou decisão; ficha de `docs/catalogo/`
  atualizada (e o `mapa.md`, se mudou arquivo) se mudou o que ela descreve; `docs/catalogo/GUIA.md`
  atualizado, em linguagem para leigos, se mudou uma decisão ou algo que ele explica; issue fechada **quando entra na prévia** (com o número
  da PR).
- **Incidente**: todo P0 resolvido ganha revisão sem culpa em `docs/incidentes/` e, se couber,
  um teste ou uma regra nova.
- **Plano na issue**: issue P3, de protocolo/segurança ou que cruze áreas traz no corpo objetivo,
  fora do escopo, arquivos prováveis, invariantes tocados e aceite (`feature.yml`) e passa pelo
  `goldfish` antes de a área começar; o diff dela passa por revisão sem memória (`code-review` ou
  `goldfish` em modo diff) antes do merge. Bugs P0–P2 pequenos não precisam.
- **Elephant-Goldfish com o usuário**: em brainstorming, feature nova e mudança de visão, a entrevista
  (Elephant), as perguntas e as revisões do plano são feitas com o usuário. O `goldfish` subagente
  serve para o copiloto e as áreas se situarem e para revisar diff e plano técnico.
- **Pesquisar antes de insistir**: diante de bug difícil ou solução incerta, rode o `pesquisador`
  (fóruns, Reddit, issues de bibliotecas, docs) antes de trocar código por tentativa.
- **Ver antes de codar**: toda coisa nova visível (widget, tela, cursor, ajustes, card) começa com
  rascunho do Design (trabalho novo ou de identidade: 5 estilos × 5 exemplos; exploração de estilo visual da fase 2:
  5 estilos × 2 amostras em telas reais, pedido do usuário em 9 nov; ajuste pequeno: 2–3 opções;
  tamanho real, etiqueta `design`; decisão 021; ordem por fases em `docs/design/guias/plano.md`) e só vira issue de
  frontend/backend depois do aval do usuário no rascunho. Correção de bug e ajuste pequeno do que
  já existe não precisam. Vale também para transição e animação. O copiloto confere o aval na issue
  antes de abrir a sessão da área, mesmo que a issue seja a próxima da Fila.
- **Trabalho**: um branch curto por tarefa → PR no `VIO_TEST` com `Closes #N` → ativar auto-merge
  (squash) → encerrar, sem esperar a CI no chat. Se a CI falhar, quem abriu corrige (pode usar
  `subscribe_pr_activity`). Sem revisão humana obrigatória. Antes do push: `npm run typecheck`
  e os testes do que mudou. Áreas em paralelo usam **worktree próprio** (`git worktree add`), nunca
  a mesma pasta. Área sem a ferramenta Agent avisa o copiloto, que roda o `goldfish`.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- **Versão**: semver; correção = PATCH, funcionalidade = MINOR. PR comum **não** sobe a versão:
  cria `changes/<issue>-<slug>.md` com um parágrafo (`changes/README.md`), mostrado na prévia com o
  commit do build. O QA fecha a prévia (`-rc.N` em `src/shared/releases.ts` + `package.json`).
  Histórico em `legacy-releases.json` e a marca `systemChange` da 2.0.0 **nunca** são apagados.
- **Produção**: o VIO recebe o **mesmo código** do VIO_TEST, só depois do aval do usuário na
  prévia, seguindo `docs/RELEASE.md` sem pular passo; QA/copiloto abre a PR de release no VIO e
  cria a tag `vX.Y.Z`. Nunca push direto na `main` do VIO. **Exceção:** correções de segurança
  vão direto para a produção (hotfix PATCH sobre a versão de produção), sem esperar aval.

## Contexto

O chat se resume sozinho (compactação automática) aos 200 mil tokens, configurado em
`.claude/settings.json`; ninguém troca de chat nem arquiva. **Áreas: 1–2 issues por sessão** (o
copiloto abre a sessão); ao fim, atualize o handoff (formato em `.claude/handoff/README.md`) e faça
commit. **Copiloto**: continua no mesmo chat; `/compact` antes de pausar por horas (depois de 1 h
parado o cache expira e a próxima mensagem relê tudo).

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
- Negociação: ofertante único (o dono da publicação) com `round` e fila serial por conexão;
  rollback só no ofertante, antes de ICE restart. Todo sinal passa por `signalSchema`.
- Identidade estável por token HMAC (não `socket.id`); `epoch` mudou = refazer tudo.
- Service worker nunca intercepta navegação, sala, sessão ou socket.
- Widget compartilhado é **um só estado para a sala**: toda ação (iniciar, pausar, desligar
  alarme, votar, rolar, sortear, editar) vale para todos, via servidor. Estado só local é
  permitido apenas em widget individual ou em preferência pessoal (volume, posição).
- Layout é sempre individual: cada pessoa monta o próprio. Dono e admins moderam e adicionam widgets, que cada pessoa escolhe ver; nunca mudam o layout de ninguém.

## Convenções

- Código e comentários em **inglês**; interface em **português**, frases completas com acento.
- TypeScript estrito, sem `any` solto. Prettier formata. Ícones `lucide-react`.
- Fontes: Bricolage Grotesque (interface) e IBM Plex Mono (código da sala, ping, números).
- Erro visível ao usuário: `Fault` com `code` e mensagem em português, nunca stack trace.
- Movimento: **o ponto da marca conduz as transições** (entrar na sala, trocar de página, abrir
  widget, mudar o conjunto da tela), sempre levando de um lugar a outro e presente na tela, com encaixe
  perfeito. O padrão é animação completa (decisão 020); invariantes de mídia e desempenho sobre vídeo
  valem sempre. `prefers-reduced-motion` e Ajustes › Acessibilidade (também para PC fraco ou internet
  ruim) reduzem a esmaecimento. Animação nova: use as skills de movimento (`emil-design-eng`, `impeccable`; Design:
  `motion-object-design` e `motion-scene-design`; Frontend: `motion-object-implementation` e
  `motion-scene-implementation`).
- Responsividade: toda tela funciona em janela pequena no computador e em aparelho pequeno. Se não
  houver conserto, defina um tamanho mínimo de janela logo antes de quebrar; abaixo dele, só o modo
  flutuante/picture-in-picture de uma tela.
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
Checagem automática sempre que der: o que um robô confere (Playwright, testes) não volta para o usuário
nem para o chat. Mudança de interface roda a vitrine (#269) quando ela existir.

## Regras que crescem

Erro de agente que uma regra teria evitado, ou algo que o usuário precisou explicar no chat, vira
uma linha curta neste arquivo (no lugar certo, sem duplicar). O copiloto revisa este arquivo uma
vez por mês: tira o que ficou velho e atualiza a data abaixo.
Aprendizados (`docs/aprendizados/`): as áreas mandam 1–2 linhas no fim do bloco, e o copiloto chama o
`escriba` no fim de cada bloco grande.
Última revisão: 2026-11-09.

## Travas

`.claude/settings.json` + `.claude/hooks/guard.mjs` bloqueiam: commit de `.env`/segredos,
force push e push direto na `main`. O resto deste arquivo é regra, não portão — cumpra.

# Compact instructions

Ao compactar, preserve: decisões e pedidos do usuário ainda abertos; issues, PRs e branches em
andamento, com números; o próximo passo; o que está em `aguarda-usuario`. Descarte: saídas de
ferramentas, logs, conteúdo de arquivos já commitados e passos concluídos.
