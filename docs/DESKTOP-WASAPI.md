# VIO Windows — próximo ciclo

Preparação em 26/09/2026, depois da versão web 2.4.0. O objetivo é um instalador
Windows que compartilhe a janela escolhida com áudio WASAPI, preserve as duas telas
assistidas e ofereça uma janela flutuante com os controles da chamada.
Este documento é a especificação de implementação; **não existe binário WASAPI
entregue ou validado nesta versão**. Instalar a PWA não libera APIs Win32.

## Base já disponível

React/TypeScript, sinalização Render e protocolo de publicações permanecem.
`CaptureAdapter.screen(audio)` devolve um MediaStream; `device(constraints)` cuida
de microfone/câmera. A captura nativa deve respeitar essa interface, o evento ended
e o encerramento das trilhas. As capacidades de captura agora vêm do adapter.
`VITE_API_BASE`, `VITE_WEB_URL` e `ALLOWED_APP_ORIGINS` já separam servidor, convite
web e origem da aplicação. Nenhuma origem nativa foi liberada no Render nesta etapa.

O host estável do player já permite transportar vídeo e controles para uma janela
Document PiP no navegador. No aplicativo nativo, reutilizar a apresentação e o
estado da sessão; não criar um segundo Controller nem assinar a tela novamente.

## Decisão de plataforma e primeira prova

Manter a direção Tauri com frontend existente e captura Win32 em um módulo Rust
ou auxiliar C++, sem introduzir dependências no build web. Antes de montar todo o
instalador, realizar uma prova vertical em Windows 11: capturar o áudio de um
processo, convertê-lo em uma trilha MediaStream e ouvi-lo em outro aparelho pelo
mesmo publicador WebRTC atual. Confirmar a captura de vídeo no WebView2 usado pelo
host. Essa prova decide o transporte local de frames/PCM; não presumir que um
buffer nativo já é uma MediaStreamTrack.

O loopback por processo com ActivateAudioInterfaceAsync exige Windows build 20348
ou posterior segundo a amostra oficial da Microsoft. Para o produto, começar com
Windows 11 x64. Detectar capacidade em runtime; não anunciar áudio isolado em
versões que ofereçam apenas loopback do dispositivo inteiro.

## Contrato da captura nativa

| Operação | Resultado e regra |
|---|---|
| Enumerar fontes | IDs opacos de janela/processo e título para escolha explícita; sem aceitar PID arbitrário vindo de página remota |
| Iniciar captura | ID de sessão, dimensões/frequência, formato de áudio e capacidades efetivamente aceitas |
| Áudio por processo | Incluir árvore do processo selecionado; opcionalmente excluir a árvore do VIO na captura do sistema |
| Converter PCM | Buffer circular limitado, relógio monotônico, tratamento de silêncio/underrun; AudioWorklet alimenta MediaStreamAudioDestination |
| Vídeo | Captura autorizada da janela/tela com relógio compatível; resolver caminho WebView2 ou captura nativa na prova vertical |
| Parar | Idempotente; liberar IAudioClient, eventos, threads, buffer e tracks; emitir ended para a publicação |
| Fonte encerrada | Informar erro legível e encerrar apenas a publicação correspondente, preservando a chamada |

Não aplicar AGC, supressão de ruído ou cancelamento de eco ao áudio da tela. O
portão de voz e o ganho de microfone continuam separados. O ganho de reprodução
de até 300% também continua local; não deve ser incorporado ao PCM enviado.

IPC restrito às janelas locais do aplicativo e às operações acima. Não expor APIs
nativas a conteúdo remoto, páginas abertas em convites ou scripts sem essa origem.
Reutilizar a validação de payload; não afrouxar CSP nem aceitar origem ausente.
Serviço de sinalização e credenciais TURN continuam no Render, fora do instalador.

## Ordem de entrega

1. Prova WASAPI → MediaStream → WebRTC entre Windows e outro aparelho, com medição
   de áudio/vídeo, rota ICE e encerramento da fonte. Só avançar com evidência audível.
2. Adaptador nativo com seleção de janela/processo, troca de dispositivo, parada,
   suspensão/retorno do Windows e recuperação de captura. Reutilizar publicação por ID.
3. Janela sempre visível com vídeo, volume, foco e botões da chamada. Voltar à janela
   principal sem duplicar áudio, reabrir conexão ou reiniciar captura.
4. Build Windows reproduzível e instalador; ícone, desinstalação, assinatura quando
   disponível e política de atualização. Atualizações não podem reiniciar uma chamada.

## Aceite antes de anunciar WASAPI funcionando

- Compartilhar uma janela com áudio, com conversa paralela, sem recapturar a voz do VIO.
- Processo filho de navegador/jogo incluído corretamente; processo silencioso produz
  silêncio, sem capturar outro aplicativo por acidente.
- Duas telas assistidas mantêm vídeo e áudio ao trocar foco e ao abrir/fechar a janela
  flutuante. Parar uma fonte ou sair da chamada não interrompe a outra tela.
- Testar fone USB/Bluetooth/HDMI, troca/desconexão da saída, minimizar janela,
  encerrar processo e suspender/retomar Windows. Registrar formato, latência e falhas.
- Validar rota direta e TURN entre duas redes, sem expor credenciais em logs.
- Instalar, executar, atualizar e desinstalar em uma máquina Windows limpa, sem SDK.

Fontes de implementação:
[Microsoft — Application loopback audio sample](https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/)
e [código da amostra](https://github.com/microsoft/Windows-classic-samples/tree/main/Samples/ApplicationLoopback).
