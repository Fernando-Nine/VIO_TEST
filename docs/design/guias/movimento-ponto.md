# O Ponto — guia de exploração (v3)

> Guia de produção do Ponto e do movimento. O que já está decidido sobre o Ponto vai para
> [`../brandbook/ponto.md`](../brandbook/ponto.md); a ordem do trabalho está em [`plano.md`](plano.md).

Roteirista · 2026-11-07 · guia aprovado; estilos pendentes de escolha · ajustado em 2026-11-08 (decisões 020 e 021) · base: #261, `docs/design/transicoes.md`, `landing.md`, `inicio.md`,
`sala-trancada.md`, `cameras.md`, `docs/ideias/2026-10-28-roteiro.md`, `2026-10-28-assets.md`,
`docs/decisoes/002-leva-5-e-movimento.md`, `src/client/components/motion.ts`.
Estende a escolha A da #261; não a rediscute.

**Como ler este guia.** Ele existe para abrir portas, não para fechar. Só a seção 1 (cinco regras)
é obrigatória. **Todo o resto é exemplo, semente ou pergunta**: o Design pode ignorar, trocar,
misturar ou inventar melhor. Se uma ideia daqui parecer errada ao ser testada em tamanho real,
descarte-a e diga por quê. Rascunho que só repete os exemplos é rascunho tímido.

Decisões já tomadas pelo usuário (valem como base, não como limite de ideias):

- Forma: o Ponto **nunca vira círculo como estado**. A **base e o repouso são o quadrado
  arredondado**. Transformar-se em botão, widget ou barra é permitido como transição; depois ele
  volta a ser ponto, ou o ponto continua em algum lugar. Escala por eixo (squash and stretch) não
  conta como outra forma.
- Cor: **azul quase sempre**; muda só em raras ocasiões (a lista aberta está na seção 6).
- Traço: **depende**. Às vezes desenha linhas da interface que **ficam** (bordas, divisórias,
  contornos de widget); em outros casos o traço some.
- Tela cheia de transmissão: **ponto pequeno, de baixa opacidade, no canto, na cor da pessoa que
  compartilha a tela**. O resto é teste do Design (seção 5).
- Indicador de fala com câmera ligada: **em aberto, o Design explora** (seção 7).

---

## 1. As cinco regras (as únicas inegociáveis)

1. **Presença.** Há dois tipos de ponto. O **Ponto da marca é um só e contínuo**: o próprio
   viajante, que nunca some no meio do caminho (sem sumir e reaparecer, sem cortar) e não deixa um
   ponto "esperando" no destino, porque isso o duplicaria. Os **pontos de pessoa** podem ser vários
   ("o VIO é o ponto, e as pessoas também"); pontos parados que representam pessoas, ou que guardam
   o lugar delas, são deste segundo tipo. O Ponto da marca só se multiplica quando a multiplicação
   é a intenção (contagem, carregamento). A regra da tela é só: **há ponto**; nenhuma tela
   principal fica sem.
2. **Animação completa (decisão 020).** `transform`/`opacity` são o caminho barato, não um limite:
   `stroke-dashoffset`, `clip-path`, troca de `background-color` e outros efeitos entram sem aval,
   com o custo anotado. Evite blur/`backdrop-filter` e efeito de ambiente sobre vídeo (custo alto); se usar, o modo reduzido desliga. `will-change` só durante
   o movimento. O modo reduzido (regra 5) é o interruptor para PC fraco ou internet ruim.
3. **Mídia intocada.** Nunca reparentar host de vídeo, clonar vídeo, recriar player, tirar o
   `<audio>` do `RemoteVoice` nem mexer em PeerConnection/MediaStream. O indicador de voz continua
   lendo o estado do `<audio>`; a animação só desenha esse estado. O Ponto lê o estado de voz e
   **nunca cria captura, analisador ou outra mudança no `<audio>`**. Palco e vídeo reais não mudam
   de tamanho nem de pai: quem "cresce até o palco" é um **painel decorativo** (`aria-hidden`,
   `position: fixed`, `pointer-events: none`) que cresce com `scale` e contra-escala, ou com dois
   elementos, nunca com `width`/`height`. Ele **nunca é pai do vídeo ou do `<audio>` e nunca fica
   sobre eles**. As linhas permanentes desenhadas pelo Ponto são elementos próprios, nunca pais dos
   hosts de vídeo. Se desfaz quando a sala real já está no lugar.
