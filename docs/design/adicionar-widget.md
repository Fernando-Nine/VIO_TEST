# Adicionar widget — spec (#150, escolha A + B + C)

Seção "Escolhidas" do canvas da leva 3
(https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ#escolhidas).

## Painel — categorias da leva 4 (#196, escolha B + Comunidade)

Canvas da leva 4, prancha "Escolhida 196B" (https://claude.ai/artifact/7ERZLFRtHn6xXE6mXcoPUf).
Substitui as abas Widgets · Telas · Sala · Comunidade e o segmentado Para mim / Para a sala.

- Painel lateral de 470 px. De cima para baixo:
  1. **Buscar widget** (foco automático ao abrir).
  2. Abas (sublinhado `#A6A9FF`): **Assistir** · **Conversar** · **Decidir e jogar** ·
     **Tempo** · **Comunidade**. Buscando, as abas somem e o resultado vem de todas.
  3. Seção **Não exibidos** (só se houver; ver [cabecalho-widget.md](cabecalho-widget.md)).
  4. Lista da aba, uma linha por item: ícone `#A6A9FF`, nome, uma linha de descrição e,
     à direita, os botões:
     - item que pode ser da sala: **Para mim** (`.secondary`) e **Para a sala** (`.primary`);
     - item só pessoal: **Adicionar** e "Só para você · …" no começo da descrição.
       Convidado sem permissão de criar na sala vê só **Adicionar** (para si).
  5. Rodapé: botão **Widgets da sala** com o total em mono; abre a lista dos widgets da
     sala ("Criado por …", Mostrar), que antes era a aba Sala.
- Itens por aba:
  - **Assistir**: telas ao vivo da sala ("Tela de Ana · Ao vivo · VLC"), Minha tela,
    Meus espectadores, Conexão (todos só pessoais).
  - **Conversar**: Chat (mim/sala), Pessoas (só pessoal).
  - **Decidir e jogar**: Votação, Dados, Sorteador, Placar (todos mim/sala).
  - **Tempo**: Cronômetro, Tarefas + agenda (mim/sala).
  - **Comunidade**: "Widget personalizado · Widgets criados pela comunidade. Em breve."
    com **Saber mais**, que abre o aviso atual ("Em breve, você poderá encontrar
    widgets criados pela comunidade…"). Não some: guarda o lugar da área de comunidade.
- "Personalizado" passa a se chamar **Placar** (sugestão aceita junto da B).
- Abre na última aba usada (pessoal, navegador). Corrige o #190: nada pessoal é criado
  como widget da sala, porque a escolha é feita no próprio item.

## No espaço vazio (B + busca)

- Clicar em "Adicionar widget" num espaço vazio abre o catálogo **dentro do espaço**,
  já com a busca focada e as abas em texto curto. Cada item tem **Mim** e **Sala**
  (ou só o ícone, se for só pessoal).
- Os itens se adaptam ao espaço:
  - Tira (280×160): só ícones, 5 por linha; nome na dica.
  - Lateral (420×240): ícone + nome curto, 5 por linha.
  - Buscando: sobra espaço, e cada resultado vira linha com ícone, nome e descrição.
- Esc ou clicar fora fecha e volta a "Adicionar widget".

## Busca (C)

- Filtra por nome e por palavras da descrição, sem acento ("cronometro" acha Cronômetro).
- Setas navegam pelos botões dos resultados; Enter aciona o botão em foco (sem atalho novo).
- Sem resultado: "Nenhum widget com esse nome."

## Estado

Última aba lembrada por pessoa (navegador). Criar widget da sala passa
pelas permissões do servidor.
