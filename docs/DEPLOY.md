# Render e autohospedagem

## Topologia entregue

O mesmo processo Node serve `dist/client`, `/api/session`, `/api/config`, `/healthz`,
`/source.tar.gz` e Socket.IO em `/socket.io`. A mídia usa WebRTC entre navegadores;
quando necessário e configurado, TURN retransmite os pacotes em uma infraestrutura
separada. Não há banco de dados nem gravação.

Uma instância é obrigatória nesta versão. O `render.yaml` usa uma só instância e a
aplicação recusa `WEB_CONCURRENCY` diferente de 1. O estado das salas está em memória.
Não ative autoscaling: adapter de mensagens sem estado compartilhado de salas não basta.
A recuperação faz reentrada e republica as capturas ainda ativas.

## Publicar na Render

### Destino exclusivo desta base

Em 16/09/2026, o usuário definiu o novo repositório **Fernando-Nine/VIO_TEST**.
Os repositórios **VIO** e **VIO_2** devem permanecer intactos. O manifesto usa o
nome **vio-test** para um serviço novo. Ao publicar, criar um Blueprint/serviço
novo a partir de VIO_TEST; não reconectar ou atualizar serviços dos projetos antigos.

O usuário criou VIO_TEST como repositório privado. O acesso de leitura e escrita
foi confirmado na conta Fernando-Nine em 16/09/2026. O código deste projeto é
destinado exclusivamente a esse repositório.

O usuário confirmou o espaço **My Workspace** e o plano **Free** em 16/09/2026.
Foi criado exclusivamente o serviço **vio-test**, região **Virginia**, uma instância,
ligado à branch `main` do VIO_TEST com publicação automática.

- Aplicação: https://vio-test.onrender.com/
- Painel: https://dashboard.render.com/web/srv-dal01nlg1s2s73dor200
- Serviço: `srv-dal01nlg1s2s73dor200`.
- Deploy inicial: `dep-dal01odg1s2s73dor4hg`, estado `live`, commit `569537a79acd81eb373024383ab99b6660768016`.

O build remoto passou e o processo escutou a porta 10000 fornecida pela Render.
HTTPS, API pública, código-fonte e entrada de três participantes no navegador
foram verificados. Os serviços existentes dos outros projetos não foram alterados.
O segredo de sessão foi gerado para este serviço e enviado somente à configuração
de ambiente da Render; não foi incluído no repositório.

O conector usado na criação inicial não expõe o campo de health check HTTP.
Uma sincronização posterior do Blueprint configurou **`/healthz`** no serviço;
essa configuração remota foi confirmada em 16/09/2026. O endpoint responde HTTP 200
e agora também está selecionado como checagem de saúde da Render.

### Reproduzir a implantação

1. Coloque este projeto no novo repositório VIO_TEST, incluindo o lockfile.
2. Na Render, crie um Blueprint a partir do repositório e revise `render.yaml`.
3. O manifesto propõe Free para experimentação. Revise o plano e o custo antes de confirmar.
4. Build: `npm ci --include=dev && npm run build`. Start: `npm start`.
5. Preserve o `SESSION_SECRET` gerado. A origem `RENDER_EXTERNAL_URL` é autorizada
   automaticamente; para domínio próprio, acrescente sua origem HTTPS em `ALLOWED_ORIGINS`.
6. Adicione TURN apenas se tiver um servidor ou serviço compatível; veja TURN.md.
7. Abra `/healthz`, crie uma sala em dois dispositivos e execute a matriz de validação.
8. Teste um deploy/reinício com a sala aberta e mídias ativas. A publicação e a
   sinalização não substituem o aceite de mídia descrito em VALIDACAO.md.

