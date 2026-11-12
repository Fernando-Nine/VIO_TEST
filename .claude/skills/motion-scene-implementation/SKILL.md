---
name: motion-scene-implementation
description: Frontend do VIO — implementa o movimento de cena no app a partir do rascunho e da spec do Design (motion-scene-design). Constrói primeiro a base compartilhada (tokens em CSS e TS, switch ligado ao motion.ts, ticker único, registro de efeitos, stores de ponteiro/rolagem/tela) e depois ambiente, rolagem, 3D, transições de tela, o Ponto viajante e sequências de carga. Use ao implementar movimento de tela inteira ou ao criar/estender a base de movimento. Par da motion-object-implementation.
---

# Movimento de cena (Frontend)

Esta skill implementa a **cena**: a base de movimento do app inteiro, o ambiente, a rolagem, as
transições de tela e a carga. Cada elemento sozinho é da `motion-object-implementation`, que
**consome** o que esta skill monta. Fidelidade ao design primeiro; desempenho em segundo,
refinável a pedido.

| Skill                                | Área     | Faz                                       |
| ------------------------------------ | -------- | ----------------------------------------- |
| `motion-scene-design`                | Design   | cena, coreografia, sistema de tokens      |
| `motion-object-design`               | Design   | um elemento: botão, ícone, texto, o Ponto |
| `motion-scene-implementation` (esta) | Frontend | base de movimento e cena no app           |
| `motion-object-implementation`       | Frontend | cada objeto no app                        |

Exemplo da divisão: o objeto anima o **Ponto correndo** (antecipa, estica, pousa); a cena faz a
viagem entre as telas, põe as linhas de velocidade e o vento, e decide quando tudo acontece.

## Leia antes

1. A issue: spec da cena (`docs/design/<peça>.md`, seção Movimento), link do rascunho, aceite e
   custos declarados (animação completa por padrão, decisão 020).
2. `docs/design/transicoes.md` (o Ponto conduz; tempos; lugares). O guia do Ponto em
   `docs/design/`, quando existir, é a fonte sobre o personagem e vence esta skill.
3. `docs/design/movimento.md` (sistema aprovado, **fonte dos tokens**: CSS e TS derivam dele), se existir; senão o formato de
   `.claude/skills/motion-scene-design/references/sistema.md`.
4. `docs/catalogo/07-cliente-e-interface.md`, itens 14 (Movimento) e 15 (Ponto), e o `mapa.md`.
5. Só o que a tarefa pede de `references/`:
   - `references/fundacao.md` — tokens, extensão do `motion.ts`, ticker, registro de efeitos, stores.
   - `references/scroll-ambiente-3d.md` — rolagem, ambiente, 3D, reatividade global, invariantes de mídia.
   - `references/transicoes-e-carga.md` — o Ponto viajante, troca de tela, View Transitions,
     presença (saída), carga, modal, foco e layout da sala.
   - `references/desempenho-e-debug.md` — orçamento, medição, problemas comuns, screenshots.

## Conferir a pilha (rápido)

A pilha é conhecida: React 19 + Vite + TypeScript estrito, CSS próprio (sem Tailwind),
`lucide-react`, `@dnd-kit/react`; sem roteador (Landing, Início e Sala são estados do `App`); sem
SSR; app Windows em Tauri 2 (WebView2, Chromium). Confirme em um minuto:

```sh
grep -E '"(react|vite|typescript|gsap|motion|lenis|three|lottie-web|@rive-app/[a-z-]+)"' package.json
ls src/client/components/motion*.ts
grep -n "\-\-motion-\|--ease:" src/client/styles.css | head
```

Se a base já existe (tokens `--motion-*`, `motion-tokens.ts`, ticker), **use e estenda**; não
recrie. Next.js, Vue, Svelte, Astro, Tailwind e SSR não se aplicam.

## Pesquisa ao vivo