4. **Interrompível e redirecionável.** Se a pessoa age no meio de uma animação, o Ponto **muda de
   rumo a partir de onde está** (mola, sem salto, sem teletransporte) e a ação vale imediatamente.
   Nenhuma animação bloqueia ou adia o que a pessoa fez.
5. **Reduzir movimento** (`prefers-reduced-motion` ou Ajustes › Acessibilidade › Reduzir movimento): tudo vira
   esmaecimento curto, o Ponto aparece no lugar final, e o que é loop vira **estado estático que
   ainda comunica** (seção 8). Uma só fonte de verdade: o que `reducedMotion()` de `motion.ts` já
   resolve; o CSS usa o mesmo atributo `data-motion="reduce"`.

Duas âncoras mais leves, que o Design pode tensionar com justificativa: o movimento **sempre leva
de um lugar a outro** (regra de movimento da `CLAUDE.md`, "Convenções"; origem e destino medidos no
layout real, FLIP), e **cor e movimento/tamanho carregam sentido, nunca só a cor**.

---

## 2. Quem é o Ponto

O Ponto é um quadrado arredondado e é quase um amiguinho. Não é um ícone que se mexe: é um ser
vivo pequeno que **guia e acompanha** a pessoa. Anda junto com ela pelas telas, desenha o que ela
vai precisar e se transforma nisso. **O VIO é o ponto, e as pessoas também.** Cada pessoa na sala é
um ponto na sua cor, parente do Ponto da marca.

**Dividir e juntar é a ação principal do Ponto.** É assim que ele "desenha" a interface: quando
alguém entra, o Ponto se **divide** na pessoa; quando alguém abre um widget, ele se divide no
widget; ao fechar o widget ou quando a pessoa sai, ele se **junta** de volta. A interface nasce
e some dessas divisões; o resto do vocabulário abaixo gira em torno disso.

Personalidade em traços largos (como ele _é_, não o que ele _faz_ em cada caso):

- **Atento, nunca invasivo.** Percebe a pessoa, vem perto quando ela precisa, se afasta quando ela
  está concentrada. Durante o vídeo, é discreto.
- **Curioso.** Olha para o que é novo: um widget que abriu, alguém que chegou, um botão que o
  cursor demorou a escolher. Pode inclinar-se, chegar mais perto, espiar.
- **Paciente.** Espera sem cobrar. A espera dele é respirar, não piscar de impaciência.
- **Caloroso.** Comemora pequeno e de verdade (uma sala criada, um convite copiado, a primeira
  pessoa que entra). Nunca festa de confete.
- **Cansa e dorme.** Se ninguém mexe, vai ficando mais lento e, depois, dorme. Acorda com
  gentileza quando a pessoa volta, sem susto.
- **Tem peso.** É um objeto físico leve: acelera, desacelera, quica, assenta. Não flutua sem
  massa nem se move em linha de computador.
- **Acompanha, não decora.** Cada movimento tem motivo (leva, mostra, segura, desenha, reage).
  Sem origem nem destino nem motivo, ele fica parado, e parar também é caráter.

O que se espera dele, sem fixar o _como_: reagir quando algo acontece, esperar quando nada
acontece, se animar quando algo bom acontece, ficar curioso com o novo, se cansar com o tempo e
comemorar o que a pessoa conseguiu. Como cada um disso aparece é pergunta para o Design.

---

## 3. Vocabulário de exemplos

> **Tudo abaixo é exemplo.** São sementes para testar, combinar e superar. A maioria usa só
> `transform`/`opacity`; o que custa mais (paint, layout) está marcado, mas é permitido.

### 3.1 Andar e deslocar

- **Voar de A a B** por curva, pousando exato (o básico, a viagem FLIP).
- **Orbitar:** voar em círculo ao redor de um elemento (um botão que espera, um widget novo, a
  pessoa que acabou de entrar) e ir fechando até pousar.
- **Rolar como um dado:** "caminha" girando de 45° em 45°. Em pé sobre a ponta (losango), cai para
  o lado seguinte, assenta, repete. Cada queda é um passo, com peso. Serve para trajetos curtos e
  para o ar de "estou indo com você".
