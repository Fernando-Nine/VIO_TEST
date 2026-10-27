# Copiloto — handoff

Atualizado: 2026-10-27

## Agora

Sessões (tag `vio-team`; filhas deste copiloto `session_01K4nnLQJbC6BuMckjZyonkr`):

- Frontend 11 `session_01K4nnLPcatWE4bNXvrhaipt` — fez #160, #207, #209 (rc.4); ver se encerrou.
- Mídia 4 `session_01K4nnLPBU2sPjZDCpRvt7m8` — fez #162; segue #194.
- Mídia 5 `session_01K4nnLTTWHjcmDPhoVsd5N2` — #192 captura nativa (crate `webview2-com` aprovado).
- Design leva 4 `session_01K4nnLSEtVrVyuaWhzvz189` — canvas publicado, aguarda escolhas.
- Encerrados: Frontend 9 e 10 (#159), Mídia 3 (#193, mídia da #160, parecer da #192).
- Usuário (27 out): pula a 2.10.0; produção será a 2.11.0 após aval na prévia.
  Figma e Canva liberados na rede e conectados (sessões novas já os recebem).
- Quando o Design entregar o canvas da #191: o usuário escolhe; vira spec; interface pelo
  Frontend usando a API da Mídia 5 (app) e o seletor do navegador (web).
- Brandbook/identidade/design system (prioridade 4): abrir Design novo com Figma/Canva.
- Jurídico: primeira tarefa sugerida = parecer de clips (#208) e base de termos/política.
- Agentes Jurídico e Roteirista criados; primeira tarefa a definir com o usuário.

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

Coletar as escolhas do usuário no canvas da leva 4 (Design avisa) e mandar #191 para o
Frontend com a API da Mídia 5. Ao fechar #194 e #192, pedir aval da 2.11.0 e publicar no VIO:
árvore idêntica ao commit aprovado do VIO_TEST (`git checkout <sha> -- .`), PR no VIO,
squash, tag `v2.11.0` pelo usuário em Releases.