Com busca disponível (WebSearch/WebFetch ou subagente `pesquisador`), antes de usar API ou recurso
CSS novo: MDN, web.dev, docs do React; e, se a issue aprovar uma biblioteca, os docs dela (GSAP,
Motion, Lenis, Three.js/R3F). Confira em especial: View Transitions (e o `<ViewTransition>` do
React na versão instalada), scroll-driven animations (`animation-timeline`), `linear()`,
`@starting-style`, Document Picture-in-Picture. Use o que aprender; não copie o trabalho de
ninguém. Sem busca: diga isso numa linha e marque como incerto o que depender de versão.

## Dependências

Dependência nova exige aprovação do usuário (`CLAUDE.md`). GSAP, Motion, Lenis, Three.js, Lottie,
Rive e outras **não** estão aprovadas. Instale só com o aval **registrado na issue**; até lá, faça
com CSS, Web Animations API, canvas 2D, WebGL puro ou SVG. Se a spec pedir uma biblioteca sem aval,
implemente o plano nativo da spec e avise o copiloto. Com aval: `import()` dinâmico para o que é
pesado, import só do necessário (tree-shaking), versão exata no `package.json`.

| Precisa de…                        | Nativo (padrão)                                  | Biblioteca (só com aval) |
| ---------------------------------- | ------------------------------------------------ | ------------------------ |
| Estados, entrada, loops            | CSS `transition`/`@keyframes`, `@starting-style` | —                        |
| Sequência interrompível por código | Web Animations API (`el.animate`, `finished`)    | GSAP timeline, Motion    |
| Ligado à rolagem                   | `animation-timeline`, `scrollOf` + ticker        | GSAP ScrollTrigger       |
| Rolagem suave                      | `scroll-behavior` em âncoras                     | Lenis                    |
| Troca de tela com elemento comum   | o Ponto viajante; View Transitions fora da sala  | GSAP Flip, Motion layout |
| Mola                               | `springEasing()` → `linear()`; mola no ticker    | Motion                   |
| Partículas, rastro                 | canvas 2D no ticker                              | —                        |
| Shader, 3D                         | WebGL puro; CSS 3D                               | Three.js, R3F, OGL       |
| Ilustração com estado              | SVG + CSS/WAAPI                                  | Rive, Lottie             |
| Sequência autorada fina            | WAAPI com keyframes e `offset`                   | Theatre.js               |

## Regras que não se quebram

- **Invariantes de mídia:** nunca reparentar, clonar ou escalar o host de vídeo; não tirar o
  `<audio>` do `RemoteVoice` da árvore; foco e layout só mudam a apresentação (PeerConnections,
  MediaStreams, hosts e players intactos); a animação de fala só lê `useSpeaking`/`voiceLevel`.
- **Animação completa por padrão (decisão 020).** `transform`/`opacity` são o caminho barato, não
  um limite: efeitos de paint, `clip-path`, traço SVG e filtro entram sem aval, com o custo anotado.
  Evite blur/`backdrop-filter` pesado sobre vídeo e preserve o desempenho da chamada.
- **Um switch só:** Ajustes › Acessibilidade › Reduzir movimento + `src/client/components/motion.ts`
  (`applyMotion`, `reducedMotion`). Estenda esse arquivo (`onMotionChange`, puro) e ponha o hook
  `useReducedMotion` em `motion-react.ts`;
  nunca crie outro. Toda peça implementa a variante reduzida da spec (padrão esmaecer ≤ 150 ms;
  estático ou removido só em loops e ambiente). CSS reduzido com **dois seletores** (media query e `:root[data-motion="reduce"]`);
  esmaecer reduzido com `el.animate` (as regras globais zeram `transition`); nunca
  `animationend`/`transitionend` como timer (bug 07.1).
- **Tokens:** nenhuma duração, curva ou distância que um token cubra fica escrita à mão. Token
  faltando: crie no formato do sistema e diga no relatório.
- **Segurança** (`CLAUDE.md`): nada de segredo no código; a interface não decide permissão.

