# VIO — validação da versão 0.1.0

Data: 15/09/2026. Esta é uma base nova; não herda o aceite de versões antigas.

**O aceite completo de mídia permanece pendente.** Build, servidor e controles
locais passaram. O ensaio de transmissão no navegador não estabeleceu uma rota
WebRTC. Não foi publicado um serviço Render nesta execução.

## Ambiente e método

- Servidor: Linux, Node 24.19.0, npm 11.9.0. Dependências resolvidas no lockfile.
- Navegador remoto: Chrome, user agent `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36`.
  O sistema reportado pelo user agent não comprova o sistema físico do equipamento.
- Preview HTTP interno, sem contexto seguro para captura física. Não foram
  concedidas permissões de microfone/câmera/tela nem alteradas políticas do navegador.
- `tests/BrowserLab.tsx` usou três Controllers e sessões anônimas independentes,
  no mesmo documento e no mesmo navegador. Canvas e osciladores produzem fontes
  identificadas como sintéticas. Signaling e RTCPeerConnection são os módulos reais.
- UI desktop em viewport de aproximadamente 1364 × 940; mobile em iframe da mesma
  origem, 390 × 844. Isso verifica o layout responsivo, não um aparelho iOS/Android.

## Resultados executados

| Verificação | Resultado | Evidência / alcance |
|---|---|---|
| TypeScript e build de cliente/servidor | PASS | `evidence/build.txt` |
| Testes do servidor | PASS — 7/7 | `evidence/server-tests.txt`; HTTP e Socket.IO locais reais |
| Dependências de produção | PASS — 0 vulnerabilidades conhecidas retornadas | `evidence/audit-production.json`; auditoria não equivale a ausência de falhas |
| Blueprint Render | PASS no esquema JSON oficial | `evidence/render-schema.json`; não é um deploy autenticado |
| Servidor compilado em produção | PASS | `evidence/production-smoke.json`: processo separado, cliente/health/source HTTP 200, CSP, laboratório desabilitado, SIGTERM com saída 0 |
| Três sessões no navegador | PASS | IDs distintos e três participantes sincronizados |
| Duas telas, três vozes e três câmeras sintéticas publicadas | PASS | `evidence/media-browser.json`; publicação não comprova recepção |
| Transporte WebRTC simultâneo no navegador | FAIL | Negociação sem rota de mídia; detalhes abaixo |
| Entrada/sala desktop e mobile | PASS visual e navegação | Capturas reais em `evidence/`; formulários, nomes, sala e controles |
| Mute manual → ensurdecer → desensurdecer | PASS de estado local/UI | Botão continuou “Ativar microfone”; desmutar restaurou estado ativo |
| Desligar câmera e depois tela | PASS de ciclo de vida local/UI | Voz permaneceu ativa; tela permaneceu ao desligar câmera; publicação local da tela saiu ao parar |
| Preset Baixa | PASS da captura sintética; envio não comprovado | `getSettings()` exibido na UI mudou de 24 para 15 FPS; limite solicitado 700 kbps e escala 2; envio continuou 0 kbps |
| Sons dos controles | PASS da preferência na UI; escuta não validada | Checkbox ativado e confirmado; os seis sons são sintetizados por Web Audio |
| Painéis e teclado | PASS nos fluxos exercitados | Ajustes abriu em desktop/mobile; Escape fechou sem deixar dialog aberto |
| WebMCP opcional | Indisponível neste contexto | O navegador retornou `modelContext is unavailable`; registro por feature detection |

As observações de UI estão consolidadas em `evidence/ui-observations.json`.

Os testes do servidor verificam tokens adulterados/expirados, nomes iguais, duas
publicações simultâneas, assinatura principal seletiva, cancelamento de miniatura,
roteamento autorizado de offer e candidato ICE, tentativa entre salas, identidade
forjada, origem indevida, sessão duplicada, payloads e limites de taxa. O caso de
reinício fecha e recria o servidor HTTP/Socket.IO no mesmo processo de teste,
preservando o segredo; não representa um deploy/reinício na Render.

## Falha observada na transmissão

O último ensaio publicou as fontes e negociou descrições locais/remotas. Os peers
registraram `signaling: stable`, `gathering: complete`, nenhum candidato remoto e
zero bytes enviados. Os eventos ICE observados não forneceram candidato utilizável
para encaminhamento (houve eventos finais, sem incremento de `sentIce`). `getStats`
reportou candidatos locais, mas isso não comprova que foram disponibilizados para
sinalização. Nenhum endereço foi extraído de estatísticas para contornar essa situação.

O teste encerrou por tempo esgotado em “mídias simultâneas”, depois de tentativas
limitadas. A causa precisa ser isolada em outro contexto autorizado; não é possível
atribuir definitivamente a falha à rede, ao navegador ou ao aplicativo com esta
única observação. A UI informa a ausência de conexão e oferece diagnóstico/reconexão.

