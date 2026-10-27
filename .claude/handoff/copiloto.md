# Copiloto — handoff

Atualizado: 2026-10-27

## Agora

Sessões (tag `vio-team`; `create_session` com source VIO_TEST; todas na nuvem, filhas do copiloto):

- Frontend (8) `session_01K4nnLPSzfxm1FqPAnwJg1T` — 2.10.0: #161, #167, #163, #158 (Frontend 7 fez #166, #164, #165; prévia 2.10.0-rc.1).
- Backend `session_01K4nnLRjAKXcLnbTJWeqTjN` — servidor da #158 feito (PR #171); ocioso.
- Design `session_01K4nnLRKbUq1b5jSQGCg46V` — skill `vio-design-delivery` e `ideias-futuras.md` feitos (PR #173/#174); ocioso.
- Mídia: abrir sessão nova para #160/#162 (2.11.0) quando o Frontend chegar lá.
- Não reutilizar sessões acima de 200 mil tokens (Frontend 6, Mídia 2, Design leva 3).
- Limite semanal de uso em aviso (`allowed_warning`, 27 out): evitar sessões paralelas desnecessárias.

## Feito recentemente

- **2.9.0 em produção** (VIO PR #4 = VIO_TEST bbb5c23); registro estável 2.9.0 já no `releases.ts`. Tag `v2.9.0` criada pelo usuário.
- #83 fechada (zod 4 e `npm audit` na CI já estavam feitos).

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

- App Windows com WASAPI (#120) pronto para teste; `ALLOWED_APP_ORIGINS` já está nos dois Render.
- Hospedagem: ficar no Render (Vercel não serve: sem servidor WebSocket persistente). Ao abrir ao
  público, produção no plano Starter (~US$ 7/mês) para não dormir. Alternativas: Fly.io, Railway.
- TURN (#135, futuro): conferir ExpressTURN e avaliar Cloudflare Realtime/coturn.
- Copiloto novo deve ser aberto pelo usuário (sessão filha não tem create_session/send_message).

- Usuário cadastrar a chave privada do updater como secret (ele avisa).
- Tags v2.7.2, v2.8.0, v2.8.1: não criar (decisão antiga). Próximas tags o usuário cria em Releases.
- Grid celular e pauta futura de Design (landing/página de download).

## Próximo passo

Acompanhar o Frontend 8 (2.10.0). Ao fechar a 2.10.0, abrir Mídia para #160/#162 e Frontend para #159. Conferir no vio-releases se o build `VIO Windows` da main publicou o `beta` (CI verde em 27 out; a API pública não respondeu daqui). Roadmap em `docs/ROADMAP.md`.
Para publicar no VIO: árvore idêntica ao commit aprovado do VIO_TEST (git checkout <sha> -- .),
PR no VIO, squash, conferir rodapé com o usuário.
