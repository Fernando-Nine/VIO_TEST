---
name: vio-design-delivery
description: Formato de entrega de uma leva de Design do VIO — canvas editável com seções por issue, 2–3 alternativas em tamanho real, seção Escolhidas, coleta das escolhas, specs e issues frontend. Use sempre ao montar, revisar ou fechar uma leva.
---

# Entrega de uma leva (Design)

Junta o melhor das três levas: a **organização da leva 3** (uma página, seções por issue,
"Escolhidas" no topo) com a **editabilidade das levas 1/2** (canvas do tipo Design, que o
usuário edita e comenta direto).

## O que veio de cada leva

| Leva | Artifact                            | Formato                                                | Fica                                                                                     |
| ---- | ----------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 1, 2 | `3M2c9eiZF8Pp26bjBhMjAZ`, `819UwyvwKn6c5WCU1X5Hv8` | Canvas do tipo **Design**: uma prancha `.dc.html` por alternativa | Edição direta (texto, cor, espaçamento no painel de propriedades), comentário preso à prancha, notas, título "escolhida: X" por seção |
| 3    | `3yJ4umERzwmY3vtWfxt8hJ`             | Página HTML única, montada por script, sem capacidades | Seções por issue, tamanhos reais lado a lado, selo `sugestão`, seção `#escolhidas` no topo |

A leva 3 perdeu a edição: tudo era gerado por `innerHTML`, então o usuário não podia mexer
num texto nem comentar uma prancha. **Volta das levas 1/2:**

1. Canvas criado do **tipo Design** (o mesmo das levas 1/2; achar com `Artifact list` e
   `type: "Design"`), não página HTML solta.
2. **Uma prancha por alternativa** (`<Issue><Letra>.dc.html`, ex.: `Header146A.dc.html`),
   com `title` "146A · Dois botões" no `canvas.json`.
3. **Marcação real** na prancha, sem script que monta a tela: só assim o painel de
   propriedades edita textos e estilos inline. Repetição com `<sc-for>`, não `innerHTML`.
4. **Alavancas como `data-props`** quando o usuário vai querer testar variações (cor de
   destaque, estado ligado/desligado, nome longo). Texto que ele reescreve fica literal.
5. **Nota `title1` por seção** (uma por issue) que ganha "— escolhida: X" após o aval,
   como na leva 2.
6. **Comentários** presos à prancha para coletar a escolha (abaixo).

Capacidades: o canvas **herda** do tipo (comentários com âncora, edição, assets). Não
declare `capabilities` nem `contract`; se precisar de uma capacidade nova numa página
própria, carregue antes a skill `artifact-capabilities` e registre aqui.

## Montar a leva

1. Pedido vem do copiloto com o conteúdo de cada peça e o número das issues. Não invente
   funcionalidade; o que for proposta sua leva o selo **sugestão**.
2. Crie o canvas com `title` "VIO · Leva N" e siga as instruções do tipo (vêm na resposta).
3. Layout do canvas:
   - Uma **linha por issue**, de cima para baixo, com a nota `title1` "#146 · Cabeçalho".
   - Na linha, 2–3 pranchas (A, B, C), 80 px entre elas; 120 px entre linhas.
   - Dentro de cada prancha, os **tamanhos reais** lado a lado: Lateral 420×240, Tira
     280×160, Foco 960×640, Celular 380 de largura. Legenda com o tamanho em mono.
   - Abaixo das molduras, 2–4 linhas sobre o que muda; recomendação marcada, se houver.
4. Tokens e componentes: `vio-design-system`. Antes de publicar: `vio-design-review`.
5. Avise o copiloto com o link e uma linha por issue (o que cada alternativa testa).

## Coletar as escolhas

- O usuário escolhe por **comentário na prancha** ("A, mas com o volume sempre à vista")
  ou edita a prancha direto. As duas formas valem.
- Leia com `ArtifactComments` (comentários) e `Artifact read` nas pranchas (edições); a
  prancha editada pelo usuário é a referência, não a sua versão.
- Dúvida de escolha: pergunte ao copiloto, não ao usuário.

## Fechar a leva (após o aval)

1. Linha **Escolhidas** no topo do canvas (nota `title1` "Escolhidas · <data>"), com uma
   prancha por peça já com os ajustes pedidos. O que você desenhou além do pedido leva o
   selo sugestão. As alternativas ficam abaixo, para consulta; não apague pranchas.
2. Atualize as notas das seções para "— escolhida: X".
3. Uma spec por peça em `docs/design/<peça>.md`, apontando o canvas e a prancha escolhida;
   linha nova na tabela de `docs/design/README.md`.
4. Uma issue `frontend` por peça (+ `midia`/`backend` se cruzar), citando a spec.
   Itens "para depois" vão numa issue só, sem milestone.
5. Uma PR `docs(design): …` com specs + README + handoff; CI verde, squash.
6. Handoff e aviso ao copiloto em ≤ 4 linhas: link, issues abertas, pendências.
