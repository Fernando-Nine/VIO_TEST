# VIO — histórico de versões

> **MUDANÇA DE SISTEMA NA 2.0.0:** nova implementação, criada do zero. O histórico anterior foi preservado integralmente a partir somente do CHANGELOG.md de Fernando-Nine/VIO_2.

## [2.7.0-rc.1] - 2026-10-05

Seu espaço, seus widgets · prévia técnica

### Canvas e foco
- A tela grande participa do grid. Presets de um a seis espaços, layouts com foco e tira linear; espaços extras são criados por escolha explícita, sem teto de seis pessoas.
- Widgets podem ser movidos, encaixados, escondidos e restaurados. Janelas flutuantes têm posição e tamanho ajustáveis. Trocar o foco reorganiza o grid; foco único mantém as outras transmissões conectadas com áudio em segundo plano.
- Novas telas pedem confirmação. No grid cheio, você escolhe entre janela flutuante e novo espaço. Na tira, novos convites entram no fim sem deslocar a posição atual.
- A tira avança um item por vez, com três espaços visíveis no desktop e menos no celular. Pedidos de qualidade acompanham tamanho e visibilidade do vídeo, sem alterar a captura das outras pessoas.

### Widgets e controles
- Catálogo com transmissões, prévia própria, pessoas, chamada, espectadores, mixer, conexão, duração, ajustes rápidos, notas, cronômetro e blocos personalizados. A aba Comunidade explica o que ainda será implementado.
- Notas, placares e cronômetros são individuais por padrão. Compartilhar é opcional: todos operam o conteúdo, mas só o criador altera a estrutura ou exclui para a sala. Rascunhos conflitantes não sobrescrevem alterações silenciosamente.
- Controles separados em Chamada e Compartilhamento, volume com ponte de hover e fechamento adiado, bordas uniformes, indicador ao vivo suave e olho de espectadores. Botões de tela cheia foram removidos das janelas individuais.
- Dados compartilhados são temporários e apagados quando a sala esvazia ou o servidor reinicia. Layout e widgets individuais ficam no navegador.

### Estado da prévia
- Versão em revisão. Os testes automatizados não substituem o aceite visual, de acessibilidade e de mídia em aparelhos reais; consulte a documentação de validação antes de publicar.

## [2.6.0] - 2026-09-27

Seu som, sua cor

### Preferências do aplicativo
- Nova aba Aplicativo nos Ajustes, com volume geral para vozes, telas e efeitos locais, sem alterar o áudio enviado pelo microfone.
- Sons de entrada e saída da sala, efeitos mais presentes e oito eventos que podem ser habilitados separadamente. Volume dos efeitos e botão para experimentar cada som.
- Reconexões, mudanças de cor e atualizações de presença não repetem o aviso de entrada. Preferências ficam salvas neste navegador.
- O volume geral preserva os players e o ganho opcional até 300%, incluindo silêncio e retorno ao volume anterior. Vozes aguardam faixas tardias e não são reiniciadas ao ajustar o volume.

### Identidade por participante
- Em Pessoas, escolha entre rosa, amarelo, verde, anil, ciano, vermelho, roxo e laranja. O círculo com + abre o seletor visual de matiz, saturação e brilho, com entrada HEX e controle por teclado.
- A cor aplicada é compartilhada com a sala, permanece nas reconexões e volta ao anil após sair. Cada sessão altera apenas a própria cor, com validação e limite no servidor.
- Opção local para usar as cores nas bordas das telas, indicador ao vivo e destaque de fala. Avatares mantêm as cores escolhidas; estados de conexão e alertas preservam seus significados.
- Contraste calculado para as iniciais e os destaques, inclusive com cores personalizadas muito claras ou escuras.

## [2.5.0] - 2026-09-27

Sua sala, várias telas

### Pessoas e transmissões no mesmo lugar
- Painel único com quem está compartilhando e quem entrou na chamada, inclusive participantes que apenas escutam. Filtros Todos, Telas e Chamada.
- Assistir abre uma tela; Em conjunto adiciona outras sem o antigo limite de duas. Focar mantém as demais abertas; Só esta fecha as outras por escolha explícita.
- Janelas secundárias móveis e redimensionáveis, com organização à direita ou embaixo, encaixes nas bordas e alternativas por botão e teclado.
- Trocar o foco, mover e ajustar janelas preserva vídeos, conexões e áudio independente. O painel de pessoas compartilha a área livre sem uma faixa reservada para transmissões.

