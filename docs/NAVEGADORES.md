# Navegadores e referências técnicas

Consulta às fontes oficiais em 15/09/2026. A detecção no dispositivo prevalece
sobre descrições genéricas. Esta entrega não contém um teste físico de todos os
navegadores citados.

| Recurso | Tratamento no VIO | Validação externa necessária |
|---|---|---|
| Capturar tela | `getDisplayMedia` chamado pelo botão | Chrome, Edge, Firefox, Safari; escolha nativa |
| Áudio da captura | Verifica trilha retornada e tenta desativar processamento | Aba, janela e monitor em cada sistema |
| Voz e câmera | `getUserMedia` com constraints e seleção | Permissões, hardware ocupado, desconexão |
| Tela cheia | API do documento e fallback `webkitEnterFullscreen` | Safari/iPhone, fullscreen nativo |
| Miniaturas | canvas 320 × 180, até 5 FPS; sem áudio | Desempenho e throttling em aba de fundo |
| Qualidade | `applyConstraints` + `RTCRtpSender.setParameters` | FPS, bitrate e resolução observados em `getStats` |
| Reprodução | `playsInline`, autoplay com ação de retomada | Políticas locais de reprodução com áudio |

A API de captura exige contexto seguro e ativação do usuário. A opção `windowAudio`
hoje existe como sugestão ao navegador; sua presença não comprova que determinada
janela terá áudio isolado. Por isso o VIO não reproduz a antiga afirmação de que
“nenhum navegador permite áudio de janela”. A trilha recebida e o seletor da plataforma
são as referências da sessão. [MDN: getDisplayMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)

Para voz/câmera, o app verifica disponibilidade das APIs, solicita dispositivos no
contexto da ação e mostra permissões negadas, hardware ausente/ocupado e constraints
não aceitas. Valores efetivos são lidos do track. [MDN: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

A negociação usa ofertante único por conexão dirigida, em vez de dois ofertantes
concorrentes. Conexões em direções opostas têm identificadores diferentes. A fila
serial e a geração da negociação impedem aplicação de ICE antigo à descrição nova.
Esse desenho evita colisão de ofertas nessa topologia; se conexões bidirecionais
forem introduzidas, adote perfect negotiation/rollback para os dois papéis.
[MDN: negociação](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation)

O mecanismo de recuperação do Socket.IO não substitui a sincronização da aplicação.
O VIO reentra, recupera a presença e republica fontes ativas mesmo após perder o estado
em memória. [Socket.IO: recuperação](https://socket.io/docs/v4/connection-state-recovery/)

Node 24 foi usado neste ambiente, com as versões exatas registradas no lockfile.
A família LTS foi escolhida para execução, e a instalação resolveu versões compatíveis
de Vite e seu plugin React. [Node: releases](https://nodejs.org/en/about/previous-releases),
[Vite: requisitos](https://vite.dev/guide/).

## Reprodução e controles — consulta em 26/09/2026

Document PiP oferece uma janela com HTML e controles da sessão quando a API é
detectada. O VIO copia estilos e move o host do player sem trocar publicações.
Fechar a janela devolve o host; o navegador pode restringir tamanho e posicionamento.
Sem Document PiP, usa PiP de vídeo quando disponível. Não há promessa de paridade
de controles no fallback ou em toda PWA instalada.
[Chrome: Document Picture-in-Picture](https://developer.chrome.com/docs/web-platform/document-picture-in-picture).

Seletores continuam sendo elementos nativos. `appearance: base-select` e
`::picker(select)` melhoram o menu nos navegadores que oferecem suporte; os demais
mantêm o seletor da plataforma.
[Chrome: customizable select](https://developer.chrome.com/blog/a-customizable-select).
