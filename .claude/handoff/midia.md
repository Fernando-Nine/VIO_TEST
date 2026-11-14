# Mídia — handoff

Atualizado: 2026-11-14

## Agora

#352 (microfone próprio): pesquisa e projeto entregues em `docs/planos/microfone-proprio.md`, com
página de leitura para comentários (link no topo do arquivo). **Aguarda aval do usuário** em 5
decisões: caminho (A recomendado: captura WASAPI crua + processamento próprio), dependências
`nnnoiseless` e `sonora`, RNNoise no navegador (depois) e rodar a etapa 0 no PC dele. Sem código.
#344 (Windows abaixa os outros sons) na PR `fix/344-ducking-windows`, sem auto-merge: **provisório**,
muda `UserDuckingPreference` (pergunta uma vez + chave em Ajustes › Áudio) e reabre o microfone.
Quando o Windows relê o valor não é documentado; o teste do usuário no PC decide. Sai com a #352.
#350 (ajuste fino das telas até 500%, ganho puro sem limitador por decisão do usuário) na PR `feat/350-ajuste-fino-500`, sem auto-merge.
#345 (vigia de tela parada: ICE restart → reassinatura, teto 3; revisão do goldfish aplicada) na PR #346, sem auto-merge, aguardando
revisão sem memória e o teste do usuário na prévia.
#303 (instância única do app Windows) na PR `feat/303-instancia-unica`, sem auto-merge, aguardando
revisão e o teste do usuário no PC. #267, #271, #24 e #23 seguem na prévia esperando o aceite dele.

## Pendente / bloqueios

- #352: nada começa antes do aval. Nenhum número do plano foi medido por nós; a etapa 0 (bancada no
  PC do usuário) confirma qual fluxo abaixa os sons, o atraso da ponte e a CPU.
- Parecer curto, com o Pesquisador quando existir: captura nativa x anti-cheat (Valorant/Riot),
  porque a tela pequena pode ter vindo dele. O usuário vai testar.
- #135 TURN Cloudflare (`aguarda-usuario`): explicar passo a passo quando ele pedir.
- Link `vio://` para a instância aberta fica para quando houver deep link (#282 e seguintes).

## Decisões da área

- Tela inteira: Win10 = DXGI Desktop Duplication; Win11 = WGC. Janela Win10 = PrintWindow
  (~30 fps), WGC se vier preta. Nenhum com borda amarela.
- Teto de envio fixo (8 Mbps), mínimo 300 kbps por espectador; sem ajuste na interface.
- Servidor próprio antes de terceirizar (TURN/SFU), quando chegar a hora.
- Instância única por mutex nomeado com o identificador do canal, sem plugin; a segunda abertura já
  mostra janela oculta (`SW_RESTORE`), então a bandeja (#282) só precisa cuidar do link `vio://`.

## Próximo passo

Com o aval na #352: abrir a issue da etapa 0 (medidas de bancada, sem código de produto). Sem o
aval: primeira issue `midia` da Fila do `ESTADO.md`. Medidas e dicas de bancada (inclusive
`cargo check` do Windows no Linux): `docs/notas/midia.md`.
