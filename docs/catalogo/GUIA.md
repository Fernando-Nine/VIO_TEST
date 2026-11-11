# Guia do VIO

O VIO explicado sem código: o que é cada parte, por que ela é assim e o que pode mudar depois. Os
números, os arquivos e os problemas encontrados estão nas fichas do [catálogo](README.md); cada
seção aponta a sua.

> Este guia é a versão para leigos do catálogo: cada termo técnico é explicado quando aparece, e ele
> é atualizado junto com as fichas a cada decisão.
>
> **Retrato:** commit `8bdc516`, 5 nov 2026 (prévia `2.12.0-rc.6`, produção `2.11.0`). Mudou uma
> decisão ou uma parte descrita aqui? Atualize o guia no mesmo PR.

## O VIO em uma página

- **Entrar:** ao abrir o VIO, no site ou no app do Windows, o servidor entrega um crachá anônimo, a
  sessão. Não há conta nem senha.
- **Sala:** quem cria a sala recebe um código e vira o criador; os outros entram pelo código ou por
  um convite.
- **Mídia direto entre as pessoas:** voz, câmera e telas vão de um aparelho para o outro sem passar
  pelo servidor (P2P). O servidor só apresenta as pessoas e guarda o estado da sala: quem está, os
  cargos, o chat e os widgets.
- **Tudo na memória:** não há banco de dados. Se o servidor reinicia, as salas somem da memória; os
  aparelhos entram de novo sozinhos, e o criador recupera o cargo com a credencial guardada no
  aparelho.
- **Queda:** se a internet de alguém cai, o servidor guarda o lugar dessa pessoa por 90 segundos.
- **Dois ambientes:** a prévia (VIO_TEST) recebe toda mudança primeiro; a produção (VIO) recebe o
  mesmo código depois do aval do fundador. Os dois rodam no plano grátis do Render.
- **App do Windows:** a mesma interface dentro de um programa, com captura nativa: janela sem a
  borda amarela e o som de um programa só.

## 1. Salas, identidade e presença

**Conceitos**

- **Sessão:** o crachá anônimo do VIO. Vale uma hora e se renova sozinho enquanto você usa.
- **Credencial de criador:** um segundo crachá, guardado no aparelho por 30 dias, que prova que a
  sala é sua mesmo depois de o servidor reiniciar. Leva junto os admins e as permissões da sala.
- **Cargos:** criador, admins e os demais. Só o criador promove, rebaixa, passa a sala adiante e
  silencia a voz de alguém; ele também decide o que os outros podem fazer (conversar, criar,
  controlar e editar widgets).
- **Criador provisório:** quem fica com a sala enquanto o criador está fora (caiu, ou o servidor
  reiniciou e outra pessoa chegou primeiro). Quando o criador volta com a credencial, o cargo volta
  para ele.
- **Sala trancada e porta:** numa sala trancada, quem nunca esteve nela espera na porta até o
  criador ou um admin deixar entrar.
- **Convite:** um link com crachá próprio que entra direto, mesmo com a sala trancada. Vale 1 hora,
  1 dia ou 7 dias.
- **Revogar:** invalidar de uma vez todos os convites já enviados.
- **Carimbo do servidor (`epoch`):** muda toda vez que o servidor reinicia. Se mudou, o aparelho
  sabe que precisa refazer tudo.

**Por que é assim**

- **Sem conta e sem banco de dados:** o público hoje é o fundador e amigos, e um app sem dados
  guardados é mais simples e mais seguro; contas e banco trariam custo, LGPD e manutenção (decisão
  009). Por isso cargo e convite são crachás assinados: o servidor confere a assinatura e não
  precisa guardar nada.
- **A credencial é da sala, não da pessoa:** o crachá de sessão muda a cada aba e quando vence; o da
  sala continua valendo.
- **Cada crachá tem um tipo:** um crachá de sala nunca vale como convite nem como sessão.
- **Sem teto de pessoas, só aviso a partir de 6:** grupos de amigos raramente passam disso, e
  bloquear a entrada seria pior que avisar (decisão 010).
- **Não existe expulsar:** o que há é recusar na porta, silenciar a voz e trancar a sala.

**O que pode vir depois**

