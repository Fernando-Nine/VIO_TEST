# Mídia — handoff

Atualizado: 2026-11-07

## Agora

#280 (Flutuante no app): PR aberta, aguardando o goldfish. O botão some no app (o wry recusa
janelas novas, então o PiP não abre). Uma janela nativa sempre no topo seria P3, com rascunho do Design.

#267, #271, #24 e #23 na prévia (rc.3–rc.6), aguardando o aceite do usuário
no PC (roteiros nas PRs #272, #273, #275, #276; o mouse piscando da #267 só ele confirma).

## Pendente / bloqueios

- Parecer curto, com o Pesquisador quando existir: captura nativa x anti-cheat (Valorant/Riot),
  porque a tela pequena pode ter vindo dele. O usuário vai testar.
- #135 TURN Cloudflare (`aguarda-usuario`): explicar passo a passo quando ele pedir.

## Decisões da área

- Tela inteira: Win10 = DXGI Desktop Duplication; Win11 = WGC. Janela Win10 = PrintWindow
  (~30 fps), WGC se vier preta. Nenhum com borda amarela.
- Teto de envio fixo (8 Mbps), mínimo 300 kbps por espectador; sem ajuste na interface.
- Servidor próprio antes de terceirizar (TURN/SFU), quando chegar a hora.

## Próximo passo

Primeira issue `midia` da Fila depois da #280. Medidas e dicas de bancada: `docs/notas/midia.md`.
