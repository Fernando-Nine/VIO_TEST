# Copiloto — handoff

Atualizado: 2026-10-30

## Agora

Copiloto `session_01K4nnLTF5gUKwkjx99XxmGX` (passou de 390 mil tokens: trocar de chat).
Nenhuma área trabalhando. Sessões encerradas em 30 out: Frontend 14, Mídia 9, Design leva 5.
Design brandbook `session_01K4nnLQc9rnHwwaU5Jshvv4` parado em "Posso seguir?" (logo: usuário
fala direto com ele; o Frontend já aplicou a N3).

- **2.11.0**: produção sai do commit `fa75894` (rc.24). Crash corrigido e confirmado. Com o aval:
  PR de release no VIO com a árvore desse commit (`git checkout fa75894 -- .`) e a versão `2.11.0`
  estável em `releases.ts`/`package.json`/lock; tag `v2.11.0` pelo usuário.
- **2.12.0** na prévia (rc.6). Linha de versão: `2.12.0-rc.N`.
- **Aguardam o usuário**: (1) proposta Elephant-Goldfish + entrevista + crawler (resumo abaixo);
  (2) app em segundo plano = fechar janela deixa na bandeja, continua na chamada; ícone novo;
  (3) nomes das variáveis TURN no Render → trocar para Cloudflare (#135, recomendação da Mídia);
  (4) aviso de convite revogado (#260 só "bate na porta").
- **Lote do Frontend** (abrir só com tudo decidido; animações no Opus, avisar o usuário para pôr o
  raciocínio no máximo): #261, #266, #268, #270 (+ #258 pendências: tamanho do instalador = Backend).
- QA: #269 responsividade (Playwright na CI), #20, #21, #22 (CI agora grátis: VIO_TEST público).

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

Com o aval da 2.11.0: subir a versão estável em `releases.ts` + `package.json` no VIO_TEST, depois
árvore idêntica ao commit aprovado (`git checkout <sha> -- .`) num branch do VIO, PR, squash; tag
`v2.11.0` pelo usuário em Releases. Depois, transformar as ideias escolhidas em issues.
