# VIO — estado da nova implementação

> Estado atual em 12/10/2026: **VIO principal 2.7.1 publicado e verificado** em https://vio-quest.onrender.com/. Código novo em Fernando-Nine/VIO (196ba88), sem force push. **2.8.0-rc.2 publicada exclusivamente no vio-test**: Chat, papéis, notificações, mescla da tira e automático centralizado. E8 autorizado em 12/10 e implementado na prévia. E10 e interface E12 aguardam aprovação. Referências antigas abaixo são histórico; prevalece docs/RODADA-E.md.

## Histórico anterior à rodada E


Produção: **2.6.0**. Ramo `feat/canvas-widgets`: **2.7.0-rc.5**, em 10/10/2026, ainda em revisão.

O canvas, a tira e os widgets individuais/compartilhados estão implementados. A rodada C
corrigiu recuperação automática, foco único, encerramento de widgets, compartilhamento
sem duplicação e controles redundantes. Esta continuação também corrige o botão de
salvar notas sob a barra, retorno de foco, avisos fora da tela e camadas dos flutuantes
ou popovers. As mudanças preservam a identidade dos widgets e o caminho de mídia.

Prévia: https://vio-test-canvas-preview.onrender.com/, ramo `feat/canvas-widgets`, PR #3.
**74 testes aprovados**, TypeScript e build de produção em 10/10/2026. O teste de
reconexão usa sinalização real e reinício local; não substitui captura/escuta em
aparelhos. Prévia rc.5 conferida em 11/10/2026: cópias independentes, Pessoas com criador/ping,
barra automática e alinhamento da tira. Os resultados visuais estão em `docs/VALIDACAO.md`.

A rodada D implementa D1–D13, incluindo Notas ampliadas e envio de cópias (C24),
barra de fullscreen, roda unificada da tira, controles simplificados e painel Pessoas.
D14 (módulos) e D15 (mesclar slots vizinhos, inclusive na tira) aguardam escolha em
`docs/RODADA-D.md`. A prévia depende do aceite de mídia, celular e navegadores
antes da integração à produção. Consulte `docs/PENDENCIAS.md`.
O instalável/WASAPI e o futuro dono da sala seguem separados.

Histórico desta base: versão **2.6.0**, em 27/09/2026. Sistema reescrito do zero; o protótipo desta base
foi chamado de 0.1.0. A numeração passa a continuar após a versão histórica 1.9.0.
Somente o CHANGELOG.md do VIO_2 foi lido e importado, preservado integralmente.

## Destino definido em 16/09/2026

O usuário criou o novo repositório privado **Fernando-Nine/VIO_TEST**. O acesso
de leitura e escrita foi confirmado em 16/09/2026. Esta base usa exclusivamente
esse repositório. O serviço **vio-test** foi publicado em 16/09/2026 no My Workspace,
plano Free, região Virginia, uma instância: https://vio-test.onrender.com/.
VIO e VIO_2 estão fora do escopo de alterações e não foram alterados.

## Implementado

Servidor Node/Express/Socket.IO, contratos TypeScript, sessões assinadas, salas e
presença, assinaturas seletivas de tela, captura de tela/voz/câmera, miniatura reduzida
na origem, controles de qualidade e reprodução, mute/ensurdecer, troca de dispositivos,
reconexão, ICE restart, credenciais TURN temporárias e diagnóstico.

Interface React com CSS próprio, fontes locais, versão/histórico, convites, painéis,
responsividade, controles por teclado, sons de compartilhamento e sons distintos de
mute/desmute/ensurdecer. Sons opcionais com volumes e eventos ajustáveis.

Configuração para uma instância na Render, Docker, proxy reverso, `.env.example`,
health check, pacote de código-fonte no app, licença e documentação de implantação.

Adições da 2.0.0: fala remota acompanhando trilhas tardias, prévias opcionais
desligadas por padrão, abas Vídeo/Áudio, ganho manual de 20% a 300% exclusivo do
modo sem AGC, saída de áudio para voz e tela, instalação PWA, duração comum da sala,
seis participantes com explicação e ping visível com cores.

Adições da 2.1.0: entrada redesenhada com tipografia expressiva, composição
assimétrica, fundo marfim, prévia interativa de recursos, inicial personalizada
e cursor próprio. Fluxos de sala, áudio, vídeo, instalação e histórico preservados.

Adições da 2.2.0: tema escuro unificado, fundo sutil animado, entrada ajustada à
altura do desktop, transmissão ampliada e painel de cards flutuante com seis
encaixes, arraste, teclado, seleção por clique e ocultação opcional por inatividade.

