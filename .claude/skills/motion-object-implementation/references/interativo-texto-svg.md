# Interativo, tempo real, texto, SVG e canvas — código

Núcleo da `motion-object-implementation`. Efeitos por quadro usam o `ticker` e o store `pointer`
da base (`motion-scene-implementation/references/fundacao.md`); nunca um `rAF` próprio por
componente.

## 1. Ponteiro com suavização

Lerp (`x += (alvo − x) · k`) para seguir com atraso macio; mola quando precisa de inércia e
passar do alvo. Em ambos: grave o alvo no evento, mova no tick, pare o tick quando assentar.

```ts
/** Moves `el` toward a target with lerp on the shared ticker; stops when settled. */
export function follower(el: HTMLElement, k = 0.18) {
  let x = 0,
    y = 0,
    tx = 0,
    ty = 0;
  let remove: (() => void) | undefined;
  const win = el.ownerDocument.defaultView ?? window;
  const tick = () => {
    x += (tx - x) * k;
    y += (ty - y) * k;
    el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    if (Math.abs(tx - x) + Math.abs(ty - y) < 0.1) {
      remove?.();
      remove = undefined;
    }
  };
  return {
    to(nx: number, ny: number) {
      tx = nx;
      ty = ny;
      remove ??= ticker(win).add(tick);
    },
    stop() {
      remove?.();
      el.style.transform = "";
    },
  };
}
```

### Botão magnético (o Ponto puxado pelo cursor)

```tsx
export function Magnetic({
  children,
  strength = 0.25,
}: {
  children: ReactNode;
  strength?: number;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = host.current;
    const dot = el?.querySelector<HTMLElement>("[data-ponto]");
    if (!el || !dot || reduced || !viewport.finePointer) return; // touch: no magnet
    const f = follower(dot);
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect(); // one read per event, no write in between
      const max = motion.dist.sm;
      const clamp = (v: number) => Math.max(-max, Math.min(max, v));
      f.to(
        clamp((e.clientX - (r.left + r.width / 2)) * strength),
        clamp((e.clientY - (r.top + r.height / 2)) * strength),
      );
    };
    const leave = () => f.to(0, 0);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      f.stop();
    };
  }, [reduced, strength]);
  return (
    <span ref={host} className="magnetic">
      {children}
    </span>
  );
}
```

### Inclinação e holofote

- **Tilt:** grave `--_rx`/`--_ry` com `el.style.setProperty` no tick; o CSS faz
  `transform: perspective(800px) rotateX(var(--_rx)) rotateY(var(--_ry))`. Limite a ±6°.
- **Holofote:** uma camada filha com gradiente radial **fixo**, movida por `translate` até o
  cursor (custo baixo). Recalcular `background` a cada quadro é paint (custo maior).
- Os dois só com `viewport.finePointer`; no reduzido, removidos.

## 2. Arrastar e gestos

```ts
// Drag with pointer capture; 1:1 with the finger, release with velocity.
el.style.touchAction = "none"; // or "pan-y" for horizontal swipes inside a vertical page
el.addEventListener("pointerdown", (e) => {
  el.setPointerCapture(e.pointerId);
  const start = { x: e.clientX, y: e.clientY };
  let last = { x: e.clientX, t: e.timeStamp },
    vx = 0;
  const move = (m: PointerEvent) => {
    const dx = m.clientX - start.x;
    vx = (m.clientX - last.x) / Math.max(1, m.timeStamp - last.t); // px/ms
    last = { x: m.clientX, t: m.timeStamp };
    el.style.transform = `translateX(${rubber(dx, 120)}px)`;
  };
  const up = () => {
    el.removeEventListener("pointermove", move);
    const dismiss =
      Math.abs(vx) > 0.6 || Math.abs(last.x - start.x) > el.offsetWidth / 2;
    settle(el, dismiss ? Math.sign(vx || 1) * el.offsetWidth : 0); // spring via springEasing
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up, { once: true });
  el.addEventListener("pointercancel", up, { once: true });
});
/** Edge resistance: follows freely up to `limit`, then slows down. */
const rubber = (d: number, limit: number) =>
  Math.abs(d) < limit
    ? d
    : Math.sign(d) * (limit + (Math.abs(d) - limit) * 0.3);
```

- Arrasto de widget no canvas já existe (`@dnd-kit/react`, `strip-input.ts`): siga o que está lá e
  respeite o invariante (não reparentar host, não clonar vídeo no drag).
