# Desempenho e depuração de objetos

Ferramentas comuns (Performance, Paint flashing, Animations panel, congelar no meio, testar os dois
caminhos do switch, screenshots) estão em `motion-scene-implementation/references/desempenho-e-debug.md`.
Aqui fica o que é próprio de um objeto.

## Higiene (padrão leve, sempre)

| Regra                                  | Por quê                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| Animar só `transform`/`opacity`        | compositor; o resto é exceção aprovada                                       |
| `will-change` só durante a animação    | camada permanente gasta memória; em lista inteira, trava                     |
| Ler tudo, depois escrever tudo         | `getBoundingClientRect` depois de `style.*` força layout                     |
| Por quadro, só no `ticker`             | um `rAF` por componente vira dezenas                                         |
| Valor por quadro em ref, não em estado | `setState` por quadro re-renderiza a árvore                                  |
| Cleanup de tudo                        | ouvinte, observer, `Animation`, `removeTick` no retorno do efeito            |
| Loop pausa fora da vista               | `IntersectionObserver` ou o efeito registrado; aba oculta já pausa no ticker |
| Biblioteca pesada por `import()`       | só se aprovada; não entra no bundle inicial                                  |
| Import só do necessário                | tree-shaking (`import { animate } from …`, nunca `* as`)                     |

```ts
// Pause a loop while the object is off-screen.
const io = new IntersectionObserver(([e]) => {
  for (const a of el.getAnimations()) e.isIntersecting ? a.play() : a.pause();
});
io.observe(el);
// cleanup: io.disconnect()
```

## Otimizar (a pedido)

Mude a implementação primeiro e a aparência por último:

1. Tirar leitura de layout do caminho quente; juntar escritas no tick.
2. Trocar propriedade de paint por `transform`/`opacity` equivalente (máscara movida, camada
   cruzada).
3. Baixar a frequência (tick a cada 2 quadros para algo distante), o DPR do canvas, o número de
   partículas.
4. Só então simplificar o visual, e dizer no relatório **exatamente** o que mudou para quem vê.

## Problemas comuns

| Sintoma                               | Causa                                               | Correção                                                            |
| ------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| Pisca no estado final antes de animar | animação iniciada no `useEffect`, depois do paint   | `useLayoutEffect`, ou estado inicial no CSS / `@starting-style`     |
| Hover "gruda" no celular              | `:hover` fora de `@media (hover: hover)`            | envolver; pensar o equivalente de toque                             |
| Pressionar parece lento               | resposta no `click`                                 | `:active` / `pointerdown`                                           |
| Redirecionar no meio pula             | `@keyframes` recomeça do zero                       | `transition`, ou WAAPI partindo de `getComputedStyle(el).transform` |
| Animação dobrada em dev               | Strict Mode sem cleanup                             | devolver `a.cancel()` / remover ouvinte                             |
| Componente desmontado ainda anima     | `finished.then` sem checar                          | `a.cancel()` no cleanup; `.then(ok, () => {})`                      |
| Vazamento de memória                  | `Animation` com `fill: "forwards"` acumulando       | `a.commitStyles(); a.cancel();` ao terminar                         |
| Reduzido não funciona na PiP          | `reducedMotion()` sem a janela                      | `reducedMotion(el.ownerDocument.defaultView ?? window)`             |
| Texto borrado depois de escalar       | parou fora de `scale(1)` ou ficou com `will-change` | terminar em `none`/`scale(1)` e tirar o `will-change`               |
| Número pula de largura                | fonte proporcional                                  | IBM Plex Mono + `tabular-nums`                                      |
| FOUC na primeira pintura              | estado inicial aplicado por JS                      | estado inicial no CSS; JS só liga a classe                          |

Não há SSR nem hidratação no VIO: `window` e `document` no módulo funcionam, mas leia o DOM só
dentro de efeitos para o componente servir também na janela PiP.

## Conferir na tela

- Medir o custo observado de peça moderada ou pesada (Performance com CPU 4×; fps no console) e
  citar no relatório.
- Screenshot em desktop e celular, completo e reduzido; para estados, um quadro de cada (hover,
  pressionar, sucesso, erro) e um no meio da animação (`document.getAnimations()` pausado).
- Tocou a sala (lista de pessoas, cabeçalho de widget, fala): BrowserLab (`npm run test:media`).
