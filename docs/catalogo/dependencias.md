# Dependências (package.json e src-tauri/Cargo.toml)

Retrato do commit `8bdc516` (5 nov 2026). Versões como declaradas (`^` = faixa; sem `^` = fixa). Versão resolvida: ver `package-lock.json` e `src-tauri/Cargo.lock`.

## Node — `dependencies`

| Pacote | Versão | Para que serve no VIO | Onde (arquivo principal) | Camada |
| --- | --- | --- | --- | --- |
| `express` | ^5.1.0 | Servidor HTTP, rotas `/api/*`, `/healthz`, estáticos | `src/server/app.ts` | servidor (runtime) |
| `helmet` | ^8.1.0 | Cabeçalhos de segurança e CSP | `src/server/app.ts` | servidor |
| `proxy-addr` | ^2.0.8 | IP real do cliente com `trust proxy` explícito (limites por IP) | `src/server/app.ts` | servidor |
| `socket.io` | ^4.8.1 | Sinalização e comandos em tempo real | `src/server/app.ts`, `rooms.ts` | servidor |
| `socket.io-client` | ^4.8.1 | Cliente do socket; também em `check-deployment.mjs` e testes | `src/client/room/controller.ts` | cliente (e scripts/testes) |
| `zod` | ^4.6.7 | Contrato e validação `.strict()` de todo payload | `src/shared/protocol.ts` | compartilhado (servidor e cliente) |
| `react` | 19.3.0 | Interface | `src/client/main.tsx` | cliente |
| `react-dom` | 19.3.0 | Renderização da interface | `src/client/main.tsx` | cliente |
| `lucide-react` | ^1.31.0 | Ícones | `src/client/components/*.tsx` (ex.: `Landing.tsx`) | cliente |
| `@dnd-kit/react` | 0.5.0 | Arrastar widgets no canvas | `src/client/canvas/RoomCanvas.tsx`, `WidgetFrame.tsx` | cliente |
| `@fontsource-variable/bricolage-grotesque` | ^5.3.0 | Fonte da interface | `src/client/main.tsx` | cliente (CSS/fonte embutida) |
| `@fontsource/ibm-plex-mono` | ^5.2.0 | Fonte de código da sala, ping, números | `src/client/main.tsx` | cliente |

Observação: `react`, `react-dom`, `lucide-react`, `@dnd-kit/react` e fontes estão em `dependencies` mas são empacotados pelo Vite em `dist/client`; o servidor (`esbuild` com `packages: external`) só carrega em runtime express, helmet, proxy-addr, socket.io e zod. A imagem Docker instala todas via `npm ci --omit=dev`.

## Node — `devDependencies`

| Pacote | Versão | Para que serve | Onde | Camada |
| --- | --- | --- | --- | --- |
| `vite` | 8.3.0 | Build do cliente e servidor de dev (middleware) | `vite.config.ts`, `scripts/build.mjs` | build/dev |
| `@vitejs/plugin-react` | ^6.0.2 | Plugin React do Vite | `vite.config.ts` | build |
| `esbuild` | ^0.28.2 | Empacota o servidor em `dist/server/index.js` | `scripts/build.mjs` | build |
| `typescript` | ~5.9.3 | Verificação de tipos (`tsc --noEmit`) | `tsconfig.json` | build/CI |
| `tsx` | ^4.20.5 | Roda `.ts` em `npm run dev` e nos testes | `package.json` scripts | dev/teste |
| `@playwright/test` | 1.63.0 (fixa) | Vitrine: checagens de layout e capturas em 5 telas | `playwright.config.ts`, `tests/vitrine/` | dev/teste (CI instala o Chromium) |
| `prettier` | 3.6.2 | Formatação (sem script nem passo na CI) | `.prettierignore` | dev |
| `@tauri-apps/cli` | ^2.12.4 | `tauri build` do instalador Windows | `.github/workflows/windows.yml` | build (desktop) |
| `@types/express` | ^5.0.3 | Tipos | `src/server/app.ts` | tipos |
| `@types/node` | ^24.0.0 | Tipos do Node | todo o servidor | tipos |
| `@types/proxy-addr` | ^2.0.3 | Tipos | `src/server/app.ts` | tipos |
| `@types/react` | ^19.2.0 | Tipos | `src/client/` | tipos |
| `@types/react-dom` | ^19.2.0 | Tipos | `src/client/main.tsx` | tipos |

