# Composição, coreografia e rolagem

Núcleo de conhecimento da `motion-scene-design`. Tudo aqui é padrão quebrável: quebre com motivo.

## As cenas do VIO

Antes de compor, saiba em que tipo de lugar você está. Cada superfície tem um teto de movimento
diferente, porque o que a pessoa veio fazer é diferente.

| Superfície               | O que a pessoa faz         | Movimento                                                                   |
| ------------------------ | -------------------------- | --------------------------------------------------------------------------- |
| Landing                  | decide se entra            | pode ser rico: atmosfera, rolagem narrada, Ponto com personalidade forte    |
| Página de download       | baixa o app                | médio: guia o olho até o botão e some                                       |
| Início                   | cria ou entra numa sala    | leve: o Ponto mora no botão Criar sala, o resto fica quieto                 |
| Sala (canvas)            | assiste junto, conversa    | calmo: o vídeo é o conteúdo; movimento só para eventos (chega, sai, começa) |
| Widget                   | usa uma ferramenta da sala | funcional: abrir, fechar, feedback; nada de ambiente                        |
| Janela PiP e app Windows | assiste em janela pequena  | mínimo: mesmos tokens, menos camadas                                        |

Regra prática: **nada ambiente por cima de vídeo ao vivo**. Ambiente na sala só fora do palco (fundo
do canvas vazio, porta de espera, sala vazia) e sempre abaixo da camada de conteúdo.

## Composição e ritmo visual

- **Hierarquia do movimento.** Numa cena há um protagonista (quase sempre o Ponto), coadjuvantes
  (o conteúdo que aparece por causa dele) e cenário (ambiente). Protagonista move primeiro e mais;
  cenário move devagar e pouco. Se tudo se move igual, nada é protagonista.
- **Densidade por seção.** Dê a cada seção uma nota de densidade (0 parado · 1 detalhe · 2 vivo ·
  3 espetáculo). Uma página boa alterna: 3 no herói, 1 na explicação, 2 na prova, 0 no rodapé.
  Duas seções 3 seguidas cansam; uma página toda 1 parece morta.
- **Contraste entre zonas.** Uma zona quieta ao lado de uma viva faz a viva parecer mais viva.
  Use o silêncio como material: o espaço negativo parado é o que deixa o Ponto ser visto.
- **Ponto focal.** Em cada instante, um lugar para olhar. Se dois elementos pedem atenção ao mesmo
  tempo, atrase um deles (`--motion-delay-step`) ou baixe a energia dele.
- **Gestalt.** Coisas que se movem juntas (mesma direção, mesma curva, mesmo início) são lidas como
  um grupo — destino comum. Use isso para agrupar sem caixa: os chips de pessoas entram juntos e
  viram "as pessoas da sala".
- **Camadas de profundidade.** Fundo (`far`), meio (`mid`), conteúdo (`near`), frente (`front`).
  Quanto mais longe, mais lento, menor e mais apagado. A diferença de velocidade é o que cria a
  sensação de espaço; o tamanho da diferença é a profundidade.
- **Arco narrativo.** Uma página é uma história: abertura (o Ponto aparece), desenvolvimento (ele
  mostra as coisas), clímax (a sala cheia), resolução (o convite, quieto). Escreva o arco em uma
  frase antes de desenhar a primeira camada.

## Coreografia

| Ferramenta             | O que é                                                     | No VIO                                                       |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| Stagger                | irmãos começam em sequência, `n × --motion-stagger-step`    | chips de pessoas; itens de menu. Até 8; depois, todos juntos |
| Sequência              | fases que começam quando a anterior termina (ou quase)      | Ponto viaja → pousa → o widget cresce dali                   |
| Orquestração           | um maestro dispara tudo com uma única linha do tempo        | uma função por transição, não `setTimeout` espalhado         |
| Sobreposição           | a fase B começa antes de A terminar (≈ 60–80 % de A)        | o widget começa a crescer nos últimos 40 ms da viagem        |
| Líder e seguidores     | um elemento puxa, outros vêm atrás com atraso e menos força | o Ponto lidera; o conteúdo vem atrás                         |
| Simetria entrada/saída | a saída desfaz o caminho da entrada, mais rápida            | widget abre do Ponto e fecha para ele (`transicoes.md`)      |
| Lógica de direção      | a direção do movimento conta para onde se foi               | avançar vai para a direita/para dentro; voltar, o contrário  |
| Continuidade espacial  | o que estava num lugar não "teleporta"                      | o Ponto sempre sai de onde a pessoa clicou                   |

