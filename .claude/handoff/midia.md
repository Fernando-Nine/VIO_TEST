# Mídia — handoff
Atualizado: 2026-10-25

## Agora
App Windows com áudio por aplicativo (WASAPI) na `main` (#120). Aguarda teste do usuário
(roteiro no PR #120; precisa de `ALLOWED_APP_ORIGINS=https://tauri.localhost` no Render da prévia).

## Feito recentemente
- #100: casca Tauri 2 + updater + workflow `windows.yml` (artefato `VIO-Windows-x64`).
- #120: interface empacotada (`npm run build:desktop`, `https://tauri.localhost`); WASAPI
  em Rust (`src-tauri/src/capture.rs`, crate `windows` 0.62); 5 comandos IPC só para a
  janela local; `src/client/desktop/` (painel, worklet PCM, ponte); CORS do `/api` para
  `ALLOWED_APP_ORIGINS`. Valida `cargo check --target x86_64-pc-windows-msvc` num crate
  de teste só com `windows` (o container não compila o app inteiro p/ Windows).
- #122: comentei o que a Mídia precisa (parar o mic e não republicar quando bloqueado).

## Decisões
- Canais (aprovados pelo copiloto): **VIO** (estável, vio-quest) sai da CI do **VIO** na tag
  `vX.Y.Z`, chave de produção só no VIO (a chave já entregue ao usuário). **VIO Teste**
  (beta, vio-test) sai da CI do VIO_TEST a cada merge, com chave nova de teste.
  Identificadores diferentes, outro ícone/selo; cada um lê seu canal e nunca instala o outro.
- Dependências aprovadas: `@tauri-apps/cli`, `tauri`, `tauri-plugin-updater`, `windows`
  (+ `windows-core`, `serde`, `serde_json`).

## Pendente / bloqueios
- **Próxima tarefa (canais):** workflow escolhe canal por repositório/evento; versão beta
  `<versão>-rc.N.<run_number>`; release fixo `beta` em `vio-releases` com `beta.json`
  substituído; estável em `releases/latest` → `latest.json`; URL/identificador/CSP/updater
  por canal (hoje fixos na prévia em `tauri.conf.json`, `shell.rs`, `build-desktop.mjs`);
  `docs/WINDOWS-RELEASE.md` com nomes exatos dos secrets: `TAURI_SIGNING_PRIVATE_KEY`,
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `VIO_RELEASES_TOKEN` (fine-grained, escrita só no
  vio-releases). Gerar par de teste e entregar ao usuário; pubkey por canal.
- #122: implementar no cliente após contrato do Backend (PR #126).
- Issues da área: #23 (upload N×), #24 (AudioContext compartilhado), #25 (TURN).
- Links externos não abrem no app; janela flutuante (PiP) do ramo antigo não portada.

## Próximo passo
Implementar os canais do app Windows (acima).
