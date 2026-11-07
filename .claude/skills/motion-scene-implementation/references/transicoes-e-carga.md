# Transições, o Ponto viajante, presença e carga — código

O VIO não tem roteador: Landing, Início e Sala são estados do `App`. "Trocar de página" é trocar
estado. Regra do produto (`docs/design/transicoes.md`): **o Ponto conduz** — ele sai de onde está,
viaja e pousa encaixado onde a próxima tela o espera, e nunca some da tela principal.

## 1. O viajante do Ponto

Um único elemento `position: fixed` no topo de tudo (`--motion-depth-ponto`), irmão das telas,
nunca dentro delas (as telas montam e desmontam; ele fica). As âncoras já existem como
`data-ponto` (`baixar`, `landing`, `ao-vivo`, `download`, `inicio`, `pessoa`, `logo`, `espera`);
hoje ninguém as lê.

```ts
// src/client/components/ponto-travel.ts
import { motion } from "./motion-tokens";
import { reducedMotion } from "./motion";

const SIZE = 20; // traveler box in px; anchors are scaled to their own size

function box(el: Element) {
  const r = el.getBoundingClientRect(); // fixed traveler: viewport coords, no scale division
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
    s: r.width / SIZE,
  };
}

export function createPontoTraveler(traveler: HTMLElement) {
  let flight: Animation | undefined;

  /** Moves the Ponto from `from` to `to`, then hands over to the anchor at the destination. */
  async function travel(from: Element, to: () => Element | null) {
    const a = box(from);
    from.classList.add("is-handed-off"); // the anchor hides only while the traveler is visible
    traveler.hidden = false;
    traveler.style.transform = `translate(${a.x - SIZE / 2}px, ${a.y - SIZE / 2}px) scale(${a.s})`;
    await nextFrame(); // the next screen mounts and lays out
    const target = to();
    if (!target) return land(from);
    const b = box(target);
    target.classList.add("is-handed-off");
    flight?.cancel();
    if (reducedMotion(traveler.ownerDocument.defaultView ?? window)) {
      // Reduced: appears straight at the destination (150 ms fade, WAAPI on purpose).
      target.classList.remove("is-handed-off");
      traveler.hidden = true;
      target.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
      return;
    }
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    traveler.style.willChange = "transform";
    flight = traveler.animate(
      [
        {
          transform: `translate(${a.x - SIZE / 2}px, ${a.y - SIZE / 2}px) scale(${a.s})`,
        },
        {
          transform: `translate(${b.x - SIZE / 2}px, ${b.y - SIZE / 2}px) scale(${b.s})`,
        },
      ],
      {
        duration: distance < 240 ? 260 : motion.dur.travel, // proportional, capped (spec)
        easing: motion.ease.ponto,
        fill: "forwards",
      },
    );
    try {
      await flight.finished; // never animationend (bug 07.1)
    } catch {
      return; // cancelled by a newer travel
    }
    land(target);
  }

  function land(anchor: Element) {
    anchor.classList.remove("is-handed-off");
    traveler.hidden = true;
    traveler.style.willChange = "";
    flight?.cancel();
    flight = undefined;
  }

  return {
    travel,
    get busy() {
      return !!flight && flight.playState === "running";
    },
  };
}

const nextFrame = () =>
  new Promise<void>((r) => requestAnimationFrame(() => r()));
```

```css
.ponto-viajante {
  position: fixed;
  left: 0;
  top: 0;
  width: 20px;
  height: 20px;
  border-radius: 29%;
  background: var(--blue); /* = --brand of landing.css */
  z-index: var(--motion-depth-ponto);
  pointer-events: none;
}
[data-ponto].is-handed-off {
  opacity: 0;
}
```

Pontos de atenção:

- **Lock:** enquanto `busy`, ignore o segundo clique que pediria outra viagem (ou cancele a atual e
  parta de onde ele está: `getComputedStyle(traveler).transform`). O que nunca pode: duas viagens
  disputando o mesmo elemento.
- **Arco e personalidade** (antecipa, estica, amassa) vêm da `motion-object-implementation`: troque
  os dois keyframes por uma lista com o keyframe do meio subindo (arco) e o `scale(sx, sy)` da spec.
  O ritmo e o destino são da cena; o corpo é do objeto.
- **Linhas de velocidade** (ação secundária da cena): um efeito registrado que lê a posição do
  viajante por quadro e desenha traços atrás, apagados no pouso. Removido no reduzido.
- **Acessibilidade:** o viajante é `aria-hidden`. O foco do teclado vai para o destino lógico da
  nova tela (título ou primeiro controle), não segue o Ponto.
- **Cor e forma** não mudam durante a viagem; se origem e destino tiverem tamanhos diferentes, o
  `scale` resolve.

## 2. Trocar de tela

### Opção A — o Ponto conduz, as telas cruzam opacidade (padrão)

