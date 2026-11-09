# Tema, cores, fontes e ícones

## Tema

- **Noite** é o tema padrão, escolhido em Ajustes. Temas nossos e da comunidade ficam para depois.
- Origem: [decisão 003](../../decisoes/003-temas.md), out 2026.

## Fontes

- **Bricolage Grotesque** na interface.
- **IBM Plex Mono 400** em código da sala, ping, tempos e números.
- Origem: `CLAUDE.md`, "Convenções".

## Ícones de interface

- **`lucide-react`**.
- Origem: `CLAUDE.md`, "Convenções".

## Cores em uso hoje

Valores de `src/client/styles.css` `:root`. Estão **em uso**, não fechados: o estilo final (fase 3
do [plano](../guias/plano.md)) ainda vai mexer neles.

| Token          | Valor     | Papel                                   |
| -------------- | --------- | --------------------------------------- |
| `--bg`         | `#0B0C13` | fundo                                   |
| `--panel`      | `#14151F` | painel                                  |
| `--raised`     | `#1B1C29` | superfície elevada                      |
| `--line`       | `#2A2C3C` | linha e borda                           |
| `--muted`      | `#A3A5BC` | texto secundário                        |
| `--text`       | `#F3F3FB` | texto                                   |
| `--blue`       | `#2727F5` | azul da marca                           |
| `--blue-light` | `#A6A9FF` | destaque discreto                       |
| `--live`       | `#4CDDC3` | ao vivo                                 |
| `--danger`     | `#FF8A96` | erro e perigo                           |
| `--focus`      | `#C8CEFF` | anel de foco (diverge em outras folhas) |

Pendências de cor (foco divergente e contraste do azul): [`../escolhas/README.md`](../escolhas/README.md).
