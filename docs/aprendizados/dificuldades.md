# Dificuldades

Formato e propósito: [README](README.md).

### 2026-11-07 · copiloto · duas áreas na mesma pasta

Duas áreas trabalharam na mesma pasta e misturaram mudanças; um `git stash` e um `pkill` de uma derrubaram o trabalho da outra.
Regra: cada área em worktree próprio (CLAUDE.md, Trabalho).
Ref: CLAUDE.md · Vira skill? sim

### 2026-11-07 · qa · MCP do GitHub não edita etiquetas

O MCP do GitHub não edita a descrição das etiquetas, e o copiloto precisava editá-las sozinho.
Solução: etiquetas num arquivo (`.github/labels.yml`) e um workflow que as sincroniza.
Ref: `.github/workflows/labels.yml` · Vira skill? talvez
