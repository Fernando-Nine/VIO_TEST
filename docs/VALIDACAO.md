# VIO — validação

## Atualização 2.3.0 — 25/09/2026

Build de produção e 27 testes aprovados. O ensaio do servidor abriu oito sessões
na mesma sala com `MAX_PARTICIPANTS=6` legado: nenhuma recusada, aviso a partir de
seis e duração comum preservados. Segurança, isolamento, reconexão, três caminhos
TURN e histórico original continuaram aprovados.

Os testes de áudio verificaram seleção em voz/tela/elementos futuros, rollback,
nenhuma reabertura desnecessária da saída padrão, elemento removido durante uma
operação, dispositivo salvo indisponível, restauração atrasada, desconexão com um
único aviso e falha real ao voltar ao padrão. O comportamento de IDs e permissões
foi conferido na especificação: https://www.w3.org/TR/audio-output/.
Isso não identifica com certeza a causa em cada aparelho do usuário nem substitui
um teste de troca/desconexão de fones físicos no sistema operacional.

Resoluções de 240p a 2160p verificadas nos parâmetros do encoder, com proporção
preservada e sem ampliação de uma fonte menor. Prévia continua independente em
320 × 180 / 5 FPS / 90 kbps; câmera continua com seu próprio limite. A mudança
do tamanho de uma janela compartilhada recalcula a escala durante a coleta de stats.

Chrome 151, fontes sintéticas, oito participantes e duas telas: sala medida em
1920 × 1080, 1024 × 600, 320 × 844 e 768 × 390. Não houve rolagem externa;
cards e controles permaneceram dentro do vídeo após terminar o reposicionamento.
Em 1920, player de 1894 px com margens de 12 px, sem a faixa vazia à direita.
Prévias de 238 × 133,875 px no desktop e 150 × 84,375 px no menor viewport.
Em paisagem baixa, os cards usam menos largura para não cobrir as duas primeiras
prévias no encaixe inicial. Ocultação configurada em 2000 ms, observada com opacity 0;
menu aberto e foco de teclado mantêm os controles acessíveis. Seletor de resolução
operado pela interface, incluindo 1080p sobre uma fonte sintética de 720p.

Entrada medida em 320 px sem overflow horizontal e em 1024 × 600 sem rolagem externa.
Fonte cursiva e seu pacote removidos; fontes restantes são locais. Cursor de mão SVG
segue #2727F5 com contorno claro. Revisão da lista visual de exclusões concluída:
sem novas decorações, fontes genéricas, gradiente roxo-azul, blobs, emojis ou biblioteca
de animação. Contrastes da paleta 2.2.0 preservados e foco visível mantido.

`render.yaml` validado contra o esquema oficial atual. `MAX_PARTICIPANTS` foi retirado
do modelo; instalações existentes podem conservá-lo sem efeito. Sem alteração de
serviço, plano, número de instâncias, segredos ou repositórios antigos.

Evidências: `evidence/build-2.3.0.txt` e `evidence/tests-2.3.0.txt`. A checagem visual
comprova interface/presença; o transporte real de mídia entre dispositivos continua
com a limitação de ambiente documentada abaixo.

## Atualização 2.2.0 — 24/09/2026

Build de produção e 17 testes aprovados após incorporar a main `d8ee610`:
servidor remoto, três opções de TURN e seus testes foram preservados. Os dois
novos casos verificam os seis encaixes dos cards e os limites após redimensionar.
O histórico original continua íntegro, com 16 versões anteriores à nova base.

Entrada conferida em 320/390 px sem rolagem horizontal, e em 1024 × 600,
1366 × 768 e 1440 × 900 sem rolagem externa no desktop. Em 1024 × 600 o
formulário fechado também cabe sem rolagem interna. Expandir as instruções de
instalação permite rolar o próprio formulário em janelas baixas.

Sala conferida com seis participantes e duas telas sintéticas em prévias de
320 × 844, 390 × 844, 1024 × 600, 1366 × 768 e 768 × 390 (paisagem),
sem rolagem externa. Cards e
controles ficam dentro da área do vídeo. Arraste real por ponteiro, encaixe,
reposicionamento por setas e menu por clique foram exercitados no navegador.
Ocultação medida com opacity 0 / pointer-events none após inatividade, e
alfinete mantendo opacity 1. O ensaio cobre interface e presença; não comprova
transporte de mídia em redes físicas.

Paleta final segue #2727F5. Contrastes calculados: texto principal 17,49:1,
secundário 8,22:1, placeholder 7,11:1, CTA 7,18:1 e foco 8,57:1. A borda dos
campos atinge 3,60:1. Valores completos em `evidence/contrast-2.2.0.json`.
A revisão visual excluiu os padrões proibidos: sem gradiente roxo-azul,
blob, cards de marketing repetidos, emojis, fonte anterior ou biblioteca de
animação adicional. Movimento somente por transform/opacity; reduced-motion
continua desabilitando os efeitos. Cursor de ação convencional, labels com
espaço para o foco, animação decorativa sem captura nem imagens externas.


## Atualização 2.1.0 — 16/09/2026

Build de produção e os 12 testes existentes aprovados. Entrada redesenhada
conferida visualmente em desktop e em prévias de 320, 390 e 768 px, sem
rolagem horizontal. O formulário continua criando/abrindo salas; retorno à
entrada, troca das prévias por clique/setas, inicial do nome e atalho ao
formulário foram exercitados no Chrome 151. Foco sólido visível confirmado.

