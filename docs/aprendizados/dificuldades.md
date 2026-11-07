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

### 2026-11-07 · midia · PiP no app Windows

No Tauri 2 (wry 0.57), toda janela nova é recusada quando o app não registra `on_new_window`. A hipótese é que o Document PiP do WebView2 passe por esse caminho. O botão aparecia porque a API existe no objeto, mas no relato do usuário o clique não fazia nada. Só o aceite na prévia confirma a causa. Lição: no app, detectar a API não basta. Esconda o recurso pelo `desktop` até provar que ele funciona.
Ref: #280 · Vira skill? não
