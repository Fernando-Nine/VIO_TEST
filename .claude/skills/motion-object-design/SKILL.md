---
name: motion-object-design
description: Design do VIO — movimento de objetos e elementos pequenos (botões, cartões, ícones, logo, texto, SVG, números, menus, toggles, campos, dicas, selos, avatares, progresso, loaders, cursores, itens de lista e o Ponto da marca). Inventa movimento original e entrega rascunho ao vivo + spec de movimento para o Frontend. Use ao desenhar a animação ou microinteração de um elemento. Par da motion-scene-design.
---

# Movimento de objeto (Design)

Esta skill cuida de **um elemento** por vez: como ele entra, reage, espera, confirma, erra, sai.
A composição da tela inteira e o **sistema de tokens** são da `motion-scene-design`; esta skill
**consome** esse sistema e, se ele não existir, propõe um mínimo no mesmo formato.

| Skill                          | Área     | Faz                                       |
| ------------------------------ | -------- | ----------------------------------------- |
| `motion-scene-design`          | Design   | cena, coreografia, sistema de tokens      |
| `motion-object-design` (esta)  | Design   | um elemento: botão, ícone, texto, o Ponto |
| `motion-scene-implementation`  | Frontend | base de movimento e cena no app           |
| `motion-object-implementation` | Frontend | cada objeto no app                        |

Exemplo da divisão: o objeto anima o **Ponto correndo** (antecipa, estica, pousa); a cena põe as
linhas de velocidade e o vento. O Design desenha e especifica; **não implementa no app**.

## Leia antes

1. `docs/design/transicoes.md` — o Ponto conduz as transições; lugares onde ele mora; tempos.
2. O guia do Ponto em `docs/design/`, quando existir: é a fonte sobre o personagem e vence esta
   skill. Até lá, a fonte é `transicoes.md`.
3. `docs/design/movimento.md` (sistema aprovado). Não existe? Use o formato de
   `.claude/skills/motion-scene-design/references/sistema.md`, proponha só os tokens que o objeto
   precisa e marque-os **novos — a confirmar pela cena**.
4. `vio-design-system`, `vio-design-delivery`; antes de entregar, `vio-design-review`.
5. Só o que a tarefa pede de `references/`:
   - `references/principios-e-tempo.md` — 12 princípios na interface, durações, curvas, molas.
   - `references/estados-e-reatividade.md` — estados, toque e gestos, efeitos reativos, fala,
     responsividade, variante reduzida.
   - `references/texto-svg-tecnicas.md` — texto, SVG, técnicas CSS/JS, bibliotecas, custo.

Pilha conhecida: React 19 + Vite + TypeScript estrito, CSS próprio sem Tailwind, `lucide-react`;
app Windows em Tauri (WebView2). Uma olhada no `package.json` confirma. Next.js, Vue, Svelte,
Astro, Tailwind e SSR não se aplicam.

## O Ponto da marca

Quadrado arredondado, quase um amiguinho vivo, que guia e acompanha a pessoa e **nunca some da
tela principal**. Quando o objeto é o Ponto (ou mora junto dele: botão Criar sala, cabeçalho do
widget, selo Ao vivo, nome da pessoa), dê a ele intenção: antecipa antes de ir, olha para onde vai,
pousa encaixado, respira quando para. Cresce com a fala só **lendo** o estado da fala.

## Liberdade criativa e o que não se quebra

**Liberdade criativa vem primeiro.** Toda regra que não seja invariante ou segurança é um padrão
quebrável: quebre, diga qual, por quê e quanto custa.

- **Invariantes (não quebram):** nunca reparentar, clonar ou escalar o host de vídeo; não tirar o
  `<audio>` do `RemoteVoice` da árvore; foco e layout só mudam a apresentação; a animação de fala só
  lê o estado (`useSpeaking`, `voiceLevel`); toda peça tem variante reduzida.
- **Padrão quebrável:** só `transform`/`opacity`. Para quebrar, marque a exceção na spec (efeito,
  propriedade, motivo, custo, alternativa dentro da regra) e leve ao usuário na leva. Sem aval
  registrado na issue, o Frontend não implementa a exceção.
- **Padrões quebráveis também:** tokens da escala, teto de 800 ms por sequência, faixas de duração.

## Switch de movimento (não invente outro)

Fonte única: Ajustes › Acessibilidade › **Reduzir movimento** + `src/client/components/motion.ts`
(`data-motion="reduce"` no `<html>` com "Sempre"; `reducedMotion()` soma o `prefers-reduced-motion`).
Toda animação declara a variante reduzida: **estático**, **esmaecer** (≤ 150 ms) ou **removido**.
Nada de política de acessibilidade própria do componente.

No rascunho, simule o switch com um seletor "Movimento: completo / reduzido" que põe
`data-motion="reduce"` no `<html>` da prancha, e escreva o CSS reduzido com os dois seletores:

```css
@media (prefers-reduced-motion: reduce) {
  .ponto {
    animation: none;
  }
}
:root[data-motion="reduce"] .ponto {
  animation: none;
}
```

## Dependências

