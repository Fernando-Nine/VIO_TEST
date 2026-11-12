# Sistema de movimento do VIO — formato dos tokens

Este é o formato **único** que as quatro skills de movimento falam. A `motion-scene-design`
define os valores; a `motion-object-design` consome (ou propõe um mínimo no mesmo formato);
a `motion-scene-implementation` constrói em CSS e TS; a `motion-object-implementation` só lê.

## Onde mora

| Camada                                            | Arquivo                                                                            | Quem escreve      |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------- |
| Fonte de verdade (decisão; CSS e TS derivam dela) | `docs/design/movimento.md` (criado na primeira leva que definir o sistema)         | Design, após aval |
| Guia do personagem                                | guia do Ponto em `docs/design/` (quando existir); hoje `docs/design/transicoes.md` | Design            |
| CSS                                               | `:root` de `src/client/styles.css` (ou `src/client/motion.css` importado por ele)  | Frontend          |
| TS                                                | `src/client/components/motion-tokens.ts`, ao lado de `motion.ts`                   | Frontend          |
| Switch de preferência                             | `src/client/components/motion.ts` (`applyMotion`, `reducedMotion`) — **já existe** | ninguém duplica   |

Tokens que já existem no código e devem continuar valendo: `--ease: 160ms ease` (atalho usado em
dezenas de `transition`), a curva do Ponto `cubic-bezier(.2,.7,.2,1)` (chamada `--ease-ponto`
em `transicoes.md`), o quique de chegada `cubic-bezier(.3,1.4,.5,1)`, o `dot-pulse` de 2,4 s e o
FLIP de 200 ms do `WidgetFrame`. O sistema novo **absorve** esses valores; não cria um segundo
conjunto ao lado.

## Nomes

- CSS: `--motion-<grupo>-<passo>`. Grupos: `dur`, `ease`, `delay`, `stagger`, `dist`, `scale`,
  `parallax`, `depth`, `energy`. Passos curtos e ordenáveis (`instant`, `fast`, `base`, `slow`,
  `travel`, `long`, `ambient`; `xs`…`xl`).
- TS: o mesmo nome em árvore — `motion.dur.fast` (número em ms), `motion.ease.ponto` (string
  CSS), `motion.spring.soft` (`{ stiffness, damping, mass }`).
- Token local de componente: `--_nome` (sublinhado = privado), sempre derivado de um global:
  `--_lift: var(--motion-dist-sm)`.
- Token novo proposto por uma leva: marque **novo** na tabela da spec, com o motivo.

## Escala inicial (padrão; o Design troca com motivo declarado)

| Grupo      | Passo                                          | Valor                       | Para quê                                         |
| ---------- | ---------------------------------------------- | --------------------------- | ------------------------------------------------ |
| `dur`      | `instant`                                      | 80 ms                       | pressionar, eco de clique                        |
|            | `fast`                                         | 160 ms                      | hover, cor, opacidade (= `--ease` atual)         |
|            | `base`                                         | 240 ms                      | abrir menu, popover, toggle                      |
|            | `slow`                                         | 320 ms                      | chip que entra, troca de conjunto                |
|            | `travel`                                       | 420 ms                      | viagem do Ponto entre lugares                    |
|            | `long`                                         | 800 ms                      | teto de uma sequência inteira (`transicoes.md`)  |
|            | `ambient`                                      | 2400 ms                     | respiração, pulso do Ponto parado                |
| `ease`     | `ponto`                                        | `cubic-bezier(.2,.7,.2,1)`  | a curva da marca: arranca rápido, pousa macio    |
|            | `out`                                          | `cubic-bezier(.16,1,.3,1)`  | entradas                                         |
|            | `in`                                           | `cubic-bezier(.55,0,1,.45)` | saídas                                           |
|            | `in-out`                                       | `cubic-bezier(.65,0,.35,1)` | movimento de A a B na tela                       |
|            | `bounce`                                       | `cubic-bezier(.3,1.4,.5,1)` | chegada com quique (pessoa chega)                |
| `delay`    | `step`                                         | 40 ms                       | atraso entre fases de uma sequência              |
| `stagger`  | `step`                                         | 30 ms                       | entre itens irmãos (até 8; depois, todos juntos) |
| `dist`     | `xs`…`xl`                                      | 2 · 6 · 12 · 24 · 48 px     | deslocamentos                                    |
| `scale`    | `press`                                        | .97                         | botão pressionado                                |
|            | `pop`                                          | 1.06                        | pico de um pop                                   |
|            | `from`                                         | .92                         | entrada de popover (nunca de 0, salvo do Ponto)  |
| `parallax` | `far` `mid` `near` `front`                     | .15 · .4 · 1 · 1.15         | velocidade relativa das camadas                  |
| `depth`    | `ambient` `content` `chrome` `overlay` `ponto` | 0 · 1 · 10 · 100 · 1000     | `z-index` das camadas                            |
| `energy`   | —                                              | 1 (0 a 1,5)                 | intensidade global (abaixo)                      |

