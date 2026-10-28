# Mídia — handoff
Atualizado: 2026-10-28

## Agora
#247 (próxima sessão, por decisão do copiloto). Rascunho já no branch `feat/247-captura-leve`
(sem PR; refaça merge da main): `duplication.rs` (DXGI Desktop Duplication para telas no
Win10, sem borda, cursor por GDI, fallback WGC), miniaturas por GDI (PrintWindow
PW_RENDERFULLCONTENT / StretchBlt, 3 em paralelo, cache 4 s, WGC só se vier preto),
`Writer` comum aos dois laços em `stream.rs`, JPEG nas miniaturas, benches
`native_capture_cpu` (WGC×DXGI, 1080p60/720p30) e `thumbnails_speed`. Compila (clippy
Windows limpo); ainda não rodou no runner. Falta medir e o texto de leveza.

## Feito recentemente
- #246 (PR #249, rc.18): crash ao parar/trocar transmissão **com som** no app. Causa:
  `Drop` do `PROPVARIANT` (windows-rs) chama `PropVariantClear` → `CoTaskMemFree` do blob
  na pilha ao fim de cada captura WASAPI. Corrigido com `ManuallyDrop`. Também: troca com
  som libera só o som anterior (`releaseAudio`), `panic = "unwind"` + `catch_unwind` nas
  threads, handlers WGC removidos, processador D3D11 recriado no resize, limite nativo +1
  na troca, `log.rs` (vio.log) e recarga do WebView2 se o renderizador cair.
- Testes da troca: `tests/desktop-swap.test.ts` (fakes; `nativeApi` em `desktop/capture.ts`
  é o ponto de troca) e no runner `native_swap`/`audio_swap` (passo "Native swap").

## Decisões
- Win11 já tira a borda (RequestAccessAsync Borderless + IsBorderRequired=false). Win10:
  telas sem borda via DXGI; **janelas no Win10 seguem com borda** (WGC não permite; só
  recortando a tela, o que mostraria o que estiver por cima) — dizer isso ao usuário.
- Fatal (heap corrompido, fail-fast) não passa por código do app: diagnóstico pelo
  Visualizador de Eventos; o resto vai para `%LOCALAPPDATA%\<identifier>\logs\vio.log`.
- Matar servidor local pela porta (`fuser -k PORTA/tcp`), nunca `pkill -f`.

## Pendente / bloqueios
- Usuário: roteiro manual da #249 no app (troca com/sem som, 3 telas, Só som).
- Issues da área: #23, #24, #25.

## Dicas
- Rust do Windows no Linux: `rustup target add x86_64-pc-windows-msvc`;
  `CC_x86_64_pc_windows_msvc=clang-cl-18 AR_x86_64_pc_windows_msvc=llvm-lib`,
  `CFLAGS_x86_64_pc_windows_msvc="/imsvc <dir>"` com `assert.h`/`string.h`/`stdlib.h`
  mínimos; `dist/source.tar.gz` e `dist/desktop/index.html` vazios;
  `cargo clippy --target x86_64-pc-windows-msvc --locked --all-targets`.
- Bug nativo: reproduza com teste `#[ignore]` no runner (PR com conflito não roda CI).
- A `main` anda rápido: o `-rc.N` colide; refaça merge e suba o N.

## Próximo passo
Merge da main em `feat/247-captura-leve`, abrir PR, ler os benches do runner e decidir.
