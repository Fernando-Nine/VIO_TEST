# Inventário de telas e flutuantes (fase 1b)

Retrato da interface em 9 nov. 2026 (`main`, v2.12.0-rc.6), feito no navegador em 1280 × 800 e
400 × 860, com escala 1. Aqui só há inventário e crítica. Quando algo pede solução, o texto diz
apenas "precisa de regra para X"; as regras ficam para os guias 1c e 1d.

Gravidade: **alta** quando atrapalha a tarefa, fere a WCAG AA ou espalha incoerência por toda a
interface; **média** quando confunde ou destoa, mas há contorno; **baixa** quando é acabamento.

## Base comum (vale para tudo abaixo)

- **Tokens em três lugares.** `styles.css` define `:root` (`--panel #14151f`,
  `--raised #1b1c29`, `--line #2a2c3c`, `--muted #a3a5bc`, `--text #f3f3fb`,
  `--focus #c8ceff`). `room.css` redefine o mesmo `:root` com outros valores (`--panel #151722`,
  `--raised #22263b`, `--line #303244`, `--muted #acafc3`, `--text #f1f2fa`,
  `--focus #a8adff`), e o que vale depende da ordem de importação. `landing.css` tem um terceiro
  conjunto (`--paper`, `--ink`, `--ink-soft`, `--rule`, `--accent`, `--brand`). Precisa de regra
  para dizer onde moram os tokens e quem pode redefini-los.
- **Valores soltos.** Os CSS do cliente somam 893 cores hex (448 distintas), cerca de 30 raios
  diferentes (10, 12, 6, 8, 4, 14, 7, 5, 18, 16, 9, 3, 2 px e outros), 35 sombras distintas,
  41 tamanhos de fonte e mais de 20 valores de `z-index` sem escala. `var(--radius)` aparece uma
  única vez. Precisa de regra para escala de raio, sombra, tipografia e camadas.
- **Classes estilizadas em vários arquivos.** `.primary` é definida em 10 arquivos
  (`styles`, `room`, `share`, `preferences`, `finish`, `landing`, `workspace`, `door`, `home`,
  `canvas/timer`). `.sheet-content` em 6, `.icon-button` em 6, `.volume-popover` em 3
  (`multiscreen`, `finish`, `workspace`). `finish.css` é uma camada de polimento que sobrescreve
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
- **Sem link de pular para o conteúdo** (achado 07.13). Movimento reduzido tira até os
  esmaecimentos (07.2), o que contraria a regra de movimento do `CLAUDE.md`.
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
  O ponto da marca aparece quadrado aqui e redondo na sala. "junto" usa um lilás que não está nos
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
  - "Revogar convites" é destrutivo e fica sem confirmação, ao lado de "Copiar convite".
  - O toast da batida cobre o cabeçalho do widget de cima (400) e fica sob o painel Pessoas
    (1280).
  - As iniciais do avatar mudam: "A" na lista da porta e "AN" no resto.

### 1.8 Saída e finalização

- **Objetivo:** encerrar a sessão.
- **Situação:** não existe. "Sair da sala" volta direto para a landing, sem confirmação e sem
  tela de despedida, mesmo para o dono da sala, com o nome mantido no campo. Precisa de regra
  para ações sem volta (sair, revogar, transferir posse).

## 2. Componentes flutuantes

### 2.1 Painéis e modais (`<Dialog>`)

- **Onde:** Ajustes, Compartilhar tela, Pessoas, Adicionar widget, Organizar seu espaço
  (Layout), Minha cor, Sobre, Trocar tela, Histórico de versões, "Todos os espaços estão
  ocupados".
- **Arquivos:** `components/Dialog.tsx` (`dialog.sheet`, `.sheet-centered`, `.sheet-content`,
  cabeçalho com "Fechar painel"), `components/ShareDialog.tsx`, `canvas/WidgetCatalog.tsx`,
  `canvas/GridTools.tsx`. CSS espalhado por `styles.css`, `room.css`, `share.css`,
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
- Precisa de regra para quando usar modal, folha lateral, folha inferior ou painel não modal.

### 2.2 Popovers ancorados

- **Onde:** cadeado/convite (`RoomLock`), notificações (`notifications-panel`), conexão/ping
  (`connection-popover`), volume de tela (`volume-popover`), entrada (`entry-popover`),
  seletor de fonte (`stream-picker`), seletor de grade (`grid-picker`), emoji
  (`emoji-picker`), cor (`color-picker`), escolha de espaço (`slot-picker`).
- **Arquivos:** `components/AnchoredPopover.tsx` (`popover="manual"`),
  `components/popover-position.ts`, `components/Notifications.tsx`,
  `components/EmojiPicker.tsx`, `components/ColorPicker.tsx`, `components/ScreenVolume.tsx`,
  `canvas/GridPicker.tsx`. CSS em `styles.css` (conexão: raio 14, padding 18), `workspace.css`
  (notificações: raio 14, padding 14; volume: padding 12), `finish.css` e `multiscreen.css`
  (volume de novo).
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
  - Itens destrutivos em vermelho ("Silenciar para todos", "Transferir posse da sala") ficam
    sem separação e sem confirmação, e "Silenciar para todos" é reversível, enquanto
    "Transferir posse" não é, com o mesmo peso visual.
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
  - O toast (`z-index: 80`, dentro do canvas) fica sob o painel Pessoas (`z-index: 50`, mas em
    outro contexto de empilhamento).
  - Com movimento reduzido, o toast nunca fecha sozinho (07.1).
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

