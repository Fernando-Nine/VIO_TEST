# Erros evitados

Formato e propósito: [README](README.md).

### 2026-11-07 · qa · revisão antes do merge vale

A PR #291 (saída rápida) gerou a regressão #301; só depois o `goldfish` em modo diff pegou a sonda frágil. Revisar o diff antes do merge teria pego.
Ref: #291, #301 · Vira skill? sim

### 2026-11-07 · copiloto · worktree próprio por área

`git stash` e `pkill` numa pasta compartilhada derrubaram o trabalho de outra área. Nunca dividir a mesma pasta; usar `git worktree add`.
Ref: CLAUDE.md, Trabalho · Vira skill? sim
