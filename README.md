# VIO

Uma sala para compartilhar tela, conversar e assistir com amigos.

**by NerdQuest Studios · fundado por Nine**  
Nova implementação **2.2.0** · **AGPLv3** · **Node 24**

Publicado em 16/09/2026: [abrir VIO TEST](https://vio-test.onrender.com/).
Repositório privado **Fernando-Nine/VIO_TEST**, criado pelo usuário, e serviço Render
**vio-test**, plano Free, região Virginia, uma instância.
Os repositórios **VIO** e **VIO_2** não fazem parte desta entrega e não devem ser alterados.

Este projeto foi criado do zero. Somente o CHANGELOG.md de Fernando-Nine/VIO_2 foi
importado integralmente. O código anterior não foi importado. A versão 2.0.0 marca
a mudança de sistema e continua a numeração após a 1.9.0. Consulte [o estado da entrega](ESTADO-DO-PROJETO.md) e
[a matriz de validação](docs/VALIDACAO.md) antes de colocar o serviço em uso.

## Executar

```bash
npm ci
cp .env.example .env
npm run dev
```

Abra `http://localhost:3000`. No Windows, copie `.env.example` para `.env` pelo
Explorador ou `Copy-Item .env.example .env`. Para conservar a identidade das sessões
entre reinícios, gere uma vez um segredo e salve em `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Em desenvolvimento sem segredo, um valor temporário é gerado a cada inicialização.
Em produção, um segredo explícito com pelo menos 32 caracteres é obrigatório.

```bash
npm test
npm run typecheck
npm run build
npm start
```

O build gera o cliente, o servidor e `dist/source.tar.gz`, oferecido no próprio app.
Requer `tar`, disponível nas imagens Docker fornecidas e em sistemas recentes.
`npm start` usa os arquivos compilados. Para produção, configure `.env` com
`NODE_ENV=production`, segredo e origens HTTPS.

## Interface 2.2.0

Entrada e sala em carvão, branco suave e azul #2727F5, com Bricolage Grotesque e
Instrument Serif locais. A entrada cabe na janela de desktop; celulares mantêm
rolagem natural. O fundo geométrico se move suavemente e respeita movimento reduzido.

A sala ocupa a altura disponível, com controles sobre a transmissão. Arraste a alça
“Por aqui” para mover os cards entre seis encaixes, clique nela para escolher uma
posição ou use as setas do teclado. Os cards desaparecem após 4,5 segundos sem
atividade; o alfinete permite mantê-los visíveis. Mover o mouse, tocar ou usar o
teclado traz os controles de volta. O foco de teclado e os menus abertos impedem a
ocultação. A posição se adapta ao redimensionamento e à tela cheia.

## O que a interface oferece

- Salas por código, sem conta e sem anfitrião. Até seis pessoas por padrão; o “?” explica o custo das conexões diretas.
- Compartilhamento simultâneo de telas. Cada espectador escolhe uma tela principal.
- Miniaturas ao vivo opcionais, desligadas por padrão, com iniciais no lugar do vídeo.
  Quando ligadas, até duas miniaturas visíveis são recebidas em baixa resolução, sem áudio.
- Ajustes nas abas Vídeo e Áudio. Microfone com limiar de abertura separado do volume.
- Ganho manual de 20% a 300% apenas quando o ganho automático está desligado.
- Saída de áudio própria para conversa e telas, exibida apenas com suporte à API.
- Indicadores de fala locais/remotos, duração comum da sala e ping com cores.
- Instalação PWA em celulares; salas, sessões e sockets nunca passam pelo service worker.
- Câmera independente da tela, prévia local espelhada e troca de dispositivo.
- Mute, ensurdecer, volume da tela e volume local de voz por pessoa.
- Qualidade por preset ou FPS, bitrate e escala; valores efetivos no diagnóstico.
- Convites, painéis, estados de erro, versão e histórico acessível.
- Sons discretos e diferentes para compartilhar/parar, mutar/desmutar e ensurdecer.
  Desative todos em **Ajustes → Áudio → Sons dos controles**.
- Reentrada após queda de sinalização, renovação de sessão, ICE restart e TURN opcional.

Implementação não equivale a validação em todas as redes e navegadores. A matriz de
validação identifica as partes comprovadas e as que dependem de dispositivos,
credenciais ou conectividade externa.

## Usar a sala

1. Digite seu nome. Deixe o código vazio para criar uma sala com código aleatório.
2. Copie o convite e envie por um canal de sua escolha.
3. Ative microfone e câmera quando quiser. Eles começam desconectados.
4. Clique em Compartilhar e selecione a fonte no navegador. A existência de áudio é
   detectada pela trilha efetivamente retornada, não pela opção solicitada.
5. Escolha a tela no seletor. Ajustes de reprodução são locais.

Ensurdecer silencia áudio remoto e suspende o envio do microfone. Ao desativar,
o mute manual continua como você o deixou. A própria voz nunca é reproduzida por
padrão. Usar fones ajuda a evitar que o som do sistema recapture a conversa.

## Arquitetura e limites

`src/client` separa captura, WebRTC, estado da sala e interface. `src/server` contém
HTTP, sessões, validação e salas. `src/shared` define protocolo, qualidade e releases.
Uma conexão WebRTC por assinatura mantém tela, voz e câmera independentes. O dono
da publicação é o único ofertante daquela conexão. Trocas usam novas gerações, e
candidatos ICE esperam pela descrição remota correspondente.

A aplicação principal usa um servidor Node na Render. P2P transmite diretamente
quando existe uma rota; TURN retransmite a mídia quando configurado e selecionado.
Portanto, mídia **pode passar por um servidor TURN**. Não há gravação.

Padrão: seis participantes. O valor anterior de quatro era uma configuração conservadora.
O limite existe porque cada navegador envia mídia aos demais; salas maiores exigem
outra arquitetura, como uma SFU. A capacidade efetiva depende de
CPU, navegador e upload de cada pessoa. A tela consome aproximadamente seu limite de
bitrate vezes o número de espectadores principais, mais miniaturas e overhead.
No preset Alta, três espectadores podem demandar aproximadamente 12 Mbps só de vídeo
da tela. Voz e câmera acrescentam tráfego. A configuração permite de duas a seis
pessoas, mas aumentar o limite não substitui medição. SFU é uma evolução futura.

A captura exige HTTPS ou localhost, interação explícita e permissão. O suporte a
captura de tela, áudio de aba/janela/sistema, câmera e tela cheia varia por navegador
 e sistema operacional. O app detecta capacidades e tracks reais; não promete
isolamento de áudio universal. [Limites e fontes](docs/NAVEGADORES.md).

## Configuração

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | 3000 | Porta HTTP e Socket.IO; Render fornece seu valor |
| `NODE_ENV` | desenvolvimento | `production` exige configuração segura |
| `SESSION_SECRET` | temporário em dev | HMAC de sessão e IDs estáveis; segredo no servidor |
| `SESSION_TTL_SECONDS` | 3600 | Duração do token, renovado antes de expirar |
| `ALLOWED_ORIGINS` | localhost em dev | Origens explícitas, separadas por vírgula |
| `TRUST_PROXY` | false | Número de hops ou CIDRs confiáveis; nunca `true` irrestrito |
| `SOCKET_PATH` | /socket.io | Path da sinalização |
| `SIGNALING_URL` | mesma origem | URL pública opcional do WebSocket |
| `STUN_URLS` | STUN público Google | Lista separada por vírgula; pode ser vazia |
| `TURN_URLS`, `TURN_SECRET` | vazios | Configuração opcional de relay |
| `TURN_TTL_SECONDS` | 600 | Expiração das credenciais TURN |
| `MAX_PARTICIPANTS` | 6 | Pessoas por sala; intervalo aceito 2–6 |
| `MAX_ROOMS` | 200 | Limite de salas em memória |
| `MAX_SOCKETS_PER_IP` | 20 | Conexões simultâneas por IP |
| `RECONNECT_GRACE_SECONDS` | 90 | Preserva presença durante queda temporária |
| `ROOM_TTL_SECONDS` | 300 | Expiração de salas vazias |
| `WEB_CONCURRENCY` | 1 | Exige uma instância |
| `ENABLE_TEST_LAB` | 0 | Laboratório somente em desenvolvimento |

Todas são lidas em runtime pelo servidor. Sem chaves privadas no frontend.

## Documentação e testes

- [PRD e decisões](docs/PRD.md)
- [Render, Docker, migração e rollback](docs/DEPLOY.md)
- [TURN e coturn](docs/TURN.md)
- [Navegadores e referências](docs/NAVEGADORES.md)
- [Segurança e privacidade](docs/SEGURANCA.md)
- [Matriz final e procedimento de teste](docs/VALIDACAO.md)
- [Estrutura de arquivos](docs/ARVORE.md)
- [Histórico](CHANGELOG.md)

Para o laboratório de mídia:

```bash
npm run test:media
```

Abra `/qa` em localhost e execute o teste. O laboratório cria fontes sintéticas
identificadas e usa o mesmo código de mídia do app. Não é incluído no build do cliente
de produção. Preserve o JSON de resultados, informando navegador, sistema e rede.

## Próxima etapa nativa

O contrato `CaptureAdapter` permite substituir a captura do navegador em uma futura
versão Tauri. A etapa Windows precisará implementar e validar WASAPI, seleção de
processo/janela, permissões, empacotamento e assinatura do instalador. Nada disso é
incluído nesta entrega web.

## Licença

[GNU AGPL versão 3](LICENSE). As fontes tipográficas e dependências mantêm suas
próprias licenças; os textos OFL estão em `docs/licenses`. O histórico mostrado no app
e o CHANGELOG usam `src/shared/releases.ts` e `src/shared/legacy-releases.json`.
O arquivo anterior completo, preservado byte a byte, está em `docs/CHANGELOG-VIO_2.md`.
