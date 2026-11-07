# Fundação de movimento — código

A base que a `motion-scene-implementation` constrói **primeiro** e que a
`motion-object-implementation` usa. Tudo mora junto de `src/client/components/motion.ts`, que já é
a fonte única da preferência: esta base **estende** esse arquivo, nunca cria um segundo switch.

| Peça                | Arquivo sugerido                          | Expõe                                                                 |
| ------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| Tokens CSS          | `:root` de `src/client/styles.css`        | `--motion-*`, `--motion-energy`; `--ease` mantido                     |
| Tokens TS           | `src/client/components/motion-tokens.ts`  | `motion`, `springEasing()`, `energy()`                                |
| Switch (já existe)  | `src/client/components/motion.ts`         | `applyMotion`, `reducedMotion` + `onMotionChange`, `useReducedMotion` |
| Ticker único        | `src/client/components/motion-ticker.ts`  | `ticker(win).add(fn)`                                                 |
| Registro de efeitos | `src/client/components/motion-effects.ts` | `registerEffect()`, `useSceneEffect()`                                |
| Stores globais      | `src/client/components/motion-stores.ts`  | `pointer`, `trackPointer()`, `scrollOf()`, `viewport`                 |

Nomes e lugares são sugestão: se o Frontend já organizou de outro jeito, siga o que existe. Criou
arquivo? Atualize `docs/catalogo/mapa.md` e os itens 14 (Movimento) e 15 (Ponto) de
`docs/catalogo/07-cliente-e-interface.md`.

## 1. Tokens

CSS: o bloco de `.claude/skills/motion-scene-design/references/sistema.md` (seção "Em CSS"), ou o
de `docs/design/movimento.md` quando existir — ele vence. Mantenha `--ease` como alias:
`--ease: var(--motion-dur-fast) ease;` (dezenas de regras usam).

TS — mesma escala, mais o gerador de mola:

```ts
// src/client/components/motion-tokens.ts
export type Spring = { stiffness: number; damping: number; mass: number };

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
} as const satisfies Record<string, unknown>;

/**
 * Simulates a 0→1 spring and returns a CSS `linear()` easing plus the time it takes to settle,
 * so a spring from the spec can run in CSS or in the Web Animations API.
 */
export function springEasing(
  { stiffness, damping, mass }: Spring,
  { step = 1 / 120, maxStops = 40, epsilon = 0.001 } = {},
) {
  let x = 0;
  let v = 0;
  let t = 0;
  const samples = [0];
  while (t < 4) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * step; // semi-implicit Euler: stable for UI springs
    x += v * step;
    t += step;
    samples.push(x);
    if (Math.abs(1 - x) < epsilon && Math.abs(v) < epsilon) break;
  }
  const last = samples.length - 1;
  samples[last] = 1;
  const every = Math.max(1, Math.ceil(last / maxStops));
  const stops: number[] = [];
  for (let i = 0; i < last; i += every) stops.push(i);
  stops.push(last);
  const easing = `linear(${stops
    .map((i) => `${+samples[i].toFixed(4)} ${+((i / last) * 100).toFixed(2)}%`)
    .join(", ")})`;
  return { easing, duration: Math.round(t * 1000) };
}

/** Current energy (0–1.5) at an element, as the CSS cascade resolves it. */
export function energy(el: Element = document.documentElement) {
  const win = el.ownerDocument.defaultView ?? window;
  const value = parseFloat(
    win.getComputedStyle(el).getPropertyValue("--motion-energy"),
  );
  return Number.isFinite(value) ? value : 1;
}
```

A duração devolvida é até assentar a 0,1% (`soft` ≈ 1 s, `ponto` ≈ 770 ms), mas quase todo o
movimento acontece no primeiro terço. Para casar com um token de tempo, passe `epsilon: 0.01`
(`ponto` cai para ~520 ms, `snappy` para ~450 ms) e diga qual usou.

Teste puro (sem navegador), por exemplo `tests/motion-tokens.test.ts`: `springEasing` termina em 1,
começa em 0, tem paradas em ordem crescente de %; o `bouncy` passa de 1 em algum ponto e o `soft`
não; os valores do TS batem com o CSS (leia `styles.css` e compare as variáveis).

**Energia.** Escala amplitude, nunca a duração. Em CSS: `calc(var(--motion-dist-md) *
var(--motion-energy))`. Por região: `.landing-hero { --motion-energy: 1.3; }`. Em JS, leia
`energy(el)` uma vez ao montar o efeito (não a cada quadro: `getComputedStyle` custa).

## 2. Switch — estender `motion.ts`