### Troca de sala e continuidade
- Sair libera a interface imediatamente. Confirmações atrasadas e capturas pendentes da sala antiga não interferem na seguinte, mesmo quando a conexão caiu antes da saída.
- Assinaturas já confirmadas não são repetidas a cada atualização de presença. Prévia opcional continua limitada a duas miniaturas leves; o aviso de custo da conexão direta permanece.

## [2.4.1] - 2026-09-26

Áudio da transmissão e ajustes corrigidos

### Correções
- Áudio das telas volta à reprodução direta até 100%, sem depender do processamento de ganho. Faixas que chegam depois do vídeo são notificadas e conectadas ao player.
- Amplificação opcional até 300% mantém a faixa original ativa. Se o processamento ficar indisponível, a reprodução continua em até 100%, com opção de tentar novamente.
- Setas dos seletores alinhadas à direita, na mesma linha do valor, preservando seleção por teclado e o visual escuro.

## [2.4.0] - 2026-09-26

Duas telas, a conversa continua

### Escolher, combinar e alternar
- Novas transmissões aguardam seu clique em Assistir; nenhuma tela é aberta automaticamente.
- Em conjunto mantém duas telas em qualidade principal, uma grande e outra menor, com áudio independente nas duas.
- Trocar o foco entre as telas já abertas preserva as conexões, os vídeos e seus volumes. Uma terceira tela substitui somente o foco escolhido.
- Parar de assistir libera apenas aquela transmissão. Se a principal terminar, a outra tela já aberta assume o foco.

### A sala se adapta
- Participantes em grade compacta com rolagem interna, opção de esconder e restaurar, mantendo arraste e encaixes.
- Aviso de carga a partir de seis pessoas com ícone circular discreto. Clicar na marca VIO sai da sala e volta à entrada.
- Entrar na chamada fica separado de assistir às telas. A conversa só começa após esse clique, com o microfone desligado; sair da chamada mantém as telas.
- Volume das telas no dock: hover abre a barra, clique silencia a tela em foco e toque abre os controles. Ajuste fino opcional libera ganho local até 300%.
- Tela cheia e picture-in-picture no dock. Quando há suporte a Document PiP, a janela flutuante mantém os controles interativos; demais navegadores usam o PiP de vídeo disponível.
- Switches nos ajustes e seletores nativos com visual escuro aprimorado, preservando teclado e compatibilidade.

### Acabamentos discretos
- Degradês escuros e azuis, brilho breve nos botões de ação e pequenos movimentos de hover, mantendo #2727F5 como cor da marca.
- Controles sobre as duas telas com foco de teclado visível; movimentos respeitam a preferência por animação reduzida.

## [2.3.0] - 2026-09-25

Mais espaço, controles mais claros

### Sala e compartilhamento
- Prévias ao vivo maiores em 16:9, mantendo até duas miniaturas leves; cards e controles ocultos após 2 segundos de inatividade.
- Removida a largura máxima antiga que deixava espaço vazio à direita em monitores maiores.
- Salas sem bloqueio por quantidade de participantes. A partir de seis pessoas, um aviso explica o custo crescente das conexões diretas.
- Resolução de envio selecionável em 240p, 480p, 720p, 1080p, 1440p e 2160p, preservando proporção e limite da captura original.

### Áudio e interface
- Saída padrão não é reaberta desnecessariamente. Falhas de vídeos removidos ou contextos encerrados não alteram a saída dos elementos ativos.
- Dispositivos salvos são validados antes do uso; saída desconectada recebe recuperação única, com mensagem que distingue falha e retorno efetivo ao padrão.
- Tipografia cursiva removida da entrada e da sala; Bricolage Grotesque e IBM Plex Mono locais mantêm a identidade moderna.
- Cursor de mão próprio no azul #2727F5, combinando com o cursor de seta.

## [2.2.0] - 2026-09-24

Luzes baixas. Mais espaço para assistir.

