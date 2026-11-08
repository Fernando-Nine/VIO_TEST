---
name: motion-scene-design
description: Design do VIO — composição de movimento da tela ou do site inteiro (atmosfera, coreografia, rolagem, transições entre telas, carga, reatividade global) e o sistema de movimento compartilhado (tokens, energia, variantes reduzidas). Use ao propor o movimento de uma tela, página ou sequência, ou ao criar/mudar os tokens de movimento. Par da motion-object-design.
---

# Movimento de cena (Design)

Esta skill cuida do **mundo**: como a tela inteira respira, em que ordem as coisas aparecem, como se
passa de um lugar a outro, o que acontece no fundo enquanto o objeto age. Ela também **define o
sistema de movimento** (tokens, energia, variantes reduzidas) que as outras três skills usam.

| Skill                          | Área     | Faz                                                 |
| ------------------------------ | -------- | --------------------------------------------------- |
| `motion-scene-design` (esta)   | Design   | cena, coreografia, sistema de tokens                |
| `motion-object-design`         | Design   | um elemento: botão, ícone, texto, o Ponto           |
| `motion-scene-implementation`  | Frontend | constrói a base (tokens, ticker, registro) e a cena |
| `motion-object-implementation` | Frontend | implementa cada objeto sobre essa base              |

Divisão com um exemplo: o objeto anima o **Ponto correndo** (antecipa, estica, pousa); a cena
adiciona as **linhas de velocidade**, o vento, o parallax e a "câmera" que fazem a corrida parecer
rápida. O Design desenha e especifica; **não implementa no app** (`.claude/agents/design.md`).

## Leia antes

1. `docs/design/transicoes.md` — o padrão aprovado: **o Ponto conduz as transições**.
2. O guia do Ponto em `docs/design/`, quando existir: ele é a fonte sobre o personagem e vence
   esta skill. Até lá, a fonte é `transicoes.md`.
3. `docs/design/movimento.md`, se existir (o sistema já aprovado). Se não existir, esta skill o cria.
4. `vio-design-system` (tokens visuais) e `vio-design-delivery` (formato da leva).
5. Só o que a tarefa pede de `references/`:
   - `references/sistema.md` — formato dos tokens, energia, switch, efeitos e custo. **Sempre.**
   - `references/composicao-e-coreografia.md` — ritmo, camadas, coreografia, rolagem.
   - `references/atmosfera-e-transicoes.md` — ambiente, 3D, transições, reatividade, custo da
     cena, responsividade, bibliotecas.

Pilha conhecida (não precisa detectar): React 19 + Vite + TypeScript estrito, CSS próprio sem
Tailwind, ícones `lucide-react`; app Windows em Tauri (WebView2, Chromium). Confirme em uma olhada
no `package.json` se algo mudou. Next.js, Vue, Svelte, Astro, Tailwind e SSR não se aplicam.

## O Ponto da marca

O Ponto é um **quadrado arredondado** — quase um amiguinho vivo que guia e acompanha a pessoa pelas
telas. Ele é o protagonista de toda cena do VIO:

- **nunca some da tela principal**: viaja e pousa num ponto que fica (tabela de lugares em
  `transicoes.md`);
- sai de onde a pessoa clicou e chega **encaixado** no destino, medido no layout real;
- lidera; o resto da cena segue ou reage a ele;
- tem personalidade (respira, antecipa, se cansa?), mas não rouba a cena do vídeo na sala.

Proponha cenas em que o Ponto faz sentido como personagem. Uma cena que funciona sem ele
provavelmente está genérica.

## Liberdade criativa e o que não se quebra

**Liberdade criativa vem primeiro.** Toda regra que não seja invariante ou segurança é um padrão:
pode ser quebrada, desde que você diga qual, por quê e quanto custa.

| Tipo                        | Regra                                                                             |
| --------------------------- | --------------------------------------------------------------------------------- |
| **Invariante** (não quebra) | nunca reparentar, clonar ou escalar o host de vídeo; o Ponto passa por cima       |
| **Invariante**              | não tirar o `<audio>` do `RemoteVoice` da árvore                                  |
| **Invariante**              | foco e layout só mudam a apresentação                                             |
| **Invariante**              | a animação de fala só lê o estado (`useSpeaking`, `voiceLevel`), não o produz     |
| **Invariante**              | toda peça tem variante reduzida, ligada ao switch que já existe                   |
| Padrão                      | animação completa (decisão 020); `transform`/`opacity` é o caminho barato         |
| Padrão quebrável            | sequência inteira ≤ 800 ms                                                        |
| Padrão quebrável            | nada de ambiente na sala; sobre vídeo, só com aval do usuário registrado na issue |
| Padrão quebrável            | escala de tokens de `references/sistema.md`                                       |

**Efeito fora de `transform`/`opacity`:** não precisa de aval (decisão 020). Anote na tabela de
custos da spec (efeito, propriedade, custo, o que o modo reduzido faz). Evite blur/`backdrop-filter`
pesado sobre vídeo.

## Switch de movimento (não invente outro)

