# Princípios, tempo, curvas e molas

Núcleo de conhecimento da `motion-object-design`. Exemplos com o Ponto sempre que possível.
Tokens citados (`--motion-*`) seguem `motion-scene-design/references/sistema.md`.

## Os 12 princípios da Disney na interface

| Princípio                      | Na interface                                                               | Com o Ponto                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1. Comprimir e esticar         | a forma muda com a velocidade e o impacto, mantendo o volume (`sx·sy ≈ 1`) | estica na direção da viagem no pico (`scale(1.2, .83)`), amassa ao pousar (`scale(.9, 1.1)`) |
| 2. Antecipação                 | um pequeno movimento contrário antes da ação principal                     | recua 2 px (`--motion-dist-xs`) antes de partir                                              |
| 3. Encenação                   | uma coisa por vez, no lugar certo, para o olho saber onde ir               | enquanto ele viaja, o resto da tela fica quieto                                              |
| 4. Direto vs. pose a pose      | pose a pose = keyframes; direto = física/procedural quadro a quadro        | viagem é pose a pose (origem → destino); a respiração parada pode ser procedural             |
| 5. Continuidade e sobreposição | partes param em tempos diferentes; o que vem atrás chega depois            | o Ponto para; o widget que nasce dele assenta 40 ms depois                                   |
| 6. Aceleração e desaceleração  | nada começa nem para de repente                                            | `--motion-ease-ponto`: arranca rápido, pousa macio                                           |
| 7. Arcos                       | trajetórias naturais são curvas, não retas                                 | entre dois pontos distantes, sobe um pouco no meio (keyframe intermediário)                  |
| 8. Ação secundária             | um detalhe que reforça a principal sem competir                            | ao pousar, um anel quase invisível se abre e some                                            |
| 9. Tempo                       | a duração define peso e humor                                              | perto = 260 ms; longe = 420 ms; nunca o mesmo tempo para qualquer distância                  |
| 10. Exagero                    | amplificar para ser lido; a dose depende do lugar                          | na landing exagera (energia 1,3); na sala, quase nada                                        |
| 11. Desenho sólido             | volume, luz e perspectiva coerentes                                        | o canto arredondado e a cor não mudam no meio da viagem                                      |
| 12. Apelo                      | o objeto tem carisma, dá vontade de olhar                                  | o Ponto é um amiguinho: tem intenção, não só deslocamento                                    |

Uso: escolha 1–3 princípios por conceito e diga quais. Mais que isso vira ruído.

```css
/* Antecipação + esticar + amassar: o Ponto correndo para a direita (rascunho). */
@keyframes ponto-corre {
  0% {
    transform: translateX(0) scale(1, 1);
  }
  12% {
    transform: translateX(-2px) scale(0.92, 1.08);
  } /* antecipa e se encolhe */
  55% {
    transform: translateX(60%) scale(1.2, 0.83);
  } /* pico: estica */
  88% {
    transform: translateX(100%) scale(0.9, 1.1);
  } /* pousa: amassa */
  100% {
    transform: translateX(100%) scale(1, 1);
  }
}
.ponto.is-running {
  animation: ponto-corre var(--motion-dur-travel) var(--motion-ease-ponto) both;
}
```

## Durações por tipo de interação

| Interação                        | Faixa                          | Token sugerido         | Nota                                            |
| -------------------------------- | ------------------------------ | ---------------------- | ----------------------------------------------- |
| Pressionar (feedback de clique)  | 60–120 ms                      | `instant`              | precisa parecer imediato                        |
| Hover, foco, cor                 | 120–200 ms                     | `fast`                 | sair do hover pode ser mais lento que entrar    |
| Toggle, checkbox, aba            | 160–260 ms                     | `fast`/`base`          |                                                 |
| Tooltip, popover, menu           | 150–240 ms in · 100–160 ms out | `base` / `fast`        | a segunda dica seguida aparece sem atraso       |
| Chip entra/sai                   | 200–320 ms                     | `slow` in · `fast` out | pessoa chega com quique (`bounce`)              |
| Modal, gaveta                    | 240–360 ms                     | `base`/`slow`          |                                                 |
| Viagem do Ponto                  | 260–420 ms                     | `travel`               | proporcional à distância; teto da sequência 800 |
| Contador, número                 | 400–1200 ms                    | —                      | depende do salto; nunca segura a leitura        |
| Loop ambiente (respirar, pulsar) | 2–6 s                          | `ambient`              | lento o bastante para não chamar                |

