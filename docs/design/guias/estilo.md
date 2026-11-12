# Guia do estilo próprio do VIO (v1)

> Guia de produção, fase 2 → 3 do [plano](plano.md) (#227). **Em aberto até o aval do usuário.** Depois
> dele vêm as 5–7 variações; o que for decidido nelas sobe para o [brandbook](../brandbook/README.md)
> na fase 3. Base: comentários do usuário nas pranchas da fase 2 (12 nov 2026,
> [canvas](https://claude.ai/artifact/1fpNgRHfZ9Zbsteh2EJtH5)), o roteiro de espaços do Roteirista,
> [`movimento-ponto.md`](movimento-ponto.md) e [`../transicoes.md`](../transicoes.md).

**Como ler.** As regras numeradas valem para todas as variações. O que está marcado **(variar)** é
eixo de exploração: cada variação escolhe um valor, e nenhuma junta todos. **(sugestão)** é proposta
do Design ainda não pedida pelo usuário. As perguntas para o usuário estão no fim.

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

O ponto do logo tem raio de **27 %** do lado (6/22). É a medida-mãe:

| Peça                          | Tamanho       | Raio                                 | Origem                   |
| ----------------------------- | ------------- | ------------------------------------ | ------------------------ |
| Ponto, pessoa, sala (avatar)  | 16–64 px      | **27 %** do lado                     | logo                     |
| Botão só ícone                | 40 (44 toque) | **11 px** (12 no toque)              | é um Ponto               |
| Botão com texto               | 40 / 48 px    | **11 / 13 px**                       | 5A                       |
| Campo, chip, item de menu     | 32 px         | **9 px**                             | 27 % da altura           |
| Balão                         | ≥ 36 px       | **12 px**, um canto apontado de 3 px | Ponto esticado (ver 4.1) |
| Peça (widget, painel, cartão) | qualquer      | **16 px**                            | teto                     |
| Palco                         | —             | **16 px** ou 0 em tela cheia         | encaixa nas peças        |

- **Teto de 16 px.** Peça grande não ganha raio grande: é isso que fazia o 5B parecer "balãozão".
- **Raios concêntricos.** Peça dentro de peça: raio de dentro = raio de fora − folga (16 − 8 = 8,
  mínimo 4). É a regra que faz as quinas encaixarem.
- **Pílula (999 px) só até 24 px de altura** (selo, contagem). Acima disso, raio da tabela.
- **Raio 0** só em linha da grade, divisória e no palco em tela cheia.

### 2.2 O que é redondo, o que é geométrico

| Família        | Forma                                               | Usos                                                              |
| -------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| **Ponto**      | quadrado com raio de 27 %                           | Ponto da marca, pessoa, sala, botão de ícone, alça de arrastar    |
| **Barra**      | Ponto esticado num eixo, mesmo raio absoluto        | barra de tempo, progresso, volume, divisor de peças               |
| **Placa**      | Ponto esticado nos dois eixos, raio da tabela       | balão, peça, campo, botão com texto                               |
| **Contorno**   | traço de 2 px seguindo o Ponto                      | anel de fala, seleção, foco, "lugar vago"                         |
| **Corte** (5A) | quarto ou metade do Ponto (um canto arredondado só) | ilustração, textura, canto apontado do balão, encaixe entre peças |

- **Círculo perfeito não entra** como peça (fica só dentro dos ícones `lucide-react`). As bolinhas de
  pessoa do 5A viram Pontos.
- **Toda forma tem papel** (princípio 5A): Ponto é alguém ou algum lugar, Barra é quantidade ou tempo,
  Placa guarda conteúdo, Contorno é estado, Corte é ilustração. Um Ponto parado sem papel é proibido
  (o "ponto solto" do 5A).
- **Estado no texto, não no Ponto da sala.** Sala trancada mostra o cadeado no texto ("Trancada"),
  nunca por cima do Ponto da sala (5A).
- **Ícones:** `lucide-react`, 2 px, 16/20/24, sempre centrados opticamente no Ponto ou na linha de
  texto, nunca "flutuando" fora da linha de base (3A).

## 3. Cor

### 3.1 Base

Tema Noite. Texto `#F3F3FB`; texto secundário `#A3A5BC`; anil da marca `#2727F5`; destaque
`#A6A9FF`; perigo `#FF8A96`. O anil sobre Noite dá **2,50:1**: só em área grande ou atrás de ícone
claro, nunca como texto, ícone fino ou contorno sozinho.

### 3.2 Paleta derivada da cor pessoal (3A)

Cada cor pessoal (as 8 de `src/shared/colors.ts`) gera a mesma escala, em OKLCH, mantendo o matiz e
fixando luminosidade e croma. A paleta **Anil** é a da marca e da sala; as outras tingem o que vem da
pessoa.

| Tom               | L (OKLCH) | C     | Uso                                       |
| ----------------- | --------- | ----- | ----------------------------------------- |
| `chao`            | 0,16      | 0,025 | fundo da tela                             |
| `peca`            | 0,205     | 0,035 | balão, peça, campo                        |
| `pecaAlta`        | 0,25      | 0,045 | hover, peça sobre peça                    |
| `contorno`        | 0,55      | 0,07  | borda de controle, seleção fraca          |
| `recipiente`      | 0,33      | 0,10  | botão ligado, item escolhido              |
| `sobreRecipiente` | 0,88      | 0,06  | texto e ícone sobre `recipiente`          |
| `destaque`        | 0,80      | 0,11  | ícone ativo, barra de tempo, anel de fala |
| `textoSuave`      | 0,80      | 0,025 | texto secundário sobre a peça             |

Valores da paleta Anil: `chao #090D18`, `peca #101627`, `pecaAlta #182037`, `contorno #60709B`,
`recipiente #203068`, `sobreRecipiente #C7D7FE`, `destaque #A3BCFE`, `textoSuave #B7BECE`.

**Contraste medido nas 8 cores** (pior caso entre elas): texto sobre `peca` 16,0:1 · `textoSuave`
sobre `peca` 9,6:1 · `sobreRecipiente` sobre `recipiente` 8,4:1 · `destaque` sobre `chao` 9,9:1 ·
`contorno` sobre `peca` 3,6:1. Tudo passa no AA (texto 4,5:1, controle 3:1). O cálculo fica junto da
spec na fase 3 e vira teste dos tokens na fase 4.

Regras:

- **A cor pura da pessoa só no Ponto dela** (avatar, ponto ao lado do nome, ponto de quem transmite).
  Em área grande usa-se o tom `destaque` ou `recipiente`, nunca a cor pura: é o que corrige o
  amarelo forte do 3A.
- **Fundo atrás do Ponto:** o Ponto pousa direto no `chao` ou na `peca`. Sem halo ou faixa colorida
  atrás dele em repouso (a "cor atrás do ponto" do 3A); halo só como gesto (5.3).
- **Botão principal:** fundo `recipiente` com texto `sobreRecipiente`, ou o anil cheio com ícone
  branco (7,1:1). **Nunca botão branco em fundo escuro** (4A).
- **Sem cor de estado nova.** Verde e amarelo existem só como cor de pessoa. Aviso usa o tom
  `destaque` da sala com ícone e texto; perigo usa `#FF8A96` com ícone. O "ao vivo" hoje é
  `#4CDDC3`: ver pergunta 3.
- Estado nunca só por cor: sempre ícone, texto ou forma junto.

## 4. Balões e peças

### 4.1 O balão (5B, corrigido)

O balão é **um Ponto que esticou, mudou de cor e aponta para a origem**.

- Placa de raio 12 px com **um canto apontado** (raio 3 px) virado para quem o gerou: o botão, a
  pessoa, o canto da tela. **(variar)** canto apontado ou bico curto em Corte (6 px).
- Pequeno: até 320 px de largura e 3 linhas. Passou disso, não é balão, é peça.
- Cor: `peca` da paleta de quem gerou (aviso de Mari bater na porta = paleta de Mari); da sala, Anil.
- Dica, nome de botão de ícone (q09), aviso e menu são todos balões.

### 4.2 Balões de canto na sala

- **Separados, nos cantos**, no lugar de um cabeçalho cheio: por exemplo, sala (Ponto da sala, nome,
  código) num canto e conexão e pessoas no outro. Conteúdo exato fica para as variações.
- **No máximo 5 visíveis** ao mesmo tempo, contando a barra de controles.
- **Somem quando ninguém mexe**: 3 s com mouse, 4 s no toque; na primeira vez na sala ou numa tela
  nova demoram mais (q11). Voltam ao mover o mouse ou tocar. **(sugestão)** fixar com o botão
  direito.
- Nunca cobrem o vídeo de forma a bloquear o toque nele; ficam a 16 px da borda, alinhados à grade.
- Sobre vídeo: fundo `peca` com 88 % de opacidade, **sem blur** (custo e regra 2 do Ponto). Mesmo
  sobre vídeo branco, o texto fica em 11,6:1 e o `textoSuave` em 6,9:1.
- Teclado: todos alcançáveis em ordem lógica; ao receber foco, reaparecem.

### 4.3 Peças (widget, painel, palco)

- Peças **encaixam** numa grade de 8 px com folga fixa de 8 px entre elas (Bento, peso menor):
  as bordas se alinham e os raios se respondem (2.1).
- Uma peça grande **não é balão**: sem canto apontado, raio máximo de 16 px, sem sombra.
- Sem sombra em geral; elevação é tom (`peca` → `pecaAlta`).

### 4.4 Botões

- **Só ícone por padrão** (3A), quadrado de Ponto de 40 px (44 no toque), com nome em balão no
  hover e no foco (q09) e `aria-label`. Texto só na ação principal da tela.
- **Um controle por intenção.** Duas variantes da mesma ação (as duas telas cheias do 3A) viram um
  botão só, com a outra no menu do botão direito ou em toque longo.
- **Nenhum controle some com o estilo.** Foco único, layout, tela cheia, convidar: todos os do
  [inventário](inventario.md) aparecem em toda variação de sala (o Foco único sumiu no 3A).
- **(sugestão, do 5A)** Criar sala pode virar **o próprio Ponto**: um Ponto anil de 56 px com ícone
  "+", nome em balão, que ao clicar viaja e cresce até virar a sala. Ver pergunta 4.

### 4.5 Tempo que encolhe (4A)

Tudo o que tem prazo (votação, cronômetro, convite, pedido de entrada) mostra uma **Barra** de 4 px
que encolhe com `scaleX`, ao lado do ícone de relógio e do tempo em IBM Plex Mono. Mesma peça em
todo lugar.

## 5. Grade e fundos

### 5.1 A grade (1B)

- Grade de **32 px**, linha de 2 px um tom acima do `chao` (na Noite, `#131426`). Decorativa: não
  precisa de contraste, e nunca carrega informação.
- **(variar)** linha contínua, só as interseções (textura de pontos, do Roteirista) ou interseções
  em Pontos de 3 px.
- Fica no Início, na porta, nos vazios e atrás das peças da sala; **nunca atrás do palco** nem
  dentro de área de leitura.

### 5.2 Padrões infinitos que reagem ao mouse

- Sutis: os Pontos da grade perto do cursor (raio de ~120 px) crescem até 1,6× e clareiam um tom;
  voltam em 600 ms. Só `transform` e `opacity`.
- Pausam com Reduzir movimento, com a aba escondida e **na sala enquanto alguém transmite** (não
  gastar a máquina de quem envia). Ficam estáticos, ainda visíveis.
- **(variar)** reagir ao cursor, deriva lenta contínua (um ciclo ≥ 20 s) ou estático.

### 5.3 Os três gestos do Ponto (vocabulário que se repete)

| Gesto              | Forma                            | Onde                                            |
| ------------------ | -------------------------------- | ----------------------------------------------- |
| Ponto + **anel**   | Contorno que acompanha a voz     | fala (lê o estado de voz, não cria análise)     |
| Ponto + **halo**   | Contorno que se afasta e esmaece | convidar, alguém bateu na porta, chamar atenção |
| Ponto + **órbita** | Pontos menores girando em volta  | carregando, conectando, reconectando            |

Os mesmos três em botão, balão, ilustração e carregamento. Nada de quarto gesto sem pedido.

### 5.4 Ilustrações

- Feitas só das famílias da 2.2, traço de 2 px e as cores da paleta (Cortes do 5A, compostos).
- **Paradas e assentadas**: formas encaixadas na grade, não caindo nem quicando (o 5B ficou
  infantil). Se mexem, mexem pouco e por motivo (respirar, reagir ao cursor).
- Uma família só, repetida: vazio da sala, sem recentes, microfone negado, reconectando, porta.

## 6. Densidade e espaço

- Base de 8 px; 4 px como meio passo. Texto: no máximo 3 tamanhos e 2 pesos por peça.
- Alvos de 40 px no mouse e 44 px no toque.
- **Usar o espaço.** Início: criar e entrar continuam no centro; ao redor, perfil e salas juntos
  (3A) e as peças que o Roteirista propôs, em segundo plano. O que sobra recebe grade e ilustração,
  não vazio.
- **Largura máxima.** Início e páginas: conteúdo em até **1200 px**, centrado; a grade continua até
  a borda. Sala: área de trabalho em até **1920 px**; os balões de canto acompanham essa área, não a
  borda do monitor; em tela cheia o palco ocupa tudo. Ver pergunta 5.
- Celular (390 px): balões viram uma linha no topo e uma embaixo; nada de rolagem lateral.

## 7. Movimento

Vale [`transicoes.md`](../transicoes.md) e as cinco regras de
[`movimento-ponto.md`](movimento-ponto.md#1-as-cinco-regras-as-únicas-inegociáveis): o Ponto
conduz, só `transform`/`opacity` no caminho principal, origem e destino medidos (FLIP), ≤ 800 ms,
interrompível, curva `--ease-ponto` `cubic-bezier(.2,.7,.2,1)`.

- **Ponto branco que fica azul ao viajar (3A).** Em repouso dentro de um botão ou peça, o Ponto é
  `#F3F3FB`; quando sai em viagem, ganha o anil e, ao pousar, volta ao tom do lugar. É uma troca de
  cor junto com movimento, como pede o [brandbook](../brandbook/ponto.md#cor). O ponto do logo segue
  sempre anil.
- **Balões nascem do Ponto**: o Ponto que conduz se estica até a placa do balão a partir do canto
  apontado e volta a ser Ponto ao sumir.
- **Molas só no Ponto e nos gestos**, nunca no conteúdo do palco nem em lista.
- **A bola do 5A**: cada variação mostra o Ponto do Início parado, respirando e viajando, em quadros
  ou protótipo.

### 7.1 Dica e menu, sem a viagem do Ponto (q22)

A viagem leva 400 ms ou mais; numa dica que abre a cada passada do mouse, isso cansa. Proposta
**"desdobrar"**:

- A dica nasce **no canto apontado**, como um Ponto de 6 px que se desdobra: `scaleX` de 0,1 a 1 em
  90 ms, depois `scaleY` de 0,4 a 1 em 60 ms, `transform-origin` no canto apontado, opacidade de 0 a
  1 nos primeiros 60 ms. Total de **150 ms**, sem quique.
- Fecha ao contrário em **80 ms**, só opacidade e um encolher curto para o canto.
- **Sem repetição cansativa:** se outra dica abre até 300 ms depois de uma fechar, ela aparece direto,
  sem desdobrar (padrão de grupo de dicas). Atraso para abrir: 400 ms na primeira, 0 nas seguintes.
- Menu: a placa desdobra igual (180 ms) e os itens aparecem juntos, sem cascata.
- Reduzir movimento: só opacidade, 100 ms.

## 8. Proibido

- Forma: quina reta em peça (tudo quadrado, 2A); pílula ou raio acima de 16 px em peça grande;
  tudo parecer balão (5B); círculo como pessoa ou sala; raios que não encaixam.
- Ponto solto, sem papel; cadeado ou outro selo por cima do Ponto da sala.
- Cor: verde ou outra cor de estado fora da paleta; cor pura da pessoa em área grande; botão branco
  em fundo escuro; anil como texto ou ícone fino sobre Noite; cor atrás do Ponto em repouso.
- Formas caindo, quicando ou espalhadas no Início; ilustração que não seja da família do Ponto.
- O código da sala desenhado em peças (5B): ele é sempre texto em IBM Plex Mono.
- Espaço sem uso; cabeçalho gigante; duas versões do mesmo controle lado a lado; controle sumido.
- Blur ou `backdrop-filter` sobre vídeo; grade ou padrão atrás do palco; padrão animado durante a
  transmissão.
- Juntar tudo o que o usuário gostou numa tela só: cada variação escolhe poucos eixos.
- Botão de mods ou plugins: é coisa futura e não vira botão (sem botão morto).

## 9. Eixos para as 5–7 variações

Cada variação escolhe um valor por eixo e diz qual. Não são telas novas de conteúdo; o conteúdo vem
do Roteirista.

| Eixo             | Valores                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Base dominante   | 3A tonal · 5A geométrico · mistura com peso maior num dos dois                                                   |
| Posição da sala  | balões nos 4 cantos · coluna de peças numa borda · Ponto da sala como âncora central de um menu radial em Pontos |
| Fundo            | grade de linhas · textura de pontos · pontos que reagem                                                          |
| Canto do balão   | canto apontado · bico em Corte                                                                                   |
| Cor da interface | só Anil · peças da pessoa na cor dela · interface na cor de quem a usa (pergunta 1)                              |
| Botão principal  | placa com texto · o próprio Ponto (pergunta 4)                                                                   |

## Perguntas para o usuário

1. **Cor pessoal até onde?** Só no que vem de cada pessoa (aviso, ponto, transmissão), ou também
   pode tingir a interface inteira de quem a usa (Início e balões na sua cor), como opção?
2. **Ponto branco em repouso:** vale só dentro de botão e peça, com o logo sempre anil, como acima?
3. **"Ao vivo" em `#4CDDC3`** é uma cor de estado fora da paleta. Trocar pela cor de quem transmite,
   com o halo, ou manter?
4. **Criar sala como o próprio Ponto**, sem texto visível (nome em balão e `aria-label`): testar nas
   variações?
5. **Largura máxima:** 1200 px no Início e 1920 px na sala servem para o seu monitor?