- **Aviso de sala pesada:** a regra de avisar a partir de 6 pessoas existe, mas nenhuma tela mostra
  o aviso (achado 01.4). É código nosso e pequeno.
- **Estado durável:** guardar as salas fora da memória, quando houver contas ou mais de um servidor
  (decisão 009). Com isso, um convite revogado deixa de voltar a valer depois de um reinício (achado
  01.3).
- **Teto de pessoas** (por exemplo, 50): pode vir depois, sem prioridade (decisão 010).
- **Expulsar ou banir:** não há plano escrito.

Detalhes: [ficha 01](01-salas-identidade-presenca.md).

## 2. Conexão e reconexão

**Conceitos**

- **Conexão com o servidor:** um canal sempre aberto (WebSocket) por onde passam os avisos da sala e
  os bilhetes de apresentação da mídia. A mídia em si não passa por ele.
- **Foto da sala (snapshot):** ao entrar ou voltar, o servidor manda o estado inteiro da sala: quem
  está e o que cada um compartilha.
- **Reconectando:** a pessoa perdeu a conexão, mas o servidor ainda guarda o lugar dela.
- **Tolerância (grace):** quanto tempo o lugar fica guardado: 90 segundos. Uma varredura a cada 10
  segundos tira da sala quem passou disso.
- **Ping:** o servidor confere a cada 20 segundos se o aparelho responde; sem resposta em mais 20,
  dá a conexão por perdida.
- **Recuo exponencial:** depois de uma queda, o aparelho tenta voltar em 1 segundo, depois em 2, 4,
  8 e assim por diante, até 30 segundos entre tentativas, com uma variação aleatória para nem todos
  voltarem no mesmo instante.

**Por que é assim**

- **Guardar o lugar por 90 segundos:** recarregar a página, trocar de rede ou o celular dormir não
  deve expulsar ninguém.
- **Identidade pelo crachá, não pela conexão:** cada reconexão abre um canal novo; o crachá mostra
  que é a mesma pessoa.
- **Só WebSocket:** o VIO não usa a alternativa mais lenta (long-polling). O motivo não está
  escrito; o provável é simplificar a hospedagem.
- **Recentes só no aparelho:** sem contas, a lista de salas recentes fica no próprio aparelho; desde
  a #285 só o app do Windows a mostra.

