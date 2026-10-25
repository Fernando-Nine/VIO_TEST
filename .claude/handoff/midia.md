# Mídia — handoff
Atualizado: 2026-10-24

## Agora
App Windows etapa 1 entregue (#100): instalador NSIS aguardando teste do usuário no PC.

## Feito recentemente
- #100: `src-tauri/` (Tauri 2) abre a prévia remota, sem IPC (`capabilities: []`),
  navegação presa à origem. Updater consulta `vio-releases/latest.json` antes de abrir
  a janela. Workflow `windows.yml` gera o artefato `VIO-Windows-x64` (QA de acordo).
- Par de chaves do updater gerado; pública em `tauri.conf.json`. Privada + senha
  entregues ao usuário para os secrets `TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)`.
- #32: PC e AudioContext órfãos. Issues #23, #24, #25 abertas no diagnóstico.

## Decisões
- Etapa 1 carrega a URL remota: zero mudança no servidor/Render. Para WASAPI (#26),
  migrar para interface local + IPC (ver ramo antigo `feat/windows-wasapi`:
  C++ WASAPI, `bridge.ts`, `pcm-worklet.js`) e liberar `ALLOWED_APP_ORIGINS`.
- Sem assinatura de código até abrir ao público (usuário). Updater só ao abrir o app.
- Dependências aprovadas: `@tauri-apps/cli`, `tauri`, `tauri-plugin-updater`
  (+ `serde_json`, exigido pelo `generate_context!`).

## Pendente / bloqueios
- Usuário: testar o instalador e cadastrar os 2 secrets.
- Etapa 2: publicar release em `vio-releases` (`.exe`, `.sig`, `latest.json`) pelo CI.
- Links externos (`target=_blank`) não abrem no app; avaliar com plugin opener.
- Build Windows não compila no container (sem SDK); validar pelo workflow.

## Próximo passo
Após o aval do usuário: etapa 2 (publicação automática no vio-releases), depois #26.
