# Atmosfera, 3D, transições, reatividade, custo e bibliotecas

Núcleo de conhecimento da `motion-scene-design`. Padrões quebráveis, salvo os invariantes marcados.

## Atmosfera e movimento ambiente

Ambiente é o que dá ar ao mundo sem pedir atenção. Teste: se a pessoa olha para o ambiente em vez
do conteúdo, ele está alto demais.

| Técnica                    | Como se faz (rascunho)                                                       | Custo           | Dentro de `transform`/`opacity`?                      |
| -------------------------- | ---------------------------------------------------------------------------- | --------------- | ----------------------------------------------------- |
| Gradiente animado          | camada grande com gradiente fixo, movida com `translate`/`rotate` lentos     | barato          | sim (mova a camada, não as cores)                     |
| Mesh gradient              | 3–5 manchas radiais em camadas separadas, cada uma derivando devagar         | moderado        | sim, se as manchas forem elementos movidos            |
| Gradiente por `@property`  | registrar `--angulo` e animar a cor/ângulo do próprio gradiente              | moderado        | **não**: repinta a cada quadro → exceção              |
| Grão/ruído                 | PNG ou SVG `feTurbulence` pré-renderizado, deslocado em passos               | barato          | sim (desloque a textura; não recalcule o filtro)      |
| Partículas                 | canvas 2D com teto de quantidade; poucas dezenas em DOM                      | moderado/pesado | canvas fica fora da regra (pinta em bitmap) → declare |
| Linhas de velocidade/vento | traços finos em camada, `translateX` em loop, opacidade pela velocidade      | barato          | sim                                                   |
| Névoa                      | 2–3 camadas de gradiente borrado **pré-renderizado**, derivando              | moderado        | sim, se o blur não for animado                        |
| Aurora                     | faixas largas com gradiente, `rotate` + `translate` lentos, `mix-blend-mode` | moderado        | blend mode custa composição; declare                  |
| Varredura de luz           | faixa diagonal translúcida atravessando com `translateX`                     | barato          | sim                                                   |
| Fundo em canvas/WebGL      | shader procedural, ruído, campo de pontos                                    | pesado          | fora da regra → exceção com fallback estático         |
| Gerativo                   | regras simples + semente (a sala tem um fundo único pelo código da sala?)    | varia           | depende da técnica                                    |
| Profundidade de campo      | camadas `far` mais borradas (blur estático) e mais apagadas                  | moderado        | sim, se o blur não muda                               |
| Hora do dia                | paleta e luz do ambiente mudam com a hora local                              | barato          | sim, se a troca for por opacidade entre camadas       |

O VIO tem um tema escuro só; "ambiente por tema" é ideia para depois — proponha como sugestão.
A cor da marca (`#2727F5`) e o destaque (`#A6A9FF`) são o limite da paleta do ambiente; ambiente
colorido demais disputa com o vídeo e com a cor das pessoas.

**Exemplo central.** O Ponto parado na landing respira (`dot-pulse`, 2,4 s). Cena possível: a cada
respiração, um halo quase invisível se expande e some no fundo, como uma onda num lago; quando o
cursor se aproxima, as ondas se inclinam para ele. No reduzido: o Ponto parado, sem halo.

## 3D e espaço

- **Quando vale:** um objeto-herói na landing (o Ponto como cubo de cantos arredondados que gira
  com a rolagem), uma câmera que atravessa a "sala" na apresentação. Vale quando o 3D conta algo que
  o 2D não conta (volume, estar dentro).
- **Quando não vale:** dentro da sala, sobre vídeo, em widget, em tudo que roda junto com WebRTC (o
  orçamento de GPU e CPU é da chamada).
- **Técnicas:** CSS 3D (`perspective`, `rotateX/Y`, `transform-style: preserve-3d`) para inclinar
  cartões e seções — barato e dentro da regra. Three.js / React Three Fiber / OGL para cena real;
  Spline e Rive como embed. Pós-processamento (bloom, grão) só no herói.
- **Degradação:** sem WebGL, no reduzido ou em aparelho fraco → imagem estática do mesmo
  enquadramento (pôster). Declare o pôster na spec.

## Transições

O VIO não tem rotas de framework: Landing, Início e Sala são estados do `App`. A transição entre
eles é desenhada, não herdada de um roteador.

- **Página a página.** O padrão aprovado é o **Ponto conduzindo** (`transicoes.md`): ele sai de onde a
  pessoa clicou, cresce, a tela nova aparece por baixo, e ele pousa no ponto que fica na tela nova.
  Variações devem manter: origem real, destino real, encaixe perfeito, nunca sumir da tela.
- **Elemento compartilhado (FLIP / View Transitions).** O Ponto é o elemento compartilhado por
  excelência. Também valem: o chip da pessoa que vira o selo Ao vivo; o botão que vira o widget.
- **Cortina, varredura, morph.** Cabem na landing. Uma cortina pode ser o Ponto crescendo até cobrir
  a tela (um quadrado arredondado que cresce é uma cortina com personalidade).
- **Seção a seção.** Na rolagem: o Ponto atravessa a fronteira e a seção nova acende atrás dele.
- **Troca de tema.** Hoje não há (tema único). Se surgir: a troca nasce do Ponto (círculo/quadrado
  que se expande a partir dele), com View Transitions.
- **Modal, gaveta, sobreposição.** O fundo escurece primeiro e menos (opacidade), o painel entra
  depois e mais; na saída, o painel sai primeiro e mais rápido. Popover nasce do gatilho (origem).
