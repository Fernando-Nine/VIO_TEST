# Landing C "O ponto" — spec (#197, escolha A)

Canvas da leva 5, linha "Escolhidas" (https://claude.ai/artifact/6wwRHH5cSppNTGfAm4rKtZ):
prancha "Escolhida · Landing A" (computador) e "Escolhida · Landing no celular". Roteiro em
`docs/ideias/2026-10-28-roteiro.md`; transições em [transicoes.md](transicoes.md).

## Objetivo

Manter a 1ª tela de hoje e descer, com rolagem com encaixe (snap), por três telas:
Por que instalar → Funcionalidades → Download. O ponto quadrado da logo conduz a página.

## Estrutura (computador)

- Cabeçalho fixo de 72 px: logo (32 px de altura) à esquerda; **Baixar para Windows**
  (`.primary`, 44 px, ícone `Download`) à direita, visível em todas as telas.
- Uma **trilha** vertical tracejada (2 px, `#2727F566`) no centro da página liga as telas; o
  ponto desce por ela entre uma tela e outra. É decoração (`aria-hidden`).
- Cada tela tem no mínimo 100vh − 72 px, conteúdo em até 1280 px, `scroll-snap-align: start`
  (snap `y proximity`, nunca `mandatory`, para não prender quem rola com teclado).
- Fundo de linhas diagonais atual em todas as telas (o mesmo `.landing-page::before/after`).

### 1 · Abertura (fica como está)

- Título "Bom mesmo é assistir **junto**" + ponto de 18 px pulsando devagar (2,4 s) no lugar
  do ponto final. Kicker, texto e cartão "Chega mais" como hoje.
- Novos: **Baixar para Windows** (52 px) e o link **Por que instalar** com `ArrowDown`.

### 2 · Por que instalar — "No app, é ao vivo de verdade."

- Centralizado: título 60 px; mockup da janela do app (880 px, moldura simples com − □ ×,
  sem marca de terceiros) com palco e 4 pessoas no rodapé; selo **Ao vivo** no canto do palco
  (o ponto que desceu vira o ponto do selo).
- Texto: "Tela e som do Windows saem juntos, direto do seu PC para os seus amigos. O VIO não
  grava nem guarda nada." Três selos: Som do jogo ou do filme junto · Atualiza sozinho ·
  Sem conta.
- Botão de som (44×44, `aria-label="Ouvir 3 segundos de demonstração"`), desligado por
  padrão. Opcional: sai se o áudio autoral não ficar pronto.
- O print do palco é conteúdo autoral ou livre de direitos, nunca filme ou jogo reconhecível.

### 3 · Funcionalidades — "Cada um é um ponto. Junto é sala."

- Quatro pontos coloridos acima do título (cores de participante).
- Abas (`role="tablist"`): **Várias telas** · **Voz** · **Widgets da sala**, uma de cada vez.
- Mini-sala em HTML (não print), comportamento da prancha "Mini-sala que funciona":
  Várias telas troca o foco ao clicar; Voz anima o ponto de quem "fala" (roteirizado, sem
  áudio); Widgets tem **roleta que gira** e **votação que conta** só no navegador de quem
  visita, sem servidor. Legenda: "Na sala de verdade, vale para todo mundo."

### 4 · Download — "Só falta você."

- Título 96 px com o ponto final; botão grande **Baixar para Windows** com a linha mono
  "Windows 10 e 11 · [TAMANHO] · versão [X.Y.Z]" (tamanho e versão vêm da última versão em
  `Fernando-Nine/vio-releases`); link **Ou entre pelo navegador** (sobe até "Chega mais").
- "Manda o link no grupo." + endereço em mono + **Copiar**.
- Ao clicar em baixar: o ponto cai no botão, o rótulo vira "Baixando…" e aparece "Abra o
  instalador quando terminar" com 2 passos (1. Clique no arquivo baixado. 2. Crie uma sala ou
  entre com o código.).
- Rodapé: "by NerdQuest Studios", Código aberto (AGPL) e Privacidade.

## Celular (380)

- Sem snap, sem trilha e sem ponto viajando; cada tela empilha com a imagem acima do texto.
- Cabeçalho de 64 px com **Entrar pelo navegador** no lugar de Baixar (não há app de celular).
- Tela 2 acrescenta "O app é para Windows. No celular, você entra pelo navegador."
- Tela 4: **Entrar pelo navegador** (56 px), "Tem PC com Windows? Abra este endereço lá para
  baixar o app." e **Copiar endereço para o grupo**.
- **Sem vazio no fim**: a última tela termina no rodapé (altura pelo conteúdo, nunca
  `min-height: 100vh` no celular). Foi o ajuste pedido na escolha.

## Peso e acessibilidade

- Prints em WebP com `loading="lazy"`; a mini-sala sem biblioteca nova.
- Todos os botões são `<button>`/`<a>` reais, alvos ≥ 44 px, foco visível em `--focus`.
- Movimento: segue [transicoes.md](transicoes.md); com movimento reduzido o ponto aparece
  direto no lugar final e nada pulsa.