Motor: `engines.node` `>=24 <25`. Nenhum pacote do cliente de teste (Jest, Playwright etc.); testes usam `node:test`.

## Rust — `src-tauri/Cargo.toml` (`vio-desktop` 0.0.0, edition 2021, rust-version 1.85, AGPL-3.0-only)

Tudo em `[target.'cfg(windows)'.dependencies]`, exceto `tauri-build`. Só o app Windows; nada do servidor web.

| Crate | Versão | Para que serve | Onde | Camada |
| --- | --- | --- | --- | --- |
| `tauri-build` | 2 | Gera permissões/comandos no build (`AppManifest::commands`) | `src-tauri/build.rs` | build |
| `tauri` | 2 | Casca nativa, janela WebView2, comandos | `src-tauri/src/shell.rs` | runtime desktop |
| `tauri-plugin-updater` | 2 | Atualização automática pelo feed do canal | `src-tauri/src/shell.rs` (uso exato não confirmado) | runtime desktop |
| `serde` | 1 (derive) | Serialização dos comandos/mensagens | `shell.rs`, `capture.rs`, `stream.rs`, `video.rs` | runtime desktop |
| `serde_json` | 1 | JSON das mensagens com a página | `shell.rs`, `capture.rs` | runtime desktop |
| `webview2-com` | 0.39 | API WebView2 (SharedBuffer para quadros de tela nativos) | `shell.rs`, `stream.rs` | runtime desktop |
| `windows-core` | 0.62 | Tipos base do binding Windows | `src-tauri/src/` (uso exato não confirmado) | runtime desktop |
| `windows` | 0.62 | APIs do Windows (ver features) | `capture.rs`, `duplication.rs`, `printwindow.rs`, `programs.rs`, `stream.rs`, `video.rs` | runtime desktop |

Features de `windows` (27, `Cargo.toml`): `Foundation`, `Graphics_Capture`, `Graphics_DirectX_Direct3D11`, `Security_Authorization_AppCapabilityAccess`, `Wdk_System_SystemServices`, `Win32_Foundation`, `Win32_Graphics_{Direct3D, Direct3D11, Dwm, Dxgi, Dxgi_Common, Gdi}`, `Win32_Media_Audio`, `Win32_Security_Cryptography`, `Win32_Storage_{FileSystem, Packaging_Appx, Xps}`, `Win32_System_{Com, Com_StructuredStorage, Diagnostics_ToolHelp, SystemInformation, Threading, Variant, WinRT_Direct3D11, WinRT_Graphics_Capture}`, `Win32_UI_{Shell, WindowsAndMessaging}`. Em ordem de uso: captura de tela (Graphics Capture, DXGI duplication, PrintWindow), áudio por processo (`Win32_Media_Audio`), lista de programas e nomes da Store (`Appx`, `ToolHelp`), conversão NV12 na GPU (Direct3D11).

Perfil `release`: `lto = true`, `codegen-units = 1`, `strip = true`, `panic = "unwind"` (um pânico em thread de captura encerra só aquela captura, #246). `webview2-com` e `windows-core` aprovados em 2026-10-27 (#192, comentário no Cargo.toml).

## Achados

- `proxy-addr` e `@types/proxy-addr` entram só no servidor; confere com `app.ts` L3.
- `prettier` em `devDependencies` sem script ou CI (ver 11).
- `@tauri-apps/cli` está no `package.json` do projeto web, mas só o job Windows o usa.
- Versões do `package.json` são faixas (`^`); `npm ci` fixa pelo `package-lock.json`. `react`, `react-dom`, `vite`, `prettier`, `@dnd-kit/react` estão fixos.
