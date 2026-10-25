# Copiloto — handoff

Atualizado: 2026-10-25

## Agora

Sessões ativas (tag `vio-team`; criar com `create_session`, source VIO_TEST):

- QA/Release `session_01GoaQuuAx1QX9U3Xsnr2eUx` — sem acesso ao VIO; releases de produção ficam com o copiloto.
- Frontend/UX (4) `session_01D45oW522KhyYyuLgc4xukW` — fila: #104+#111, #108, #110, #107+#122, #109+#123.
- Backend (2) `session_0126n1TYdGG4qzor69AKvamM` — #122 (servidor do silenciar para todos).
- Mídia `session_01Dmf6n1sncaS6GtrMQUZGyp` — app Windows: WASAPI (#26) e canais VIO / VIO Teste.
- Design `session_01EfQg8NxYJ35Wh2zr9q6igF` — leva 2 entregue (#107–#111); ocioso.
- Tarefa agendada `trig_01Y6stnQYUT7NzutBNEgUzmK` (3 h) retoma agentes parados por limite.

## Feito recentemente

- Produção 2.8.1 (VIO PR #3, hotfix body-parser/zod). Prévia 2.9.0-rc.x com widgets novos.
- Skills de terceiros + próprias em `.claude/skills/` (PR #121); papéis dizem quais usar.
- Regra de contexto: trocar chat em ~200 mil tokens ou a cada 3–4 issues.

## Decisões

- Segurança vai direto para produção (hotfix PATCH sobre a produção), sem aval.
- Widgets: pessoais ou da sala; sem compartilhar (#104).
- Silenciar: "para mim" todos; "para todos" só o dono (#122).
- Notificações: ícone "ao vivo" das telas + sino com histórico (#123).
- Windows: dois apps (VIO estável → vio-quest; VIO Teste → vio-test), canais separados
  no vio-releases. Usuário testa já com WASAPI. Assinatura só ao abrir ao público.
- Grid (E10): máximo 3×4 no computador; celular a definir (proposta: 1 coluna).
- Usuário prefere respostas curtas; agentes respondem ao copiloto em ≤ 4 linhas.

## Pendente / bloqueios

- Usuário cadastrar a chave privada do updater como secret (ele avisa).
- Tags v2.7.2, v2.8.0, v2.8.1 no VIO: rede dos agentes recusa push de tag; usuário pode
  criar em Releases (commits c249a34, 8993afb, 246aea1).
- Grid celular e pauta futura de Design (landing/página de download).

## Próximo passo

Acompanhar as filas; quando a prévia tiver #104–#111 e #122/#123, propor release 2.9.0.
Para publicar no VIO: árvore idêntica ao commit aprovado do VIO_TEST (git checkout <sha> -- .),
PR no VIO, squash, conferir rodapé com o usuário.
