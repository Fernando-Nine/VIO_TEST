# Chamada e Compartilhar — spec (escolha D; em tela cheia, A)

Pranchas "4D · Controles no rodapé" e "4 · Escolhida: D + tela cheia com A" (https://claude.ai/artifact/819UwyvwKn6c5WCU1X5Hv8).

## Fora da tela cheia — doca no rodapé (D)

- O rodapé vira uma doca de 56 px; nada flutua sobre o canvas.
- Esquerda: "Na chamada · N" (ponto `#4CDDC3`), Microfone, Áudio, Câmera, Sair da chamada
  (ícones 40 px; desligado/sair em `#FF8A96`).
- Direita: Flutuante e **Compartilhar** (azul); créditos "NerdQuest · versão" no fim.
- Celular: doca fixa de 72 px como barra de abas — Microfone, Áudio, Tela, Mais.

## Em tela cheia — barra fina (A)

1. **Parado**: nada sobre a tela. A barra some depois de alguns segundos sem movimento.
2. **Mouse mexeu** (ou toque): volta a pílula fina (24–26 px) no centro de baixo, só com o
   estado (microfone, chamada).
3. **Mouse sobre a pílula**: as opções crescem para a barra completa (52–58 px) com
   rótulos — Microfone, Áudio, Câmera, Sair, Compartilhar, Janela (sair da tela cheia).
   Transição ~180 ms; sem animação em movimento reduzido.

- Teclado: foco na pílula expande a barra; Esc sai da tela cheia.

## Estado

Tudo pessoal (controles do próprio usuário); não muda nada no protocolo.
