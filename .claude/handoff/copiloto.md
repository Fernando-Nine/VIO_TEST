# Copiloto — handoff

Atualizado: 2026-11-04

## Agora

Copiloto `session_01K4nnLSxASaRLsvR8RRDPnQ`. Nenhuma área trabalhando.

- **2.11.0 em produção** (4 nov): VIO PR #5 = VIO_TEST `fa75894` + versão e notas estáveis. Registro
  estável também no VIO_TEST (PR #279). Tag `v2.11.0`: o usuário cria em Releases.
- **2.12.0** na prévia (rc.6). Linha de versão: `2.12.0-rc.N`.
- Issues abertas em 4 nov: #280 Flutuante no app, #281 avisos empurram o layout + textos na voz do
  brandbook, #282 app na bandeja + ícone novo.
- **Aguarda o usuário**: proposta `docs/planos/fila-e-agentes.md` (fila P0–P3, skills
  `elephant-copilot`/`goldfish-copilot`, agentes Crawler e Pesquisador). Com o aval: criar etiquetas,
  seção Fila no ESTADO, as duas skills e os dois agentes; depois pedir à Mídia+Pesquisador o parecer
  sobre captura x anti-cheat (Valorant) e abrir o lote do Frontend (#261 no Opus máximo, #266, #268, #270).
- **Processo adotado (4 nov)**: P0–P3 + Fila no ESTADO, Pronto, 1 issue por área, `aguarda-usuario`,
  `docs/RELEASE.md`, `docs/incidentes/`, regras que crescem + revisão mensal do `CLAUDE.md`
  (próxima: ~4 dez). Falta, no modo de alto esforço (usuário troca): **ADRs** (`docs/decisoes/`,
  migrar as Decisões do ESTADO) e **modelos de issue** (bug/feature em `.github/ISSUE_TEMPLATE/`).
  O `CLAUDE.md` do VIO recebe tudo na próxima release.
- Ainda pendentes: TURN Cloudflare (#135, explicar passo a passo quando o usuário pedir); aviso de
  convite revogado (#260).

Proposta Elephant-Goldfish (não aprovada ainda): tema novo → entrevista curta do copiloto →
plano em `docs/planos/<tema>.md` → aprovação → goldfish (sessão nova, modelo barato, lê só o plano)
critica → áreas caras executam em lote. Crawler: agente só leitura, modelo barato, usa
`code-review`/`security-review`, devolve arquivo:linha; antes de produção e semanal.

Custo por área (27–30 out, preço de tabela): Mídia ~61, Frontend ~50, Design ~28, copiloto ~23,
Backend ~8, Roteirista ~6 (US$). Maior causa: chats acima de 200 mil tokens.

## Feito recentemente

- **2.9.0 em produção** (VIO PR #4 = VIO_TEST bbb5c23); registro estável 2.9.0 já no `releases.ts`. Tag `v2.9.0` criada pelo usuário.
- #83 fechada (zod 4 e `npm audit` na CI já estavam feitos).

- Produção 2.8.1 (VIO PR #3, hotfix body-parser/zod). Prévia 2.9.0-rc.x com widgets novos.
- Skills de terceiros + próprias em `.claude/skills/` (PR #121); papéis dizem quais usar.
- Regra de contexto: trocar chat em ~200 mil tokens ou a cada 3–4 issues.

## Decisões

- **Copiloto conversa antes de mandar fazer** (usuário, 28 out): ideias visuais novas (transições,
  telas, mudanças de interação) primeiro são discutidas e aprovadas com o usuário; só depois viram
  pedido a uma área. Bugs e pedidos explícitos do usuário seguem direto.
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

Apresentar a proposta ao usuário (já feito neste chat) e executar o que ele aprovar.
Servidor próprio (futuro): começar com o nosso; terceirizar depois, com verba (TURN/SFU).
