# 11 — Testes e CI

> **Resumo:** `npm test` roda 39 arquivos `tests/*.test.ts` com `node --test` + `tsx` (163 casos `test(` contados); `server.test.ts` sobe o servidor real e usa clientes Socket.IO reais, os demais são testes puros de lógica. Mídia WebRTC só é provada no navegador, por laboratórios (`tests/*Lab.tsx`) abertos à mão. A CI (`ci.yml`) roda typecheck, testes, `npm audit`, build e checagem do CHANGELOG; `windows.yml` constrói e publica o app Windows.
>
> **Arquivos-chave:** `package.json` (scripts), `tests/server.test.ts` (servidor real), `tests/BrowserLab.tsx` + `tests/media-runner.ts` (bancada de mídia), `tests/synthetic.ts` (mídia sintética), `.github/workflows/ci.yml`, `.github/workflows/windows.yml`.
>
> **Docs:** `docs/VALIDACAO.md`, ADRs 011–013 (fluxo, pronto, auto-merge), `README.md` (seção de testes), `.claude/handoff/qa.md`.
>
> **Retrato:** commit `8bdc516` (5 nov 2026). Mudou o que esta ficha descreve? Atualize-a no mesmo PR.

## Como funciona hoje

1. **`npm test`** = `node scripts/build-info.ts && node --import tsx --test tests/*.test.ts`. O primeiro passo gera `src/shared/build-info.json` (necessário porque `releases.ts` o importa). Sem navegador, sem banco. Neste checkout `node_modules` não existia, então a suíte **não foi executada** na leitura (os 39 arquivos falharam por falta de dependências; não é falha do código).
2. **Servidor real.** `server.test.ts` (2720 linhas, 32 casos) importa `createApp`/`readConfig`, sobe em porta efêmera e conecta `socket.io-client`. Cobre token, origem, rate limit, reentrada após reinício, TURN (estático, HMAC, Cloudflare), publicações/assinaturas, widgets, permissões, chat, votação, silenciar para todos, demanda de câmera.
3. **Testes de cliente sem navegador.** Alguns arquivos rodam o `Controller` real contra servidor real (`recovery`, `room-lock-client`, `room-credential-client`, `voice-block`, `video-demand`, `desktop-swap`) usando mídia/DOM simulados; outros testam funções puras (posição, layout, paletas).
4. **BrowserLab (`npm run test:media`).** `tests/media-runner.ts` chama `readConfig` com `ENABLE_TEST_LAB=1` e `NODE_ENV=development`, sobe `createApp(config, true)` (Vite em middleware) em `0.0.0.0:PORT` e imprime `http://localhost:PORT/qa`. A pessoa abre no navegador e clica **Executar testes de mídia**. O cliente só monta o laboratório com `import.meta.env.DEV` e rotas `/qa`, `/qa-layout`, `/qa-watch`, `/qa-switch` (`src/client/main.tsx`), e `mountLab` ainda exige `/api/config` com `testLab: true`. Produção recusa `ENABLE_TEST_LAB=1` (`config.ts`) e o build não inclui o laboratório (DEPLOY.md).
5. **O que cada Lab prova** (mídia sintética de `synthetic.ts`: canvas `captureStream(30)` 1280×720 + oscilador 220 Hz; nunca pede câmera/microfone):
   - `BrowserLab.tsx` (708 linhas, `/qa`): três `Controller`s com sessões independentes, publicações de tela (inclui 2 telas extras), assinaturas e fluxo de mídia; embute `FeatureLab`, `ScreenAudioLab` e `PreferencesLab`. O resultado sai em JSON para guardar.
   - `FeatureLab.tsx`: Web Audio real com tom gerado; rejeição de ajuste automático (AGC) sem fingir sucesso; mutação de `Peers.ontrack`.
   - `ScreenAudioLab.tsx`: componente `ScreenAudio` real, áudio da transmissão e volume geral (2.6.0).
   - `PreferencesLab.tsx`: controllers de produção, sons e identidade (2.6.0).
   - `LayoutLab.tsx` (`/qa-layout`): presença real, vídeo sintético local, sem permissões de dispositivo.
   - `WatchLab.tsx` (`/qa-watch`): renderização local de vídeo sintético; sinalização real; o próprio código diz que **não** prova transporte WebRTC remoto.
   - `RoomSwitchLab.tsx` (`/qa-switch`): segura o ACK do primeiro `join` para testar troca de sala.