As etapas seguintes da suíte (bytes de miniatura, escala/bitrate efetivos de envio,
ICE restart com mídia, encerramento nativo e troca contínua entre telas) não
alcançaram aprovação. Os controles locais exercitados separadamente não substituem
o teste de recepção real.

## Matriz de requisitos e aceite restante

| Requisito | Implementação | Teste executado | Resultado / próximo aceite |
|---|---|---|---|
| Sala sem anfitrião, presença, nomes iguais | Rooms + Controller | 3 sessões servidor/navegador | PASS para sinalização |
| Identidade e reentrada idempotente | HMAC, sessões curtas, rejoin | recriação do servidor | PASS no backend; mídia contínua após deploy pendente |
| Telas simultâneas e principal seletiva | Captures, Peers, assinatura por espectador | publicação/assinatura/roteamento | Backend PASS; recepção WebRTC FAIL no ambiente |
| Miniatura leve apenas visível | Canvas 320 × 180/5 FPS/90 kbps, IntersectionObserver, máximo 2 | cancelamento de assinatura servidor | Banda/resolução recebidas pendentes |
| Tela, voz e câmera independentes | Uma publicação por fonte e peer por assinatura | fontes sintéticas + desligamentos pela UI | Ciclo local PASS; combinação física pendente |
| Dispositivos/permissões | getUserMedia/getDisplayMedia, track ended, erros, selects | capacidades e aviso HTTP | Negação/revogação/ocupado/troca física pendentes |
| Voz, sensibilidade, fala e ensurdecer | Web Audio, gate/analyser, mute separado | estado local e indicador sintético | Estado PASS; qualidade audível e fala remota pendentes |
| Volumes locais, autoplay | Media/RemoteVoice e botões de reprodução | UI renderizada | Escuta e bloqueio real de autoplay pendentes |
| Qualidade em runtime | constraints + sender encodings + stats | captura sintética 15 FPS | Bitrate e escala recebidos pendentes |
| Reconexão, ICE restart, cleanup | Controller + Peers, gerações/fila/limites | backend reiniciado; tentativas observadas | Reinício com mídia e ausência de órfãos pendentes |
| TURN temporário e relay forçado | Credenciais HMAC expiráveis e iceTransportPolicy relay | geração/expiração servidor | PASS de configuração; relay real depende de TURN |
| Segurança | Zod, Helmet, Origin, HMAC e rate limits | sete testes e auditoria de dependências | PASS nos casos definidos; não é auditoria completa |
| Identidade, versão e histórico | CSS, fontes OFL, releases.ts, AGPLv3 | build e inspeção visual | PASS para artefatos; leitor de tela/AA formal pendentes |
| Ocultação por inatividade e movimento reduzido | timers/foco, CSS media query | inspeção de implementação | Ensaio completo com mídia/teclado/movimento reduzido pendente |
| Render | Um Web Service, HTTPS/WSS e porta runtime | conexão da conta e esquema validado | Confirmar workspace e vincular repositório novo; deploy pendente |
| Node e Docker portáveis | build/start, Dockerfile/compose/proxy docs | processo Node compilado | Node PASS; Docker não executado (daemon indisponível) |
| Limite de quatro pessoas | configuração conservadora | três sessões sintéticas | Medir CPU/upload reais antes de ampliar |

## Próximo ensaio de mídia

1. Executar o projeto em `http://localhost:3000` ou publicar a base nova em HTTPS.
   Rodar `npm run test:media` e abrir `/qa` apenas no desenvolvimento. Salvar o JSON.
2. Em três navegadores/dispositivos, publicar duas telas reais simultaneamente com
   vozes e câmeras. Alternar a principal e comparar bytes/bitrate/resolução no diagnóstico.
3. Ocultar miniaturas e confirmar encerramento da assinatura sem parar a captura.
   Alterar FPS/escala/bitrate e comparar os valores efetivos de envio e recepção.
4. Exercitar volumes, mute, ensurdecer com mute anterior ligado/desligado, câmera
   frontal/traseira, troca e remoção de dispositivos, recusa/revogação de permissão,
   fim pelo controle nativo e recuperação de autoplay. Confirmar sons audíveis distintos.
5. Interromper temporariamente a rede e reiniciar a sinalização com mídia ativa.
   Confirmar reentrada sem F5, sem participantes duplicados e sem peers antigos.
6. Configurar TURN e usar “Testar somente via TURN”. Confirmar rota relay pelo par
   selecionado. Repetir entre Wi-Fi e rede móvel; depois testar reentrada num deploy Render.
7. Repetir em Chrome/Edge/Firefox desktop e Safari/iPhone, anotando diferenças reais
   de captura/áudio/tela cheia. Registrar CPU, upload, RTT, sistema e versões.

Não aumentar o limite P2P nem anunciar aceite de produção antes dessas verificações.