O VIO já tem a fonte única: Ajustes › Acessibilidade › **Reduzir movimento** e
`src/client/components/motion.ts` (`applyMotion` põe `data-motion="reduce"` no `<html>` quando a
pessoa escolhe "Sempre"; `reducedMotion()` soma isso ao `prefers-reduced-motion`). Toda camada,
coreografia e transição declara a variante reduzida: padrão **esmaecer** (≤ 150 ms), como na `CLAUDE.md`;
**estático** ou **removido** só para loops e ambiente. A energia global (`--motion-energy`) não substitui a variante reduzida.

## Dependências

Dependência nova exige aprovação do usuário. GSAP, Motion, Lenis, Three.js, Lottie, Rive e outras
**não** estão aprovadas. No rascunho (Artifact) você pode usá-las, com versão fixada; na spec,
diga qual biblioteca usaria em produção, por quê, e qual o plano nativo (CSS, Web Animations API,
canvas, SVG) caso o usuário não aprove. Se o Artifact restringir scripts externos, faça com
CSS/JS puro/canvas e anote a biblioteca de produção.

## Pesquisa ao vivo

Antes de propor, com busca disponível (WebSearch/WebFetch ou o subagente `pesquisador`):

1. Referências atuais e tendências: Awwwards, Codrops, CodePen, Dribbble, estudos de caso de
   estúdios, exemplos do Three.js, Material Motion, Apple HIG (Motion).
2. Versões e suporte: MDN, web.dev, docs do GSAP, do Motion e do Lenis — em especial View
   Transitions, scroll-driven animations (`animation-timeline`) e `@starting-style`.
3. Escreva 3–6 linhas: o que achou e **como isso muda a proposta**. Não copie nenhum trabalho
   específico; extraia princípios.

Sem busca disponível: diga isso numa linha e siga com o núcleo de `references/`.

## Fluxo

1. **Auditar a tela ou o site.** Estrutura, seções, hierarquia, movimento que já existe (CSS e
   `transicoes.md`), tom da marca, em que superfície estamos (landing, início, sala, widget).
   Humor ou referência não dados: pergunte em uma linha, ou assuma e diga a suposição.
2. **Pesquisar** (acima).
3. **Plano de movimento.** 2–3 conceitos de cena **bem diferentes** (personalidades distintas, não
   variações de curva); **mais** quando o pedido for de identidade. Cada conceito traz:
   - atmosfera global (camadas e o que fazem);
   - narrativa da rolagem (se houver) e densidade por seção;
   - transições (entre telas, seções, modais) — com o Ponto;
   - sequência de primeira carga;
   - como o movimento de objeto se encaixa (que tokens herda, que energia);
   - trade-offs, custo resumido e variante reduzida.
     Espere o aval, salvo se mandarem seguir.
4. **Construir no Artifact** o conceito aprovado, ao vivo, dentro da leva (`vio-design-delivery`):
   prancha por alternativa, tamanhos reais, botão "Repetir" e um seletor "Movimento: completo /
   reduzido" que simula o switch (`data-motion="reduce"` no `<html>` da prancha).
5. **Sistema + spec de cena** (abaixo), em `docs/design/movimento.md` (o sistema) e na spec da
   peça (`docs/design/<peça>.md`, seção Movimento). Esse documento é a fonte que a
   `motion-object-design` lê.

## O que a spec leva (formato flexível)

Use a estrutura que comunica melhor; acrescente ou tire campos conforme a ideia. Normalmente:

- **Tokens**: tabela no formato de `references/sistema.md`, marcando os **novos**.
- **Camadas**: nome, profundidade (`--motion-depth-*`), velocidade (`--motion-parallax-*`), o que
  anima, gatilho, custo.
- **Coreografia por seção ou momento**: linha do tempo em ms (diagrama ASCII serve).
- **Transições** (de → para, origem e destino do Ponto, tempos, curvas).
- **Sequência de carga** e o que ela espera.
- **Gatilhos**: clique, rolagem, evento da sala, tempo.
- **Variantes reduzidas**: uma por camada e por transição.
- **Custos** dos efeitos fora de `transform`/`opacity`: tabela com propriedade e custo.
- **Bibliotecas**: qual usaria e por quê, e o plano nativo.
- **Custo**: resumo da cena e os primeiros cortes se pedirem otimização.
- **Fallbacks**: sem WebGL, aparelho fraco, celular, PiP.
- **Aceite**: o que é "pronto" visto na tela (ex.: "o Ponto pousa exatamente sobre o botão Criar
  sala, sem salto, em 420 ms; no reduzido aparece direto").

Depois do aval, siga `vio-design-delivery` (Escolhidas, specs, issue `frontend` citando a spec).

## Antipadrões

- Tudo se mexendo ao mesmo tempo; nenhum protagonista.
- Fade-up genérico em toda seção.
- Ambiente competindo com o conteúdo (ou com o vídeo, na sala).
- Parallax forte sem variante reduzida (enjoo).
- Curvas diferentes entre seções irmãs, sem motivo.
- Scroll-jacking que prende a pessoa, quebra âncora, teclado ou busca na página.
- Sequência que faz esperar (passa de 800 ms sem ser pulável).
- O Ponto sumindo, teleportando ou chegando desencaixado.
- Texto que se move enquanto é lido.
- Animação de fala que cria áudio ou analisador próprio.

## Antiobjetivos

Nada de cena-modelo genérica, nada de copiar sites. O alvo é uma composição coesa, original e
memorável, em que fundo, estrutura e objetos parecem **um só mundo** — o mundo do Ponto.
