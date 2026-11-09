# Guia de componentes (fase 1c)

Estrutura e comportamento das superfícies do VIO: quando usar cada uma, o que ela tem, como abre,
fecha, recebe foco e fala. **Sem estilo visual**: raio, sombra, cor final e densidade ficam para as
fases 2 e 3 ([plano](plano.md)).

- Os problemas citados vêm do [inventário da fase 1b](inventario.md) (seções "1.x", "2.x" e "Base
  comum") e do [catálogo 07](../../catalogo/07-cliente-e-interface.md) (achados "07.N").
- **Regra** é o comportamento-alvo da fase 4: unifica o que hoje existe em várias formas,
  escolhendo uma delas, e corrige defeitos do inventário, sem criar nem tirar o que a pessoa pode
  fazer.
- **Sugestão** cria ou tira comportamento (o que aparece, quando, para quem, em que ordem) ou muda
  uma spec aprovada. Só vale com o aval do usuário; até lá, fica o que existe. A lista está na
  seção 6, e a tabela de migração (5) herda as marcas.
- Specs aprovadas que o guia segue: [notificacoes.md](../notificacoes.md),
  [cabecalho-widget.md](../cabecalho-widget.md), [widgets-padrao.md](../widgets-padrao.md),
  [transicoes.md](../transicoes.md) e [volume.md](../volume.md). Onde ele muda uma delas, é
  sugestão da seção 6.2, e a spec vale até o aval.
- Números novos são valores iniciais, marcados assim: tamanhos ficam para a fase 3 e tempos para a
  fase 5. O que vale é a ordem e o comportamento.

## 0. Base comum

### 0.1 Qual superfície usar

Faça as perguntas na ordem. A primeira resposta "sim" decide.

1. A ação não tem volta, a volta depende de outra pessoa ou ela corta algo dos outros? →
   **Confirmação** (1.9).
2. É só o nome ou a explicação de um controle? → **Dica** (1.6).
3. É um recado que a pessoa não pediu (de outra pessoa ou do sistema)? → **Aviso** (1.7).
4. É uma lista de ações sobre algo (pessoa, widget, espaço)? → **Menu** (1.8).
5. É uma escolha curta, ligada a um controle visível, que cabe em meia tela? → **Popover** (1.5).
6. A pessoa precisa ver a sala mudar enquanto escolhe? → **Folha lateral** (1.2).
7. É uma lista viva que a pessoa consulta enquanto segue usando a sala? → **Painel não modal**
   (1.4).
8. É uma tarefa curta e focada, que pede atenção total? → **Modal central** (1.1).

A **folha de baixo** (1.3) não entra na escolha: é a forma de celular das outras famílias (0.3). O
**card de widget** (1.10) não flutua, mas entra no guia porque abre, fecha e tem estados.

**Modal só abre por ação da própria pessoa (sugestão).** O que chega de fora (alguém compartilhou
uma tela, bateu na porta) vira aviso com ação, nunca modal. Hoje "Todos os espaços estão ocupados"
abre uma modal quando outra pessoa começa uma tela (2.6); até o aval, fica assim.

### 0.2 Um dono por família

- Cada família tem **um componente** e **um arquivo CSS dono**. Nenhum outro arquivo redefine a
  classe dele. Resolve `.primary` em 11 arquivos, `.sheet-content` em 6 e `.volume-popover` em 3
  (Base comum).
- Quem chama escolhe a família pelo nome (uma variante por família), não por combinação de
  booleanos como `centered` e `modal` do `Dialog.tsx` de hoje.
- A linha de ações (rodapé de modal, confirmação, aviso) é um bloco só. Hoje há
  `widget-dialog-actions` e `notification-actions`.

### 0.3 Celular

Corte único: **abaixo de 640 px**, o mesmo que `workspace.css` já usa no menu e no painel Pessoas.
Hoje o mesmo `<Dialog>` tem 4 comportamentos em 400 px (2.1).

| Família          | No celular                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Modal central    | Folha de baixo. Com navegação em dois níveis (Ajustes): folha de baixo em tela cheia.      |
| Folha lateral    | Folha de baixo alta; a prévia fica visível acima dela quando couber.                       |
| Painel não modal | Folha de baixo sem fundo, ainda não modal (como hoje).                                     |
| Popover          | Balão ancorado se couber em meia tela; senão, folha de baixo com título e X.               |
| Menu             | Folha de baixo com itens de 48 px (como hoje).                                             |
| Confirmação      | Folha de baixo com os botões empilhados.                                                   |
| Dica             | Aparece com toque longo, acima do dedo.                                                    |
| Aviso            | Como em [notificacoes.md](../notificacoes.md): largura total menos 16 px, abaixo da barra. |
| Card de widget   | Como nas specs dos widgets.                                                                |

### 0.4 Foco

- Abrir move o foco para dentro: para o primeiro controle útil, ou para o título (`tabindex="-1"`)
  quando o conteúdo é para ler ou quando o primeiro controle seria destrutivo.
- Fechar devolve o foco ao gatilho. Se o gatilho sumiu (o widget fechou, a pessoa saiu), o foco vai
  ao vizinho lógico: o próximo item da mesma lista, senão o anterior, senão o título da região.
- Modal, folha (forma modal) e confirmação prendem o foco, como `showModal()` já faz. Painel,
  popover em balão e menu ancorado não prendem; na forma de folha de baixo, vale 1.3.
- Como o foco aparece: regra 2.5.

### 0.5 Fechar

| Família          | Esc               | Clique ou toque fora | X        | Outros                                |
| ---------------- | ----------------- | -------------------- | -------- | ------------------------------------- |
| Modal central    | sim               | sim                  | sim      |                                       |
| Folha lateral    | sim               | sim                  | sim      |                                       |
| Folha de baixo   | sim               | só na forma modal    | sempre   | arrastar para baixo (opcional)        |
| Painel não modal | com o foco dentro | não                  | sim      | o gatilho alterna                     |
| Popover          | sim               | sim                  | não (\*) | o gatilho alterna; Tab para fora (\*) |
| Dica             | sim               | não se aplica        | não      | sai do hover ou do foco               |
| Dica clicável    | sim               | sim                  | não      | o gatilho alterna                     |
| Aviso            | com o foco nele   | não                  | sempre   | tempo, exceto erro e pedido (1.7)     |
| Menu             | sim               | sim                  | não (\*) | Tab (\*); escolher um item            |
| Confirmação      | = desistir        | = desistir           | não      | botão de desistir (1.9)               |

(\*) No celular, quando popover e menu viram folha de baixo, ganham X e prendem o foco (1.3): Tab
não fecha. "Tab para fora" vale só no balão e no menu ancorado.

- Esc fecha **só a superfície de cima**, uma por vez. Um campo de busca com texto pode usar o
  primeiro Esc para limpar; o seguinte fecha. Hoje o Esc falha de forma intermitente no catálogo
  (2.1); a regra é que nenhum Esc se perca.
- Em modal e menu, o clique fora só fecha. Em popover e dica clicável, o clique fora fecha e também
  vale para o que foi clicado, para trocar de um popover a outro com um clique.
- Fechar por Esc, fora ou X é cancelar: nada que a pessoa não confirmou acontece. O que já vale na
  hora (padrão do VIO, como os interruptores de Ajustes) fica.
- Se a superfície guarda texto digitado que só vale ao confirmar, o clique fora não fecha. Esc e X
  fecham, e o texto fica guardado até ela abrir de novo. **Sugestão.**

### 0.6 Camadas

Uma escala com nome substitui os mais de 20 `z-index` soltos (Base comum). Os números são valores
iniciais (fase 3). A ordem é **sugestão**: ela decide o que cobre o quê (a pilha de avisos sobe
acima do painel Pessoas, por exemplo), e o Frontend confere cada caso antes da fase 4.

| Camada                   | Token (sugestão)       | Valor inicial | O que mora nela                                                            |
| ------------------------ | ---------------------- | ------------- | -------------------------------------------------------------------------- |
| Base                     | `--layer-base`         | 0             | Palco, grade, cards, vídeo.                                                |
| Elevada                  | `--layer-raised`       | 10            | Card arrastado, legenda e selos sobre a tela.                              |
| Ferramentas do canvas    | `--layer-canvas-tools` | 20            | Alças, fantasmas, faixas de borda, alvos de soltar, escolha de espaço.     |
| Moldura                  | `--layer-chrome`       | 30            | Cabeçalho da sala, barra do canvas, rodapé, widgets minimizados.           |
| Painel                   | `--layer-panel`        | 40            | Painel não modal (Pessoas).                                                |
| Aviso                    | `--layer-toast`        | 50            | Pilha de avisos.                                                           |
| Top layer (do navegador) | sem `z-index`          | —             | Modal, folhas, confirmação, popover, menu e dica, na ordem em que abriram. |

- Fora da tabela, nenhum `z-index` global. Um componente isolado (o player, por exemplo) pode ter
  valores internos se criar o próprio contexto (`isolation: isolate`).
- A pilha de avisos fica **fora de qualquer contexto de empilhamento** (portal no `body` ou
  `popover="manual"`). Hoje ela tem 80 dentro do canvas e fica sob o painel Pessoas, que tem 50 em
  outro contexto (2.4).
- Na top layer, a última superfície aberta fica em cima. Dica e menu fecham antes que outra
  superfície abra sobre eles. Uma confirmação abre sobre o popover que a pediu, e o popover continua
  aberto embaixo.
- Com uma modal aberta, o resto da página fica inerte. Por isso, avisos novos aparecem como faixa
  dentro dela (1.7), e uma superfície aberta de dentro da modal mora dentro dela na árvore, senão
  fica inerte. O Frontend confere os popovers que hoje vão para o `body`.
- Em tela cheia, toda superfície abre dentro do elemento em tela cheia (como `AnchoredPopover` já
  faz) ou na top layer depois dele.

### 0.7 Estados comuns

- **Carregando.** Título e X aparecem na hora. O corpo já tem o tamanho final e mostra o indicador
  de carregamento do Ponto ([movimento-ponto.md](movimento-ponto.md), 3.7 e 8) com rótulo para o
  leitor (`role="status"`). Ele só aparece depois de ~300 ms (valor inicial; fase 5), para não
  piscar. Um botão que espera resposta mantém a largura, fica `aria-busy` e não aceita o segundo
  clique.
- **Erro.** Faixa de aviso (1.7) dentro da superfície, perto do que falhou, dizendo o que houve e o
  que fazer, com "Tentar de novo" quando couber. Nunca fecha a superfície nem apaga o que a pessoa
  digitou.
- **Vazio.** Uma linha que diz o que aparece ali e, se houver, como começar, com a ação ao lado
  quando a pessoa pode agir.
- **Sem permissão.** Mostra o estado e esconde o que a pessoa não pode usar, sem botão morto
  ([widgets-padrao.md](../widgets-padrao.md)). Indisponível por enquanto: regra de 1.6.
- **Rolagem.** Só o corpo rola; título, X e linha de ações ficam. Hoje a modal de Ajustes corta o
  conteúdo (1.6).

### 0.8 Texto

- **Título.** Nome do lugar ("Ajustes", "Pessoas"), verbo com objeto para tarefa ("Adicionar
  widget", "Organizar seu espaço") ou pergunta na confirmação ("Sair da sala?"). Sem ponto final.
- **Botões.** Verbo que diz o resultado ("Transferir", "Deixar entrar", "Tentar de novo"). Nunca
  "OK", "Sim" ou "Não". Para desistir: "Cancelar" na confirmação ("Ficar" na de Sair da sala) e
  "Agora não" no pedido de outra pessoa.
- **X.** Sempre com `aria-label` ("Fechar painel", "Fechar aviso", como hoje).
- **Corpo.** Uma ou duas frases completas, com acento, falando com "você", sem exclamação e sem
  jargão ("ping", "socket", "servidor").
- O título não se repete logo abaixo. Hoje o painel diz "Pessoas na sala" e a aba diz "Pessoas · 1"
  (2.1).
- O texto não depende do aparelho. Em vez de "pelo botão direito", diga a ação e o lugar que valem
  em todos ("no menu da câmera"). Hoje Câmeras pede o botão direito também no toque (2.1).

## 1. Famílias de superfície

### 1.1 Modal central

- **Usar** para tarefa curta e focada que pede atenção total: Ajustes, Compartilhar tela, Trocar
  tela, Minha cor, Sobre, Edição por X.
- **Não usar** para o que chega de fora (aviso; **sugestão**, 0.1), para a escolha de um controle
  (popover), quando a pessoa precisa ver a sala mudar (folha lateral) ou para confirmar
  (confirmação).
- **Anatomia.** Obrigatórios: título (nome da modal via `aria-labelledby`), X e corpo. Opcionais:
  busca, navegação em dois níveis, faixa de aviso no topo do corpo e linha de ações (só quando a
  mudança não vale na hora).
- **Abrir.** `showModal()`; o fundo cobre a sala; o foco vai para o primeiro controle (em Ajustes,
  a busca).
- **Fechar.** Esc, clique no fundo ou X. O foco volta ao gatilho (0.4).
- **Erro, carregando, vazio e rolagem.** 0.7.
- **Posição e camada.** Centro da janela, na top layer, com margem da janela nos quatro lados. A
  fase 3 fixa larguras e alturas.
- **Celular.** Folha de baixo (1.3). Toda modal com navegação em dois níveis vira folha em tela
  cheia, com a lista e a entrada em cada item, como Ajustes já faz. Vira regra, não exceção (1.6).
- **Teclado e leitor.** Tab circula dentro. `<dialog>` com nome; ao abrir, o leitor anuncia o
  título.
- **Texto.** Título de 0.8; sem subtítulo que explique o óbvio.

### 1.2 Folha lateral

- **Usar** quando a escolha muda a sala e a pessoa precisa ver o efeito enquanto escolhe (Adicionar
  widget, Organizar seu espaço, Organizar tela de X) e para leitura longa ligada a um lugar
  (Histórico de versões; Histórico e Tarefas da sessão de um widget).
- **Não usar** para tarefa curta (modal) nem para lista que acompanha a sala (painel).
- **Anatomia.** Como 1.1. Quando a folha é de um widget, o título leva o nome dele ("Histórico ·
  Dados"). **Sugestão.**
- **Abrir.** `showModal()`, encostada na borda direita, na altura toda da janela. O fundo é mais leve
  que o da modal, para a prévia continuar legível (o quanto, a fase 2 decide).
- **Fechar.** Esc, clique no fundo ou X. Se a folha mostra uma prévia, fechar assim desfaz a prévia;
  só a ação aplica (0.5).
- **Celular.** Folha de baixo alta (até ~90% da altura; valor inicial, fase 3), com a prévia acima
  quando couber.
- **Teclado, leitor e texto.** Como 1.1.

### 1.3 Folha de baixo

- **Usar** só no celular (abaixo de 640 px), como forma das outras famílias (tabela 0.3).
- **Anatomia.** Obrigatórios: título, X (mesmo quando há alça), corpo e margem da área segura
  (`env(safe-area-inset-bottom)`). Opcionais: alça de arrastar e linha de ações fixa embaixo.
- **Modal ou não.** Herda da família de origem. A forma de modal, folha, popover grande, menu e
  confirmação tem fundo e prende o foco; a forma de painel não tem fundo e não prende.
- **Altura.** A do conteúdo, até ~85% da tela (valor inicial; fase 3); passou disso, o corpo rola e
  o título fica. Com o teclado virtual aberto, a folha sobe junto (`visualViewport`) e o campo em
  foco fica à vista.
- **Toque.** Alvos de pelo menos 44 px, meta do VIO (é o nível AAA, WCAG 2.5.5; o mínimo AA, 2.5.8,
  é 24 px); itens de menu com 48 px, como hoje. Arrastar para baixo fecha (**sugestão**,
  opcional). O X é sempre a alternativa ao gesto (WCAG 2.5.7).
- **Fechar.** X, Esc no teclado físico, toque no fundo (só na forma modal) e o arrasto, se houver.

### 1.4 Painel não modal

- **Usar** para lista viva que a pessoa consulta enquanto usa a sala: Pessoas, com o bloco "Na
  porta".
- **Não usar** para tarefa, escolha ou leitura. Um painel por vez; abrir outro painel ou uma modal
  do mesmo lugar troca.
- **Anatomia.** Obrigatórios: título, X e corpo. Opcionais: abas (a primeira não repete o título) e
  blocos com contagem.
- **Abrir.** `show()`: não entra na top layer e mora na camada `panel`. O foco vai para o título; a
  pessoa pode clicar na sala sem fechar o painel. O gatilho mostra o estado aberto e tem
  `aria-expanded`.
- **Vazio.** Uma linha com o próximo passo (por exemplo, como convidar).
- **Posição e camada.** Borda direita, abaixo do cabeçalho da sala, sem fundo. Fica acima da
  moldura e abaixo dos avisos (0.6).
- **Celular.** Folha de baixo sem fundo, como hoje.
- **Teclado.** Esc fecha quando o foco está dentro. F6 alterna entre as regiões (sala, painel,
  avisos). **Sugestão.**
- **Leitor.** `<dialog>` não modal com nome; o gatilho anuncia aberto ou fechado.
- **Fechar.** X, gatilho ou Esc com o foco dentro. O clique fora **não** fecha.

### 1.5 Popover (balão flutuante)

- **Usar** para escolha ou informação curta ligada a um controle visível, que cabe em meia tela:
  tranca e convite, notificações, conexão, volume da tela, emoji, espectadores, sons, telas ao vivo,
  "N não exibidos", cores do sorteio.
- **Não usar** quando é só uma lista de ações (menu), só o texto de um controle (dica), passa de
  meia tela ou tem navegação (modal ou folha), ou precisa ficar aberto enquanto a pessoa usa a sala
  (painel).
- **Anatomia.** Obrigatórios: corpo e âncora no gatilho. Título quando há mais de um grupo ou quando
  o gatilho é só ícone. Opcionais: seta (a fase 2 decide), uma linha de ações e faixa de aviso.
  **Sem X**: gatilho, Esc e clique fora fecham. Resolve "uns têm cabeçalho com título e fechar,
  outros não" (2.2).
- **Abrir.** Na top layer (`popover="manual"`, como `AnchoredPopover.tsx`). O foco vai para o
  primeiro controle. O gatilho mostra o estado aberto (aparência de pressionado e
  `aria-expanded="true"`). Hoje não há sinal de qual botão está com o popover aberto (2.2).
- **Um por vez.** Abrir outro fecha o atual. Não há popover dentro de popover; uma confirmação pode
  abrir sobre ele (0.6).
- **Erro, carregando e vazio.** 0.7; o erro fica junto do controle que falhou, com `role="alert"`.
  O vazio das notificações ganha o próximo passo; hoje diz só "Nenhuma notificação." (2.2).
- **Posição.** Abaixo do gatilho, alinhado à borda inicial dele; vira para cima se não couber. Nunca
  cobre o gatilho e fica a pelo menos 8 px da borda da janela (`popover-position.ts`). O mesmo
  posicionamento vale para todos; hoje a âncora varia (2.2).
- **Celular.** Tabela 0.3.
- **Teclado.** No balão, que não é modal, Tab depois do último controle fecha e segue para o que vem
  depois do gatilho, e Shift+Tab no primeiro volta ao gatilho. Na folha de baixo do celular, o
  foco fica preso (1.3) e Tab não fecha. Esc fecha e devolve o foco ao gatilho (como hoje).
- **Leitor.** `role="dialog"` não modal com nome (hoje é `role="group"`). Gatilho com
  `aria-expanded` e `aria-controls`.
- **Fechar.** Gatilho, Esc, clique fora, Tab para fora (só no balão) e saída da tela cheia (como
  hoje).

### 1.6 Dica (tooltip) e dica clicável

**Dica**

- **Usar** para nomear um botão só de ícone, ou dizer em uma linha o que ele faz ou por que não está
  disponível.
- **Não usar** para conteúdo com link, botão ou campo (popover), para o que a pessoa precisa ler
  para agir (escreva na tela) ou para repetir um rótulo visível.
- **Anatomia.** Uma linha; no máximo duas, nome e consequência, como "Fechar só para mim" /
  "Continua aberto para os outros." ([cabecalho-widget.md](../cabecalho-widget.md)). Atalho de
  teclado opcional ao lado.
- **Mostrar.**
  - Mouse: depois de ~500 ms sobre o controle (valor inicial; fase 5). Se outra dica acabou de
    fechar, a vizinha aparece na hora, sem atraso.
  - Teclado: no foco por teclado (`:focus-visible`), na hora.
  - Toque: o toque longo no botão mostra a dica sem acionar o botão, e ela fica ~1,5 s depois de
    soltar (valor inicial; fase 5). O toque longo no resto do cabeçalho do widget continua abrindo
    o menu (`WidgetFrame.tsx:121`).
- **Persistente (WCAG 1.4.13).** Esc fecha a dica sem mover o foco; o ponteiro pode ir até a dica
  sem que ela suma; ela fica enquanto houver hover ou foco.
- **Posição e camada.** Acima do controle (abaixo, se não couber), sem cobri-lo; na top layer. Abrir
  um menu ou popover fecha a dica.
- **Leitor.** O nome acessível do botão é o texto da dica (`aria-label` igual, ou
  `aria-labelledby` apontando para ela); a segunda linha vai em `aria-describedby`. O leitor não
  ouve o mesmo texto duas vezes.
- **`title=`.** Sai de todos os botões e controles (95 hoje, Base comum e 2.8) e dá lugar a esta
  dica. Fica só em `<iframe>`, onde é o nome exigido. **Sugestão.**
- **Indisponível.** Se a pessoa nunca poderá usar (falta permissão), o controle some e o estado
  aparece. Se poderá usar depois (falta outro widget, falta alguém na chamada), o controle fica, com
  `aria-disabled="true"`, continua focável e a dica diz a condição. O `disabled` nativo não serve
  nesse caso, porque tira o foco e a dica. Resolve o "Foco único" cinza sem motivo (1.5).
  **Sugestão.**

**Dica clicável** (toggletip)

- **Usar** quando a explicação precisa valer também no toque e ser lida com calma: o selo de
  controle (Todos, Admins, Só você) para quem não pode mudá-lo, a explicação de limite
  (`limit-explanation`) e os nomes de quem votou (`poll-names`).
- Abre e fecha por clique, toque ou Enter no gatilho; Esc e clique fora fecham. Só texto, sem
  controles. O texto entra numa região viva `polite` dentro dela, para o leitor ouvir.
- Lista longa (muitos nomes) vira popover.
- **Selo de controle.** Para quem pode mudar, o selo abre "Quem pode controlar". Para quem não pode,
  abre a dica clicável dizendo quem controla. Resolve "'Admins' bloqueia sem dizer por quê" (2.5).
  **Sugestão.**

### 1.7 Aviso (toast e faixa)

Um só sistema, com duas formas e os mesmos tipos, textos e regiões vivas:

- **Pilha** (toast): como em [notificacoes.md](../notificacoes.md) (posição, fila, "+N", tempos,
  barra de tempo, sino e som), com os acréscimos abaixo.
- **Faixa:** no topo do corpo da modal ou folha aberta, dentro de um card ou do palco (reprodução
  bloqueada, erro do widget), ou no topo de uma página sem sala (landing, porta). Sem barra de
  tempo: sai quando a causa some ou no ×. Substitui o `.notice`.

Itens:

- **Usar** para recado que a pessoa não pediu: alguém entrou ou bateu na porta, começou uma tela,
  erro, desfazer.
- **Não usar** para confirmar o que a pessoa vê acontecer (o widget abriu), para explicar um
  controle (dica) ou para decisão sem volta (confirmação).
- **Anatomia.** Obrigatórios: texto (uma frase, com quem e o quê) e × sempre. Opcionais: avatar ou
  ícone; uma ação (Assistir, Desfazer, Tentar de novo) ou, no pedido de outra pessoa, a ação mais
  "Agora não"; barra de tempo (só na pilha); "+N" da fila.
- **Tempo.**
  - O prazo corre em JavaScript, não no fim da animação. Resolve o toast que não fecha em movimento
    reduzido pelo sistema e fecha na hora pelos Ajustes (catálogo 07.1). **Sugestão.**
  - Hover ou foco pausa a barra, como na spec. Aviso com ação não sai enquanto o foco estiver nele
    (**sugestão**).
  - Em movimento reduzido, o prazo corre igual e a barra fica cheia e parada (spec). Entrar e sair
    viram esmaecimento curto (~150 ms; valor inicial, fase 5) no lugar do "sem animação" da spec
    (catálogo 07.2). Muda a spec: **sugestão** da seção 6.2; até o aval, fica "sem animação".
  - Erro: sem barra, fica até o × (spec).
  - Pedido de outra pessoa (batida na porta) não expira enquanto o pedido valer. O × só esconde: o
    pedido segue em Pessoas › Na porta e no sino. **Sugestão** (hoje fecha em 15 s).
  - A ação de um aviso (Desfazer, Assistir) segue no sino enquanto valer, para quem não alcançou a
    tempo (WCAG 2.2.1). **Sugestão.**
- **Com modal aberta.** O aviso novo aparece como faixa no topo do corpo dela, com as mesmas ações,
  porque o resto da página está inerte (0.6). É o que o `App.tsx` já faz com erro e aviso; passar a
  valer para todos os tipos é **sugestão**.
- **Posição e camada.** Pilha na camada `toast`, fora de qualquer contexto de empilhamento (0.6).
  Faixa no fluxo da superfície, sem flutuar sobre o conteúdo.
- **Celular.** Como na spec. O texto cabe em duas linhas a 390 px: o nome corta com reticências
  antes do verbo. Hoje "bateu na porta." quebra em três linhas e a pilha cobre o cabeçalho do
  primeiro widget (2.4). Tirar a pilha de cima do primeiro card muda a posição da spec: **sugestão**
  da seção 6.2.
- **Leitor.** Duas regiões vivas que existem desde o carregamento da página, uma `polite` e uma
  `assertive` (erro), e o aviso entra nelas. Hoje o `role` fica em cada toast, que nasce junto com
  o texto e pode não ser lido. O foco não vai para o aviso.
- **Fechar.** ×, Esc com o foco nele ou o tempo (exceto erro e pedido).
- **Texto.** Como na spec: nome em negrito e verbo no passado ("**Bia** entrou na sala."). Erro diz
  o que houve e o que fazer (`Fault`).

### 1.8 Menu (de botão e de contexto)

- **Usar** para a lista de ações sobre um objeto: pessoa (botão "…" ou botão direito), widget e
  espaço do canvas.
- **Não usar** para controle contínuo ou campo (volume, cor), que vai para popover, nem para
  navegação.
- **Anatomia.**
  - Itens: `menuitem`, e `menuitemcheckbox` para o que liga e desliga.
  - Grupos com separador, na ordem de [widgets-padrao.md](../widgets-padrao.md): ações do objeto,
    aparência, permissões e, por último, remover.
  - Destrutivos ficam no último grupo, separados. A variante destrutiva (vermelha hoje) só vai no
    que não tem volta ou remove para todos. "Silenciar para todos" é reversível e sai do vermelho;
    "Transferir posse da sala" fica e vai para o último grupo (2.3). **Sugestão.**
  - Item que abre outra superfície termina em "…" ("Transferir a sala…", "Quem pode controlar…");
    item que age na hora, não. Muda os textos de widgets-padrao.md: **sugestão** da seção 6.2; até
    o aval, valem os da spec.
  - Sem submenu. Passou de ~7 itens, agrupe ou mova para uma modal.
- **Volume da pessoa.** O controle deslizante (`.person-menu-volume`) sai do menu. Onde ele vai fica
  para a fase 4. **Sugestão** (2.3).
- **Posição.** Menu de botão: abaixo do gatilho, alinhado à borda final dele, abrindo para dentro da
  tela. Menu de contexto: no ponteiro; pelo teclado, na borda do elemento em foco. Top layer.
- **Celular.** Folha de baixo; o toque longo abre, como hoje.
- **Teclado.** Como já faz `ContextMenu.tsx`: tecla Menu ou Shift+F10 abre, setas e Home/End
  andam, Esc e Tab fecham e devolvem o foco. Acréscimo: a primeira letra pula para o item. Todo
  objeto com menu de contexto abre o mesmo menu pelo teclado; o Frontend confere todos os widgets
  (2.3).
- **Leitor.** `role="menu"` com nome do objeto ("Ações de Ana"); gatilho com
  `aria-haspopup="menu"` e `aria-expanded`.
- **Fechar.** Esc, Tab, clique fora (só fecha) ou escolher um item.
- **Texto.** Verbo com objeto curto ("Fechar para todos").

### 1.9 Diálogo de confirmação

- **Usar só** para ação sem volta, ou cuja volta depende de outra pessoa (Revogar convites,
  Transferir a sala), e para Sair da sala quando a saída corta algo dos outros: você transmite tela
  ou câmera, ou é o dono com gente na sala. Nos outros casos, a pessoa sai direto. A regra e os
  textos de Sair estão no [guia de telas](telas.md#411-saída-e-finalização) (4.11, PR #332), que
  este guia não repete. Confirmar Sair é **sugestão**; hoje não há confirmação (inventário 1.8).
- **Não usar** para o que tem Desfazer ("Fechar para todos" sai na hora e mostra o aviso com
  Desfazer, [cabecalho-widget.md](../cabecalho-widget.md)) nem para o que a própria pessoa desfaz
  (silenciar, trancar, mudar quem controla).
- **Forma única: o diálogo.** Hoje há duas formas e uma ação sem nenhuma (2.6): o segundo clique
  ("Revogar convites" vira "Revogar mesmo?", `RoomLock.tsx`), o `<Dialog>` de transferir
  (`PersonMenu.tsx`, `Settings.tsx`) e "Sair da sala" sem confirmação (`App.tsx`). O diálogo no
  lugar do "Revogar mesmo?" é **sugestão**: um clique duplo passa direto pelo segundo clique, o
  leitor de tela não ouve o rótulo trocar e o botão muda de largura embaixo do ponteiro.
- **Anatomia.** Título: pergunta com verbo e objeto. Corpo: uma ou duas frases com a consequência.
  Dois botões: o de desistir ("Cancelar"; em Sair da sala, "Ficar") e a ação com o verbo do título,
  na variante destrutiva (não na primária). Sem X, porque o botão de desistir faz esse papel. Sem
  "não perguntar de novo".
- **Abrir.** `showModal()` com `role="alertdialog"`, `aria-labelledby` no título e
  `aria-describedby` no corpo: o leitor ouve a pergunta e a consequência. Foco inicial no botão de
  desistir. Abre sobre a superfície de origem (o popover da tranca continua embaixo; o menu fecha
  antes).
- **Agindo e erro.** O botão da ação mostra que está agindo e não aceita o segundo clique. Erro vira
  faixa no corpo, sem fechar.
- **Depois.** Ao confirmar, o diálogo fecha e o resultado aparece onde a pessoa estava, por exemplo
  "Pronto. Os convites enviados não valem mais." no popover da tranca (texto atual).
- **Posição.** Centro, na top layer, mais estreita que a modal. Linha de botões: [desistir] [ação],
  com a ação na borda final (regra 2.6).
- **Celular.** Folha de baixo com os botões empilhados em largura total: a ação em cima e o de
  desistir embaixo, mais perto do polegar.
- **Teclado.** Tab entre os dois botões; Enter aciona o que está em foco (de início, o de
  desistir).
- **Fechar.** O botão de desistir, Esc ou clique no fundo; os três cancelam.

Textos em rascunho; os de Sair estão no guia de telas. O Backend confere cada consequência antes da
fase 4.

| Ação              | Título                           | Corpo                                                                    | Ação         |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------ | ------------ |
| Revogar convites  | "Revogar os convites?"           | "Os convites já enviados param de valer." (texto atual)                  | "Revogar"    |
| Transferir a sala | "Transferir a sala para {nome}?" | "Você deixa de ser o criador e passa a ser administrador." (texto atual) | "Transferir" |

### 1.10 Card de widget

O card segue [widgets-padrao.md](../widgets-padrao.md) e
[cabecalho-widget.md](../cabecalho-widget.md). Aqui fica só o que ele tem em comum com as outras
superfícies.

- **Anatomia.** Cabeçalho (ponto, ícone, título editável, selo de controle e os botões − e × conforme
  a permissão) e corpo. Opcionais: faixa de aviso no topo do corpo e rodapé do widget. Todo widget
  tem os botões que a spec do cabeçalho lista; hoje Minha transmissão não tem minimizar (2.5).
- **Estados (todo widget tem todos).**
  - Vazio: uma linha e a ação, se a pessoa puder agir. Hoje só o chat tem ("Comece a conversa.").
  - Carregando: corpo no tamanho final, com o indicador do Ponto (0.7).
  - Erro: faixa no corpo com "Tentar de novo"; cabeçalho e menu continuam funcionando.
  - Sem permissão: o estado aparece, sem botões mortos; o selo explica (1.6).
  - Selecionado e com foco de teclado: dois sinais diferentes, que aparecem juntos sem se confundir
    e nunca cobrem os botões do cabeçalho (regras 2.5 e 2.7). Hoje o anel cobre o cabeçalho (1.5).
  - Minimizado, em foco e em tira seguem as specs da grade.
- **Posição e camada.** Camada base; o card arrastado sobe para `raised`. No celular, nada do canvas
  fica sobre o corpo de um card: hoje as setas de rolar ficam por cima (1.5).
- **Teclado e leitor.**
  - O card é uma `section` com `aria-labelledby` no título.
  - O menu abre pela tecla Menu ou Shift+F10 no cabeçalho.
  - Todo arrastar tem equivalente sem arrastar, no menu ou no Layout (WCAG 2.5.7).
  - Mudança de estado que importa (resultado do sorteio, votação encerrada) entra numa região viva
    `polite` do próprio widget, como vários já fazem.
- **Fechar.** − e × do cabeçalho conforme a spec; "Fechar para todos" sem confirmação, com o aviso
  de Desfazer por 8 s.
- **Superfícies do widget abrem perto dele.** O que é curto vira popover no cabeçalho (cor, quem
  pode controlar, guia de dados); o que é longo vira folha lateral com o nome do widget no título
  (Histórico, Tarefas da sessão). Hoje a ajuda e o histórico abrem longe do widget (2.1).
  **Sugestão.** Muda só onde se escolhe: a cor de um widget compartilhado continua estado da sala,
  passa pelo servidor e vale para todos, como hoje.

## 2. Regras que resolvem o inventário

### 2.1 Um só sistema de aviso

- **Problema.** `.toast` (`Toasts.tsx`) e `.notice` (`room.css`, `styles.css`) com posições e
  camadas diferentes; regras do toast também em `door.css`; o toast fica sob o painel Pessoas e
  quebra nos dois modos de movimento reduzido (2.4; catálogo 07.1). Um convite inválido volta à
  landing sem aviso (1.3).
- **Regra.** Um componente de aviso com duas formas, pilha e faixa (1.7). Quem avisa não escolhe a
  forma: o componente põe na pilha ou, com modal aberta e em página sem sala, na faixa. O prazo corre
  em JavaScript, e as regiões vivas existem desde o início da página.
- **Exemplo.** Convite inválido: faixa no topo da landing, "Este convite não vale mais. Peça um
  novo a quem convidou você." (rascunho).

### 2.2 Uma forma de confirmar, só onde faz falta

- **Problema.** Duas formas de confirmar (segundo clique em Revogar, `<Dialog>` em Transferir) e
  "Sair da sala" sem nenhuma, mesmo para o dono ou para quem transmite (2.6, 1.7, 1.8). No menu, o
  reversível e o irreversível têm o mesmo peso (2.3).
- **Regra.** Diálogo de confirmação (1.9) só para as ações sem volta e para Sair quando corta algo
  dos outros, sempre com a mesma anatomia e o foco inicial no botão de desistir. O que tem Desfazer
  não confirma. A variante destrutiva só vai no que confirma ou remove para todos. Trocar o segundo
  clique de Revogar pelo diálogo e confirmar Sair são **sugestões** (seção 6).

### 2.3 Dica visível no toque e no teclado

- **Problema.** Não há componente de dica: 95 `title=` nativos, que não aparecem no toque nem no
  foco do teclado (Base comum, 2.8). As quatro ações só de ícone do `ScreenPicker` se explicam só
  por `aria-label` e `title` (2.7).
- **Regra.** Componente de dica (1.6): foco de teclado mostra na hora, toque longo mostra sem
  acionar, Esc fecha e o texto é o nome acessível. Tirar os `title=` (só ficam em `<iframe>`) e
  deixar o controle indisponível por enquanto focável, com `aria-disabled` e a condição na dica,
  são **sugestões** (seção 6).

### 2.4 Erro de formulário em português

- **Problema.** O nome vazio na landing usa a validação nativa, na língua do navegador
  (`Landing.tsx:195`, `required`; tabela-resumo).
- **Regra** (**sugestão**: muda o que a pessoa vê ao errar).
  - O formulário tem `noValidate`. A validação roda ao enviar e, depois do primeiro erro, ao sair do
    campo.
  - A mensagem fica logo abaixo do campo, ligada por `aria-describedby`, e o campo ganha
    `aria-invalid="true"`. O foco vai para o primeiro campo com erro.
  - A mensagem diz o que fazer: "Digite seu nome para entrar." (rascunho).
  - O botão de enviar não fica desabilitado por campo vazio; ao tentar, o erro aparece.
  - Erro que não é de um campo (sala cheia, sem conexão) vai para a faixa de aviso do formulário.

### 2.5 Foco visível

- **Problema.** Anel retangular de canto vivo no cabeçalho do widget e no sino, que cobre os botões
  vizinhos; contorno arredondado duplo no cadeado (Base comum, 1.5).
- **Regra.**
  - Uma só forma de anel no app inteiro, que acompanha o contorno do controle.
  - O anel fica por fora do controle e nunca cobre um vizinho. Em grupo apertado (cabeçalho do
    widget), o espaço entre os botões comporta o anel, ou o anel passa para dentro do botão.
  - Contraste de pelo menos 3:1 contra o fundo e contra o controle.
  - Aparece no foco por teclado (`:focus-visible`). Nunca `outline: none` sem substituto.
  - Espessura e cor saem da fase 3; a forma e estas regras ficam.

### 2.6 Uma só ação principal

- **Problema.** Botão primário em quatro versões e três tamanhos dentro de widgets; `.primary`
  redefinido em 11 arquivos (Base comum, 2.5). Na sala, "Compartilhar" e "Entrar na chamada"
  disputam o papel de ação principal (1.5).
- **Regra.**
  - No máximo **uma ação primária por superfície e estado** (modal, popover, card, aviso). O resto é
    secundária, texto ou destrutiva.
  - A destrutiva é uma variante à parte, usada só na confirmação e no último grupo do menu. Na
    confirmação, ela é a ação principal.
  - Em toda linha de ações, as secundárias vêm antes e a principal fica na borda final
    (**sugestão**). Hoje transferir põe a principal antes e o aviso da porta depois.
  - Um só componente de botão, com os tamanhos que a fase 3 definir.
  - Qual é a ação principal de cada tela (por exemplo, o rodapé da sala) fica para o guia de telas
    (fase 1d).

### 2.7 Item selecionado

- **Problema.** Seleção em três estilos: segmentado cinza no Compartilhar e no cronômetro, azulado
  no menu da tranca, card azul sólido e miniatura com contorno roxo no Layout, abas azuis na
  demonstração da landing (Base comum, 2.7). Interruptores de Ajustes só por cor e posição (1.6).
- **Regra.**
  - Um estilo de seleção para segmentado, abas, cards de escolha e miniaturas.
  - Nunca só pela cor: muda também forma, peso ou ícone.
  - Semântica: `aria-pressed` (botão que alterna), `aria-checked` (rádio, segmentado e
    interruptor), `aria-selected` (aba, opção de lista) e `aria-current` (lugar atual).
  - Selecionado e foco são sinais diferentes e aparecem juntos sem se confundir.
  - Opções do mesmo tipo usam o mesmo controle: o popover da tranca mistura interruptor e caixa
    (1.7).

### 2.8 Uma superfície por tipo de tarefa

- **Problema.** O mesmo `<Dialog>` em 3 posições a 1280 px e 4 a 400 px (2.1); três diálogos
  diferentes para escolher cor (2.1).
- **Regra.** A pergunta de 0.1 escolhe a família, e a tabela 0.3 diz a forma no celular. Um só
  conteúdo de cor (`ColorPicker.tsx`) nos três lugares.

### 2.9 Uma escala de camadas

- **Problema.** Mais de 20 `z-index` sem escala, de 2 a 1100, e o toast sob o painel por causa do
  contexto de empilhamento (Base comum, 2.4).
- **Regra.** Uma escala com nome (0.6), sem `z-index` solto. Top layer para tudo o que flutua sobre
  a sala; a pilha de avisos fora do canvas. A ordem das camadas é **sugestão** (0.6).

## 3. Onde o Ponto entra

As regras são as de [movimento-ponto.md](movimento-ponto.md#1-as-cinco-regras-as-únicas-inegociáveis)
(seção 1) e a ação "dividir e juntar" de [brandbook/ponto.md](../brandbook/ponto.md). Curva e tempos
estão em [transicoes.md](../transicoes.md). O desenho do movimento é da fase 5 (#261). Este guia
**não cria animação**: só diz de onde o Ponto se divide para abrir cada superfície e onde ele se
junta para fechar.

Vale para todas as famílias:

- O Ponto da marca é um só e não deixa cópia esperando no gatilho (regra 1).
- A superfície aceita foco e clique desde o primeiro quadro; nada espera a animação (regra 4).
- Sobre o palco, a animação não mexe no vídeo nem no `<audio>`, e o desenho do Ponto não fica sobre
  eles (regra 3). A superfície aberta pode cobrir o palco; o desenho que a leva até lá, não.
- Em movimento reduzido, a superfície só esmaece (~150 ms, valor inicial de movimento-ponto.md,
  seção 8; fase 5), com o Ponto já no lugar (regra 5).

| Família                          | Abre: o Ponto se divide                         | Fecha: o Ponto se junta                                       |
| -------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| Modal central                    | sai do gatilho e se divide para formar a modal  | a modal se junta no Ponto, que volta ao gatilho               |
| Folha lateral e de baixo, painel | sai do gatilho e se divide pela borda de origem | junta-se na borda e volta ao gatilho                          |
| Popover                          | divide-se a partir do gatilho, que é a origem   | junta-se e volta ao gatilho                                   |
| Menu                             | no gatilho ou no ponteiro                       | volta ao gatilho, ou segue para a superfície que o item abriu |
| Dica e dica clicável             | sem Ponto (**sugestão**)                        | sem Ponto                                                     |
| Aviso                            | segue [notificacoes.md](../notificacoes.md)     | idem                                                          |
| Confirmação                      | divide-se a partir do item que a pediu          | Desistir: volta à origem. Confirmar: leva ao resultado.       |
| Card de widget                   | "Abrir widget" de transicoes.md                 | "Fechar widget" de transicoes.md                              |

- **Dica e menu sem viagem do Ponto (sugestão).** Eles abrem dezenas de vezes por hora, muitas vezes
  pelo teclado; uma viagem a cada vez os deixaria lentos. Abrem e fecham com esmaecimento curto. A
  fase 5 decide.
- **Aviso.** Se a fase 5 puser o Ponto no aviso, ele se divide do ponto da sala no cabeçalho, logo
  acima da pilha, e se junta de volta. Hoje vale a entrada de 8 px da spec.
- **Sair da sala**, direto ou depois de confirmar, leva à viagem "Sala → Início" de transicoes.md;
  o que vem depois de sair está no guia de telas (4.11).

## 4. Como o estilo da fase 2 se aplica

Os cinco estilos de [escolhas/estilo-visual.md](../escolhas/estilo-visual.md) mudam a aparência e
deixam a estrutura intacta. Um estilo que precise mudar a coluna "Fica fixo" volta para discussão
com o usuário.

| Pode variar por estilo                                                     | Fica fixo                                                                                  |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Raio de cada família                                                       | A família de cada caso (0.1) e a anatomia (obrigatórios e opcionais)                       |
| Borda: presença, espessura e cor                                           | Posição, âncora e a escala de camadas (0.6)                                                |
| Sombra e elevação                                                          | Abrir, fechar e foco (0.4, 0.5); a forma de celular e o corte de 640 px (0.3)              |
| Cor e opacidade da superfície e do fundo da modal                          | Papéis ARIA, regiões vivas e textos                                                        |
| Preenchimento interno e densidade (com a fase 3)                           | Alvos de toque de pelo menos 44 px (meta do VIO; o mínimo AA é 24 px)                      |
| Seta do popover (sim ou não)                                               | Contraste AA: texto 4,5:1; contorno, ícone e anel de foco 3:1                              |
| Aparência das variantes de botão (primária, secundária, texto, destrutiva) | Uma ação primária por superfície (2.6); destrutiva só onde 2.2 manda                       |
| Aparência da seleção e do anel de foco (cor, espessura)                    | Seleção e erro nunca só pela cor; anel que acompanha o contorno e não cobre vizinho (2.5)  |
| Caráter do movimento (curva, mola no estilo Expressivo)                    | As cinco regras do Ponto, até 800 ms e esmaecimento no modo reduzido                       |
| Tipografia dos títulos, dentro da escala da fase 3                         | Fontes do `CLAUDE.md`; mono só para código da sala, ping e números                         |
| Desfoque do fundo da modal                                                 | Sem desfoque sobre vídeo; se houver desfoque, o modo reduzido o desliga (regra 2 do Ponto) |

**Para a fase 2 testar:** cada estilo mostra, nas suas amostras, pelo menos uma modal, um popover,
um menu, um aviso e uma confirmação, a 1280 px e a 390 px, nos estados aberto, com foco de teclado
e com erro.

## 5. Tabela de migração

O que existe hoje e a família para onde vai. Cada linha herda as sugestões da seção que trata do
assunto, marcadas aqui ou não: até o aval (seção 6), a linha muda só a estrutura (componente, CSS
dono) e o comportamento fica como hoje.

### Painéis e modais (`<Dialog>`)

| Hoje (arquivo · classe ou título)                                                        | Família                                       | O que muda                                                                      |
| ---------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `components/Dialog.tsx` · `dialog.sheet`, `.sheet-centered`, `.sheet-content`            | Dono de modal, folhas e painel                | Variante pelo nome da família no lugar de `centered` e `modal`; corte de 640 px |
| `App.tsx` · Ajustes (`Settings.tsx`, `preferences.css`)                                  | Modal central                                 | No celular, folha em tela cheia por regra (dois níveis)                         |
| `App.tsx` · Pessoas (`.sheet.sheet-people`, `PeoplePanel.tsx`)                           | Painel não modal                              | Camada `panel`; a aba não repete o título                                       |
| `App.tsx` · Compartilhar tela (`ShareDialog.tsx`, `share.css`)                           | Modal central                                 | Sai a redefinição de `.primary` e `.sheet-content`; no celular, folha de baixo  |
| `App.tsx` · Trocar tela, Sobre, Minha cor                                                | Modal central                                 | Minha cor usa o mesmo conteúdo de cor dos widgets                               |
| `App.tsx` · Histórico de versões                                                         | Folha lateral                                 |                                                                                 |
| `RoomCanvas.tsx` · "Todos os espaços estão ocupados" (`widget-dialog-actions`)           | Aviso com ações (**sugestão**)                | Modal só por ação da própria pessoa (0.1)                                       |
| `RoomCanvas.tsx` · "Organizar seu espaço" (`is-previewing`)                              | Folha lateral                                 | Fechar sem aplicar desfaz a prévia                                              |
| `RoomCanvas.tsx` · "Adicionar widget" (`WidgetCatalog.tsx`, `catalog.css`)               | Folha lateral                                 | Abas que rolam mostram que há mais; texto de Câmeras sem "botão direito"        |
| `ScreenStage.tsx` · "Organizar tela de X"                                                | Folha lateral                                 |                                                                                 |
| `PersonMenu.tsx` · "Edição por X"                                                        | Modal central                                 |                                                                                 |
| `PersonMenu.tsx` e `Settings.tsx` · "Transferir a sala para X?" (`notification-actions`) | Confirmação                                   | Um só componente e um só texto nos dois lugares; Cancelar antes da ação         |
| `WidgetFrame.tsx` · "Quem pode controlar"                                                | Popover no selo (**sugestão**)                | No celular, folha de baixo                                                      |
| `ModuleWidget.tsx` · "Cor e paleta"; `CustomWidget.tsx` · "Cor"                          | Popover no cabeçalho do widget (**sugestão**) | Um só conteúdo de cor (`ColorPicker.tsx`)                                       |
| `ModuleWidget.tsx` · "Histórico", "Tarefas da sessão"                                    | Folha lateral                                 | Nome do widget no título (**sugestão**)                                         |
| `ModuleWidget.tsx` · "Guia de dados"                                                     | Popover no cabeçalho do widget (**sugestão**) |                                                                                 |

### Popovers, menus e dicas

| Hoje (arquivo · classe)                                                              | Família                       | O que muda                                                                                         |
| ------------------------------------------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `components/AnchoredPopover.tsx` + `popover-position.ts`                             | Dono de popover e dicas       | `role="dialog"` no popover (hoje `group`); estado aberto no gatilho                                |
| `RoomLock.tsx` · `entry-popover` (CSS em `door.css`)                                 | Popover                       | CSS vai para o dono; "Revogar mesmo?" vira confirmação (**sugestão**); um tipo de controle         |
| `Notifications.tsx` · `notifications-panel`                                          | Popover                       | Vazio com o próximo passo                                                                          |
| `RoomStatus.tsx` · `connection-popover`                                              | Popover                       | Texto sem jargão ("16 ms Servidor" fica para o guia de telas)                                      |
| `ScreenVolume.tsx` · `volume-popover` (CSS em 3 arquivos)                            | Popover                       | Um CSS dono                                                                                        |
| `EmojiPicker.tsx` · `emoji-picker`                                                   | Popover                       |                                                                                                    |
| `Spectators.tsx` · `spectators-panel`                                                | Popover                       | Sai a classe própria, o `z-index` 30 e o `!important` do palco                                     |
| `SoundSources.tsx` · `sound-panel`                                                   | Popover                       | Sai a classe própria                                                                               |
| `LiveScreens.tsx` · `live-screens-panel`; `NotShown.tsx` · `not-shown-panel`         | Popover                       |                                                                                                    |
| `RaffleFace.tsx` · `raffle-pop` (cores e paletas)                                    | Popover                       | Mesmo conteúdo de cor dos outros widgets                                                           |
| `MyStreamWidget.tsx` · `stream-picker`; `GridPicker.tsx`; `ColorPicker.tsx`          | Conteúdo, sem família própria | Vão dentro de outra superfície (`ColorPicker.tsx` no popover de cor) ou no lugar; seguem 2.6 e 2.7 |
| `RoomCanvas.tsx` · `slot-picker` (`z-index` 1100)                                    | Modo de escolha sobre a grade | Camada `canvas-tools`; o texto "Escolha o espaço" vira faixa de aviso                              |
| `ContextMenu.tsx` · `.context-menu` (`z-index` 300)                                  | Dono do menu                  | Top layer sem `z-index`; primeira letra pula para o item                                           |
| `PersonMenu.tsx` · `.person-menu`                                                    | Menu                          | Destrutivos no último grupo; "Silenciar para todos" sai do vermelho (**sugestão**)                 |
| `PersonMenu.tsx` · `.person-menu-volume`                                             | Sai do menu (**sugestão**)    | Lugar decidido na fase 4                                                                           |
| `WidgetFrame.tsx` · `.widget-menu`; menu do espaço do canvas                         | Menu                          | Ordem de widgets-padrao.md; teclado em todos os widgets                                            |
| 95 atributos `title=`                                                                | Dica                          | Saem, exceto em `<iframe>` (**sugestão**)                                                          |
| `header-tools.tsx` · `.widget-control-pop` (`role="tooltip"`, abre no clique)        | Dica clicável (selo)          | Para quem pode mudar, o selo abre "Quem pode controlar" (**sugestão**)                             |
| `RoomStatus.tsx` · `.limit-explanation`; `.limit-tooltip` (`styles.css`, `room.css`) | Dica clicável                 | Sai o `z-index` 15                                                                                 |
| `PollFace.tsx` · `.poll-names`                                                       | Dica clicável                 | Lista longa vira popover                                                                           |
| `ScreenPicker.tsx` · quatro ações só de ícone                                        | Dica em cada uma              |                                                                                                    |

### Avisos

| Hoje (arquivo · classe)                                                                       | Família               | O que muda                                                               |
| --------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------ |
| `Toasts.tsx` · `.toast-stack` (`z-index` 80 no canvas), `.toast`, `.toast-bar`, `.toast-more` | Aviso, pilha          | Fora do canvas, camada `toast`; prazo em JavaScript; regiões vivas fixas |
| `door.css` · regras de `.toast` e `.toast-tag` (batida na porta)                              | Aviso, pilha          | CSS vai para o dono                                                      |
| `room.css` e `styles.css` · `.notice` (`z-index` 300)                                         | Aviso, faixa          | Mesmo componente e textos da pilha; no fluxo da superfície               |
| `App.tsx` · `view.error` e `view.notice`                                                      | Aviso                 | Uma entrada só; o componente escolhe pilha ou faixa                      |
| `ScreenAudio.tsx` · `play-blocked`                                                            | Aviso, faixa no palco | Com a ação de liberar o som                                              |

### Botões, foco, seleção e formulário

| Hoje                                                                          | Regra | O que muda                                                  |
| ----------------------------------------------------------------------------- | ----- | ----------------------------------------------------------- |
| `.primary` em 11 CSS; `.icon-button` em 6                                     | 2.6   | Um componente de botão, com um arquivo dono                 |
| Foco em `styles.css` (`outline` 2 px, afastamento 4 px) e 33 `:focus-visible` | 2.5   | Uma forma de anel, sem cobrir vizinhos                      |
| `Landing.tsx:195` · `required`                                                | 2.4   | `noValidate` e erro em português sob o campo (**sugestão**) |
| Segmentados (`share.css`, `timer.css`), tranca, Layout, `MiniRoom.tsx`        | 2.7   | Um estilo de seleção, nunca só pela cor                     |

### Camadas (`z-index` de hoje)

| Hoje                                                                                                                       | Camada                                              |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `.anchored-popover` 200, `.context-menu` 300                                                                               | Top layer, sem `z-index`                            |
| `.notice` 300                                                                                                              | No fluxo (faixa)                                    |
| `.toast-stack` 80                                                                                                          | `toast`                                             |
| `.sheet.sheet-people` 50                                                                                                   | `panel`                                             |
| `.canvas-toolbar` 70, `.canvas-top-edge` 69, `.dock` 60 (8 em `finish.css`), `.minimized-widgets` 40, `.strip-controls` 35 | `chrome`                                            |
| `.slot-picker` 1100, alvos de soltar e reordenar 80, `grid-tools.css` 39 a 46                                              | `canvas-tools`                                      |
| `.screen-caption` 10, `.watched-screen::after` 12, `.floating-layer` 4 e 40                                                | `raised` ou contexto próprio do palco               |
| Player (`styles.css`, 2 a 7)                                                                                               | Contexto próprio do player (`isolation: isolate`)   |
| `.spectators-panel` 30, `.watched-screen:has(.spectators-panel)` 20 `!important`                                           | Top layer (popover); sai o `!important`             |
| `.widget-host::after` 100, `.canvas-audio` 80                                                                              | A conferir pelo Frontend; o destino segue a escala  |
| `.splash` 50 (`home.css`)                                                                                                  | Tela do app Windows; fica para o guia de telas (1d) |

## 6. Sugestões que esperam aval

Nenhuma vale antes do aval do usuário. Até lá, fica o que existe hoje (6.1) ou o que a spec aprovada
diz (6.2). O guia de telas (#332) tem a própria lista.

### 6.1 Mudam o comportamento de hoje

1. "Sair da sala" confirma só quando corta algo dos outros (você transmite tela ou câmera, ou é o
   dono com gente na sala); regra e textos no guia de telas, 4.11 (1.9).
2. O diálogo de confirmação substitui o segundo clique "Revogar mesmo?" (1.9).
3. Modal só por ação da própria pessoa; "Todos os espaços estão ocupados" vira aviso com ações
   (0.1, 1.1).
4. A ordem das camadas, com a pilha de avisos acima do painel Pessoas (0.6, 2.9).
5. Avisos: o prazo corre em JavaScript nos dois modos de movimento reduzido; aviso com ação não
   sai com o foco nele; com modal aberta, todo tipo de aviso vira faixa dentro dela (1.7).
6. Batida na porta não expira enquanto o pedido valer (1.7).
7. A ação de um aviso (Desfazer, Assistir) segue no sino enquanto valer (1.7).
8. Os `title=` saem e dão lugar ao componente de dica; controle indisponível por enquanto fica
   focável, com `aria-disabled` e a condição na dica (1.6, 2.3).
9. O selo de controle abre "Quem pode controlar" para quem pode mudar e a dica clicável para quem
   não pode (1.6).
10. Menu da pessoa: "Silenciar para todos" sai do vermelho, "Transferir posse da sala" vai para o
    último grupo e o volume sai do menu (1.8).
11. Formulário com `noValidate` e erro em português sob o campo (2.4).
12. Em toda linha de ações, a principal fica na borda final (2.6).
13. Cor, "Quem pode controlar" e "Guia de dados" viram popover no cabeçalho do widget, com um só
    conteúdo de cor; a cor de widget compartilhado segue estado da sala (1.10).
14. Folha de um widget leva o nome dele no título (1.2).
15. Dica e menu abrem sem viagem do Ponto (3).
16. F6 alterna entre sala, painel e avisos (1.4).
17. Texto digitado e não confirmado fica guardado ao fechar (0.5).
18. Arrastar a folha de baixo para baixo fecha (1.3).

### 6.2 Mudam uma spec aprovada

Pedem o aval do usuário antes de valer, e a spec é atualizada junto.

1. No celular, a pilha de avisos não cobre o primeiro card; muda a posição de
   [notificacoes.md](../notificacoes.md) (seção Celular) (1.7).
2. Em movimento reduzido, o aviso entra e sai com esmaecimento curto no lugar de "sem animação" de
   [notificacoes.md](../notificacoes.md) (Movimento e acessibilidade) (1.7).
3. Item de menu que abre outra superfície termina em "…"; muda os textos de
   [widgets-padrao.md](../widgets-padrao.md) (1.8).

**Fora do escopo:** estilo visual (fases 2 e 3); telas, hierarquia da sala, controles que somem,
landing, porta e despedida depois de sair (guia de telas, fase 1d); qualquer animação (fase 5).
