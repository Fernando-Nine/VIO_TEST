# VIO — estado da nova implementação

Versão 0.1.0, criada do zero em 15/09/2026. Não deriva da antiga 1.2.0.

## Destino definido em 16/09/2026

O usuário criou o novo repositório privado **Fernando-Nine/VIO_TEST**. O acesso
de leitura e escrita foi confirmado em 16/09/2026. Esta base usa exclusivamente
esse repositório; a implantação no Render ainda precisa ser realizada.
VIO e VIO_2 estão fora do escopo de alterações. O serviço previsto no render.yaml
agora se chama **vio-test**; sua criação no Render também permanece pendente.

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

- Render conectado; publicação depende da confirmação do workspace e do acesso da Render ao repositório privado VIO_TEST. O esquema do Blueprint passou; nenhum serviço foi criado ou alterado.
- Relay TURN real: sem servidor/credenciais de relay configurados.
- Captura física, revogação de permissão e reprodução em Safari/iPhone: dependem de
  navegador em HTTPS/localhost e dispositivos reais.
- Capacidade final de quatro pessoas: precisa de medição em máquinas/redes físicas.

A entrega é uma base executável com validação documentada. O aceite completo de mídia
em produção permanece condicionado aos testes externos listados.

## Fora desta entrega por definição

Tauri, WASAPI, instalador Windows, SFU, múltiplas instâncias, contas, gravação,
chat textual e cobrança. Nenhum desses módulos foi alegado como entregue.
