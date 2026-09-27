# Pessoas e telas — decisões da 2.5.0

Pesquisa consultada em 27/09/2026. Não há uma solução universalmente mais aceita:
os padrões abaixo orientam esta implementação, adaptada ao VIO e à sua mídia P2P.

A documentação oficial do Discord associa a transmissão ao nome de quem publica,
distingue foco e grade e oferece janelas destacadas. A descrição histórica do
Multistream (2021) diferencia assistir, adicionar e parar uma transmissão.
Usamos essa associação no cartão de cada pessoa: Assistir/Só esta, Em conjunto,
Focar e fechar. Não presumimos capacidades atuais idênticas em todos os clientes.

O Zoom documenta uma área principal de compartilhamento com visualizações laterais
ajustáveis e miniaturas flutuantes arrastáveis. No VIO, a área principal permanece
inteira e as telas adicionais são janelas sobrepostas; nenhuma faixa é reservada.
O usuário pode organizar as janelas à direita ou embaixo, mover, redimensionar e
trazer uma delas à frente. Em áreas muito pequenas, pode haver sobreposição.

A WCAG 2.2, critério 2.5.7, exige alternativa ao gesto de arrastar. Cada janela tem
um menu com seis posições, tamanhos prontos e uma barra de tamanho. Teclado nas
alças: setas movem ou redimensionam; Shift aumenta o passo; Escape cancela arraste.
Foco visível, nomes acessíveis e estado textual da chamada complementam a cor.

Ações frequentes ficam visíveis; opções de organização ficam no menu. Filtros são
botões com aria-pressed, sem simular abas. Prévias opcionais só recebem assinatura
quando visíveis, continuam sem áudio e limitadas a duas em baixa qualidade.
As telas assistidas usam assinatura principal individual. Foco, posição e tamanho
são apenas apresentação: não recriam vídeo, áudio, MediaStream nem PeerConnection.
Mais telas consomem mais recursos; a ausência de teto não garante desempenho.

Referências primárias:
- Discord, Go Live / Screen Share: https://support.discord.com/hc/en-us/articles/360040816151-Go-Live-and-Screen-Share
- Discord, Multistream (histórico): https://support.discord.com/hc/en-us/articles/360045784891-Video-Screenshare-Updates-Multistream-and-More
- Zoom, Side-by-side mode: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0067526
- W3C, Understanding Dragging Movements: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
