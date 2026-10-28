# Copiloto — handoff

Atualizado: 2026-10-28

## Agora

Copiloto: `session_01K4nnLTF5gUKwkjx99XxmGX`. Sessões abertas (tag `vio-team`):

- Design brandbook `session_01K4nnLQc9rnHwwaU5Jshvv4` — canvas "VIO · Marca", issue #227.
- Encerradas em 28 out: Frontend 12 (#191, #221, #228, #222), Frontend 13 (#236), Mídia 6
  (#194, #229), Backend (#226), Roteirista (ideias, PR #230), Design leva 4.
- **2.11.0 pronta na prévia (rc.15)**, aguarda aval. Aceite humano no app: miniaturas do seletor,
  nome do programa em "Só som", CPU 1080p60. Com o aval: release no VIO (ver Próximo passo).
- Aguardam o usuário: ideias de sala (recomendado trancar + convite, depois grupo de bolso) e
  narrativa da landing (#197; Roteirista recomenda C "O ponto", depende do logo).
- Jurídico: primeira tarefa sugerida = parecer de clips (#208) e base de termos/política.

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

- Usuário cadastrar a chave privada do updater como secret (ele avisa).
- Tags v2.7.2, v2.8.0, v2.8.1: não criar (decisão antiga). Próximas tags o usuário cria em Releases.
- Grid celular e pauta futura de Design (landing/página de download).

## Próximo passo

Com o aval da 2.11.0: subir a versão estável em `releases.ts` + `package.json` no VIO_TEST, depois
árvore idêntica ao commit aprovado (`git checkout <sha> -- .`) num branch do VIO, PR, squash; tag
`v2.11.0` pelo usuário em Releases. Depois, transformar as ideias escolhidas em issues.
