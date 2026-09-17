# TURN opcional

TURN atende redes em que o caminho direto não funciona. Ele recebe e retransmite
mídia; STUN apenas ajuda a descobrir endereços. O backend emite credenciais temporárias
somente para uma sessão já presente na sala. Nenhum segredo compartilhado vai para o
JavaScript entregue ao usuário.

## Dois caminhos, nunca os dois juntos

| | Cloudflare Realtime | coturn auto-hospedado |
|---|---|---|
| Você administra | nada | uma VM: SO, certificado, firewall |
| Custo | grátis até um teto generoso de banda por mês; confira o valor vigente | grátis numa VM com franquia de saída boa (ex: Oracle Always Free), ou alguns euros/mês numa VM comum |
| Config no VIO | `CLOUDFLARE_TURN_KEY_ID` + `CLOUDFLARE_TURN_API_TOKEN` | `TURN_URLS` + `TURN_SECRET` |
| Quem gera a credencial | a Cloudflare, por chamada HTTP (`rooms.ts`) | o próprio VIO, localmente (HMAC-SHA1) |

`readConfig` recusa subir se as duas famílias de variável vierem preenchidas ao mesmo
tempo — não haveria como decidir qual delas vale.

## Caminho 1: Cloudflare Realtime

Sem servidor para manter. O VIO chama a API da Cloudflare a cada vez que precisa de
uma credencial nova, e reaproveita a mesma por até um minuto antes dela expirar — não
bate na API a cada participante.

1. Crie (ou entre numa) conta em [dash.cloudflare.com](https://dash.cloudflare.com).
2. No painel, procure a seção **Realtime** (às vezes listada como **Calls** em contas
   mais antigas) e dentro dela **TURN**. Os nomes exatos dos botões mudam de tempos em
   tempos — se não achar de primeira, procure por algo como "Create key" ou "Add key".
3. Ao criar a chave, a Cloudflare mostra um **TURN Token ID** e um **API Token** (ou
   Secret). Guarde os dois — o token normalmente só é exibido uma vez.
4. Configure no VIO:

```dotenv
CLOUDFLARE_TURN_KEY_ID=o_token_id_que_a_cloudflare_deu
CLOUDFLARE_TURN_API_TOKEN=o_api_token_que_a_cloudflare_deu
TURN_TTL_SECONDS=600
```

`CLOUDFLARE_TURN_API_TOKEN` é tão sensível quanto uma senha — nunca vai para o
JavaScript do cliente, só circula entre o servidor do VIO e a API da Cloudflare
(`rooms.ts`, método `fetchCloudflareIce`). Se ele vazar, revogue e gere outro no
painel da Cloudflare.

Se a API da Cloudflare estiver fora do ar ou a credencial for rejeitada, o pedido de
`ice` falha com a mensagem "Não foi possível obter credenciais de relay agora" — a
sala continua de pé, só a rota via TURN é que fica indisponível até normalizar.

## Caminho 2: coturn auto-hospedado

### Configurar o VIO

```dotenv
TURN_URLS=turn:turn.seudominio.com:3478?transport=udp,turn:turn.seudominio.com:3478?transport=tcp,turns:turn.seudominio.com:5349?transport=tcp
TURN_SECRET=SEU_SEGREDO_ALEATORIO_COM_PELO_MENOS_32_CARACTERES
TURN_TTL_SECONDS=600
```

Use no VIO o mesmo segredo de autenticação configurado no coturn. O usuário temporário
é `expiração:participante`, e a credencial é HMAC-SHA1 conforme TURN REST. TTL padrão
600 segundos, renovação antecipada e nova configuração antes de ICE restart. Não
publique esse segredo em Git, imagens, logs ou URLs. As credenciais entregues ao
navegador são utilizáveis por quem as obtiver até sua expiração, e coturn ainda exige
cotas e monitoramento. [coturn](https://github.com/coturn/coturn/blob/master/README.turnserver)

### Infraestrutura

Use uma VM com IP público e UDP/TCP compatíveis, ou um serviço TURN que aceite o
mesmo modelo de credenciais. Um Web Service HTTP da Render não expõe o conjunto
necessário de portas TURN. A aplicação principal permanece na Render; o relay é
separado e substituível.

Exemplo de ponto de partida para `/etc/turnserver.conf`; substitua domínio,
certificados, IPs e segredo antes de usar. A sintaxe e os limites devem ser verificados
com a versão do coturn instalada. Este servidor não foi provisionado nesta entrega.

```ini
listening-port=3478
tls-listening-port=5349
min-port=49160
max-port=49260
realm=turn.seudominio.com
fingerprint
use-auth-secret
static-auth-secret=SEU_SEGREDO_ALEATORIO_COM_PELO_MENOS_32_CARACTERES
cert=/etc/letsencrypt/live/turn.seudominio.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.seudominio.com/privkey.pem
no-cli
no-multicast-peers
no-tcp-relay
user-quota=24
total-quota=120
max-bps=1250000
bps-capacity=12500000
stale-nonce=600
no-loopback-peers
denied-peer-ip=0.0.0.0-0.255.255.255
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=100.64.0.0-100.127.255.255
denied-peer-ip=127.0.0.0-127.255.255.255
denied-peer-ip=169.254.0.0-169.254.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=224.0.0.0-255.255.255.255
denied-peer-ip=::1
denied-peer-ip=fc00::-fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff
denied-peer-ip=fe80::-febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff
```

`no-tcp-relay` desativa alocações de relay TCP, não a conexão do navegador ao TURN
por TCP/TLS para transportar pacotes de uma alocação UDP. Cotas acima são valores
iniciais operacionais, não capacidade medida. Aumente apenas após observar conexões,
memória, CPU e largura de banda. Aplique também firewall e bloqueios de endereços
internos no host, de acordo com a topologia IPv4/IPv6 real.

Libere 3478 UDP/TCP, 5349 TCP e 49160–49260 UDP no firewall. Atrás de NAT, configure
`external-ip=IP_PUBLICO/IP_PRIVADO` com a correspondência real. Se redes de destino
exigirem TURN TLS em 443, use uma máquina/IP que possa dedicar essa porta; não
encaminhe TURN por um proxy HTTP comum.

## Verificar relay

1. Reinicie o VIO com as variáveis do caminho escolhido (Cloudflare ou coturn).
2. Entre com dois dispositivos em redes diferentes e publique tela/voz/câmera.
3. Em Sobre a sala, ative “Testar somente via TURN”. Isso cria novas assinaturas.
4. Aguarde a conexão e confira `TURN / relay` no candidato selecionado por `getStats()`.
5. Compare RTT, bitrate, FPS e consumo de saída no relay.
6. Desative o teste para permitir P2P novamente; confirme a nova rota efetiva.
7. Confirme que credenciais expiradas não criam novas alocações e que cotas limitam abuso.

A emissão e a expiração de credenciais foram cobertas por teste automatizado de
servidor, nos dois caminhos — inclusive a Cloudflare fora do ar e a mutual exclusão
entre as duas famílias de variável. A conectividade real via TURN e entre redes
distintas exige infraestrutura externa e ainda não foi comprovada. O teste não deve
ser marcado como concluído apenas porque o endpoint retornou credenciais.
