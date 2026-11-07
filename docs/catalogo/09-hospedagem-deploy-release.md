# 09 — Hospedagem, deploy, build e release

> **Resumo:** Um único processo Node (Express 5 + Socket.IO) serve cliente, API e sinalização. Roda no Render
> (plano Free, 1 instância, Virginia) com deploy automático da `main`, ou em Docker/Node próprio. `npm run build`
> compila cliente (Vite) e servidor (esbuild), gera o `CHANGELOG.md` e empacota o código-fonte AGPL em `dist/source.tar.gz`.
> A versão vive em `src/shared/releases.ts`; PRs comuns só criam `changes/<issue>-<slug>.md`. Produção (VIO) recebe o mesmo código da prévia (VIO_TEST) por PR de release e tag.
>
> **Arquivos-chave:** `render.yaml` (Blueprint), `Dockerfile`, `compose.yaml`, `scripts/build.mjs` (build e tar), `scripts/build-info.ts` (notas, commit, CHANGELOG), `src/shared/releases.ts` (versões), `src/shared/legacy-releases.json` (histórico VIO_2), `scripts/check-deployment.mjs` (checagem pós-deploy), `scripts/desktop-channel.mjs` (canais do app Windows), `scripts/build-desktop.mjs`, `vite.config.ts`, `tsconfig.json`.
>
> **Docs:** `docs/DEPLOY.md`, `docs/RELEASE.md`, `changes/README.md`, `docs/WINDOWS-RELEASE.md`, `docs/TURN.md`, ADR 005 (segurança direto à produção), 011, 015 (notas por arquivo).
>
> **Retrato:** commit `8bdc516` (5 nov 2026). Mudou o que esta ficha descreve? Atualize-a no mesmo PR.

## Como funciona hoje

