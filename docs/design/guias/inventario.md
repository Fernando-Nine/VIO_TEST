# Inventário de telas e flutuantes (fase 1b)

Retrato da interface em 9 nov. 2026 (`main`, v2.12.0-rc.6), feito no navegador em 1280 × 800 e
400 × 860, com escala 1. Aqui só há inventário e crítica. Quando algo pede solução, o texto diz
apenas "precisa de regra para X"; as regras ficam para os guias 1c e 1d.

Os achados citados como "catálogo 07.N" vêm da tabela de achados de
`docs/catalogo/07-cliente-e-interface.md`.

Gravidade: **alta** quando atrapalha a tarefa, fere a WCAG AA ou espalha incoerência por toda a
interface; **média** quando confunde ou destoa, mas há contorno; **baixa** quando é acabamento.

## Base comum (vale para tudo abaixo)

- **Tokens em vários `:root`.** `styles.css:1` define a paleta (`--panel #14151f`,
  `--raised #1b1c29`, `--line #2a2c3c`, `--muted #a3a5bc`, `--text #f3f3fb`,
  `--focus #c8ceff`). `room.css:2` redefine as mesmas variáveis com outros valores
  (`--panel #151722`, `--raised #22263b`, `--line #303244`, `--muted #acafc3`,
  `--text #f1f2fa`, `--focus #a8adff`), e o que vale depende da ordem de importação. Há ainda
  `:root` em `styles.css:61` e `:66` (cursores), em `workspace.css:2` (cores da barra de
  rolagem) e um terceiro conjunto de paleta em `landing.css` (`--paper`, `--ink`, `--ink-soft`,
  `--rule`, `--accent`, `--brand`). Precisa de regra para dizer onde moram os tokens e quem pode
  redefini-los.
- **Valores soltos.** Contagem por `grep` em todos os `.css` de `src/client`, valores distintos
  pelo texto da declaração: 893 cores hex (448 distintas), cerca de 30 raios (10, 12, 6, 8, 4,
  14, 7, 5, 18, 16, 9, 3, 2 px e outros), 35 a 39 sombras (35 contando só declarações de uma
  linha, 39 juntando as de várias linhas), 91 valores de `font-size` (41 se contar só números em
  px/rem, sem `clamp`, `em` e variáveis) e mais de 20 valores de `z-index` sem escala. `var(--radius)` aparece uma
  única vez. Precisa de regra para escala de raio, sombra, tipografia e camadas.
- **Classes estilizadas em vários arquivos.** `.primary` é definida em 11 arquivos
  (`styles`, `room`, `share`, `preferences`, `finish`, `landing`, `workspace`, `door`, `home`,
  `catalog`, `canvas/timer`). `.sheet-content` em 6. `.icon-button` em 6 (`styles`, `room`,
  `finish`, `multiscreen`, `workspace`, `canvas/poll`). `.volume-popover` em 3 (`multiscreen`,
  `finish`, `workspace`). `finish.css` é uma camada de polimento que sobrescreve
  as outras (o gradiente do botão primário vem dela). Precisa de regra para dizer qual arquivo é
  dono de cada componente.
- **Botão primário em pelo menos quatro versões:** com gradiente (`finish.css`), azul chapado
  ("Copiar convite"), contornado ("Entrar na chamada", "Convidar") e em três alturas e raios
  diferentes dentro de widgets ("Abrir votação", "Iniciar" do cronômetro, "Compartilhar" de
  Minha transmissão). Precisa de regra para hierarquia de botões (primário, secundário, texto,
  destrutivo) e tamanhos.
- **Estado selecionado em três estilos.** O controle segmentado fica cinza no Compartilhar e no
  cronômetro e azulado no menu da tranca. No Layout, o card escolhido é azul sólido e a miniatura
  de posição ganha só contorno roxo. Precisa de regra para seleção.
- **Anel de foco.** É retangular e de canto vivo no cabeçalho do widget e no sino, sobrepondo
  os botões do cabeçalho. No cadeado vira um contorno arredondado duplo. Precisa de regra para o
  foco visível (forma, cor, afastamento).
- **Rótulos em mono maiúsculo.** "SUA SALA NO VIO", "ENTRADA LIVRE", "CONFIGURAÇÕES",
  "ESTA SALA", "VOZ", "480p/720p/FPS" usam IBM Plex Mono em caixa alta, pequeno e com pouco
  contraste. O `CLAUDE.md` reserva o mono para código da sala, ping e números. Precisa de regra
  para uso do mono.