### Interface e sala
- Paleta escura compartilhada pela entrada, sala e ajustes, com o azul #2727F5 da marca e fundo geométrico de movimento suave.
- Entrada ajustada à altura do desktop, campos com foco espaçado, cursor de ação convencional e remoção da seta decorativa e do atalho redundante.
- Transmissão ampliada para a área útil da janela. Controles, seleção de telas e participantes passam a flutuar sobre o vídeo, inclusive em tela cheia.
- Painel de cards arrastável com seis encaixes, indicação do destino e alternativa por clique ou setas do teclado. A posição acompanha o redimensionamento.
- Cards e controles desaparecem após 4,5 segundos de inatividade e reaparecem ao mover, tocar ou usar o teclado. É possível manter os cards visíveis; arraste, menus e foco de teclado suspendem a ocultação.
- Layout responsivo sem rolagem excedente na sala e animações que respeitam a preferência de movimento reduzido.

## [2.1.0] - 2026-09-16

Uma entrada com outra presença

### Design e interação
- Nova entrada em marfim e preto, com azul sólido e um acento verde-lima. Composição assimétrica com formulário em formato de convite.
- Bricolage Grotesque e Instrument Serif substituem a tipografia anterior; fontes servidas pelo próprio app.
- Prévia interativa de tela, voz e câmera, navegável por clique ou teclado, sem iniciar capturas.
- Inicial personalizada ao digitar o nome, atalho direto ao formulário e feedback no botão de entrada.
- Responsividade a partir de 320 px, contraste AA, foco visível e respeito à preferência de movimento reduzido. Conteúdo, salas e controles preservados.

## [2.0.0] - 2026-09-16

Uma nova geração do VIO

### Mudança de sistema
- Sistema reescrito do zero: nova estrutura de mídia, sinalização, segurança e interface. A numeração continua depois da 1.9.0; o protótipo desta base foi apresentado como 0.1.0.
- Histórico completo importado somente do CHANGELOG.md de Fernando-Nine/VIO_2. O código do sistema anterior não foi importado.

### Corrigido
- Indicadores de fala acompanham faixas de áudio que chegam depois do cartão, inclusive ao reconectar.
- Reprodução acompanha a chegada tardia de faixas de áudio e vídeo.

### Adicionado
- Prévias ao vivo opcionais, desligadas por padrão, com iniciais no lugar do vídeo e até duas miniaturas leves recebidas de cada vez.
- Ganho manual de microfone entre 20% e 300%, disponível somente com ganho automático desligado e separado da sensibilidade.
- Saída de áudio em bloco próprio para conversa e som das telas, exibida conforme o suporte real do navegador.
- Manifest, ícones e service worker para instalação. O worker trata apenas recursos estáticos: não intercepta navegações de sala, API, sessão ou socket.
- Duração da sala, explicação do limite de participantes e ping visível com cores, alternando entre servidor e conexões de tela.

### Alterado
- Ajustes organizados nas abas Vídeo e Áudio, com navegação por teclado e layout para celular.
- Limite padrão ajustado de quatro para seis participantes; o custo de conexões diretas é explicado na interface.

---

# Registro integral do sistema anterior

Fonte: https://github.com/Fernando-Nine/VIO_2/blob/main/CHANGELOG.md
Blob Git: `458665f5a357c0f0f1c261d055e5e18429839d9c`

# Changelog

