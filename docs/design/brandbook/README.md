# Brandbook do VIO

Design · 2026-11-08 · #227. Arquivos prontos para usar: [`../brandkit/`](../brandkit/).
Prancha visual (consulta + escolhas em aberto): `../brandkit/index.html`, publicada em
https://claude.ai/artifact/UnQPQ3Fs6gxSVQg418btT7.

O que está aqui é **decidido**, salvo o capítulo [Em aberto](em-aberto.md), que espera a escolha do
usuário. Se o código divergir deste guia, vale o código (`src/client/styles.css`) e este guia é corrigido.

| Capítulo                                      | O que diz                                                  |
| --------------------------------------------- | ---------------------------------------------------------- |
| [Marca](#marca)                               | O que é o VIO, o logo, área livre, tamanhos mínimos        |
| [O Ponto](ponto.md)                           | A personalidade única do Ponto e as regras de forma e cor  |
| [Cores](cores.md)                             | Tokens reais, contraste medido, cores das pessoas          |
| [Tipografia e ícones](tipografia-e-icones.md) | Bricolage Grotesque, IBM Plex Mono, `lucide-react`         |
| [Voz e tom](voz.md)                           | Como o VIO fala, em português                              |
| [Movimento](movimento.md)                     | Resumo da decisão 020 e as regras do Ponto em movimento    |
| [Usos certos e errados](usos.md)              | O que fazer e o que nunca fazer com a marca                |
| [Em aberto](em-aberto.md)                     | O Ponto em telas, balões e pop-ups: 5 estilos × 5 exemplos |

## Marca

O VIO reúne pessoas para **assistir algo juntas**, direto do navegador, ao lado do Discord. A marca é
leve, próxima e um pouco brincalhona: um app de amigos, não de escritório. by NerdQuest Studios.

**Logo (N3 arredondada, já no app em `src/client/components/Logo.tsx`).** "VIO" em traço único de
24 unidades com pontas redondas, o O aberto e, na linha de base, o **Ponto**: um quadrado arredondado
azul. Proporção 268 × 100. O traço usa a cor do texto; o Ponto é azul `#2727F5`.

- **Área livre:** a altura do Ponto (22 de 100) em volta de todo o logo. Nada entra nesse espaço.
- **Altura mínima:** 16 px na tela (o logo do Início usa 24 px; cabeçalho 32 px; abertura 56 px).
  Abaixo de 16 px, use só o Ponto ou o ícone do app.
- **Ícone do app:** "V" branco num quadrado azul de cantos 18/64 (`brandkit/icone-app.svg`, igual
  ao `public/favicon.svg`). O canto segue a mesma proporção do Ponto (~27%).
- **NerdQuest Studios** assina fora do logo, em texto pequeno ("by NerdQuest Studios"), nunca
  encostado nem misturado ao "VIO".

Variações em [`../brandkit/logo/`](../brandkit/logo/):

| Arquivo                | Onde usar                                          |
| ---------------------- | -------------------------------------------------- |
| `vio-escuro.svg`       | Padrão. Fundo escuro do app (`#0B0C13`).           |
| `vio-claro.svg`        | Fundo claro (impressos, sites de terceiros).       |
| `vio-mono-branco.svg`  | Sobre foto, vídeo ou cor; uma cor só.              |
| `vio-mono-preto.svg`   | Impressão em uma cor, carimbo.                     |
| `vio-mono-azul.svg`    | Fundo branco quando só cabe a cor da marca.        |
| `vio-escuro-fundo.svg` | Já com o fundo escuro e área livre (avatar, card). |
| `vio-azul-fundo.svg`   | Já com fundo azul (avatar, capa).                  |

Ponto sozinho em [`../brandkit/ponto/`](../brandkit/ponto/) (azul, claro, branco, preto).
