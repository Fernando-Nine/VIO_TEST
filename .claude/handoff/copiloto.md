# Copiloto — handoff

Atualizado: 2026-10-22

## Agora

Equipe montada. Sessões (tag `vio-team`), criadas pelo copiloto:

- QA/Release `session_01GoaQuuAx1QX9U3Xsnr2eUx` — CI (#6) + diagnóstico.
- Frontend/UX `session_01SMBZVs5yWz7wevHNuHv6wd` — #7, #8, #15, depois #9–#14, #16.
- Mídia `session_01Dmf6n1sncaS6GtrMQUZGyp` — diagnóstico.
- Backend/Segurança `session_01VYZwmuznmykd3R1fyJDVa3` — diagnóstico + servidor de #12.

## Feito recentemente

- PR #5: novo CLAUDE.md, papéis, handoffs, hook de trava, docs/ESTADO.md, rodadas para docs/arquivo/.
- Issues #6–#16 a partir do feedback do usuário (interface enxuta, sons, widgets).

## Decisões

- Fluxo: Issue → branch → PR → CI → squash merge pelo agente. Produção (VIO) só por PR de
  release com aval do usuário. Teto de participantes não é prioridade.
- Usuário quer respostas curtas; erro corrigido não precisa ser relatado.

## Pendente / bloqueios

- VIO (produção) ainda tem o CLAUDE.md antigo; atualiza na próxima release.
- Milestones por versão ainda não criados (ferramenta indisponível; criar pelo GitHub ou QA).
- Decisões do usuário em aberto: E10, E12 (ver docs/ESTADO.md).

## Próximo passo

Acompanhar os diagnósticos, priorizar as issues novas com o usuário e propor a release 2.8.0.