### 2.6 Confirmações

- **Situação:** praticamente não há. Sair da sala, revogar convites e transferir posse agem na hora
  (fechar widget compartilhado não foi testado). O único diálogo de decisão é "Todos os espaços estão
  ocupados", com estilo próprio. Precisa de regra para confirmar ações sem volta.

### 2.7 Dicas (tooltips)

- **Situação:** não existe componente. São 95 `title=` nativos (ver Base comum). Botões só de
  ícone (sino, tela cheia, trocar, minimizar) dependem disso para se explicar.

## 3. Tabela-resumo

| Componente/tela            | Gravidade | Problema                                                                                                  |
| -------------------------- | --------- | --------------------------------------------------------------------------------------------------------- |
| Base (tokens)              | alta      | `:root` em `styles.css` e `room.css` com valores diferentes, mais um terceiro conjunto em `landing.css`.  |
| Base (valores soltos)      | alta      | 448 cores hex distintas, cerca de 30 raios, 35 sombras e mais de 20 `z-index` sem escala.                 |
| Base (donos de classe)     | alta      | `.primary` em 10 arquivos, `.sheet-content` em 6 e `.volume-popover` em 3, sobrescritos por `finish.css`. |
| Painéis/modais             | alta      | Quatro posições e estilos diferentes para o mesmo `<Dialog>`, que mudam de novo no celular.               |
| Toasts/avisos              | alta      | O toast fica sob o painel Pessoas, não fecha com movimento reduzido e há dois sistemas de aviso.          |
| Saída/confirmações         | alta      | Sair, revogar convites e transferir posse agem sem confirmação e sem tela de saída.                       |
| Entrar (convite inválido)  | alta      | Link de convite inválido ou vencido cai na landing sem aviso.                                             |
| Base (foco visível)        | alta      | Anel de foco retangular que cobre os botões do cabeçalho do widget; forma muda por componente.            |
| Botões                     | média     | Primário em quatro versões (gradiente, chapado, contornado, tamanhos variados).                           |
| Estado selecionado         | média     | Segmentado cinza num lugar e azulado em outro; Layout com dois estilos de seleção.                        |
| Landing (formulário)       | média     | Erro de nome vazio usa a validação nativa, no idioma do navegador.                                        |
| Landing (hierarquia)       | média     | Três CTAs de download acima da dobra competem com "Criar minha sala"; nomes diferentes.                   |
| Landing (celular)          | média     | "Instalar VIO" aparece no celular, onde o app Windows não serve.                                          |
| Sala (adormecer)           | média     | Os controles somem após 1 s parado; quem chega não vê o que fazer.                                        |
| Sala (grade vazia)         | média     | "+ Adicionar widget" repetido 4 vezes e "Foco único" desabilitado sem motivo.                             |
| Sala (celular)             | média     | Setas de rolagem por cima dos widgets; campos da votação encostam na borda.                               |
| Catálogo (celular)         | média     | Abas cortadas sem sinal de rolagem; texto de Câmeras pede botão direito no toque.                         |
| Dicas                      | média     | 95 `title=` nativos: nenhuma dica no toque nem no foco do teclado.                                        |
| Rótulos mono               | média     | Mono maiúsculo pequeno e de baixo contraste em rótulos de interface, fora do uso previsto.                |
| Popovers                   | média     | Raio, padding, cabeçalho e ancoragem diferentes entre popovers vizinhos.                                  |
| Menus                      | média     | Destrutivos sem separação; reversível e irreversível com o mesmo peso.                                    |
| Tranca (popover)           | média     | Interruptor e caixa de seleção misturados para opções do mesmo tipo.                                      |
| Widgets (cabeçalho)        | média     | Botões do cabeçalho variam por widget; estado vazio só no chat.                                           |
| Ajustes (voz)              | média     | Medidor e controle de sensibilidade em barras separadas.                                                  |
| Porta                      | baixa     | Recusado sem motivo nem próximo passo; logo muda de posição em relação à landing.                         |
| Pessoas (painel)           | baixa     | Título e aba repetem "Pessoas"; ícone de fone sem texto.                                                  |
| Avatar                     | baixa     | Iniciais "A" na porta e "AN" no resto.                                                                    |
| Landing (card)             | baixa     | Card de canto vivo entre campos arredondados; ponto quadrado aqui e redondo na sala.                      |
| Notificações               | baixa     | Estado vazio sem próximo passo.                                                                           |
| Textos da sala             | baixa     | "Flutuante" e "16 ms Servidor" não se explicam ao público.                                                |
| Início (app)               | baixa     | Não verificado no navegador; precisa entrar na rodada de screenshots do app.                              |
| Acessibilidade (navegação) | baixa     | Sem link de pular para o conteúdo (07.13).                                                                |
