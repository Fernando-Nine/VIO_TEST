# 012 — Prioridade, pronto, limite por área e incidentes

Data: 2026-11-04 (aprovado em 2026-11-05)

## Contexto

Sem fila única, áreas começavam features com bugs abertos e várias issues ao mesmo tempo.

## Decisão

- Níveis P0 (quebra) · P1 (bug com contorno) · P2 (ajuste) · P3 (feature nova), em etiquetas.
  Não se começa um nível com o de cima aberto na mesma área. A ordem fica na Fila do `ESTADO.md`.
- No máximo 1 issue em andamento por área; issue esperando o usuário leva `aguarda-usuario`.
- Definição de pronto no `CLAUDE.md` (CI verde, tela conferida, nota da versão, estado
  atualizado, issue fechada quando entra na prévia).
- Todo P0 resolvido ganha revisão sem culpa em `docs/incidentes/`.
- Erro que uma regra teria evitado vira uma linha no `CLAUDE.md`; revisão mensal pelo copiloto.
- Ordem geral do usuário (27 out): entregar o já pedido, bugs, agentes e planejamento,
  identidade visual, features novas. Sem pressa; qualidade.

## Motivo

Bugs antes de novidades e uma coisa por vez por área deixam a prévia estável e o custo previsível.

Não rediscutir sem o usuário.
