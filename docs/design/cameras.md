# Widget Câmeras — spec (#148, escolha C + B)

Seção "Escolhidas" do canvas da leva 3
(https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ#escolhidas).

## Objetivo

Ver as câmeras sem trocar os avatares por vídeo. Na lista de Pessoas fica só o selo de
câmera ligada.

## Modos

- **Automático (padrão)**: quem está falando fica em destaque; as outras câmeras ligadas
  ficam na fileira. Ao trocar quem fala, o destaque muda depois de 1,5 s de fala contínua,
  para não piscar.
- **Fixada**: botão direito numa câmera → "Fixar só a câmera de Duda". O widget mostra só
  ela. O cabeçalho ganha o selo com `Pin` + "Duda" (`#A6A9FF`). Botão direito →
  "Mostrar todas" volta ao automático; "Fixar outra câmera ›" lista as ligadas.
- Abrir pelo selo de câmera em Pessoas, ou "Abrir câmera" no menu da pessoa: abre (ou traz)
  o widget Câmeras fixado nela.

## Tamanhos

- **Lateral 420×240**: destaque à esquerda + coluna de até 3 câmeras de 118 px à direita.
- **Tira 280×160**: **só uma câmera**, a de quem fala (ou a fixada). Selo "falando".
- **Foco 960×640**: destaque em cima + fileira de até 4 câmeras de 112 px embaixo.
- **Celular 380**: destaque em cima (200 px) + fileira de 3.

## Sem amassar

Nenhuma câmera é esticada: o vídeo mantém a proporção de origem (`object-fit: contain`),
e a sobra vira faixa `#07080F`. A sua câmera aparece espelhada só para você; o que é enviado
não muda.

## Elementos

- Etiqueta no canto inferior esquerdo: nome (+ "você") e `MicOff` `#FF8A96` se mudo.
- Quem fala: contorno interno de 2 px `#4CDDC3`.
- Sem câmeras ligadas: "Ninguém está com a câmera ligada." + botão **Ligar minha câmera**.

## Mídia (confirmar)

- Indexado por `publicationId`; mover, redimensionar, fixar ou trocar o destaque muda só o
  estilo do host de vídeo: sem reparentar, sem clonar, sem nova PeerConnection.
- Lateral, fileira e Tira pedem a camada barata; destaque no foco pede a principal. A prévia
  nunca é promovida: trocar de camada é uma nova assinatura.

## Estado

Pessoal: modo, câmera fixada e o próprio widget ("Para mim").
