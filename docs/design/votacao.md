# Votação — spec (A com elementos da B)

Prancha final: "Votação · escolhida (A + B)" no canvas. Referências: "Votação A · Barras"
e "Votação B · Pizza".

## Votação aberta (base da A)

- Pergunta em destaque; opções como linhas com marcador redondo; a opção escolhida por
  mim fica com borda e fundo azul-escuro (`#4446A8` / `#1F2140`).
- Votos por opção **ocultos** até o fim.
- **Da B — linha do prazo**: barra fina (3–4 px) colada no topo do corpo do widget, azul,
  que encolhe até zero conforme o prazo acaba. Sem prazo, não aparece.
- **Da B — quem votou**: rostos (círculos com inicial e cor da pessoa) no rodapé,
  seguidos de "4 de 6 votaram" e o tempo restante em mono.
  - **Até 6 pessoas na sala**: um rosto por pessoa que votou.
  - **Mais de 6**: no máximo 5 rostos e um círculo `+N` com o resto; texto "9 de 14
    votaram". Passar o mouse (ou tocar) no `+N` mostra a lista de nomes de quem votou.
  - Mostra **quem** votou, nunca **em quê**.
- Foco: botão `Encerrar agora` para quem pode controlar o widget.

## Resultado

O cabeçalho ganha um seletor de 3 ícones: **Barras · Pizza · Sem gráfico**.

- **Barras (da A)**: rótulo, `votos · %` em mono e barra por opção; vencedora com barra
  `#A6A9FF`, texto em negrito e um ✓ discreto; demais `#474A6A`. As barras crescem em
  ~480 ms ao revelar.
- **Pizza (da B)**: rosca com fatias separadas por um fio da cor do fundo; vencedora no
  tom mais claro (`#A6A9FF`, depois `#6B6FD0`, `#474A6A`); percentual da vencedora no
  centro; legenda com quadradinho, nome e votos.
- **Sem gráfico (tela final da B)**: pergunta pequena e apagada, nome da vencedora grande,
  "3 de 6 votos · 50%" em `#A6A9FF`, e as demais em uma linha (ou coluna no celular).
- Rodapé: "6 votos · encerrada" e `Nova votação`.

**Decisão (usuário, 2026-10-24)**: o seletor de gráfico é **preferência pessoal** — cada
pessoa escolhe como vê o resultado; não é estado da sala nem passa pelo servidor.

## Tamanhos

- **Pequeno**: aberta = pergunta + 3 opções + rodapé (rostos, contagem, tempo); com mais
  opções que cabem, mostrar as 3 primeiras e "+2 opções" (sem rolagem).
  Resultado = barras finas, pizza de 132 px com legenda ao lado, ou tela sem gráfico.
- **Foco**: opções com 64 px de altura; pizza de 360 px.
- **Celular**: opções de 56 px; pizza de 220 px acima da legenda.

## Protocolo

Nenhuma mudança obrigatória: votantes (ids) e prazo já existem no estado. Os nomes e as
cores vêm da lista de participantes.
