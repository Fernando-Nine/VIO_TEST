# Adicionar widget — spec (#150, escolha A + B + C)

Seção "Escolhidas" do canvas da leva 3
(https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ#escolhidas).

## Painel (A + busca) — botão "+ Widget"

- Painel lateral de 470 px, como hoje. De cima para baixo:
  1. **Buscar widget** (foco automático ao abrir).
  2. "Para mim / Para a sala" (segmentado). Linha de ajuda: "Só você vê." /
     "Todos veem. Quem controla segue as permissões da sala." Convidado sem permissão vê
     só "Para mim".
  3. Abas Widgets · Telas · N · Comunidade.
  4. Seção **Não exibidos** (só se houver; ver [cabecalho-widget.md](cabecalho-widget.md)).
  5. Grupos: **Na sala** (Pessoas, Minha transmissão, Câmeras, Chat), **Decidir e jogar**
     (Votação, Dados, Sorteador), **Tempo** (Cronômetro, Tarefas + agenda).
- Cartão: ícone `#A6A9FF`, nome e uma linha de descrição. Minha transmissão e Câmeras
  levam o selo "Só para você" e ignoram a escolha "Para a sala".

## No espaço vazio (B + busca)

- Clicar em "Adicionar widget" num espaço vazio abre o catálogo **dentro do espaço**,
  já com a busca focada e o segmentado "Mim / Sala".
- Os itens se adaptam ao espaço:
  - Tira (280×160): só ícones, 5 por linha; nome na dica.
  - Lateral (420×240): ícone + nome curto, 5 por linha.
  - Buscando: sobra espaço, e cada resultado vira linha com ícone, nome e descrição.
- Esc ou clicar fora fecha e volta a "Adicionar widget".

## Busca (C)

- Filtra por nome e por palavras da descrição, sem acento ("cronometro" acha Cronômetro).
- Enter adiciona o primeiro resultado com a escolha do segmentado; setas navegam.
- Sem resultado: "Nenhum widget com esse nome."

## Estado

Escolha "Para mim / Para a sala" lembrada por pessoa (navegador). Criar widget da sala passa
pelas permissões do servidor.
