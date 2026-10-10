# VIO — validação

## Continuação da rodada C — 2.7.0-rc.4 — 10/10/2026

Ramo `feat/canvas-widgets`, PR #3. A prévia publicada identificou a versão
**2.7.0-rc.4**. A produção 2.6.0 não foi alterada.

**68 testes passaram**, sem falhas; TypeScript estrito e build concluídos.
Logs: `docs/evidence/rc4-tests.txt` e `docs/evidence/rc4-build.txt`.
O log de erro Cloudflare/TURN pertence ao teste de falha simulada.
Os quatro novos casos cobrem ordem de flutuantes sem mudança de identidade/posição
ou foco e posicionamento de popovers nas bordas, viewport estreita e área visível
deslocada por teclado/zoom. Nenhuma dependência nova.

### Ensaios da interface publicada

Na rc.2, duas sessões independentes confirmaram edição/salvamento de notas,
fechamento somente local pelo participante e encerramento para ambos pelo criador.
Foco + tira preservou o mínimo de espaços e Foco único exibiu o widget principal.
Essa revisão encontrou o botão Salvar texto sob a barra inferior; a rc.3 o moveu
para junto do título e explicitou o rótulo de encerramento para todos.

Na rc.4, os controles reais da prévia confirmaram:

- Inclusão de Notas devolve o foco ao cabeçalho do widget.
- Dois flutuantes sobrepostos alternam entre camadas 10/11 ao clicar em Pessoas e
  editar Notas. Mantêm seus ids e a ordem da árvore de widgets.
- Compartilhar converte a nota original; o X informa Encerrar Notas para todos.
  Editar e clicar em Salvar texto conclui o salvamento, sem intercepção pela barra.
- Detalhes de conexão usa a camada nativa de popover e recebe o clique acima do
  canvas; ficou entre x=740–1050 e y=60–330 na viewport 1363×936. Escape a partir
  de um controle interno fecha e devolve o foco sem reabrir.
- Foco único e tela cheia mantêm o widget escolhido. A ajuda de Pessoas permaneceu
  na área visível (x=8–318, y=92–259), enquanto a barra superior recolheu para
  y=-66. A altura variável dessa barra motivou o afastamento medido dos avisos.

Captura do foco único com a barra recolhida e ajuda visível:
`docs/evidence/vio-rc4-focus-popover-2026-10-10.jpg`.

Os avisos gerais passaram de irmãos do player para filhos dele, com área limitada
à tela; nos painéis do aplicativo aparecem dentro do diálogo. Não se considera
captura/escuta física validada: o seletor de compartilhamento da bancada ficou
pendente e foi encerrado por recarga, sem conceder acesso nem produzir mídia.
Ainda faltam queda com mídia ativa, aviso durante teclado móvel, volume com telas
remotas, PC + celular, leitores de tela e demais navegadores. O ensaio automatizado
de sinalização inclui reinício real do servidor, mas não certifica mídia física.

Propostas C24, C25 e C26 continuam em `RODADA-C.md`. Roteiro de aceite e requisitos
em `PENDENCIAS.md`. Os registros abaixo são históricos; não certificam a rc.4.

## Prévia 2.7.0-rc.1 — atualização em 06/10/2026

