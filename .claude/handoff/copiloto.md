# Copiloto — handoff

Atualizado: 2026-10-23

## Agora

Equipe montada. Sessões (tag `vio-team`), criadas pelo copiloto:

- QA/Release `session_01GoaQuuAx1QX9U3Xsnr2eUx` — CI (#6) + diagnóstico.
- Frontend/UX (2) `session_01F1V4ftUGMJCrGEhhbzfQej` (o primeiro foi arquivado).
- Design/Produto: área criada em 2026-10-23; sessão abre depois do briefing dos widgets.
- Tarefa agendada `trig_01Y6stnQYUT7NzutBNEgUzmK` (a cada 3 h) retoma agentes parados por limite de uso.
- Mídia `session_01Dmf6n1sncaS6GtrMQUZGyp` — diagnóstico.
- Backend/Segurança `session_01VYZwmuznmykd3R1fyJDVa3` — diagnóstico + servidor de #12.

## Feito recentemente

- PR #5: novo CLAUDE.md, papéis, handoffs, hook de trava, docs/ESTADO.md, rodadas para docs/arquivo/.
- Issues #6–#16 a partir do feedback do usuário (interface enxuta, sons, widgets).

## Decisões

- Produção 2.7.2 (patch de segurança proxy-addr) publicada e conferida pelo usuário. Tag v2.7.2 pendente (rede do copiloto recusou push de tag).
- Assinatura do instalador Windows: só ao abrir ao público.
- Widgets compartilhados sempre sincronizados (regra no CLAUDE.md).

- Fluxo: Issue → branch → PR → CI → squash merge pelo agente. Produção (VIO) só por PR de
  release com aval do usuário. Teto de participantes não é prioridade.
- Usuário quer respostas curtas; erro corrigido não precisa ser relatado.

## Pendente / bloqueios

- VIO (produção) ainda tem o CLAUDE.md antigo; atualiza na próxima release.
- Milestones por versão ainda não criados (ferramenta indisponível; criar pelo GitHub ou QA).
- Decisões do usuário em aberto: E10, E12 (ver docs/ESTADO.md).

## Próximo passo

Acompanhar os diagnósticos, priorizar as issues novas com o usuário e propor a release 2.8.0.
