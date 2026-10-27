# Mídia — handoff
Atualizado: 2026-10-27

## Agora
Bloco do copiloto: #162 (PR #211, rc.2) → #194 (até 3 telas). #192 parada (aval do
`webview2-com`). Se #211 não estiver mergeada, levar ao verde e fazer squash merge.

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
- Dependências aprovadas: as do `package.json` + crates do Tauri/`windows`. `webview2-com` **não**.
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
- Visual com câmera falsa: Playwright `--use-fake-device-for-media-stream`; convidado
  precisa de "Ligar a câmera" (Pessoas na sala → Permissões).
- A `main` anda rápido: o `-rc.N` colide; refaça merge e suba o N.

## Próximo passo
Merge da #211; depois branch `midia/194-tres-telas` seguindo o plano acima.