Molas (só TS; em CSS viram `linear()` gerado, ver `motion-scene-implementation`):

| Mola     | stiffness | damping | mass | ζ (amortecimento) | Sensação                   |
| -------- | --------- | ------- | ---- | ----------------- | -------------------------- |
| `snappy` | 400       | 30      | 1    | 0,75              | firme, quase sem sobra     |
| `soft`   | 170       | 26      | 1    | 1,0               | macia, sem passar do alvo  |
| `bouncy` | 300       | 15      | 1    | 0,43              | brincalhona, passa e volta |
| `ponto`  | 260       | 22      | 1    | 0,68              | o Ponto pousando com vida  |

ζ = damping / (2·√(stiffness·mass)). ζ < 1 passa do alvo; ζ = 1 chega sem passar; ζ > 1 chega
arrastado. Use ζ para conversar sobre a sensação; os três números vão para o código.

## Em CSS

```css
:root {
  --motion-dur-instant: 80ms;
  --motion-dur-fast: 160ms;
  --motion-dur-base: 240ms;
  --motion-dur-slow: 320ms;
  --motion-dur-travel: 420ms;
  --motion-dur-long: 800ms;
  --motion-dur-ambient: 2400ms;

  --motion-ease-ponto: cubic-bezier(0.2, 0.7, 0.2, 1);
  --motion-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --motion-ease-in: cubic-bezier(0.55, 0, 1, 0.45);
  --motion-ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --motion-ease-bounce: cubic-bezier(0.3, 1.4, 0.5, 1);

  --motion-delay-step: 40ms;
  --motion-stagger-step: 30ms;

  --motion-dist-xs: 2px;
  --motion-dist-sm: 6px;
  --motion-dist-md: 12px;
  --motion-dist-lg: 24px;
  --motion-dist-xl: 48px;

  --motion-scale-press: 0.97;
  --motion-scale-pop: 1.06;
  --motion-scale-from: 0.92;

  --motion-parallax-far: 0.15;
  --motion-parallax-mid: 0.4;
  --motion-parallax-near: 1;
  --motion-parallax-front: 1.15;

  --motion-depth-ambient: 0;
  --motion-depth-content: 1;
  --motion-depth-chrome: 10;
  --motion-depth-overlay: 100;
  --motion-depth-ponto: 1000;

  --motion-energy: 1;

  /* Compatibilidade: o atalho antigo continua valendo. */
  --ease: var(--motion-dur-fast) ease;
}
```

## Em TS

```ts
// src/client/components/motion-tokens.ts — mesma escala do CSS, em números.
export const motion = {
  dur: {
    instant: 80,
    fast: 160,
    base: 240,
    slow: 320,
    travel: 420,
    long: 800,
    ambient: 2400,
  },
  ease: {
    ponto: "cubic-bezier(.2,.7,.2,1)",
    out: "cubic-bezier(.16,1,.3,1)",
    in: "cubic-bezier(.55,0,1,.45)",
    inOut: "cubic-bezier(.65,0,.35,1)",
    bounce: "cubic-bezier(.3,1.4,.5,1)",
  },
  delay: { step: 40 },
  stagger: { step: 30, max: 8 },
  dist: { xs: 2, sm: 6, md: 12, lg: 24, xl: 48 },
  scale: { press: 0.97, pop: 1.06, from: 0.92 },
  parallax: { far: 0.15, mid: 0.4, near: 1, front: 1.15 },
  depth: { ambient: 0, content: 1, chrome: 10, overlay: 100, ponto: 1000 },
  spring: {
    snappy: { stiffness: 400, damping: 30, mass: 1 },
    soft: { stiffness: 170, damping: 26, mass: 1 },
    bouncy: { stiffness: 300, damping: 15, mass: 1 },
    ponto: { stiffness: 260, damping: 22, mass: 1 },
  },
} as const;
```

