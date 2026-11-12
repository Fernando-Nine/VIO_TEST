---
name: motion-object-implementation
description: Frontend do VIO — implementa no app o movimento de objetos e elementos pequenos (botões, menus, toggles, ícones, texto, SVG, números ao vivo, indicador de fala, cursores, cartões e o Ponto da marca) a partir do rascunho e da spec do Design (motion-object-design). Traduz estados e gatilhos em CSS, Web Animations API, FLIP e molas, usando os tokens e o switch de movimento da base. Use ao implementar, refinar ou otimizar a animação de um elemento. Par da motion-scene-implementation.
---

# Movimento de objeto (Frontend)

Esta skill implementa **um elemento** por vez: como ele entra, reage, espera, confirma, erra e
sai. A base (tokens, switch, ticker, registro, stores) e o movimento de tela inteira são da
`motion-scene-implementation`; esta skill **consome** essa base. Fidelidade ao design primeiro;
desempenho em segundo, refinável a pedido.

| Skill                                 | Área     | Faz                                       |
| ------------------------------------- | -------- | ----------------------------------------- |
| `motion-scene-design`                 | Design   | cena, coreografia, sistema de tokens      |
| `motion-object-design`                | Design   | um elemento: botão, ícone, texto, o Ponto |
| `motion-scene-implementation`         | Frontend | base de movimento e cena no app           |
| `motion-object-implementation` (esta) | Frontend | cada objeto no app                        |

Exemplo da divisão: o objeto anima o **Ponto correndo** (antecipa, estica, pousa); a cena faz a
viagem entre as telas e põe as linhas de velocidade.

## Leia antes

1. A issue: spec do objeto (`docs/design/<peça>.md`, seção Movimento), link do rascunho, aceite e
   custos declarados (animação completa por padrão, decisão 020).
2. `docs/design/transicoes.md`; o guia do Ponto em `docs/design/`, quando existir (vence esta skill
   no que diz sobre o personagem).
3. A base: `docs/design/movimento.md` e `.claude/skills/motion-scene-implementation/references/fundacao.md`.
4. `docs/catalogo/07-cliente-e-interface.md` (itens 14 e 15) e o `mapa.md` para achar o componente.
5. Só o que a tarefa pede de `references/`:
   - `references/traducao-e-react.md` — spec → código, ferramenta por elemento, tokens e switch no
     componente, padrões React, FLIP, o Ponto correndo, bibliotecas (se aprovadas).
   - `references/interativo-texto-svg.md` — ponteiro, magnético, tilt, gestos, odômetro, fala,
     texto dividido acessível, SVG, canvas pequeno.
   - `references/desempenho-e-debug.md` — higiene, otimização, problemas comuns, conferir na tela.

## Conferir a pilha (rápido)

A pilha é conhecida: React 19 + Vite + TypeScript estrito, CSS próprio (sem Tailwind, sem CSS
Modules), `lucide-react` para ícones, `@dnd-kit/react` para arrastar; sem SSR; app Windows em
Tauri 2 (WebView2). Confirme em um minuto que nada mudou e que a base existe:

```sh
grep -E '"(react|vite|typescript|gsap|motion|lottie-web|@rive-app/[a-z-]+)"' package.json
ls src/client/components/motion*.ts
grep -c "\-\-motion-" src/client/styles.css
```

Base ausente: use `motion.ts` (`reducedMotion`) e `--ease`, crie só os tokens que o objeto precisa
no formato do sistema (`motion-scene-design/references/sistema.md`) e diga no relatório; base
completa é issue da cena. Next.js, Vue, Svelte, Astro, Tailwind e SSR não se aplicam.

## Pesquisa ao vivo

Com busca disponível (WebSearch/WebFetch ou subagente `pesquisador`), antes de usar recurso novo:
MDN, web.dev, docs do React (efeitos e Strict Mode na versão instalada) e, se aprovada, a
biblioteca (GSAP, Motion: nomes de pacote e imports mudam). Confira suporte de `@starting-style`,
`linear()`, `@property`, `animation-timeline`, unidade `lh`. Aprenda, não copie. Sem busca: diga
isso numa linha e marque o que for incerto.

## Dependências

Dependência nova exige aprovação do usuário. GSAP, Motion, Lottie, Rive, Three.js e outras **não**
estão aprovadas: instale só com o aval **registrado na issue**. Até lá, CSS, Web Animations API,
SVG ou canvas — o plano nativo que a spec traz. Spec pede biblioteca sem aval: implemente o plano
nativo e avise o copiloto.

## Regras que não se quebram

- **Invariantes de mídia:** nunca reparentar, clonar ou escalar o host de vídeo; não tirar o
  `<audio>` do `RemoteVoice` da árvore; foco e layout só mudam a apresentação; a animação de fala
  só **lê** o estado (`useSpeaking` → booleano/classe `.speaking`; `engine.captures.voiceLevel`
  0–1, só da pessoa local) e nunca cria áudio ou analisador.
