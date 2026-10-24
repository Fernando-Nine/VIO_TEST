# design — handoff

Atualizado: 2026-10-24

## Agora

1ª leva de widgets aprovada e especificada. Nada em andamento.
Canvas: https://claude.ai/artifact/3M2c9eiZF8Pp26bjBhMjAZ ("Widgets VIO — leva 1").

## Feito recentemente

- Escolhas do usuário viraram specs em `docs/design/` e issues `frontend`:
  - Cronômetro A · Anel — #75.
  - Votação A + prazo e rostos da B; resultado em barras, pizza ou sem gráfico (tela da B);
    mais de 6 votantes = 5 rostos + `+N` — #76. Prancha "Votação · escolhida (A + B)".
  - Dados A, mantendo o ícone ? do guia de sintaxe — #77.
  - Sorteador A com cores por opção e paletas harmônicas (não só azul) — #78
    (`frontend` + `backend`: `color`/`palette` no módulo). Prancha "Sorteador · escolhido".

## Decisões

- Vencedor/crítico em destaque discreto: `#A6A9FF`, sem cor nova.
- Animações ≤ 800 ms e desligadas em `prefers-reduced-motion`.
- Proposta: seletor de gráfico da Votação é preferência pessoal; cores do Sorteador são
  estado da sala.

## Pendente / bloqueios

- Copiloto/usuário confirmar se o gráfico da Votação é pessoal ou da sala (#76).
- Comentários do usuário no canvas, se houver.

## Próximo passo

Aguardar a próxima leva (Tarefas, landing ou página de download) pelo copiloto.
