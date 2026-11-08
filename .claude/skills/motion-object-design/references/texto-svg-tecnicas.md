# Texto, SVG, técnicas, bibliotecas e custo

Núcleo de conhecimento da `motion-object-design`. Cada técnica traz se fica no caminho barato
(`transform`/`opacity`) ou se é **exceção** (paint/layout): permitida (decisão 020), com o custo anotado.

## Texto

| Técnica                          | Ideia                                                            | Regra                   | Cuidados                                                                                |
| -------------------------------- | ---------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| Dividir (letras/palavras/linhas) | cada parte entra com stagger                                     | dentro                  | texto real fica legível para leitor de tela (`aria-label` no pai, partes `aria-hidden`) |
| Máscara de revelação             | o texto sobe de dentro de uma linha cortada (`overflow: hidden`) | dentro                  | a máscara não pode cortar acentos e descendentes                                        |
| Scramble                         | letras embaralham até formar a palavra                           | dentro (troca de texto) | só em palavra curta; nunca em texto que a pessoa precisa ler já                         |
| Fonte variável                   | peso/largura mudam (Bricolage tem eixos `wght`, `wdth`, `opsz`)  | **exceção**             | refaz o layout do texto; reserve a largura                                              |
| Contador / ticker de número      | dígitos rolam como odômetro (`translateY` por coluna)            | dentro                  | IBM Plex Mono + `tabular-nums`: largura fixa, sem pulo                                  |
| Máquina de escrever              | letras aparecem com `steps()` ou uma a uma                       | dentro (opacidade)      | cursor piscando no reduzido: parado                                                     |
| Letreiro (marquee)               | faixa que corre sem fim                                          | dentro                  | pausa no hover/foco; nunca com informação essencial                                     |

```html
<!-- Dividir com acessibilidade: o leitor de tela ouve a palavra inteira. -->
<h1 class="split" aria-label="Assistam junto">
  <span aria-hidden="true" style="--i:0">Assistam</span>
  <span aria-hidden="true" style="--i:1">junto</span>
</h1>
<style>
  .split span {
    display: inline-block;
    animation: sobe var(--motion-dur-slow) var(--motion-ease-out) both;
    animation-delay: calc(var(--i) * var(--motion-stagger-step) * 2);
  }
  @keyframes sobe {
    from {
      transform: translateY(0.6em);
      opacity: 0;
    }
  }
</style>
```

Exemplo com o Ponto: no "junto." da landing, o ponto final é o Ponto. Ele cai do alto, quica uma
vez sobre a linha de base e começa a respirar. As letras de "junto" se inclinam 2° na direção do
impacto e voltam (continuidade).

## SVG e ilustração

| Técnica                              | Como                                                              | Regra               | Custo                   |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------- | ----------------------- |
| Desenhar o traço                     | `stroke-dasharray` = comprimento; anima `stroke-dashoffset`       | **exceção** (paint) | barato em traço pequeno |
| Alternativa ao traço                 | revelar o traço com máscara que se move (`transform`)             | dentro              | barato                  |
| Morph de caminho                     | anima o `d` (mesmo número de pontos) ou biblioteca de morph       | **exceção**         | moderado                |
| Morph de forma                       | trocar formas com escala e opacidade cruzadas                     | dentro              | barato                  |
| Máscara e `clip-path`                | revelar por recorte (`inset()`, `circle()`)                       | **exceção** (paint) | barato/moderado         |
| Filtros (gooey, displacement, ruído) | `feGaussianBlur` + `feColorMatrix`, `feTurbulence`                | **exceção**         | pesado se animado       |
| Gradiente animado                    | mover a camada do gradiente, não as cores                         | dentro              | barato                  |
| Lottie / Rive                        | animação ilustrada; Rive com máquina de estado (humores do Ponto) | dependência         | moderado                |

Gooey com o Ponto: dois Pontos se aproximam e se fundem como gotas (pessoa entra na sala e o ponto
dela se junta ao grupo). Bonito, pesado (filtro). Anote o custo e ofereça a alternativa
barata: escala e opacidade cruzadas no instante do encontro.

