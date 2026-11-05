# Copiloto — handoff

Atualizado: 2026-11-05

## Agora

Revisão de processo aprovada pelo usuário em 5 nov e entregue na PR VIO_TEST #284: compactação
automática aos 200 mil, subagentes `goldfish`/`crawler`/`pesquisador`, modelo por tarefa, plano na
issue, modelos de issue, notas da versão em `changes/` e ADRs em `docs/decisoes/`. A #284 entrou
na `main` (`b64de0c`) 3 min após aberta, com merge pelo usuário: auto-merge ainda não confirmado.
Nenhuma área trabalhando.

## Aguardam o usuário (mostrar um tópico por vez, curto)

1. **Auto-merge**: conferir se a #284 entrou sozinha. Se não, passos para o usuário (VIO_TEST e
   depois o mesmo no VIO):
   - Settings → General → marcar "Allow auto-merge".
   - Settings → Rules → Rulesets → New branch ruleset na branch padrão: "Require a pull request"
     (0 aprovações), "Require status checks to pass" só com `check`, "Block force pushes", bypass
     para Repository admin.
2. **Plugins e conectores sem uso**: pedir ao usuário para remover nas sessões do VIO (marketing,
   Adobe, Canva, Miro, Gmail, Slack, Drive) e a cópia duplicada das skills (plugin "VIO:" igual a
   `.claude/skills/`). Cada um soma tokens fixos em todo chat.
3. Tag `v2.11.0` em Releases (usuário).

## Depois

- Fila do `ESTADO.md`: P1 #281, #266, #268, #280 (com Mídia); depois #261 (Opus máximo), #270.
- Mídia + `pesquisador`: parecer captura nativa x anti-cheat (Valorant).
- QA fecha a prévia (`changes/README.md`) quando o usuário for testar.
- Revisão mensal do `CLAUDE.md`: ~4 dez.

## Decisões do copiloto

- Conversar com o usuário antes de pedir ideia visual nova a uma área; bugs e pedidos explícitos
  seguem direto.
- Respostas ao usuário curtas, um tópico por vez quando houver vários.
- `git push` sempre com o nome do branch (`git push -u origin <branch>`): o branch criado a partir
  de `origin/main` herda `main` como upstream e o push sem nome falha calado.
- Ao abrir sessão de área: passar o modelo da tabela do `CLAUDE.md` e 1–2 issues.

## Próximo passo

Tópico 1 aberto com o usuário (auto-merge); depois tópicos 2 e 3, e a fila P1.
