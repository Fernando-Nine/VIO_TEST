---
name: vio-design-review
description: Revisão de design do VIO — crítica visual, acessibilidade (WCAG AA) e textos de interface. Use antes de entregar qualquer rascunho, prancha ou mudança visual, e ao revisar uma tela existente.
---

# Revisão de design do VIO

Rode os quatro passes abaixo em cada alternativa, nos três tamanhos (espaço pequeno da
lateral, foco, celular ~390 px). Corrija o que achar antes de entregar; não liste o óbvio.

## 1. Crítica (hierarquia e foco)

- Em 3 segundos dá para dizer o que é e o que fazer? Uma ação principal por estado.
- Hierarquia: tamanho > peso > cor. No máximo 2 pesos e 3 tamanhos de texto por widget.
- Nada de texto que explica o óbvio, aviso duplicado ou botão morto/desabilitado sem motivo.
- Ações secundárias no hover ou botão direito, com equivalente por teclado/toque.
- Espaço: no pequeno, sem rolagem; no foco, o conteúdo cresce, não sobra vazio.
- Movimento: ≤ 800 ms, propósito claro, desligado em `prefers-reduced-motion`.

## 2. Acessibilidade (WCAG 2.1 AA)

- Contraste: texto ≥ 4,5:1; texto grande e ícones/contornos ≥ 3:1. Meça, não estime.
- Alvos: ≥ 40 px no mouse, ≥ 44 px em toque.
- Teclado: ordem lógica, foco visível, Esc fecha, nada só no hover.
- Estado nunca só por cor (ícone, texto ou forma junto).
- Leitor de tela: rótulo em todo botão de ícone; avisos com `aria-live="polite"`.

## 3. Textos (UX copy)

- Português, frases completas, com acento, tom direto e amigável. Verbo no botão
  ("Iniciar", "Desligar alarme"), não "OK".
- Erro diz o que houve e o que fazer: "A câmera está desativada para convidados nesta
  sala. Peça a um administrador."
- Estado vazio convida à ação em uma linha. Sem jargão técnico (WebRTC, socket, payload).

## 4. Coerência com o sistema

- Confira contra a skill `vio-design-system` (tokens, padrão de widget, permissões).

Entregue com: nome curto de cada alternativa (A, B, C), o que muda entre elas e os
problemas que restaram, se houver.
