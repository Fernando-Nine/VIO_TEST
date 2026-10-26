# VIO para Windows

Casca Tauri 2 (WebView2) com a interface do VIO empacotada no instalador. Dois
canais: **VIO** (produção) e **VIO Teste** (prévia); ver `WINDOWS-RELEASE.md`. Inclui áudio por
aplicativo via WASAPI (#26, especificação em `DESKTOP-WASAPI.md`).

## Como funciona

- A janela carrega a interface local de `https://tauri.localhost`; o servidor do
  canal precisa de `ALLOWED_APP_ORIGINS=https://tauri.localhost` no Render.
- Só essa janela local chama os comandos de captura (`capabilities/main.json` e
  checagem de origem em Rust); a navegação não sai dela.
- Compartilhar tela: o usuário escolhe o aplicativo do áudio no VIO e a imagem no
  seletor do Windows. O áudio vem do loopback por processo (Windows 11, inclui
  processos filhos), entra num AudioWorklet e vira a trilha de áudio da tela.
  IDs de fonte são opacos; a página nunca escolhe PID.
- Ao abrir, antes da janela, o app procura atualização em
  `Fernando-Nine/vio-releases` (`latest.json` ou `beta.json`). Se houver, instala e reabre;
  sem rede ou sem release, abre a versão atual. Nunca atualiza no meio de uma chamada.
- Instalador NSIS por usuário, sem assinatura de código (decisão: assinar só ao
  abrir ao público). O Windows SmartScreen avisa na primeira execução.

## Build

O workflow **VIO Windows** (Actions) gera o artefato `VIO-Windows-x64` com o `.exe`.
Com os secrets `TAURI_SIGNING_PRIVATE_KEY` e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
cadastrados, gera também o `.sig` usado pelo atualizador. As chaves públicas estão em
`scripts/desktop-channel.mjs`; as privadas nunca entram no repositório.

Local (Windows, Node 24, Rust estável MSVC):

```powershell
npm ci
npm run build
npm run build:desktop          # VIO_CHANNEL=stable para o VIO
node scripts/desktop-channel.mjs config
npx tauri build --bundles nsis --config src-tauri/tauri.channel.json
```

## Publicar atualização

Automático pelo workflow; passos e secrets em `WINDOWS-RELEASE.md`.