`reducedMotion()` responde "agora". Efeito longo (ticker, ambiente) precisa saber quando muda.
Acrescente ao `motion.ts` existente (sem mexer em `applyMotion`/`reducedMotion`):

```ts
// src/client/components/motion.ts — additions
import { useSyncExternalStore } from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/** Calls `listener` whenever reduced motion turns on or off (system setting or Ajustes). */
export function onMotionChange(
  listener: (reduced: boolean) => void,
  win: Window = window,
) {
  const media = win.matchMedia(REDUCE_QUERY);
  const notify = () => listener(reducedMotion(win));
  // The Ajustes flag lives on the main document, also for the PiP window.
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  media.addEventListener("change", notify);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", notify);
  };
}

/** React: re-renders when reduced motion changes. Use for structure, not per frame. */
export function useReducedMotion(win: Window = window) {
  return useSyncExternalStore(
    (onChange) => onMotionChange(onChange, win),
    () => reducedMotion(win),
  );
}
```

**Por que dois seletores em todo CSS reduzido:** `data-motion="reduce"` só existe com "Sempre";
com "Seguir o sistema" vale a media query. Unificar num seletor só (espelhar o sistema em
`data-motion`) muda a cascata das regras globais de `styles.css` e `preferences.css` e mexe no bug
07.1 do catálogo; só numa issue própria.

**Regras globais que já existem** (não as afrouxe): no reduzido, `styles.css` põe
`animation: none !important; transition: none !important` e `preferences.css` põe as durações em
0,01 ms. Consequências práticas:

1. O "esmaecer de 150 ms" da variante reduzida **não** sai de `transition` CSS: faça com
   `el.animate()` (a Web Animations API não é afetada por essas propriedades CSS).
2. Nunca use `animationend`/`transitionend` como timer de lógica (bug 07.1: com `none` o evento não
   vem; com 0,01 ms vem na hora). Use `animation.finished` de uma animação WAAPI, ou um prazo em JS.

## 3. Ticker único

Um `requestAnimationFrame` por janela, para todos os efeitos de cena. Para quando ninguém usa e
quando a aba fica oculta. Por janela porque a janela PiP tem o próprio `requestAnimationFrame` (e a
aba principal pode estar oculta enquanto a PiP está à vista).

```ts
// src/client/components/motion-ticker.ts
export type Tick = (time: number, dt: number) => void;

function createTicker(win: Window) {
  const subscribers = new Set<Tick>();
  let frame = 0;
  let last = 0;
  const loop = (time: number) => {
    const dt = Math.min((time - last) / 1000, 1 / 20); // clamp after a stall
    last = time;
    for (const fn of subscribers) fn(time, dt);
    frame = subscribers.size ? win.requestAnimationFrame(loop) : 0;
  };
  const start = () => {
    if (frame || !subscribers.size || win.document.hidden) return;
    last = win.performance.now();
    frame = win.requestAnimationFrame(loop);
  };
  const stop = () => {
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0;
  };
  win.document.addEventListener("visibilitychange", () =>
    win.document.hidden ? stop() : start(),
  );
  return {
    /** Adds a per-frame callback; returns its removal. */
    add(fn: Tick) {
      subscribers.add(fn);
      start();
      return () => {
        subscribers.delete(fn);
        if (!subscribers.size) stop();
      };
    },
    get size() {
      return subscribers.size;
    },
  };
}

const tickers = new WeakMap<Window, ReturnType<typeof createTicker>>();
export function ticker(win: Window = window) {
  let t = tickers.get(win);
  if (!t) tickers.set(win, (t = createTicker(win)));
  return t;
}
```

Regras: dentro do tick, **leia** stores e **escreva** só `style.transform`/`style.opacity` (ou
variáveis CSS que alimentam `transform`); nada de `getBoundingClientRect` a cada quadro (meça no
resize); nada de `setState` do React por quadro.

## 4. Registro de efeitos de cena

Todo efeito de cena (ambiente, parallax, linhas de velocidade) entra por aqui: um lugar para montar,
trocar para a variante reduzida quando o switch muda, desmontar e contar o custo.