- **Primeira carga.** O `Splash` já existe (700 ms, pulável com clique ou tecla): Ponto em 0 ms,
  "vio" escrito a partir de 300 ms, saída em 540 ms. Toda proposta de preloader parte dele e diz
  o que espera (fontes, configuração), nunca prende a pessoa além do necessário.
- **Esqueleto → conteúdo.** O esqueleto tem a forma exata do conteúdo; a troca é por opacidade, sem
  pulo de layout. O Ponto pode "pintar" o esqueleto ao passar.

**Invariantes de mídia (não quebráveis):**

- nunca reparentar, clonar ou escalar o host de vídeo; o Ponto passa **por cima** do vídeo;
- não tirar o `<audio>` do `RemoteVoice` da árvore (o indicador de fala depende dele);
- foco e layout só mudam a apresentação: PeerConnections, streams e players continuam os mesmos;
- a animação de fala só **lê** o estado (`useSpeaking`, `voiceLevel`), nunca o produz.

Se uma ideia precisa quebrar um desses, ela não serve. Ache outra forma (sobreposição, máscara,
Ponto por cima) e diga que trocou.

## Reatividade em escala de cena

| Sinal                    | Ideia                                                       | Cuidados                                                 |
| ------------------------ | ----------------------------------------------------------- | -------------------------------------------------------- |
| Ponteiro                 | fundo que se inclina, luz que segue o cursor                | só com `(hover: hover)`; no toque, ancore num ponto fixo |
| Rolagem                  | humor muda por seção (energia, luz)                         | troca por opacidade entre camadas                        |
| Redimensionar/orientação | a composição se reorganiza; o Ponto reencontra o lugar dele | sem animar o redimensionamento em si                     |
| Dados ao vivo            | quantas pessoas, quem fala, tela começou                    | só **lê** o estado; nada de áudio novo para animar       |
| Tempo                    | hora do dia, aniversário da sala                            | troca lenta, nunca durante a leitura                     |
| Movimento do aparelho    | inclinação no celular                                       | pede permissão no iOS; sempre opcional; nunca na sala    |

## Custo da cena (preferência, não parede)

Orce a cena inteira, não cada peça. Na spec, um resumo assim:

```
Camadas animadas ao mesmo tempo: 4 (ambiente far, linhas, Ponto, conteúdo)
Filtros/blur animados: 0 · blur estático: 1 (névoa)
Canvas/WebGL: 1 canvas 2D, até 60 partículas, DPR ≤ 2, pausa fora da tela e com aba oculta
Loop por quadro: 1 (ticker único)
Nota: moderado
Primeiros cortes se pedirem otimização: 1) partículas → 24; 2) névoa → imagem; 3) linhas só durante a corrida
```

Qualidade criativa vem antes do orçamento: se a ideia pede peso, mantenha e **diga** o peso.
Nunca reduza a ideia em silêncio.

## Responsividade do movimento

| Contexto          | Padrão                                                                        |
| ----------------- | ----------------------------------------------------------------------------- |
| Desktop           | a cena completa                                                               |
| Tablet            | menos camadas; parallax menor                                                 |
| Celular           | sem efeitos de cursor; ambiente com metade das camadas; rolagem nativa        |
| Aparelho fraco    | `navigator.hardwareConcurrency` baixo ou quadros perdidos → ambiente estático |
| Orientação        | recompõe sem animar a troca                                                   |
| PiP / app Windows | mesmos tokens, sem ambiente                                                   |

## Bibliotecas (confirmar versão na pesquisa)

Nenhuma destas está aprovada no `package.json`. No **rascunho** (Artifact) o Design pode usá-las, por
CDN fixado em versão; na **spec**, diga qual usaria em produção, por quê e qual o plano nativo
(CSS, Web Animations API, canvas, SVG) se o usuário não aprovar a dependência.

| Biblioteca                          | Use quando                                                        | Evite quando                                     |
| ----------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| CSS nativo                          | dá conta: transições, keyframes, scroll-driven, `@starting-style` | precisa de física, sequência longa interrompível |
| Web Animations API                  | sequência por código, interrompível, sem dependência              | precisa de pin/scrub complexo                    |
| GSAP + ScrollTrigger/Flip/SplitText | linha do tempo longa, pin, scrub, texto dividido                  | o efeito cabe em CSS; dentro da sala             |
| Motion (motion.dev)                 | molas e gestos declarativos em React                              | só uma ou duas transições                        |
| Lenis                               | rolagem com inércia na landing                                    | páginas com áreas que rolam por dentro; celular  |
| Locomotive Scroll                   | rolagem suave + parallax prontos                                  | quase sempre: Lenis + scroll-driven cobrem       |
| Anime.js                            | animação leve por código, SVG                                     | já houver GSAP ou Motion                         |
| Lottie                              | animação ilustrada vinda do After Effects                         | precisa reagir a estado (prefira Rive)           |
| Rive                                | personagem com máquina de estado (o Ponto com humores?)           | ícone simples                                    |
| Theatre.js                          | autorar uma sequência longa à mão, com linha do tempo visual      | interação de interface comum                     |
| Three.js / R3F / drei / OGL         | 3D real na landing                                                | na sala; quando CSS 3D basta                     |
| Tailwind                            | não se aplica: o VIO usa CSS próprio                              | —                                                |

Nunca limite a ideia ao que uma biblioteca faz. A biblioteca é atalho; a ideia vem antes.
