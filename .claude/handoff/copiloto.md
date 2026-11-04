# Copiloto — handoff

Atualizado: 2026-11-04

## Agora

Chat `session_01K4nnLSxASaRLsvR8RRDPnQ` encerrado (passou de 200 mil). Nenhuma área trabalhando.
PR VIO_TEST #283 (processo + limpeza dos handoffs): squash quando a CI ficar verde, se ainda aberta.

## Aguardam o usuário (mostrar um tópico por vez, curto)

1. **Contexto dos chats** (medido em 4 nov): todo chat começa com ~71–81 mil tokens fixos
   (instruções, ferramentas, skills, os dois `CLAUDE.md`); papel + handoff + ESTADO somam ~10 mil.
   O que leva a 180–250 mil é o trabalho na 1ª mensagem (Mídia 9: 114 passos, US$ 8,56). Propostas:
   (a) 1–2 issues por chat e troca aos 150 mil; (b) auto-merge da PR em vez de esperar a CI no chat
   (exige regra de branch com `check` obrigatório no VIO_TEST, agora público); (c) usuário desligar
   conectores e plugins sem uso nas sessões do VIO (marketing, Adobe, Canva, Miro, Gmail, Slack,
   Drive) e a cópia duplicada das skills (plugin "VIO:" igual a `.claude/skills/`).
2. **Elephant-Goldfish + Crawler + Pesquisador**: proposta em `docs/planos/fila-e-agentes.md`
   (seções 2 e 3). Com o aval: criar as skills e os agentes.
3. **ADRs** (`docs/decisoes/`, migrar Decisões do ESTADO) e **modelos de issue**
   (`.github/ISSUE_TEMPLATE/` bug e feature): aprovados, fazer em alto esforço.
4. Tag `v2.11.0` em Releases (usuário).

## Depois

- Mídia + Pesquisador: parecer captura nativa x anti-cheat (Valorant).
- Lote do Frontend pela Fila: P1 #281, #266, #268, #280 (com Mídia); depois #261 (Opus máximo), #270.
- Revisão mensal do `CLAUDE.md`: ~4 dez.

## Decisões do copiloto

- Conversar com o usuário antes de pedir ideia visual nova a uma área; bugs e pedidos explícitos
  seguem direto.
- Respostas ao usuário curtas, um tópico por vez quando houver vários.
- `git push` sempre com o nome do branch (`git push -u origin <branch>`): o branch criado a partir
  de `origin/main` herda `main` como upstream e o push sem nome falha calado.

## Próximo passo

Abrir o tópico 1 com o usuário.
