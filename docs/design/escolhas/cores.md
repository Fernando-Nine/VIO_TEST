# Cores

**Retrato atual, decide na fase 3** do [plano](../guias/plano.md). Nada aqui é decisão; o estilo
final (fase 2) ainda vai mexer.

## Em uso hoje (`src/client/styles.css` `:root`)

| Token          | Valor     | Papel              |
| -------------- | --------- | ------------------ |
| `--bg`         | `#0B0C13` | fundo              |
| `--panel`      | `#14151F` | painel             |
| `--raised`     | `#1B1C29` | superfície elevada |
| `--line`       | `#2A2C3C` | linha e borda      |
| `--muted`      | `#A3A5BC` | texto secundário   |
| `--text`       | `#F3F3FB` | texto              |
| `--blue`       | `#2727F5` | azul da marca      |
| `--blue-light` | `#A6A9FF` | destaque discreto  |
| `--live`       | `#4CDDC3` | ao vivo            |
| `--danger`     | `#FF8A96` | erro e perigo      |
| `--focus`      | `#C8CEFF` | anel de foco       |

## Problemas a resolver

- **`--focus` diverge.** `#C8CEFF` em `src/client/styles.css`; `#A8ADFF` em `room.css` e em
  `landing.css` (via `--accent`). Unificar nos tokens (fase 4).
- **Contraste do azul.** `#2727F5` sobre `#0B0C13` dá **2,50:1** (2,33:1 sobre `#14151F`): serve
  para elemento gráfico grande, não para texto nem ícone fino (AA pede 4,5:1 e 3:1).