**Linha do tempo como diagrama.** Toda proposta de cena traz a coreografia desenhada, em ms:

```
0        120       260       420       520
|---------|---------|---------|---------|
Ponto  [==== viaja (ease-ponto) ====]
Widget                    [=== cresce do Ponto (ease-out) ===]
Fundo  [------------ escurece 4 % (linear) ------------]
```

Sequência longa demais vira espera. Teto atual do VIO: **800 ms** para a sequência inteira
(`transicoes.md`). Quebrar o teto é exceção: diga quanto, onde e por quê (ex.: primeira entrada na
landing, uma vez por visita, pulável com clique ou tecla, como o `Splash` já faz).

## Rolagem

A rolagem é sobretudo da landing e da página de download. Na sala, o canvas rola por função, não por
narrativa: lá, nada de scrollytelling.

- **Scroll-driven** (`animation-timeline: scroll()` / `view()`): a animação anda com a rolagem, no
  compositor, sem JS. Ótima para revelar seção, barra de progresso, parallax leve. Suporte varia
  por navegador: confirmar na pesquisa e prever o fallback (estado final estático).
- **ScrollTrigger (GSAP)**: quando precisa de pin, scrub com mola, callbacks, sequências longas.
  Dependência não aprovada: no rascunho pode; na spec, diga que é a escolha de produção e qual o
  plano nativo se o usuário não aprovar.
- **Scrollytelling.** Uma ideia por tela de altura; o texto fica parado enquanto é lido e a imagem
  muda ao lado. Nunca mova o texto que a pessoa está lendo.
- **Pinning.** Prende uma seção enquanto a rolagem conta a história dela. Custo: a página fica mais
  alta que o conteúdo; quem rola rápido sente o "pegou". Limite a 1–2 pins por página.
- **Scrub.** Progresso da animação = progresso da rolagem. Scrub com suavização (o progresso persegue
  a rolagem com atraso) parece mais caro; scrub seco parece mais preciso. Escolha e diga.
- **Parallax.** Camadas com velocidades `--motion-parallax-*`. Diferença pequena (0,15 a 0,4) já dá
  profundidade; diferença grande enjoa. Variante reduzida obrigatória: camadas paradas.
- **Seção horizontal.** Rolagem vertical vira movimento horizontal num trecho pinado. Funciona para
  uma galeria (os widgets lado a lado). No celular, prefira um carrossel nativo com `scroll-snap`.
- **Scroll snapping** (`scroll-snap-type`): bom para seções de tela cheia; ruim quando há seção mais
  alta que a tela (o texto fica inalcançável). Use `proximity`, não `mandatory`, se houver dúvida.
- **Rolagem suave (Lenis).** Dá peso e inércia. Custos: interfere com busca na página, âncoras,
  teclado e rolagem de áreas internas; a pessoa sente que perdeu o controle se o atraso for grande.
  Se propuser, diga o ganho e o custo, e mantenha a rolagem nativa no reduzido e no celular.
- **Revelar seção.** Fuja do fade-up genérico. Revele com o Ponto (ele passa e a seção acende atrás),
  com máscara que acompanha a direção da leitura, com o conteúdo se montando do grupo para o detalhe.
- **Indicador de progresso.** O Ponto pode ser o indicador: anda numa trilha conforme a página rola.
- **Efeitos por velocidade.** Skew ou estica na rolagem rápida (o Ponto se alonga quando a pessoa
  rola rápido). Limite a deformação (ex.: skew ≤ 6°) e volte com mola; no reduzido, nada.

## Exemplo: o Ponto correndo

Divisão de trabalho entre as skills, com o mesmo exemplo em todas:

- **Objeto** (`motion-object-design`): o Ponto antecipa (recua 2 px), corre para a direita esticando
  na velocidade máxima, pousa com um amassado curto.
- **Cena** (esta skill): enquanto ele corre, linhas de velocidade passam no fundo na direção
  contrária, a camada `far` desliza devagar (parallax), um vento leve inclina dois elementos
  soltos, e a "câmera" (o conteúdo inteiro) atrasa 1–2 px e volta, como se acompanhasse.
- **Reduzido**: o Ponto aparece direto no destino; sem linhas, sem vento, sem câmera.
