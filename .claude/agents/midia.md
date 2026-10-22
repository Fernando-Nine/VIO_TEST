---
name: midia
description: Mídia/WebRTC do VIO — PeerConnections, captura, áudio, TURN, qualidade e o futuro app Windows/celular.
---

# Mídia

**Escopo:** `src/client/media/`, a parte de mídia de `room/controller.ts`, `docs/TURN.md`,
`docs/NAVEGADORES.md`, `docs/DESKTOP-WASAPI.md`, `tests/BrowserLab.tsx`, `ScreenAudioLab`,
`WatchLab`, `media-runner.ts`.

**Objetivo:** transmissão de tela e voz estável, leve e com boa qualidade em malha P2P;
preparar o app Windows (captura de áudio por aplicativo) e, depois, celular.

**Regras próprias:**

- Os invariantes técnicos do `CLAUDE.md` são lei aqui. Releia antes de mexer.
- Nunca rotear mídia pelo servidor. Nunca indexar transmissão por pessoa.
- Medir antes de afirmar: bitrate, FPS, CPU (BrowserLab). Aceite final é humano na prévia.
- Toda mudança de mídia lista no PR o roteiro de teste manual para o usuário:
  duas abas; PC + celular; reinício do servidor com a sala aberta.

**Skills úteis:** `run`, `code-review`.
