# Proposta: fila única, Elephant-Goldfish e agentes novos

Status: **proposta, aguarda o usuário** (4 nov 2026). Nada aqui está adotado.

## 1. Fila e níveis

| Nível | O que é                                                         | Regra                                       |
| ----- | --------------------------------------------------------------- | ------------------------------------------- |
| P0    | Crash, perda de dados, segurança, sala/chamada que não funciona | Para tudo. Segurança vai direto à produção. |
| P1    | Bug com contorno (algo errado, mas dá para usar)                | Antes de qualquer P2/P3.                    |
| P2    | Layout e ajuste de função que já existe                         | Antes de feature nova.                      |
| P3    | Feature nova                                                    | Só com P0/P1 vazios.                        |

- Etiquetas `P0`…`P3` no GitHub (uma por issue, além da área).
- Seção **Fila** no `ESTADO.md`: lista numerada única, por nível e depois por data. O copiloto
  mantém; a área pega sempre a primeira da sua etiqueta.
- Proposta de níveis para as abertas: P1 #280, #281, #266, #268 · P2 #261, #270, #269, #20 ·
  P3 #282, #208, #168, #135, #21, #22.

## 2. Elephant-Goldfish (EGM)

Origem: ensaio de Dave Rensin; plugin oficial `google/elephant-goldfish-model` (Apache 2.0,
22 out 2026); port comunitário `vshvedov/elephant-goldfish`; aula 14 da CMSC 389A (UMD, 2026).

Ideia: uma sessão longa (**elefante**) conversa, entende o contexto e escreve um plano. Sessões
novas e sem memória (**peixinhos**) recebem **só o plano e o código** e testam se ele se sustenta
sozinho: (1) compreensão — explica o plano de volta; (2) crítica — acha lacunas e casos de borda;
(3) prontidão — dá para implementar sem perguntar nada. Cada lacuna é corrigida ou rebatida com
evidência; após 3 rodadas sem acordo, a decisão vai ao usuário. Só então se escreve código.

Ressalvas da pesquisa: nenhum número publicado de ganho; custa tokens a mais na revisão; nada
garante que o código siga o plano (o EGM tem um "relatório de desvio" depois).

Proposta para o VIO (duas skills próprias, sem dependência nova):

- `elephant-copilot`: o copiloto entrevista (5–8 perguntas curtas), escreve
  `docs/planos/<tema>.md` (escopo, fora do escopo, arquivos, invariantes tocados, aceite) e pede
  aprovação. Memória = o próprio plano + handoff.
- `goldfish-copilot`: subagente novo a cada rodada, modelo barato, só leitura, recebe só o caminho
  do plano. Devolve ≤ 10 achados com veredito. Nunca reaproveitado entre rodadas.

Por que economiza: a área cara (Opus) recebe um plano fechado e não gasta o chat dela
descobrindo o problema nem refazendo; a revisão roda num modelo barato com contexto pequeno.
Quando usar: feature P3, mudança de protocolo/segurança, qualquer coisa que cruze áreas ou leve
mais de 1 dia. Quando **não**: bugs P0/P1 pequenos, textos, ajustes de 1 arquivo.

## 3. Agentes novos

- **Crawler** (só leitura, modelo barato): quando citam um bug, varre o código ligado e devolve
  `arquivo:linha` com causa provável, código morto, fora do padrão ou mal otimizado. Usa
  `code-review` e `security-review`. Também antes de cada release para produção.
- **Pesquisador** (só leitura, web): procura em docs, Reddit, fóruns e issues de outros projetos
  problemas parecidos e alternativas de implementação; devolve fontes e uma recomendação.
  Primeiro uso: parecer da Mídia sobre captura nativa x anti-cheat (Valorant/Riot).
