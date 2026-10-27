# Cabeçalho do widget: − e × — spec (#146, escolha A)

Seção "Escolhidas" do canvas da leva 3
(https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ#escolhidas). Complementa
[widgets-padrao.md](widgets-padrao.md).

## Regra (decidida pelo usuário)

| Widget  | Quem                                         | Botões                                             |
| ------- | -------------------------------------------- | -------------------------------------------------- |
| Da sala | dono da sala, admins e **criador do widget** | **−** fechar só para mim e **×** fechar para todos |
| Da sala | demais pessoas                               | só **−**                                           |
| Pessoal | só você                                      | só **×** (fecha)                                   |

- O servidor confere a permissão do × (#71); o criador do widget também pode fechar para todos.
- O menu do botão direito continua como hoje (ordem em `widgets-padrao.md`). Os dois
  últimos itens passam a se chamar **Fechar só para mim** e **Fechar para todos**
  (vermelho; só para quem pode).

## Botões e textos

- Botões de 30×30 no cabeçalho de 38 px, ícones `Minus` e `X` (lucide, 16 px), na ordem − ×.
- Hover do × em widget da sala: fundo `#4A2330`, ícone `#FF8A96`.
- Dicas: − "Fechar só para mim" + segunda linha "Continua aberto para os outros."; ×
  "Fechar para todos"; × pessoal "Fechar".
- `aria-label`: "Fechar Cronômetro só para mim", "Fechar Cronômetro para todos", "Fechar Cronômetro".

## Fechar para todos: Desfazer

- Sem confirmação. Abre um aviso no topo (padrão de [notificacoes.md](notificacoes.md)):
  "Você fechou o Cronômetro para todos." + **Desfazer** + ×, com a barra de 8 s.
- **Desfazer** devolve o widget com o mesmo estado e posição para todos. O servidor guarda
  o estado do widget fechado por 8 s (backend).
- Quem não fechou recebe no sino: "Nine fechou o Cronômetro." (sem balão).

## Widgets da sala que você não está vendo

- O − fecha só para você (estado pessoal, como posição e volume). O widget continua aberto na sala.
- Na barra da sala, depois de "+ Widget", aparece o botão **"N não exibidos"** (ícone
  `EyeOff`, número em mono `#A6A9FF`) **só quando N > 0**. N conta os widgets da sala que
  você não está vendo: os que você fechou com − e os novos que alguém criou e que ainda não
  estão no seu layout. Dica: "N widgets da sala que você não está vendo".
- Clique abre um menu com título "Widgets da sala que você não está vendo"; cada linha tem
  ícone, nome, motivo ("Você fechou" / "Novo, de Lia") e **Mostrar**; no fim, **Mostrar todos**.
- Mostrar põe o widget no primeiro espaço livre. Sem espaço livre, os espaços acendem e
  você clica em qual substituir; Esc cancela.
- O painel "Adicionar widget" mostra a mesma lista no topo, na seção "Não exibidos".

## Estado

Fechar só para mim e a lista de "não exibidos" são pessoais (navegador). Fechar para todos
e Desfazer são da sala, via servidor.
