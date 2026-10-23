# Backend/Segurança — handoff

Atualizado: 2026-10-23

## Agora

PR #62 (#30, eventos incrementais) aguardando CI → squash merge.

## Feito recentemente

- #19 (PR #56): `proxy-addr` 2.0.8; `audit:production` limpo. Patch para o VIO descrito
  na issue (cherry-pick `168154f` na release, após aval do usuário). VIO não foi tocado.
- #53 servidor (PR #58): votação aberta envia só o próprio voto + `moduleState.voters`;
  votos completos no encerramento ou no fim do prazo (reveal agendado no servidor).
  Contrato comentado na #53 para o Frontend.
- #30 (PR #62): `chat-message` `{id, revision, message}` no lugar do widget inteiro;
  snapshots de sala sem `widgets` (só quem entra e mudanças fora de eventos recebem).
  Cliente ajustado em `room/controller.ts`; testado no Chromium com duas sessões.
- Antes: #28/#31 (PR #33) orçamento de memória por sala; #12 contrato de reinício.

## Decisões

- `widget-updated` de votação é enviado por pessoa (`Rooms.emitWidget` + `view`).
- Orçamentos (`trimToBudget`, `chatBudget`, `historyBudget`) vivem em `shared/widgets.ts`.
- Dono de widget aprovado (convidado) não edita/reinicia sem permissão (`canEditPublic`).

## Pendente / bloqueios

- 1 alta só em dev: `vite` 8.3.x (precisa 8.3.5, fora da faixa) → QA.
- Teto global de memória / `MAX_ROOMS` com base no uso real (nota em #28).
- Histórico de módulos ainda vai inteiro no `widget-updated` (≤ 8k caracteres).
- Ao testar no navegador, use código de sala novo por execução: a sala anterior fica
  viva no período de reconexão e o "criador" antigo continua valendo.

## Próximo passo

Mesclar #62 com CI verde; depois olhar issues `backend` novas.
