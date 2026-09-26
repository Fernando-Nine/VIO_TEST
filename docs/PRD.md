# VIO — produto e aceite

Atualizado em 26/09/2026, versão 2.4.0. Base reescrita, com importação exclusiva
do CHANGELOG.md histórico do VIO_2; nenhum código anterior importado.

## Objetivo

Uma sala pequena para assistir telas e conversar com amigos. Qualquer participante
pode publicar. O player prioriza a tela escolhida, com voz e câmera independentes.
Sem contas, gravações, chat textual ou cobrança. Identidade: VIO, azul #2727F5,
teal para transmissão, by NerdQuest Studios · fundado por Nine. AGPLv3.

## Decisões

- React + TypeScript + Vite, CSS próprio, Bricolage Grotesque e IBM Plex Mono locais (OFL).
- Express e Socket.IO no mesmo servidor HTTP. Somente transporte WebSocket;
  evita afinidade de HTTP polling, mas redes que bloqueiam WebSocket impedem ingresso.
- Uma instância, estado em memória, sem teto de participantes por sala. A partir de
  seis, aviso de carga P2P. Capacidade depende dos aparelhos e da rede.
- Uma conexão WebRTC por assinatura dirigida. O publicador sempre oferece; o
  espectador responde. Telas cruzadas usam conexões distintas e não disputam ofertas.
- Miniatura gerada uma vez na origem, em canvas de 320 × 180 / até 5 FPS,
  sem áudio, com limite de 90 kbps por assinatura. No máximo duas por espectador, desligadas por padrão. A preferência local
  mostra iniciais quando não há prévias.
- Até duas telas assistidas por espectador, ambas em `main`, abertas por escolha explícita.
  Foco é só apresentação: preserva as duas conexões e os dois elementos de vídeo/áudio.
  Câmera até 450 kbps/20 FPS por peer.
- Códigos de sala gerados com 64 bits aleatórios. Códigos escolhidos manualmente
  podem ser previsíveis; o app permite seu uso para grupos pequenos, com rate limit.
- Captura nativa Windows é a próxima etapa documentada em DESKTOP-WASAPI.md; a entrega 2.4 continua web. `CaptureAdapter` é a fronteira de integração.

## Matriz inicial

| Requisito | Módulo | Critério de aceite |
|---|---|---|
| Entrada e presença | server/rooms, room/controller | 3 sessões, IDs diferentes, reentrada idempotente |
| Tela seletiva | media/capture, media/peers | 2 telas simultâneas, entrada manual e foco sem renegociar |
| Miniaturas leves | capture.previewStream, ScreenPicker | até 320 × 180 / 5 FPS, só visíveis |
| Voz e câmera | Captures, Media, Person | simultâneas; parar uma preserva outras |
| Mute e ensurdecer | Controller, Captures | suspende envio e restaura mute manual |
| Qualidade | Settings, Peers.parameters | parâmetros aplicados e estatísticas visíveis |
| Recuperação | Controller.rejoin, Peers.recover | tokens estáveis, ICE ordenado, reentrada sem F5 |
| TURN | server/rooms, docs/TURN | credenciais efêmeras, teste de relay forçado |
| Segurança | security, config, schemas | origem, payload, identidade e destinatário validados |
| Interface | App, styles | desktop/mobile, teclado, diálogos, movimento reduzido |
| Operação | build, Render, Docker | build, health check, encerramento e rollback |

O resultado de cada teste e as dependências externas constam em VALIDACAO.md.

## Interface 2.4.0

Tema escuro compartilhado entre entrada e sala. No desktop, entrada ajustada à
janela; na sala, área principal flexível sem rolagem externa. Painel de participantes
sobre o vídeo, com seis encaixes, arraste com captura do ponteiro e escolha por
clique/setas. Ocultação após 2 segundos sem atividade, suspensa por foco de teclado,
menus ou arraste; opção de manter os cards visíveis. Movimento reduzido respeitado.

Resolução de envio por altura máxima: 240p, 480p, 720p, 1080p, 1440p e 2160p.
Sem ampliação nem corte; prévias mantêm os próprios limites de banda. A área do
vídeo ocupa a largura útil também em monitores acima de 1500 px.

## Assistir em conjunto

Clique em **Assistir** numa transmissão disponível. A segunda oferece **Trocar foco**
(substitui a principal) e **Em conjunto** (mantém ambas, com a segunda menor).
Na tela menor, o botão de setas alterna o foco sem recriar conexões ou vídeos.
Cada tela mantém volume e mute próprios; ensurdecer silencia todas.
O X para de assistir apenas àquela tela. Ao encerrar a principal, a secundária
já aberta assume o foco; novas transmissões continuam aguardando escolha.
Com duas abertas, escolher uma terceira substitui só a principal.

As duas telas assistidas recebem qualidade principal com áudio. Isso usa mais rede
e processamento que assistir a uma. As miniaturas opcionais continuam leves,
mudas e limitadas a duas; não são as telas abertas em conjunto.

Degradês discretos seguem o azul da marca. Brilho no hover dos botões de ação e
pequenos deslocamentos usam transform/opacity, sem dependências adicionais.

## Chamada, presença e reprodução

Entrada na sala não assina voz/câmera. Entrar na chamada passa a recebê-las sem
solicitar microfone; o usuário ativa o microfone em uma segunda ação. Sair encerra
voz e câmera locais, cancela assinaturas da conversa e preserva as telas escolhidas.

Grade de participantes com altura limitada e rolagem interna; ocultar/restaurar
persiste como preferência local. Aviso a partir de seis pessoas em círculo de 28 px.
Volume por publicação, opção de ganho local até 300% e controles de vídeo no dock.
Document PiP move o host React estável; fechar devolve os mesmos elementos.
Switches semânticos e selects nativos aprimorados mantêm teclado e fallback.
