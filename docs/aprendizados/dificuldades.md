# Dificuldades

Formato e propósito: [README](README.md).

### 2026-11-07 · frontend · voltar depois de recarregar

Entradas criadas por `pushState` pertencem ao documento que as criou: depois de recarregar a sala, Voltar ao início é uma carga completa, e o `resume` (#286) reentrava sozinho. Solução: a sala se marca no `history.state` e `resume` só volta se a entrada atual é a da sala.
Ref: #309 · Vira skill? talvez

### 2026-11-07 · copiloto · duas áreas na mesma pasta

Duas áreas trabalharam na mesma pasta e misturaram mudanças; um `git stash` e um `pkill` de uma derrubaram o trabalho da outra.
Regra: cada área em worktree próprio (CLAUDE.md, Trabalho).
Ref: CLAUDE.md · Vira skill? sim

### 2026-11-07 · qa · MCP do GitHub não edita etiquetas

O MCP do GitHub não edita a descrição das etiquetas, e o copiloto precisava editá-las sozinho.
Solução: etiquetas num arquivo (`.github/labels.yml`) e um workflow que as sincroniza.
Ref: `.github/workflows/labels.yml` · Vira skill? talvez

### 2026-11-07 · frontend · aviso no fluxo empurra a tela

O `.notice` (landing, Home e painéis) era um bloco no fluxo: ao aparecer, empurrava o conteúdo (nos painéis) ou ficava escondido sob o cabeçalho (landing). Regra de `.player > .notice` era código morto. Solução: `.notice` fixo no topo, com `opacity`/`transform`. Conferir aviso sempre medindo `getBoundingClientRect` antes e depois.
Ref: #281 · Vira skill? não