## Técnicas (quando usar cada uma)

| Técnica                              | Use para                                                                | Observação                                          |
| ------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------- |
| `transition`                         | mudança de estado interrompível (hover, aberto/fechado)                 | redireciona no meio sem pulo                        |
| `@keyframes`                         | sequência fixa, loops                                                   | recomeça do zero se interrompida                    |
| `@property`                          | animar variável tipada (`<angle>`, `<number>`) que alimenta `transform` | animar uma variável que pinta (cor) é exceção       |
| `@starting-style`                    | entrada a partir de `display: none` ou de montagem                      | suporte bom nos motores atuais (confirmar)          |
| Web Animations API                   | sequência por código, `finished` como promessa, interrupção             | não é afetada pelas regras CSS que zeram transições |
| Scroll-driven (`animation-timeline`) | ligado à rolagem, no compositor                                         | suporte varia; fallback estático                    |
| View Transitions                     | trocar estado com elemento compartilhado                                | congela a imagem antiga; cuidado perto de vídeo     |
| FLIP                                 | o objeto muda de lugar no layout e anima a diferença                    | técnica do Ponto e do `WidgetFrame`                 |
| Canvas 2D                            | partículas, rastro, desenho livre num objeto pequeno                    | fora da regra; declare                              |
| WebGL / shader                       | brilho, distorção, material num objeto pequeno                          | pesado; só fora da sala                             |

```css
/* @property: girar o anel do Ponto carregando, sem JS e dentro da regra. */
@property --giro {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
.ponto-carrega {
  transform: rotate(var(--giro));
  animation: gira 1.2s linear infinite;
}
@keyframes gira {
  to {
    --giro: 360deg;
  }
}

/* @starting-style: o menu nasce do gatilho ao abrir. */
.menu[open] {
  transform: scale(1);
  opacity: 1;
  transition:
    transform var(--motion-dur-base) var(--motion-ease-out),
    opacity var(--motion-dur-fast);
  @starting-style {
    transform: scale(var(--motion-scale-from));
    opacity: 0;
  }
}
```

## Bibliotecas (confirmar versão na pesquisa; nenhuma aprovada)

No rascunho você pode usar; na spec, diga qual usaria em produção e o plano nativo.

| Biblioteca                                | Use quando                                             | Evite quando                                 |
| ----------------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| CSS nativo                                | quase sempre para objetos                              | física, gesto, sequência longa interrompível |
| Web Animations API                        | sequência por código sem dependência                   | —                                            |
| GSAP (SplitText, Flip, MorphSVG, DrawSVG) | texto dividido complexo, morph de SVG, linha do tempo  | o objeto cabe em CSS                         |
| Motion (motion.dev, antigo Framer Motion) | molas, gestos, layout animado em React                 | um efeito só                                 |
| Anime.js                                  | SVG e sequências leves                                 | já houver GSAP/Motion                        |
| Lottie                                    | ilustração vinda de After Effects                      | precisa reagir a estado                      |
| Rive                                      | personagem com máquina de estado (o Ponto com humores) | ícone simples                                |
| Theatre.js                                | autorar à mão uma sequência fina                       | interação comum                              |
| Three.js / R3F / OGL                      | objeto 3D (o Ponto como cubo na landing)               | dentro da sala                               |
| Tailwind / tailwindcss-animate            | não se aplica: o VIO usa CSS próprio                   | —                                            |

Nunca limite a ideia ao que uma biblioteca faz.

## Custo (preferência, não parede)

Marque cada animação: **barato** (só `transform`/`opacity`), **moderado** (JS por quadro, paint
pequeno), **pesado** (filtro/blur grande, canvas/WebGL, layout em loop). Se a técnica pesada deixa o
resultado claramente melhor, use e sinalize, para o Frontend otimizar se pedirem. Cuidados gerais:
`will-change` só durante a animação; blur e filtros grandes custam caro; nada de propriedade de
layout (`width`, `top`, `margin`) num loop.
