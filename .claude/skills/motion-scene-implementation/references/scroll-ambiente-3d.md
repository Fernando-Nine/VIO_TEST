# Rolagem, ambiente e 3D — código

Efeitos de cena montados sobre a fundação (`fundacao.md`): todo efeito entra por `registerEffect`
/ `useSceneEffect`, roda no `ticker` e lê os stores. Antes de codar, confira na spec: técnica,
custo, variante reduzida, custos declarados na spec.

**Onde cabe:** landing, Início, página de download, splash — à vontade. **Sala:** nada de ambiente
sobre vídeo ao vivo (só se a issue registrar o aval do usuário), nada que rode por quadro atrás de uma transmissão (`composicao-e-coreografia.md`
da `motion-scene-design` tem os tetos por superfície). Na dúvida, a sala fica quieta.

## 1. Rolagem

### Revelar ao entrar na vista (IntersectionObserver)

Barato e com fallback natural. A classe só liga a transição; o CSS reduzido deixa tudo visível.

```tsx
// RevealOnView.tsx — one observer for all reveals.
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

let observer: IntersectionObserver | undefined;
function observe(el: Element) {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        observer!.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  observer.observe(el);
  return () => observer!.unobserve(el);
}

export function Reveal({
  children,
  index = 0,
}: {
  children: ReactNode;
  index?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? observe(ref.current) : undefined), []);
  return (
    <div
      ref={ref}
      className="reveal"
      style={{ "--i": Math.min(index, 8) } as CSSProperties}
    >
      {children}
    </div>
  );
}
```

```css
.reveal {
  opacity: 0;
  transform: translateY(calc(var(--motion-dist-lg) * var(--motion-energy)));
  transition:
    opacity var(--motion-dur-slow) var(--motion-ease-out),
    transform var(--motion-dur-slow) var(--motion-ease-out);
  transition-delay: calc(var(--i, 0) * var(--motion-stagger-step));
}
.reveal.is-in {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
  }
}
:root[data-motion="reduce"] .reveal {
  opacity: 1;
  transform: none;
}
```

Sem JS (impressão, erro de script), o conteúdo não pode ficar invisível: se a página tiver risco
disso, ponha `opacity: 0` só sob uma classe que o JS acrescenta no `<html>`.

### Ligado à rolagem no compositor (scroll-driven)

Quando o progresso da rolagem controla a animação (barra de leitura, parallax de fundo).

```css
@supports (animation-timeline: view()) {
  .landing-fundo {
    animation: fundo-sobe linear both;
    animation-timeline: view();
    animation-range: entry 0% exit 100%;
  }
  @keyframes fundo-sobe {
    from {
      transform: translateY(
        calc(var(--motion-dist-xl) * var(--motion-parallax-far))
      );
    }
    to {
      transform: translateY(
        calc(-1 * var(--motion-dist-xl) * var(--motion-parallax-far))
      );
    }
  }
}
```

Suporte: Chromium (e, portanto, o WebView2 do app Windows) tem; confira o resto na pesquisa (MDN).
Fallback = estático, que já é a variante reduzida. **Cuidado:** a regra global do reduzido zera
`animation`, então esta já some no reduzido sem nada a mais.

### Parallax em JS (quando precisa de velocidade ou mola)

```ts
useSceneEffect(
  () => ({
    id: "landing-parallax",
    cost: "moderado",
    full: () => {
      const scroll = scrollOf(window);
      const release = scroll.retain();
      const layers = [
        ...root.querySelectorAll<HTMLElement>("[data-depth]"),
      ].map((el) => ({
        el,
        depth: Number(el.dataset.depth), // motion.parallax.* from the spec
      }));
      const amp = energy(root);
      const removeTick = ticker().add(() => {
        for (const { el, depth } of layers)
          el.style.transform = `translate3d(0, ${-scroll.state.y * depth * amp}px, 0)`;
      });
      return () => {
        removeTick();
        release();
        for (const { el } of layers) el.style.transform = "";
      };
    },
    // reduced omitted: layers stay where the layout puts them.
  }),
  [],
);
```

### Rolagem suave, seções presas, scroll horizontal

