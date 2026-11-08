# Movimento

Resumo da [decisão 020](../../decisoes/020-movimento-completo.md). Detalhes do Ponto em
[`../ponto.md`](../ponto.md) (seções 1, 3 e 8).

- **Animação completa por padrão.** `transform`/`opacity` são o caminho barato, não o limite;
  `stroke-dashoffset`, `clip-path`, troca de cor e outros entram sem aval, com o custo anotado.
- **O Ponto conduz as transições** (entrar na sala, trocar de página, abrir widget, mudar o conjunto
  da tela), sempre levando de um lugar a outro, medido no layout real.
- **Curva:** `--ease-ponto` `cubic-bezier(.2,.7,.2,1)`. Duração até 800 ms. Mola com sobra só onde o
  estilo pede e nunca durante o vídeo.
- **Interrompível:** se a pessoa age no meio, o Ponto muda de rumo de onde está e a ação vale na hora.
- **Mídia intocada:** nunca reparentar, clonar ou cobrir vídeo; nada mexe no `<audio>`.
- **Custo:** evitar blur e `backdrop-filter`, e efeito de ambiente sobre vídeo. `will-change` só
  durante o movimento.
- **Reduzir movimento** (`prefers-reduced-motion` ou Ajustes › Acessibilidade, `data-motion="reduce"`):
  tudo vira esmaecimento de até 150 ms, o Ponto aparece no destino, loops viram estado parado que
  ainda comunica. É também o interruptor para PC fraco ou internet ruim.
- **Sem ruído:** um loop contínuo por tela como ponto de partida; em rajada, uma animação coletiva a
  cada ~800 ms.
