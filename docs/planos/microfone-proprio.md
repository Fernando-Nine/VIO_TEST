# Microfone próprio do VIO — projeto (#352)

Atualizado: 2026-11-14 · Área: Mídia · Estado: **aguarda aval do usuário**
Página de leitura com comentários: https://claude.ai/artifact/SNiLXaK4s7uvL4XRw6NkRL

**Recomendação.** No app Windows, o VIO abre o microfone pelo próprio código (WASAPI em Rust), fora
da categoria de comunicação do Windows, e faz ele mesmo o cancelamento de eco, a redução de ruído, o
ganho automático e o portão. Isso tira do Chromium a decisão que hoje faz o Windows abaixar os outros
sons (#344) e dispensa mexer em ajuste do sistema. No navegador nada muda. O plano pede duas
dependências novas (gratuitas, licença BSD, Rust puro) e começa por uma etapa de medidas, sem código
de produto.

Nenhum número deste documento foi medido por nós: todos vêm das fontes citadas e do catálogo do
projeto. O que não tem fonte está marcado como "a medir" ou "a confirmar".

## 1. O que existe hoje e onde falha

Hoje o navegador e o app Windows usam o mesmo caminho, em `src/client/media/capture.ts`
(`startVoice`). No app, `windowsCapture.device` só repassa para o navegador
(`src/client/desktop/capture.ts`).

```
getUserMedia (eco, ruído e ganho do navegador)
  → MediaStreamSource → Analyser (fftSize 512)
                      → portão (Gain) → voiceGain → MediaStreamDestination → WebRTC
```

Portão: limiar padrão −55 dB (ajuste de −65 a −20), laço de 50 ms, retenção de 180 ms, ataque de
8 ms, soltura de 40 ms. Ganho manual de 20% a 300%; com o ganho automático do navegador ligado,
`voiceGain` fica em 1.

| Falha                                                    | Causa                                                                                                                                      | Referência                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| O Windows abaixa os outros sons quando o microfone abre  | O Chromium (e o WebView2 do app) abre a captura como `AudioCategory_Communications` e não oferece opção para mudar                         | #344, [F4]                  |
| O contorno atual muda um ajuste do Windows               | `UserDuckingPreference` no registro do usuário, com pergunta e chave em Ajustes › Áudio                                                    | `ducking.rs`, `ducking.ts`  |
| A qualidade de eco e ruído varia de PC para PC           | O processamento é do navegador e, no Windows, em parte do driver; desligar por constraint nem sempre é respeitado                          | [F7], [F8]                  |
| A primeira sílaba pode ser cortada                       | O portão abre com atraso (até cerca de 40 ms) e não tem pré-roll                                                                           | Catálogo 04, achado 04.8    |
| Teclado e ventilador abrem o portão                      | O portão olha só o volume (RMS em dB), não distingue voz                                                                                   | `capture.ts`                |
| Nada disso tem teste automático                          | Sem testes de `Captures`, portão e worklet                                                                                                 | Catálogo 04, achado 04.6    |

Pequenos consertos que entram junto: `changeMicrophone` grava `micDevice` antes de abrir (04.3),
`context.close()` sem `catch` (04.7) e `docs/DESKTOP-WASAPI.md` desatualizado (04.4).

## 2. Por que o Windows abaixa os outros sons

Confirmado em documentação e código:

- O Chromium marca toda captura que não é loopback como `AudioCategory_Communications`
  (`SetCommunicationsCategoryAndMaybeRawCaptureMode`). Não há flag nem chave para mudar. [F4], [F5]
- A Microsoft diz que essa categoria aciona o comportamento de comunicação do sistema, incluindo
  abaixar os outros sons: 80% por padrão, com transição de 1 s, até fechar o último fluxo de
  comunicação. [F1], [F2], [F6]
- Quem abre o fluxo pode pedir para não abaixar os outros com
  `AUDIO_DUCKING_OPTIONS_DO_NOT_DUCK_OTHER_STREAMS` (`IAudioClientDuckingControl`, Windows 10 build
  20348 ou mais novo). A documentação descreve a opção para fluxo de reprodução. [F9], [F10]
- `SetDuckingPreference(TRUE)` só protege as sessões de som do próprio processo. Não impede que o
  jogo ou a música de outro app sejam abaixados. [F2], [F3]

Não confirmado, fica para a etapa 0:

- Qual fluxo dispara o abaixamento no VIO: a captura ou a reprodução do WebView2. Um relato de
  terceiro (Windows 11 build 26100) diz que a captura em categoria de comunicação sozinha não abaixou
  nada e que um fluxo de reprodução na mesma categoria abaixou. [F11]
- Se abrir a captura em outra categoria (`AudioCategory_Other`) ou em modo cru evita o abaixamento em
  Windows 10 e 11.

Pelo mesmo código, o abaixamento deve acontecer também no Chrome e no Edge. Lá não há o que fazer:
só o app, com captura própria, resolve.

## 3. Três caminhos para o app Windows

| Caminho                                              | Como funciona                                                                                                                                     | Dependência nova        | Cobre                                                             | Ponto fraco                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **A. Captura crua e processamento próprio (recomendado)** | WASAPI sem categoria de comunicação; eco, ruído, ganho e portão no VIO                                                                            | `sonora`, `nnnoiseless` | Windows 10 e 11, igual para todos                                 | Mais trabalho; o cancelamento de eco depende de alinhar bem a referência                                 |
| B. Captura de comunicação com pedido de não abaixar  | WASAPI em categoria de comunicação mais `DO_NOT_DUCK_OTHER_STREAMS`; eco e ruído por conta do Windows (Voice Clarity, AEC do sistema)             | Nenhuma                 | Só Windows 11 recente (AEC do sistema: build 22621; Voice Clarity: 24H2) | Qualidade muda com driver e versão; o pedido de não abaixar em captura só tem relato de terceiro [F11]   |
| C. Híbrido                                           | B quando o Windows confirma eco ativo (`IAudioEffectsManager`), A como reserva                                                                    | As de A                 | Todos                                                             | Dois caminhos para manter e testar                                                                       |

Por que A: é o que a issue descreve, dá o mesmo resultado em qualquer PC e deixa de depender de
ajuste, driver ou versão do Windows. A etapa 0 mede B na bancada, porque é o mais barato; se B se
mostrar sólido no Windows 11, vira atalho dentro de C sem refazer A.

## 4. Opções por tema

Ordem do processamento, a do WebRTC: eco → ruído → ganho → portão.

### Cancelamento de eco

| Opção                                                  | Onde roda        | CPU                                                                                                           | Latência                                    | Dependência nova             |
| ------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------- |
| **AEC3 do WebRTC pelo `sonora` (recomendada)**         | App, em Rust     | Autor: 13,3 µs por quadro de 10 ms a 48 kHz mono, com eco, ruído e ganho juntos, num Apple M4 Max; a medir em PC comum [F16] | Quadros de 10 ms; atraso total a medir      | `sonora` (BSD-3-Clause)      |
| AEC do Windows                                         | Sistema          | Do sistema, não medida                                                                                        | Não documentada                             | Nenhuma; só Windows 11 [F14] |
| `webrtc-audio-processing` (tonarino)                   | App, C++ com Rust | Mesmo algoritmo do `sonora`                                                                                   | Igual                                       | Sim, e o build pede meson, ninja e clang; MSVC não verificado [F17] |

No navegador fica o cancelamento do próprio navegador, que é da mesma família (o `sonora` é um porte
do processamento de áudio do WebRTC).

### Redução de ruído

| Opção                                         | Onde roda    | CPU                                                                              | Latência                          | Dependência nova               |
| --------------------------------------------- | ------------ | -------------------------------------------------------------------------------- | --------------------------------- | ------------------------------ |
| **RNNoise pelo `nnnoiseless` (recomendada)**  | App, em Rust | Cerca de 1,3% de um núcleo x86; 60 vezes mais rápido que o tempo real [F19], [F20] | 10 ms                             | `nnnoiseless` (BSD-3-Clause)   |
| Redução clássica do WebRTC (dentro do `sonora`) | App, em Rust | Incluída na medida do `sonora` acima                                             | Quadros de 10 ms                  | Nenhuma além do `sonora`       |
| DeepFilterNet                                 | App, em Rust | Fator de tempo real 0,19 num i5-8250U (versão 1) e 0,04 (versão 2) [F23], [F24]  | 40 ms de antecipação              | Sim (MIT/Apache-2.0)           |

O RNNoise também devolve a probabilidade de haver voz em cada quadro, que serve ao portão. A redução
clássica costuma ser mais fraca com ruído que varia (teclado, cliques); comparar as duas na bancada.
O DeepFilterNet fica fora por custar quatro vezes a latência.

### Ganho automático

| Opção                                      | CPU                                  | Latência             | Dependência nova         |
| ------------------------------------------ | ------------------------------------ | -------------------- | ------------------------ |
| **AGC2 do WebRTC pelo `sonora` (recomendada)** | Incluída na medida do `sonora`       | Quadros de 10 ms     | Nenhuma além do `sonora` |
| Ganho automático nosso (nível-alvo lento e limitador) | A medir; baixa                       | Nenhuma              | Nenhuma                  |
| Só o ganho manual de hoje                  | Zero                                 | Nenhuma              | Nenhuma                  |

A chave "Ganho automático" e o ganho manual continuam como hoje. Comparação entre o AGC2 e o do
navegador: não pesquisada, a medir.

### Portão

| Opção                                                             | CPU       | Latência                               | Dependência nova                 |
| ----------------------------------------------------------------- | --------- | -------------------------------------- | -------------------------------- |
| **O portão atual em dB com pré-roll (recomendada)**               | Como hoje | O tamanho do pré-roll, 20 a 30 ms      | Nenhuma                          |
| Portão guiado pela probabilidade de voz do RNNoise                | Zero a mais | Nenhuma a mais                         | Nenhuma além do `nnnoiseless`    |
| Silero VAD                                                        | A confirmar | A confirmar                            | Sim (modelo e runtime; a confirmar) |

Pré-roll: um `DelayNode` curto só no ramo do portão; o analisador continua lendo o sinal sem atraso e
antes do portão, então o portão já está aberto quando a primeira sílaba chega. Vale para navegador e
app. A segunda opção entra como experimento na etapa 2, com o limiar em dB mantido como piso.

## 5. Navegador e app Windows

| Tema      | Navegador                                             | App Windows                                                                  |
| --------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Captura   | `getUserMedia`, como hoje                             | WASAPI em Rust, 48 kHz mono, sem categoria de comunicação                    |
| Eco       | Do navegador                                          | AEC3, com o som que o VIO toca como referência                               |
| Ruído     | Do navegador (RNNoise em WASM é a etapa 6, opcional)  | RNNoise                                                                      |
| Ganho     | Do navegador                                          | AGC2                                                                         |
| Portão    | O atual, com pré-roll                                 | O mesmo código                                                               |
| Ponte     | Não tem                                               | Rust → `invoke` binário → `AudioWorklet` → `MediaStreamAudioDestination`     |
| Outros sons abaixados | Continua (decisão do navegador)           | Deixa de acontecer (a confirmar na etapa 0)                                  |

Cadeia proposta no app:

```
microfone (WASAPI, cru) ──────────────┐
                                      ├→ AEC3 → redução de ruído → ganho automático → ponte
som que o VIO toca (loopback do ──────┘                                                  │
próprio processo = referência)                                                           ▼
        fonte (AudioWorklet) → analisador → portão com pré-roll → voiceGain → destino → WebRTC
```

- O ponto de troca é `CaptureAdapter.device`: no app ele devolve o `MediaStream` da ponte; o resto
  de `startVoice` não muda.
- A referência do eco é a captura de loopback da árvore de processos do próprio VIO (o mesmo recurso
  que `capture.rs` já usa para o som das telas, no modo INCLUDE). As duas capturas ficam no Rust, no
  mesmo relógio, e o eco é cancelado antes da ponte.
- A ponte é a que já leva o som das telas (`pcm-worklet.js`, `StereoQueue`), com blocos menores para
  voz.
- Invariantes mantidos: `fonte → analisador → portão → destino`, analisador antes do portão, limiar
  em dB, volume geral fora do que é enviado, indicador de fala intacto.
- Se a captura própria falhar (dispositivo, versão do Windows), o app volta sozinho para o
  `getUserMedia`.
- Segurança (achado 10.1 do catálogo): o comando novo só aceita a janela principal, um microfone por
  vez e um dispositivo da lista enumerada; nada de nome de dispositivo em log.

## 6. Dependências novas

Cada linha pede aprovação. Nenhuma é paga; todas são compatíveis com a AGPL-3.0 e entram em
`docs/licenses/`.

| Dependência                    | Para quê                                  | Licença            | Entra na          | Sem ela                                            |
| ------------------------------ | ----------------------------------------- | ------------------ | ----------------- | -------------------------------------------------- |
| `nnnoiseless` (crate Rust)     | Redução de ruído e probabilidade de voz   | BSD-3-Clause       | Etapa 2           | Redução clássica do `sonora`                       |
| `sonora` (crate Rust)          | Cancelamento de eco e ganho automático    | BSD-3-Clause       | Etapa 3           | Caminho B (eco do Windows, só Windows 11)          |
| Pacote RNNoise em WASM         | Redução de ruído no navegador             | A conferir         | Etapa 6, opcional | Redução do navegador, como hoje                    |

Recursos extras da crate `windows` (já aprovada) não contam como dependência nova.

Ressalvas do `sonora`: projeto novo e pouco adotado, escrito com ajuda de IA, validado pelo autor só
em Ubuntu, pede Rust 1.91. Por isso a etapa 3 começa com teste de bancada antes de entrar no produto.
Reserva: `webrtc-audio-processing`.

## 7. Plano em etapas

Cada etapa vira uma issue com plano revisado pelo `goldfish`. As etapas 1 a 4 ficam atrás de uma
chave experimental em Ajustes › Áudio, só no app.

| Etapa | Entrega                                                                                              | Aceite                                                                                                                                                                                                 |
| ----- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | Medidas num executável de bancada, no PC do usuário. Sem código de produto.                          | Tabela em `docs/notas/midia.md` com: qual fluxo abaixa os sons e qual categoria evita (Windows 10 e 11); atraso da ponte; CPU de `nnnoiseless` e `sonora`; se o loopback do próprio processo pega o som do WebView2; se o caminho B entrega eco. Recomendação confirmada ou ajustada. |
| 1     | Microfone cru por WASAPI, pela ponte, com a chave experimental. Sem processamento: para quem usa fone. | Outros sons não abaixam com o contorno da #344 desligado; atraso extra dentro da meta; trocar e desconectar o microfone funciona; mudo, portão e indicador de fala iguais a hoje.                      |
| 2     | Redução de ruído e portão com pré-roll.                                                              | Teclado e ventilador não passam; a primeira sílaba não some em gravação de teste; CPU dentro da meta; testes automáticos do portão.                                                                    |
| 3     | Cancelamento de eco com referência de loopback.                                                      | Com caixas de som, quem está do outro lado não se ouve; duas pessoas falando ao mesmo tempo sem cortes fortes; 30 minutos sem o eco voltar.                                                            |
| 4     | Ganho automático.                                                                                    | Voz baixa e voz alta chegam em nível parecido; o ruído não sobe no silêncio.                                                                                                                           |
| 5     | Vira padrão no app e o contorno da #344 sai.                                                         | Aval do usuário na prévia; volta automática para `getUserMedia` em caso de falha; removidos `desktop/ducking.ts`, `ducking.rs`, os comandos `desktop_ducking` e `desktop_set_ducking`, a feature `Win32_System_Registry`, a pergunta e a chave; nota em `changes/`; catálogo e `DESKTOP-WASAPI.md` atualizados. |
| 6     | Opcional: RNNoise no navegador, em `AudioWorklet`.                                                   | Mesmo aceite de ruído da etapa 2, medido no Chrome e no Firefox.                                                                                                                                       |

Metas propostas, a ajustar depois da etapa 0: atraso extra de até 40 ms em relação ao caminho atual e
processamento de até 5% de um núcleo no PC do usuário.

Quem usa fone ganha com as etapas 1 e 2. Quem usa caixas de som só pode ligar a chave a partir da
etapa 3.

## 8. Riscos e o que falta medir

| Risco                                                              | O que fazer                                                                                                      |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Referência do eco desalinhada faz o eco voltar                     | Duas capturas no mesmo processo e relógio, fila limitada; um relato mostra o AEC3 aguentando 100 ppm de deriva e falhando com 800 ms de atraso e saltos [F18] |
| Microfone e saída em aparelhos diferentes (headset USB e caixas)   | Medir a deriva na etapa 3                                                                                        |
| `sonora` é novo                                                    | Bancada antes do produto; reserva em C++                                                                         |
| PC fraco                                                           | Cada bloco tem chave; redução de ruído e eco desligam separados                                                  |
| A ponte soma atraso (hoje espera 20 ms e começa com 20 ms na fila) | Blocos de 10 ms para voz; medir na etapa 0                                                                       |
| Windows 10 antigo                                                  | O loopback por processo é documentado a partir do build 20348 e o app aceita 19041 (achado 10.3); sem loopback, volta para `getUserMedia` |
| Captura fora do navegador não passa pelo pedido de permissão dele  | Regras do comando na seção 5; conferir na etapa 1 que o Windows mostra o microfone em uso                        |

Não pesquisado nesta rodada, sem número neste documento: Silero VAD (licença, tamanho, CPU); o que
Discord, OBS e Mumble usam; pacotes de RNNoise em WASM e seus tamanhos; AGC2 contra o ganho
automático do navegador.

## 9. Decisões que pedem o seu aval

- [ ] Caminho para o app: **A, processamento próprio (recomendado)**, B ou C.
- [ ] Aprovar a dependência `nnnoiseless` (etapa 2).
- [ ] Aprovar a dependência `sonora` (etapa 3), com bancada antes.
- [ ] RNNoise no navegador (etapa 6): **deixar para depois (recomendado)** ou planejar já.
- [ ] Rodar a etapa 0 no seu PC: um executável de bancada, cerca de 15 minutos.

## Fontes

Páginas abertas em 2026-11-14.

- [F1] Microsoft, Default Ducking Experience: https://learn.microsoft.com/en-us/windows/win32/coreaudio/stream-attenuation
- [F2] Microsoft, Disabling the Default Ducking Experience: https://learn.microsoft.com/en-us/windows/win32/coreaudio/disabling-the-ducking-experience
- [F3] Microsoft, `IAudioSessionControl2::SetDuckingPreference`: https://learn.microsoft.com/en-us/windows/win32/api/audiopolicy/nf-audiopolicy-iaudiosessioncontrol2-setduckingpreference
- [F4] Chromium, `audio_low_latency_input_win.cc`: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/media/audio/win/audio_low_latency_input_win.cc
- [F5] Chromium, `core_audio_util_win.h`: https://chromium.googlesource.com/chromium/src/media/+/refs/heads/main/audio/win/core_audio_util_win.h
- [F6] Microsoft, Communications Audio Format Capabilities: https://learn.microsoft.com/en-us/windows/win32/coreaudio/communications-audio-format-capabilities
- [F7] Microsoft, Audio Signal Processing Modes: https://learn.microsoft.com/en-us/windows-hardware/drivers/audio/audio-signal-processing-modes
- [F8] Chromium, issue 327472528: https://issues.chromium.org/issues/327472528
- [F9] Microsoft, `AUDIO_DUCKING_OPTIONS`: https://learn.microsoft.com/en-us/windows/win32/api/audioclient/ne-audioclient-audio_ducking_options
- [F10] Microsoft, `IAudioClientDuckingControl::SetDuckingOptionsForCurrentStream`: https://learn.microsoft.com/en-us/windows/win32/api/audioclient/nf-audioclient-iaudioclientduckingcontrol-setduckingoptionsforcurrentstream
- [F11] Relato de terceiro, PR de um app Qt (não verificado por nós): https://github.com/firemonster612/speecher/pull/270
- [F12] Relato de terceiro, PR de um app .NET (não verificado por nós): https://github.com/Yuuzulight/Mana/pull/757
- [F13] Voice Clarity, fontes secundárias: https://www.windowslatest.com/2024/02/04/microsoft-tests-windows-11s-new-voice-ai-feature-for-all-pcs/amp/ e https://pureinfotech.com/whats-voice-clarity-windows-11-enable/
- [F14] Microsoft, `IAcousticEchoCancellationControl::SetEchoCancellationRenderEndpoint`: https://learn.microsoft.com/en-us/windows/win32/api/audioclient/nf-audioclient-iacousticechocancellationcontrol-setechocancellationrenderendpoint
- [F15] Microsoft, amostra ApplicationLoopback: https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/
- [F16] `sonora`: https://github.com/dignifiedquire/sonora
- [F17] `webrtc-audio-processing` (tonarino): https://github.com/tonarino/webrtc-audio-processing
- [F18] Relato de campo sobre deriva e atraso no AEC3: https://github.com/aray4702/streaming_media/issues/240
- [F19] RNNoise, página do autor: https://jmvalin.ca/demo/rnnoise/
- [F20] RNNoise, palestra no W3C: https://www.w3.org/2020/06/machine-learning-workshop/talks/rnnoise_neural_speech_enhancement_and_the_browser.html
- [F21] `nnnoiseless`: https://github.com/jneem/nnnoiseless
- [F22] Jitsi, RNNoise em AudioWorklet: https://jitsi.org/blog/enhanced-noise-suppression-in-jitsi-meet/
- [F23] DeepFilterNet: https://github.com/Rikorose/DeepFilterNet
- [F24] DeepFilterNet2, artigo: https://arxiv.org/abs/2205.05474
- [F25] WorkAdventure, redução de ruído em AudioWorklet: https://workadventu.re/tech/building-an-easy-to-use-browser-noise-suppression-library-in-an-audio-worklet/