Adições da 2.3.0: prévias maiores em 16:9, ocultação em 2 segundos, remoção do
espaço lateral em monitores largos, resoluções nominais de 240p a 2160p,
fontes sem cursiva e cursor de mão azul. Saída de áudio com validação de dispositivo
salvo, proteção contra falhas de elementos removidos e recuperação na desconexão.
Por pedido explícito do usuário, retirado o teto de seis pessoas: a partir de seis
há aviso de custo, sem bloquear novos participantes. MAX_PARTICIPANTS é ignorada.

Adições da 2.4.0: entrada manual em transmissões, duas telas assistidas com áudio
independente e foco que preserva ambas as conexões e elementos de mídia.
Terceira tela substitui somente a principal; fechar uma mantém a outra.
Degradês no tema azul, brilho breve e hovers sutis com movimento reduzido respeitado.
Grade de participantes com altura limitada e opção de esconder/restaurar; aviso circular
mais discreto e marca VIO clicável. Chamada independente das telas, microfone inicialmente
desligado. Volume, fullscreen e PiP no dock; ganho de tela opcional até 300%, switches
e seletores nativos modernizados. Document PiP interativo quando suportado.

Correções da 2.4.1: reprodução nativa das telas até 100%, faixas tardias notificadas
aos consumidores e ganho extra isolado com retorno ao áudio nativo em caso de falha.
Setas dos seletores alinhadas à direita. Duas telas, volumes e foco preservados.

Adições da 2.5.0: painel Pessoas e telas com presença explícita na chamada,
filtros e seleção de transmissões. Várias telas assistidas, sem o teto de duas;
janelas menores móveis, redimensionáveis, organização à direita/embaixo e controles
por teclado/botão. Foco preserva os elementos e o áudio. Saída imediata com isolamento
de respostas antigas e cancelamento de capturas pendentes. Confirmações repetidas
de assinaturas deixam de ser enviadas enquanto a sala permanece na mesma conexão.

## O que foi comprovado

Os resultados exatos, incluindo comandos, navegador e limitações do ambiente,
estão em `docs/VALIDACAO.md`. O fato de um módulo estar implementado não significa
que mídia em redes físicas ou em todos os navegadores foi validada.

## Bloqueio de aceite de mídia

O teste no navegador publicou as fontes, mas não estabeleceu transporte WebRTC:
zero candidatos remotos e zero bytes enviados. A causa ainda precisa ser isolada
em HTTPS/localhost e com TURN real. A transmissão não está marcada como aprovada.
Consulte `docs/VALIDACAO.md` e `docs/evidence/media-browser.json`.

## Dependências externas

- Render publicado e respondendo por HTTPS; entrada em sala confirmada no navegador. Testes de mídia entre dispositivos e recuperação durante deploy permanecem pendentes.
- ExpressTURN configurado no Render em 26/09/2026, UDP/TCP na porta 3478, com credenciais apenas em variáveis de ambiente. Configuração não comprova transporte de mídia via relay.
- Captura física, revogação de permissão e reprodução em Safari/iPhone: dependem de
  navegador em HTTPS/localhost e dispositivos reais.
- Capacidade de mídia com grupos maiores: precisa de medição em máquinas/redes físicas.

A entrega é uma base executável com validação documentada. O aceite completo de mídia
em produção permanece condicionado aos testes externos listados.

## Fora desta entrega por definição

SFU, múltiplas instâncias, contas, gravação, chat textual e cobrança.

## Próxima etapa solicitada

Aplicativo Windows instalável com WASAPI. Preparação em `docs/DESKTOP-WASAPI.md`,
com contrato de integração, ordem de implementação e critérios de teste físico.
O instalador e a captura WASAPI não fazem parte do executável web. Existe trabalho
em andamento no ramo nativo, mas a compilação, o instalador e a captura em Windows
real ainda não foram aprovados. A PWA atual não recebe acesso nativo por estar instalada.

## Preferências entregues na 2.6.0

Aba Aplicativo com volume geral local, volume dos efeitos, oito eventos de som
independentes e prévias. Entrada e saída da sala agora têm sons; reconexões não
repetem a entrada. A intensidade dos efeitos aumentou, com envelope curto e
coalescência de avisos simultâneos. Preferências persistem neste navegador.

Cores pessoais com oito presets, círculo +, seletor HSV por ponteiro/teclado e HEX.
Aplicação explícita e sincronizada com a sala, somente para o próprio participante;
validação estrita e limite de 20 alterações/minuto por identidade. Cor permanece na
reconexão e volta ao anil ao sair. Opção local de estender as cores às transmissões.
Texto dos avatares e destaques têm contraste calculado; ping e alertas não mudam.

Segurança da troca de sala permanece: autenticação, verificação de dono, origens e
limites por IP não foram removidos. Aplicativo nativo/WASAPI segue como próxima etapa.
