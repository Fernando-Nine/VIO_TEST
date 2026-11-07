# Estados, gestos, reatividade e responsividade

Núcleo de conhecimento da `motion-object-design`.

## Estados de interação

Cada objeto interativo define os estados e **as transições entre eles** (não só o visual parado).

| Estado         | Visual típico                                        | Transição de entrada                     | Cuidados                                                 |
| -------------- | ---------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| idle           | repouso                                              | —                                        | pode respirar, se for o Ponto                            |
| hover          | leve destaque, sobe 1–2 px, cursor muda              | `fast`, ease-out                         | só com `@media (hover: hover)`                           |
| focus-visible  | anel `--focus` nítido                                | instantâneo ou `instant`                 | nunca animar o anel a ponto de atrasar                   |
| active/pressed | `scale(var(--motion-scale-press))`                   | `instant` na descida, `fast` na volta    | resposta no `pointerdown`, não no `click`                |
| disabled       | opacidade menor, sem hover                           | `fast`                                   | o VIO evita botão morto: prefira esconder                |
| loading        | o Ponto ou um traço indica progresso                 | após ~300 ms (não piscar em ação rápida) | manter a largura do botão (sem pulo)                     |
| success        | confirmação curta (Ponto pisca verde-água `--live`?) | `base`                                   | volta ao idle sozinho                                    |
| error          | tremida curta horizontal (3 ciclos, 4 px)            | `base`                                   | mensagem `Fault` em português junto; no reduzido, só cor |

```css
.botao {
  transition:
    transform var(--motion-dur-fast) var(--motion-ease-out),
    opacity var(--motion-dur-fast) ease;
}
@media (hover: hover) {
  .botao:hover {
    transform: translateY(calc(-1 * var(--motion-dist-xs)));
  }
}
.botao:active {
  transform: scale(var(--motion-scale-press));
  transition-duration: var(--motion-dur-instant);
}
```

## Toque e gestos

Não há hover no celular. Todo efeito de hover tem um equivalente ou uma ausência pensada.

| Gesto      | Uso                                           | Feedback                                                   |
| ---------- | --------------------------------------------- | ---------------------------------------------------------- |
| tap        | ativar                                        | pressionar visível no `pointerdown`                        |
| long-press | menu (no VIO, o equivalente ao botão direito) | algo cresce enquanto segura; solta antes = cancela         |
| drag       | mover widget, reordenar                       | o objeto segue o dedo 1:1; sombra/elevação por opacidade   |
| swipe      | dispensar aviso, trocar aba                   | segue o dedo; passou do limiar ou da velocidade → completa |
| pinch      | zoom no canvas                                | 1:1 com os dedos; nunca animar contra o gesto              |

Arrasto bom: segue sem atraso, tem resistência nas bordas (amortece em vez de parar seco), e ao
soltar usa a velocidade do gesto (momentum) para decidir e completar com mola.

## Movimento reativo e em tempo real

| Efeito              | Ideia                                                             | Dentro de `transform`/`opacity`?                                                     |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Botão magnético     | o botão (ou o Ponto dentro dele) é puxado alguns px para o cursor | sim (`translate`)                                                                    |
| Inclinação (tilt)   | cartão gira em X/Y conforme o cursor, com `perspective`           | sim (`rotateX/Y`)                                                                    |
| Holofote/brilho     | luz que segue o cursor sobre o cartão                             | sim, se for uma camada com gradiente **movida**; não, se o gradiente for recalculado |
| Cursor próprio      | um Ponto pequeno segue o cursor com mola                          | sim; só desktop, nunca esconder o cursor real sem motivo forte                       |
| Ligado à rolagem    | o objeto reage à posição ou velocidade da rolagem                 | sim, com `animation-timeline` ou valores lidos por quadro                            |
| Sensível ao tamanho | o objeto se reorganiza com o contêiner                            | mude o layout sem animar; anime só a apresentação (FLIP)                             |
| Dados ao vivo       | contador de pessoas, ping, votos chegando                         | número troca com rolagem de dígitos (`translateY`)                                   |
| Troca de tema       | hoje não há (tema único)                                          | —                                                                                    |
| Por digitação       | o campo reage ao digitar; validação                               | sim; erro com tremida curta                                                          |

```js
// Botão magnético (rascunho): o Ponto dentro do botão persegue o cursor com lerp.
const btn = document.querySelector(".criar");
const dot = btn.querySelector(".ponto");
let tx = 0,
  ty = 0,
  x = 0,
  y = 0,
  raf = 0;
btn.addEventListener("pointermove", (e) => {
  const r = btn.getBoundingClientRect();
  tx = (e.clientX - (r.left + r.width / 2)) * 0.25; // força do ímã
  ty = (e.clientY - (r.top + r.height / 2)) * 0.25;
  raf ||= requestAnimationFrame(tick);
});
btn.addEventListener("pointerleave", () => {
  tx = ty = 0;
  raf ||= requestAnimationFrame(tick);
});
function tick() {
  x += (tx - x) * 0.18;
  y += (ty - y) * 0.18; // lerp = suavização
  dot.style.transform = `translate(${x}px, ${y}px)`;
  raf =
    Math.abs(tx - x) + Math.abs(ty - y) > 0.1 ? requestAnimationFrame(tick) : 0;
}
```

**Fala (invariante).** O Ponto ao lado do nome cresce com a fala. A animação **só lê** o estado que
já existe (`useSpeaking` em `Media.tsx`, `voiceLevel` em `media/capture.ts`); nunca cria áudio,
analisador ou `<audio>` próprio, e nunca tira o `<audio>` do `RemoteVoice` da árvore. Na spec,
escreva "lê `voiceLevel` (0–1)" e o mapeamento (`scale = 1 + nível × 0,4`, suavizado).

## Responsividade do movimento

- **Toque/celular:** sem efeitos de cursor; o equivalente é o estado pressionado ou nada. Distâncias
  podem crescer um pouco (o dedo cobre o objeto), tempos não.
- **Fora da tela:** loops e efeitos por quadro pausam quando o objeto sai da vista
  (IntersectionObserver) e quando a aba fica oculta.
- **Aparelho fraco:** um efeito pesado tem um irmão barato (ex.: holofote vira só elevação).
- **Lateral, foco, celular, PiP:** o mesmo objeto nos tamanhos da leva; numa tira de 160 px de
  altura, a antecipação de 2 px pode sumir — diga.

## Variante reduzida (obrigatória)

Para cada estado e cada efeito, diga: **estático**, **esmaecer** (≤ 150 ms) ou **removido**.
Ex.: "magnético → removido; pressionar → estático (só escurece); erro → só cor, sem tremida;
Ponto → aparece direto no destino, sem respirar".
