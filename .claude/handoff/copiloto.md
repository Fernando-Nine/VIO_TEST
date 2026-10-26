# Copiloto — handoff

Atualizado: 2026-10-26

## Agora

Sessões ativas (tag `vio-team`; criar com `create_session`, source VIO_TEST):

- QA/Release `session_01GoaQuuAx1QX9U3Xsnr2eUx` — sem acesso ao VIO; releases de produção ficam com o copiloto.
- Frontend/UX (5) `session_01AkdYFCsjwmModvqsA6Dyga` — fila: #107, #123+#109, #122 (UI), #115.
- Backend: sem sessão ativa (último arquivado após #122/PR #126); abrir nova quando houver tarefa.
- Mídia (2) `session_01Q7SGieUDumQL8PUpbo7nEM` — canais VIO/VIO Teste + docs/WINDOWS-RELEASE.md, #122 (cliente), #118.
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

- App Windows com WASAPI (#120) pronto para teste: usuário precisa pôr `ALLOWED_APP_ORIGINS=https://tauri.localhost`
  no Render da prévia (Environment → Add Environment Variable; nome digitado à mão, funciona no Free).
- Hospedagem: ficar no Render (Vercel não serve: sem servidor WebSocket persistente). Ao abrir ao
  público, produção no plano Starter (~US$ 7/mês) para não dormir. Alternativas: Fly.io, Railway.
- TURN (#135, futuro): conferir ExpressTURN e avaliar Cloudflare Realtime/coturn.
- Copiloto novo deve ser aberto pelo usuário (sessão filha não tem create_session/send_message).

- Usuário cadastrar a chave privada do updater como secret (ele avisa).
- Tags v2.7.2, v2.8.0, v2.8.1 no VIO: rede dos agentes recusa push de tag; usuário pode
  criar em Releases (commits c249a34, 8993afb, 246aea1).
- Grid celular e pauta futura de Design (landing/página de download).

## Próximo passo

Acompanhar as filas; quando a prévia tiver #104–#111 e #122/#123, propor release 2.9.0.
Para publicar no VIO: árvore idêntica ao commit aprovado do VIO_TEST (git checkout <sha> -- .),
PR no VIO, squash, conferir rodapé com o usuário.
