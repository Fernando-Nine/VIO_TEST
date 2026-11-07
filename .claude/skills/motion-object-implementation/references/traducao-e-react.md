# Da spec ao código, e padrões React

Núcleo da `motion-object-implementation`. A base (tokens, `useReducedMotion`, ticker, registro,
stores) é da `motion-scene-implementation` (`references/fundacao.md` dela). Se não existir ainda,
use o que já há (`motion.ts`, `--ease`) e crie só o token que faltar, no formato do sistema.

## 1. Traduzir cada campo da spec

| Na spec                                       | No código                                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| estado → estado com gatilho de ponteiro       | `transition` CSS em `:hover` (dentro de `@media (hover: hover)`), `:active`, `:focus-visible` |
| estado vindo do app (aberto, ao vivo)         | classe ou `data-state` no elemento + `transition`; o React só troca o atributo                |
| sequência fixa ou loop                        | `@keyframes` + `animation`                                                                    |
| sequência disparada por evento, interrompível | `el.animate(keyframes, options)`; `finished` para encadear                                    |
| entrada ao montar / sair de `display:none`    | `@starting-style`; ou `el.animate` no `useLayoutEffect`                                       |
| saída antes de desmontar                      | `usePresence` (`motion-scene-implementation/references/transicoes-e-carga.md`)                |
| mudou de lugar no layout                      | FLIP: mede antes, mede depois, anima a diferença com `transform`                              |
| variável que gira/escala (`<angle>`)          | `@property` + `@keyframes` na variável que alimenta `transform`                               |
| ligado à rolagem                              | `animation-timeline: view()` com `@supports`; senão `scrollOf` no ticker                      |
| mola `motion.spring.x`                        | `springEasing(motion.spring.x)` → `linear()` + duração; mola viva no ticker se o alvo muda    |
| token `--motion-dur-base` etc.                | `var(--motion-dur-base)` no CSS; `motion.dur.base` no TS                                      |
| variante reduzida                             | CSS com os dois seletores; JS com `reducedMotion(win)` / `useReducedMotion(win)`              |
| custo                                         | confirme na medição se for moderado ou pesado                                                 |
| exceção aprovada                              | implemente com o custo dito; comentário no CSS citando a issue                                |

## 2. Qual ferramenta para cada elemento

| Elemento                              | Padrão                             | Quando subir                                       |
| ------------------------------------- | ---------------------------------- | -------------------------------------------------- |
| Botão, toggle, campo, aba, chip       | CSS `transition`                   | WAAPI se a sequência tiver passos (sucesso → idle) |
| Menu, popover, dica                   | `@starting-style` + `transition`   | presença por WAAPI se a saída tiver forma própria  |
| Ícone (`lucide-react`)                | CSS no `<svg>` ou no wrapper       | traço desenhado = exceção (paint)                  |
| Número ao vivo (pessoas, ping, votos) | odômetro por coluna (`translateY`) | —                                                  |
| Texto de destaque (landing)           | dividir + `animation-delay`        | GSAP SplitText só com aval                         |
| O Ponto                               | `@keyframes` + WAAPI               | Rive (humores com máquina de estado) só com aval   |
| Ilustração pequena                    | SVG + CSS/WAAPI                    | Lottie só com aval                                 |
| Objeto 3D (o Ponto cubo)              | CSS 3D                             | Three.js só com aval, só fora da sala              |
| Partículas num objeto                 | canvas 2D no ticker                | —                                                  |

## 3. Tokens e switch dentro do componente

```css
/* Consumir tokens; energia escala a amplitude, não o tempo. */
.chip {
  transition:
    transform var(--motion-dur-fast) var(--motion-ease-out),
    opacity var(--motion-dur-fast) ease;
}
.chip[data-state="new"] {
  animation: chip-chega var(--motion-dur-slow) var(--motion-ease-bounce) both;
}
@keyframes chip-chega {
  from {
    opacity: 0;
    transform: translateY(calc(var(--motion-dist-sm) * var(--motion-energy)))
      scale(var(--motion-scale-from));
  }
}
/* Reduzido: os dois caminhos do switch. */
@media (prefers-reduced-motion: reduce) {
  .chip[data-state="new"] {
    animation: none;
  }
}
:root[data-motion="reduce"] .chip[data-state="new"] {
  animation: none;
}
```

```ts
// In JS: the window of the element (PiP has its own matchMedia).
const win = el.ownerDocument.defaultView ?? window;
if (reducedMotion(win)) {
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 }); // reduced fade: WAAPI on purpose
} else {
  el.animate(keyframes, {
    duration: motion.dur.base,
    easing: motion.ease.ponto,
  });
}
```

Lembretes: as regras globais do reduzido zeram `transition`/`animation` CSS, então o "esmaecer
≤ 150 ms" é sempre WAAPI; nunca `animationend`/`transitionend` como timer (bug 07.1).

## 4. Padrões React

**A animação não passa pelo render.** O React decide o estado (classe, `data-state`); o CSS ou a
WAAPI animam. Valor que muda a cada quadro vai por ref para `style.transform`, nunca por `useState`.