- **Rolagem suave tipo Lenis:** dependência não aprovada. Nativo: `scroll-behavior: smooth` só
  para âncoras (e `auto` no reduzido). Não sequestre a roda do mouse.
- **Seção presa (pinning):** `position: sticky` num contêiner alto + progresso por scroll-driven ou
  `scrollOf`. Nunca prenda a rolagem sem saída; teclado e leitor de tela continuam lineares.
- **Horizontal dentro do vertical:** um `sticky` com uma faixa movida por `translateX(progresso ×
largura)`. No celular, prefira empilhar.
- **Velocidade:** `scrollOf(win).state.velocity` alimenta inclinação ou estiramento (as linhas de
  velocidade do Ponto). Limite com `Math.max(-1, Math.min(1, v / 3000))`.

### Snap, progresso e armadilhas

- **Snap:** `scroll-snap-type: y proximity` (não `mandatory` em conteúdo de altura variável, que
  prende a pessoa). Sem JS.
- **Indicador de progresso:** barra com `transform: scaleX(var(--p))`, `transform-origin: left`,
  alimentada por `animation-timeline: scroll()` ou por `scrollOf().state.progress` no tick.
- **Âncoras:** link `#secao` precisa cair no lugar certo com seção presa e cabeçalho fixo
  (`scroll-margin-top`). Teste os links da landing depois de mexer na rolagem.
- **Teclado, Ctrl+F e leitor de tela:** a ordem do DOM continua a ordem de leitura; conteúdo
  revelado por rolagem existe no DOM desde o início (só invisível), para a busca da página achar.
- **Barra de endereço do celular:** ela muda `innerHeight` ao rolar. Use `100svh`/`100dvh` no CSS e
  não recalcule posições de parallax em cada resize só de altura (compare a largura).
- **Pulo de layout depois de recarregar:** a rolagem volta no meio da página antes das medidas:
  meça depois de `document.fonts.ready` e do primeiro `ResizeObserver`.
- **Sequestro de rolagem** (scroll-jacking): nada que impeça a pessoa de passar por uma seção na
  velocidade dela.

## 2. Ambiente

Coisas que vivem sozinhas no fundo: respiração, brilho, partículas, gradiente que anda.

| Peça                     | Técnica sem dependência                                                      | Custo    |
| ------------------------ | ---------------------------------------------------------------------------- | -------- |
| Respirar do Ponto parado | `@keyframes` em `transform: scale` (`--motion-dur-ambient`)                  | barato   |
| Gradiente que anda       | camada 200% maior com gradiente fixo, movida por `transform`                 | barato   |
| Grão / ruído             | PNG pequeno em mosaico, com `opacity`; ou canvas gerado uma vez              | barato   |
| Partículas               | canvas 2D no `ticker`, poucas centenas, DPR ≤ 2                              | moderado |
| Aurora / blur grande     | camada borrada **estática** movida por `transform` (nunca animar o `filter`) | moderado |
| Shader                   | WebGL puro (sem Three.js), um quad em tela cheia                             | pesado   |

### Partículas em canvas (modelo)

```ts
function particles(canvas: HTMLCanvasElement, count = 120) {
  const ctx = canvas.getContext("2d")!;
  const dots = Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    v: 0.01 + Math.random() * 0.03,
  }));
  const size = () => {
    canvas.width = canvas.clientWidth * viewport.dpr;
    canvas.height = canvas.clientHeight * viewport.dpr;
  };
  size();
  const onResize = new ResizeObserver(size);
  onResize.observe(canvas);
  const color = getComputedStyle(canvas).color; // read once, from a CSS token
  const removeTick = ticker().add((_, dt) => {
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    for (const d of dots) {
      d.y = (d.y - d.v * dt + 1) % 1;
      ctx.fillRect(d.x * w, d.y * h, 2 * viewport.dpr, 2 * viewport.dpr);
    }
  });
  return () => {
    removeTick();
    onResize.disconnect();
  };
}
// registerEffect({ id: "landing-particulas", cost: "moderado", full: () => particles(el),
//   reduced: () => { drawOnce(el); return () => {}; } });  // one static frame
```