- **Pulinhos:** vai por saltos curtos, cada um com agachar, impulso e pouso (squash and stretch).
- **Deslizar com inércia:** sai rápido, freia como se tivesse atrito, para sem mola exagerada.
- **Seguir o cursor de longe:** um pouco atrás, com atraso, como quem acompanha. Quando o cursor
  para, ele chega e se acomoda perto.
- **Puxar a pessoa até o botão certo:** vai na frente, para no botão, volta o olhar para a pessoa
  (um leve inclinar) e espera.
- **Esquivar:** sai da frente do que a pessoa vai clicar ou digitar.
- **Atravessar a tela inteira** só quando a viagem é a história (landing, abertura).

### 3.2 Esticar, comprimir, girar

- **Squash and stretch:** estica na saída e na queda, achata no pouso, e volta. Escala em eixos
  separados (atenção ao arredondamento do canto, que acompanha o `scale`; o Design decide se isso
  é desejável ou se usa dois elementos).
- **Quicar** ao pousar, ao ser tocado, ao receber uma boa notícia.
- **Balançar** de um lado a outro (espera, dúvida, "não é por aqui").
- **Girar sobre si:** meia volta ou volta inteira para chamar atenção ou comemorar.
- **Inclinar-se** na direção de algo (curiosidade) ou para longe (timidez).
- **Tremer** levemente em erro ou frio, sem virar susto.

### 3.3 Esperar, descansar, dormir

- **Respirar:** pulso lento de escala/opacidade. Ritmo diferente por tipo de espera.
- **Olhar em volta:** pequenos deslocamentos e inclinações enquanto espera.
- **Cochilar:** encolhe um pouco, desacelera, fica opaco; acorda com um "esticar".
- **Dormir** de verdade se a sala fica vazia ou a pessoa fica um tempo sem mexer, e **acordar** ao
  primeiro movimento.
- **Bocejar:** esticar vertical seguido de relaxar, antes de dormir.
- **Segurar o lugar** de quem saiu: fica parado onde a pessoa estava, em volta, esperando que ela
  volte, e se junta de novo se ela voltar.
- **Esconder-se e espiar:** passa por trás de um widget (nunca do `<video>`) e espia, curioso com
  algo que acontece.

### 3.4 Desenhar e construir

- **Desenhar as linhas da interface**, que **ficam**: borda de uma região, divisória entre
  rodapé e palco, contorno de um widget ao abrir. O Ponto anda e, onde passou, a linha fica
  permanente. (Retas com `scaleX`/`scaleY`; curvas e contornos fechados usam `stroke-dashoffset`, que custa mais mas é permitido.)
- **Desenhar a moldura do widget ao abrir:** o Ponto circula o espaço onde o widget vai ficar,
  deixando o contorno, e o widget nasce dentro. _(`stroke-dashoffset` ou barras.)_
- **Desenhar e apagar:** traço de pensamento que some (rastro curto, uma seta que aponta, um
  sublinhado de ênfase) e **outro tipo de traço que fica**; a pessoa percebe a diferença pelo
  contexto.
- **Construir a interface:** na primeira entrada, o Ponto monta devagar o rodapé, o cabeçalho e o
  palco, como quem arruma a casa.
- **Montar um botão** a partir de si: vira o botão, volta a ser ponto quando o botão some.
- **Dividir-se no widget:** o Ponto se divide e uma parte vira o título do widget; ao fechar, o widget se junta de volta ao Ponto.

### 3.5 Muitos pontos

- **Dividir** (um vira vários) e **juntar** (vários viram um) é a ação principal (seção 2): a
  pessoa que entra é um ponto que se divide do Ponto da sala; o widget que abre se divide do Ponto
  e, ao fechar, ele se junta de volta; abertura das funções da landing.
- **Empilhar** pontos para formar contagem (quantas pessoas, quantos votos) ou barra de
  carregamento, cada um no seu lugar.
- **Formação:** pontos se organizam em fileira, em grade ou em círculo ao redor de um centro
  (sorteio, roleta, enquete).
- **Revezar:** o Ponto da marca "passa a vez" a um ponto de pessoa e volta.
- **Contágio:** quando alguém começa a falar ou a compartilhar, os outros pontos se viram para
  ele, sem sair do lugar.
- **Fila de pontos** que vem de longe e entra um a um (muita gente entrando, sem virar barulho).

### 3.6 Reagir à sala e às pessoas

- **Dançar com a voz:** o tamanho, o giro ou a inclinação acompanham a fala (o dado vem do
  `<audio>`).
