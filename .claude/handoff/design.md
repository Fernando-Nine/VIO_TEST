# design — handoff

Atualizado: 2026-10-24

## Agora

Rascunhos da 1ª leva de widgets entregues; aguardando escolha do usuário.
Canvas: https://claude.ai/artifact/3M2c9eiZF8Pp26bjBhMjAZ ("Widgets VIO — leva 1").

## Feito recentemente

- Canvas com 2 alternativas por widget, cada uma em pequeno (420×240), foco (960×640)
  e celular, no visual real da prévia (screenshot de `npm run dev`):
  - Cronômetro A · Anel / B · Ponteiro — temporizador com atalhos 5/10/25, cronômetro
    com voltas, alarme tocando com "Desligar".
  - Votação A · Barras / B · Pizza — aberta (votos ocultos, quantos votaram, prazo),
    resultado com gráfico e resultado com gráfico oculto.
  - Dados A · Ícones (d4…d20 inserem no comando) / B · Mesa (total em destaque,
    sugestões, histórico em faixa) — vazio e resultado com crítico.
  - Sorteador A · Roleta / B · Pizza de pesos — gráfico visível e oculto, lista com pesos.

## Decisões

- Vencedor/crítico em destaque discreto: azul claro #a6a9ff, sem cor nova.
- Gráfico liga/desliga por botão no cabeçalho do widget (ícone de pizza/barras).
- Animações ≤ 800 ms e desligadas em `prefers-reduced-motion`.

## Pendente / bloqueios

- Escolha do usuário (A/B por widget) e ajustes pedidos nos comentários do canvas.

## Próximo passo

Com a escolha, escrever `docs/design/<widget>.md` e abrir issue `frontend` por widget.
