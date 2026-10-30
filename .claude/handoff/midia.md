# Mídia — handoff
Atualizado: 2026-10-30

## Agora
Fila do copiloto (30/10) concluída: #267 (PR #272, rc.3), #271 (#273, rc.4), #24 (#275, rc.5),
#23 (#276, rc.6). Aguarda aceite humano na prévia.

## Feito recentemente
- #267: trilha nativa (`MediaStreamTrackGenerator`) vai com `contentHint = "detail"`
  (`asScreenContent`). Sem ele o Chrome a tratava como câmera: 1080p caía a 480×270 em segundos.
  Vale também para `canvas.captureStream` em bancadas: marque "detail" ou a medida mente.
- #271: app da Store no Só som: `GetApplicationUserModelId` → `shell:AppsFolder\<AUMID>`
  (nome localizado + logo por `IShellItemImageFactory`, numa thread STA). Teste `store_app_name`.
- #24: `voice-activity.ts` com um AudioContext e um timer para todos (8 → 1, CPU 11% → 5%).
- #23: `screenUploadBudget` 8 Mbps para todas as telas, dividido por water-filling em
  `Peers.parameters()`; o ciclo de stats (2 s) reaplica. "dividido" sob Envio em Minha
  transmissão. 6 espectadores em Alta: 17,9 → 7,7 Mbps, CPU 119% → 60%.
- Antes: #250–#253, #257 (ver Git).

## Medidas
- Runner Windows: DXGI/WGC 0,3–2% de um núcleo; PrintWindow 720p30 ≈ 13% (teto ~30 fps).
- Maior gasto real: VP8 por software, uma codificação por espectador (P2P); H.264 por hardware
  primeiro quando disponível (#253).

## Decisões
- Tela inteira: Win10 = DXGI Desktop Duplication (sem borda); Win11 = WGC (sem borda desde
  20348). Janela Win10 = PrintWindow (~30 fps), WGC se vier preta.
- Teto de envio fixo (8 Mbps), mínimo 300 kbps por espectador; sem ajuste na interface.

## Pendente / bloqueios
- Usuário: aceite das PRs #272/#273/#275/#276 (roteiros nas PRs); mouse piscando (#267) só
  confirmável no PC dele. #135 TURN Cloudflare aguarda aval.
- Issue da área ainda aberta: #25.

## Dicas
- Bancada local de N espectadores: `PORT=3100 ALLOWED_ORIGINS=http://localhost:3100 node
  --import tsx tests/media-runner.ts`; no Playwright, `import('/src/client/room/controller.ts')`
  e `/tests/synthetic.ts` na página `/qa-watch` (Vite serve TS). Para renderizar o App, um
  .tsx temporário em `tests/` com `createRoot` (não commitar).
- Versão: depois de mudar `releases.ts`, `npm run build` regenera o CHANGELOG (a CI confere).
  PR em conflito ("dirty") não roda CI: merge da main antes.
- `pkill -f` com padrão que aparece no próprio comando mata o shell; use o PID.
- Rust do Windows no Linux: ver Git (handoff de 29/10); o passo de benches é continue-on-error.

## Próximo passo
Após o aval do usuário, #25 ou o que o copiloto priorizar.
