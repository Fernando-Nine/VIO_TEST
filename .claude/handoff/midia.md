# Mídia — handoff
Atualizado: 2026-10-28

## Agora
Sem tarefa em curso. Falta da #192: CPU real 1080p60 no PC do usuário (caminho GPU);
seletor visual (Frontend, #191); borda amarela no Win10 continua (só o Win11 tira).

## Feito recentemente
- #194 (rc.8): até 3 telas por pessoa. Servidor: telas somam até `MAX_SCREENS` (protocol),
  a 4ª → `Fault SCREEN_LIMIT`; voz/câmera seguem substituindo. Cliente: `Captures.sources`
  é `Map<Slot>` (`screen`, `screen:2`, `screen:3`; `slotKind`); `sourceFor(publication)`
  por `key` em `peers.ts`; miniatura por slot (`keepPreviews`); qualidade por fonte
  (`qualityOf`; extras nascem em `extraScreenQuality` ≤ Baixa). Nova tela:
  `engine.startScreen(audio, false, captures.nextScreen())`; nativo:
  `startNativeShare({..., slot})`; som nativo é um só (2ª tela com som → erro claro).
  UI (adicionar/parar cada tela, Minha transmissão por tela) é do Frontend com a #191.
  #192 (PRs #217–#219) mergeada: lista nativa, quadros por SharedBuffer, `startNativeShare`.
- #162 (PR #211): widget Câmeras (`canvas/CamerasWidget.tsx`, `camera-layout.ts`,
  `cameras.css`). Câmera segue a **demanda por espectador** na assinatura principal
  (`cameraEncoding`: small 120 kbps/12 fps/≤240p, fit 300, focus 450; `off` padrão no
  controlador quando nenhum widget mostra). Servidor aceita `demand` de câmera.
  `shareVoiceActivity` = um analisador por stream remoto (Pessoas + Câmeras).
  `engine.cameraRequest(personId)` abre o widget fixado (selo em Pessoas, menu da pessoa).
- #193 (PR #201) e #160 (PR #206) já em `main`.

## Decisões
- Câmera não usa a prévia (5 fps é só para tela); trocar camada = mudar a demanda, sem PC nova.
- Dependências aprovadas: as do `package.json` + crates do Tauri/`windows` + `webview2-com` (27 out).
- Matar servidor local pela porta (`fuser -k PORTA/tcp`), nunca `pkill -f`.

## Pendente / bloqueios
- Usuário: testar #193 no Windows 10/11 (PR #201) e as câmeras na prévia (roteiro na #211).
- Issues da área: #23, #24 (parte feita na #211), #25.

## Dicas
- Checar o Rust do Windows no Linux: `rustup target add x86_64-pc-windows-msvc`;
  `CC_x86_64_pc_windows_msvc=clang-cl-18 AR_x86_64_pc_windows_msvc=llvm-lib` e
  `CFLAGS_x86_64_pc_windows_msvc="/imsvc <dir>"` com `assert.h`/`string.h`/`stdlib.h` mínimos
  (o `ring` pede; `stdlib.h` declara `_byteswap_*`); `dist/source.tar.gz` e
  `dist/desktop/index.html` vazios; `cargo clippy --target x86_64-pc-windows-msvc --locked`.
- Visual com câmera falsa: Playwright `--use-fake-device-for-media-stream`; convidado
  precisa de "Ligar a câmera" (Pessoas na sala → Permissões).
- A `main` anda rápido: o `-rc.N` colide; refaça merge e suba o N.

## Próximo passo
Issues da área (#23, #24, #25) ou o que o copiloto mandar; apoiar o Frontend na UI de 3 telas.