- **Dicas só no `title`.** Não há componente de dica: são 95 atributos `title=` nativos. A dica
  não aparece no toque nem no foco do teclado e segue o estilo do sistema. Precisa de regra para
  dicas de botões de ícone.
- **Sem link de pular para o conteúdo** (catálogo 07.13, não confirmado lá). O movimento
  reduzido apaga toda animação e transição, inclusive os esmaecimentos (catálogo 07.2), o que
  contraria a regra de movimento do `CLAUDE.md`.
- **Interface que adormece.** Cabeçalho, barra e rodapé somem após 1 s parado (4 s no toque).
  Quem chega à sala e não mexe o mouse não vê os controles. Precisa de regra para o que nunca
  some.

## 1. Telas

### 1.1 Landing (inclui a página de download)

- **Objetivo:** explicar o VIO em segundos e colocar a pessoa numa sala; oferecer o app Windows.
- **Arquivos:** `components/Landing.tsx`, `components/InstallApp.tsx`, `landing.css`.
- **O que tem:** cabeçalho com logo e CTA; herói "Bom mesmo é assistir junto." com o ponto da
  marca; card "Chega mais." (nome, código opcional, "Criar minha sala", nota "Sem conta. Câmera e
  microfone começam desligados.", "Instalar VIO"); seção "No app, é ao vivo de verdade." com
  maquete e pílulas; abas "Várias telas / Voz / Widgets da sala" com maquetes (roleta e
  votação); "Cada um é um ponto. Junto é sala."; "Só falta você." com download, "Entrar pelo
  navegador", caixa "Copiar endereço para o grupo" e rodapé. A página de download não existe à
  parte: é a seção `landing-get`.
- **Hierarquia:** em 1280 há três CTAs de download acima da dobra (cabeçalho "Baixar para
  Windows", botão do herói e "Instalar VIO" no card) disputando com "Criar minha sala", que é a
  ação principal. Os nomes variam ("Baixar para Windows" × "Instalar VIO").
- **Consistência:** o card de entrada tem canto vivo, enquanto campos e botões são arredondados.
  Defeito do app atual: o ponto da marca aparece quadrado aqui, mas redondo em partes da sala, contra a regra (sempre quadrado de cantos arredondados). "junto" usa um lilás que não está nos
  tokens do app. A landing tem tokens próprios (ver Base comum).
- **Acessibilidade:** o kicker e as etiquetas do card ("SUA SALA NO VIO", "ENTRADA LIVRE",
  "opcional") são pequenos, em mono e com contraste baixo. Uma linha do cabeçalho fixo passa por
  cima do início das seções ao rolar.
- **Texto:** enviar sem nome cai na validação nativa do navegador ("Please fill out this
  field.", no idioma do navegador, fora do visual do VIO). Precisa de regra para erro de
  formulário.
- **Responsivo (400):** o CTA do cabeçalho troca para "Entrar pelo navegador" (coerente), mas
  "Instalar VIO" continua no card em celular, onde o app Windows não serve. As maquetes da
  segunda metade deixam a página com cerca de 3 000 px de altura.

### 1.2 Início (só no app Windows)

- **Objetivo:** tela inicial do app, com salas recentes e Splash.
- **Arquivos:** `components/Home.tsx`, `home.css`, `room/recent-rooms.ts`.
- **Observação:** não abre no navegador, então não foi vista. Tem `home.css` próprio (461
  linhas) e mais uma definição de `.primary`. Precisa entrar na rodada de screenshots do app.

### 1.3 Entrar ou criar sala

- **Objetivo:** entrar com nome e, se houver, código ou link.
- **Arquivos:** o card de `Landing.tsx` (`landing-join`, `#your-name`, `.landing-submit`).
- **O que tem:** é o mesmo card da landing; quem chega por `?sala=` vê o código preenchido.
- **Problemas:**
  - Não há tela própria: entrar por link passa pela landing inteira (herói, download e seções).
  - Um convite inválido ou vencido (`?convite=…`) volta à landing sem nenhum aviso. Precisa de
    regra para link quebrado.
  - O campo de código usa placeholder em mono maiúsculo ("COLE O CÓDIGO AQUI") com contraste
    baixo.

### 1.4 Porta (sala trancada, lado de quem chega)

- **Objetivo:** esperar a aprovação, ou saber que não foi possível entrar.
- **Arquivos:** `components/Door.tsx`, `door.css`.
- **O que tem:** card central com o ponto quadrado. Estados: "Pedindo para entrar…" com
  Cancelar; "Não deu para entrar agora." com "Voltar ao início"; convite vencido.
- **Consistência:** o logo fica em outra posição em relação à landing (x77/y48 × x64/y34), então
  ele "pula" na troca de tela. `door.css` tem suas próprias definições de `.primary` e `.toast`.
- **Texto:** quem foi recusado não sabe o motivo nem se pode tentar de novo. Não há indicação de
  quanto tempo esperar.
- **Responsivo:** ok em 400.

### 1.5 Sala

- **Objetivo:** assistir, conversar e usar widgets juntos.
- **Arquivos:** `App.tsx`, `canvas/RoomCanvas.tsx`, `canvas/WidgetFrame.tsx`,
  `canvas/header-tools.tsx`, `canvas/GridTools.tsx`, `components/RoomStatus.tsx`,
  `components/RoomLock.tsx`, `workspace.css`, `room.css`, `grid-tools.css`, `multiscreen.css`,
  CSS de cada widget em `canvas/`.
- **O que tem:**
  - Cabeçalho: cadeado com código, tempo de sala, ping ("16 ms Servidor"), Pessoas com
    contador, Ajustes, Sair em vermelho e "Convidar" contornado.
  - Barra do canvas: Layout, Widget, "Foco único", sino e tela cheia.
  - Grade de espaços: vazios com borda tracejada e "+ Adicionar widget".
  - Rodapé: "Entrar na chamada", "Compartilhar", "Flutuante" e a versão em mono. Na chamada o
    rodapé vira "Na chamada · 1" com Microfone e Sair em texto vermelho.
- **Palco/grade:**
  - Com a sala vazia, "+ Adicionar widget" se repete 4 vezes e o primeiro espaço é tingido de
    azul sem motivo aparente.
  - "Foco único" aparece cinza e desabilitado sem explicar por quê (botão morto).
- **Foco:** o widget em foco cresce e os outros viram tira. O anel de seleção do cabeçalho cobre
  os botões do próprio cabeçalho.
- **Widgets (cards):**
  - Cabeçalho com ícone, título, pílula "Todos"/"Admins", trocar, minimizar e fechar. Minha
    transmissão não tem minimizar.
  - O botão principal muda de altura e raio de widget para widget (ver Base comum).
  - Chat vazio diz "Comece a conversa.", e os outros widgets não têm estado vazio equivalente.
  - O nome do controle "Todos/Admins" não diz o que controla.
  - Precisa de regra para o cabeçalho de widget (quais botões, em que ordem, quando somem).
- **Hierarquia:** o cabeçalho tem três tipos de ação de peso parecido (status, navegação e sair).
  "Sair" vermelho fica ao lado de "Convidar". No rodapé, "Compartilhar" é primário e "Entrar na
  chamada" é secundário, e não fica claro qual é a ação principal da sala.
- **Acessibilidade:** o ícone de fone cortado na lista de pessoas não tem texto visível. O
  estado da tranca aparece só pelo ícone do cadeado. Os alvos da barra do canvas em 400 parecem
  menores que 44 px (não medido).
- **Texto:** "Flutuante" sozinho não diz o que faz. "16 ms Servidor" é jargão para o público.
- **Responsivo (400):**
  - Cabeçalho apertado: cadeado, tempo, ping e três ícones, sem "Convidar".
  - O rodapé vira barra inferior ("Entrar na chamada" em duas linhas, "Tela", "Mais"), e
    "Flutuante", "Compartilhar" e a versão vão para "Mais".
  - Os widgets ficam empilhados, e os botões circulares de rolar (setas) ficam por cima do
    conteúdo dos widgets.
  - Na votação, os campos "Opção 1/2" encostam na borda e o "+" fica quase fora.

### 1.6 Ajustes

- **Objetivo:** preferências pessoais e da sala.
- **Arquivos:** `components/Settings.tsx`, `components/ApplicationSettings.tsx`,
  `components/ColorPicker.tsx`, `preferences.css`.
- **O que tem:** busca; categorias Áudio, Vídeo, Notificações, Aparência, Acessibilidade e
  Aplicativo; grupo "ESTA SALA" com Sala (convite, edição, posse).
- **Hierarquia:** em 1280, navegação à esquerda e conteúdo à direita. Em Voz, o medidor de
  sensibilidade e o controle deslizante são duas barras separadas, e não se lê qual se arrasta.
- **Consistência:** os rótulos de grupo usam mono maiúsculo. A altura do modal corta o conteúdo
  com rolagem interna.
- **Acessibilidade:** os interruptores azuis mostram o estado só pela cor e pela posição, sem
  rótulo ligado/desligado.
- **Responsivo (400):** vira tela cheia com lista de categorias e entra em cada uma por
  navegação. Funciona, mas é o único painel que vira tela cheia (ver 2.1).

### 1.7 Sala trancada (lado do dono)

- **Objetivo:** trancar, convidar e decidir quem entra.
- **Arquivos:** `components/RoomLock.tsx`, `components/Toasts.tsx`,
  `components/PeoplePanel.tsx`.
- **O que tem:** popover do cadeado com interruptor "Sala trancada", caixa de seleção "Entra
  direto, mesmo trancada", "Copiar convite" e "Revogar convites" em texto vermelho. Quando alguém
  bate, surge um toast com "Agora não" e "Deixar entrar", e aparece um bloco "Na porta" no
  painel Pessoas.
- **Problemas:**
  - O mesmo popover mistura interruptor e caixa de seleção para opções do mesmo tipo.
  - "Revogar convites" confirma com um segundo clique no mesmo botão, que vira "Revogar
    mesmo?" (`RoomLock.tsx` ~L66-72, L146). É uma forma de confirmar diferente da usada para
    transferir a posse (ver 2.6).
  - O toast da batida cobre o cabeçalho do widget de cima (400) e fica sob o painel Pessoas
    (1280).
  - As iniciais do avatar mudam: "A" na lista da porta e "AN" no resto.

### 1.8 Saída e finalização

- **Objetivo:** encerrar a sessão.
- **Situação:** não existe. "Sair da sala" (`App.tsx` ~L491-494, `goHome()`) volta direto para
  a landing, sem confirmação e sem tela de despedida, mesmo para o dono da sala, com o nome
  mantido no campo. É a única ação sem volta da sala que não pede confirmação. Precisa de regra
  para dizer quais ações confirmam e o que acontece depois de sair.

## 2. Componentes flutuantes

### 2.1 Painéis e modais (`<Dialog>`)

- **Onde (14 chamadas de `<Dialog>`):**
  - `App.tsx`: um só `<Dialog>` para os painéis Pessoas, Ajustes, Minha cor, Sobre,
    Compartilhar tela, Trocar tela e Histórico de versões.
  - `canvas/RoomCanvas.tsx`: "Todos os espaços estão ocupados", "Organizar seu espaço"
    (Layout) e "Adicionar widget".
  - `components/PersonMenu.tsx`: "Edição por X" e "Transferir a sala para X?".
  - `components/Settings.tsx`: "Transferir a sala para X?" (a mesma pergunta, em outro lugar).
  - `components/ScreenStage.tsx`: "Organizar tela de X".
  - `canvas/WidgetFrame.tsx`: "Quem pode controlar".
  - `canvas/ModuleWidget.tsx`: "Cor e paleta", "Histórico", "Tarefas da sessão" e "Guia de
    dados".
  - `canvas/CustomWidget.tsx`: "Cor".
- **Arquivos:** `components/Dialog.tsx` (`dialog.sheet`, `.sheet-centered`, `.sheet-content`,
  cabeçalho com "Fechar painel"), mais os chamadores acima. CSS espalhado por `styles.css`, `room.css`, `share.css`,
  `preferences.css`, `finish.css` e `workspace.css` (`.sheet.sheet-people`).
- **Variações de posição (1280):** modal central com fundo desfocado (Ajustes, Compartilhar);
  folha à direita colada no topo com fundo (Adicionar widget, Layout); painel à direita, abaixo
  do cabeçalho e sem fundo, não modal (Pessoas).
- **Variações de posição (400):** Ajustes ocupa a tela cheia; Pessoas e Adicionar widget sobem
  de baixo; Compartilhar continua como modal central. São quatro comportamentos para o mesmo
  componente.
- **Estados:**
  - Abrir e fechar com Esc, que falhou de forma intermitente no catálogo durante os testes.
  - Foco: o foco volta ao botão de origem com anel quadrado.
  - Carregando e erro não têm padrão; o "Todos os espaços estão ocupados" usa
    `widget-dialog-actions`, uma classe própria.
- **Inconsistências:**
  - Raio de cerca de 18 px no modal central, 20 px só no topo da folha inferior e cantos
    diferentes no painel Pessoas.
  - Padding do cabeçalho e do corpo varia entre os painéis.
  - O painel Pessoas tem o título "Pessoas na sala" e ainda a aba "Pessoas · 1", que repete o
    título.
  - No catálogo em 400, as abas passam da largura ("Com…" cortado) sem sinal de rolagem.
  - O texto de Câmeras manda "fixe uma câmera pelo botão direito", o que não existe no toque.
  - Escolher cor tem dois diálogos diferentes: "Cor e paleta" (`ModuleWidget`) e "Cor"
    (`CustomWidget`), além de "Minha cor" no `App.tsx`.
  - Ajuda e histórico de widget abrem como painel ("Guia de dados", "Histórico"), não junto ao
    widget.
  - Só foram vistos na tela Ajustes, Compartilhar, Pessoas, Adicionar widget e Layout. Os
    demais foram lidos no código.
- Precisa de regra para quando usar modal, folha lateral, folha inferior ou painel não modal.

### 2.2 Popovers ancorados

- **Onde:** cadeado/convite (`RoomLock`), notificações (`notifications-panel`), conexão/ping
  (`connection-popover`), volume de tela (`volume-popover`), entrada (`entry-popover`),
  seletor de fonte (`stream-picker`), seletor de grade (`grid-picker`), emoji
  (`emoji-picker`), cor (`color-picker`), escolha de espaço (`slot-picker`).
- **Arquivos (componente e CSS dono):**
  - `entry-popover`: `components/RoomLock.tsx` ~L216, com CSS em `door.css:30`
    (`.anchored-popover.entry-popover`). O popover da sala é estilizado no CSS da porta.
  - `connection-popover`: `components/RoomStatus.tsx` ~L207, com CSS em `styles.css` ~L1611
    (raio 14, padding 18).
  - `notifications-panel`: `components/Notifications.tsx` ~L183, com CSS em `workspace.css`
    ~L1566 (raio 14, padding 14).
  - `volume-popover`: `components/ScreenVolume.tsx`, com CSS em `workspace.css:22`,
    `finish.css:533` e `multiscreen.css:277`.
  - Os demais: `components/AnchoredPopover.tsx` (`popover="manual"`),
    `components/popover-position.ts`, `components/EmojiPicker.tsx`,
    `components/ColorPicker.tsx` e `canvas/GridPicker.tsx`.
  - Mais dois painéis ancorados com classe própria: `spectators-panel` (`Spectators.tsx`) e
    `sound-panel` (`SoundSources.tsx`).
- **Inconsistências:**
  - Raio, padding e sombra diferem entre popovers vizinhos.
  - `.volume-popover` é definido três vezes.
  - Uns têm cabeçalho com título e fechar, outros não.
  - O de notificações, vazio, diz só "Nenhuma notificação.".
  - O ponto de ancoragem e o alinhamento variam de um popover para outro.
- **Estados:** sem padrão de carregando e erro. Fecham com Esc e clique fora, mas não há
  indicação visual de qual botão está com o popover aberto.
- Precisa de regra para anatomia de popover (cabeçalho, ancoragem, seta, fechamento).

### 2.3 Menus de contexto e de botão

- **Onde:** menu da pessoa (botão "…" ou botão direito: volume, silenciar, transferir posse),
  menu do widget (`widget-menu`), menu do espaço do canvas.
- **Arquivos:** `components/ContextMenu.tsx` (`.context-menu`), `components/PersonMenu.tsx`
  (`.person-menu`, `.person-menu-volume`), `canvas/header-tools.tsx`; CSS em `workspace.css`.
- **Inconsistências:**
  - O menu da pessoa mistura controle deslizante e itens de ação.
  - Itens em vermelho ("Silenciar para todos", "Transferir posse da sala") ficam sem separação
    do resto. "Silenciar para todos" é reversível e "Transferir posse" não é, com o mesmo peso
    visual. Transferir abre um `<Dialog>` de confirmação ("Transferir a sala para X?",
    `PersonMenu.tsx` ~L265-290).
  - O menu de ações do widget não foi alcançado pelo teste automático pelo rótulo "Ações de…".
    Vale conferir se todo widget expõe o menu ao teclado.
- Precisa de regra para menus (agrupamento, destrutivo, atalho por teclado e toque).

### 2.4 Toasts e avisos

- **Onde:** batida na porta, entrou/saiu, erros (`Fault`), avisos de sala.
- **Arquivos:** `components/Toasts.tsx` (`.toast-stack`, `.toast`, `.toast-bar`, no máximo 2,
  4 s), `room.css` (`.notice`, outro sistema de aviso, fixo, `z-index: 300`), `door.css`
  (outra `.toast`).
- **Variações:** toast com avatar, barra de progresso e ×; toast com ações ("Agora não" em
  texto e "Deixar entrar" primário); `.notice` no topo da página ou dentro de uma folha.
- **Problemas:**
  - Dois sistemas de aviso (`.toast` e `.notice`) com posições e camadas diferentes.
  - O toast fica sob o painel Pessoas, embora `.toast-stack` tenha `z-index: 80`
    (`workspace.css` ~L2983) e `.sheet.sheet-people` tenha 50 (`workspace.css` ~L2730). O número
    sozinho não explica o fato. A causa provável é o contexto de empilhamento (o toast fica
    dentro do canvas, e o painel é um `<dialog>`), ainda não verificada.
  - Movimento reduzido quebra o fechamento do toast (catálogo 07.1, deduzido do CSS e não
    reproduzido lá). Pelo sistema, o toast não fecha sozinho. Por Ajustes, fecha na hora,
    inclusive o da batida na porta.
  - Em 400, cobre o cabeçalho do primeiro widget, e "bateu na porta." quebra em três linhas.
- Precisa de regra para avisos (tipos, posição, duração, camada, ações).

### 2.5 Cards de widget

- **Onde:** todo espaço do canvas.
- **Arquivos:** `canvas/WidgetFrame.tsx`, `canvas/header-tools.tsx`, `canvas/widgets.tsx`,
  `workspace.css` e o CSS de cada widget (`cameras`, `dice`, `my-stream`, `people`, `poll`,
  `raffle`, `timer`).
- **Inconsistências:**
  - A ordem e a presença dos botões do cabeçalho variam (Minha transmissão sem minimizar).
  - O botão principal tem tamanhos diferentes entre widgets.
  - O controle segmentado do cronômetro difere do de Compartilhar.
  - O anel de seleção sobrepõe o cabeçalho.
  - Cada widget traz CSS com cores próprias fora dos tokens.
- **Estados:** vazio só no chat; sem padrão de carregando e erro; "Admins" bloqueia sem dizer a
  quem não é admin por que não pode agir.
- **Por widget:**
  - Notas (`canvas/CustomWidget.tsx`, `NoteActions.tsx`): não foi aberto nesta rodada. Tem um
    diálogo "Cor" próprio, diferente do "Cor e paleta" dos outros widgets.
  - Dados (`canvas/DiceFace.tsx`, `dice.css`): não foi aberto nesta rodada. A ajuda ("Guia de
    dados") abre em painel separado, longe do widget.
  - Cronômetro (`canvas/TimerBlock.tsx`, `timer.css`): "Iniciar" é menor que os outros
    primários; o segmentado Temporizador/Cronômetro fica cinza; `timer.css` redefine
    `.primary`.
  - Votação (`canvas/PollFace.tsx`, `poll.css`): em 400, os campos de opção encostam na borda e
    o "+" quase sai; `poll.css` redefine `.icon-button`.
  - Sorteio (`canvas/RaffleFace.tsx`, `raffle.css`): não foi aberto nesta rodada; tem CSS
    próprio com cores fora dos tokens.
  - Chat e Minha transmissão: ver acima (vazio só no chat; Minha transmissão sem minimizar).

### 2.6 Confirmações

- **Situação:** existem duas formas diferentes de confirmar, e uma ação sem nenhuma.
  - Segundo clique no mesmo botão: "Revogar convites" vira "Revogar mesmo?"
    (`RoomLock.tsx` ~L66-72, L146).
  - `<Dialog>` central: "Transferir a sala para X?", aberto tanto pelo menu da pessoa
    (`PersonMenu.tsx` ~L265-290) quanto pelos Ajustes (`Settings.tsx` ~L905-925).
  - Sem confirmação: "Sair da sala" (`App.tsx` ~L491-494). Fechar widget compartilhado não foi
    testado.
  - Outro diálogo de decisão, "Todos os espaços estão ocupados", usa a classe própria
    `widget-dialog-actions`.
- Precisa de regra para dizer quando e como confirmar.

### 2.7 Outros componentes da sala e da landing

Uma linha por componente. "Não exercitado" quer dizer que a rodada (uma ou duas pessoas, sem
tela remota nem câmera) não mostrou o componente; o comentário vem do código.

- **ScreenStage** (`components/ScreenStage.tsx`, palco das telas): não exercitado. Tem o
  `<Dialog>` "Organizar tela de X", outro lugar para escolher posição e tamanho além do Layout.
- **ScreenPicker** (`components/ScreenPicker.tsx`, prévia e ações de cada tela): não exercitado.
  São quatro ações só de ícone na prévia (assistir só, em conjunto, focar, parar), explicadas
  apenas por `aria-label` e `title`.
- **LiveScreens** (`components/LiveScreens.tsx`): não exercitado. O ícone da barra só existe
  enquanto alguém transmite, e o aviso de "começou uma tela" vai para o toast e para o sino,
  mais um caminho de aviso.
- **Spectators** (`components/Spectators.tsx`): não exercitado. Tem um painel ancorado com
  classe própria (`spectators-panel`) fora do padrão dos popovers; o vazio diz "Ninguém
  assistindo ainda.".
- **FloatingPeople** (`components/FloatingPeople.tsx`, cards de pessoas e telas sobre o
  canvas): não exercitado (sem câmera). Tem seletor próprio de posição dos cards
  (`card-positions`, 6 âncoras), mais um jeito de escolher posição além do Layout e do
  ScreenStage.
- **MiniRoom** (`components/MiniRoom.tsx`, sala de demonstração da landing): as abas "Várias
  telas / Voz / Widgets da sala" marcam a escolhida com azul sólido, outro estilo de seleção. A
  pílula dos widgets da demonstração diz "Da sala", e a sala de verdade diz "Todos"/"Admins".
- **SoundSources** (`components/SoundSources.tsx`, sons sem imagem): não exercitado. Tem chip na
  barra e painel ancorado com classe própria (`sound-panel`).
- **ScreenAudio** (`components/ScreenAudio.tsx`): não exercitado. O aviso de reprodução
  bloqueada (`play-blocked`) é mais um estado sem padrão comum.
- **VolumeSlider** (`components/VolumeSlider.tsx`): segue `docs/design/volume.md` (setas, Page
  Up/Down, dourado acima de 100%); sem problema notado. No menu da pessoa ele divide espaço com
  itens de ação (ver 2.3).
- **ShareDialog** (`components/ShareDialog.tsx`, `share.css`): Qualidade e FPS em mono
  maiúsculo; caixa tracejada de explicação, estilo que não se repete em outro lugar; em 400,
  "Janela do aplicativo" e "Aba do navegador" quebram em duas linhas. `share.css` redefine
  `.primary` e `.sheet-content`.
- **Splash e desktop** (`Home.tsx` ~L449, `home.css`): não vistos, porque só existem no app
  Windows. As variantes reduzidas do Splash perdem para o `!important` da regra de movimento
  (catálogo 07.2).

### 2.8 Dicas (tooltips)

- **Situação:** não existe componente. São 95 `title=` nativos (ver Base comum). Botões só de
  ícone (sino, tela cheia, trocar, minimizar) dependem disso para se explicar.

## 3. Tabela-resumo

| Componente/tela            | Gravidade | Problema                                                                                                                |
| -------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| Base (tokens)              | alta      | Paleta em `styles.css` e `room.css` com valores diferentes, mais um terceiro conjunto em `landing.css`.                 |
| Base (valores soltos)      | alta      | 448 cores hex, cerca de 30 raios, 35 a 39 sombras, 91 `font-size` e mais de 20 `z-index` distintos.                     |
| Base (donos de classe)     | alta      | `.primary` em 11 arquivos, `.sheet-content` em 6 e `.volume-popover` em 3, sobrescritos por `finish.css`.               |
| Painéis/modais             | alta      | O mesmo `<Dialog>` aparece em 3 posições a 1280 px e em 4 a 400 px, com raios e paddings diferentes.                    |
| Toasts/avisos              | alta      | Toast sob o painel Pessoas (causa não verificada), quebrado no movimento reduzido; dois sistemas de aviso.              |
| Saída/confirmações         | alta      | Duas formas de confirmar (segundo clique e diálogo); "Sair da sala" não confirma e não tem tela de saída.               |
| Entrar (convite inválido)  | alta      | Link de convite inválido ou vencido cai na landing sem aviso.                                                           |
| Base (foco visível)        | alta      | Anel de foco retangular que cobre os botões do cabeçalho do widget; forma muda por componente.                          |
| Botões                     | média     | Primário em quatro versões (gradiente, chapado, contornado, tamanhos variados).                                         |
| Estado selecionado         | média     | Segmentado cinza num lugar e azulado em outro; Layout com dois estilos de seleção.                                      |
| Landing (formulário)       | média     | Erro de nome vazio usa a validação nativa, no idioma do navegador.                                                      |
| Landing (hierarquia)       | média     | Três CTAs de download acima da dobra competem com "Criar minha sala"; nomes diferentes.                                 |
| Landing (celular)          | média     | "Instalar VIO" aparece no celular, onde o app Windows não serve.                                                        |
| Sala (adormecer)           | média     | Os controles somem após 1 s parado; quem chega não vê o que fazer.                                                      |
| Sala (grade vazia)         | média     | "+ Adicionar widget" repetido 4 vezes e "Foco único" desabilitado sem motivo.                                           |
| Sala (celular)             | média     | Setas de rolagem por cima dos widgets; campos da votação encostam na borda.                                             |
| Catálogo (celular)         | média     | Abas cortadas sem sinal de rolagem; texto de Câmeras pede botão direito no toque.                                       |
| Dicas                      | média     | 95 `title=` nativos: nenhuma dica no toque nem no foco do teclado.                                                      |
| Rótulos mono               | média     | Mono maiúsculo pequeno e de baixo contraste em rótulos de interface, fora do uso previsto.                              |
| Popovers                   | média     | Raio, padding, cabeçalho e ancoragem diferentes entre popovers vizinhos.                                                |
| Menus                      | média     | Itens vermelhos sem separação; reversível e irreversível com o mesmo peso.                                              |
| Tranca (popover)           | média     | Interruptor e caixa de seleção misturados para opções do mesmo tipo.                                                    |
| Widgets (cabeçalho)        | média     | Botões do cabeçalho variam por widget; estado vazio só no chat.                                                         |
| Ajustes (voz)              | média     | Medidor e controle de sensibilidade em barras separadas.                                                                |
| Porta                      | baixa     | Recusado sem motivo nem próximo passo; logo muda de posição em relação à landing.                                       |
| Pessoas (painel)           | baixa     | Título e aba repetem "Pessoas"; ícone de fone sem texto.                                                                |
| Avatar                     | baixa     | Iniciais "A" na porta e "AN" no resto.                                                                                  |
| Landing (card)             | baixa     | Card de canto vivo entre campos arredondados; defeito: ponto quadrado aqui e redondo em partes da sala, contra a regra. |
| Notificações               | baixa     | Estado vazio sem próximo passo.                                                                                         |
| Textos da sala             | baixa     | "Flutuante" e "16 ms Servidor" não se explicam ao público.                                                              |
| Início (app)               | baixa     | Não verificado no navegador; precisa entrar na rodada de screenshots do app.                                            |
| Acessibilidade (navegação) | baixa     | Sem link de pular para o conteúdo (catálogo 07.13).                                                                     |
| Posição (palco e cards)    | média     | Layout, ScreenStage e FloatingPeople têm, cada um, seu próprio jeito de escolher posição.                               |
| Painéis ancorados extras   | baixa     | `spectators-panel` e `sound-panel` com classes próprias, fora do padrão dos popovers.                                   |
| Demonstração da landing    | baixa     | MiniRoom diz "Da sala" onde a sala de verdade diz "Todos"/"Admins"; abas com outro estilo de seleção.                   |