```ts
function goTo(next: Screen, from: Element) {
  const exiting = screenEl.current!;
  exiting.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: motion.dur.fast,
    easing: motion.ease.in,
    fill: "forwards",
  });
  void traveler.travel(from, () =>
    document.querySelector(`[data-ponto="${anchorOf(next)}"]`),
  );
  setScreen(next); // the new screen fades in with its own entry (CSS or WAAPI)
}
```

### Opção B — View Transitions API

```ts
import { flushSync } from "react-dom";

function swap(update: () => void) {
  if (!document.startViewTransition || reducedMotion()) return update();
  document.startViewTransition(() => flushSync(update));
}
```

```css
.ponto-ancora {
  view-transition-name: ponto;
} /* one element per name at a time */
::view-transition-group(ponto) {
  animation-duration: var(--motion-dur-travel);
  animation-timing-function: var(--motion-ease-ponto);
}
```

- Ótima entre Landing ↔ Início ↔ download (elemento compartilhado de graça).
- **Na sala, não:** a imagem antiga é um instantâneo, e o vídeo ao vivo congela durante a troca.
  Para entrar ou sair da sala, use a Opção A.
- React tem um componente `<ViewTransition>`: confirme na pesquisa se está estável na versão
  instalada (`package.json`) antes de usar; se for só canary/experimental, fique no `flushSync`.
- As regras globais do reduzido zeram as animações dos pseudo-elementos; mesmo assim, pule a API
  no reduzido (acima) para não haver um quadro de atraso.

## 3. Presença: animar a saída

Sem AnimatePresence (dependência). Um hook que mantém o filho montado até a saída terminar:

```tsx
import { useEffect, useRef, useState } from "react";
import { reducedMotion } from "./motion";

/** Keeps `node` rendered while its exit animation runs. */
export function usePresence<T extends HTMLElement>(
  show: boolean,
  exit: Keyframe[],
  ms: number,
) {
  const ref = useRef<T>(null);
  const [mounted, setMounted] = useState(show);
  useEffect(() => {
    if (show) return setMounted(true);
    const el = ref.current;
    if (!el || reducedMotion(el.ownerDocument.defaultView ?? window))
      return setMounted(false);
    const a = el.animate(exit, {
      duration: ms,
      easing: "cubic-bezier(.55,0,1,.45)",
      fill: "forwards",
    });
    a.finished.then(
      () => setMounted(false),
      () => {},
    );
    return () => a.cancel(); // `show` turned true again mid-exit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);
  return { ref, mounted };
}
```

Entrada: CSS com `@starting-style` (nasce de opacidade 0) ou `el.animate` no `useLayoutEffect`.
Nunca use presença em quem segura mídia (host de vídeo, `RemoteVoice`): esses não desmontam por
animação.

## 4. Splash, primeira entrada e carga

- **Splash** (`Home.tsx`, só no app desktop): 700 ms, pulável por clique ou tecla. Mantenha
  pulável; o Ponto da splash é o mesmo que pousa no Início (viagem, não corte).
- **Carga rápida (< 300 ms):** não mostre nada. Entre 300 ms e 1 s: o Ponto respira no lugar do
  conteúdo. Acima de 1 s: esqueleto com a forma do que vem.
- **Esqueleto:** blocos com a forma final; brilho = uma camada com gradiente **movida** por
  `translateX` (dentro da regra), nunca `background-position` animado (exceção de paint). No
  reduzido, blocos parados.
- **Conteúdo chegando:** troca esqueleto → conteúdo com opacidade cruzada (`fast`), sem pulo de
  layout (o esqueleto tem as mesmas dimensões).
- **Entrar na sala:** a conexão demora o que demora; a animação não segura nem finge progresso.

### Pronto para mostrar (portão de carga)

```ts
// First entry: wait for what the first frame needs, with a ceiling.
const decode = (img: HTMLImageElement) => img.decode().catch(() => {});
await Promise.race([
  Promise.all([document.fonts.ready, decode(heroImage)]),
  new Promise((r) => setTimeout(r, 1200)), // never hold the page longer than this
]);
document.documentElement.classList.add("is-ready"); // CSS starts the entry
```

Sem FOUC: o estado inicial da entrada vem no CSS (não aplicado por JS depois do primeiro paint) e o
conteúdo principal da landing não espera a animação para existir (LCP).

### Modal, gaveta e menu (orquestração)

Abrir: o fundo esmaece (`fast`), o painel entra (`base`, ease-out) com 1 passo de atraso, o foco
vai para o painel. Fechar: ao contrário e mais rápido (`fast`, ease-in), foco volta ao gatilho. Um
modal por vez; o segundo pedido substitui sem animar a saída do primeiro. Presença pelo
`usePresence` acima. Tema: o VIO tem tema único, então não há transição de tema.

## 5. Foco e layout da sala

Mudar foco ou layout só mexe na apresentação. O precedente é o FLIP do `WidgetFrame`
(`src/client/canvas/WidgetFrame.tsx`, 200 ms, curva do Ponto, Web Animations API, confere
`reducedMotion` da janela do elemento). Esse FLIP já existe e fica como está; **não** crie outro
que escale, reparente ou clone o host de vídeo, e não troque a ordem de montagem de quem segura
mídia para animar.
