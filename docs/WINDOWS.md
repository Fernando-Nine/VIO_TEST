# VIO para Windows — 2.7.0-beta.1

Prévia nativa para **Windows 11 x64**, com interface local em Tauri 2 / WebView2,
vídeo autorizado pelo seletor do Windows e áudio por aplicativo via WASAPI.
É um aplicativo Win32 instalado por usuário; a PWA continua sendo uma opção web.

## Instalação e uso

O workflow **VIO Windows**, em Actions do repositório **Fernando-Nine/VIO_TEST**,
gera o artefato `VIO-Windows-x64-beta`: instalador NSIS `.exe`, SHA-256, este guia
e o código-fonte correspondente. O instalador configura o WebView2 Evergreen caso
necessário e cria a entrada de desinstalação do Windows. A prévia não tem certificado
de assinatura de código; não é apresentada como distribuição assinada.

Abra o VIO, entre na sala e escolha Compartilhar tela. Se desejar áudio, selecione
o aplicativo na lista; depois escolha a imagem no seletor do Windows. As duas
escolhas são independentes e precisam corresponder à intenção de quem transmite.
O WASAPI inclui processos filhos: em navegadores, isso pode incluir outras abas.
Para compartilhar o áudio de uma única aba, use o VIO web. Não há fallback silencioso
para o áudio de todo o computador. Microfone e chamada continuam separados.

A janela flutuante do aplicativo reduz a própria janela e a mantém sobre as outras,
com os mesmos controles e conexões. Ao retornar, restaura tamanho e posição anteriores.
Ela não cria outra sessão, outro player nem outra assinatura de mídia.

## Compilar

Pré-requisitos: Node 24, Rust 1.98.1 MSVC, Visual Studio Build Tools com C++ e Windows SDK
10.0.20348 ou posterior; WebView2 Runtime no computador que executará o app.

```powershell
npm ci
npm run build:desktop
cargo test --manifest-path src-tauri/Cargo.toml --locked
npx --yes @tauri-apps/cli@2.12.0 build --target x86_64-pc-windows-msvc --bundles nsis -- --locked
```

Resultado: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/`.
As dependências Rust estão em `Cargo.lock`; nenhuma biblioteca foi adicionada ao
runtime npm do site. O workflow fixa também a CLI e as ações por commit. Compilar
não depende de credenciais TURN ou de segredos do servidor no instalador.

## Integração e segurança

O frontend é empacotado, não carregado da internet. Ele usa somente
`https://vio-test.onrender.com` para sinalização e convites públicos. A origem da
janela é `https://tauri.localhost`. No servidor, `ALLOWED_APP_ORIGINS` deve conter
exatamente essa origem, e o cabeçalho CORS deve corresponder a ela. Não usar `*`
nem aceitar origem ausente. Tokens HMAC, limites de comandos e validação de dono
das publicações continuam ativos.

Os seis comandos nativos são restritos à janela local `main`, por capabilities e
verificação adicional de URL. Não há acesso genérico a shell, arquivos ou PID.
A lista gera IDs aleatórios válidos por 60 segundos, consumidos uma única vez;
a identidade do processo e da janela é revalidada para evitar reutilização de PID.
Só uma captura de áudio pode permanecer ativa. A enumeração exclui o próprio VIO.

WASAPI entrega PCM estéreo a 48 kHz; uma fila nativa limitada a 200 ms passa blocos
binários ao AudioWorklet, que reamostra para o relógio do AudioContext e alimenta uma
MediaStreamTrack. O caminho continua WebRTC P2P. Atraso acumulado é descartado,
falta de dados gera silêncio, e nenhuma cópia é enviada ao servidor de sinalização.
O áudio capturado nunca toca localmente. Parar, sair da sala, fechar o processo de
origem ou fechar o VIO encerra a captura e libera trilhas e recursos nativos.

O service worker não é registrado na versão desktop. O pacote inclui
`source.tar.gz` com os fontes correspondentes e a licença AGPLv3.

## Validação antes da distribuição estável

Os testes automatizados cobrem protocolo binário, limites do buffer, silêncio,
estéreo, reamostragem e origem/CORS. Eles não comprovam o som real capturado pelo Windows.
A prévia exige uma sessão física em Windows 11, ainda pendente nesta preparação:

1. Instalar em um Windows limpo, abrir e entrar numa sala com um segundo aparelho.
2. Compartilhar um aplicativo reproduzindo som e confirmar imagem e som no receptor.
3. Reproduzir outro aplicativo e a voz da chamada: confirmar que não vazam para a captura.
4. Cancelar o seletor, parar, recomeçar, sair/trocar de sala rapidamente e fechar o aplicativo de origem.
5. Testar janela flutuante, múltiplas telas, fones Bluetooth/USB, minimizar, suspender/retomar e saída de áudio.
6. Testar outra rede/TURN e reinício do servidor; desinstalar pelo Windows.

Não promover a estável antes dessa prova. Sincronia audiovisual, consumo de CPU,
compatibilidade de aplicativos protegidos e comportamento do WebView2 precisam
de medição no computador real. A implementação não tenta contornar conteúdo protegido.

Referências de API: [Microsoft — process loopback](https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/),
[Tauri — IPC](https://v2.tauri.app/develop/calling-rust/),
[Tauri — capabilities](https://v2.tauri.app/security/capabilities/).
