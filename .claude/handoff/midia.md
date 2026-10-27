# Mídia — handoff
Atualizado: 2026-10-27

## Agora
Bloco #192 → #193 → #160 entregue do lado da Mídia. #192 aguarda decisão (aval de
dependência). #160/#191: interface com o Frontend (API combinada na #160).

## Feito recentemente
- #192 (parecer na issue): WebView2 não troca o próprio seletor nem esconde a barra
  "tauri.localhost está compartilhando"; `ScreenCaptureStarting` só cancela. Único
  caminho: captura nativa (Windows.Graphics.Capture + `SharedBuffer` do WebView2 +
  `MediaStreamTrackGenerator`), custo alto (1–2 semanas), precisa do crate
  `webview2-com` (aval). Nada de código.
- #193 (PR #201, rc.9): process loopback a partir do build 19041 (`MIN_BUILD`);
  fonte "Todo o som do computador, sem o VIO" = `EXCLUDE_TARGET_PROCESS_TREE` sobre o
  próprio PID (WebView2 é filho do VIO). Loopback do dispositivo inteiro não é usado.
- #160 (PR #206, rc.10): `engine.startScreen(audio, true)` troca a fonte na mesma
  publicação (mesma chave; `replaceTrack`; renegocia só se ganhar som);
  `engine.setScreenAudioMuted`. App Windows só solta a captura anterior depois da
  nova imagem escolhida (`pending`/`active` em `desktop/capture.ts`).

## Decisões
- Dependências aprovadas: `@tauri-apps/cli`, `tauri`, `tauri-plugin-updater`, `windows`
  (+ `windows-core`, `serde`, `serde_json`). `webview2-com` **não** aprovado ainda.
- "muted" da publicação de tela = vídeo pausado. Silêncio do som é só local ao
  publicador; mostrar "sem som" a quem assiste pede campo novo no protocolo (Backend).
- Matar servidor local pela porta (`fuser -k PORTA/tcp`), nunca `pkill -f`.

## Pendente / bloqueios
- Usuário: testar #193 no Windows 10 e 11 (roteiro na PR #201).
- Aval para `webview2-com` se quiser o seletor próprio (#192).
- Issues da área: #23 (upload N×), #24 (AudioContext compartilhado), #25 (TURN).

## Dicas
- BrowserLab headless: `PORT=3100 ALLOWED_ORIGINS=http://localhost:3100 npm run
  test:media` + Playwright clicando "Executar testes de mídia" (passa inteiro).
- Rust só compila no job `installer` da CI (sem `lib.exe` aqui).
- A `main` anda rápido: o número `-rc.N` costuma colidir; refaça merge e suba o N.

## Próximo passo
Acompanhar #206 até o merge; depois #191 com o Frontend ou #24.
