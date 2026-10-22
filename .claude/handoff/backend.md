# Backend/Segurança — handoff

Atualizado: 2026-10-22

## Agora

Nada em andamento após o PR #33 (orçamento de memória por sala).

## Feito recentemente

- Diagnóstico de servidor/protocolo: auth HMAC, origem, CSP, zod `.strict()` e rate
  limits estão corretos. As permissões de widgets/chat/papéis (E7) são conferidas no servidor.
- #28 / #31 (PR #33): chat 100 msgs + 32k caracteres e até 4 chats por sala; histórico
  de módulos 20 resultados + 8k; pedidos de compartilhamento limitados a 48 (respondidos
  descartados primeiro); quem sai deixa `guestEditors`; sucessão prefere quem está online.
- #12 (servidor): `module-interact {kind:"reset", revision}` exige criador/admin/permissão
  (`editable` em `rooms.ts`). Contrato comentado na issue; falta só a interface (Frontend).

## Decisões

- Orçamento por caracteres (`trimToBudget` em `widgets.ts`), além da contagem: as
  mensagens antigas saem primeiro, as recentes nunca são recusadas.
- Dono de widget aprovado (convidado) **não** edita/reinicia sem permissão explícita;
  segue `canEditPublic`. Mudar isso é decisão de produto.

## Pendente / bloqueios

- #30: eventos incrementais (chat/módulos) em vez de reenviar o widget inteiro e o snapshot
  completo a cada `broadcast`. Muda o protocolo; combinar com o Frontend.
- Teto global de memória ou `MAX_ROOMS` menor, com base no uso real (nota em #28).
- Sala sem teto de participantes (decisão vigente); cada entrada custa O(N²) em snapshots.
- A skill `security-review` só revisa diffs; para auditoria completa, revisar à mão.

## Próximo passo

Propor o formato dos eventos incrementais de #30 em `protocol.ts` e alinhar com o Frontend.
