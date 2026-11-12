# Desempenho, medição e depuração de cena

A spec traz o custo de cada peça (barato · moderado · pesado). Aqui está como confirmar no app e o
que fazer quando não fecha.

## Orçamento

| Superfície                | Por quadro (JS + estilo + paint) | Efeitos pesados ao mesmo tempo | Observação                             |
| ------------------------- | -------------------------------- | ------------------------------ | -------------------------------------- |
| Landing, Início, download | ≤ 8 ms                           | 1                              | celular médio é a referência           |
| Sala com chamada          | ≤ 4 ms                           | 0                              | o orçamento é da mídia (decode, áudio) |
| PiP                       | ≤ 2 ms                           | 0                              | janela pequena, outro `rAF`            |
| App Windows (WebView2)    | igual ao Chromium                | —                              | sem GPU dedicada em muitos notebooks   |

`activeEffects()` (do registro) lista o que está montado; no dev, o registro avisa com mais de um
pesado.

## Higiene

- **Core Web Vitals:** LCP — o título e a imagem da landing aparecem sem esperar animação; CLS —
  nada que entra por animação empurra o layout (reserve o espaço); INP — handler de `pointermove`
  só grava no store, o trabalho fica no tick.
- **Carregar sob demanda** o que é pesado (`import()` no `full()`), um chunk por peça.
- **Limpeza:** todo `add` do ticker, ouvinte, observer e `Animation` tem o cleanup no retorno do
  efeito; troca de tela desmonta os efeitos da tela anterior (o registro cuida, se o efeito foi
  registrado pelo componente da tela).
- **Otimizar** (quando pedirem): mude a implementação antes da aparência; se algo visível mudar,
  diga exatamente o quê no relatório.

## Medir

1. **Performance do DevTools** com CPU 4× mais lenta: grave a transição; procure quadros longos,
   "Recalculate Style" e "Layout" dentro da animação (deveria haver só "Composite").
2. **Rendering › Paint flashing** e **Layer borders**: o que pisca verde está pintando a cada
   quadro; numa animação de `transform`/`opacity` só a primeira pintura aparece.
3. **Contador de quadros rápido** no console:

```js
let n = 0,
  t0 = performance.now();
(function f(t) {
  n++;
  if (t - t0 < 2000) requestAnimationFrame(f);
  else console.log(n / 2, "fps");
})(t0);
```

4. **Long Animation Frames** (Chromium): `new PerformanceObserver((l) => l.getEntries().forEach(e =>
console.log(e.duration, e.scripts))).observe({ type: "long-animation-frame", buffered: true })`.
5. **Na sala:** abra o `chrome://webrtc-internals` antes e durante o efeito; `framesDropped` ou
   `jitterBufferDelay` subindo quando o efeito liga = o efeito não cabe ali.

## Problemas comuns

| Sintoma                                  | Causa provável                                                        | Correção                                                   |
| ---------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| Tranco no primeiro quadro                | camada criada na hora                                                 | `will-change: transform` um quadro antes; tire ao terminar |
| Tudo engasga com muitos `will-change`    | camadas demais (memória de GPU)                                       | `will-change` só durante; nunca em lista inteira           |
| Layout em todo quadro                    | ler `getBoundingClientRect`/`offset*` no tick, depois escrever estilo | medir no resize/IntersectionObserver; no tick só escrever  |
| Texto borrado depois de escalar          | rasterizado na escala menor                                           | animar até `scale(1)` exato e tirar o `will-change` no fim |
| Parallax treme na rolagem                | `scroll` dispara depois do quadro                                     | ler `scrollY` no tick (store), não no evento               |
| Efeito continua com a aba oculta         | `setInterval` ou `rAF` próprio                                        | usar o `ticker` (pausa sozinho)                            |
| Efeito montado duas vezes (dev)          | cleanup incompleto no Strict Mode                                     | o retorno de `full`/`reduced` desfaz tudo que montou       |
| Variante reduzida não aparece            | só um dos dois seletores                                              | media query **e** `:root[data-motion="reduce"]`            |
| Fade reduzido de 150 ms vira corte seco  | fez com `transition` CSS (zerada no reduzido)                         | `el.animate()`                                             |
| Lógica presa esperando o fim da animação | `animationend`/`transitionend` (bug 07.1)                             | `animation.finished` ou prazo em JS                        |
| PiP sem animação ou rápida demais        | `requestAnimationFrame`/`matchMedia` da janela principal              | `ticker(pipWindow)`, `reducedMotion(pipWindow)`            |
| Canvas borrado ou pesado                 | DPR errado                                                            | `dpr = min(devicePixelRatio, 2)`; 1,5 em shader de fundo   |
| Vídeo congela na troca de tela           | View Transition por cima da sala                                      | Opção A de `transicoes-e-carga.md`                         |

## Depurar uma animação

- **Animations panel** do DevTools: desacelera para 10% ou 25%, arrasta a linha do tempo, mostra
  curva e atraso de cada animação CSS e WAAPI.
- **Congelar num instante** (também para screenshot no meio da animação):

```js
document.getAnimations().forEach((a) => {
  a.pause();
  a.currentTime = 200;
}); // 200 ms in
```

- **Desacelerar tudo** no console: `document.getAnimations().forEach((a) => (a.playbackRate = 0.2))`.
- **Testar o switch:** em Ajustes › Acessibilidade › Reduzir movimento › "Sempre"; e, separado,
  DevTools › Rendering › "Emulate CSS prefers-reduced-motion: reduce" com o Ajuste em "Seguir o
  sistema". Os dois caminhos precisam dar o mesmo resultado.

## Screenshots e BrowserLab

- `npm run test:media` abre a bancada (`tests/BrowserLab.tsx`) para o que toca a sala e a mídia.
- Para landing, Início e transições, `webapp-testing` ou `playwright-cli`: tire três quadros da
  mesma transição (início, meio congelado, fim) e um com movimento reduzido, em desktop e em
  largura de celular. Playwright: `page.emulateMedia({ reducedMotion: "reduce" })`.
- Screenshot não prova fluidez: cite a medição (fps ou quadros longos) no relatório se a peça era
  moderada ou pesada.