Regras de bolso: saída ≈ 60–80 % da entrada; o que o usuário faz 100 vezes por dia anima menos ou
não anima; o que é raro (primeira entrada) pode ser mais longo e mais teatral.

## Famílias de curva

| Curva                 | Quando                                               | Token                   |
| --------------------- | ---------------------------------------------------- | ----------------------- |
| ease-out              | entrar, responder a uma ação (chega rápido, assenta) | `--motion-ease-out`     |
| ease-in               | sair (ganha velocidade e vai embora)                 | `--motion-ease-in`      |
| ease-in-out           | mover algo que já está na tela de A para B           | `--motion-ease-in-out`  |
| a curva do Ponto      | tudo que o Ponto conduz                              | `--motion-ease-ponto`   |
| overshoot             | chegada com vida (passa e volta)                     | `--motion-ease-bounce`  |
| linear                | só rotação contínua, progresso, loops de ambiente    | `linear`                |
| mola                  | interrompível, segue o dedo/cursor, física           | `motion.spring.*`       |
| `linear()` com pontos | mola ou quique **em CSS puro**                       | gerado a partir da mola |
| `steps(n)`            | relógio, máquina de escrever, sprite                 | —                       |

`cubic-bezier` próprio: os dois pontos de controle definem a saída e a chegada. `(.2,.7,.2,1)` sobe
cedo (arranque) e encosta no 1 devagar (pouso). Y acima de 1 passa do alvo (overshoot). Desenhe a
curva em cubic-bezier.com e cole os números na spec, com o motivo.

`linear()` (CSS) aceita uma lista de pontos e desenha qualquer forma, inclusive mola com
oscilação:

```css
/* Quique curto com uma oscilação (aproximação de mola com ζ ≈ 0,5). */
--_quique: linear(0, 0.35 8%, 0.82 18%, 1.08 30%, 1.02 42%, 0.98 56%, 1);
```

Na spec, prefira dar a **mola** (`stiffness`, `damping`, `mass`); o Frontend gera o `linear()`.

## Molas

- **stiffness** (rigidez): quanto puxa para o alvo. Mais alto = mais rápido.
- **damping** (amortecimento): quanto freia. Mais baixo = mais oscilação.
- **mass** (massa): inércia. Mais alto = mais pesado e lento para começar e parar.
- **ζ = damping / (2·√(stiffness·mass))**: < 1 oscila; = 1 chega sem passar; > 1 arrasta.

Quando escolher mola: o movimento pode ser **interrompido** no meio (o alvo muda enquanto anda), segue
o ponteiro ou o dedo, ou precisa de física (arremesso, soltar). Mola não tem duração fixa: a spec
dá os parâmetros e um "assenta em ~N ms" para referência.

| Preset   | Uso                                            |
| -------- | ---------------------------------------------- |
| `snappy` | botão magnético, toggle, coisa pequena e firme |
| `soft`   | painel, cartão, o que não deve passar do alvo  |
| `bouncy` | celebração, o Ponto feliz                      |
| `ponto`  | pouso do Ponto com vida                        |

```js
// Mola mínima para o rascunho (Artifact), sem biblioteca: integra por quadro.
function spring({ stiffness = 260, damping = 22, mass = 1 } = {}) {
  let x = 0,
    v = 0,
    target = 0;
  return {
    set(t) {
      target = t;
    },
    step(dt) {
      // dt em segundos; limite para não explodir
      dt = Math.min(dt, 1 / 30);
      const a = (-stiffness * (x - target) - damping * v) / mass;
      v += a * dt;
      x += v * dt;
      return x;
    },
  };
}
```

## Tempo como personalidade

O mesmo deslocamento com três tempos vira três personagens:

- 180 ms, `snappy`: eficiente, profissional.
- 320 ms, `ponto`: vivo, simpático (o padrão do VIO).
- 600 ms, `bouncy` com antecipação: brincalhão, de festa (landing, celebração).

Proponha conceitos que diferem em personalidade, não só em número.