6. **`ci.yml`** (gatilhos: `pull_request` e `push` na `main`; `concurrency` cancela execução anterior do mesmo ref; `permissions: contents: read`; job `check` em `ubuntu-latest`, `timeout-minutes: 15`). Passos: checkout v4 → setup-node v4 (Node 24, cache npm) → `npm ci` → `npm run typecheck` → `npm test` → `npm audit --omit=dev --audit-level=high` → `npm run build` → `git diff --exit-code -- CHANGELOG.md`. Não publica nada.
7. **`windows.yml`** (job `installer`, `windows-latest`, 40 min). Gatilhos: `workflow_dispatch`; `push` na `main` e `pull_request` **filtrados por paths** (`src-tauri/**`, `src/client/**`, `src/shared/**`, `scripts/build-desktop.mjs`, `package.json`, lockfile, o próprio workflow; não inclui `scripts/desktop-channel.mjs`, ver [10](10-app-windows.md), 10.4); `push` de tags `v*` (sem filtro de path). Passos: Node 24, Rust stable + `rust-cache`, `npm ci`, `npm run build` (gera `source.tar.gz` que vai no instalador), `build:desktop`, `desktop-channel.mjs config`, `cargo test --locked`, testes `--ignored` de captura (`native_swap`, `audio_swap`: obrigatórios; `native_capture_cpu`, `window_capture_cpu`, `thumbnails_speed`, `sound_sources`, `store_app_name`: `continue-on-error`), `tauri build --bundles nsis`, upload do artefato `VIO-Windows-x64` (retenção 14 dias).
8. **O que publica.** Variável `PUBLISH` é `true` em dois casos: repositório `Fernando-Nine/VIO` com tag `v*` (canal `stable`), ou `Fernando-Nine/VIO_TEST` em push na `main` (canal `beta`, não em PR). Só então assina com `TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)` e publica em `Fernando-Nine/vio-releases` com `VIO_RELEASES_TOKEN`: stable cria release `vX.Y.Z` (latest); beta mantém a release `beta` (pré-release), sobe instalador antes do feed e apaga instaladores antigos. Sem token ou assinatura: aviso e sai com sucesso (nada publicado). O cancelamento por `concurrency` só vale para PR, para nunca interromper uma publicação.
9. **Auto-merge e regras de PR** (ADRs 011–013, CLAUDE.md): um branch curto por tarefa → PR no VIO_TEST com `Closes #N` → auto-merge squash ativado → o agente encerra sem esperar a CI; se falhar, quem abriu corrige (`subscribe_pr_activity`). Sem revisão humana obrigatória. Antes do push: `npm run typecheck` + testes do que mudou. Travas locais em `.claude/hooks/guard.mjs` (bloqueia `.env`/segredos, force push, push na `main`). Proteção de branch e auto-merge "ficam possíveis" com o repositório público (`handoff/qa.md`); se o ruleset está ativado no GitHub **não é verificável pelo código** (não confirmado).
10. **Prettier.** `prettier` 3.6.2 é devDependency e há `.prettierignore`, mas **não há script** `format`/`lint` no `package.json` e **nenhum passo** na CI. Issue #20 "Prettier na CI" está aberta (ESTADO). Código é formatado à mão/pelo editor.
11. **`npm audit`.** CI: `--omit=dev --audit-level=high` (falha só em vulnerabilidade alta/crítica de dependência de produção). Também existe `npm run audit:production` (`npm audit --omit=dev`, qualquer nível).
12. **Etiquetas.** `.github/labels.yml` é a fonte das etiquetas (nome, cor, descrição); `.github/workflows/labels.yml` as cria ou atualiza com o `gh` do runner em push na `main` que o altera ou por `workflow_dispatch`, sem apagar as que não estão no arquivo.
13. **Casos de borda:** `server.test.ts` usa portas efêmeras; testes de CHANGELOG dependem de `npm run build` na CI; `release-notes.test.ts` valida o formato de `changes/` (um parágrafo, nome `<issue>-<slug>.md`, ignora README).
14. **Vitrine (`npm run test:vitrine`, #269).** Página de laboratório `/qa-vitrine?caso=<id>` (`tests/VitrineLab.tsx`, só com `ENABLE_TEST_LAB` e em dev) que monta cada widget pequeno e grande, as 7 abas de Ajustes, 3 diálogos, balões e o início, com 3 `Controller`s reais (Ana, Bia, Caio) e mídia sintética, sem mídia real. `tests/vitrine/vitrine.spec.ts` (Playwright 1.63.0, fixado na versão do Chromium local) abre cada caso em 5 telas (360x640, 390x844, 768x1024, 1280x720, 1920x1080; 37 casos x 5 = 185 testes) e confere: rolagem horizontal, elemento fora da janela, cortado pelo contêiner, texto cortado, sobreposição de interativos e alvo pequeno (mínimo 44 px em tela de toque, 24 px no desktop, WCAG 2.5.8). Depois compara `toHaveScreenshot` com a base em `tests/vitrine/base/` (`maxDiffPixelRatio` 0,002; vídeo, relógio e código da sala mascarados). O servidor sobe por `tests/vitrine/servidor.ts` (porta 4173, `TRUST_PROXY=1` e `x-forwarded-for` por teste para não bater no limite de entradas por IP). Quebras reais ficam em `tests/vitrine/conhecidos.ts` com o número da issue (apague a entrada ao corrigir); exceções de alvo em `EXCECOES`. Tamanho mínimo da janela (#356): `TAMANHO_MINIMO_DA_JANELA` em `tests/vitrine/config.ts`. Local: `VITRINE_CHROMIUM=<caminho do chromium>` (ou `npx playwright install chromium`); `VITRINE_ACHADOS=<arquivo>` só levanta achados em JSON, sem asserts; `-- --update-snapshots` refaz a base. Cerca de 3 min com 4 workers.
15. **`vitrine.yml`.** `pull_request` filtrado por paths (`src/client/**`, `src/shared/**`, `tests/vitrine/**`, `tests/VitrineLab.tsx`, `playwright.config.ts`, o workflow), `workflow_dispatch` com `update_snapshots` (anexa a base nova como artefato `vitrine-base`). Node 24, `npx playwright install --with-deps chromium`, `npm run test:vitrine -- --trace off`, 2 workers, `timeout-minutes: 25`. Em falha, artefato `vitrine-diff` (atual, esperado e diferença; 14 dias).

## Arquivos de teste (`tests/*.test.ts`)

| Arquivo | Cobre |
| --- | --- |
| `server.test.ts` | Servidor real: tokens, origem, limites, salas, publicações (até 3 telas), widgets, permissões, chat, votação, TURN, reentrada |
| `recovery.test.ts` | Reconexão automática >8 tentativas, reentrada após reinício, cancela ao sair |
| `room-credential.test.ts` / `-client.test.ts` | Credencial de criador (HMAC, validade) e guarda no cliente |
| `room-lock.test.ts` / `-client.test.ts` | Sala trancada, convite assinado (1 h/1 d/7 d), espera e aceite |
| `room-door.test.ts` | Validade do convite lida do token (#260) |
| `canvas.test.ts` | Arraste, slots, layout do canvas (27 casos) |
| `grid-merge.test.ts`, `slot-spans.test.ts`, `strip-input.test.ts` | Mesclas na grade, vãos retangulares, roda da tira |
| `floating-position.test.ts`, `popover-position.test.ts`, `screen-layout.test.ts` | Posição de flutuante, popover nas bordas, janelas na área útil |
| `video-quality.test.ts`, `share-options.test.ts`, `codecs.test.ts` | Altura 240p–2160p, qualidade/fps de compartilhamento, H.264 por hardware primeiro |
| `video-demand.test.ts`, `watching.test.ts` | Pausa só do sender de vídeo, assistir explícito |
| `audio-output.test.ts`, `desktop.test.ts`, `desktop-swap.test.ts`, `voice-block.test.ts` | Saída de áudio, fila AudioWorklet 48→44,1 kHz, troca tela/janela/tela, voz bloqueada |
| `cameras.test.ts`, `volume-slider.test.ts` | Destaque após 1,5 s de fala, setas do volume |
| `widget-close.test.ts`, `widget-timer.test.ts`, `room-modules.test.ts`, `room-content.test.ts`, `notes.test.ts`, `dice-face.test.ts` | Fechar/desfazer widget, cronômetro, dados/Fate, conteúdo "Para a sala", notas |
| `palettes.test.ts`, `preferences.test.ts`, `catalog-search.test.ts`, `recent-rooms.test.ts`, `toasts.test.ts` | Paletas e contraste AA, preferências, busca no catálogo, salas recentes (máx. 12), fila de avisos |
| `features.test.ts`, `limits.test.ts`, `release-notes.test.ts` | Ping, rate limit, notas de `changes/` |

## Números

| Parâmetro | Valor | Onde |
| --- | --- | --- |
| Arquivos `*.test.ts` / casos `test(` | 39 / 163 | `tests/` |
| Maior arquivo | `server.test.ts`, 2720 linhas | `tests/` |
| Timeout do job `check` / `installer` | 15 min / 40 min | `ci.yml`, `windows.yml` |
| Nível do audit na CI | high, só produção | `ci.yml` |
| Espera padrão do BrowserLab (`until`) | 20 s | `tests/BrowserLab.tsx` ~L15 |
| Vídeo sintético | 1280×720 tela, 640×360 câmera, 30 fps de captura, redesenho a cada 33 ms | `tests/synthetic.ts` |
| Retenção do artefato Windows | 14 dias | `windows.yml` |
| Vitrine: casos x telas / tempo local / timeout do job | 37 x 5 = 185 / ~3 min / 25 min | `tests/vitrine/`, `vitrine.yml` |
| Testes Rust | 20 marcadores `#[test]`/`#[ignore]` em 5 arquivos (contagem aproximada) | `src-tauri/src/*.rs` |

## Peças e técnicas

| Peça/técnica | Para que | Onde |
| --- | --- | --- |
| `node:test` + `node:assert/strict` | Runner nativo, sem Jest/Vitest | `tests/*.test.ts` |
| `tsx` (`--import tsx`) | Rodar TypeScript direto | `package.json` |
| Servidor real + `socket.io-client` | Teste de integração sem mocks de rede | `server.test.ts` |
| Mídia sintética (`canvas.captureStream`, `OscillatorNode`) | Provar WebRTC sem câmera/microfone | `tests/synthetic.ts` |
| Laboratório em página dev (Vite middleware) | Bancada manual no navegador real | `media-runner.ts`, `main.tsx` |
| `actions/checkout@v4`, `setup-node@v4` (cache npm), `upload-artifact@v4`, `dtolnay/rust-toolchain`, `Swatinem/rust-cache@v2` | CI | workflows |
| `cargo test --locked` e `--ignored` | Testes nativos Windows e desempenho de captura (runner sem GPU, WARP) | `windows.yml` |
| `npm audit` | Vulnerabilidade de dependência | `ci.yml` |
| Auto-merge squash + `Closes #N` | Entrega sem esperar CI no chat | ADR 013 |

## Mercado (pesquisa nov 2026)

Comparado: como o VIO testa contra o que se usa em 2026 para WebRTC no navegador, formatação,
cobertura, acessibilidade e carga.

| Método do mercado | Resolve | No VIO | Custo | Recomendação |
| --- | --- | --- | --- | --- |
| Playwright com mídia falsa (`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`, `--use-file-for-fake-video-capture` com arquivo y4m) | Prova automática de chamada e tela entre dois navegadores | não | dependência nova | adotar, com aval do usuário (#22) |
| Prettier na CI (`prettier --check`) | Formatação conferida sem depender de quem lembra | parcial: o Prettier existe, mas não roda na CI | código nosso | adotar (#20) |
| Cobertura nativa do Node (`node --test --experimental-test-coverage`) | Saber o que nenhum teste toca | não | código nosso | depois |
| axe-core + Playwright | Acessibilidade conferida a cada PR | não | dependência nova | depois |
| Carga e rede ruim (Artillery, k6, `tc netem`) | Saber quantas salas o servidor aguenta e como a mídia reage a perda | não | código nosso | depois |

**Fontes:** https://helpmetest.com/blog/webrtc-testing-playwright/ ·
https://playwright.dev/docs/accessibility-testing · cobertura nativa, k6, Artillery e
`tc netem`: conhecimento geral.

## Achados

| ID | Achado | Tipo | Confiança | Onde |
| --- | --- | --- | --- | --- |
| 11.1 | Nenhum teste automático prova mídia real entre navegadores (#22): `BrowserLab`, `WatchLab` e `ScreenAudioLab` só rodam por `npm run test:media`, fora da CI. Regressão de WebRTC só aparece na prévia. | lacuna | alta | `tests/BrowserLab.tsx`; `tests/media-runner.ts`; `.github/workflows/ci.yml` |
| 11.2 | `check-deployment.mjs` não roda na CI (#21) e hoje falharia no `sw.js` ([09](09-hospedagem-deploy-release.md), 09.1). | lacuna | alta | `scripts/check-deployment.mjs` |
| 11.3 | O Prettier não é conferido na CI nem tem script (#20). | lacuna | alta | `package.json`; `ci.yml` |
| 11.4 | Sem cobertura de código medida e sem teste de acessibilidade ou entre navegadores; o visual e o layout da interface passam a ter a vitrine (item 14), só em Chromium. | lacuna | alta | repositório |
| 11.5 | Os testes de desempenho da captura nativa rodam com `continue-on-error`: regressão de CPU não quebra a CI. | risco | média | `.github/workflows/windows.yml` (~L71) |
| 11.6 | `docs/VALIDACAO.md` (622 linhas) é diário histórico por rodada (2.0.0 a 2.7.0-rc.5; fala em "74 testes"), não a suíte de hoje: 163 casos em 39 arquivos. O "Roteiro manual" (`ENABLE_TEST_LAB=1 npm run test:media`) segue válido. | doc desatualizado | alta | `docs/VALIDACAO.md` |
| 11.7 | `server.test.ts` concentra 32 casos em 2720 linhas: difícil achar e rodar um caso isolado. | risco | média | `tests/server.test.ts` |

## Perguntas em aberto

- Quais regras de branch (ruleset) e de auto-merge estão ativas no GitHub? Não aparecem no
  repositório, e as decisões 011–013 só descrevem o fluxo.
- Quantos testes Rust existem de fato? A contagem por `grep` é aproximada.
