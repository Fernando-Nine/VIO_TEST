# Backend/Segurança — handoff

Atualizado: 2026-10-25

## Agora

#122 (PR #126): "Silenciar para todos" no servidor — aguardando CI → squash merge.
Contrato comentado na #122 (Frontend: menus; Mídia: soltar o microfone ao ser bloqueado).

## Feito recentemente

- #122: comando `moderate { participantId, voiceBlocked }` só do criador; encerra só a
  `voice`; `Participant.voiceBlocked`; `publish` de voz recusado com `VOICE_BLOCKED`;
  `transfer` limpa o bloqueio.
- #104: removidos `widget-review`, `shareRequests`, `guestShare`, `guestRequest`.
  `widget-create` = widget da sala; convidado precisa de `guestCreate`, admin de
  `adminCreate`. Pessoal nunca vai ao servidor.
- #83: body-parser 2.4.0 (#85) e zod 4.6.7 (#86); 2.8.1 em produção.
- #83: zod 3 → 4 sem mudança de schema; exposição era baixa (sem body parser montado,
  Socket.IO 64 KB, arrays com `max` pequeno). `freshKey` gera UUID v4 válido p/ zod 4.
- #71 (PR #73): `RoomPermissions` em `protocol.ts` (padrões da issue), comando
  `room-permissions`, helpers em `permissions.ts` (`roleAllows`, `canSetPermission`,
  `canUseWidget`, `roomRole`, `permissionText`). Servidor valida controlar vs editar
  widgets, chat, compartilhar (direto/pedido), tela/voz/câmera, admins criar/encerrar.
  Desligar mídia ou rebaixar encerra publicações. Permissão por widget (E7) vale por cima.
- #30 (PR #62): `chat-message` incremental; snapshots de sala sem `widgets`.
- #53 (PR #58): votos ocultos até encerrar (`moduleState.voters`, reveal agendado).
- #19 (PR #56): `proxy-addr` 2.0.8; patch do VIO descrito na issue (VIO intocado).
- #28/#31 (PR #33): orçamento de memória por sala; sucessão prefere quem está online.

## Decisões

- Dono de widget (convidado que compartilhou) não ganha controle/edição automática:
  segue a permissão da sala ou a por widget.
- Câmera de convidado desligada por padrão (tabela aprovada na #71).
- `widget-updated` de votação vai por pessoa (`Rooms.emitWidget` + `view`).
- Orçamentos (`trimToBudget`, `chatBudget`, `historyBudget`) em `shared/widgets.ts`.

## Pendente / bloqueios

- Frontend: interface dos switches da #71 e usar `canEditPublic(..., "guestControl")`
  nos controles de cronômetro, votação e tarefas.
- 1 alta só em dev: `vite` 8.3.x → QA.
- Teto global de memória / `MAX_ROOMS` com base no uso real (nota em #28).
- Teste em navegador: código de sala novo a cada execução (sala anterior fica viva no
  período de reconexão).

## Próximo passo

Mesclar #73 com CI verde; depois revisar PRs do Frontend que usem as permissões.
