# Escolhas em aberto

Cada arquivo desta pasta é **uma escolha pendente do usuário**, com o link da prancha e as opções.
Quando o usuário decide:

1. o resultado entra no [brandbook](../brandbook/README.md), citando decisão, data e prancha;
2. o arquivo da escolha é movido para [`fechadas/`](fechadas/) com a data no nome
   (`AAAA-MM-DD-<escolha>.md`) e a decisão anotada no fim.

Nada desta pasta vale como identidade oficial.

## Pendências conhecidas

Achados da fase 0 que ainda não viraram escolha nem issue:

- **Favicon antigo.** `public/favicon.svg` e os ícones de `public/icons/` ainda são o ícone antigo,
  não a M4 escolhida. Troca prevista na fase 4 do [plano](../guias/plano.md).
- **`--focus` diverge.** `#C8CEFF` em `src/client/styles.css`, `#A8ADFF` em `room.css` e
  em `landing.css` (via `--accent`). Unificar com os tokens (fase 4).
- **Contraste do azul.** `#2727F5` sobre o fundo `#0B0C13` dá **2,50:1** (2,33:1 sobre `#14151F`):
  passa para elemento gráfico grande, não para texto nem para ícone fino (AA pede 4,5:1 e 3:1).
  Entra na consolidação do contraste (fase 3).
- **Ponto da M1.** Os quadros da prancha "VIO · Marca" divergem: `#A6A9FF` no quadro final do logo,
  `#F3F3FB` no quadro dos ícones. O brandkit usa `#A6A9FF` (quadro final); confirmar com o usuário.
