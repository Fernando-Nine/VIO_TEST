# QA/Release — handoff

Atualizado: 2026-11-04

## Agora

Nada em andamento. Produção 2.11.0 (VIO PR #5), prévia 2.12.0-rc.6.

## Pendente / bloqueios

- Fila da área: #269 e #20 (P2), #21 e #22 (P3).
- `docs/VALIDACAO.md` ainda descreve a rodada D (2.7.0-rc.5); atualizar na próxima release.
- VIO_TEST agora é público: proteção de branch e auto-merge ficam possíveis (ver ESTADO quando
  o usuário decidir).

## Decisões da área

- Release: sempre por `docs/RELEASE.md`. O build gera o `CHANGELOG.md`; a CI falha se ficar
  desatualizado.
- Prettier fora da CI até a #20; `npm audit --omit=dev --audit-level=high` já roda.
- Bancada de mídia manual até a #22; aceite de mídia é humano, na prévia.
- Tags: o usuário cria em Releases (as antigas até 2.8.x não serão criadas).

## Próximo passo

Primeira issue `qa` da Fila (hoje #269).