Ramo isolado `feat/canvas-widgets`, baseado na produção 2.6.0, PR #3.
Publicado somente na [prévia separada](https://vio-test-canvas-preview.onrender.com/).
O site principal continua na 2.6.0.

**56 testes aprovados**, zero falhas, TypeScript estrito e build de produção concluídos.
O arquivo `docs/evidence/canvas-tests.txt` preserva a primeira execução, com 54 testes.
Depois foram acrescentados dois casos de regressão: destino pelo ponteiro e navegação
direcional por teclado. A suíte de 56 testes passou após essas correções em 05/10/2026.
O log `cloudflare_turn_error` com
status 500 é a resposta simulada de um teste de falha, não um erro de produção.

O canvas é carregado apenas ao entrar na sala. Build medido após os ajustes compactos:
entrada de 473,00 kB (142,72 kB gzip), chunk do canvas de 154,05 kB (49,20 kB gzip),
CSS de 89,67 kB (19,32 kB gzip), excluindo fontes. Os números são do build local e podem variar após
ajustes; não constituem medição de desempenho em dispositivos.
A confirmação do usuário autorizou a Parte B, tira linear, adaptação móvel e widgets
individuais com compartilhamento opcional. A lembrança posterior foi aplicada: a tela
grande integra o grid; foco não cria sobreposição nem ativa foco único implicitamente.

Automação: testes de layout, serialização, aceite/recusa, mais de seis espaços,
esconder/restaurar, foco, reordenação, redução de presets e fim da tira. Servidor real
com múltiplas sessões: isolamento entre salas, autoria de estrutura/exclusão, operações
concorrentes, deduplicação, conflitos de revisão, cotas e limpeza quando a sala esvazia.
Comando `demand` restrito ao espectador de `main`; mock do sender confirma pausa/retomada
do vídeo sem tocar na faixa de captura ou no sender de áudio. Esse mock não comprova
transporte WebRTC. Reinício de servidor e demais regressões permanecem na suíte existente.

Auditoria de produção: zero vulnerabilidades reportadas por `npm audit --omit=dev`
em 05/10/2026. Dependência adicionada: `@dnd-kit/react` 0.5.0 fixada. Auditoria não
substitui revisão de código ou verificação dos navegadores.

### Conferência da interface publicada

A bancada local em `http://terminal.local:4174/qa-layout` continuou bloqueada por
`net::ERR_BLOCKED_BY_CLIENT`. Foi criada uma prévia normal e separada no Render Free,
sem expor laboratórios, com segredo próprio e as mesmas exigências de segurança.
A conferência abaixo usou a interface real dessa prévia, sem manipular estado pelo console.

Em 05/10/2026, Chrome da bancada, área de 1363 × 936 px e duas sessões de teste:

- Entrada, presença de duas pessoas e seleção de presets pelos controles visíveis.
- Troca entre espaço grande e pequeno, foco único e retorno ao conjunto.
- Arraste de Pessoas do espaço grande para o pequeno e retorno por Espaço/setas/Espaço.
  A primeira tentativa revelou um encaixe incorreto; a correção foi publicada e retestada.
- Notas individuais salvas durante a digitação e compartilhadas imediatamente com
  o texto completo na segunda sessão. O destinatário não recebe edição de estrutura.
  Um teste anterior de edição simultânea rejeitou a revisão antiga e conservou o rascunho.
- Nota em espaço largo ocupa a largura útil, após corrigir o grid interno dos blocos.
- Tira com três espaços de 237,98 px e dois intervalos de 8 px em 730 px de altura.
  Avançar moveu 246 px, exatamente um item; arrastar reordenou os widgets na tira.
- Cronômetro destacado pela opção explícita. Redimensionar por teclado aumentou
  largura e altura em 16 px, preservando a posição dentro do canvas.

As correções acima estão no commit `7e9bd4a`, publicado na prévia em 05/10/2026.
O plano gratuito mostrou a tela de inicialização após ociosidade e carregou o app
ao concluir. A consulta de logs de erro da prévia às 23:25 UTC não retornou registros.
Isso não equivale a monitoramento contínuo nem certifica transporte de mídia.

Em 06/10/2026, o commit `3b8b17e` foi publicado e conferido na interface. Os controles
compactos do cronômetro cabem sem rolagem: o corpo tem `clientHeight = scrollHeight =
200 px`; o botão Iniciar tem 36 px de altura e termina 34 px antes da borda inferior.
Iniciar mudou para Pausar, a contagem avançou e voltou a Iniciar ao pausar em 24:51.
O ícone de troca de foco está distinto do fullscreen global. Notas foram trazidas
para o espaço grande; Pessoas permaneceu no espaço menor, junto a cronômetro e tempo
da sala. Captura: [canvas conferido](evidence/vio-canvas-2026-10-06.jpg).
Deploy confirmado como `live`: `dep-db28rovavr4c73ad4r70` (05:58:38 UTC).

**Ainda não comprovado nesta versão:** áudio audível e vídeo entre aparelhos reais,
retomada e consumo efetivo em segundo plano, toque em celular, outros navegadores,
leitor de tela/zoom e os controles de volume/PiP com mídia. As provas das versões
antigas abaixo são históricas e não certificam automaticamente o novo canvas.

### Roteiro manual antes de promover o ramo

1. Execute `ENABLE_TEST_LAB=1 npm run test:media` em ambiente de desenvolvimento,
   com origem/porta coerentes. Abra `/qa-layout` para interface e `/qa-watch` para
   renderização sintética com sinalização real. Este último tem cinco publicadores e
   botões Registrar antes da troca / Verificar continuidade, atualizados para o canvas.
2. Em `/qa-watch`, escolha um preset, aceite telas pelos controles visíveis e registre.
   Arraste widgets, troque o grande com itens da tira, use Organizar por teclado,
   destaque/redimensione, esconda/restaure, mude de preset e use foco único. Compare
   elementos, streams, IDs de assinatura e comandos. Os players de áudio devem continuar.
3. Confira desktop, 320/375/390 px, paisagem, zoom de 200%, teclado e movimento reduzido.
   Verifique alinhamento de três itens, passo unitário, scroll sobre vídeos, toque,
   foco fora da tira e retorno do foco de modais. A rolagem de um widget longo tem prioridade.
4. Cruze a ponte do volume com o mouse; abra por toque e teclado; Escape deve fechar
   e devolver foco. Confira borda, olho de espectadores e controles no PiP quando suportado.
5. Com duas sessões, compartilhe notas/placar/timer, edite simultaneamente, recarregue,
   saia como criador e encerre a sala. Estrutura não pode ser alterada por terceiros;
   rascunhos conflitantes precisam permanecer e o estado deve ser apagado ao esvaziar.
6. Repita captura, áudio e retorno do vídeo com duas abas e PC + celular reais. Teste
   servidor reiniciado e rede interrompida. Confirme bytes/bitrate/FPS efetivos de slots
   fora da tira ou em segundo plano. O laboratório sintético não substitui esse ensaio.

## Atualização 2.6.0 — 27/09/2026

39 testes automatizados aprovados e build de produção/TypeScript estrito concluídos.
Os novos casos cobrem validação de HEX, ações limitadas à identidade autenticada,
20 alterações de cor/minuto, isolamento entre participantes, reconexão e contraste
AA das iniciais/destaques para 4.096 amostras RGB e todos os presets. O reinício
real do servidor também confirma restauração da cor informada pelo cliente.

Chrome 151, ScreenAudioLab: nove cenários aprovados com o componente real e sinal
sintético. Volume geral a 50% transforma uma tela a 80% em 40%; ganho de 300% em
1,50× medido. Zerar/restaurar preserva o grafo, o elemento e o stream. Voz a 60%
chega a 30% com geral a 50%, retoma sem pausas e aguarda faixas tardias. Mantidos
os casos de fallback nativo quando o amplificador falha ou suspende.

PreferencesLab com Controllers de produção e servidor real: sons de entrada e
saída própria/remota, ausência de repetição na reconexão e em snapshots de cor/
chamada, silêncio por evento ou pelos dois volumes, prévia explícita, cor preservada
na reconexão e reiniciada ao sair. Desmontagem sem aviso duplicado.

Interface: escolha de preset e HEX propagou para uma segunda sessão. HEX inválido
impediu Aplicar cor; matiz e quadro responderam ao teclado. Aba Aplicativo, switches
e seletor completo cabem em 320 px sem overflow horizontal. Setas navegam pelas
três abas, incluindo a volta de Aplicativo para Vídeo. Contraste dos destaques é
calculado; erros, avisos de conexão e ping não herdam a cor pessoal.

WatchLab: cinco vídeos e cinco áudios sintéticos preservaram os mesmos elementos,
streams e assinaturas, com progresso de reprodução, zero pausas e zero comandos
novos de assinatura ao trocar aparência e zerar/restaurar o volume geral. Bordas
receberam as cinco cores individuais; ao desativar a opção, voltaram ao acento
padrão sem alterar os avatares. O ensaio usa alimentação local deliberada e não
comprova transporte WebRTC entre aparelhos.

Revisão visual executada: tema escuro e azul #2727F5 preservados; nenhum blob,
fonte cursiva, gradiente genérico de startup, decoração espalhada ou biblioteca
adicional. A faixa multicolorida pertence somente ao controle funcional de matiz.
Hovers novos usam transform/opacity e respeitam movimento reduzido. Foco de teclado
visível; interface sem novas imagens de conteúdo. Uma nova sessão de navegador
carregou o volume geral de 99% e o evento de ligar microfone desabilitado.

Evidências: `evidence/tests-2.6.0.txt`, `evidence/build-2.6.0.txt`,
`evidence/audio-2.6.0.txt`, `evidence/preferences-2.6.0.txt`,
`evidence/continuity-2.6.0.json` e capturas `vio-2.6.0-*.jpg`.
Escuta em periféricos físicos, Safari/iPhone, mídia entre redes via TURN e recuperação
com mídia durante deploy continuam dependendo de aparelhos reais. Não foram
anunciados como aprovados. O aplicativo nativo/WASAPI continua fora desta versão.

## Atualização 2.5.0 — 27/09/2026

34 testes automatizados aprovados: seis assinaturas principais simultâneas,
IDs estáveis, remoção independente, presença na chamada sem microfone, isolamento
de comandos, limites por IP mesmo com rotação de identidades e geometria de janelas
em desktop/celular. Build e TypeScript estrito aprovados.

Chrome 151, WatchLab: cinco vídeos sintéticos com seus cinco áudios, sinalização
real e alimentação local deliberada para testar o player. Foco, teclas de movimento,
redimensionamento e presets mantiveram os dez elementos e streams idênticos,
reprodução avançando, zero pausas e zero comandos novos de assinatura. Todos os
áudios estavam tocando e não mudos. Arraste pelo ponteiro mudou a posição da janela.
O teste continua sem comprovar transporte de áudio/vídeo entre dispositivos físicos.

RoomSwitchLab: primeira sala aceita pelo servidor, com ACK de entrada retido;
saída e entrada na segunda sem liberar o ACK. Liberar a resposta antiga manteve a
segunda conectada. Repetido após desconectar a sinalização antes da saída: terceira
sala conectou com nova sessão, sem erro. Capturas/peers da sala anterior são limpos.

ScreenAudioLab: os seis cenários de reprodução direta, faixa tardia, volume, mute,
ganho 3×, suspensão/falha do amplificador e limpeza continuam aprovados.

Layout: cinco telas dentro da área útil, sem rolagem externa, em 320 × 844 e
768 × 390; orientação menor recalcula as posições. Medições finais coletadas após
estabilizar a transição. Controles e painel permanecem dentro do player.

Evidências: `evidence/multiscreen-2.5.0.json`, `evidence/room-switch-2.5.0.json`,
`evidence/layout-2.5.0.json`, `evidence/audio-2.5.0.txt`, `evidence/tests-2.5.0.txt`
e `evidence/build-2.5.0.txt`. Decisões de interação: `MULTITELAS-UX.md`.
Limitações: áudio físico, iPhone/Safari, TURN entre redes reais e continuidade de
mídia durante reinício remoto ainda exigem ensaio com aparelhos reais.

## Correção 2.4.1 — 26/09/2026

Regressão reproduzida no componente real: associar um MediaStream vazio antes de
chegar áudio deixou o elemento em readyState 0, sem erro e sem progresso. A correção
aguarda a faixa e mantém o stream original no elemento nativo. Até 100%, nenhum
grafo de ganho é criado. A revisão também identificou que Peers montava o stream
via addTrack sem emitir eventos: o amplificador da 2.4 podia ficar com entrada vazia
quando áudio chegava depois. Os helpers usados em produção agora notificam adição
e remoção após a mutação. Isso corresponde à especificação:
https://w3c.github.io/mediacapture-main/#event-summary.

Chrome 151, ScreenAudioLab pelo botão da página: reprodução tardia a 80%; volume
zero; mute/desmute; ganho medido em 3,00×; renderer original ainda tocando; retorno
nativo a 100% quando o AudioContext foi suspenso ou a criação do amplificador
falhou deliberadamente; retomada do ganho; desmontagem sem parar a captura.
FeatureLab também passou com a faixa adicionada após criar o grafo, usando os
mesmos helpers de Peers. Indicador e ganho de microfone permaneceram aprovados.

WatchLab: dois vídeos e dois áudios permaneceram idênticos, com os mesmos streams,
progresso de reprodução e zero pausas ao trocar o foco por botão. Nenhum comando
novo de assinatura. Os dois áudios estavam tocando e não mudos; vídeos mudos para
não duplicar o som. Todos os 30 testes de servidor/estado/segurança e o build passaram.

Seta reproduzida com display:block e alinhamento normal no select. A correção usa
flex e alinhamento central, com ícone à direita. Conferência visual do controle
aberto e fechado; seleção por teclado mudou de 1080p para 1440p e fechou a lista.
Mantidos foco visível, tema escuro e fallback nativo. Evidências em
`evidence/audio-2.4.1.json`, `evidence/tests-2.4.1.txt`, `evidence/build-2.4.1.txt`
e `evidence/vio-2.4.1-select-1790470121670.jpg`.

Os ensaios usam sinal sintético no navegador e sinalização real na sala de teste.
Não comprovam áudio audível entre dois aparelhos, periféricos físicos, Safari/iPhone
ou relay TURN. Essas limitações da bancada permanecem; não se afirma reprodução
integral do ambiente do usuário.

## Atualização 2.4.0 — 26/09/2026

30 testes automatizados aprovados. O servidor mantém duas assinaturas principais
com IDs estáveis, rejeita a terceira sem fechar as abertas, permite substituição
explícita e preserva voz. Seleção pura verifica foco sem mudança da lista/ordem,
substituição só da principal e promoção da tela que já estava aberta.
Histórico integral do VIO_2, origem, identidade, payloads, TURN, saída de áudio,
service worker e reinício real de servidor continuam cobertos pela suíte.

Chrome 151, `tests/WatchLab.tsx`: quatro sessões reais de sinalização; três fontes
sintéticas. No ingresso, zero telas assistidas e zero assinaturas de tela recebidas.
Depois de Assistir e Em conjunto, os dois elementos de vídeo e seus MediaStreams
permaneceram idênticos, progredindo e sem eventos de pause ao alternar o foco.
A revisão com áudio separado preservou também os dois elementos audio e seus streams, tocando e não mudos; os vídeos ficam mudos para evitar duplicação. Mute
individual persistiu na troca; ensurdecer silenciou ambos e restaurou o mute manual.
Encerrar a principal promoveu a secundária; fechar a última não abriu outra.
Em 320 × 844, os dois vídeos e seus controles ficaram dentro do player, sem
rolagem externa; a tela secundária mediu 172 × 96,75 px. Também conferidos
768 × 390 e 1920 × 1080: vídeos, controles, cards e dock dentro do player;
sem rolagem externa. No monitor amplo, secundária de 420 × 236,25 px.
Ao habilitar prévias, a miniatura de uma terceira transmissão mediu 234 × 131,625 px,
sem alterar a reprodução das duas telas escolhidas.
Depois da otimização de prévias, alternar duas vezes não emitiu comandos de
assinatura. Trocar pela terceira preservou o vídeo e o áudio da secundária.

Esse laboratório fornece as fontes sintéticas diretamente à camada de reprodução,
para verificar DOM e continuidade sem depender de ICE. As assinaturas passam pelo
servidor real, mas o ensaio **não comprova transporte WebRTC entre aparelhos**.
Uma segunda aba independente entrou na sala (cinco sessões) e escolheu duas
transmissões; os vídeos remotos ficaram sem quadros neste ambiente.
Os limites de teste físico/relay documentados abaixo permanecem. Não foi alegado
aceite de captura física, Safari/iPhone ou continuidade audível em redes diferentes.

Degradê de CTA com contraste mínimo de 6,68:1; no pico do brilho, 5,25:1.
Texto e controles novos superam AA. Efeitos acrescentados usam transform/opacity,
respeitam reduced-motion e restringem hovers animados a ponteiro fino.
Revisão visual executada: azul #2727F5, tema escuro, fontes locais modernas,
sem roxo-azul genérico, blob, emojis, cursores com direção errada, cards de marketing
repetidos ou dependências de animação. Sem dependências novas ou mudança de plano.

Complemento da sala: oito participantes em grade com altura limitada; esconder e
restaurar funcionaram. Em 320 × 844 e 768 × 390, sem rolagem externa e com painel/dock
dentro do vídeo. Aviso medido em 28 × 28 px, raio de 50%, fundo transparente.
Entrada na chamada verificada pela UI: sem fontes locais e sem voz recebida antes;
após entrar, uma assinatura de voz e microfone ainda desligado, sem captura local.
Ativar microfone criou somente voz; sair removeu voz/assinatura da conversa e preservou
os mesmos quatro elementos de reprodução das duas telas, sem pause.
Switch de ganho habilitou 300% no range; End chegou a 300% e Escape fechou o popover.
Seleção de 1080p refletiu o valor aceito. FeatureLab mediu ganho real de tela 3,00×,
volume zero silencioso e captura original ainda viva após desmontar a reprodução.
PiP nativo de vídeo abriu/fechou no Chrome de teste, confirmado pelo estado do botão.
Na prévia HTTP, Document PiP não estava disponível. Após o primeiro deploy 2.4,
a sala HTTPS abriu uma janela Document PiP com CSS e controles; Entrar na chamada
funcionou dentro dela e Voltar devolveu o player à sala com a chamada preservada.
Esse teste não solicitou hardware nem transmitiu mídia entre janelas/dispositivos.

ExpressTURN foi configurado no serviço Render, UDP/TCP 3478, e o deploy de configuração
ficou live. Credenciais não foram incluídas no Git. BrowserLab com os mesmos servidores
ICE configurados: presença, duas publicações de tela e voz/câmera aprovadas; timeout de
40 segundos aguardando conexões. 32 peers com descrições local/remota estáveis, zero
candidatos enviados/recebidos e zero bytes. O ensaio não confirma alocação nem transporte
TURN. É necessário validar com dois dispositivos e redes reais. Resultado preservado
em `evidence/media-turn-2.4.0.json`, sem credenciais.

Checagem da publicação: Render live no commit 5a7b889; página exibindo 2.4.0.
HTTP: healthz, CSP/HSTS, configuração, manifest/service worker, código-fonte e recusa
de origem externa aprovados. O script Node falhou ao conectar WSS; pelo navegador,
o ingresso na mesma origem funcionou, com ping do servidor e uso dos controles.
Evidência de Document PiP: `evidence/vio-2.4-pip-1790444416386.jpg`.

A próxima etapa Windows/WASAPI está especificada em DESKTOP-WASAPI.md; nenhum
instalador ou módulo nativo é alegado como entregue.

Evidências: `evidence/tests-2.4.0.txt`, `evidence/build-2.4.0.txt`,
`evidence/contrast-2.4.0.json` e `evidence/ui-2.4.0.json`.

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
