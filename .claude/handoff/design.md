# Design — handoff

Atualizado: 2026-11-12

## Agora

Plano de design por fases 0–5 (#227): `docs/design/guias/plano.md`. **Fase 2, rodada 2:** 6
variações sobre o guia aprovado (`docs/design/guias/estilo.md`, PR #361) publicadas no
[canvas](https://claude.ai/artifact/UPb7DxFciP46are3wAkczD). Esperando o usuário escolher por
comentário; resumo em `docs/design/escolhas/estilo-visual.md`. Depois do aval: preencher a seção
Escolhidas da prancha `Main`, subir o decidido para o brandbook (fase 3) e fechar a #227.
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

Ler os comentários do canvas das variações (`ArtifactComments`) e montar a prancha Escolhidas.
Histórico das levas: `docs/notas/design.md`.
