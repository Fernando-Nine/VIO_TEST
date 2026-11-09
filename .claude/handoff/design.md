# Design — handoff

Atualizado: 2026-11-09

## Agora

Plano de design por fases 0–5 (#227): `docs/design/guias/plano.md`. Fase 0 (limpeza) feita na
PR #329. **Fase 1b em andamento** (revisão do que existe), em paralelo à 1a (guia do Brandbook).

## Pendente / bloqueios

- 1c (componentes) e 1d (telas) começam depois da 1b. Exceção de 9 nov: a fase 2 (5 estilos × 2
  amostras em telas reais) roda logo após a 1c e a 1d, sem esperar o aval; o usuário revisa tudo
  junto ao voltar. A 1a bloqueia a fase 3.
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

Terminar a 1b e entregar ao copiloto. Histórico das levas: `docs/notas/design.md`.