- **Dançar com a música:** quando há som compartilhado, balança no ritmo, com pouco, nunca
  distraindo do vídeo.
- **Aplaudir:** vários pontos saltam juntos (um momento bom da sala).
- **Cumprimentar:** vira para quem entrou, balança de leve.
- **Despedir:** acena com um balanço e se afasta do ponto de quem saiu.
- **Reação a erro:** recua, treme, fica parado em cor de aviso. Nunca dramático.
- **Reagir ao que ninguém vê:** um evento do servidor (tela começou, sala cheia) vira reação do
  ponto, sem texto explicando.

### 3.7 Estados de rede e tempo

- **Carregar:** três pontos acendem em sequência, ou rolam como dados em fila, ou um ponto
  explora e os outros o seguem.
- **Reconectando:** o ponto fica "procurando", inclinado, em pequenas buscas, até achar o sinal.
- **Contar:** um ponto que gira de 45° em 45° e cada passo é um segundo (convite expira, tempo
  de pausa).
- **Esperar resposta:** o ponto vai até a porta e espera. Quando chega a resposta, volta com ela.

### 3.8 Cor (raras ocasiões)

O Ponto é azul quase sempre. Possíveis ocasiões para mudar, a decidir pelo Design: tom de
pessoa (o ponto da pessoa que fala, a cor de quem compartilha), um aviso real (erro, volume acima
de 100%), um momento de celebração curto. A cor muda _junto_ com algum movimento ou tamanho, nunca
só a cor.

---

## 4. Estilos de design

O Ponto tem **uma personalidade só** (seção 2). O que varia é o **estilo de design** em que ela é
desenhada e movida. Cinco estilos para o Design testar coisas realmente diferentes. A exploração de
estilo da fase 2 ([`plano.md`](plano.md)) usa **5 estilos × 2 amostras em telas reais** (pedido do
usuário, 9 nov; vale no lugar dos 5 exemplos da decisão 021 para esta exploração). O usuário pode
trocar qualquer um deles.

1. **Neo-brutalista (ousada).** Bordas grossas, sombras duras, cores chapadas, o Ponto como
   protagonista. Viagens grandes, aceleração forte, freada firme. _Pergunta:_ até onde ser ousado
   sem cansar quem usa todo dia?
2. **Editorial / Swiss tipográfico (minimalista).** Grade rígida, tipografia como estrutura,
   muito espaço. O Ponto quase não faz nada e cada gesto pesa. _Pergunta:_ qual é o menor
   movimento que ainda é uma personalidade?
3. **Expressivo com spring (brincalhona).** Material 3 Expressive / claymorphism: formas macias,
   molas com sobra, squash and stretch, quiques, rolar como dado. _Pergunta:_ onde a graça ajuda e
   onde atrapalha o filme que está passando?
4. **Bento modular (moderna).** Blocos em grade, cada função no seu módulo, transições precisas e
   limpas. _Pergunta:_ o que torna isto inconfundivelmente VIO e não "mais um app bonito"?
5. **Geométrico lúdico.** Formas chapadas e limpas derivadas do próprio Ponto (quadrados
   arredondados, círculos), cor sólida, sem textura nem traço tremido; divertido, mas profissional.
   Entra no lugar do "desenhado à mão" (9 nov), que já tinha substituído o Glass (vidro fosco,
   cortado porque blur sobre vídeo pesa). _Pergunta:_ quanto brincar com as formas do Ponto sem
   virar enfeite?

Pistas para escolher: o estilo vencedor pode ser diferente por contexto (brincalhão na landing,
minimalista dentro da sala com vídeo). Misturas são bem-vindas se forem coerentes.

---

## 5. Telas principais e onde o Ponto descansa

_(Mantido da v2.)_ Tela principal = a superfície onde a pessoa está agora, uma por vez. Não
contam modais, menus, balões e a janela flutuante (PiP). O ponto de repouso é onde ele "mora" na
tela; **pelo menos um ponto visível** sempre (regra 1). A coluna é o ponto de partida; o Design
pode trocar o lugar se achar melhor.

