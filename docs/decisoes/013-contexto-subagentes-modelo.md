# 013 — Contexto, subagentes e modelo por tarefa

Data: 2026-11-05

## Contexto

Medido em 4 nov: todo chat começa com ~71–81 mil tokens fixos, e o trabalho da 1ª mensagem leva
a 180–250 mil. Trocar de chat à mão perdia contexto e esperar a CI no chat gastava créditos.

## Decisão

- Compactação automática aos 200 mil tokens (`autoCompactWindow` em `.claude/settings.json`),
  com as instruções da seção "Compact instructions" do `CLAUDE.md`. Ninguém troca de chat à mão.
- Áreas: 1–2 issues por sessão, aberta pelo copiloto. O copiloto continua no mesmo chat e usa
  `/compact` antes de pausar por horas.
- O copiloto conversa; subagentes executam (release, pesquisa, arrumação, varreduras) e devolvem
  até 10 linhas. O copiloto cria subagentes sem pedir ao usuário.
- Modelo por tarefa (tabela no `CLAUDE.md`): Opus para Mídia, segurança, interface complexa e
  animações; Sonnet para QA, textos, Jurídico, Roteirista, Backend de rotina, bugs P1 simples e
  revisores; Haiku para buscas simples.
- PR com `Closes #N` e auto-merge (squash); ninguém espera a CI no chat.

## Motivo

Cada mensagem relê todo o contexto: chat menor e modelo do tamanho da tarefa custam menos sem
perder qualidade onde ela importa.

Não rediscutir sem o usuário.