O servidor escuta `0.0.0.0` e `process.env.PORT`. HTTPS termina no proxy da Render,
que encaminha HTTP ao processo; o navegador usa HTTPS/WSS. O único hop confiável no
manifesto corresponde a esse proxy. Se inserir outro proxy ou expor o processo
por outro caminho, revise `TRUST_PROXY`. [Web Services](https://render.com/docs/web-services)

A Render aceita WebSockets na mesma porta pública do serviço. Deploys e manutenção
podem encerrá-los; o VIO trata reconexão e reentrada. O encerramento do processo tem
um limite interno de 25 segundos. [WebSockets](https://render.com/docs/websocket)

## Plano e custos verificados em 15/09/2026

Free suspende o serviço depois de 15 minutos sem tráfego recebido; a retomada pode
levar aproximadamente um minuto. Há 750 horas gratuitas por workspace/mês, cotas de
transferência e build, possibilidade de suspensão/cobrança adicional e reinícios.
O armazenamento local é efêmero; não há disco persistente neste plano. A documentação
da Render apresenta Free como opção para testes e hobbies. Consulte os limites da
sua conta antes de publicar. [Limites Free](https://render.com/docs/free)

A tabela oficial retornada na consulta indicava Starter a US$ 7/mês, 512 MB e
0,5 CPU. Esse valor não inclui necessariamente todos os custos de workspace,
transferência ou TURN. Não houve contratação. A página dinâmica de preços não
permitiu confirmar, nesta execução, toda a tabela de recursos computacionais do
Free; não trate valores de terceiros como verificação. [Preços](https://render.com/pricing),
[comparativo oficial](https://render.com/articles/render-vs-railway).

Custos do projeto: compute/sinalização e entrega de arquivos na Render; tráfego e
máquina/provedor de TURN quando utilizado. Sem custo de armazenamento de mídia porque
não há gravação. Um relay a 4 Mbps transmite aproximadamente 1,8 GB por hora por
fluxo de saída, antes dos overheads; a forma de contabilizar entrada e saída depende
do provedor. Isso é uma estimativa aritmética, não uma medição ou tarifa.

## Autohospedagem com Node

Requisitos: Node 24, npm e `tar` (incluído nas imagens Debian usadas pelo Docker).

```bash
npm ci
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Cole o segredo em `SESSION_SECRET`. Configure `NODE_ENV=production`,
`ALLOWED_ORIGINS=https://vio.seudominio.com`, `TRUST_PROXY=1` se houver exatamente
um proxy confiável, e mantenha apenas uma instância.

```bash
npm run build
npm start
```

Exponha o serviço através de um proxy com TLS. Exemplo Caddy, em host onde apenas o
proxy alcança a porta do Node:

```caddyfile
vio.seudominio.com {
    reverse_proxy 127.0.0.1:3000
}
```

Ou Nginx dentro de um `server` TLS já configurado:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 90s;
}
```

Mantenha o redirecionamento HTTP → HTTPS no proxy. Não exponha a porta 3000 diretamente
na internet quando confiar nos cabeçalhos do proxy. Ajuste os certificados pelo
procedimento do proxy e sistema utilizados.

## Docker

Configure `.env` como produção, com segredo e origens HTTPS explícitas.

```bash
docker compose up -d --build
docker compose logs --tail=50 vio
```

O compose publica somente `127.0.0.1:3000`, para acesso por proxy local. A imagem usa
usuário sem privilégios, health check e `init`. O build do Docker não foi executado
sem um daemon disponível; consulte a evidência em VALIDACAO.md.

## Configuração em runtime e no build

Todas as variáveis de `.env.example` são lidas pelo servidor na inicialização.
`/api/config` entrega somente URL/path públicos e limites. Para modificar valores,
reinicie o serviço; nenhum rebuild do cliente é necessário. O build incorpora
código, CSS, fontes e versão. `ENABLE_TEST_LAB=1` só funciona em desenvolvimento;
a compilação do cliente remove o laboratório.

URL externa de sinalização é configurável, mas a topologia entregue mantém os
endpoints de sessão e configuração na origem da página. Se separar o frontend,
encaminhe `/api/*` para o backend, autorize a origem, atualize CSP/CORS e mantenha
segredos apenas no backend. Essa topologia separada não foi implantada ou testada.

## Migração e rollback

1. Registre a versão/commit do artefato em uso e guarde a configuração fora do repositório.
2. Prepare a nova instância com o mesmo segredo de sessão, limites, URL/path e TURN.
3. Teste HTTPS, origem permitida, sala, mídia e relay no domínio de destino.
4. Mude o DNS/proxy após validação. Salas em memória não migram como banco de dados;
   clientes reentram e republicam ao reconectar. Domínios diferentes têm armazenamento
   de sessão diferente e podem exigir novo ingresso.
5. Para rollback, restaure o commit/artefato anterior e as variáveis compatíveis;
   reconstrua com o lockfile daquela versão. Na Render, escolha um deploy anterior
   disponível no painel. Mantenha a mesma origem e o segredo quando possível.
6. Se mudar o protocolo entre versões futuras, encerre a geração anterior de conexões
   explicitamente e peça recarga; não misture eventos incompatíveis silenciosamente.

Uma futura escala horizontal exige store transacional de salas/presença/publicações,
TTL compartilhado, proteção de sessão entre instâncias e adapter Socket.IO compatível.
[Documentação Socket.IO](https://socket.io/docs/v4/using-multiple-nodes/)
