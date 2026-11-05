# Copiloto — handoff

Atualizado: 2026-11-05 (3)

## Agora

#287 entregue: `docs/catalogo/` com 11 fichas por tema, `dependencias.md` e o `GUIA.md` (versão
explicada). PR com auto-merge. `CLAUDE.md`, `ESTADO.md`, ADRs 016–017 e o handoff do QA já
apontam o catálogo.

## Pendente / bloqueios

- Triagem dos achados (`docs/catalogo/README.md`, "Principais achados"): o usuário escolhe quais
  viram issue; nenhuma aberta ainda.
- #135 (TURN da Cloudflare): avisar o usuário quando chegar a vez (ele passa as variáveis).
- Parecer captura nativa x anti-cheat (Mídia + `pesquisador`): partir do achado 10.2; falta teste
  num jogo protegido.
- Revisão mensal do `CLAUDE.md`: ~4 dez.

## Decisões do copiloto

- Conversar com o usuário antes de pedir ideia visual nova a uma área; bugs e pedidos explícitos
  seguem direto.
- Respostas ao usuário curtas, um tópico por vez quando houver vários.
- `git push` sempre com o nome do branch (`git push -u origin <branch>`): o branch criado a partir
  de `origin/main` herda `main` como upstream e o push sem nome falha calado.
- Ao abrir sessão de área: passar o modelo da tabela do `CLAUDE.md`, 1–2 issues e a ficha do
  catálogo do tema.
- Antes de implementar, revisar o código do tema, não só a ficha (usuário, 5 nov).

## Próximo passo

#286: revisar o código de saída e reconexão a partir da ficha 02 (achados 02.1–02.5), escrever o
plano na issue (toca o protocolo: `goldfish` antes) e abrir a sessão do Backend (Opus).
