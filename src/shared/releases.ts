import legacy from "./legacy-releases.json" with { type: "json" };
export interface Release {
  version: string;
  date: string | null;
  title: string;
  legacy?: boolean;
  systemChange?: boolean;
  sections: { title: string; items: string[] }[];
}
export const version = "2.11.0-rc.23";
export const currentRelease: Release = {
  version,
  date: "2026-10-28",
  title: "Prévia · Pessoas, Minha transmissão e Câmeras",
  sections: [
    {
      title: "Somente no vio-test",
      items: [
        'App Windows: em Compartilhar, uma janela minimizada mostra o ícone do programa no lugar da miniatura vazia. "Só som" deixa de fora partes do próprio Windows (teclado virtual, Explorador de Arquivos, menu Iniciar), janelas auxiliares e aplicativos da Microsoft Store suspensos.',
        "Transmitir pesa bem menos no computador de quem transmite quando ele codifica H.264 por hardware (a maioria das placas de vídeo e processadores recentes): a tela e a câmera passam a ir em H.264 em vez de VP8 por software, e quem assiste também decodifica por hardware. Quem não tem H.264 continua recebendo normalmente.",
        'App Windows: "Só som" lista só programas abertos de verdade (com janela, como no Alt+Tab, ou tocando som agora), com o ícone e o nome do programa e, embaixo, o título da janela.',
        "App Windows: no Windows 10, a janela de um programa também é transmitida sem a borda amarela (o app pede para a janela se desenhar, como o Discord); nesse modo a janela vai a até cerca de 30 quadros por segundo. Se a janela vier preta (vídeo protegido, jogo em tela cheia), o app volta ao modo anterior, com borda.",
        "App Windows: no Windows 10, a tela inteira é transmitida sem a borda amarela. O seletor de Compartilhar carrega as miniaturas três por vez e bem mais rápido, e ao reabrir em poucos segundos elas já aparecem na hora.",
        "App Windows: parar ou trocar uma transmissão com som não fecha mais o app (o erro estava no fim de cada captura de som). Se a troca com som falhar, quem assiste continua vendo a tela anterior. Uma falha na captura encerra só aquela transmissão, e o app guarda um registro local (sem nomes) para o diagnóstico.",
        "O sino de notificações abre só quando você clica nele, não mais ao passar o mouse; clicar de novo fecha.",
        "O criador da sala continua criador quando o servidor reinicia ou demora a voltar: quem chegar antes fica no cargo só até ele voltar, com aviso na sala, e admins e permissões voltam junto.",
        "Adicionar widget por abas: Assistir, Conversar, Decidir e jogar, Tempo e Comunidade (a última aberta fica lembrada); a busca procura em todas. Cada widget traz Para mim e Para a sala, ou Adicionar quando é só seu. Widgets da sala ficam no botão do rodapé. Personalizado agora se chama Placar e volta ao catálogo. No espaço vazio, cada ícone tem Mim e Sala.",
        "Foco único volta à barra da sala: um clique mostra só o widget em foco, ocupando todo o espaço; outro clique (Voltar ao conjunto) devolve o layout exatamente como estava. Só muda para você.",
        "Grade: passe o mouse num espaço e arraste a alça do canto para juntar espaços vizinhos (o fantasma mostra o tamanho, como 2 × 2); soltar junta, e o widget coberto vai para o próximo espaço livre ou para Não exibidos. Para separar, arraste de volta para 1 × 1 ou use Separar espaços no botão direito. Pelo teclado: setas na alça e Enter. Em Layout, as posições do foco viram miniaturas, e passar o mouse mostra o resultado na própria sala. Arrastando um widget com Shift até a borda, aparece o fantasma de Foco + tira daquele lado; soltar aplica, com o widget no foco.",
        "Compartilhar abre uma janela no centro, já com a imagem: escolha Tela inteira ou Janela do aplicativo (e Aba do navegador no Chrome e no Edge), a qualidade (480p, 720p, 1080p ou Fonte), a taxa de quadros (15, 30 ou 60 FPS) e se vai com som ou sem som. No app, as telas e janelas aparecem com miniatura e um clique em Compartilhar começa, sem o seletor do Windows; no navegador, Compartilhar abre o seletor dele. As escolhas ficam lembradas, e Trocar o que transmito usa a mesma janela. Transmitindo, o + ao lado de Parar tela (ou Compartilhar outra tela no menu de Minha transmissão) abre outra tela, até 3; cada uma tem Pausar, Silenciar, Trocar e Parar em Minha transmissão.",
        "Widget Câmeras: quem fala fica em destaque (troca depois de 1,5 s de fala, sem piscar) e as outras câmeras ligadas ficam ao lado; na Tira, só a câmera de quem fala. Botão direito numa câmera fixa só ela, com o nome no cabeçalho; Mostrar todas volta ao automático. O selo de câmera em Pessoas, ou Abrir câmera no menu da pessoa, abre o widget já fixado. Nenhuma câmera é esticada, e a sua aparece espelhada só para você. Câmera pequena chega mais leve, e câmera que ninguém está vendo não gasta o envio de quem a ligou.",
        "Widget Pessoas no lugar de Pessoas na sala, Pessoas na chamada e Mixer de volume. Quem está na chamada aparece em bolhas, com anel quando fala e selos de transmitindo, microfone desligado e câmera ligada; embaixo, o nome e o volume de cada voz para você, sempre à vista, de 0 a 200%. Quem está fora da chamada fica no grupo Na sala. O menu da pessoa abre só pelo botão direito (toque longo no celular). Quem já tinha um dos três widgets abertos fica com Pessoas no mesmo espaço.",
        "Widget Minha transmissão no lugar de Meus espectadores, Conexão e Minha tela: prévia da sua tela com AO VIVO e a fonte, Pausar, Silenciar o som (quem assiste vê a tela, sem som; o microfone não muda), Trocar o que transmito (a nova fonte entra sem derrubar quem assiste) e Parar. Ao lado, quem assiste e Envio, Quadros, Ping e Perda. Em foco, a conexão de cada pessoa, o gráfico do envio do último minuto e a qualidade; na tira, só a prévia, com os controles no botão direito. Quem já tinha um dos três widgets abertos fica com Minha transmissão no mesmo espaço.",
        "Base para transmitir até 3 telas ao mesmo tempo: cada tela é uma transmissão própria, quem assiste escolhe qual ver, e a partir da 2ª tela a qualidade começa em Baixa para poupar o envio. A 4ª é recusada com aviso. O botão para adicionar outra tela chega com o novo seletor de compartilhar.",
        'Som sem tela chega como som, não como tela vazia: quem ouve vê um chip na barra da sala com o nome do programa e um indicador de som; o clique abre o volume, Silenciar e Parar de ouvir. O aviso diz "começou a transmitir o som de…" com Ouvir, e Pessoas mostra uma nota no lugar do selo de tela. Em Minha transmissão, o som aparece com o nome do programa, sem Pausar, Trocar nem Quadros.',
        "App Windows: até 3 sons ao mesmo tempo, inclusive som sem tela (por exemplo, o jogo na tela e a música à parte). Na janela de compartilhar, a aba Só som lista os aplicativos com som. O mesmo aplicativo não entra duas vezes, Todo o som do computador não se soma a outro som, e o VIO nunca transmite o próprio som.",
        "Chat: entre o contorno colorido e o avatar volta a ficar um espaço vazio, sem o anel azul.",
        "Sino com os grupos Agora (última hora) e Antes, botão Limpar e um ponto nas notificações ainda não lidas.",
        "No celular, segurar o cabeçalho de um widget abre o menu dele por baixo da tela; para mover, arraste.",
        "Quem não controla o Cronômetro da sala vê o estado (Em andamento, Pausado, Parado ou Concluído) no lugar dos botões.",
      ],
    },
  ],
};
/** Expected next stable: what the 2.10.0 previews brought. */
const stable2100Release: Release = {
  version: "2.10.0",
  date: null,
  title: "Casca da interface",
  sections: [
    {
      title: "Interface",
      items: [
        'Layout com dois modos, Grade e Foco + tira. Na Grade, escolha o tamanho numa matriz de até 3 linhas por 4 colunas (passe o mouse e clique, ou use as setas e Enter); Foco único virou a grade 1 × 1. Diminuir a grade não fecha nada: o que não cabe aparece em "N não exibidos", com Mostrar para cada um, e volta ao aumentar a grade. No celular, uma coluna: o foco fica fixo no topo em 16:9 e os outros rolam embaixo.',
        'Avisos no topo da sala, um por vez, com barra de tempo e ×: quem entrou (4 s), quem saiu (4 s) e nova tela com Assistir (6 s). A nova tela entra por cima do aviso atual; os outros esperam com "+N". Passar o mouse pausa a barra. Erros da sala ficam até você fechar.',
        'Adicionar widget com busca (sem acento: "cronometro" acha Cronômetro; Enter adiciona o primeiro, setas navegam), escolha Para mim / Para a sala no próprio painel e grupos Na sala, Decidir e jogar e Tempo. Em um espaço vazio, o catálogo abre dentro do espaço, com ícones que cabem nele; Esc ou clicar fora fecha.',
        "Tempo da sala no topo, ao lado do código (passe o mouse para ver há quanto tempo está aberta), e o tempo de cada tela no cabeçalho dela, com o ponto ao vivo. Os dois vêm do relógio do servidor. O widget Tempo da sala saiu do catálogo; quem o tinha aberto fica com o espaço livre.",
        "Volume das telas e das pessoas com o mesmo controle: marca em 100% e, acima disso, trecho e número dourados. Setas mudam 5%, Page Up/Down 25% e clique duplo no número volta a 100%. O botão direito na tela começa com Volume desta tela e ganhou Janela flutuante; em tela cheia, o botão Volume na barra abre o controle na vertical.",
        "Ajustes reorganizados com busca no topo: Configurações (Áudio, Vídeo, Notificações, Aparência, Acessibilidade, Aplicativo) e Esta sala. Em Notificações, uma tabela liga ou desliga o balão e o som de cada tipo de aviso; tudo continua indo para o sino. Reduzir movimento pode seguir o sistema ou valer sempre.",
        "Desativar áudio (o fone na doca) desliga seu microfone e as vozes, mas as telas continuam tocando. Ao reativar, o microfone volta como estava. Silenciar vozes e transmissões saiu dos Ajustes.",
        'Cabeçalho do widget da sala com − (fecha só para você; continua aberto para os outros) e, para quem pode, × (fecha para todos). Fechar para todos não pede confirmação: o aviso no topo traz Desfazer por 8 s, que devolve o widget com o mesmo estado e no mesmo espaço; os outros recebem no sino quem fechou. Widget pessoal só tem ×. "N não exibidos" agora também lista os widgets da sala que você fechou ou que ainda não abriu, com o motivo em cada linha; sem espaço livre, Mostrar acende os espaços para você escolher qual substituir (Esc cancela).',
        "A tira só reserva a faixa da barra de rolagem quando rola; sem rolagem, as margens ficam iguais dos dois lados.",
        "Adicionar widget: em Para a sala só aparecem widgets que a sala compartilha. As telas transmitidas e a sua prévia aparecem no topo do catálogo, também no espaço vazio, para você colocar no espaço.",
        "Ajustes: a linha Erros saiu de Notificações (não podia ser alterada) e Acessibilidade ganhou o ícone de pessoa de braços abertos.",
        "App Windows: o som da janela agora funciona também no Windows 10 (versão 2004 ou mais recente). Na lista de áudio, a primeira opção é Todo o som do computador, sem o VIO: transmite tudo o que toca no PC, menos as vozes da chamada, para não haver eco.",
        "Trocar o que transmito e silenciar o som da transmissão já funcionam por baixo: a nova fonte entra na mesma transmissão, sem derrubar quem assiste, e o silêncio vale para todos sem mexer no microfone. Os botões chegam com o widget Minha transmissão.",
      ],
    },
  ],
};
const stable290Release: Release = {
  version: "2.9.0",
  date: "2026-10-27",
  title: "Visual novo dos widgets, pessoas e notificações",
  sections: [
    {
      title: "Widgets",
      items: [
        "Cronômetro em anel com atalhos de 5, 10 e 25 minutos, voltas compartilhadas e alarme com Desligar para a sala.",
        "Votação com linha do prazo, rostos de quem votou (nunca em quê) e resultado em barras, pizza ou só a vencedora.",
        "Dados com teclado de ícones (d4 a d20), crítico no 20 natural e muitos dados em fichas compactas, sem nada cortado.",
        "Sorteador em roleta que para na opção sorteada para todos, com cores e paletas compartilhadas.",
        "Cor no Cronômetro e no Personalizado, e cor e paleta na Votação, pelo menu do botão direito.",
        "Widget pessoal ou da sala, escolhido ao criar; o cabeçalho mostra quem controla e o menu do botão direito segue a mesma ordem em todos.",
        "Modo Tira: arraste um widget ao longo da tira para mudar a ordem.",
      ],
    },
    {
      title: "Sala e pessoas",
      items: [
        "Pessoas num painel lateral com quem fala, quem está sem microfone e quem transmite, e menu de cada pessoa com volume até 200% e Assistir a tela.",
        "Silenciar para mim, e, para o dono da sala, Silenciar para todos e Liberar voz.",
        "Tela nova aparece como etiqueta no canto, com ícone ao vivo das telas no ar e sino com histórico.",
        "Ajustes numa janela com lista lateral: Áudio, Vídeo, Aparência e sons e, para criador e admins, Sala.",
      ],
    },
    {
      title: "Chamada e telas",
      items: [
        "Doca fixa no rodapé com Entrar na chamada, Compartilhar e Flutuante juntos à esquerda; no celular, barra de abas.",
        "Cada tela tem o seu volume no próprio cabeçalho, também em tela cheia e na janela flutuante.",
        "Em tela cheia, bordas e controles somem quando você para de mexer.",
        "Aviso de muitas ações seguidas não aparece mais com uso normal dos widgets.",
      ],
    },
  ],
};
const widgetsPreviewRelease: Release = {
  version: "2.9.0-rc.20",
  date: "2026-10-26",
  title: "Prévia · Visual novo dos widgets",
  sections: [
    {
      title: "Somente no vio-test",
      items: [
        "Cronômetro em anel: o anel mostra o tempo que resta, atalhos de 5, 10 e 25 minutos, voltas compartilhadas com a melhor destacada e alarme com Desligar para a sala.",
        "Votação com linha do prazo, rostos de quem votou (nunca em quê) e resultado em barras, pizza ou só a vencedora, à escolha de cada pessoa. Rótulos longos não quebram mais no meio da palavra.",
        "Dados com teclado de ícones (d4 a d20), partes de cada rolagem entre colchetes, crítico no 20 natural do d20 e, no foco, o dado rolado em destaque com o histórico ao lado.",
        "Sorteador em roleta: gira e para na opção sorteada para todos, com cores por opção e paletas (Índigo, Pôr do sol, Floresta, Doce e Aleatória em harmonia) compartilhadas pela sala.",
        "Sua cor fica salva neste navegador e é aplicada ao entrar em qualquer sala.",
        "Aviso de muitas ações seguidas não aparece mais com uso normal dos widgets (cliques rápidos, edição contínua, rolar logo após sortear); a proteção contra flood continua.",
        "Widget pessoal ou da sala, escolhido ao criar (Para mim / Para a sala); não existe mais compartilhar nem pedido de aprovação. O cabeçalho mostra quem controla (Todos, Admins ou Só você) e o menu do botão direito segue a mesma ordem em todos os widgets, com Remover deste layout separado de Encerrar para todos.",
        "Ajustes numa janela com lista lateral: Áudio (com medidor da sensibilidade), Vídeo, Aparência e sons e, para criador e admins, Sala (convite, quem controla cada widget e transferência de posse). No celular, lista com páginas.",
        "Controles da chamada numa doca fixa no rodapé (nada flutua sobre a sala), com quantas pessoas estão na chamada; no celular, barra de abas Microfone, Áudio, Tela e Mais. Em tela cheia, uma pílula discreta que vira a barra completa ao passar o mouse.",
        "Pessoas num painel lateral que não tranca a sala: linhas compactas com quem fala, quem está sem microfone e quem transmite (por ícone, não só por cor), abas Pessoas e Permissões para quem gerencia e, no menu de cada pessoa, volume dela para você e Assistir a tela. No celular, segurar a linha abre o mesmo menu.",
        'Tela nova não ocupa mais um espaço do seu layout sozinha: aparece uma etiqueta no canto ("Fulano começou a transmitir · Assistir") que some sozinha. Um ícone ao vivo discreto mostra quantas telas estão no ar, com Assistir para cada uma, e o sino guarda o histórico com o contador de novas zerando ao abrir.',
        "Silenciar no menu de cada pessoa: Silenciar para mim (só no seu aparelho, desfaz com Ativar para mim) e, para o dono da sala, Silenciar para todos e Liberar voz. Quem foi silenciado vê o motivo e o microfone fica bloqueado até ser liberado.",
        "Volume de cada pessoa vai até 200% no menu dela, só no seu aparelho.",
        "Rodapé com Entrar na chamada, Compartilhar e Flutuante juntos à esquerda. O volume saiu do rodapé: cada tela tem o seu no próprio cabeçalho (clique silencia, passe o mouse para ajustar, até 300% com o ajuste fino), também em tela cheia e na janela flutuante.",
        "Cor no Cronômetro (cor do anel) e no Personalizado, e Cor e paleta na Votação (cor por opção na pizza e nas barras), pelo menu do botão direito. Trocar a cor não reinicia o tempo nem apaga votos.",
        "Modo Tira: arrastar um widget ao longo da tira muda a ordem, com o espaço de destino destacado; soltar fora da tira o deixa flutuante. A barra de rolagem da tira tem espaço próprio e nenhum widget fica com a borda cortada.",
        "O contorno de foco dos campos de texto nos widgets fica inteiro, sem ser cortado pela borda.",
        "Dados com muitos dados ou rolagens repetidas (10d20, 10#d6) mostram os valores em fichas compactas, com total ou soma, sem nada cortado; no histórico, os valores ficam numa linha própria.",
        "Em tela cheia, a borda colorida da tela e os espaços vazios somem junto com os controles quando você para de mexer e voltam ao mexer.",
      ],
    },
  ],
};
const securityHotfixRelease: Release = {
  version: "2.8.1",
  date: "2026-10-24",
  title: "Correções de segurança",
  sections: [
    {
      title: "Segurança",
      items: [
        "Correções de segurança: atualização de duas bibliotecas do servidor.",
      ],
    },
  ],
};
const stableRelease: Release = {
  version: "2.8.0",
  date: "2026-10-24",
  title: "Chat, papéis na sala e novos widgets",
  sections: [
    {
      title: "Sala e pessoas",
      items: [
        "Chat público no lugar das Notas, com autoria, horários agrupados, emojis e Shift+Enter para nova linha.",
        "Papéis na sala: criador, administradores e convidados. O painel Pessoas tem chaves de permissão e ações ao passar o mouse ou no botão direito; o servidor confere cada permissão.",
        "Se o criador sair, a posse vai para um administrador online, depois para quem estiver online.",
        "Notificações de telas, widgets, mensagens e pedidos na barra, com sons para transmissão nova e mensagem nova.",
      ],
    },
    {
      title: "Widgets",
      items: [
        "Novos: Votação, Dados, Sorteador e Tarefas com agenda, para uso individual ou compartilhado.",
        "Cabeçalho compacto: renomeie no título e use o botão direito para as demais ações. Edições salvam ao sair do campo.",
        "Widgets se adaptam ao espaço, sem rolagem no pequeno e sem vazio no grande.",
        "Votação é montada no próprio widget e só mostra os votos ao encerrar, destacando a vencedora.",
        "Cronômetro editado no lugar; o alarme toca até alguém desligar, por no máximo um minuto, e desliga para todos.",
      ],
    },
    {
      title: "Interface e estabilidade",
      items: [
        "O canvas ocupa toda a área da sala; espaços vazios da tira podem ser mesclados. No celular, o cabeçalho fica compacto.",
        "Mídia mais estável em reconexões rápidas, menos tráfego no chat e memória da sala limitada.",
      ],
    },
  ],
};
const interfacePreviewRelease: Release = {
  version: "2.8.0-rc.3",
  date: "2026-10-23",
  title: "Prévia · Interface mais enxuta e sons",
  sections: [
    {
      title: "Somente no vio-test",
      items: [
        "O canvas ocupa toda a área da sala. No celular, o cabeçalho fica compacto. As setas da tira aparecem só ao passar o mouse.",
        "Widgets com cabeçalho compacto: renomeie no próprio título e use o botão direito para as demais ações. Clicar não solta mais o widget do lugar.",
        "Cronômetro: edite o tempo direto no widget, veja o modo e a repetição, e ouça um aviso ao terminar.",
        "Chat agrupa horários, tem botão de enviar maior e um seletor leve de emojis.",
        "Sons para votação aberta, transmissão nova e mensagem nova. Ao encerrar, a votação destaca a vencedora. Indicador de transmissão ao vivo na barra.",
        "Dados começa com o campo vazio e uma sugestão; reiniciar fica no menu do cabeçalho.",
        "Pessoas: ações ao passar o mouse e no botão direito. Notificações sem botão de fechar; Widget na barra sempre abre o catálogo.",
        "Correções: mídia mais estável em reconexões rápidas, memória da sala limitada e sucessão do criador prefere quem está online.",
      ],
    },
  ],
};
const sessionWidgetsRelease: Release = {
  version: "2.8.0-rc.2",
  date: "2026-10-12",
  title: "Prévia · Novos widgets da sessão",
  sections: [
    {
      title: "Somente no vio-test",
      items: [
        "Votação, Dados, Sorteador e Tarefas + agenda: uso individual ou compartilhado, edição por permissão e modo compacto.",
        "Dados com comandos, guia em português e mini-histórico atribuído a quem rolou. Sorteio com pesos e retirada opcional de resultados.",
        "Votação com opções, duração e um voto por pessoa. Agenda com responsáveis, etapas e tempo compartilhado.",
        "Chat mostra o horário ao lado do nome, acima do texto da mensagem.",
      ],
    },
  ],
};
const securityPatchRelease: Release = {
  version: "2.7.2",
  date: "2026-10-23",
  title: "Correção de segurança",
  sections: [
    {
      title: "Segurança",
      items: [
        "Dependência proxy-addr atualizada para 2.0.8, fechando uma falha que permitia falsificar o endereço de origem.",
      ],
    },
  ],
};
const phaseTwoInitialRelease: Release = {
  version: "2.8.0-rc.1",
  date: "2026-10-11",
  title: "Prévia · Chat, papéis e espaços mesclados",
  sections: [
    {
      title: "Somente no vio-test",
      items: [
        "Notas e cópias recebidas dão lugar ao Chat público, com histórico temporário, autoria e notificações. Canvas aparece apenas como Em breve.",
        "Criador e administradores gerenciam widgets públicos. Convidados pedem aprovação para compartilhar e recebem permissões de edição por pessoa ou por widget.",
        "Pessoas permite promover, revogar e transferir a posse. Saída do criador promove o administrador mais antigo, ou o convidado mais antigo.",
        "Notificações reúnem telas, widgets, mensagens e pedidos na barra sem abrir a barra recolhida automaticamente.",
        "Espaços vazios da tira podem ser mesclados até três posições e divididos novamente. O automático centraliza a última linha. Grid personalizado continua aguardando aprovação.",
      ],
    },
  ],
};
const followupRelease: Release = {
  version: "2.7.1",
  date: "2026-10-11",
  title: "Convites no foco e catálogo mais claro",
  sections: [
    {
      title: "Interface",
      items: [
        "A primeira transmissão oferece o foco vazio; as seguintes seguem para a tira, preservando widgets existentes. Aviso flutuante de novos convites removido.",
        "Convite Assistir com texto maior e espaçamento adaptado. Abas VIO, Telas, Sala e Comunidade com mais respiro nos cards.",
        "Widget personalizado abre explicação Em breve em diálogo centralizado com botão de fechar, sem criar conteúdo.",
      ],
    },
  ],
};
const roundEPhaseOneRelease: Release = {
  version: "2.7.0",
  date: "2026-10-11",
  title: "Canvas · ajustes finais da rodada E",
  sections: [
    {
      title: "Controles e catálogo",
      items: [
        "Setas da tira sem fundo permanente, com círculo no hover/foco e área de clique de pelo menos 40 px, preservando posição e alinhamento.",
        "Personalizado deixa de ser criável no catálogo. A entrada da comunidade apresenta somente um aviso, sem conteúdo simulado.",
        "Ao entrar em tela cheia, a barra aparece por um segundo e depois recolhe automaticamente. O gatilho no topo e o foco de teclado continuam disponíveis.",
      ],
    },
  ],
};
const roundDRelease: Release = {
  version: "2.7.0-rc.5",
  date: "2026-10-10",
  title: "Rodada D · tira, notas e pessoas",
  sections: [
    {
      title: "Canvas e controles",
      items: [
        "A tira é o layout inicial. Setas sobrepostas preservam o alinhamento; a roda usa o mesmo percurso sobre cards, espaços e barra, com avanço suave isolado e movimento contínuo nas sequências.",
        "Tela cheia começa com a barra recolhida, abre só na borda superior e respeita foco visível de teclado. Volume fecha ao sair após 600 ms, sem botão extra.",
        "Menu Layout simplificado, foco único sem seletor e dica do modificador configurado durante arraste. O encaixe acompanha o estado atual da tecla.",
      ],
    },
    {
      title: "Notas e pessoas",
      items: [
        "Notas aceitam até seis caixas tituladas, com copiar, salvar e enviar cópia à sala. Cópias identificam remetente e horário; cada pessoa escolhe adicioná-las ao próprio layout, separadas da edição conjunta.",
        "O botão Pessoas abre os detalhes da sala com contagem, cores, chamada, compartilhamento, criador e ping individual medido pelo servidor. O widget essencial entra somente pelo catálogo.",
        "Módulos novos do Personalizado e mesclagem de slots aguardam escolha. Prévia em revisão; testes físicos de mídia permanecem pendentes.",
      ],
    },
  ],
};
const canvasLayersRelease: Release = {
  version: "2.7.0-rc.4",
  date: "2026-10-10",
  title: "Canvas · avisos visíveis e ordem das janelas",
  sections: [
    {
      title: "Correções de sobreposição",
      items: [
        "Avisos acompanham o canvas em tela cheia, abaixo da barra superior e dentro da área visível. Nos Ajustes, aparecem dentro do painel aberto.",
        "Janelas flutuantes vêm à frente ao clicar ou receber foco do teclado, preservando posições e instâncias dos widgets.",
        "Detalhes de conexão, volume e espectadores abrem acima dos cards, respeitando as bordas da tela e a área disponível com teclado ou zoom.",
        "Prévia em revisão; aceite de mídia em aparelhos reais e decisões abertas da rodada C continuam pendentes.",
      ],
    },
  ],
};
const canvasInteractionRelease: Release = {
  version: "2.7.0-rc.3",
  date: "2026-10-10",
  title: "Widgets · salvar e encerrar com clareza",
  sections: [
    {
      title: "Correções na validação da rodada C",
      items: [
        "Salvar texto fica junto ao título da caixa nas notas compartilhadas, acessível sem sobreposição da barra da chamada em widgets grandes.",
        "O X do criador informa Encerrar para todos; participantes continuam removendo apenas do próprio layout. O aviso de conclusão também distingue as duas ações.",
        "Adicionar widgets individuais ou compartilhados leva o foco do teclado ao novo widget; fechar devolve o foco ao espaço liberado.",
        "Prévia em revisão. As propostas de Notas ampliadas, novos blocos e mesclagem continuam aguardando decisão. O aceite de mídia em aparelhos reais permanece pendente.",
      ],
    },
  ],
};
const canvasRevisionRelease: Release = {
  version: "2.7.0-rc.2",
  date: "2026-10-06",
  title: "Canvas revisado · recuperação e controles",
  sections: [
    {
      title: "Ajustes da rodada C",
      items: [
        "Reconexão automática com espera progressiva; retoma após quedas longas e reentrada malsucedida, preservando capturas. ICE restart continua tentando as conexões de mídia que falham.",
        "Foco único usa o espaço principal correto. Foram removidos Esconder e o menu redundante dos widgets; arraste é livre, com Shift para encaixar. Layout oferece destinos por botão e teclado.",
        "Layout com seleção visual de modo e detalhes; adicionar espaço cria uma posição vazia. Pessoas fica num único widget e o tempo da sala está no detalhe do ping.",
        "Ícones próprios, popovers sem recorte, botão de sair da tela cheia, controles com inatividade curta e setas junto da tira. O olho mostra os espectadores de cada publicação.",
        "Compartilhar converte a instância original. O criador encerra o widget para a sala; os demais removem só da própria visão. Cronômetro tem contagem progressiva, regressiva e repetição.",
        "Notas ampliadas, novos blocos do Personalizado e mesclagem de células estão em proposta, aguardando decisão; não fazem parte desta prévia.",
      ],
    },
    {
      title: "Canvas e foco",
      items: [
        "A tela grande participa do grid. Presets de um a seis espaços, layouts com foco e tira linear; espaços extras são criados por escolha explícita, sem teto de seis pessoas.",
        "Widgets podem ser movidos e encaixados; foco único mantém os demais em segundo plano. Janelas flutuantes têm posição e tamanho ajustáveis. Trocar o foco reorganiza o grid; foco único mantém as outras transmissões conectadas com áudio em segundo plano.",
        "Novas telas pedem confirmação. No grid cheio, você escolhe entre janela flutuante e novo espaço. Na tira, novos convites entram no fim sem deslocar a posição atual.",
        "A tira avança um item por vez, com três espaços visíveis no desktop e menos no celular. Pedidos de qualidade acompanham tamanho e visibilidade do vídeo, sem alterar a captura das outras pessoas.",
      ],
    },
    {
      title: "Widgets e controles",
      items: [
        "Catálogo com transmissões, prévia própria, pessoas, chamada, espectadores, mixer, conexão, duração, ajustes rápidos, notas, cronômetro e blocos personalizados. A aba Comunidade explica o que ainda será implementado.",
        "Notas, placares e cronômetros são individuais por padrão. Compartilhar é opcional: todos operam o conteúdo, mas só o criador altera a estrutura ou exclui para a sala. Rascunhos conflitantes não sobrescrevem alterações silenciosamente.",
        "Controles separados em Chamada e Compartilhamento, volume com ponte de hover e fechamento adiado, bordas uniformes, indicador ao vivo suave e olho de espectadores. Botões de tela cheia foram removidos das janelas individuais.",
        "Dados compartilhados são temporários e apagados quando a sala esvazia ou o servidor reinicia. Layout e widgets individuais ficam no navegador.",
      ],
    },
    {
      title: "Estado da prévia",
      items: [
        "Versão em revisão. Os testes automatizados não substituem o aceite visual, de acessibilidade e de mídia em aparelhos reais; consulte a documentação de validação antes de publicar.",
      ],
    },
  ],
};
const preferencesRelease: Release = {
  version: "2.6.0",
  date: "2026-09-27",
  title: "Seu som, sua cor",
  sections: [
    {
      title: "Preferências do aplicativo",
      items: [
        "Nova aba Aplicativo nos Ajustes, com volume geral para vozes, telas e efeitos locais, sem alterar o áudio enviado pelo microfone.",
        "Sons de entrada e saída da sala, efeitos mais presentes e oito eventos que podem ser habilitados separadamente. Volume dos efeitos e botão para experimentar cada som.",
        "Reconexões, mudanças de cor e atualizações de presença não repetem o aviso de entrada. Preferências ficam salvas neste navegador.",
        "O volume geral preserva os players e o ganho opcional até 300%, incluindo silêncio e retorno ao volume anterior. Vozes aguardam faixas tardias e não são reiniciadas ao ajustar o volume.",
      ],
    },
    {
      title: "Identidade por participante",
      items: [
        "Em Pessoas, escolha entre rosa, amarelo, verde, anil, ciano, vermelho, roxo e laranja. O círculo com + abre o seletor visual de matiz, saturação e brilho, com entrada HEX e controle por teclado.",
        "A cor aplicada é compartilhada com a sala, permanece nas reconexões e volta ao anil após sair. Cada sessão altera apenas a própria cor, com validação e limite no servidor.",
        "Opção local para usar as cores nas bordas das telas, indicador ao vivo e destaque de fala. Avatares mantêm as cores escolhidas; estados de conexão e alertas preservam seus significados.",
        "Contraste calculado para as iniciais e os destaques, inclusive com cores personalizadas muito claras ou escuras.",
      ],
    },
  ],
};
const multiscreenRelease: Release = {
  version: "2.5.0",
  date: "2026-09-27",
  title: "Sua sala, várias telas",
  sections: [
    {
      title: "Pessoas e transmissões no mesmo lugar",
      items: [
        "Painel único com quem está compartilhando e quem entrou na chamada, inclusive participantes que apenas escutam. Filtros Todos, Telas e Chamada.",
        "Assistir abre uma tela; Em conjunto adiciona outras sem o antigo limite de duas. Focar mantém as demais abertas; Só esta fecha as outras por escolha explícita.",
        "Janelas secundárias móveis e redimensionáveis, com organização à direita ou embaixo, encaixes nas bordas e alternativas por botão e teclado.",
        "Trocar o foco, mover e ajustar janelas preserva vídeos, conexões e áudio independente. O painel de pessoas compartilha a área livre sem uma faixa reservada para transmissões.",
      ],
    },
    {
      title: "Troca de sala e continuidade",
      items: [
        "Sair libera a interface imediatamente. Confirmações atrasadas e capturas pendentes da sala antiga não interferem na seguinte, mesmo quando a conexão caiu antes da saída.",
        "Assinaturas já confirmadas não são repetidas a cada atualização de presença. Prévia opcional continua limitada a duas miniaturas leves; o aviso de custo da conexão direta permanece.",
      ],
    },
  ],
};
const audioFixRelease: Release = {
  version: "2.4.1",
  date: "2026-09-26",
  title: "Áudio da transmissão e ajustes corrigidos",
  sections: [
    {
      title: "Correções",
      items: [
        "Áudio das telas volta à reprodução direta até 100%, sem depender do processamento de ganho. Faixas que chegam depois do vídeo são notificadas e conectadas ao player.",
        "Amplificação opcional até 300% mantém a faixa original ativa. Se o processamento ficar indisponível, a reprodução continua em até 100%, com opção de tentar novamente.",
        "Setas dos seletores alinhadas à direita, na mesma linha do valor, preservando seleção por teclado e o visual escuro.",
      ],
    },
  ],
};
const togetherRelease: Release = {
  version: "2.4.0",
  date: "2026-09-26",
  title: "Duas telas, a conversa continua",
  sections: [
    {
      title: "Escolher, combinar e alternar",
      items: [
        "Novas transmissões aguardam seu clique em Assistir; nenhuma tela é aberta automaticamente.",
        "Em conjunto mantém duas telas em qualidade principal, uma grande e outra menor, com áudio independente nas duas.",
        "Trocar o foco entre as telas já abertas preserva as conexões, os vídeos e seus volumes. Uma terceira tela substitui somente o foco escolhido.",
        "Parar de assistir libera apenas aquela transmissão. Se a principal terminar, a outra tela já aberta assume o foco.",
      ],
    },
    {
      title: "A sala se adapta",
      items: [
        "Participantes em grade compacta com rolagem interna, opção de esconder e restaurar, mantendo arraste e encaixes.",
        "Aviso de carga a partir de seis pessoas com ícone circular discreto. Clicar na marca VIO sai da sala e volta à entrada.",
        "Entrar na chamada fica separado de assistir às telas. A conversa só começa após esse clique, com o microfone desligado; sair da chamada mantém as telas.",
        "Volume das telas no dock: hover abre a barra, clique silencia a tela em foco e toque abre os controles. Ajuste fino opcional libera ganho local até 300%.",
        "Tela cheia e picture-in-picture no dock. Quando há suporte a Document PiP, a janela flutuante mantém os controles interativos; demais navegadores usam o PiP de vídeo disponível.",
        "Switches nos ajustes e seletores nativos com visual escuro aprimorado, preservando teclado e compatibilidade.",
      ],
    },
    {
      title: "Acabamentos discretos",
      items: [
        "Degradês escuros e azuis, brilho breve nos botões de ação e pequenos movimentos de hover, mantendo #2727F5 como cor da marca.",
        "Controles sobre as duas telas com foco de teclado visível; movimentos respeitam a preferência por animação reduzida.",
      ],
    },
  ],
};
const controlsRelease: Release = {
  version: "2.3.0",
  date: "2026-09-25",
  title: "Mais espaço, controles mais claros",
  sections: [
    {
      title: "Sala e compartilhamento",
      items: [
        "Prévias ao vivo maiores em 16:9, mantendo até duas miniaturas leves; cards e controles ocultos após 2 segundos de inatividade.",
        "Removida a largura máxima antiga que deixava espaço vazio à direita em monitores maiores.",
        "Salas sem bloqueio por quantidade de participantes. A partir de seis pessoas, um aviso explica o custo crescente das conexões diretas.",
        "Resolução de envio selecionável em 240p, 480p, 720p, 1080p, 1440p e 2160p, preservando proporção e limite da captura original.",
      ],
    },
    {
      title: "Áudio e interface",
      items: [
        "Saída padrão não é reaberta desnecessariamente. Falhas de vídeos removidos ou contextos encerrados não alteram a saída dos elementos ativos.",
        "Dispositivos salvos são validados antes do uso; saída desconectada recebe recuperação única, com mensagem que distingue falha e retorno efetivo ao padrão.",
        "Tipografia cursiva removida da entrada e da sala; Bricolage Grotesque e IBM Plex Mono locais mantêm a identidade moderna.",
        "Cursor de mão próprio no azul #2727F5, combinando com o cursor de seta.",
      ],
    },
  ],
};
const darkRelease: Release = {
  version: "2.2.0",
  date: "2026-09-24",
  title: "Luzes baixas. Mais espaço para assistir.",
  sections: [
    {
      title: "Interface e sala",
      items: [
        "Paleta escura compartilhada pela entrada, sala e ajustes, com o azul #2727F5 da marca e fundo geométrico de movimento suave.",
        "Entrada ajustada à altura do desktop, campos com foco espaçado, cursor de ação convencional e remoção da seta decorativa e do atalho redundante.",
        "Transmissão ampliada para a área útil da janela. Controles, seleção de telas e participantes passam a flutuar sobre o vídeo, inclusive em tela cheia.",
        "Painel de cards arrastável com seis encaixes, indicação do destino e alternativa por clique ou setas do teclado. A posição acompanha o redimensionamento.",
        "Cards e controles desaparecem após 4,5 segundos de inatividade e reaparecem ao mover, tocar ou usar o teclado. É possível manter os cards visíveis; arraste, menus e foco de teclado suspendem a ocultação.",
        "Layout responsivo sem rolagem excedente na sala e animações que respeitam a preferência de movimento reduzido.",
      ],
    },
  ],
};
const entranceRelease: Release = {
  version: "2.1.0",
  date: "2026-09-16",
  title: "Uma entrada com outra presença",
  sections: [
    {
      title: "Design e interação",
      items: [
        "Nova entrada em marfim e preto, com azul sólido e um acento verde-lima. Composição assimétrica com formulário em formato de convite.",
        "Bricolage Grotesque e Instrument Serif substituem a tipografia anterior; fontes servidas pelo próprio app.",
        "Prévia interativa de tela, voz e câmera, navegável por clique ou teclado, sem iniciar capturas.",
        "Inicial personalizada ao digitar o nome, atalho direto ao formulário e feedback no botão de entrada.",
        "Responsividade a partir de 320 px, contraste AA, foco visível e respeito à preferência de movimento reduzido. Conteúdo, salas e controles preservados.",
      ],
    },
  ],
};
const systemRelease: Release = {
  version: "2.0.0",
  date: "2026-09-16",
  title: "Uma nova geração do VIO",
  systemChange: true,
  sections: [
    {
      title: "Mudança de sistema",
      items: [
        "Sistema reescrito do zero: nova estrutura de mídia, sinalização, segurança e interface. A numeração continua depois da 1.9.0; o protótipo desta base foi apresentado como 0.1.0.",
        "Histórico completo importado somente do CHANGELOG.md de Fernando-Nine/VIO_2. O código do sistema anterior não foi importado.",
      ],
    },
    {
      title: "Corrigido",
      items: [
        "Indicadores de fala acompanham faixas de áudio que chegam depois do cartão, inclusive ao reconectar.",
        "Reprodução acompanha a chegada tardia de faixas de áudio e vídeo.",
      ],
    },
    {
      title: "Adicionado",
      items: [
        "Prévias ao vivo opcionais, desligadas por padrão, com iniciais no lugar do vídeo e até duas miniaturas leves recebidas de cada vez.",
        "Ganho manual de microfone entre 20% e 300%, disponível somente com ganho automático desligado e separado da sensibilidade.",
        "Saída de áudio em bloco próprio para conversa e som das telas, exibida conforme o suporte real do navegador.",
        "Manifest, ícones e service worker para instalação. O worker trata apenas recursos estáticos: não intercepta navegações de sala, API, sessão ou socket.",
        "Duração da sala, explicação do limite de participantes e ping visível com cores, alternando entre servidor e conexões de tela.",
      ],
    },
    {
      title: "Alterado",
      items: [
        "Ajustes organizados nas abas Vídeo e Áudio, com navegação por teclado e layout para celular.",
        "Limite padrão ajustado de quatro para seis participantes; o custo de conexões diretas é explicado na interface.",
      ],
    },
  ],
};
export const releases: Release[] = [
  currentRelease,
  stable2100Release,
  stable290Release,
  widgetsPreviewRelease,
  securityHotfixRelease,
  stableRelease,
  interfacePreviewRelease,
  sessionWidgetsRelease,
  phaseTwoInitialRelease,
  securityPatchRelease,
  followupRelease,
  roundEPhaseOneRelease,
  roundDRelease,
  canvasLayersRelease,
  canvasInteractionRelease,
  canvasRevisionRelease,
  preferencesRelease,
  multiscreenRelease,
  audioFixRelease,
  togetherRelease,
  controlsRelease,
  darkRelease,
  entranceRelease,
  systemRelease,
  ...legacy,
];