| Tela principal                   | Onde o Ponto descansa (ponto de partida)                                  |
| -------------------------------- | ------------------------------------------------------------------------- |
| Landing                          | Ponto final de "junto."                                                   |
| Início (abertura, Criar, Entrar) | Ponto do botão Criar sala                                                 |
| Recentes                         | Ponto do título da página                                                 |
| Ajustes                          | Ponto do título da página                                                 |
| Sala (cabeçalho, palco, rodapé)  | Ponto antes do código da sala; selo Ao vivo se há tela                    |
| Sala trancada                    | Ponto central no quadrado de 120 px                                       |
| Sala cheia                       | Ponto central parado                                                      |
| Pedido recusado                  | Ponto central parado; ao tocar Voltar, vai até o botão Criar do Início    |
| Erro (Fault)                     | Ponto parado junto ao título, na cor do aviso                             |
| Reconectando (dentro da sala)    | Ponto do código vira Carregar no cabeçalho; sala segue visível            |
| Carregando o app / conectando    | Ponto no centro                                                           |
| Tela cheia de transmissão        | **Decidido:** ponto sutil no canto, **na cor de quem compartilha a tela** |

Sobre a tela cheia, o fixo é: ponto pequeno, de baixa opacidade, no canto, na cor de quem
compartilha. **Teste do Design:** respiração (existe? quão lenta?), qual canto, contraste sobre
vídeo claro, e o que acontece se quem compartilha mudar (a cor troca? ele viaja até a nova
pessoa?).

---

## 6. Onde ele pode aparecer

Mapa de momentos do app. Cada linha traz **perguntas abertas**, não respostas. Para cada uma,
vale testar mais de uma resposta.

| Momento                                          | Perguntas para o Design                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Abertura do Início                               | Como o Ponto "acorda" a casa? Ele acende, constrói, anda até o lugar dele?                              |
| Landing: rolar entre telas                       | O Ponto acompanha a rolagem ou guia? Desenha a linha que desce entre as seções e deixa ela ali?         |
| Landing → Início                                 | Qual é a viagem que conta "você chegou"? Ele leva a pessoa até o botão Criar?                           |
| Início → Sala (Criar/Entrar)                     | Como o Ponto vira o palco sem mexer no palco real? Painel decorativo, moldura desenhada, outra ideia?   |
| Sala trancada: pedindo                           | Como é esperar com o Ponto? Ele vai até a porta? Respira? Olha em volta?                                |
| Aprovado / Recusado                              | O que muda no jeito de ele se mexer? Como comemora, como acolhe um "não" sem drama?                     |
| Sala → Início (Sair)                             | Como o Ponto se despede da sala e volta ao botão que o trouxe?                                          |
| Trocar de página                                 | Ele acompanha a pessoa de item em item? Rola como dado? Desenha a linha de aba que fica?                |
| Abrir widget                                     | O Ponto desenha a moldura, nasce no título, espia por trás? Como cada widget tem sua personalidade?     |
| Fechar widget                                    | O widget se desfaz no Ponto, o Ponto volta ao botão, ou ele fica segurando o lugar?                     |
| Mudar o conjunto da tela                         | O Ponto "arruma" a casa de novo? Como mostrar que o layout mudou sem tocar no vídeo?                    |
| Pessoa entra / sai                               | Ponto da pessoa nasce do Ponto da sala? Como se despede? E em rajada, sem virar barulho?                |
| Tela começa / termina                            | O Ponto leva a pessoa ao selo Ao vivo? Fora do palco? Como a cor de quem compartilha entra na história? |
| Fala                                             | Tamanho, giro, inclinação, dança? Qual é a fala sutil e qual é a fala em destaque?                      |
| Mudo                                             | Como o Ponto "cala" sem virar outra forma (a forma é sempre quadrado arredondado)?                      |
| Carregando / reconectando                        | Qual é a versão que informa e não irrita? Dá para ser charmoso e curto?                                 |
| Copiar código ou convite                         | Como celebra um gesto pequeno sem virar barulho?                                                        |
| Sala vazia                                       | Ponto sozinho no palco: espera, dorme, olha em volta, convida?                                          |
| Ninguém mexe há um tempo                         | Quando o Ponto cansa e dorme? Como acorda?                                                              |
| Erro                                             | Como o Ponto reage sem dramatizar?                                                                      |
| Baixar (landing)                                 | O que o Ponto faz no momento mais "de conversão"?                                                       |
| Entre telas pequenas (celular, janela flutuante) | O que sobra do Ponto quando o espaço é pouco?                                                           |

