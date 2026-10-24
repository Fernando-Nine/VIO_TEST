# Dados — spec (escolha A · Ícones)

Prancha: "Dados A · Ícones" no canvas.

## Estrutura

- **Teclado de dados**: 6 botões com ícone de contorno e rótulo mono — d4 (triângulo),
  d6 (quadrado), d8 (losango), d10 (pipa), d12 (pentágono), d20 (hexágono com triângulo).
  Tocar insere/acumula no comando (`1d20` → `2d20`; outro tipo soma com `+`).
- **Campo de comando** mono, vazio com sugestão (`Ex.: 2d6+3`), e botão `Rolar`.
- **Cabeçalho**: manter o ícone **?** (`HelpCircle`), que abre o "Guia de dados" já
  existente com a sintaxe correta.
- **Último resultado**: total em mono; partes entre colchetes (`1d20+5 · [20]+5`) e autor.

## Crítico

- Face máxima de um d20 (20) = crítico: número e contorno do dado em `#A6A9FF`/`#C8CEFF`
  sobre `#1F2140` e um selo pequeno "Crítico". Sem cor nova nem efeito grande.
- A lógica de quando é crítico fica com o Frontend/Backend (sugestão: 20 natural em d20).

## Tamanhos

- **Pequeno**: teclado (6 botões), comando + Rolar, linha do último resultado. Vazio:
  "Ninguém rolou ainda." Sem rolagem.
- **Foco**: à esquerda, o dado rolado desenhado grande (forma do tipo, valor dentro),
  `+5`, total 96 px e selo de crítico; depois "Nine rolou 1d20+5", teclado e comando.
  À direita (300 px), **Histórico** com bolinha da cor do autor, nome, comando mono e total.
- **Celular**: dado + total no topo, histórico com as 3 últimas, teclado e comando embaixo.

## Movimento

Rolagem curta: o dado entra girando e crescendo em ~420 ms. Sem animação em movimento
reduzido.
