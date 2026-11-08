# Tipografia e ícones

## Fontes

| Papel     | Fonte                          | Token    | Onde                                         |
| --------- | ------------------------------ | -------- | -------------------------------------------- |
| Interface | Bricolage Grotesque (variável) | `--font` | Tudo: títulos, botões, texto                 |
| Números   | IBM Plex Mono                  | `--mono` | Código da sala, ping, tempos, contagens, HEX |

- Pesos: 400 (texto), 600 (botões, rótulos), 700–800 (títulos grandes). No máximo 2 pesos e 3 tamanhos
  por widget.
- Escala de partida: 12 · 14 · 16 (base) · 20 · 28 · 40 · 56 px. Títulos com `text-wrap: balance`.
- Números que mudam: `font-variant-numeric: tabular-nums`.
- Código da sala sempre em mono, maiúsculo, com espaçamento leve: `ABC-123`.
- Rótulo pequeno em maiúsculas só em mono, com `letter-spacing` 0,04 em.

## Ícones

`lucide-react`, e só ele. Traço 1,5–2 px, tamanhos 16 / 20 / 24 px, cor do texto (`currentColor`).
Ícone sozinho em botão sempre com `aria-label`. Alvo mínimo 40 px no mouse, 44 px no toque, mesmo que o
desenho seja 16 px. Estado nunca só pelo ícone: mudo é `MicOff` **e** rótulo ou dica.

Ícones de referência no app: `Mic`/`MicOff`, `Monitor` (tela), `Users` (pessoas), `Copy` (convite),
`Lock` (sala trancada), `Check`, `X`, `Settings`, `Palette`.
