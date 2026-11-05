# 001 — Permissões da sala e widgets pessoais ou da sala

Data: 2026-10 (#71, #104, #145, #146)

## Contexto

Widgets podem ser de uma pessoa ou de todos, e a sala precisa de controle sobre quem mexe no que
é compartilhado.

## Decisão

- Permissões no estilo cargos do Discord: criador e admins controlam os widgets da sala;
  convidados, conforme os switches da sala.
- Widget é **pessoal** (só quem criou vê) ou **da sala** (criador e admins; convidados se a sala
  permitir). A escolha é na criação; não existe compartilhar widget pessoal.
- Widget da sala é um só estado para todos, via servidor (regra no `CLAUDE.md`).
- Fechar: widget da sala tem − (minimizar, só para você) e × (fechar para todos) para dono,
  admins e criador; os demais só −. Widget pessoal só ×.
- Rodapé: Entrar na chamada, Compartilhar e Flutuante juntos à esquerda, nessa ordem; o volume
  fica em cada tela, não no rodapé.
- Visual novo de widget passa por rascunhos da área Design antes do código.

## Motivo

Modelo conhecido de quem já usa o Discord, sem estado dividido entre as pessoas da sala.

Não rediscutir sem o usuário.