- **Animação completa por padrão (decisão 020).** `transform`/`opacity` são o caminho barato, não
  um limite: paint, `clip-path`, traço SVG e filtro entram sem aval, com o custo anotado. Evite
  blur/`backdrop-filter` pesado sobre vídeo e mantenha o desempenho da chamada.
- **Um switch só:** `src/client/components/motion.ts` (`reducedMotion(win)`, e da base
  `onMotionChange`; `useReducedMotion` em `motion-react.ts`) + Ajustes › Acessibilidade. Nada de política própria do
  componente. Toda peça implementa a variante reduzida da spec. CSS reduzido com **dois
  seletores** (`@media (prefers-reduced-motion: reduce)` e `:root[data-motion="reduce"]`);
  esmaecer reduzido por `el.animate` (as regras globais zeram `transition`); nunca
  `animationend`/`transitionend` como timer (bug 07.1); na PiP, a janela do elemento.
- **Tokens:** nada que um token cubra fica escrito à mão (`var(--motion-…)`, `motion.…`).
- **Interface enxuta e acessível:** hover só com `@media (hover: hover)` e equivalente de toque;
  resposta no `pointerdown`; texto animado continua legível para leitor de tela; erro visível
  junto de um `Fault` em português.

Todo o resto (tempos, curvas, amplitude, quantidade de passos) segue a spec, salvo desvio com motivo registrado na spec; se não couber,
proponha a alternativa mais fiel e diga exatamente o que mudou.

**Campos mínimos da spec** (faltou um: peça ao copiloto antes de implementar): estados (e
gatilhos), tokens, variante reduzida, custos declarados e aceite.

## Fluxo

1. **Ler** a spec e o rascunho: intenção, estados e gatilhos, tokens, variante reduzida,
   custos declarados, aceite. Ambíguo ou em conflito com a pilha: pergunta curta ao copiloto, ou
   a opção mais fiel com a suposição registrada.
2. **Conferir** a pilha e a base; achar o componente e o CSS atuais (catálogo, `mapa.md`).
3. **Implementar** fiel, componentizado e reutilizável: estado no React, movimento no CSS/WAAPI,
   valores por quadro no `ticker`. Repetiu o mesmo efeito em dois lugares? Vira componente ou
   classe comum.
4. **Revisar** contra o aceite; medir se a spec marcou moderado/pesado; listar desvios.
5. **Fechar** (abaixo).

Decisões rápidas:

| Situação                                   | Faça                                                   |
| ------------------------------------------ | ------------------------------------------------------ |
| Pode mudar no meio (hover, aberto/fechado) | `transition`, não `@keyframes`                         |
| Disparado por evento do app, com passos    | `el.animate`, encadeado por `finished`                 |
| Segue cursor ou dedo                       | lerp ou mola no `ticker`                               |
| Nasce ao montar                            | `@starting-style`, ou `useLayoutEffect` + `el.animate` |
| Some ao desmontar                          | `usePresence` da base                                  |
| Mudou de lugar                             | FLIP com `transform`                                   |
| Repetido 100× por dia                      | animar menos, ou não animar                            |

## Pronto quando (Frontend, `CLAUDE.md`)

- Branch curto (worktree próprio se houver área em paralelo); Conventional Commits (`feat:`/`fix:`).
- `npm run typecheck` e os testes do que mudou (lógica pura em `tests/*.test.ts`, ex.: o gerador
  de keyframes do Ponto). A CI roda o resto.
- **Tela conferida:** `webapp-testing` ou `playwright-cli` (BrowserLab se tocou a sala), desktop e
  celular, completo e reduzido, cada estado e um quadro no meio da animação.
- `changes/<issue>-<slug>.md` com um parágrafo para quem usa, se quem usa percebe.
- Ficha de `docs/catalogo/` (e `mapa.md`, se mudou arquivo) atualizada se mudou o que ela
  descreve; `GUIA.md` se mudou algo que ele explica; handoff `.claude/handoff/frontend.md`.
- PR no VIO_TEST com `Closes #N`, auto-merge (squash) ligado, encerrar sem esperar a CI no chat.

## Relatório ao copiloto (≤ 4 linhas)

```
#N <objeto>: <estados implementados> com tokens e variante reduzida — PR #M.
Custo observado: <barato | moderado (x fps) | pesado (…)>; efeitos fora de transform/opacity: <quais | nenhum>.
Desvios da spec: <o que mudou e por quê | nenhum>. Tokens novos: <nomes | nenhum>.
Otimização possível a pedido: <uma linha>.
```

## Antipadrões

- Animar `width`, `height`, `top`, `left`, `margin` por padrão.
- Animação sem cleanup no desmontar; `rAF` próprio por componente; `setState` por quadro.
- Lógica de animação dentro do render; valores de token duplicados à mão.
- Hover sem `@media (hover: hover)`; clique que espera a animação acabar.
- Texto dividido que o leitor de tela lê letra por letra.
- Envolver host de vídeo ou `<audio>` num componente que desmonta, troca de pai ou escala.
- Indicador de fala que cria o próprio analisador.

## Princípio

Nunca achate a ideia criativa para facilitar a implementação. Se algo é difícil, ache o caminho,
ou proponha a alternativa mais fiel e diga o que mudou.