Uma escala só, escrita duas vezes. Quem muda um valor muda nos dois (a implementação pode ter um
teste que compara os dois).

## Energia (humor global)

`--motion-energy` (e `energy` no TS) escala a **amplitude**, não o tempo:

| Escala com a energia                                  | Não escala                             |
| ----------------------------------------------------- | -------------------------------------- |
| distância, tamanho do overshoot, delta de escala      | duração (mudar o tempo muda o caráter) |
| velocidade do parallax, densidade de partículas       | família de curva                       |
| opacidade de camadas de ambiente, força do magnetismo | o que acontece (a sequência é a mesma) |

```css
.chip-enter {
  translate: 0 calc(var(--motion-dist-md) * var(--motion-energy));
  scale: calc(1 - (1 - var(--motion-scale-from)) * var(--motion-energy));
}
```

Humores sugeridos: `calmo` 0,6 · `padrão` 1 · `festa` 1,3. Quem escolhe o humor e quando (por
tela, por evento da sala, por ajuste pessoal) é decisão de produto: proponha, não decida.
**Energia 0 não é a variante reduzida.** A reduzida é desenhada à parte (abaixo); energia baixa é
só "mais calmo".

## Herança: cena → objeto

1. O objeto usa os tokens globais. Duração e curva que um token cobre **nunca** vão em número solto.
2. O objeto pode criar alias local (`--_lift`) para legibilidade, sempre apontando para um global.
3. Desvio é permitido com motivo: "este toggle usa 200 ms porque 160 parece seco e 240 parece
   lento ao lado do botão vizinho". Desvio que se repete em dois objetos vira token **novo**.
4. A cena pode mudar a energia de uma região (`.landing-hero { --motion-energy: 1.3 }`); os
   objetos dentro herdam pela cascata, sem saber de nada.

## Switch de preferência (já existe — não invente outro)

- Ajustes › Acessibilidade › **Reduzir movimento**: "Seguir o sistema" ou "Sempre".
- "Sempre" põe `data-motion="reduce"` no `<html>` (`applyMotion`). "Seguir o sistema" não põe nada:
  vale o `prefers-reduced-motion` do sistema. Por isso o CSS de cada variante reduzida tem **dois
  seletores**:

  ```css
  @media (prefers-reduced-motion: reduce) {
    .x {
      /* variante reduzida */
    }
  }
  :root[data-motion="reduce"] .x {
    /* a mesma variante */
  }
  ```

- JS pergunta `reducedMotion(win)`, que já soma os dois. Na janela PiP, passe a janela dela.
- Já existem regras globais que **zeram** transições e animações CSS nos dois modos
  (`styles.css`, `preferences.css`). Consequência de design: um "esmaecer de 150 ms" na variante
  reduzida não sai de `transition` CSS; a implementação faz com Web Animations API. Escreva a
  variante reduzida sabendo disso.
- Vocabulário das variantes: **estático** (estado final direto), **esmaecer** (só opacidade,
  ≤ 150 ms), **removido** (o efeito nem monta). Toda peça de movimento declara uma.
  No reduzido o Ponto não viaja, não cresce, não quica e não pulsa: aparece direto no lugar final.

## Efeitos fora de `transform`/`opacity`

Decisão 020: o padrão é animação completa; `transform`/`opacity` são o caminho barato, não um
limite. Efeito fora disso não pede aval; anote nesta tabela para o Frontend saber o custo:

| Efeito             | Propriedade               | Por que vale                 | Custo                      | Alternativa mais barata           |
| ------------------ | ------------------------- | ---------------------------- | -------------------------- | --------------------------------- |
| peso do "vio" vivo | `font-variation-settings` | a palavra respira com a fala | moderado (layout do texto) | trocar duas camadas com opacidade |

## Custo

| Nota     | Quer dizer                                                                                |
| -------- | ----------------------------------------------------------------------------------------- |
| barato   | só `transform`/`opacity`, poucos elementos, sem JS por quadro                             |
| moderado | JS por quadro (pointer, mola), dezenas de elementos, sem paint                            |
| pesado   | filtro/blur grande, canvas/WebGL em tela cheia, partículas, propriedade de layout em loop |

`clip-path`, traço SVG (`stroke-dashoffset`) e qualquer paint: permitidos, com a nota de custo.
Sobre vídeo, evite blur e `backdrop-filter` pesados.

Toda peça leva a nota. Na cena, some as camadas simultâneas (ver `atmosfera-e-transicoes.md`).