**Sugestão de convivência:** como ponto de partida, um só loop de movimento contínuo por tela, para
não virar um monte de coisas piscando. O Design pode propor mais, justificando.

---

## 7. Perguntas deixadas para o Design explorar

Não precisam voltar ao usuário agora; entram como parte dos rascunhos.

1. **Fala com câmera ligada** (decisão do usuário: fica como teste). Candidatos: o ponto ao lado
   do nome, o contorno `#4CDDC3` de `cameras.md`, os dois, o Ponto da pessoa que "se debruça" sobre
   o canto do vídeo, algo que ninguém pensou ainda.
2. **Traço que fica × traço que some.** Qual critério distingue? Candidatos: o que é estrutura da
   interface fica, o que é gesto some; ou o que só aparece uma vez (primeira vez) fica.
3. **O que é permanente na interface desenhada pelo Ponto?** Todas as bordas, só as de widget, só
   as da landing? O desenho permanente se refaz a cada entrada na sala?
4. **Quando o Ponto muda de cor?** Lista das raras ocasiões (seção 3.8).
5. **Quanto dura a paciência dele?** Quanto tempo até cansar e dormir, e o que o acorda.

---

## 8. Reduzir movimento: o sinal estático

_(Mantido da v2.)_ A regra 5 é a regra; os valores abaixo são **valores iniciais sugeridos**. Em
Reduzir movimento nenhum loop roda e a personalidade continua legível:

- **Pedindo para entrar:** ponto cheio + o texto "Pedindo para entrar…" (sem piscar).
- **Carregando:** três pontos estáticos em escalas diferentes (um cheio, dois menores) + rótulo
  para leitor de tela (`role="status"`).
- **Dormindo / cansado:** o Ponto aparece já menor e mais opaco, sem transição de sono.
- **Qualquer viagem:** o Ponto aparece no destino com esmaecimento de ~150 ms (valor inicial); a ação da pessoa
  continua valendo imediatamente.
- **Tela cheia:** o ponto do canto na cor de quem compartilha fica parado.

---

## 9. Sugestões práticas (valores iniciais, não regras)

- **Durante o vídeo, discrição.** Sugestão: com transmissão ativa o Ponto não cruza o palco, não
  pulsa forte sobre a imagem e não deixa rastro em tela cheia. O Design pode testar variações.
- **Sem ruído.** Em rajada (muita gente entrando, fala alternando), sugestão de partida: agrupar,
  no máximo uma animação coletiva a cada ~800 ms; o restante entra sem animar.
- **Desempenho.** FLIP medido uma vez; aba oculta ou aparelho fraco pula direto ao fim; sem queda
  de quadros perceptível durante captura ou chamada (aceite humano na prévia).
- **Sem texto que explica o Ponto.** Ele comunica pelo que faz.

---

## O que entregar

Formato da leva: skill `vio-design-delivery`. Cada estilo (2 amostras em telas reais na fase 2):

- **Canvas interativo** com os momentos escolhidos da seção 6, **em tamanho real**, usando os
  tokens de cor e tamanho que já existem (curva `--ease-ponto` e tabela de "ponto que fica" em
  `docs/design/transicoes.md`; tokens globais em `src/client/styles.css` `:root` — `--blue`,
  `--blue-light`, `--live`, `--radius`, `--ease`; cores de participante em
  `src/client/components/ColorPicker.tsx`).
- **Versão com Reduzir movimento** de cada momento.
- **Nota do que foi descartado** e por quê.
- **Teste lado a lado** do indicador de fala com câmera (seção 7, item 1).
- Efeito caro (paint, layout, filtro): anote o custo e diga o que o modo reduzido faz.
- Termina com o **aval do usuário** e a etiqueta `design`; só depois vira issue de frontend.

---

## Próximos passos (Roteirista, sem implementar)

Telas, balões e pop-ups redesenhados com a linguagem do Ponto vêm **antes** das animações
(#261 em espera até a fase 5 do [`plano.md`](plano.md)). O Design entrega **5 estilos × 2 amostras em
telas reais** (seção 4; momentos da seção 6, em tamanho real e interativos, cada um com versão com
Reduzir movimento). O usuário escolhe, troca ou
mistura estilos e só então nasce o conjunto padrão que substitui a tabela de `transicoes.md` na
#261. Depois, o Frontend (Opus, raciocínio máximo) implementa um módulo reutilizável em vez de uma
animação por tela.
