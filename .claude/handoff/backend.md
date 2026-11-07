# Backend/Segurança — handoff

Atualizado: 2026-11-07

## Agora

#292 (reinício duplicava pessoas e tocava sons): PR `fix/292-reinicio` aberta sem auto-merge; o
copiloto roda o goldfish no diff e liga o auto-merge. Conferir na prévia: deploy com 3 pessoas na
sala, sem duplicata e sem som de entrar/sair; uma entrada real ainda toca.

## Pendente / bloqueios

- #242 (P2, `aguarda-usuario`): convite revogado ainda só "bate na porta"; o servidor não
  distingue revogado de trancado (revogações só em memória).
- Frontend pede o tamanho do instalador para a landing: endpoint ou ajuste de CSP.
- Conferir se o Frontend já usa `canEditPublic(..., "guestControl")` nos controles de
  cronômetro, votação e tarefas (#71).
- Widgets e avisos da sala se perdem num reinício (só memória; espera banco de dados).
- Da #286 ainda abertos: aviso quando alguém cai (02.5, Frontend) e conferir em celular/Safari
  se a despedida do `pagehide` chega (02.7, aceite humano na prévia).
- Teto global de memória / `MAX_ROOMS` com base no uso real (nota em #28).

## Decisões da área

- Dono de widget não ganha controle/edição automática: vale a permissão da sala ou a do widget.
- Câmera de convidado desligada por padrão (tabela da #71).
- `widget-updated` de votação vai por pessoa (`Rooms.emitWidget` + `view`).
- Saída rápida (#286): despedida `POST /api/leave` por `page`; prazo `FAREWELL_SECONDS` (8 s) só
  com outra pessoa online; sozinho vale o grace. Snapshot de participante por allowlist
  (`participantFields`).
- #301: `join` da mesma `page` com socket velho preso assume o lugar com a mídia; página
  diferente sonda o socket preso (`presence-probe`, 2 s) e o solta se mudo e sem tráfego há 12 s
  (`holderProbe`/`holderQuiet` no `Config`, curtos nos testes). `enterHere` manda a
  despedida explícita antes; bfcache (`pageshow` persistido) troca o `page`.
- #292: `join` com o mesmo `page` e id novo troca o id velho em silêncio (herda papel, cor,
  chamada, widgets); `page` é segredo da aba. `io.use` só manda `SESSION_EXPIRED` para token
  ruim; outro erro vira `CONNECTION_ERROR` (o cliente tenta com o mesmo token). Limite: no deploy
  do Render as duas instâncias coexistem ~60 s.
- Orçamentos (`trimToBudget`, `chatBudget`, `historyBudget`) em `shared/widgets.ts`.

## Próximo passo

Primeira issue `backend` da Fila. Mecanismos de #242, #226, #158, #122, #104, #71: `docs/notas/backend.md`.
