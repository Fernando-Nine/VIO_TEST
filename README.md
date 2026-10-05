# VIO

Uma sala para compartilhar tela, conversar e assistir com amigos.

**by NerdQuest Studios · fundado por Nine**  
Prévia de desenvolvimento **2.7.0-rc.1** · **AGPLv3** · **Node 24**

Produção permanece na versão 2.6.0. Esta prévia está no ramo `feat/canvas-widgets` e ainda requer aceite manual.

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

## Canvas e widgets — prévia 2.7

Tela grande, transmissões menores e widgets participam do mesmo grid. Use **Layout**
para escolher a grade ou **Foco + tira**. O botão de foco troca o widget com o
primeiro espaço; **Foco único** esconde os demais mantendo o áudio conectado.
Só a opção **Flutuante** destaca uma transmissão sobre o grid. Esconder um widget
conserva seu lugar; desconectar uma transmissão libera o espaço.

Na tira, os botões avançam um item por vez. Três espaços ficam visíveis no desktop,
dois em celulares médios e um em telas estreitas. Novos convites entram no fim.
No grid cheio, um diálogo pergunta antes de alterar a organização.

Notas, placares e cronômetros começam individuais. Compartilhar envia apenas o
conteúdo para a sala; cada pessoa escolhe onde colocá-lo. Só o criador pode mudar
sua estrutura ou excluir para todos. As permissões são conferidas pelo servidor.
O conteúdo compartilhado é temporário. Os widgets individuais ficam neste navegador.

Arraste a alça ou use **Organizar → Espaço** para mover por clique, toque e teclado.
O menu também ajusta a posição e o tamanho das janelas. Os controles flutuantes
auxiliares desaparecem após dois segundos sem atividade, preservando foco de teclado.
Tema escuro, azul #2727F5, fontes locais e movimento reduzido permanecem.

Detalhes: [arquitetura do canvas](docs/CANVAS.md), [validação](docs/VALIDACAO.md)
e [pendências em linguagem simples](docs/PENDENCIAS.md).

## O que a interface oferece

- Salas por código, sem conta e sem anfitrião. Sem teto por sala; a partir de seis pessoas, o “?” destaca o custo das conexões diretas.
- Compartilhamento simultâneo de telas. Cada espectador escolhe quando assistir e pode manter várias telas abertas, com foco intercambiável.
- Miniaturas ao vivo opcionais, desligadas por padrão, com iniciais no lugar do vídeo.
  Quando ligadas, até duas miniaturas visíveis são recebidas em baixa resolução, sem áudio.
- Ajustes nas abas Vídeo e Áudio. Microfone com limiar de abertura separado do volume.
- Ganho manual de 20% a 300% apenas quando o ganho automático está desligado.
- Saída de áudio própria para conversa e telas, exibida apenas com suporte à API.
- Indicadores de fala locais/remotos, duração comum da sala e ping com cores.
- Instalação PWA em celulares; salas, sessões e sockets nunca passam pelo service worker.
- Câmera independente da tela, prévia local espelhada e troca de dispositivo.
- Mute, ensurdecer, volume da tela e volume local de voz por pessoa.
- Qualidade por preset ou FPS, bitrate e resolução de 240p a 2160p; valores efetivos no diagnóstico.
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
3. Clique em Entrar na chamada para ouvir a conversa. O microfone entra desligado; só é capturado ao ativá-lo. Sair da chamada preserva as telas assistidas.
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

Não há bloqueio de entrada por quantidade de participantes. A partir de seis, a
interface destaca o custo da malha P2P. Isso não garante capacidade ilimitada:
CPU, navegador e upload de cada pessoa continuam determinando a qualidade. A tela
consome aproximadamente seu bitrate vezes o número de espectadores principais,
mais miniaturas e overhead. No preset Alta, três espectadores podem demandar
aproximadamente 12 Mbps só de vídeo. Voz e câmera acrescentam tráfego; uma SFU
continua sendo uma evolução futura para grupos maiores.

A variável antiga `MAX_PARTICIPANTS` deixou de ser usada, inclusive em instalações
que ainda a tenham definida. Limites de salas, conexões por IP e taxa de pedidos
permanecem ativos. A API informa `maxParticipants: null` e `recommendedParticipants: 6`.

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
| `MAX_ROOMS` | 200 | Limite de salas em memória |
| `MAX_SOCKETS_PER_IP` | 20 | Conexões simultâneas por IP |
| `RECONNECT_GRACE_SECONDS` | 90 | Preserva presença durante queda temporária |
| `ROOM_TTL_SECONDS` | 300 | Expiração de salas vazias |
| `WEB_CONCURRENCY` | 1 | Exige uma instância |
| `ENABLE_TEST_LAB` | 0 | Laboratório somente em desenvolvimento |