```tsx
// Event-driven animation with a ref; Strict Mode safe (cleanup cancels).
function SuccessPulse({ done }: { done: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!done || !el) return;
    const win = el.ownerDocument.defaultView ?? window;
    const a = reducedMotion(win)
      ? el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 150 })
      : el.animate(
          [
            { transform: "scale(1)" },
            { transform: `scale(${motion.scale.pop})` },
            { transform: "scale(1)" },
          ],
          { duration: motion.dur.base, easing: motion.ease.out },
        );
    return () => a.cancel();
  }, [done]);
  return <span ref={ref} className="ponto" aria-hidden="true" />;
}
```

- **`useLayoutEffect`** quando a animação precisa partir antes do primeiro paint (FLIP, entrada
  que não pode piscar no estado final). **`useEffect`** para o resto.
- **Strict Mode** (dev) monta, desmonta e monta: todo efeito devolve o cleanup (`a.cancel()`,
  remover ouvinte, `removeTick()`). Animação que aparece duas vezes = cleanup faltando.
- **Medir** com `getBoundingClientRect` no layout effect ou num `ResizeObserver`, não no render.
- **Lista que entra:** índice vira `--i` no `style` (máx. `motion.stagger.max`), o atraso é CSS.
- **Mídia:** nunca envolva host de vídeo, `RemoteVoice` ou `<audio>` em componente que desmonta,
  troca de pai ou clona para animar. Anime um irmão ou um wrapper que não mude a árvore deles.
- **PiP:** componente que pode ir para a janela PiP usa `el.ownerDocument.defaultView` para
  `reducedMotion`, `matchMedia`, `requestAnimationFrame` e `ticker(win)`.

**FLIP de um objeto** (mesmo padrão do `WidgetFrame`):

```ts
useLayoutEffect(() => {
  const el = ref.current;
  const before = last.current;
  if (!el || !before) return;
  const after = el.getBoundingClientRect();
  last.current = after;
  const dx = before.left - after.left;
  const dy = before.top - after.top;
  if ((!dx && !dy) || reducedMotion(el.ownerDocument.defaultView ?? window))
    return;
  el.animate(
    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
    { duration: motion.dur.base, easing: motion.ease.ponto },
  );
}, [position]);
```

## 5. O Ponto correndo (do objeto à cena)

O objeto define o corpo; a cena (`ponto-travel.ts`) define de onde e para onde. Para dar corpo à
viagem, gere os keyframes com a direção da viagem:

```ts
/** Body keyframes for a run from a to b: anticipation, stretch at the peak, squash on landing. */
export function pontoRun(
  a: { x: number; y: number },
  b: { x: number; y: number },
  lift = 24,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const angle = Math.atan2(dy, dx);
  const back = {
    x: a.x - Math.cos(angle) * motion.dist.xs,
    y: a.y - Math.sin(angle) * motion.dist.xs,
  };
  const mid = { x: a.x + dx * 0.55, y: a.y + dy * 0.55 - lift }; // arc
  const at = (p: { x: number; y: number }, sx: number, sy: number) =>
    `translate(${p.x}px, ${p.y}px) rotate(${angle}rad) scale(${sx}, ${sy}) rotate(${-angle}rad)`;
  return [
    { offset: 0, transform: at(a, 1, 1) },
    { offset: 0.12, transform: at(back, 0.92, 1.08) }, // anticipation
    { offset: 0.55, transform: at(mid, 1.2, 0.83) }, // stretch along the path
    { offset: 0.88, transform: at(b, 0.9, 1.1) }, // squash
    { offset: 1, transform: at(b, 1, 1) },
  ];
}
```

O `rotate · scale · rotate⁻¹` estica na direção da viagem sem girar o quadrado. Os pontos são o
canto do viajante (centro − metade do tamanho); se origem e destino têm tamanhos diferentes,
acrescente no fim o `scale(s)` interpolado entre os dois, como em `ponto-travel.ts`. `lift` e as
escalas vêm da spec; multiplique `lift` pela energia da região. No reduzido, nada disso: o
viajante aparece no destino.

## 6. Se uma biblioteca for aprovada (só então)

- **GSAP:** `useGSAP` (pacote `@gsap/react`) ou `gsap.context(() => {...}, ref)` + `ctx.revert()`
  no cleanup; `gsap.matchMedia()` para o reduzido, ligado a `reducedMotion()` (não à media query
  sozinha). Registre plugins uma vez (`gsap.registerPlugin`).
- **Motion** (`motion/react`): `MotionConfig reducedMotion` ligado ao `useReducedMotion` do
  `motion.ts`, não ao detector próprio da biblioteca; `AnimatePresence` substitui o `usePresence`.
- **Lottie/Rive:** carregue o player por `import()`; pause fora da vista; no reduzido, o primeiro
  quadro (ou o estado parado da máquina do Rive).
- Confira versão e forma de import na pesquisa: nomes de pacote mudam (ex.: `framer-motion` →
  `motion`).
