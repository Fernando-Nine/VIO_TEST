# Mídia — handoff
Atualizado: 2026-10-29

## Agora
#247 concluída: #250–#253 na main (rc.19–rc.22). #257 (#255, rc.23) em CI com base `main`
→ squash. Actions voltou em 29/10 (parou por cobrança em 28/10 22:10).

## Feito recentemente
- #250: telas do Win10 sem borda por DXGI Desktop Duplication (`duplication.rs`, cursor por
  GDI, reserva WGC); miniaturas por GDI, 3 em paralelo, cache 4 s, JPEG.
- #251: janelas do Win10 sem borda por PrintWindow numa textura GDI (`printwindow.rs`); WGC
  se vier preta. `keep_mta()` (CoIncrementMTAUsage): sem ela, threads curtas saindo da MTA
  derrubavam o processo (ACCESS_VIOLATION no bench de miniaturas).
- #252: Só som = janelas Alt+Tab + processos com sessão de áudio ativa (`programs.rs`), nome
  do FileDescription, ícone por ExtractIconEx (`desktop_sound_icon`).
- #253: `media/codecs.ts` põe H.264 primeiro quando `encodingInfo` diz powerEfficient.
- #257 (#255): janela minimizada mostra o ícone do .exe; janelas pulam WS_EX_NOACTIVATE;
  Só som mapeia app da Store à CoreWindow (suspenso fica fora) e ignora hosts do Windows.
- #135: recomendado Cloudflare Realtime TURN (1.000 GB/mês grátis, credencial temporária);
  aguarda aval do usuário para trocar as variáveis no Render.

## Medidas (runner Windows, 2 núcleos, sem GPU, tela parada)
- Captura de tela 1080p60/720p30: 0,3–2% de um núcleo (WGC ≈ DXGI).
- PrintWindow janela 1280×720: 720p30 ≈ 13% de um núcleo; teto ~30 fps (≈33 ms por quadro
  esperando o DWM); pedido de 60 entrega 20–27.
- Miniaturas: 238–310 ms (WGC) → 71–79 ms (GDI). Só som: lista 13 ms, ícone 3 ms.
- Página em sala parada (Chromium dev): ~12 ms CPU/s, 26 MB heap.
- Maior gasto real: VP8 por software, uma codificação por espectador (P2P).

## Decisões
- Janela no Win10 sem borda custa CPU e limita a ~30 fps; mantido porque o usuário pediu
  sem borda. Se reclamar de FPS em janela no Win10, alternativa: WGC (com borda) a 60.
- Codec: só muda a ordem; VP8 continua na lista para quem não tem H.264.

## Pendente / bloqueios
- Usuário: aceite no app (roteiros nas PRs #250–#253), CPU real em 1080p60 com 2+ espectadores.
- Padrões de qualidade por máquina: não feito (padrão já é 720p30).
- Issues da área: #23, #24, #25.

## Dicas
- Rust do Windows no Linux: `rustup target add x86_64-pc-windows-msvc`;
  `CC_x86_64_pc_windows_msvc=clang-cl-18 AR_x86_64_pc_windows_msvc=llvm-lib`,
  `CFLAGS_x86_64_pc_windows_msvc="/imsvc <dir> -Wno-implicit-function-declaration"` com
  `assert.h`/`string.h`/`stdlib.h` mínimos (stdlib com `_byteswap_ulong`); `dist/source.tar.gz`
  e `dist/desktop/index.html` vazios; `cargo clippy --target x86_64-pc-windows-msvc --locked --all-targets`.
- O passo de benches do runner é continue-on-error: leia o log, um crash ali fica verde.
- PRs empilhadas: depois do squash da de baixo, `git merge origin/main` + `checkout --ours`
  (árvores iguais) e retarget para `main`.

## Próximo passo
Merge de #252 e #253 com CI verde; depois #23–#25 ou o que o copiloto priorizar.
