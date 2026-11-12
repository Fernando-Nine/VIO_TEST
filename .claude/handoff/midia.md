# Mídia — handoff

Atualizado: 2026-11-12

## Agora

#350 (ajuste fino das telas até 500%, ganho puro sem limitador por decisão do usuário) na PR `feat/350-ajuste-fino-500`, sem auto-merge.
#344 (ajuste "vozes abaixam outros sons" no app) **não implementado**: o Chromium do WebView2 abre o microfone com `AudioCategory_Communications` no processo de áudio dele, e a única saída documentada (`SetDuckingPreference` / `IAudioClientDuckingControl`) vale só para a sessão do próprio processo; chamar de fora não é documentado e só vale depois de reabrir o fluxo. Volta a `aguarda-usuario` (teste do `mmsys.cpl` › Comunicações › Não fazer nada, ou aval para um build experimental).
#345 (vigia de tela parada: ICE restart → reassinatura, teto 3; revisão do goldfish aplicada) na PR #346, sem auto-merge, aguardando
revisão sem memória e o teste do usuário na prévia.
#303 (instância única do app Windows) na PR `feat/303-instancia-unica`, sem auto-merge, aguardando
revisão e o teste do usuário no PC. #267, #271, #24 e #23 seguem na prévia esperando o aceite dele.

## Pendente / bloqueios

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

Primeira issue `midia` da Fila do `ESTADO.md`. Medidas e dicas de bancada (inclusive `cargo check`
do Windows no Linux): `docs/notas/midia.md`.
