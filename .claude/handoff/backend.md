# Backend/Segurança — handoff

Atualizado: 2026-11-04

## Agora

Nada em andamento.

## Pendente / bloqueios

- #242 (P2, `aguarda-usuario`): convite revogado ainda só "bate na porta"; o servidor não
  distingue revogado de trancado (revogações só em memória).
- Frontend pede o tamanho do instalador para a landing: endpoint ou ajuste de CSP.
- Conferir se o Frontend já usa `canEditPublic(..., "guestControl")` nos controles de
  cronômetro, votação e tarefas (#71).
- Widgets e avisos da sala se perdem num reinício (só memória; espera banco de dados).
- Teto global de memória / `MAX_ROOMS` com base no uso real (nota em #28).

## Decisões da área

- Dono de widget não ganha controle/edição automática: vale a permissão da sala ou a do widget.
- Câmera de convidado desligada por padrão (tabela da #71).
- `widget-updated` de votação vai por pessoa (`Rooms.emitWidget` + `view`).
- Orçamentos (`trimToBudget`, `chatBudget`, `historyBudget`) em `shared/widgets.ts`.

## Próximo passo

Primeira issue `backend` da Fila. Mecanismos de #242, #226, #158, #122, #104, #71: `docs/notas/backend.md`.
