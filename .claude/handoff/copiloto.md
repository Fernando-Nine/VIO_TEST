# Copiloto — handoff

Atualizado: 2026-11-05 (2)

## Agora

Auto-merge ligado e verificado; plugins/conectores removidos; release `v2.11.0` feita (usuário, 5 nov).
#242 fechada (aviso de convite revogado descartado). Novas: #285 (P1 frontend, `Home` no navegador),
#286 (P1 backend, saída fica "reconectando"; espera o tema 02 da #287), #287 (catálogo técnico,
plano revisado pelo `goldfish`, `aguarda-usuario`: respostas do elephant + o usuário põe no máximo).

## Aguardam o usuário

- Respostas às perguntas da #287 e aval do plano.
- #135: avisar o usuário quando chegar a vez (ele passa as variáveis).

## Depois

- #287 etapas 1–5; em paralelo, área frontend pode pegar #285 (Sonnet).
- Fila P1: #281, #266, #268, #280 (com Mídia); depois #261, #270.
- Mídia + `pesquisador`: parecer captura nativa x anti-cheat (entra na pesquisa da #287).
- Revisão mensal do `CLAUDE.md`: ~4 dez.

## Decisões do copiloto

- Conversar com o usuário antes de pedir ideia visual nova a uma área; bugs e pedidos explícitos
  seguem direto.
- Respostas ao usuário curtas, um tópico por vez quando houver vários.
- `git push` sempre com o nome do branch (`git push -u origin <branch>`): o branch criado a partir
  de `origin/main` herda `main` como upstream e o push sem nome falha calado.
- Ao abrir sessão de área: passar o modelo da tabela do `CLAUDE.md` e 1–2 issues.

## Próximo passo

Com o aval da #287: crawlers (etapa 1) em segundo plano.
