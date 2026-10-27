# Mídia — handoff
Atualizado: 2026-10-27 (noite)

## Agora
#192 captura nativa (aval do `webview2-com` em 27 out), em 3 PRs:
1. #217 (mergeada): `video.rs` lista telas/janelas (regras do Alt+Tab,
   sem cloak) + miniaturas WGC 320×180; `desktop/video.ts`. rc.5.
2. #218 (mergeada): `stream.rs` WGC → VideoProcessor (NV12 BT.709 na GPU) → staging →
   SharedBuffer (3 slots, seqlock); sem `ID3D11VideoDevice` (WARP, VM) converte na CPU
   (`wire::bgra_to_nv12`; `tick.gpu` diz o caminho); IPC só `desktop_video_wait` (tick). Página:
   `desktop/native-video.ts` → `MediaStreamTrackGenerator`; `getSettings`/`applyConstraints`
   simulados na trilha. Bench `native_capture_cpu` (passo opcional no windows.yml).
3. `midia/192-api`: `desktop_share_audio` + `desktop/share.ts` (`startNativeShare`) para a #191.
Bench no runner (WARP, caminho CPU): 6,4 ms/quadro em 1080p (≈38% de um núcleo a 60 fps,
pior caso); a tela parada do runner só gera 2–3 quadros/s, então o % de CPU de lá não vale.
Falta: CPU real 1080p60 no PC do usuário (caminho GPU); seletor visual (Frontend, após spec da #191);
borda amarela no Win10 continua (só o Win11 permite tirar). #194 (3 telas) já cabe:
`MAX_STREAMS = 3` no nativo.

## Feito recentemente
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

## Plano da #194 (até 3 telas por pessoa)
- Servidor (`rooms.ts` `publish`): hoje troca a publicação do mesmo `kind`. Para `screen`:
  manter as outras, recusar a 4ª com `Fault("SCREEN_LIMIT", "Você já transmite 3 telas.
  Encerre uma para compartilhar outra.")`; `MAX_SCREENS = 3` em `protocol.ts`. Teste.
- Cliente: `Captures.sources` é `Map<Kind>` (uma tela). Passar a chavear telas por `key`
  (`screen`, `screen:<key>`), `sourceFor(publication)` por `key` em `peers.ts`
  (`accept`, `parameters`, `update`); `controller.syncCapture`/`publications` por chave
  de fonte; `previewStream` por fonte; `stop(kind|key)`. Desktop `stopScreen` é único:
  checar `desktop/capture.ts`.
- Upload (#23): a partir da 2ª tela, qualidade padrão Baixa (480p/15 fps/700 kbps).
- UI: "Compartilhar outra tela" e parar cada uma; combinar com o Frontend (seletor ‹ 1/3 ›).

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
Merge da #211; depois branch `midia/194-tres-telas` seguindo o plano acima.
