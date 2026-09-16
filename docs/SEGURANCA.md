# Segurança e privacidade

O VIO valida origem, sessão, sala, papel de cada conexão e payload em cada ação.
Essas medidas reduzem riscos; não constituem garantia de segurança.

- O servidor gera o ID anônimo e assina o token HMAC-SHA256. O navegador não escolhe
  identidades de participantes. Tokens expiram e são renovados durante a sessão.
- A sessão fica em `sessionStorage` da aba. Preferências ficam em `localStorage`.
  Não há conta, banco de dados, gravação ou histórico de conversas.
- Nome, código, publicações e sinais têm schemas estritos e limites. Os nomes são
  renderizados pelo escaping do React; nunca por `dangerouslySetInnerHTML`.
- Apenas membros da mesma sala podem assinar publicações e negociar. O servidor
  encontra o destinatário pela assinatura, sem confiar em um ID de destino declarado.
- O handshake exige uma origem explícita permitida e token válido. WebSocket tem
  payload máximo de 64 KiB. Sessão, ingresso e handshake têm limites por IP;
  comandos e sinalização têm limites por identidade verificada.
- Uma mesma sessão ativa não pode ocupar dois sockets diferentes dentro da sala.
  Nomes iguais são permitidos e não substituem identidade.
- `TRUST_PROXY` exige topologia explícita. O valor padrão ignora cabeçalhos de IP
  apresentados por clientes diretos. Rate limit não é substituto para proteção DDoS
  do provedor.
- Helmet, CSP, Permissions-Policy e Referrer-Policy limitam conteúdo e permissões.
  O cliente usa fontes locais. HTTPS/WSS deve ser garantido pelo proxy em produção.
- Tokens, credenciais TURN, SDP completo e conteúdo de mídia não são registrados nos
  logs da aplicação. Os logs estruturados atuais registram apenas início/encerramento.
  Configure retenção curta, por exemplo até sete dias, no coletor/provedor que usar;
  o código não controla a retenção dos logs de infraestrutura da Render.
- TURN exige segredo independente e cotas no relay; credenciais efêmeras não impedem
  abuso durante sua validade. Veja TURN.md.
- O código-fonte público é empacotado por allowlist. `.env`, cache, dependências
  instaladas e dados da sessão não entram no arquivo.

Os códigos aleatórios têm 64 bits. Códigos simples escolhidos por pessoas oferecem
menor resistência à adivinhação. Quem conhece o código pode entrar enquanto houver
vaga; o produto não implementa sala privada com senha. Não há um moderador que possa
expulsar terceiros. Essa decisão mantém o escopo pedido para grupos de confiança.

As salas e limites expiram em memória. Reiniciar remove esses contadores; para uso
público em maior escala, complemente-os com controles duráveis no proxy/provedor e
coordenação de aplicação antes de adicionar instâncias.

Os testes cobrem entradas malformadas, isolamento entre salas, falsificação,
assinaturas de terceiros, origens negadas e limites de eventos. A auditoria de
produção executada nesta sessão não reportou vulnerabilidades conhecidas nos pacotes
instalados na data da consulta. Isso não prevê vulnerabilidades futuras.

As decisões seguem os princípios de validar origem, autorizar mensagens, limitar
payload e tráfego e evitar logs sensíveis da [OWASP para WebSocket](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html).