```ts
// src/client/components/motion-effects.ts
import { useEffect, type DependencyList } from "react";
import { onMotionChange, reducedMotion } from "./motion";

export type Cost = "barato" | "moderado" | "pesado";
export type SceneEffect = {
  id: string;
  cost: Cost;
  /** Mounts the full version and returns its cleanup. */
  full: () => () => void;
  /** Reduced variant from the spec (static or fade). Omitted = removed in reduced mode. */
  reduced?: () => () => void;
};

const active = new Map<string, SceneEffect>();

export function registerEffect(effect: SceneEffect, win: Window = window) {
  let cleanup: (() => void) | undefined;
  const mount = (reduced: boolean) => {
    cleanup?.();
    cleanup = (reduced ? effect.reduced : effect.full)?.();
  };
  mount(reducedMotion(win));
  const unwatch = onMotionChange(mount, win);
  active.set(effect.id, effect);
  if (import.meta.env.DEV) {
    const heavy = [...active.values()].filter((e) => e.cost === "pesado");
    if (heavy.length > 1)
      console.warn(
        "motion: mais de um efeito pesado",
        heavy.map((e) => e.id),
      );
  }
  return () => {
    unwatch();
    cleanup?.();
    cleanup = undefined;
    active.delete(effect.id);
  };
}

/** Lists mounted effects, for the scene budget and for debugging. */
export const activeEffects = () => [...active.values()];

/** React: mounts a scene effect for the component's lifetime (Strict Mode safe). */
export function useSceneEffect(
  make: () => SceneEffect | undefined,
  deps: DependencyList,
) {
  useEffect(() => {
    const effect = make();
    return effect ? registerEffect(effect) : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
```

No Strict Mode (dev) o React monta, desmonta e monta de novo: com o cleanup acima, o efeito
aparece uma vez só. Se aparecer duas, o cleanup está faltando algo.

## 5. Stores globais (um ouvinte, muitos leitores)

Um `pointermove`, um `scroll` por contêiner, um `resize` para o app todo. Os efeitos leem os
valores dentro do ticker; nada re-renderiza.

```ts
// src/client/components/motion-stores.ts
import { ticker } from "./motion-ticker";

/** Attaches on first use and detaches after the last user releases. */
function refCounted(attach: () => () => void) {
  let users = 0;
  let detach: (() => void) | undefined;
  return () => {
    if (users++ === 0) detach = attach();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--users === 0) {
        detach?.();
        detach = undefined;
      }
    };
  };
}

export const pointer = { x: 0, y: 0, active: false };
export const trackPointer = refCounted(() => {
  const move = (e: PointerEvent) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = e.pointerType === "mouse" || e.pointerType === "pen";
  };
  const leave = () => (pointer.active = false);
  window.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);
  return () => {
    window.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", leave);
  };
});

export type ScrollState = { y: number; velocity: number; progress: number };
const scrolls = new WeakMap<
  Element | Window,
  { state: ScrollState; retain: () => () => void }
>();

/** Scroll position, velocity (px/s) and progress (0–1) of one scroll container. */
export function scrollOf(target: HTMLElement | Window = window) {
  let entry = scrolls.get(target);
  if (!entry) {
    const state: ScrollState = { y: 0, velocity: 0, progress: 0 };
    const read = () => {
      const el = target instanceof Window ? document.scrollingElement! : target;
      state.y = el.scrollTop;
      const room = el.scrollHeight - el.clientHeight;
      state.progress = room > 0 ? state.y / room : 0;
    };
    const retain = refCounted(() => {
      let previous = 0;
      read();
      previous = state.y;
      target.addEventListener("scroll", read, { passive: true });
      const removeTick = ticker().add((_, dt) => {
        const raw = dt > 0 ? (state.y - previous) / dt : 0;
        state.velocity += (raw - state.velocity) * 0.2; // smoothed
        previous = state.y;
      });
      return () => {
        target.removeEventListener("scroll", read);
        removeTick();
      };
    });
    scrolls.set(target, (entry = { state, retain }));
  }
  return entry;
}

export const viewport = {
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: Math.min(window.devicePixelRatio || 1, 2),
  finePointer: window.matchMedia("(hover: hover) and (pointer: fine)").matches,
};
window.addEventListener("resize", () => {
  viewport.width = window.innerWidth;
  viewport.height = window.innerHeight;
  viewport.dpr = Math.min(window.devicePixelRatio || 1, 2);
});
```

Uso típico num efeito:

```ts
const releasePointer = trackPointer();
const removeTick = ticker().add(() => {
  if (!pointer.active) return;
  layer.style.transform = `translate(${(pointer.x / viewport.width - 0.5) * 12}px, 0)`;
});
return () => {
  removeTick();
  releasePointer();
};
```

## 6. O que a fundação entrega ao objeto

Ao terminar a base, o relatório lista para a `motion-object-implementation`: os nomes dos tokens
(CSS e TS), `useReducedMotion`/`reducedMotion`, `ticker`, `registerEffect`/`useSceneEffect`,
`pointer`/`scrollOf`/`viewport`, e onde mora o viajante do Ponto (`transicoes-e-carga.md`).