**Saída rápida (#286, resolvido)**

Fechar a aba ou recarregar manda um último recado ao servidor (a "despedida"). Telas e voz somem na
hora; se ninguém voltar em 8 segundos e houver outra pessoa na sala, a pessoa sai. Sozinha na sala,
ela guarda o lugar pelo tempo inteiro, para não perder a sala numa recarga. Recarregar volta sozinho
(sem reabrir microfone nem câmera), e a mesma sala em duas abas para de tentar e oferece "Entrar
nesta aba". Só quem perde a rede, sem chance de se despedir, ainda espera os 90 segundos.

**O que pode vir depois**

- **Ainda aberto da #286:** aviso quando alguém cai (02.5) e medir em celular e Safari se a
  despedida chega (02.7).
- **Mais adiante:** contagem regressiva no "Reconectando" e um ping mais curto, depois de medir o
  tráfego no Render.
- **Não vale:** recuperação de conexão pronta do Socket.IO, porque o VIO já reenvia a foto inteira
  da sala e refaz a mídia; e presença como serviço pago (Liveblocks, PartyKit), porque o nosso cobre
  o caso e trocar exigiria reescrever o servidor.

Detalhes: [ficha 02](02-conexao-e-reconexao.md).

## 3. WebRTC e sinalização

**Conceitos**

- **Malha P2P:** quem transmite manda o vídeo direto para cada espectador, sem servidor no meio.
  Mais gente assistindo é mais trabalho para quem transmite.
- **Sinalização:** a conversa de apresentação entre dois aparelhos antes de a mídia fluir: quem sou,
  que rotas tenho. O servidor do VIO só carrega esses bilhetes.
- **Publicação e assinatura:** publicar é dizer "estou transmitindo isto"; assinar é dizer "quero
  receber". Cada assinatura vira uma conexão própria.
- **Ofertante único:** quem transmite sempre começa a conversa, e o espectador só responde. Cada
  tentativa nova ganha um número de rodada (`round`), e bilhete de rodada velha é ignorado.
- **STUN e TURN:** o STUN só descobre o seu endereço na internet; o TURN é um intermediário que
  repassa a mídia quando o caminho direto está bloqueado. É um serviço de rede à parte, não o
  servidor do VIO.
- **Rota nova (ICE restart):** pedir à conexão que procure outro caminho sem derrubar a chamada.
- **Vigia de tela parada:** a conexão pode dizer "conectada" e mesmo assim a imagem parar de
  chegar. Quem assiste confere a cada 2 s se o vídeo ainda avança (só com a aba aberta e a conexão de
  pé); parado por 25 s (10 s na câmera), pede rota nova; parado de novo, refaz a assinatura daquela
  tela, com pausas cada vez maiores e no máximo três vezes. A espera da tela é maior porque uma tela
  parada quase não manda dados.
- **Codec:** o formato de compressão do vídeo. O VIO prefere H.264 feito pela placa de vídeo.

**Por que é assim**

- **Sem servidor de mídia (SFU), só P2P:** é simples e não custa nada; para grupos de amigos basta
  (decisão 010).
- **Quem transmite sempre começa:** com um lado só ofertando, não há colisão de ofertas, e a técnica
  do mercado para colisões (_perfect negotiation_) só acrescentaria estados sem ganho.
- **Teto de 8 Mbps de envio, dividido entre os espectadores:** uma internet doméstica não aguenta
  seis cópias de 4 Mbps.
- **H.264 por hardware primeiro:** o VP8 feito pelo processador, uma vez por espectador, era o maior
  gasto de CPU (#247). Sem codificação por hardware, vale a ordem padrão do navegador.
- **Senha de TURN que vence sozinha:** é gerada só para quem está na sala, e uma senha vazada para
  de valer sozinha.

**O que pode vir depois**

- **Agora, código nosso:** pedir rota nova só quando a conexão falhou de fato, nunca enquanto ela
  ainda nasce; guardar o pedido de rota nova que chega no meio de uma negociação (hoje ele se perde,
  achado 03.2); dizer ao codificador se a tela é texto parado ou movimento; medir por que a
  qualidade caiu (processador ou internet); conferir o TURN pela porta 443, que passa em rede de
  escola e de empresa.
- **TURN gerenciado da Cloudflare (#135):** 1.000 GB por mês grátis. O VIO já sabe usar um TURN;
  falta escolher qual e provar entre redes reais.
- **Mais adiante:** codecs mais novos (VP9 ou AV1, depois de medir o processador), camadas de
  qualidade (SVC), som estéreo para tela com som, redundância de áudio e um TURN próprio (coturn).
- **Não vale:** várias qualidades da mesma transmissão (simulcast), que só serve com SFU.

Detalhes: [ficha 03](03-webrtc-e-sinalizacao.md).

## 4. Captura: microfone, câmera, tela e som

**Conceitos**

- **Captura de tela:** o navegador pede ao sistema para "filmar" a tela, uma janela ou uma aba e
  entrega um vídeo ao vivo.
- **Portão de voz:** um porteiro do microfone; só deixa passar som acima de um volume mínimo, para
  o ruído de fundo não chegar aos amigos.
- **Decibel (dB):** a escala de volume do portão; −55 dB é bem baixinho, −20 dB é voz alta.
- **Indicador de fala:** o anel que acende quando alguém fala; o aparelho "escuta" o som que recebe
  para saber.
- **Volume geral e volume de cada um:** o geral é um botão-mestre só seu; cada pessoa e cada tela
  têm o seu, e os dois se multiplicam. Nada disso muda o que os outros ouvem.
- **Ajuste fino até 300%:** amplifica o som de uma tela só no seu aparelho.
- **Saída de áudio:** para qual fone ou caixa de som o som vai.
- **Só som:** no app do Windows, compartilhar o som de um programa sem mostrar a imagem.

**Por que é assim**

- **Desativar o áudio não mexe nas telas**, como no Discord (decisão 008).
- **Um só "ouvido" para todos os indicadores de fala:** o Safari limita quantos podem existir, e
  cada um gastava processador.
- **O som da tela vai sem tratamento de voz:** cancelamento de eco, redução de ruído e ganho
  automático estragariam música e jogo.
- **Trocar de fonte mantém a mesma transmissão:** quem assiste não precisa reconectar (#160).
- **Telas extras nascem em qualidade Baixa:** o envio de internet é um só e se divide entre elas
  (#194). Quem escolhe a qualidade no diálogo de compartilhar começa com ela.
- **Cada tela tem a sua qualidade:** ajustada no widget Minha transmissão, não no painel Ajustes,
  para que mudar uma tela não mude as outras (#343).
- **O som de cada pessoa fica sempre tocando na página, mesmo mudo:** o Chromium só entrega o som ao
  indicador de fala se ele estiver tocando.
- **No app, o "som do PC" exclui o próprio VIO:** senão as vozes da chamada voltariam como eco
  (#193).

**O que pode vir depois**

- **Agora, código nosso:** esconder a própria aba do VIO da lista de captura (evita eco e espelho
  infinito); trocar a aba compartilhada sem parar a transmissão; não capturar o som do próprio VIO
  junto; dizer ao codificador se é texto ou movimento; corrigir a troca de microfone, que grava a
  escolha antes de saber se o aparelho abriu (achado 04.3).
- **Mais adiante:** redução de ruído por uma rede neural pequena (RNNoise), detecção de voz mais
  esperta que o portão por volume (Silero VAD), guardar um instante de som antes de o portão abrir
  para a primeira sílaba não ser cortada, aperte para falar (com atalho global, só no app) e rolar
  ou dar zoom na aba capturada (só no Chrome).
- **Não vale:** recortar parte de uma aba (Region e Element Capture), porque o VIO compartilha tela
  ou janela inteira.
- **Futuro:** clips de até 3 minutos gravados no próprio aparelho, com as vozes de todos e nada no
  servidor (decisão 007, #208).

Detalhes: [ficha 04](04-captura-tela-e-audio.md).

## 5. Telas e reprodução

**Conceitos**

- **Assistir:** pedir para receber a tela de alguém. Cada pessoa recebe a sua própria cópia, direto
  do aparelho de quem transmite.
- **Foco:** qual tela fica grande. Trocar o foco não corta nem reinicia nada.
- **Em conjunto:** ver várias telas ao mesmo tempo, em vez de trocar uma pela outra.
- **Demanda de vídeo:** o seu aparelho avisa o tamanho em que mostra a tela, e quem transmite manda
  só o necessário.
- **Espectadores:** a lista de quem está com a tela aberta ou ouvindo o som dela.
- **Janela flutuante (PiP):** a sala ou o vídeo numa janelinha por cima dos outros programas.
- **Prévia (miniatura):** um vídeo pequeno e lento de uma tela que você ainda não abriu. O código
  existe, mas hoje nenhuma tela o mostra.

**Por que é assim**

- **Foco e posição não recriam vídeo nem áudio:** evita cortes, silêncio e reconexão.
- **Uma assinatura por tela e por pessoa:** sem servidor de mídia, cada espectador tem a sua
  própria codificação.
- **A prévia nunca vira a tela principal:** ela é barata de propósito (90 kbps, 5 quadros por
  segundo); a tela aberta usa outra transmissão.
- **Câmera pequena é barata:** só a câmera em destaque recebe a qualidade principal (#162), e o
  destaque só muda depois de 1,5 segundo de fala, para não piscar.
- **Vídeo do app marcado como "detalhe":** sem a marca, o codificador tratava a tela como câmera e
  encolhia 1080p para 480×270 (#267).

**O que pode vir depois**

- **Decidir as miniaturas:** religar a prévia barata ou apagar o código; hoje o ajuste "Prévias ao
  vivo" é um botão morto (achado 05.2).
- **Apagar a multitela antiga**, que não é mais usada (achado 05.1).
- **Mais adiante:** um indicador de qualidade para quem assiste.

Detalhes: [ficha 05](05-telas-e-reproducao.md).

## 6. Canvas, widgets e chat

**Conceitos**

- **Canvas:** a área da sala onde ficam as telas, as câmeras e os widgets. O arranjo é seu e fica
  salvo no seu aparelho.
- **Espaço fixo e janela solta:** um widget ocupa um espaço do layout ou flutua por cima, numa
  posição proporcional ao tamanho da tela.
- **Tira e grade:** a tira tem um espaço grande e uma fila ao lado; a grade tem células iguais, que
  podem ser juntadas.
- **Widget da sala e widget pessoal:** o da sala tem um estado só, no servidor, e toda ação vale
  para todos; o pessoal fica só no seu aparelho.
- **Número de revisão:** impede que duas pessoas sobrescrevam a mudança uma da outra sem perceber.
- **Widgets de hoje:** pessoas, câmeras, minha transmissão, tela, chat, enquete, dados, sorteio,
  tarefas, timer e placar.

**Por que é assim**

- **Arrastar não mexe no vídeo de verdade:** o arrasto não anima nem clona o vídeo; só a
  apresentação muda, para a imagem não cortar.
- **"Para mim" ou "Para a sala" se escolhe ao criar o widget** (decisão 001).
- **Votos escondidos até a enquete fechar.**
- **Dados e sorteio confiáveis:** o servidor sorteia com um gerador criptográfico, e a fórmula dos
  dados é lida sem executar código.
- **O chat substituiu as Notas.**

**O que pode vir depois**

- **Mudança otimista:** a tela muda antes de o servidor confirmar e se ajusta se outra pessoa mexeu
  ao mesmo tempo.
- **Widgets da comunidade:** a aba Comunidade do catálogo de widgets está como "Em breve" (decisão
  004), e o widget Canvas só existe no registro.
- **Não vale:** edição que converge sem servidor (CRDT), porque o widget da sala já é um estado só,
  decidido no servidor.

Detalhes: [ficha 06](06-canvas-widgets-e-notas.md).

## 7. Cliente e interface

**Conceitos**

- **Site de página única (SPA):** um site só, que troca de tela sem recarregar.
- **Telas:** a landing (no navegador), o início (só no app do Windows), a porta e a sala.
- **Controller:** o "cérebro" da sala no aparelho; guarda quem está lá, as telas e as conexões. A
  interface só se redesenha quando ele avisa que algo mudou.
- **Toast e sino:** o toast é um aviso pequeno que some sozinho; o sino é a lista de avisos dentro
  do VIO, não uma notificação do sistema.
- **Service worker:** um ajudante do navegador que guarda os arquivos fixos (imagens e scripts) para
  o VIO abrir mais rápido. Nunca mexe na sala, na sessão nem na conexão.
- **App instalável (PWA):** o site pode ser instalado como aplicativo.
- **Reduzir movimento:** opção do sistema ou dos Ajustes (Acessibilidade) que reduz tudo a esmaecimento.
  Serve para quem se incomoda com animação e também para PC fraco ou internet ruim (decisão 020).
- **Animação completa:** desde a decisão 020 o VIO anima à vontade; o que protege a chamada é não
  mexer no vídeo e evitar efeitos pesados sobre ele. Quem tem aparelho fraco liga Reduzir movimento.
- **Entrega criativa 5×5:** em trabalho novo ou de identidade, Design e Roteirista mostram 5 estilos
  com 5 exemplos cada, para você ver muita variedade de uma vez; depois você pede para expandir ou
  mudar um estilo (decisão 021). Ajuste pequeno continua com 2–3 opções.
- **Ponto da marca:** o quadrado de cantos arredondados do logo (nunca um círculo, salvo ao se transformar ou reagir), pensado para conduzir as transições de um lugar a outro.
- **WebMCP:** um jeito experimental de um assistente de IA no navegador ler e controlar a sala.

**Por que é assim**

- **Sem roteador e sem biblioteca de estado:** o estado é um objeto só, trocado por uma cópia a cada
  mudança. O motivo não está registrado em decisão.
- **O service worker só guarda arquivos fixos:** interceptar a sala ou a conexão poderia derrubar
  uma chamada.
- **Sons de interface criados na hora:** sem arquivos de áudio; seguem a saída e o volume geral.
- **A cor de cada pessoa tem contraste garantido** para leitura.
- **Estado só no aparelho, apenas em preferência pessoal:** o estado de um widget da sala vem
  sempre do servidor.
- **Início só no app (#285):** no navegador, quem chega vê sempre a landing.

**O que pode vir depois**

- **Agora, código nosso:** fazer o movimento reduzido sem depender do fim da animação (hoje, com o
  movimento reduzido do sistema, o toast nunca fecha sozinho, achado 07.1); dar ao cache do service
  worker um nome por versão, para cada versão limpar a anterior; redesenhar só a parte da tela cujo
  dado mudou; transições conduzidas pelo ponto da marca com View Transitions (#261).
- **Na fila:** notificações (#270), ajustes (#168) e telas que se adaptam ao tamanho (#269).
- **Mais adiante:** React Compiler; escolher o tema em Ajustes (Noite como padrão) e, no futuro,
  temas nossos e da comunidade (decisão 003), depois de unificar as cores (achado 07.6).
- **Decisão aberta:** o navegador ainda salva salas recentes que só o app mostra; falta decidir se
  ele para de salvar (achado 07.11).

Detalhes: [ficha 07](07-cliente-e-interface.md).

## 8. Servidor, protocolo e segurança

**Conceitos**

- **Protocolo:** a lista única de mensagens que o aparelho e o servidor trocam, cada uma com formato
  e tamanho máximo conferidos (zod).
- **Fault:** o erro "educado" do VIO, com um código e uma frase em português, nunca o rastro interno
  do erro.
- **Limite de taxa:** quantas ações cada pessoa pode fazer por minuto, com uma folga para rajadas.
- **CSP:** a lista do que a página pode carregar e de onde; o navegador bloqueia o resto.
- **Origem permitida:** só o site do VIO e o app nativo podem falar com o servidor.
- **Proxy confiável (`trust proxy`):** de quem o servidor aceita saber o endereço real de quem
  acessa.
- **Logs:** registros sem nome de participante, código de sala completo, crachá nem dados da
  conexão de mídia.

**Por que é assim**

- **Formato conferido em toda mensagem:** um aparelho adulterado não consegue mandar campo extra nem
  texto gigante.
- **Toda ação confere dono e permissão no servidor:** esconder um botão na interface não basta.
- **Nunca confiar em qualquer proxy:** aceitar todos deixaria qualquer um fingir outro endereço e
  furar os limites.
- **Produção sem atalhos:** o servidor se recusa a subir sem um segredo forte e HTTPS, ou com o
  laboratório de testes ligado.
- **A lista do app nativo é separada:** não vira porta dos fundos para outro site.
- **Uma instância só:** não há como dois servidores dividirem as salas.
- **Código-fonte sempre disponível:** a licença AGPL obriga, e o site o entrega para baixar.

**O que pode vir depois**

- **Agora, código nosso:** avisar sozinho quando uma biblioteca tiver falha conhecida (Dependabot ou
  OSV-Scanner na CI).
- **Mais adiante:** uma lista de todas as bibliotecas do VIO num formato padrão (SBOM); limites
  também no proxy, que sobrevivam a reinício; e salas guardadas fora da memória (Redis ou Valkey),
  se um dia houver mais de um servidor.

Detalhes: [ficha 08](08-servidor-protocolo-seguranca.md).

## 9. Hospedagem, deploy e versões

**Conceitos**

- **Prévia (VIO_TEST):** a cópia de teste, onde o fundador aprova as novidades antes de irem ao ar.
- **Produção (VIO):** o site que as pessoas usam.
- **Deploy automático:** toda mudança que entra na `main` vai ao ar sozinha no Render.
- **Cold start:** sem tráfego por 15 minutos, o serviço grátis dorme e leva cerca de 1 minuto para
  acordar. Enquanto alguém está conectado, ele não dorme.
- **Health check:** um endereço que o Render consulta para saber se o servidor está vivo.
- **Versão `-rc.N`:** a numeração da prévia antes de virar versão estável.
- **Nota de mudança:** cada PR que quem usa percebe deixa um parágrafo em `changes/`, mostrado na
  prévia.
- **Código-fonte AGPL:** a licença obriga a oferecer o código a quem usa o site.

**Por que é assim**

- **Uma instância só:** as salas vivem na memória do processo.
- **Uma nota por arquivo:** PRs em paralelo com auto-merge brigavam pelo mesmo arquivo de versões
  (decisão 015).
- **A produção recebe o mesmo código da prévia:** o que o fundador aprovou é o que sobe (decisão
  011).
- **Correção de segurança vai direto para a produção**, sem esperar aval (decisão 005).
- **Plano grátis do Render nos dois ambientes:** basta para o público de hoje; gastar com
  hospedagem só quando o VIO gerar receita ou abrir ao público.

**O que pode vir depois**

- **Agora:** consertar a checagem pós-deploy, que hoje falharia (achado 09.1), e rodá-la na CI
  (#21).
- **Mais adiante:** um servidor grátis próprio que não dorme (Oracle Cloud Always Free), com mais
  manutenção; avisos de erro e de queda auto-hospedados (GlitchTip, Uptime Kuma); a imagem Docker
  conferida na CI; e um script para a release, que hoje tem 8 passos à mão.
- **Cuidado:** manter o serviço acordado com ping gasta as 750 horas grátis do mês; dois serviços
  sempre acordados no mesmo workspace passam do teto.
- **Não vale agora:** trocar de hospedagem ou reescrever as salas para a borda da rede (Durable
  Objects).

Detalhes: [ficha 09](09-hospedagem-deploy-release.md).

## 10. App do Windows

**Conceitos**

- **Casca (Tauri e WebView2):** uma janela de navegador embutida que carrega a interface do VIO de
  dentro do instalador, com acesso extra ao Windows.
- **Ponte nativa:** a lista curta de pedidos que a página pode fazer ao programa: listar janelas e
  capturar imagem e som.
- **Som de um programa só (loopback por processo):** pedir ao Windows o som que só um programa toca.
- **Som do PC sem o VIO:** todo o som, menos o do próprio VIO, para as vozes da chamada não voltarem
  como eco.
- **Memória compartilhada:** a imagem capturada passa por uma área de memória comum ao programa e à
  página, sem cópia por mensagem.
- **Borda amarela:** o aviso que o Windows 10 desenha em volta do que a API nova captura; lá o VIO
  usa outras APIs para não mostrá-la.
- **Canais:** "VIO" (estável) e "VIO Teste" (prévia), dois apps independentes que podem ficar
  instalados juntos.
- **Atualização assinada:** cada atualização traz uma assinatura (minisign) que o app confere antes
  de instalar.

**Por que é assim**

- **A interface vem dentro do instalador:** só essa página tem os comandos de captura nativa; um
  site qualquer não tem.
- **Captura nativa:** som de um programa só e transmissão sem borda não existem no navegador
  (decisão 006).
- **Instaladores num repositório público separado:** separa os binários do código e serve de fonte
  para a atualização.
- **Sem assinatura de código por enquanto:** só ao abrir ao público (decisão 006).
- **Atualizar só quando o app abre:** instalar no meio do uso poderia derrubar uma chamada.
- **Identificadores opacos:** a página não escolhe qual processo capturar pelo número dele, então
  uma página comprometida não consegue mirar outro programa.

**O que pode vir depois**

- **Agora, código nosso:** confirmar no próprio programa, fora da página, antes de começar uma
  captura; hoje um script malicioso na página poderia capturar sem a pessoa ver (achado 10.1).
- **Ao abrir ao público:** assinatura grátis para código aberto (SignPath), que reduz o alerta do
  SmartScreen. A assinatura comercial é paga e fica para quando houver receita.
- **Na fila:** janela flutuante com os controles da chamada (#280), ícone na bandeja (#282) e
  baixar direto (#268).
- **Pendente:** um parecer sobre captura nativa e anti-cheat, com teste num jogo protegido.
- **Mais adiante:** codificação por hardware no programa, instalação pelo winget ou MSIX e, depois
  do Windows, o app de celular (decisão 006).
- **Não vale:** injetar código no jogo para capturar (como o "Game Capture" do OBS), porque o
  anti-cheat trata isso como trapaça.

Detalhes: [ficha 10](10-app-windows.md).

## 11. Testes e CI

**Conceitos**

- **CI:** um robô que, a cada mudança, confere se o código compila e se os testes passam antes de
  ela entrar.
- **Etiquetas por arquivo:** as etiquetas das tarefas (como `frontend`, `P1`, `design`) ficam num arquivo
  do projeto. Um robô as cria ou atualiza no GitHub quando o arquivo muda, para que cor e descrição
  não dependam de ninguém clicar no site.
- **Auto-merge:** a mudança entra sozinha assim que o robô aprova.
- **Laboratório (BrowserLab):** uma página escondida, só para desenvolvimento, que simula pessoas e
  telas falsas para testar a conexão no navegador.
- **Mídia sintética:** imagem e som gerados pelo próprio programa, para testar sem câmera nem
  microfone.
- **Audit:** a checagem de falhas conhecidas nas bibliotecas usadas.

**Por que é assim**

- **Testes contra um servidor de verdade**, sem simulação: testam o contrato real. Teste de servidor
  não prova a interface; mudança visual pede olhar a tela.
- **O aceite de mídia é humano:** quem aprova é o fundador, na prévia.
- **Rodar só os testes do que mudou:** economia de créditos; a CI roda o resto.
- **O agente não espera a CI:** cada espera relê o contexto inteiro (decisão 013).
- **O build do Windows nunca é cancelado no meio:** ele pode estar publicando uma versão.

**O que pode vir depois**

- **Agora, código nosso:** Prettier na CI (#20) e a checagem pós-deploy na CI (#21).
- **Com aval do usuário:** Playwright com câmera e microfone falsos, para provar chamada e tela
  entre dois navegadores a cada mudança (dependência nova, #22).
- **Mais adiante:** medir que partes do código nenhum teste toca (cobertura), conferir a
  acessibilidade a cada PR (axe) e testar carga e rede ruim.

Detalhes: [ficha 11](11-testes-e-ci.md).

## Decisões deixadas para depois

| Decisão | Por que esperar | Quando voltar | Onde |
| --- | --- | --- | --- |
| Contas e banco de dados | O público de hoje não precisa; trariam custo, LGPD e manutenção | Comunidade ou monetização | Decisão 009; [01](01-salas-identidade-presenca.md) |
| Servidor de mídia (SFU) e teto de pessoas | A malha P2P basta para grupos de amigos e não custa servidor | Sem data; o teto "pode vir depois, sem prioridade" | Decisão 010; [03](03-webrtc-e-sinalizacao.md) |
| Mais de um servidor (salas em Redis ou Valkey) | Uma instância aguenta o público de hoje | Quando uma não der conta | [08](08-servidor-protocolo-seguranca.md), [09](09-hospedagem-deploy-release.md) |
| Hospedagem paga ou servidor próprio | Custa dinheiro ou manutenção | Receita ou abertura ao público | [09](09-hospedagem-deploy-release.md) |
| TURN gerenciado (Cloudflare) | Grátis até 1.000 GB por mês; espera a vez na fila | Na vez da #135 | [03](03-webrtc-e-sinalizacao.md) |
| Assinatura do instalador | A grátis (SignPath) é para quando o VIO abrir ao público; a comercial é paga | Abertura ao público | Decisão 006; [10](10-app-windows.md) |
| Playwright na CI | Dependência nova | Aval do usuário (#22) | [11](11-testes-e-ci.md) |
| Clips gravados no aparelho | Objetivo futuro | Sem data | Decisão 007 |
| App de celular | O Windows vem primeiro | Depois do app do Windows | Decisão 006 |
| Miniaturas ao vivo | Hoje nenhuma tela as mostra | Decisão do usuário: religar ou apagar | [05](05-telas-e-reproducao.md) (05.2) |
| Recentes no navegador | Só o app os mostra desde a #285 | Decisão do usuário | [07](07-cliente-e-interface.md) (07.11) |
| Revogar convite de vez | Precisa de estado que sobreviva a reinício | Junto com o estado durável | [01](01-salas-identidade-presenca.md) (01.3) |
| Codecs novos e som estéreo | O H.264 por hardware já é o que mais poupa processador | Depois de medir | [03](03-webrtc-e-sinalizacao.md) |
| Redução de ruído e detecção de voz por IA | Peso e dependência nova | Sem data | [04](04-captura-tela-e-audio.md) |
| Escolher tema e temas da comunidade | Falta unificar as cores; a identidade vem antes | Depois de unificar | Decisão 003; [07](07-cliente-e-interface.md) |

As decisões numeradas estão em [`docs/decisoes/`](../decisoes/README.md). As marcadas "Não
rediscutir sem o usuário" só mudam com o aval do usuário.