1. **Render (prévia).** `render.yaml` define o serviço `vio-test`: `runtime: node`, `plan: free`, `region: virginia`, `numInstances: 1`, build `npm ci --include=dev && npm run build`, start `npm start`, `healthCheckPath: /healthz`. A `main` do VIO_TEST faz deploy automático (CLAUDE.md). Produção é outro serviço (`vio-quest.onrender.com`) no repositório VIO; o `render.yaml` daqui só descreve o `vio-test` (o do VIO não foi lido, não confirmado).
2. **Variáveis do Render** (`render.yaml` › `envVars`): `NODE_VERSION=24.19.0`, `NODE_ENV=production`, `SESSION_SECRET` com `generateValue: true`, `TRUST_PROXY=1`, `WEB_CONCURRENCY=1`, `MAX_ROOMS=200`, `STUN_URLS=stun:stun.l.google.com:19302`, `ENABLE_TEST_LAB=0`. TURN (`TURN_URLS`/`TURN_SECRET`) é opcional e vai nos segredos do serviço. A origem permitida vem de `RENDER_EXTERNAL_URL` (`src/server/config.ts` › `readConfig` ~L55); `ALLOWED_ORIGINS` só para domínio extra.
3. **Instância única obrigatória.** Estado das salas é em memória. `readConfig` recusa `WEB_CONCURRENCY` diferente de 1 (`config.ts` ~L153). Sem autoscaling. Reinício derruba salas; clientes reentram e republicam (teste `recovery.test.ts`).
4. **Health check.** `GET /healthz` devolve `{ ok: true, version }` (`src/server/app.ts` ~L71). Usado pelo Render e pelo `HEALTHCHECK` do Dockerfile.
5. **Sono / cold start.** Plano Free suspende após 15 min sem tráfego; retomada leva cerca de 1 min (`docs/DEPLOY.md`, dado do Render de 15/09/2026, não verificado aqui). `check-deployment.mjs` tolera isso: `/healthz` com timeout de 75 s, demais rotas 20 s. Free também tem 750 h/mês por workspace e disco efêmero.
6. **Encerramento.** SIGINT/SIGTERM fecham o servidor; se não terminar em 25 s, `process.exit(1)` (`src/server/index.ts` ~L14). O compose usa `stop_grace_period: 25s` (igual).
7. **Dockerfile** (multi-stage, `node:24.19.0-bookworm-slim`): estágio `build` roda `npm ci --include=dev` e `npm run build`; estágio `runtime` roda `npm ci --omit=dev`, copia só `dist/` e `LICENSE`, `USER node`, `PORT=3000`, `HEALTHCHECK` a cada 30 s (timeout 5 s, start-period 15 s) via `fetch` em `/healthz`, `CMD node dist/server/index.js`. Serve para autohospedagem; o Render **não** usa o Dockerfile (usa runtime `node`).
8. **compose.yaml**: serviço `vio` com `build: .`, `restart: unless-stopped`, `env_file: .env`, `NODE_ENV=production`, `ENABLE_TEST_LAB=0`, porta só em `127.0.0.1:3000:3000` (atrás de proxy TLS), `init: true`. Não é usado em CI nem no Render.
9. **Build (`npm run build`).** `typecheck` (`node scripts/build-info.ts && tsc --noEmit`) e depois `scripts/build.mjs`: força `NODE_ENV=production`; `writeBuildInfo()` gera `src/shared/build-info.json` (não versionado); confere `package.json.version === releases.ts.version` (erro "Sincronize package.json…"); `renderChangelog` escreve `CHANGELOG.md`; `vite build` → `dist/client`; esbuild de `src/server/index.ts` → `dist/server/index.js` (ESM, target node24, bundle com `packages: "external"`, sem sourcemap); `tar -czf dist/source.tar.gz` com uma allowlist explícita.
10. **`dist/`**: `dist/client` (Vite, sem sourcemap), `dist/server/index.js`, `dist/source.tar.gz`. O app Windows usa `dist/desktop` (`build:desktop`).
11. **`source.tar.gz` (AGPL).** A allowlist (`scripts/build.mjs` › `sources`) inclui `src`, `public`, `tests`, `scripts`, `docs`, `changes`, `src-tauri` (src, icons, capabilities, Cargo.toml/lock, build.rs, tauri.conf.json, tauri.updater.json), `.github`, manifests/lockfile, `README`, `CHANGELOG`, `.claude/agents`, `.claude/handoff`, `CLAUDE.md`, `LICENSE`, `render.yaml`, `Dockerfile`, `compose.yaml`, `.dockerignore`, `.env.example`, `.nvmrc`, `.gitignore`. Nunca `.env`. Servido em `GET /source.tar.gz` com nome `vio-<versão>-source.tar.gz` (404 se não existir; `app.ts` ~L169). O Windows embute o mesmo arquivo no instalador. Exige `tar` no PATH (erro em português se faltar).
12. **Vite.** `vite.config.ts`: plugin React, `outDir: dist/client`, sem sourcemap; `server.middlewareMode: true`, `host 0.0.0.0`, `allowedHosts: ["terminal.local"]` (dev; o servidor Express monta o Vite como middleware). **tsconfig**: ES2022, `strict`, `moduleResolution: Bundler`, `jsx: react-jsx`, `noEmit`, inclui `src`, `tests`, `vite.config.ts`.
13. **Versões e notas.** `releases.ts` tem `version` (hoje `2.12.0-rc.6`), `registeredReleases` (lista, mais nova primeiro, seguida de `...legacy` de `legacy-releases.json`), `currentRelease` (= registrada + notas pendentes) e `releases` (o que o app mostra). `buildCommit` só existe em versão com `-` (prévia); vem de `RENDER_GIT_COMMIT` (7 caracteres, `shortCommit`). Notas pendentes: `changes/<issue>-<slug>.md`, um parágrafo (`readPendingNotes` falha com nome fora de `^\d+-[a-z0-9-]+\.md$` ou mais de um parágrafo), ordenadas pelo número da issue, aparecem em "Somente no vio-test" e **não** entram no CHANGELOG.
14. **CHANGELOG.md gerado** por `renderChangelog` só com releases registradas não-legacy, mais o cabeçalho "MUDANÇA DE SISTEMA NA 2.0.0" e o `docs/CHANGELOG-VIO_2.md` inteiro anexado (blob `458665f…` do VIO_2). A CI roda `git diff --exit-code -- CHANGELOG.md`: CHANGELOG desatualizado quebra o PR.
15. **Marca `systemChange` da 2.0.0**: `systemRelease` (`releases.ts` ~L588) tem `systemChange: true`; nunca apagar, nem `legacy-releases.json` (CLAUDE.md).
16. **Fluxo prévia → produção** (`docs/RELEASE.md`, 8 passos): aval do usuário na prévia → QA fecha a prévia (notas de `changes/` vão para `releases.ts`, apaga arquivos, `npm run build`) → no VIO, branch novo, `git rm -rq . && git checkout <sha> -- .`, confere `git write-tree` = tree do `<sha>`; muda só `version`/`currentRelease`, `package.json`, `package-lock.json` (2 linhas), `CHANGELOG.md` → typecheck/test → PR `release: X.Y.Z from VIO_TEST <sha>` → CI (`check` e `installer`, ~12 min) → squash → usuário cria a tag `vX.Y.Z` → fechar issues e atualizar ESTADO. Exceção: hotfix de segurança vai direto (ADR 005). Nunca push direto na `main` do VIO.
17. **`check-deployment.mjs <https-url> [relatório.json]`** (manual, pós-deploy, contra serviço vivo): exige HTTPS; confere `/healthz` 200 + CSP `frame-ancestors 'none'` + HSTS; `/` e `/api/config` (`testLab=false`, `maxParticipants=null`, `recommendedParticipants=6`); `manifest.webmanifest` (standalone, 3 ícones); `/sw.js` (no-cache, javascript, contém `vio-static-<versão>`); `/source.tar.gz` (magic bytes 1f 8b); origem externa em `/api/session` = 403; 3 sessões entram por WebSocket na sala `QA<8 hex>`; `ice` devolve TURN com `?transport=udp` e `tcp` (**falha se TURN não estiver configurado**); 2 publicações, assinatura `main` e roteamento de `signal`. Grava `mediaTransport: "NOT_TESTED"` — não prova mídia. Não roda na CI (issue #21 aberta).
18. **`desktop-channel.mjs`** (app Windows, ver `docs/WINDOWS-RELEASE.md`): dois canais. `stable` = "VIO", id `studio.nerdquest.vio`, servidor `vio-quest.onrender.com`, tag `v<versão>`, feed `latest.json`, instalador `VIO-x64-setup.exe`. `beta` = "VIO Teste", id `studio.nerdquest.vio.test`, servidor `vio-test.onrender.com`, tag `beta`, feed `beta.json`, instalador `VIO-Teste-<versão>-x64-setup.exe` (mais a cópia de nome fixo `VIO-Teste-x64-setup.exe`, usada pelo botão Baixar da landing). Comandos `config` (gera `src-tauri/tauri.channel.json` com nome, id, CSP do host, ícone, chave pública e endpoint do updater), `manifest` (feed do updater com assinatura), `get`. Versão beta ganha o número da execução: `2.12.0-rc.6` → `2.12.0-rc.6.<run>`; sem pré-release → `-rc.0.<run>`. Tag `refs/tags/vX` que não bata com `package.json` aborta. `build-desktop.mjs` compila o cliente com `VITE_DESKTOP=1`, `VITE_API_BASE`/`VITE_WEB_URL` = servidor do canal, em `dist/desktop`.

## Números

| Parâmetro | Valor | Onde |
| --- | --- | --- |
| Node | 24.19.0 (`engines` `>=24 <25`; `.nvmrc` 24) | `render.yaml`, `Dockerfile`, `package.json` |
| Plano / região / instâncias | Free / virginia / 1 | `render.yaml` |
| Suspensão Free | 15 min sem tráfego; retomada ~1 min | `docs/DEPLOY.md` |
| Timeout `/healthz` na checagem | 75 s (demais 20 s; comandos de socket 10 s) | `check-deployment.mjs` |
| Encerramento forçado | 25 s | `src/server/index.ts`, `compose.yaml` |
| HEALTHCHECK Docker | 30 s / 5 s / start 15 s | `Dockerfile` |
| MAX_ROOMS | 200 (Render e padrão; faixa 1–10000) | `render.yaml`, `config.ts` ~L171 |
| Porta | 3000 (Docker/dev); Render fornece `PORT` (10000 segundo DEPLOY.md) | `Dockerfile`, `docs/DEPLOY.md` |
| CI timeout | 15 min (`check`), 40 min (`installer`) | workflows |
| Itens no tar | 30 entradas na allowlist | `build.mjs` |

## Peças e técnicas

| Peça/técnica | Para que | Onde |
| --- | --- | --- |
| Render Blueprint (`render.yaml`), runtime node, `generateValue` para segredo | Deploy da prévia com segredo gerado | `render.yaml` |
| Docker multi-stage + `npm ci --omit=dev` + `USER node` | Imagem enxuta e sem root | `Dockerfile` |
| Vite 8 + `@vitejs/plugin-react` | Bundle do cliente | `vite.config.ts` |
| esbuild com `packages: "external"` | Bundle do servidor ESM, deps ficam em `node_modules` | `scripts/build.mjs` |
| Node executando `.ts` direto (`node scripts/build-info.ts`) | Scripts de build sem transpilar (type stripping do Node 24) | `package.json` scripts |
| `build-info.json` gerado, importado como JSON | Commit curto e notas pendentes no app | `build-info.ts`, `releases.ts` |
| `tar -czf` com allowlist | Código-fonte AGPL no próprio site e no instalador | `build.mjs` |
| `RENDER_GIT_COMMIT`, `RENDER_EXTERNAL_URL` | Commit do build e origem permitida | `build-info.ts`, `config.ts` |
| Tauri updater (minisign `.sig`, feed JSON) e `gh release` em `Fernando-Nine/vio-releases` | Atualização do app Windows | `desktop-channel.mjs`, `windows.yml` |
| Socket.IO client em script Node | Checagem fim a fim sem navegador | `check-deployment.mjs` |

## Mercado (pesquisa nov 2026)

Comparado: hospedagem grátis, alternativas e observação do serviço contra a documentação do
Render e comparativos de 2026. Opções pagas ficam para quando o VIO gerar receita ou abrir ao
público (decisão do usuário).

| Método do mercado | Resolve | No VIO | Custo | Recomendação |
| --- | --- | --- | --- | --- |
| Render Free: 750 h/mês por workspace, divididas entre os serviços; dorme após 15 min sem tráfego de entrada (HTTP e mensagens de WebSocket contam); ~1 min para acordar; esgotadas as horas, todos os serviços Free do workspace param até o mês seguinte | Hospedagem grátis com deploy automático da `main` | sim | grátis | manter |
| VM grátis própria (Oracle Cloud Always Free: ARM com 4 núcleos e 24 GB) | Servidor que não dorme e sem teto de horas | não | grátis, com mais manutenção | depois |
| Koyeb, Fly.io, Cloud Run, Railway | Outras hospedagens gerenciadas | não | grátis limitado ou pago | não vale agora |
| Cloudflare Workers + Durable Objects | Salas na borda da rede, com estado durável | não | grátis limitado / pago | não vale: exigiria reescrever `rooms.ts` |
| Erros e disponibilidade auto-hospedados (GlitchTip, Uptime Kuma) | Saber de erro e de queda sem abrir log | parcial: `/healthz` e logs JSON | código nosso + servidor | depois |

Cuidado: manter o serviço acordado com ping no `/healthz` gasta as 750 h. Dois serviços sempre
acordados no mesmo workspace somam ~1.488 h/mês e passam do teto. Se o VIO e o VIO_TEST dividem
o workspace não está confirmado.

**Fontes:** https://render.com/docs/free ·
https://livemy.app/blog/free-hosting-that-doesnt-sleep (fonte fraca) ·
https://dev.to/selfhostingsh/glitchtip-vs-sentry-206o · Durable Objects: conhecimento geral.

## Achados

| ID | Achado | Tipo | Confiança | Onde |
| --- | --- | --- | --- | --- |
| 09.1 | `public/sw.js` fixa `CACHE = "vio-static-2.6.0"`, mas `check-deployment.mjs` exige `vio-static-<versão atual>` no `sw.js` (~L81). Nada reescreve o arquivo no build: a checagem falha em qualquer versão diferente de 2.6.0, e ninguém percebe porque o script não roda na CI ([11](11-testes-e-ci.md), 11.2). O cache fixo também acumula arquivos velhos ([07](07-cliente-e-interface.md), 07.3). | bug | alta | `public/sw.js` (L2); `scripts/check-deployment.mjs` (~L81) |
| 09.2 | `check-deployment.mjs` exige TURN configurado (`ice.turn === true`, ~L118): contra a prévia sem TURN, falha. Só serve onde há TURN. | risco | média | `scripts/check-deployment.mjs` (~L118) |
| 09.3 | Nenhuma CI constrói a imagem Docker: `Dockerfile` e `compose` nunca são validados (o próprio `DEPLOY.md` diz que o build do Docker não foi executado). | lacuna | alta | `.github/workflows/ci.yml`; `Dockerfile` |
| 09.4 | A release para o VIO depende de 8 passos humanos (`git rm -rq . && git checkout <sha> -- .`); só `git write-tree` confere que o código é o mesmo. Nenhum script automatiza nem verifica. | risco | média | `docs/RELEASE.md` |
| 09.5 | `docs/DEPLOY.md` é histórico: narra a criação em 16 set 2026 (commit `569537a`, ids de serviço, "VIO_TEST privado", hoje público) e cita `/qa`, serviços VIO_2 e a porta 10000. Não fala dos canais do Windows, de `changes/` nem do `/healthz` com `{ok, version}`. | doc desatualizado | alta | `docs/DEPLOY.md` |

Conferido e **ok**: `render.yaml` põe `ENABLE_TEST_LAB=0` e `readConfig` recusa `1` em produção;
o `Dockerfile` não traz `SESSION_SECRET` (vem do `.env` do compose) e, sem ele, o container
aborta, como deve (`config.ts` ~L157).

## Perguntas em aberto

- O `render.yaml` do repositório VIO (produção) é idêntico ao daqui, e a produção usa TURN?
- A produção roda no plano Free? O `ESTADO.md` diz que os dois ambientes rodam no Render Free; o
  `render.yaml` do VIO não foi lido para confirmar.
- Porta real no Render: o `DEPLOY.md` diz 10000; o código lê `process.env.PORT` (padrão não
  conferido).
