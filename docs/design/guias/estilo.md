# Guia do estilo próprio do VIO (v2)

> Guia de produção, fase 2 → 3 do [plano](plano.md) (#227). **Em aberto até o aval do usuário.** Depois
> dele vêm as 5–7 variações; o que for decidido nelas sobe para o [brandbook](../brandbook/README.md)
> na fase 3. Base: comentários do usuário nas pranchas da fase 2 (12 nov 2026,
> [canvas](https://claude.ai/artifact/1fpNgRHfZ9Zbsteh2EJtH5)), o roteiro de espaços do Roteirista,
> [`movimento-ponto.md`](movimento-ponto.md) e [`../transicoes.md`](../transicoes.md).

**Como ler.** As regras valem para todas as variações. O que está marcado **(variar)** é eixo de
exploração: cada variação escolhe um valor, e nenhuma junta todos. **(sugestão)** é proposta do
Design ainda não pedida pelo usuário. As respostas do usuário estão no fim.

**Bases.** **3A Expressivo** (tonal, chapado, botões de ícone, cor da pessoa) e **5A Geométrico**
(formas com sentido) são as duas principais. **4A Bento** entra com peso menor: peças que encaixam
numa grade e a barra de tempo que encolhe. Da **1B** fica só a grade de fundo; do **5B**, a ideia dos
balões separados que nascem do Ponto.

---

## 1. Princípios

1. **Tudo é feito do Ponto.** Botões, balões, peças e ilustrações saem da mesma forma: o quadrado
   arredondado do logo, esticado, cortado ou contornado. Nenhuma forma entra "porque é bonita".
2. **O Ponto é a sala, e as pessoas também são pontos.** Sala, pessoa e Ponto da marca têm a mesma
   silhueta. Círculo não representa ninguém.
3. **Geométrico, mas macio.** Nem quadrado reto (2A, 1A), nem tudo redondo (5B). Raios proporcionais
   e concêntricos, para que as quinas encaixem.
4. **A cor diz de quem é.** Anil é a cor da marca e da sala; a cor de cada pessoa tinge o que vem
   dela. Estado se mostra com forma e movimento, não com uma cor nova.
5. **O filme manda.** Na sala, o palco é o centro e a interface fica nas bordas, em peças pequenas
   que somem quando ninguém mexe.
6. **Nenhum espaço morto, nenhum enfeite solto.** Espaço sobrando recebe textura ou ilustração da
   família do Ponto, nunca um vazio cinza e nunca uma forma sem função.
7. **Posições novas.** As variações devem sair do desenho atual (cabeçalho cheio no topo, barra
   embaixo, coluna à direita) e testar os cantos, as bordas e o próprio Ponto como âncora.

## 2. Forma

### 2.1 O raio do Ponto

**Valor oficial: 6/22 do lado (27,27 %)**, o mesmo do logo (`rx="6"` num ponto de 22 em
`Logo.tsx` e no `logo-vio.svg`). Em pixels, arredonda-se `lado × 6 / 22`: 16 → 4, 24 → 7, 32 → 9,
40 → 11, 44 → 12, 48 → 13, 56 → 15, 64 → 17.

| Peça                          | Mouse                          | Toque `(pointer: coarse)` | Raio                                       |
| ----------------------------- | ------------------------------ | ------------------------- | ------------------------------------------ |
| Ponto, pessoa, sala (avatar)  | 16–64 px                       | igual                     | **27,27 %** do lado, sem teto              |
| Botão só ícone                | 40 px                          | 44 px                     | 11 / 12 px                                 |
| Botão com texto               | 40 ou 48 px                    | 48 px                     | 11 / 13 px                                 |
| Campo de texto                | 40 px                          | 48 px                     | 11 / 13 px                                 |
| Chip, selo, contagem          | 24 px desenhado, área de 40 px | área de 44 px             | pílula (até 24 px de altura)               |
| Item de menu                  | 32 px desenhado, área de 40 px | 44 px                     | 9 / 12 px                                  |
| Balão                         | ≥ 36 px                        | ≥ 44 px                   | 12 px, um canto apontado de 3 px (ver 4.1) |
| Peça (widget, painel, cartão) | qualquer                       | qualquer                  | 16 px                                      |
| Palco                         | —                              | —                         | 16 px, ou 0 em tela cheia                  |

- **A área de toque pode ser maior que o desenho.** Um chip de 24 px tem área de clique de 40 px
  (44 no toque) por `padding` ou pseudo-elemento, sem crescer na tela.
- **Teto de 16 px só para Placa e peças.** Peça grande não ganha raio grande: é isso que fazia o 5B
  parecer "balãozão". O Ponto e o avatar mantêm sempre a proporção.
- **Raios concêntricos.** Peça dentro de peça: raio de dentro = raio de fora − **padding interno**
  da peça de fora (16 − 8 = 8; mínimo 4). É a regra que faz as quinas encaixarem.
- **Gap** entre peças vizinhas: 8 px fixo. Padding interno e gap são medidas separadas.
- **Pílula (999 px) só até 24 px de altura.** Acima disso, raio da tabela.
- **Raio 0** só em linha da grade, divisória e no palco em tela cheia.

### 2.2 O que é redondo, o que é geométrico

| Família        | Forma                                               | Usos                                                              |
| -------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| **Ponto**      | quadrado com raio de 27,27 %                        | Ponto da marca, pessoa, sala, botão de ícone, alça de arrastar    |
| **Barra**      | Ponto esticado num eixo, mesmo raio absoluto        | barra de tempo, progresso, volume, divisor de peças               |
| **Placa**      | Ponto esticado nos dois eixos, raio da tabela       | balão, peça, campo, botão com texto                               |
| **Contorno**   | traço de 2 px seguindo o Ponto                      | anel de fala, seleção, "lugar vago"                               |
| **Corte** (5A) | quarto ou metade do Ponto (um canto arredondado só) | ilustração, textura, canto apontado do balão, encaixe entre peças |

- **Círculo perfeito não entra** como peça (fica só dentro dos ícones `lucide-react`). As bolinhas de
  pessoa do 5A viram Pontos.
- **Toda forma tem papel** (princípio do 5A): Ponto é alguém ou algum lugar, Barra é quantidade ou
  tempo, Placa guarda conteúdo, Contorno é estado, Corte é ilustração. Um Ponto parado sem papel é
  proibido (o "ponto solto" do 5A).
- **Estado no texto, não no Ponto da sala.** Sala trancada mostra o cadeado no texto ("Trancada"),
  nunca por cima do Ponto da sala (5A).
- **Ícones:** `lucide-react`, 2 px, 16/20/24, centrados opticamente no Ponto ou na linha de texto,
  nunca "flutuando" fora da linha de base (3A).

## 3. Cor

### 3.1 Base

Tema Noite. Texto `#F3F3FB`; texto secundário `#A3A5BC`; anil da marca `#2727F5`; destaque
`#A6A9FF`; perigo `#FF8A96`. O anil sobre Noite dá **2,50:1**: só em área grande ou atrás de ícone
claro (branco sobre anil, 7,1:1), nunca como texto, ícone fino ou contorno sozinho.

**Tema claro e Noite azul:** ficam para a fase 3. Este guia só define a Noite; a receita da 3.2 será
refeita para o claro, e o palco continua escuro em todos os temas
([fundamentos](../brandbook/fundamentos.md#temas-próprios)).

### 3.2 Paleta derivada da cor pessoal (3A)

Cada cor pessoal (as 8 de `src/shared/colors.ts`) gera a mesma escala em OKLCH: mantém o matiz e
fixa luminosidade (L) e croma (C), reduzindo o croma quando sai da gama do sRGB. A paleta **Anil** é
a da marca e da sala; as outras tingem o que vem da pessoa.

| Tom               | L     | C     | Uso                                                    |
| ----------------- | ----- | ----- | ------------------------------------------------------ |
| `chao`            | 0,16  | 0,025 | fundo da tela                                          |
| `grade`           | 0,19  | 0,03  | linhas e pontos da grade de fundo (só decorativo, 5.1) |
| `peca`            | 0,205 | 0,035 | balão, peça, campo                                     |
| `pecaAlta`        | 0,25  | 0,045 | hover, peça sobre peça                                 |
| `contorno`        | 0,55  | 0,07  | borda de controle, seleção fraca                       |
| `recipiente`      | 0,33  | 0,10  | botão ligado, item escolhido                           |
| `sobreRecipiente` | 0,88  | 0,06  | texto e ícone sobre `recipiente`                       |
| `destaque`        | 0,80  | 0,11  | ícone ativo, barra de tempo, anel de fala, foco        |
| `textoSuave`      | 0,80  | 0,025 | texto secundário sobre a peça                          |

As 8 paletas (hex calculados com a receita acima; as duas últimas colunas são o contraste da **cor
pura** da pessoa sobre o `chao` e a `peca` da própria paleta):

| Cor                | `chao`    | `grade`   | `peca`    | `pecaAlta` | `contorno` | `recipiente` | `sobreRecipiente` | `destaque` | `textoSuave` | pura/`chao` | pura/`peca` |
| ------------------ | --------- | --------- | --------- | ---------- | ---------- | ------------ | ----------------- | ---------- | ------------ | ----------- | ----------- |
| Anil `#2727F5`     | `#090D18` | `#0E1321` | `#101627` | `#182037`  | `#60709B`  | `#203068`    | `#C7D7FE`         | `#A3BCFE`  | `#B7BECE`    | 2,49:1      | 2,31:1      |
| Rosa `#EC75B5`     | `#15090F` | `#1E0E16` | `#23101A` | `#311825`  | `#916178`  | `#581A3E`    | `#F7C8DE`         | `#F3A0CA`  | `#CBB8C0`    | 7,22:1      | 6,70:1      |
| Amarelo `#F5CB55`  | `#120D02` | `#191304` | `#1D1604` | `#2A2005`  | `#827040`  | `#433301`    | `#E7D6AB`         | `#DABA66`  | `#C4BDAC`    | 12,50:1     | 11,60:1     |
| Verde `#67CB96`    | `#041009` | `#07180F` | `#071C11` | `#0B2819`  | `#4C7E62`  | `#004126`    | `#B7E4C9`         | `#7CD3A3`  | `#B1C3B8`    | 9,75:1      | 8,92:1      |
| Ciano `#60CFDC`    | `#011012` | `#02181A` | `#001C1F` | `#00272C`  | `#387D85`  | `#003D44`    | `#A9E3EB`         | `#57D2E0`  | `#ACC3C5`    | 10,57:1     | 9,66:1      |
| Vermelho `#ED747C` | `#170909` | `#200E0F` | `#251011` | `#341819`  | `#966162`  | `#5E1922`    | `#FDC8C9`         | `#FDA0A3`  | `#CDB8B8`    | 6,85:1      | 6,37:1      |
| Roxo `#AB88EE`     | `#0F0B17` | `#15111F` | `#191325` | `#241D34`  | `#776995`  | `#3D2761`    | `#DCD0FB`         | `#C6AEFB`  | `#BFBBCC`    | 6,93:1      | 6,45:1      |
| Laranja `#F1A365`  | `#150A04` | `#1E1006` | `#231306` | `#311C0A`  | `#916748`  | `#522902`    | `#F7CFB1`         | `#F3AC75`  | `#CBBAAE`    | 9,44:1      | 8,71:1      |

**Contraste medido nas 8 paletas** (pior caso): texto `#F3F3FB` sobre `peca` 16,0:1 · `textoSuave`
sobre `peca` 9,6:1 · `sobreRecipiente` sobre `recipiente` 8,4:1 · `destaque` sobre `chao` 9,9:1 ·
`contorno` sobre `peca` 3,6:1 · perigo `#FF8A96` sobre `chao`/`peca` Anil 8,6:1 / 8,0:1. Tudo passa
no AA (texto 4,5:1, controle e gráfico 3:1). O cálculo vira teste dos tokens na fase 4.

**A cor pura pode ter pouco contraste** (Anil dá 2,49:1, e a roda de cores permite qualquer uma).
O Ponto da pessoa nunca é a única pista: leva as iniciais na cor que contrasta mais (branco ou
`chao`) e vem com o nome. Se a cor pura der menos de 3:1 sobre o fundo, o Ponto ganha o Contorno
`destaque`, que sempre passa de 3:1; quando sinaliza estado (fala, transmissão), o estado também vai
no Contorno.

Regras:

- **A cor pura da pessoa só no Ponto dela** (avatar, ponto ao lado do nome, ponto de quem transmite).
  Em área grande usa-se o tom `destaque` ou `recipiente`, nunca a cor pura: é o que corrige o
  amarelo forte do 3A.
- **Fundo atrás do Ponto:** o Ponto pousa direto no `chao` ou na `peca`. Sem halo ou faixa colorida
  atrás dele em repouso (a "cor atrás do ponto" do 3A); halo só como gesto (5.3).
- **Botão principal:** fundo `recipiente` com texto `sobreRecipiente`, ou o anil cheio com ícone
  branco (7,1:1). **Nunca botão branco em fundo escuro** (4A).
- **Sem cor de estado nova.** Verde e amarelo existem só como cor de pessoa. Aviso usa o tom
  `destaque` da sala com ícone e texto. Exceção única: **"ao vivo" é sempre verde** (resposta 3).
- **Perigo `#FF8A96` sempre com ícone e texto** ("Sair da chamada", "Remover"), nunca só a cor, para
  não ser confundido com o Ponto de quem escolheu Vermelho.
- Estado nunca só por cor: sempre ícone, texto ou forma junto.

## 4. Balões e peças

### 4.1 O balão (5B, corrigido)

O balão é **um Ponto que esticou, mudou de cor e aponta para a origem**.

- Placa de raio 12 px com **um canto apontado** (raio 3 px) virado para quem o gerou: o botão, a
  pessoa, o canto da tela. **(variar)** canto apontado ou bico curto em Corte (6 px).
- Pequeno: até 320 px de largura e 3 linhas. Passou disso, não é balão, é peça.
- Cor: `peca` da paleta de quem gerou (aviso de Mari bater na porta = paleta de Mari); da sala, Anil.
- Três tipos, com regras diferentes:

| Tipo                   | Exemplos                                 | Some sozinho?                                                                   | Movimento (seção 7) |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------------- | ------------------- |
| **Dica**               | nome de botão de ícone (q09), atalho     | sim, ao tirar o mouse ou o foco                                                 | 7.2, sem o Ponto    |
| **Balão de interface** | balões de canto da sala (4.2)            | sim, quando ninguém mexe                                                        | 7.1, o Ponto conduz |
| **Aviso**              | alguém bateu na porta, sala cheia, falha | **não** se pede ação: fica até ser dispensado ou o pedido deixar de valer (q07) | 7.1, o Ponto conduz |

- Aviso anuncia com `aria-live="polite"`; o que pede ação leva botão com verbo e Esc dispensa.

### 4.2 Balões de canto na sala

- **Separados, nos cantos**, no lugar de um cabeçalho cheio: por exemplo, sala (Ponto da sala, nome,
  código) num canto e conexão e pessoas no outro. Conteúdo exato fica para as variações.
- **No máximo 5 visíveis** ao mesmo tempo, contando a barra de controles. Avisos não entram na conta.
- **Somem quando ninguém mexe:** 3 s com mouse, 4 s no toque; **8 s** na primeira vez na sala e na
  primeira vez com uma tela nova (q11). Voltam ao mover o mouse, tocar ou receber foco pelo teclado.
  **(sugestão)** fixar com o botão direito.
- **O Ponto da sala fica.** Ele mora no balão da sala, antes do código (substitui o "ponto antes do
  código, no cabeçalho" de [`transicoes.md`](../transicoes.md)). Quando o balão some, o Ponto da sala
  continua no canto, a 16 px da borda, e é dele que o balão renasce. Na tela cheia de transmissão
  vale o brandbook: ponto pequeno, de baixa opacidade, na cor de quem compartilha.
- Nunca bloqueiam o toque no vídeo; ficam a 16 px da borda, alinhados à grade.
- Sobre vídeo: fundo `peca` com 88 % de opacidade, **sem blur** (custo e regra 2 do Ponto). Mesmo
  sobre vídeo branco, o texto fica em 11,6:1 e o `textoSuave` em 6,9:1.

### 4.3 Peças (widget, painel, palco)

- Peças **encaixam** numa grade de 8 px com gap de 8 px entre elas (Bento, peso menor): as bordas se
  alinham e os raios se respondem (2.1).
- Uma peça grande **não é balão**: sem canto apontado, raio de 16 px, sem sombra.
- Sem sombra em geral; elevação é tom (`peca` → `pecaAlta`).

### 4.4 Botões

- **Só ícone por padrão** (3A), quadrado de Ponto de 40 px (44 no toque), com `aria-label` e nome em
  dica no hover e no foco (q09). Texto só na ação principal da tela.
- **No toque não há hover.** O nome aparece no **toque longo** (500 ms), num balão que traz o nome
  como título e, logo abaixo, as variantes da ação, se houver. Um gesto só para as duas coisas.
- **Um controle por intenção.** Duas variantes da mesma ação (as duas telas cheias do 3A) viram um
  botão só; a outra fica no menu do botão direito e no balão do toque longo.
- **Nenhum controle some com o estilo.** Foco único, layout, tela cheia, convidar: todos os do
  [inventário](inventario.md) aparecem em toda variação de sala (o Foco único sumiu no 3A).
- **Criar sala** pode ganhar a forma do Ponto (do 5A), **mantendo o texto** "Criar sala"; só ícone
  quando não couber (resposta 4).

### 4.5 Tempo que encolhe (4A)

Tudo o que tem prazo (votação, cronômetro, convite, pedido de entrada) mostra uma **Barra** de 4 px
ao lado do ícone de relógio e do tempo em IBM Plex Mono. A Barra é uma **máscara fixa**
(`overflow: hidden`, raio da Barra) com um preenchimento dentro que **desliza para a esquerda por
`translateX`** de 0 a −100 %. Nada encolhe com `scaleX`, para o raio não deformar. Mesma peça em todo
lugar.

## 5. Grade e fundos

### 5.1 A grade (1B)

- Grade de **32 px**, linha de 2 px no tom **`grade`** da paleta do lugar (Anil na sala e no Início).
  É token, derivado de cada paleta, **só decorativo**: não carrega informação, não precisa de
  contraste e **nunca serve de contorno de controle**.
- **(variar)** linha contínua, só as interseções (textura de pontos, do Roteirista) ou interseções em
  Pontos de 3 px.
- Fica no Início, na porta, nos vazios e atrás das peças da sala; **nunca atrás do palco** nem
  dentro de área de leitura.

### 5.2 Padrões infinitos que reagem ao mouse

- Sutis: os Pontos da grade perto do cursor (raio de ~120 px) crescem até 1,6× e clareiam (opacidade);
  voltam em 600 ms.
- Pausam com Reduzir movimento, com a aba escondida e **na sala enquanto alguém transmite** (não
  gastar a máquina de quem envia). Ficam estáticos, ainda visíveis.
- **(variar)** reagir ao cursor, deriva lenta contínua (um ciclo ≥ 20 s) ou estático.

### 5.3 Os três gestos do Ponto (vocabulário que se repete)

| Gesto              | Forma                            | Onde                                            | Com Reduzir movimento                               |
| ------------------ | -------------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| Ponto + **anel**   | Contorno que acompanha a voz     | fala (lê o estado de voz, não cria análise)     | Contorno fixo de 2 px enquanto fala; some ao parar  |
| Ponto + **halo**   | Contorno que se afasta e esmaece | convidar, alguém bateu na porta, chamar atenção | dois Contornos parados, um afastado do outro        |
| Ponto + **órbita** | Pontos menores girando em volta  | carregando, conectando, reconectando            | três Pontos parados em volta, com o texto do estado |

Os mesmos três em botão, balão, ilustração e carregamento. Nada de quarto gesto sem pedido. Parados,
eles ainda dizem o estado pela forma.

### 5.4 Ilustrações

- Feitas só das famílias da 2.2, traço de 2 px e as cores da paleta (Cortes do 5A, compostos).
- **Paradas e assentadas**: formas encaixadas na grade, não caindo nem quicando (o 5B ficou
  infantil). Se mexem, mexem pouco e por motivo (respirar, reagir ao cursor).
- Uma família só, repetida: vazio da sala, sem recentes, microfone negado, reconectando, porta.

## 6. Densidade e espaço

- Base de 8 px; 4 px como meio passo. Texto: no máximo 3 tamanhos e 2 pesos por peça (escala na
  seção 10).
- Alvos: 40 px no mouse, **44 px quando `(pointer: coarse)`** (tabela da 2.1).
- **Usar o espaço.** Início: criar e entrar continuam no centro; ao redor, perfil e salas juntos
  (3A) e as peças que o Roteirista propôs, em segundo plano. O que sobra recebe grade e ilustração,
  não vazio.
- **Sem largura máxima** (resposta 5). A tela usa toda a largura, até telão e TV. Em tela grande o
  conteúdo não se espalha: as peças crescem em proporção (a escala da interface sobe a partir de
  1920 px) e o que é lido junto continua agrupado, com linhas de texto de até ~72 caracteres.
- Celular (390 px): balões viram uma linha no topo e uma embaixo; nada de rolagem lateral.

## 7. Movimento

**Só guia, nada se anima agora.** Esta seção registra as regras para quando as animações forem feitas (fase 5); as variações da fase 2 são quadros estáticos.

Vale [`transicoes.md`](../transicoes.md) e as cinco regras de
[`movimento-ponto.md`](movimento-ponto.md#1-as-cinco-regras-as-únicas-inegociáveis): o Ponto
conduz, animação completa por padrão (decisão 020: `transform`/`opacity` são o caminho barato, não um
limite), origem e destino medidos (FLIP), ≤ 800 ms,
interrompível, curva `--ease-ponto` `cubic-bezier(.2,.7,.2,1)`.

### 7.1 O Ponto conduz (transições, balões de interface e avisos)

- **Ponto branco que fica anil ao viajar (3A), por enquanto.** Não é definitivo: o Ponto pode passar o protagonismo, mover-se e mudar de cor (resposta 2). Em repouso dentro de um botão ou peça, o Ponto é
  `#F3F3FB`; em viagem, é anil. A troca de cor acompanha a viagem (120 ms na partida, o inverso no pouso). O ponto do logo segue sempre anil.
- **Um Ponto só** (regra 1 de `movimento-ponto.md`): o Ponto que repousa no botão é o mesmo que
  parte. Ao sair, o botão fica sem ele; ao pousar, ele passa a ser o Ponto do destino. Nunca há um
  segundo Ponto esperando no destino.
- **Balões de interface e avisos nascem do Ponto:** o Ponto viaja da origem (o Ponto da sala, o
  Ponto da pessoa que bateu na porta) até o canto apontado do balão, e a placa aparece dali com
  `opacity` e um `scale` **uniforme** de 0,9 a 1 (`transform-origin` no canto apontado), 160 ms. O
  Ponto fica no balão, à esquerda do texto. Ao sumir, o inverso. **O Ponto vira retângulo esticando de verdade:** anima-se a largura e a altura (ou `clip-path: inset(... round 12px)`), que mantêm o raio exato. O que não se usa é `scaleX`/`scaleY`, que só espicha a imagem e entorta os cantos.
- **Molas só no Ponto e nos gestos**, nunca no conteúdo do palco, em peça ou em lista.
- **Exceção a `transicoes.md` (Pessoa chega):** o quique `cubic-bezier(.3,1.4,.5,1)` fica só no
  **Ponto da pessoa**, que é um Ponto; o nome e o resto do item entram sem quique, com `opacity` e
  `translate` (`--ease-ponto`, 320 ms). `transicoes.md` foi atualizado com isso.
- **A bola do 5A:** cada variação mostra o Ponto do Início parado, respirando e viajando em **quadros
  estáticos**. Nada se anima nesta fase: a seção 7 é regra para a fase 5.

### 7.2 Dica e menu, sem a viagem do Ponto (q22)

A viagem leva 400 ms ou mais; numa dica que abre a cada passada do mouse, isso cansa. Por isso a
dica e o menu **não usam o Ponto**. Proposta **"brotar do canto"**:

- **Dica:** nasce no canto apontado com `opacity` de 0 a 1 e `scale` **uniforme** de 0,96 a 1,
  `transform-origin` no canto apontado, **120 ms** `--ease-ponto`. Fecha em **80 ms**, só `opacity`.
- **Sem repetição cansativa:** atraso de 400 ms na primeira dica; se outra abre até 300 ms depois de
  uma fechar, aparece direto, sem animação e sem atraso.
- **Menu:** a placa brota igual em 140 ms, e os itens aparecem juntos, sem cascata.
- Rápida, sem quique, sem deformar o raio, e o canto apontado diz de onde ela veio.

### 7.3 Reduzir movimento

É o interruptor de acessibilidade e também de PC fraco ou internet ruim (decisão 020).
Uma regra só, **sem exceção: tudo vira esmaecimento de 150 ms** (`opacity`), dica e menu inclusive.
O Ponto aparece direto no lugar final, nada cresce nem quica, os padrões de fundo param e os três
gestos ficam estáticos, com o estado mostrado pela forma (tabela da 5.3).

## 8. Proibido

- Forma: quina reta em peça (tudo quadrado, 2A); pílula acima de 24 px ou raio acima de 16 px em
  Placa e peça; tudo parecer balão (5B); círculo como pessoa ou sala; raios que não encaixam.
- Ponto solto, sem papel; cadeado ou outro selo por cima do Ponto da sala; dois Pontos da marca ao
  mesmo tempo (fora contagem e carregamento).
- Cor: verde ou outra cor de estado fora da paleta; cor pura da pessoa em área grande; botão branco
  em fundo escuro; anil como texto ou ícone fino sobre Noite; cor atrás do Ponto em repouso; perigo
  só na cor; grade usada como contorno.
- Movimento: esticar Placa ou Barra com `scaleX`/`scaleY` (entorta o raio; use largura, altura ou `clip-path`); mola em peça ou lista; formas caindo, quicando ou espalhadas no Início.
- Ilustração que não seja da família do Ponto.
- O código da sala desenhado em peças (5B): ele é sempre texto em IBM Plex Mono.
- Espaço sem uso; cabeçalho gigante; duas versões do mesmo controle lado a lado; controle sumido.
- Blur ou `backdrop-filter` sobre vídeo; grade ou padrão atrás do palco; padrão animado durante a
  transmissão.
- Aviso que pede ação sumindo sozinho.
- Juntar tudo o que o usuário gostou numa tela só: cada variação escolhe poucos eixos.
- Botão de mods ou plugins: é coisa futura e não vira botão (sem botão morto).

## 9. Eixos para as 5–7 variações

| Eixo             | Valores                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Base dominante   | 3A tonal · 5A geométrico · mistura com peso maior num dos dois                                     |
| Posição da sala  | balões nos 4 cantos · coluna de peças numa borda · menu radial em Pontos ao redor do Ponto da sala |
| Fundo            | grade de linhas · textura de pontos · pontos que reagem                                            |
| Canto do balão   | canto apontado · bico em Corte                                                                     |
| Cor da interface | só Anil · peças da pessoa na cor dela · interface na cor de quem a usa (opção, resposta 1)         |
| Botão principal  | placa com texto · Ponto com texto ao lado (resposta 4)                                             |

## 10. Entrega de cada variação

### 10.1 Telas mínimas

Cada variação mostra, em tamanho real: **Início** (1280 × 800), **Sala sem transmissão**
(1280 × 800), **Sala com transmissão** (1280 × 800) e **Sala no celular** (390 × 844). Uma das
variações mostra também uma tela de TV (3840 × 2160) e uma larga (2560 × 1080), sem largura máxima.

### 10.2 Eixos e cobertura

Cada variação **muda 2–3 eixos** da seção 9 em relação à base e diz quais na nota. A leva traz uma
lista de cobertura, e todo valor da seção 9 aparece em pelo menos uma variação:

| Variação | Base | Posição da sala | Fundo | Canto do balão | Cor da interface | Botão principal |
| -------- | ---- | --------------- | ----- | -------------- | ---------------- | --------------- |
| V1 … V7  | …    | …               | …     | …              | …                | …               |

### 10.3 Menu radial (se a variação usar)

- Itens são Pontos de 44 px (mouse e toque), num anel de **raio de 72 px** (até 96 px com 6 itens),
  com no mínimo 8 px entre itens.
- **No máximo 6 itens**; o resto vai para "Mais", que é um dos 6.
- Abre do Ponto da sala; cada item tem `aria-label` e dica.
- Teclado: Enter ou Espaço abre (`role="menu"`, foco no primeiro item); setas giram entre os itens;
  Enter escolhe; Esc fecha e devolve o foco ao Ponto da sala. Toque: toque abre, toque fora fecha.
- Não pode cobrir o palco quando há transmissão; abre para dentro da área livre.

### 10.4 Escala tipográfica

| Papel                     | Fonte               | Tamanho/linha | Peso |
| ------------------------- | ------------------- | ------------- | ---- |
| Título do Início          | Bricolage Grotesque | 40/48         | 600  |
| Título de página ou peça  | Bricolage Grotesque | 24/32         | 600  |
| Destaque, botão principal | Bricolage Grotesque | 16/24         | 600  |
| Texto                     | Bricolage Grotesque | 14/20         | 400  |
| Rótulo, dica, selo        | Bricolage Grotesque | 12/16         | 500  |
| Código da sala            | IBM Plex Mono       | 16/24         | 400  |
| Ping, tempo, números      | IBM Plex Mono       | 12/16 · 14/20 | 400  |

Texto corrido nunca abaixo de 14 px; 12 px só em rótulo curto.

### 10.5 Estados

| Estado             | Visual                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Normal             | `peca` (ou transparente sobre peça), ícone `#F3F3FB`                                                             |
| Hover              | `pecaAlta`                                                                                                       |
| Pressionado        | `scale(0,96)` por 100 ms e volta; sem trocar a forma                                                             |
| Ligado / escolhido | `recipiente` com ícone ou texto `sobreRecipiente`, mais ícone ou forma diferente (não só a cor)                  |
| Desativado         | evitar: quem não pode agir vê o estado, sem botão. Se inevitável (carregando): opacidade 0,4 e dica com o motivo |
| Foco (teclado)     | contorno de **2 px em `destaque`**, com **afastamento de 2 px** (`outline-offset`), seguindo o raio da peça      |

Cada variação mostra os estados de um botão de ícone, um botão com texto e um item de menu.

## Respostas do usuário (12 nov 2026)

1. **Cor pessoal na interface:** opção em Aparência ("tema na minha cor", parcial), **desligada por
   padrão**. Desligada, a cor tinge só o que vem da pessoa. Ligada, mais partes da interface usam a
   paleta dela. Como existe a roda de cores, qualquer cor pode chegar: os tons da paleta saem da
   receita da 3.2 (luminosidade e croma fixos, só o matiz vem da cor), então continuam legíveis com
   qualquer escolha. A cor pura, que pode ser escura ou clara demais, fica só no Ponto, com iniciais
   e nome, e ganha o Contorno `destaque` quando passar de menos de 3:1 sobre o fundo. As variações
   podem mostrar a opção ligada.
2. **Ponto branco parado:** não é definitivo. O Ponto pode passar o protagonismo de um lugar para
   outro, mover-se e mudar de cor (ficar anil) conforme a tela. Só no movimento reduzido ele fica
   parado. Detalhe fica para a fase 5.
3. **"Ao vivo":** o ponto é sempre verde. Testar nas variações o verde-água atual (`#4CDDC3`) e um
   verde mais vivo que passe contraste; nos dois casos vai com o halo e o texto "Ao vivo", para não
   se confundir com o Ponto de quem escolheu Verde ou Ciano.
4. **Criar sala:** o comentário antigo falava da animação, não de tirar o texto. Pode explorar a
   forma, mas **com texto escrito** por padrão (mais intuitivo); só ícone quando o texto não couber.
5. **Largura máxima:** nenhuma. Funciona de 390 px a telão; a partir de 1920 px cresce em proporção
   (seção 6).
6. **Quique de quem chega:** como recomendado, só no Ponto da pessoa.