Fora da vista, pause: um `IntersectionObserver` no canvas que chama o cleanup e remonta (ou um
`if (!visible) return` no tick). A aba oculta já pausa no ticker.

### Shader (WebGL puro) — só fora da sala

Contexto `webgl2` com `{ antialias: false, alpha: true, powerPreference: "low-power" }`, um
triângulo que cobre a tela, um uniform `u_time` vindo do `ticker`. Trate `webglcontextlost`
(desmonte e mostre o fundo estático). Resolução: `dpr` ≤ 1,5 para shader de fundo. Sem suporte →
a variante reduzida (imagem estática).

## 3. 3D

| Nível                  | Técnica                                                       | Dependência                      |
| ---------------------- | ------------------------------------------------------------- | -------------------------------- |
| Profundidade de cartão | `perspective` no pai + `rotateX/Y` + `translateZ` nas camadas | nenhuma                          |
| Inclinação pelo cursor | `pointer` do store → `rotateX/Y` com mola                     | nenhuma                          |
| Cubo do Ponto          | 6 faces em CSS 3D (`transform-style: preserve-3d`)            | nenhuma                          |
| Cena 3D real           | Three.js / R3F / OGL                                          | **não aprovada**: issue com aval |

```css
.cartao-3d {
  perspective: 800px;
}
.cartao-3d > .face {
  transform: rotateX(var(--_rx, 0deg)) rotateY(var(--_ry, 0deg));
  transform-style: preserve-3d;
  transition: transform var(--motion-dur-base) var(--motion-ease-out);
}
.cartao-3d .camada-frente {
  transform: translateZ(24px);
}
```

`--_rx`/`--_ry` vêm do efeito (pelo `style.setProperty` no tick), só com `viewport.finePointer`.
No reduzido, o efeito é removido e o cartão fica plano. `preserve-3d` com `overflow: hidden` no
mesmo elemento achata: separe.

### Reatividade global da cena

| Efeito                  | Fonte                                                | Como                                                            |
| ----------------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| Luz que segue o cursor  | `pointer` (só `viewport.finePointer`)                | camada com gradiente radial **movida** por `translate`          |
| Humor pela rolagem      | `scrollOf().state.progress`                          | troca de `--motion-energy` por seção (amplitude, não cor)       |
| Ambiente movido a dados | estado da sala (pessoas, fala)                       | lido do controller; poucas mudanças por segundo, não por quadro |
| Hora do dia             | `Date` uma vez ao montar                             | escolhe a variante; não anima durante a sessão                  |
| Orientação / tamanho    | `viewport` + `matchMedia("(orientation: portrait)")` | remonta o efeito com o tamanho novo                             |

Mudar a cor de fundo por rolagem tem custo de paint: permitido, mas cruzar duas camadas por `opacity` é mais barato.

### Carregar e descartar 3D/peças pesadas

- Módulo pesado (shader grande, cena 3D aprovada, player Lottie/Rive aprovado) entra por
  `import()` dinâmico dentro do `full()` do efeito, para não pesar no bundle inicial. Vite separa o
  chunk sozinho.
- Ao desmontar: `renderer.dispose()`, `geometry.dispose()`, `material.dispose()`, cada
  `texture.dispose()`, `gl.getExtension("WEBGL_lose_context")?.loseContext()`, e o canvas sai do DOM.
- Sem WebGL, contexto perdido ou movimento reduzido → imagem estática ou versão CSS.
- Não há SSR no VIO: `window` no topo de módulo funciona, mas ainda assim leia o DOM só ao montar.

## 4. Invariantes de mídia (nenhum efeito de cena os toca)

- Host de vídeo: nunca reparentar, clonar, nem escalar. Parallax, 3D e View Transitions não se
  aplicam a ele nem a um ancestral que o escale.
- `<audio>` do `RemoteVoice` continua montado; nenhum efeito o tira da árvore.
- Foco e layout mudam só a apresentação (PeerConnections, MediaStreams e players intocados).
- Efeito ligado à fala **lê** `useSpeaking`/`voiceLevel`; não cria analisador nem áudio.
