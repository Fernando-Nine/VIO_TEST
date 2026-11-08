# Cores

Tema escuro único. Fonte: `src/client/styles.css` (`:root`) e `src/shared/colors.ts` (`colorPresets`,
usado pelo `ColorPicker.tsx`). Arquivos: [`../brandkit/paleta.css`](../brandkit/paleta.css) e
[`../brandkit/paleta.json`](../brandkit/paleta.json). Contraste medido sobre `--bg` `#0B0C13`.

| Token          | Valor     | Contraste | Uso                                                                                                 |
| -------------- | --------- | --------- | --------------------------------------------------------------------------------------------------- |
| `--blue`       | `#2727F5` | 2,50      | Marca: Ponto, logo, botão principal. Branco sobre azul: **7,79**. Nunca texto azul no fundo escuro. |
| `--blue-light` | `#A6A9FF` | 9,05      | Destaque discreto (vencedor, crítico), link, contorno de estado                                     |
| `--bg`         | `#0B0C13` | —         | Fundo                                                                                               |
| `--panel`      | `#14151F` | —         | Painéis, widgets                                                                                    |
| `--raised`     | `#1B1C29` | —         | Menus, elevados                                                                                     |
| `--line`       | `#2A2C3C` | 1,42      | Bordas e divisórias, só decorativas                                                                 |
| `--text`       | `#F3F3FB` | 17,68     | Texto                                                                                               |
| `--muted`      | `#A3A5BC` | 8,05      | Texto secundário                                                                                    |
| `--focus`      | `#C8CEFF` | 12,76     | Anel de foco                                                                                        |
| `--live`       | `#4CDDC3` | 11,56     | Ao vivo, fala com câmera                                                                            |
| `--danger`     | `#FF8A96` | 8,67      | Erro, ação destrutiva                                                                               |
| (`#F2D36B`)    | `#F2D36B` | 13,29     | Volume acima de 100% (hoje solto em `finish.css`; vira token `--over`)                              |

**Cores das pessoas** (`colorPresets`): Rosa `#EC75B5`, Amarelo `#F5CB55`, Verde `#67CB96`, Anil
`#2727F5`, Ciano `#60CFDC`, Vermelho `#ED747C`, Roxo `#AB88EE`, Laranja `#F1A365`. Todas passam de
6:1 no fundo, menos Anil (2,50), que é a cor padrão e segue a regra do azul. A pessoa pode escolher
qualquer HEX; o texto sobre a cor usa `colorInk()`.

**Proporção:** fundo e painéis dominam; o azul aparece pouco e sempre com intenção (o Ponto, uma ação
principal). Uma cor de estado por vez na mesma área.

**Pendência para o Frontend** (#227, depois do aval): `room.css` repete tokens com valores diferentes
(`--panel` `#151722`, `--blue-light` `#a8adff`…), há ~40 cores soltas e raios de 3 a 18 px sem escala.
Este capítulo é a referência para unificar.