Todo o resto da spec (tempos, teto de 800 ms, energia, quantidade de camadas) segue o Design, salvo desvio com motivo registrado na spec; se
não couber, proponha a alternativa mais fiel e diga exatamente o que mudou.

**Campos mínimos da spec** (faltou um: peça ao copiloto antes de implementar): estados (e
gatilhos), tokens, variante reduzida, custos declarados e aceite.

## Fluxo

1. **Ler** a spec e o rascunho: intenção, camadas, coreografia, transições, carga, variantes
   reduzidas, custos declarados, aceite. Ambíguo ou em conflito com a pilha: uma pergunta curta ao
   copiloto, ou escolha a opção mais fiel e registre a suposição.
2. **Conferir** a pilha e inventariar o que já existe (tokens, `motion.ts`, animações em
   `WidgetFrame.tsx`, `Toasts.tsx`, `strip-input.ts`, `landing.css`, `Home.tsx`/`Splash`).
3. **Construir na ordem:** base (tokens, switch, ticker, registro, stores) → ambiente → rolagem →
   transições e carga (o Ponto viajante) → ligar os objetos (com a `motion-object-implementation`).
4. **Medir** o que a spec marcou como moderado ou pesado (`desempenho-e-debug.md`).
5. **Revisar** contra o aceite; listar desvios e o porquê.
6. **Fechar** (abaixo).

## Pronto quando (Frontend, `CLAUDE.md`)

- Branch curto, worktree próprio se houver outra área em paralelo; Conventional Commits.
- `npm run typecheck` e os testes do que mudou. **Obrigatório** se tocou tokens:
  `tests/motion-tokens.test.ts` (paridade CSS ↔ TS, ambos derivados de `docs/design/movimento.md`,
  e `springEasing`). A CI roda o resto.
- **Tela conferida:** BrowserLab (`npm run test:media`) se tocou a sala; senão `webapp-testing`
  ou `playwright-cli`. Desktop e celular, completo e reduzido, e um quadro no meio da transição.
- `changes/<issue>-<slug>.md` com um parágrafo para quem usa, se quem usa percebe.
- `docs/catalogo/07-cliente-e-interface.md` (itens 14 e 15) e o `mapa.md` atualizados se a base ou
  os arquivos mudaram; `docs/catalogo/GUIA.md` se mudou algo que ele explica; handoff
  `.claude/handoff/frontend.md`.
- PR no VIO_TEST com `Closes #N`, auto-merge (squash) ligado, e encerrar sem esperar a CI no chat.
  Diff de base nova (cruza objeto e cena) passa por revisão sem memória (`code-review` ou
  `goldfish`) antes do merge.

## Relatório ao copiloto (≤ 4 linhas)

```
#N cena <peça>: base (tokens, ticker, registro, stores) + ambiente/rolagem/transições — PR #M.
Base para objetos: --motion-*, motion-tokens.ts, useReducedMotion, ticker, useSceneEffect, pointer/scrollOf.
Custo medido: <fps/quadros longos>; desvios: <o que mudou e por quê | nenhum>.
Dependências: nenhuma (ou: <lib>, aval na issue). Otimização possível a pedido: <uma linha>.
```

## Antipadrões

- Vários `requestAnimationFrame` concorrentes; um ouvinte de `scroll` por elemento.
- Efeito que não desmonta ao trocar de tela; WebGL rodando fora da vista ou com a aba oculta.
- Valores de token copiados à mão; segundo switch de movimento; política própria do componente.
- Ambiente competindo com o conteúdo; ambiente sobre vídeo ao vivo sem aval do usuário na issue.
- Rolagem sequestrada que prende a pessoa; âncoras quebradas por seção presa.
- View Transition por cima da sala (congela o vídeo).
- Lógica pendurada em `animationend`; `setState` do React a cada quadro.

## Princípio

Nunca achate a visão criativa para facilitar a implementação. Se algo é difícil, ache o caminho,
ou proponha a alternativa mais fiel e diga exatamente o que mudou.
