# Design — handoff

Atualizado: 2026-11-13

## Agora

Plano de design por fases 0–5 (#227): `docs/design/guias/plano.md`. **Fase 2: a rodada 2
foi recusada** em 13 nov (#367; resumo em `docs/design/escolhas/estilo-visual.md`). O guia
`docs/design/guias/estilo.md` ganhou as regras novas (sem pílula, um halo só, botão importante nunca na
cor de outra pessoa, escolhas fechadas). Próximo: definição escrita com o Roteirista (Início, o que
preenche os espaços, onde fica a grade); depois 5 kits enxutos e diferentes entre si; então o kit
escolhido expandido com 3 exemplos; só depois o brandbook (fase 3). Temas #368, acessibilidade #369 e
pílula/halo #370 são issues próprias.
Fonte das pranchas (gerador): fora do repositório, recriável pelo canvas (as `.dc.html` são a
referência).

## Pendente / bloqueios

- A 1a (guia do Brandbook) bloqueia a fase 3.
- Escolhas em aberto, uma por arquivo, em `docs/design/escolhas/` (estilo visual, ponto da M1,
  cores, voz). A #281 espera a voz.
- #261 e qualquer animação esperam a fase 5.
- Sala em detalhe (escolhida A): **não começar** sem pedido do copiloto.
- Divergências em `docs/design/ideias-futuras.md` (nome do grupo App, Atalhos): copiloto decide.

## Decisões da área

- Brandbook (`docs/design/brandbook/`) só com o decidido, cada item com a origem; o aberto fica em
  `escolhas/`; como produzir, em `guias/`.
- Produzir só com pedido explícito (`CLAUDE.md`, Autonomia).
- Destaque `#A6A9FF`; volume acima de 100% `#F2D36B`.
- A prévia do Render não abre pela rede do contêiner: olhar a sala com build local.

## Próximo passo

Com o Roteirista, escrever a definição da #367 e publicá-la como página com comentários.
Histórico das levas: `docs/notas/design.md`.
