# VIO — estado da nova implementação

Versão **2.3.0**, em 25/09/2026. Sistema reescrito do zero; o protótipo desta base
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
mute/desmute/ensurdecer. Sons opcionais e em volume discreto.

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
- Relay TURN real: sem servidor/credenciais de relay configurados.
- Captura física, revogação de permissão e reprodução em Safari/iPhone: dependem de
  navegador em HTTPS/localhost e dispositivos reais.
- Capacidade de mídia com grupos maiores: precisa de medição em máquinas/redes físicas.

A entrega é uma base executável com validação documentada. O aceite completo de mídia
em produção permanece condicionado aos testes externos listados.

## Fora desta entrega por definição

Tauri, WASAPI, instalador Windows, SFU, múltiplas instâncias, contas, gravação,
chat textual e cobrança. Nenhum desses módulos foi alegado como entregue.
