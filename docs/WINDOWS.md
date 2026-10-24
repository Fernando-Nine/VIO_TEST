# VIO para Windows

Casca Tauri 2 (WebView2) que abre a prévia `https://vio-test.onrender.com`.
Etapa 1: instalar, abrir e entrar numa sala. Captura WASAPI por aplicativo vem
depois (#26, especificação em `DESKTOP-WASAPI.md`).

## Como funciona

- A janela carrega a prévia hospedada; o código da interface é o mesmo da web.
- Sem IPC: a página não recebe nenhuma permissão nativa (`capabilities: []`) e a
  navegação fica presa à origem da prévia.
- Ao abrir, antes da janela, o app procura atualização em
  `Fernando-Nine/vio-releases` (`latest.json`). Se houver, instala e reabre;
  sem rede ou sem release, abre a versão atual. Nunca atualiza no meio de uma chamada.
- Instalador NSIS por usuário, sem assinatura de código (decisão: assinar só ao
  abrir ao público). O Windows SmartScreen avisa na primeira execução.

## Build

O workflow **VIO Windows** (Actions) gera o artefato `VIO-Windows-x64` com o `.exe`.
Com os secrets `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
cadastrados, gera também o `.sig` usado pelo atualizador. A chave pública está em
`src-tauri/tauri.conf.json`; a privada nunca entra no repositório.

Local (Windows, Node 24, Rust estável MSVC):

```powershell
npm ci
npm run build
npx tauri build --bundles nsis
```

## Publicar atualização (etapa 2)

Criar release em `Fernando-Nine/vio-releases` com o `.exe`, o `.sig` e um
`latest.json` no formato do plugin updater do Tauri. Ainda não automatizado.