Contraste calculado dos pares da nova entrada: texto principal 14,44:1,
secundário 5,97:1, placeholder 5,37:1, texto do botão 9,44:1, título azul
8,41:1 e selo 14,51:1. Revisão da lista visual de exclusões executada: sem
gradientes na entrada, sem fontes anteriores, sem hero centralizado/blob,
sem cards repetidos, sem emojis e sem bibliotecas adicionais de animação.

As animações da entrada usam somente transform/opacity; movimento reduzido
e semântica/foco foram conferidos no CSS e nos componentes. As ilustrações
são decorativas e marcadas com aria-hidden; a prévia não inicia capturas.
O changelog mantém as 16 versões históricas, a 2.0.0 e a nova 2.1.0.


## Atualização 2.0.0 — 16/09/2026

- 12 testes automatizados aprovados: os sete casos anteriores e cinco casos novos.
  Incluem seis ingressos e recusa do sétimo, início comum da sala, saída aplicada
  a voz/tela/elementos futuros e rollback em falha, ping por origem, duração,
  exclusão de navegações/sockets/salas/sessões do service worker e integridade
  byte a byte do changelog histórico (16 versões).
- Web Audio real, com oscilador sintético no Chrome 151: indicador ativado com
  trilha tardia, desligado com silêncio/remoção e reativado com substituição.
  Ganhos medidos de 0,20× e 3,00× sem alterar a sensibilidade. A trilha sintética
  não oferece AGC; uma recusa do navegador preserva o ajuste anterior.
- UI móvel em iframe de 390 × 844: abas, ganho até 300%, prévias desligadas
  por padrão, duração, ping e explicação de seis pessoas conferidos.
- Build de produção aprovado; o bundle exclui o laboratório de desenvolvimento.
  Evidências: `evidence/tests-2.0.0.txt` e `evidence/build-2.0.0.txt`.
- A seleção de saídas foi testada com destinos simulados; a troca audível entre
  fone, caixa e monitor ainda depende de dispositivos físicos.
- Manifest, ícones e worker foram implementados. A instalação pela interface
  do sistema operacional e a captura física em celular não foram exercitadas.
- Os resultados históricos de transporte WebRTC abaixo continuam válidos como
  limitações do ensaio. O teste do analisador não comprova transporte entre redes.

## Registro do protótipo 0.1.0

As referências a quatro participantes abaixo descrevem o ensaio anterior.
Na 2.0.0 o padrão passou a seis, com o limite de ingresso validado no servidor.

Validação local em 15/09/2026; publicação na Render em 16/09/2026.
Esta é uma base nova; não herda o aceite de versões antigas.

**O aceite completo de mídia permanece pendente.** Build, servidor e controles
locais passaram. O ensaio de transmissão no navegador não estabeleceu uma rota
WebRTC. O serviço Render foi publicado em https://vio-test.onrender.com/ e três
participantes foram conectados à mesma sala por HTTPS/WSS. Isso comprova presença
e sinalização, mas não transporte de mídia entre dispositivos.

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
| WebMCP opcional | Leitura da sala PASS em HTTPS | Indisponível no preview inicial; `get_vio_room` retornou três IDs distintos e online no serviço publicado |
| Publicação Render | PASS | Build remoto, estado `live`, processo na porta 10000 e HTTPS funcionando; `evidence/render-deployment.json` |
| Presença pública em três sessões | PASS | Três abas do navegador, nomes e IDs distintos; indicador “3 de 4”, status `connected` |
| Verificação pública por CLI | HTTP PASS; WSS FAIL nesse cliente | `evidence/render-public-smoke.json`: saúde, CSP/HSTS, página, configuração, fonte e recusa de origem passaram; conexão Socket.IO do cliente Node retornou `websocket error`. As três sessões no navegador conectaram normalmente. |

As observações de UI estão consolidadas em `evidence/ui-observations.json`.

A checagem pública pode ser repetida com
`node --use-env-proxy scripts/check-deployment.mjs https://vio-test.onrender.com`.
O script abre sessões temporárias, exercita sinalização sem enviar mídia e fecha
as próprias conexões ao terminar. A primeira requisição admite a retomada do plano
Free. O erro WSS no cliente de terminal não foi atribuído definitivamente à rede ou
à biblioteca; ele não invalida a presença observada nas três abas do navegador,
nem permite afirmar que transporte WebRTC foi validado.

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
| Render | Um Web Service, HTTPS/WSS e porta runtime | deploy live e três participantes no domínio público | Publicação/presença PASS; mídia real e recuperação com mídia pendentes |
| Node e Docker portáveis | build/start, Dockerfile/compose/proxy docs | processo Node compilado | Node PASS; Docker não executado (daemon indisponível) |
| Limite de quatro pessoas | configuração conservadora | três sessões sintéticas | Medir CPU/upload reais antes de ampliar |

## Próximo ensaio de mídia

1. Usar https://vio-test.onrender.com/ para o teste público ou executar o projeto em `http://localhost:3000`.
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

A capacidade de mídia de seis participantes ainda requer medição em dispositivos
reais. Os testes de sinalização não constituem esse aceite.
