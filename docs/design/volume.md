# Volume das telas e das pessoas — spec (#150, escolha A)

Seção "Escolhidas" do canvas da leva 3
(https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ#escolhidas). Parte do controle já
existe na prévia (#145: clique muta, hover abre o controle, até 300% com ajuste fino).

## Controle (igual para tela e pessoa)

- Trilho de 4 px com marca de 2 px em 100%. Até 100% em `#A6A9FF`; acima de 100% em
  `#F2D36B`, e o número também. Número em IBM Plex Mono.
- Tela: 0–100%, ou 0–300% com "Ajuste fino das telas". Pessoa: 0–200% (#118).
- Teclado: setas ±5%, Page Up/Down ±25%. Clique duplo no número volta a 100%.

## Onde fica

1. **Cabeçalho da tela**: como na prévia. Falta o trecho dourado acima de 100%.
2. **Botão direito na tela**: o menu da tela começa com "Volume desta tela" e o controle
   horizontal; depois Trazer para o foco, Janela flutuante, separador e Fechar só para mim.
3. **Tela cheia**: a barra fina ganha o botão **Volume**. Hover ou clique abre o controle
   **na vertical**, acima do botão: cartão de 52 px de largura, trilho de 130 px, número no
   topo. Sai ao tirar o mouse (300 ms) ou com Esc.
4. **Pessoa**: na bolha do widget Pessoas ([widget-pessoas.md](widget-pessoas.md)) e no
   painel de Pessoas.

## Invariantes

Volume só multiplica a reprodução local. Não mexe em PeerConnection, nos players de áudio
nem no que é enviado. Volume geral multiplica por cima.

## Estado

Pessoal (navegador), por tela e por pessoa.