Dependência nova exige aprovação do usuário; GSAP, Motion, Lottie, Rive, Three.js e outras **não**
estão aprovadas. No rascunho pode usar (CDN com versão fixa). Na spec, diga a biblioteca de
produção, o motivo e o plano nativo (CSS, Web Animations API, canvas, SVG). Se o Artifact
bloquear scripts externos, faça em CSS/JS puro/canvas e anote a biblioteca que usaria.

## Pesquisa ao vivo

Antes de desenhar, com busca disponível (WebSearch/WebFetch ou subagente `pesquisador`):

1. Referências: Codrops, Awwwards, CodePen, Dribbble, galerias do Rive e do Lottie, exemplos do
   Three.js, Material Motion, Apple HIG (Motion).
2. Versões e suporte: MDN, web.dev, docs do GSAP e do Motion — em especial `@starting-style`,
   `linear()`, `@property`, scroll-driven animations e View Transitions.
3. Resuma em 3–6 linhas o que achou e **como isso informa o desenho**, sem copiar nenhum trabalho.

Sem busca: diga isso numa linha e siga com o núcleo de `references/`.

## Fluxo

1. **Ler o pedido e o design atual** (a tela, o CSS do elemento, a spec da peça). Direção visual ou
   humor não dados: pergunte em uma linha, ou assuma e diga.
2. **Pesquisar** (acima).
3. **Propor 2–3 conceitos bem diferentes** — personalidades distintas, não variações de curva;
   **mais** quando for identidade (o Ponto, a logo). Cada um: a sensação, os princípios que usa
   (ex.: antecipação + comprimir/esticar), trade-offs, custo e variante reduzida. Espere o aval,
   salvo se mandarem seguir.
4. **Construir no Artifact** o conceito escolhido, ao vivo, dentro da leva (`vio-design-delivery`):
   tamanhos reais (lateral, tira, foco, celular), botão "Repetir", gatilhos de cada estado
   (hover, pressionar, carregar, sucesso, erro) e o seletor de movimento reduzido.
5. **Spec de movimento** para o Frontend (abaixo), na spec da peça (`docs/design/<peça>.md`,
   seção Movimento).

## Spec de movimento (estrutura flexível)

Acrescente ou tire campos conforme a ideia. Normalmente:

- **Elemento** e onde mora (componente, tamanho).
- **Estados e gatilhos**: tabela estado → estado, com o que dispara (pointerdown, evento da sala,
  dado novo).
- **Tempo e curva**: só tokens (`--motion-dur-base`, `--motion-ease-ponto`, `motion.spring.ponto`);
  desvio com motivo; tokens **novos** marcados.
- **Variante reduzida** de cada estado.
- **Técnica / biblioteca** sugerida, com o motivo, e o plano nativo.
- **Exceções** a `transform`/`opacity` (tabela), para o aval.
- **Custo**: barato · moderado · pesado.
- **Fallback**: toque, aparelho fraco, PiP.
- **Aceite**: o que é "pronto" visto na tela.

Exemplo curto:

```
Elemento: Ponto do botão Criar sala (Início) · 12×12
idle → hover: o Ponto vai 3 px na direção do cursor (magnético, mola snappy) · moderado
hover → pressionar: o botão scale(--motion-scale-press) em --motion-dur-instant; o Ponto amassa (scale 1.15, .87)
pressionar → viagem: antecipa 2 px para trás, depois a viagem da cena (transicoes.md, 420 ms --motion-ease-ponto)
Reduzido: sem ímã; pressionar só escurece; o Ponto aparece direto no destino
Técnica: CSS para estados; Web Animations API para a viagem. Sem dependência.
Aceite: o Ponto nunca sai do botão no hover; nenhum pulo de layout; reduzido sem movimento algum
```

## Ferramentas de decisão

| Use…                        | em vez de…             | quando…                                               |
| --------------------------- | ---------------------- | ----------------------------------------------------- |
| `transition`                | `@keyframes`           | o estado pode mudar no meio (hover, abrir/fechar)     |
| mola                        | curva com duração      | o alvo muda enquanto anda, ou segue cursor/dedo       |
| máscara móvel               | `stroke-dashoffset`    | quer ficar dentro da regra `transform`/`opacity`      |
| escala + opacidade cruzadas | morph de caminho       | o morph seria exceção pesada e a troca cruzada basta  |
| odômetro (`translateY`)     | contar número a número | o número salta muito e precisa ser lido no fim        |
| nada                        | qualquer animação      | a ação é repetida 100× por dia e a animação só atrasa |

## Antipadrões

- Movimento sem propósito; fade-up padrão em tudo.
- Curvas diferentes entre irmãos (dois botões da mesma barra).
- Animação que bloqueia a interação (o clique espera a animação acabar).
- Texto que se move enquanto é lido.
- Escalar de 0 (salvo nascer do Ponto, que está visível).
- Hover sem equivalente pensado no toque.
- Loop que não pausa fora da tela.
- Ponto que some ou chega desencaixado.

## Antiobjetivos

Nada de animação-modelo genérica, nada de copiar sites. Movimento distinto, memorável e com
propósito — que pareça do VIO e de mais ninguém.
