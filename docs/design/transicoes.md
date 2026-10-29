# Transições — spec (escolha A, padrão do VIO)

Canvas da leva 5, linha "Escolhidas" (https://claude.ai/artifact/6wwRHH5cSppNTGfAm4rKtZ):
prancha "Escolhida · Transição A, padrão do VIO" (interativa). Alternativas B e C ficam no
canvas só para consulta.

## Ideia

**O ponto conduz tudo.** O ponto quadrado da logo sai de onde a pessoa clicou, viaja até o
lugar novo e **pousa num ponto que fica na tela** — o VIO nunca fica estático, e o ponto
está sempre presente em algum lugar:

| Lugar       | Ponto que fica                                     |
| ----------- | -------------------------------------------------- |
| Landing     | ponto final de "junto" (pulsa devagar)             |
| Início      | ponto dentro do botão Criar sala                   |
| Sala        | ponto antes do código da sala, no cabeçalho        |
| Widget      | ponto à esquerda do título, no cabeçalho do widget |
| Transmissão | ponto do selo Ao vivo                              |
| Pessoa      | ponto ao lado do nome (cresce com a fala)          |

## Movimentos

Curva padrão: `cubic-bezier(.2,.7,.2,1)` ("--ease-ponto"). Todos ≤ 800 ms.

| Momento                      | O que acontece                                                                                    | Tempo                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Landing → Início             | ponto sai do botão, cresce no centro, Início aparece por baixo e o ponto pousa no botão Criar     | 320 + 140 + 320 ms; tela nova 200 ms ease |
| Início → Sala (Criar/Entrar) | ponto do botão cresce até o tamanho do palco; a sala aparece; o ponto some no palco               | 420 ms + 160 ms                           |
| Sala → Início (Sair)         | palco encolhe até o ponto do botão Criar                                                          | 420 ms                                    |
| Início → Landing             | ponto vai do botão até o ponto de "junto"                                                         | 420 ms                                    |
| Abrir widget                 | ponto vai do botão até o cabeçalho do widget; o widget cresce a partir dali (`scale` de 0,05 a 1) | 260 + 240 ms                              |
| Fechar widget (− ou ×)       | widget encolhe para o seu ponto; o ponto volta ao botão de origem                                 | 180 ms ease-in + 240 ms                   |
| Trocar o conjunto da tela    | (layout/foco) o ponto da tela escolhida vai à nova posição; as telas trocam com opacidade         | 320 ms + 200 ms                           |
| Pessoa chega                 | chip entra pela borda com um pequeno quique                                                       | 320 ms `cubic-bezier(.3,1.4,.5,1)`        |
| Pessoa sai                   | chip sai pela borda e apaga                                                                       | 200 ms ease-in                            |
| Tela começa                  | ponto da pessoa salta do rodapé para o palco e vira o selo Ao vivo                                | 420 ms                                    |

## Encaixe perfeito (pedido do usuário)

- Origem e destino são **medidos no layout real** (`offsetLeft/Top/Width/Height` até o
  contêiner, ou `getBoundingClientRect` dividido pela escala), nunca números fixos. O ponto
  viajante tem 20×20 e chega com `translate(x,y) scale(w/20, h/20)`, exatamente sobre o
  elemento de destino; só então o destino aparece e o viajante some.
- Técnica FLIP: medir antes, aplicar a mudança, medir depois, animar a diferença.
- Duas viagens não se sobrepõem: um clique durante a viagem é ignorado (ou termina a atual
  na hora e começa a nova).

## Custo

- Só `transform` e `opacity`; um único elemento viajante (`position: fixed`,
  `pointer-events: none`, `will-change: transform` só durante a viagem).
- Nada de blur, sombra animada, filtro ou propriedade de layout animada.
- **Invariantes do `CLAUDE.md`**: a transição é só apresentação. Nunca reparentar o host de
  vídeo, clonar vídeo, recriar players ou tirar o `<audio>` do `RemoteVoice` da árvore.
  Sobre vídeo, o ponto passa por cima; o palco real não muda de pai.

## Reduzir movimento

- Já existe: Ajustes › Acessibilidade › **Reduzir movimento** (`src/client/components/motion.ts`)
  - `prefers-reduced-motion`. Com ele: o ponto não viaja, nada cresce nem quica; toda troca
    vira só opacidade de 150 ms; o ponto aparece direto no lugar final; nada pulsa.
