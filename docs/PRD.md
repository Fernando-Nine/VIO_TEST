# VIO — produto e aceite

Data: 15/09/2026. Base nova 0.1.0, sem importar versões ou código históricos.

## Objetivo

Uma sala pequena para assistir telas e conversar com amigos. Qualquer participante
pode publicar. O player prioriza a tela escolhida, com voz e câmera independentes.
Sem contas, gravações, chat textual ou cobrança. Identidade: VIO, azul #2727F5,
teal para transmissão, by NerdQuest Studios · fundado por Nine. AGPLv3.

## Decisões

- React + TypeScript + Vite, CSS próprio, Manrope e IBM Plex Mono locais (OFL).
- Express e Socket.IO no mesmo servidor HTTP. Somente transporte WebSocket;
  evita afinidade de HTTP polling, mas redes que bloqueiam WebSocket impedem ingresso.
- Uma instância, estado em memória, 4 participantes por padrão. Limite conservador,
  não promessa de capacidade comprovada em todos os dispositivos.
- Uma conexão WebRTC por assinatura dirigida. O publicador sempre oferece; o
  espectador responde. Telas cruzadas usam conexões distintas e não disputam ofertas.
- Miniatura gerada uma vez na origem, em canvas de 320 × 180 / até 5 FPS,
  sem áudio, com limite de 90 kbps por assinatura. No máximo duas por espectador.
- Somente uma tela principal por espectador. Câmera até 450 kbps/20 FPS por peer.
- Códigos de sala gerados com 64 bits aleatórios. Códigos escolhidos manualmente
  podem ser previsíveis; o app permite seu uso para grupos pequenos, com rate limit.
- Captura nativa Windows fora desta entrega. `CaptureAdapter` é a fronteira futura.

## Matriz inicial

| Requisito | Módulo | Critério de aceite |
|---|---|---|
| Entrada e presença | server/rooms, room/controller | 3 sessões, IDs diferentes, reentrada idempotente |
| Tela seletiva | media/capture, media/peers | 2 telas simultâneas, troca de assinatura |
| Miniaturas leves | capture.previewStream, Preview | até 320 × 180 / 5 FPS, só visíveis |
| Voz e câmera | Captures, Media, Person | simultâneas; parar uma preserva outras |
| Mute e ensurdecer | Controller, Captures | suspende envio e restaura mute manual |
| Qualidade | Settings, Peers.parameters | parâmetros aplicados e estatísticas visíveis |
| Recuperação | Controller.rejoin, Peers.recover | tokens estáveis, ICE ordenado, reentrada sem F5 |
| TURN | server/rooms, docs/TURN | credenciais efêmeras, teste de relay forçado |
| Segurança | security, config, schemas | origem, payload, identidade e destinatário validados |
| Interface | App, styles | desktop/mobile, teclado, diálogos, movimento reduzido |
| Operação | build, Render, Docker | build, health check, encerramento e rollback |

O resultado de cada teste e as dependências externas constam em VALIDACAO.md.