A saída de áudio salva só é reaplicada quando o dispositivo está acessível. Se a
permissão ou o identificador mudou, confirme a saída em Ajustes → Áudio. Desconectar
o dispositivo selecionado aciona uma tentativa de retorno ao padrão do sistema.

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
processo/janela, permissões, empacotamento e assinatura do instalador. A preparação e o aceite da próxima etapa estão em [DESKTOP-WASAPI.md](docs/DESKTOP-WASAPI.md). O instalador e a captura nativa ainda não estão implementados.

## Licença

[GNU AGPL versão 3](LICENSE). As fontes tipográficas e dependências mantêm suas
próprias licenças; os textos OFL estão em `docs/licenses`. O histórico mostrado no app
e o CHANGELOG usam `src/shared/releases.ts` e `src/shared/legacy-releases.json`.
O arquivo anterior completo, preservado byte a byte, está em `docs/CHANGELOG-VIO_2.md`.

## Assistir em conjunto

O painel **Pessoas e telas** reúne presença, chamada e transmissões. **Assistir** abre
uma tela; **Em conjunto** acrescenta outras, sem o antigo limite de duas.
**Focar** promove uma tela já aberta, preservando todas as conexões, vídeos e áudios.
**Só esta** fecha as demais por escolha explícita. O X fecha somente aquela tela;
se a principal terminar, uma das telas já abertas assume o foco.

Arraste o nome das janelas menores para movê-las e o canto inferior para ajustar
o tamanho. As setas do teclado também funcionam. O menu **Organizar tela** oferece
barra de tamanho, três tamanhos prontos e seis posições por clique. No painel de
pessoas, **Organizar telas** redistribui as janelas à direita ou embaixo.
Posições são ajustadas aos limites da área útil quando a janela muda de tamanho.
Nenhuma faixa lateral é reservada; o vídeo principal ocupa todo o player.

Cada tela assistida usa qualidade principal com áudio e volume independente.
Mais telas exigem mais rede e processamento; não há garantia de capacidade ilimitada.
As prévias opcionais dos cartões continuam leves, mudas e limitadas a duas.
A referência de interação está em [docs/MULTITELAS-UX.md](docs/MULTITELAS-UX.md).

Degradês discretos seguem o azul da marca. Brilho no hover dos botões de ação e
pequenos deslocamentos usam transform/opacity, sem dependências adicionais.

## Controles da sala 2.5

O painel de participantes usa duas colunas e altura limitada; com prévias, usa uma coluna mais ampla. Esconda pelo
ícone de minimizar ou pelo botão Pessoas no dock; o mesmo botão restaura a grade.
O aviso de carga continua informativo, com ícone circular discreto, sem limitar entradas.
A marca VIO volta à entrada e encerra sua participação na sala.

Volume, tela cheia e PiP ficam junto dos controles da chamada. No desktop, passe
o mouse sobre Volume para abrir as barras; clicar no ícone silencia a tela em foco.
No celular, tocar abre as barras. Cada transmissão assistida tem volume próprio.
Em Ajustes → Vídeo → Áudio das telas, o switch Ajuste fino libera até 300%; desligá-lo
limita os volumes novamente a 100%. O ganho é local e não altera o áudio enviado.

A janela Document PiP, quando suportada, mantém os controles da sessão e os mesmos
elementos de mídia. Fechá-la devolve a sessão à janela principal. Em navegadores
com apenas PiP de vídeo, os controles disponíveis são os do navegador. Instalar a
PWA não acrescenta WASAPI nem suporte de PiP ausente na plataforma.


## Sons e cores — 2.6.0

Em **Ajustes → Aplicativo**, o volume geral ajusta tudo que você ouve: vozes,
áudio das telas e efeitos. Os volumes individuais continuam guardados. O envio do
microfone não é alterado. O volume dos efeitos controla apenas os avisos do VIO,
com oito eventos independentes e botões para experimentar cada som. Suas escolhas
ficam salvas neste navegador; desativar os sons não apaga essas preferências.

Em **Pessoas**, ou clicando no próprio avatar, escolha uma das oito cores ou abra o
círculo com +. O quadro ajusta saturação/brilho por arraste ou setas; a barra muda a
matiz, e o campo HEX aceita três ou seis dígitos. **Aplicar cor** compartilha a escolha
com a sala. Ela permanece nas reconexões e volta ao anil depois de uma saída explícita.

**Cores das pessoas nas transmissões**, na aba Aplicativo, controla somente sua
visualização dos destaques de fala, bordas e sinal de ao vivo. A cor dos avatares é
mantida. Ping, alertas e erros continuam com suas cores de estado. A cor compartilhada
é validada e limitada a 20 alterações por minuto por identidade autenticada.
