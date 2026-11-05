# 011 — Fluxo de trabalho e equipe

Data: 2026-10-27

## Contexto

Os agentes trabalhavam em "rodadas" e o caminho até a produção não era fixo.

## Decisão

- Tarefas são Issues no VIO_TEST; um branch e uma PR por tarefa, CI, squash merge pelo agente.
- A produção recebe o mesmo código da prévia, por PR de release no VIO e tag, após aval do
  usuário (exceção: ADR 005).
- Áreas novas: Jurídico e Privacidade (sem verba para advogado agora) e Roteirista.
- O copiloto conversa com o usuário antes de pedir ideias visuais novas a uma área; bugs e
  pedidos explícitos seguem direto.

## Motivo

Rastreio simples e reversível, sem revisão humana obrigatória em cada PR.

Não rediscutir sem o usuário.
