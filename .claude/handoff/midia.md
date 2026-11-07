# Mídia — handoff

Atualizado: 2026-11-07

## Agora

#303 (instância única do app Windows) na PR `feat/303-instancia-unica`, sem auto-merge, aguardando
revisão e o teste do usuário no PC. #267, #271, #24 e #23 seguem na prévia esperando o aceite dele.

## Pendente / bloqueios

- Parecer curto, com o Pesquisador quando existir: captura nativa x anti-cheat (Valorant/Riot),
  porque a tela pequena pode ter vindo dele. O usuário vai testar.
- #135 TURN Cloudflare (`aguarda-usuario`): explicar passo a passo quando ele pedir.
- #282 (bandeja): quando existir, a segunda abertura precisa mostrar a janela escondida; hoje o
  `instance.rs` só restaura minimizada (janela escondida tem de ser mostrada pelo próprio processo,
  por exemplo com a primeira instância vigiando um evento nomeado). Link `vio://` para a instância
  aberta também fica para quando houver deep link.

## Decisões da área

- Tela inteira: Win10 = DXGI Desktop Duplication; Win11 = WGC. Janela Win10 = PrintWindow
  (~30 fps), WGC se vier preta. Nenhum com borda amarela.
- Teto de envio fixo (8 Mbps), mínimo 300 kbps por espectador; sem ajuste na interface.
- Servidor próprio antes de terceirizar (TURN/SFU), quando chegar a hora.
- Instância única por mutex nomeado com o identificador do canal, sem plugin.

## Próximo passo

Primeira issue `midia` da Fila do `ESTADO.md`. Medidas e dicas de bancada (inclusive `cargo check`
do Windows no Linux): `docs/notas/midia.md`.