Todas as mudanças notáveis do VIO são documentadas aqui. O formato segue as
convenções do [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o projeto
segue [Versionamento Semântico](https://semver.org/lang/pt-BR/) (MAJOR.MINOR.PATCH).

O mesmo conteúdo fica disponível dentro do próprio app, tocando no número da versão na
tela de entrada.

## [1.9.0] - 2026-09-16

### Corrigido
- Quem já estava na sala quando alguém começava a compartilhar não via nada. A
  transmissão não entrava em foco sozinha, e como a tira de miniaturas só
  aparece com duas ou mais transmissões, não sobrava nada para clicar — a
  pessoa ficava olhando um aviso de "ninguém está compartilhando" que era
  mentira. Quem entrava depois funcionava, o que tornava a falha confusa.
- As iniciais cobriam a prévia nas miniaturas. O vídeo estava lá e tocando, mas
  a placa com a letra ficava por cima dele: dava para ver o nome e a inicial, e
  nunca a imagem.
- A bolha de "falando" era recortada e passava por cima do nome. O avatar ficava
  dentro do bloco que corta o texto longo, então o anel batia nessa borda; agora
  ele fica fora desse bloco e é desenhado atrás do conteúdo.
- O microfone e o fone diziam "desligado" de dois jeitos diferentes — um com o
  risco embutido no ícone, virado para um lado, e o outro com um risco vermelho
  na diagonal oposta. Agora os dois usam o mesmo ícone base e o mesmo risco.
- O histórico de atualizações estava grudado: a etiqueta colava no texto e as
  linhas não respiravam.

### Adicionado
- Volume individual de cada pessoa, ao lado do silenciar. Como o silenciar, é só
  para você: não vai para o servidor e a pessoa não fica sabendo.
- Prévias ao vivo nas miniaturas, em Ajustes › Vídeo. Desligadas por padrão: com
  elas ligadas você recebe todas as transmissões ao mesmo tempo, não só a que
  está assistindo, e isso gasta banda de quem transmite.

### Alterado
- Os Ajustes viraram duas abas, Vídeo e Áudio. Numa coluna só era preciso rolar
  demais para achar qualquer coisa, e as duas metades não têm relação.

## [1.8.0] - 2026-09-15

### Adicionado
- Câmera. O botão fica no rodapé, ao lado do microfone, e liga só o vídeo — o
  microfone continua sendo da conversa por voz, com os ajustes dele.
- Dá pra estar com a tela e a câmera no ar ao mesmo tempo: as duas aparecem
  separadas na tira de transmissões, e a da câmera vem marcada como tal.
- No celular com mais de uma câmera, um botão vira entre a frontal e a traseira
  sem derrubar quem está assistindo. A frontal aparece espelhada na sua prévia,
  como numa selfie; quem assiste vê a imagem como ela é.
- A lista de participantes mostra quem está com a câmera ligada.

### Alterado
- Como a tela, a câmera é sob demanda: ela só sai do seu computador para quem
  escolheu vê-la. Diferente da voz, que vai sempre para a sala toda.
- Em tela estreita, o botão de compartilhar mostra só o ícone. O texto não
  cabia junto dos botões do rodapé e vinha saindo cortado; ele volta assim que
  há largura para ele.

## [1.7.1] - 2026-09-15

### Corrigido
- A escolha da saída de áudio estava dentro dos ajustes do microfone, o que dava
  a entender que valia só para a conversa. Ela vale para tudo que você ouve —
  conversa e som da tela — e agora fica em bloco próprio, disponível mesmo para
  quem só assiste, sem entrar na voz.

## [1.7.0] - 2026-09-15

### Adicionado
- Dá pra escolher qual microfone usar e, no Chrome e derivados, por onde o som
  sai — fone, caixa ou monitor.
- Controle de ganho do microfone: se estiverem te ouvindo baixo, agora dá pra
  levantar sem mexer no sistema.

### Alterado
- O corte da sensibilidade ficou suave. Antes o microfone era desligado de vez
  quando você parava de falar, o que cortava seco; agora o volume desce em rampa.
- Trocar de microfone ou mexer em eco e ruído não derruba mais a conversa — a
  conexão continua de pé enquanto o ajuste acontece.

## [1.6.0] - 2026-09-15

### Adicionado
- Botão de fone separado do microfone: dá pra calar só o seu microfone, ou
  silenciar a conversa inteira — microfone e áudio de uma vez.
- Silenciar uma pessoa específica, só pra você, direto na lista de
  participantes. A pessoa não fica sabendo.
- Ajustes do seu próprio microfone: sensibilidade, cancelamento de eco e
  supressão de ruído, cada um configurando o seu.

### Corrigido
- Voltar a ouvir a conversa deixava o microfone mudo mesmo sem você ter pedido.
  Agora ele volta como estava antes.

## [1.5.0] - 2026-09-15

### Adicionado
- Conversa por voz na sala. O botão de microfone no rodapé entra na conversa;
  tocando de novo você fica mudo, mas continua ouvindo todo mundo.
- O avatar de quem está falando ganha um anel, e a folha "Quem está na sala"
  mostra o nível do seu próprio microfone — dá pra conferir se ele está pegando.
- Um "?" ao lado de "Quem está na sala" explica por que existe um limite de
  pessoas por sala.

### Alterado
- O teal deixa de ser exclusivo do status "ao vivo" e passa a significar
  "acontecendo agora": vale também para quem está falando.

### Corrigido
- O botão "Ativar o som" aparecia o tempo todo desde a 1.4.0, mesmo sem nada
  para desbloquear. Agora só aparece quando o navegador realmente segurou o
  áudio — e destrava tanto o vídeo quanto as vozes da conversa.

## [1.4.0] - 2026-09-15

### Adicionado
- O VIO agora é instalável: dá para adicionar à tela inicial do celular ou
  instalar como aplicativo no computador, e ele abre em janela própria. O ícone
  é provisório — a própria marca da tela de entrada ampliada — até a arte
  definitiva existir.
- A tela de entrada abre mesmo sem internet. Entrar numa sala continua exigindo
  conexão, naturalmente: o que fica disponível offline é só a casca do app.

## [1.3.0] - 2026-09-15

### Adicionado
- Reconexão automática. Se a rede oscilar ou o servidor reiniciar, o VIO volta
  sozinho para a sala — antes só resolvia atualizando a página.
- Quem está compartilhando volta compartilhando: a tela capturada sobrevive à
  queda, então o navegador não pergunta de novo o que compartilhar.
- Aviso na tela durante a reconexão e nova tentativa automática, com espera
  crescente, quando o servidor está ocupado demais para receber de volta.

## [1.2.0] - 2026-08-24

### Alterado
- Cada transmissão agora só se conecta a quem está de fato assistindo ela no
  momento, em vez de ir automaticamente para a sala inteira — usa menos banda
  quando várias pessoas compartilham ao mesmo tempo.

### Corrigido
- O brilho ao redor do vídeo não desaparecia com a inatividade nem em tela
  cheia, atrapalhando a visualização.

### Adicionado
- Aviso na tela quando uma conexão específica falha, em vez de só ficar com
  a tela preta sem explicação.
- Licença AGPLv3; README reescrito como apresentação do projeto.

## [1.1.0] - 2026-08-23

### Segurança
- Limite de taxa para criação de salas e para mensagens de sinalização por conexão.
- Validação de origem (`Origin`) nas conexões do Socket.IO.

### Adicionado
- Número de versão e este histórico de mudanças, acessível direto no app.

## [1.0.1]

### Corrigido
- As folhas (Ajustes, Participantes, Sobre a sala) continuavam clicáveis mesmo
  fechadas no computador, roubando clique de outros botões por trás.

## [1.0.0]

### Alterado
- Interface refeita do zero com metodologia mobile-first: alvos de toque de 44px+,
  folhas deslizantes no lugar de menus apertados, fonte Poppins.

### Adicionado
- Seletor de transmissões com miniatura de vídeo ao vivo de cada pessoa
  compartilhando, em vez de só o nome.

### Corrigido
- Estouro de tela para os lados em telas estreitas.

## [0.5.0]

### Alterado
- Rebrand de "Tela Junto" para VIO.

### Adicionado
- Configuração pronta (`render.yaml`) para publicar no Render.

## [0.3.0]

### Adicionado
- Suporte a mais de uma pessoa compartilhando a tela ao mesmo tempo na mesma sala.

### Corrigido
- Conexão quebrava quando duas pessoas compartilhavam uma para a outra
  simultaneamente (roteamento incorreto de candidatos ICE).

## [0.2.0]

### Adicionado
- Prévia da própria tela para quem compartilha, com opção de ocultar.
- Volume individual e tela cheia para quem assiste.
- Sons de início/fim de compartilhamento e indicador de ping.

### Corrigido
- Áudio da tela vinha com cancelamento de eco, supressão de ruído e ganho
  automático ligados por padrão (comportamento padrão dos navegadores),
  causando oscilação de volume — todos desligados explicitamente.

## [0.1.0]

### Adicionado
- Primeira versão: compartilhamento de tela com controle de qualidade/FPS e
  roteamento de áudio.