- **Long-press** = menu de botão direito no toque: mostre o progresso (algo que cresce por
  `scale`) e cancele se o dedo andar mais que ~8 px.
- Nunca anime contra o gesto (pinch, rolagem do sistema).

## 3. Dados ao vivo

### Odômetro (contador de pessoas, ping, votos)

```tsx
/** Each digit is a column of 0–9 moved by translateY; widths are fixed (tabular-nums). */
export function Odometer({ value }: { value: number }) {
  const digits = String(value).split("");
  return (
    <span className="odometro" aria-label={String(value)} role="img">
      {digits.map((d, i) => (
        <span
          key={digits.length - i}
          className="odometro-coluna"
          aria-hidden="true"
        >
          <span style={{ transform: `translateY(${-Number(d) * 10}%)` }}>
            0123456789
          </span>
        </span>
      ))}
    </span>
  );
}
```

```css
.odometro {
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
}
.odometro-coluna {
  display: inline-block;
  height: 1lh;
  overflow: hidden;
}
.odometro-coluna > span {
  display: block;
  width: 1ch;
  line-height: 1lh;
  word-break: break-all;
  transition: transform var(--motion-dur-slow) var(--motion-ease-ponto);
}
@media (prefers-reduced-motion: reduce) {
  .odometro-coluna > span {
    transition: none;
  }
}
:root[data-motion="reduce"] .odometro-coluna > span {
  transition: none;
}
```

A `key` contada da direita mantém as unidades estáveis quando o número ganha um dígito. Ping que
muda a cada segundo: anime só se o salto for grande, ou não anime (lido 100× por dia).

### Fala (invariante: só ler)

- `useSpeaking(stream, muted, localLevel)` em `Media.tsx` devolve **booleano**; as listas já põem
  a classe `.speaking`. Anime a partir dessa classe (CSS), sem criar nada novo.
- Nível contínuo (0–1) existe só para a pessoa local: `engine.captures.voiceLevel`. Leia no
  `ticker`, suavize e escreva `transform`:

```ts
const removeTick = ticker(win).add(() => {
  level += (engine.captures.voiceLevel - level) * 0.3;
  dot.style.transform = `scale(${1 + level * 0.4})`;
});
```

- Nunca crie `AudioContext`, analisador ou `<audio>` para animar; nunca mova, desmonte ou esconda
  com `display: none` o `<audio>` do `RemoteVoice` (o indicador remoto depende dele tocando).

### Tamanho do contêiner

`ResizeObserver` mede; o layout muda sem animação; se a spec pede, anime só a apresentação (FLIP).
Prefira container queries no CSS para trocar a forma do objeto.

## 4. Texto

**Dividir com acessibilidade:** o leitor de tela lê uma cópia inteira escondida (`.sr-only`, já
existe em `room.css`); as partes animadas são `aria-hidden`.

```tsx
export function SplitWords({ text }: { text: string }) {
  return (
    <span className="split">
      <span className="sr-only">{text}</span>
      {text.split(" ").map((w, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ "--i": Math.min(i, motion.stagger.max) } as CSSProperties}
        >
          {w}{" "}
        </span>
      ))}
    </span>
  );
}
```

Divida por palavra ou
linha, não por letra, em português com acento (a letra separada pode quebrar a combinação).
Máscara de revelação: `overflow: hidden` com `padding-block` para não cortar acentos e
descendentes. Fonte variável (eixos da Bricolage) animada tem custo de layout (refaz o texto).

## 5. SVG

- **Traço desenhado** (`stroke-dashoffset`) é paint (custo maior). Alternativa barata: uma máscara
  (`<mask>` com um retângulo) movida por `transform` revela o traço.
- **Morph de caminho** (animar `d`): custo de paint; mesmo número de pontos nos dois caminhos. Alternativa barata:
  cruzar duas formas com `scale` + `opacity`.
- `lucide-react`: o `<svg>` aceita `className`; anime o wrapper ou o `<svg>` inteiro por
  `transform` (`transform-box: fill-box; transform-origin: center` para girar no centro).
- Filtro animado (gooey, displacement) é pesado: permitido (decisão 020), mas nunca sobre vídeo na sala; anote o custo.

## 6. Canvas pequeno num objeto

Rastro do Ponto, confete de celebração: canvas do tamanho do objeto (mais a folga), DPR ≤ 2,
desenha no `ticker`, desmonta ao terminar; partículas com teto (~60 num objeto). No reduzido,
removido. Canvas é `aria-hidden`; o significado (ex.: "votação encerrada") vem do texto.
