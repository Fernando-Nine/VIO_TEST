# Sorteador — spec (escolha A · Roleta, cores editáveis)

Pranchas: "Sorteador A · Roleta" e "Sorteador · escolhido, cores e paletas".

## Estrutura

- **Roleta**: fatias proporcionais ao peso; ponteiro branco no topo; miolo escuro.
  Ao sortear gira ~800 ms com desaceleração e para com a opção sorteada sob o ponteiro.
  Nomes nas fatias (foco/celular), com texto escuro ou claro conforme a cor da fatia
  (contraste ≥ 4,5:1).
- **Resultado**: nome grande + "Restam N".
- **Lista**: quadradinho de cor, nome, peso `− ×2 +`; sorteados riscados com "sorteado";
  chave "Retirar sorteados".
- **Gráfico**: botão no cabeçalho oculta/mostra a roleta (oculta = resultado grande e lista).

## Cores

- **Cada quadradinho é um botão**: abre um popover com 12 cores harmônicas da paleta
  atual, barra de matiz e campo HEX (mesmo padrão do `ColorPicker` existente).
- **Paletas** (ícone de paleta no cabeçalho; folha inferior no celular): Índigo (padrão),
  Pôr do sol, Floresta, Doce, e **Aleatória**.
  - Índigo `#A6A9FF #2727F5 #1C1D6B #3A3DD8 #24255C`
  - Pôr do sol `#FFB38A #E8615A #B23A6B #6E2F8A #F2C94C`
  - Floresta `#4CDDC3 #2A9D8F #1F6F5C #8BC34A #E9C46A`
  - Doce `#F4A6C6 #C08BF2 #8AA8FF #7EE0D0 #FFD18A`
- **Aleatória** gera cores em harmonia, não ao acaso: matiz-base sorteado e as demais
  espalhadas por regra (análogas ou tríade), com saturação e luminosidade em faixa
  controlada, garantindo que fatias vizinhas difiram em luminosidade.
- Opção nova recebe a próxima cor da paleta atual.
- As cores são **estado da sala** (widget compartilhado): todos veem a mesma roleta.

## Tamanhos

- **Pequeno**: roleta de 140 px sem nomes, resultado, "Restam N", `Sortear`.
- **Foco**: roleta de 440 px; à direita resultado, lista com pesos e cores, chave e `Sortear`.
- **Celular**: roleta de 200–260 px, resultado, lista curta e `Sortear` fixo embaixo.

## Protocolo (Backend)

`src/shared/room-modules.ts`: cada opção ganha `color` opcional (HEX validado, `.strict()`)
e o módulo ganha `palette` (enum das paletas). Alterar cor/paleta passa pelo servidor com
a mesma permissão de editar opções.
