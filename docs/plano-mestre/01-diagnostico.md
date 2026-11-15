# 1. Diagnóstico crítico

Retrato de 15 nov 2026. Produção 2.11.0, prévia 2.12.0-rc.6. Fontes: `docs/ESTADO.md`,
`docs/seguranca/revisao-2026-11.md`, `docs/planos/banco-e-contas.md` e os rascunhos em
[`rascunhos/`](rascunhos/). Aqui só o julgamento; o detalhe técnico está em
[05](05-o-que-falta-no-codigo.md).

## Em uma frase

O VIO é um **bom produto para um grupo de amigos** e ainda **não é um produto que possa ser aberto
ao público**: o que falta não é função, é base (conexão garantida, moderação, lei, medição e um
servidor que não dorme).

## O que está bom de verdade

- **Núcleo validado em uso real**: transmissão de tela e áudio aprovadas pelo usuário (22 out).
- **Segurança de base acima da média** para o tamanho: zod `.strict()` em tudo, token HMAC,
  Helmet + CSP, limites por chave, logs sem dado pessoal. Revisão de novembro: 0 P0.
- **Custo zero hoje** e arquitetura barata: o servidor só sinaliza, a mídia é P2P.
- **Processo disciplinado**: issues com prioridade, CI, prévia → produção com aval, decisões
  numeradas, catálogo do código, 44 arquivos de teste com servidor real.
- **App Windows já existe** (Tauri, instalador, atualização assinada pelo canal próprio).
- **Identidade em construção com método** (fases de design, guia de estilo próprio).

## O que está errado (em ordem de gravidade)

### 1. Não há nada que impeça abuso depois de abrir
Sem expulsar terceiros de forma durável, banir, denunciar ou bloquear. Um IP ainda consegue
ocupar as 200 salas do servidor (S-02, #376, aberto). Antispam (#357) está na fila como P3.
Em produto de voz e tela ao vivo, isso é o primeiro problema do primeiro dia público, e a lei
(STF Tema 987) passa a exigir canal de denúncia e retirada.

### 2. A conexão não é garantida
O padrão é STUN do Google; TURN tem três caminhos no código e nenhum comprovado em produção
(#25 e #135 abertas, #135 em `aguarda-usuario`). Sem TURN, a estimativa de mercado é que 10–20%
das pessoas simplesmente não conectam. Entre amigos isso vira "tenta de novo"; em público vira
"não funciona". O #344 (áudio da tela some para um amigo) é o tipo de bug que essa falta esconde.

### 3. O produto está fora da lei para o público
- **ECA Digital** (em vigor desde 17 mar 2026): autodeclaração de idade não basta. A decisão 019
  (13+ por autodeclaração) precisa ser reaberta antes de abrir.
- **Não existem** Termos, Política de Privacidade, Diretrizes nem tela de aceite no produto.
- Sem CNPJ não se cobra de forma regular; MEI não serve para software.
Nada disso atrapalha o uso entre amigos. Tudo isso bloqueia a abertura.

### 4. O servidor é uma única caixa que dorme
Render Free: dorme após 15 min, leva ~1 min para acordar, 750 h/mês. Estado todo em memória, uma
instância: **todo deploy derruba todas as salas**. Para amigos, aceitável. Para público, o primeiro
contato de quem chega por um link é uma tela parada por um minuto.

### 5. Voa-se às cegas
Só log JSON e `/healthz`. Sem métrica de uso, sem captura de erro do cliente, sem alerta. Não se
sabe quantas salas abrem por semana, quantas chamadas falham, nem quanto de memória uma pessoa
conectada custa (o plano de banco admite que não foi medido). **Todo número de custo e de receita
deste plano é estimativa enquanto isso não existir.**

### 6. O esforço está indo para o lugar errado
A fila tem ~14 itens de design/estilo/animação (fases 1–5, kits, temas, brandbook, transições) e
4 bugs P1 de mídia e uso abertos (#266, #268, #280, #344). O polimento visual é o que diferencia o
VIO, mas hoje ele consome a maior parte do fôlego enquanto os itens 1–5 acima seguem sem dono.
A regra "não se começa um nível com o de cima aberto" vale por área, então o Design avança
enquanto Mídia e Backend estão presos: **o gargalo é a ordem entre áreas, não dentro delas.**

### 7. A posição de mercado é estreita
- O Discord já compartilha tela e tem Watch Together. O VIO "não substitui o Discord", o que é
  honesto, mas obriga a responder: **por que abrir o VIO se o grupo já está no Discord?** Hoje a
  resposta (layout pessoal, widgets compartilhados, leveza, sem conta) existe no produto, mas não
  está escrita em lugar nenhum nem testada com gente de fora.
- Netflix, Disney+ e afins dão tela preta na captura (DRM). O uso real é YouTube, Twitch, arquivo
  local e jogo. O marketing não pode prometer "assistir streaming junto".
- Malha P2P limita a sala a ~6 pessoas com qualidade. É um produto de **grupo pequeno**; "crescer"
  significa muitas salas pequenas, não salas grandes. Isso é bom para custo e define o público.

### 8. Não há caminho de receita desenhado
Sem contas não há como reconhecer quem apoia; sem CNPJ não há como cobrar. A decisão 017 (pago só
com receita ou ao abrir) é correta, mas cria um nó: a abertura exige gasto (servidor, TURN,
advogado, verificação de idade) **antes** de qualquer receita. O plano precisa dizer de onde sai
esse primeiro dinheiro. Ver [04](04-financas.md).

### 9. Risco de pessoa única
Um fundador, sem equipe humana, com agentes fazendo quase todo o código. Não há segundo
responsável por domínio, Render, GitHub, chaves de assinatura ou `SESSION_SECRET`. Se a conta do
fundador ficar inacessível, o projeto para.

### 10. Dívida que encarece tudo o que vem depois
Arquivos gigantes (`workspace.css` 3588 linhas, `RoomCanvas.tsx` 2053, `controller.ts` 1922,
`rooms.ts` 1379), código morto de layouts antigos, `docs/ROADMAP.md` e mais quatro documentos
desatualizados, sem teste de carga, sem cobertura, Prettier fora da CI, só pt-BR sem estrutura
de tradução. Nada urgente; tudo fica mais caro a cada mês.

## Erros de plano a corrigir já

| Erro                                                             | Correção                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `ROADMAP.md` descreve o passado como futuro                      | Este plano o substitui; apontar o `ROADMAP.md` para cá                   |
| "Abertura ao público" tratada como uma linha de roadmap          | É uma fase inteira com 9 bloqueios; ver [02](02-fases-e-ordem.md)        |
| Decisão 019 (13+ por autodeclaração) em vigor                    | Reabrir: 18+ ou 13+ com verificador ([decisões](README.md#decisões))     |
| Antispam e moderação como P3                                     | Sobem para pré-requisito de abertura                                     |
| TURN parado em `aguarda-usuario`                                 | É a tarefa externa nº 1 do usuário ([06](06-tarefas-externas-do-usuario.md)) |
| Custos calculados só até 10 mil contas e sem TURN                | Refeito de 0 a 1 milhão em [03](03-custos.md)                            |

## Veredito

Não há nada a jogar fora. O núcleo é sólido e barato de operar. O erro seria **abrir cedo** (o
produto é derrubado por abuso ou por lei) ou **polir para sempre** (o produto nunca encontra gente
de fora). O plano em [02](02-fases-e-ordem.md) resolve isso com um alpha fechado e medido antes
de qualquer gasto, e com uma lista fechada do que bloqueia a abertura.
