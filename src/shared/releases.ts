import legacy from "./legacy-releases.json" with { type: "json" };
export interface Release {
  version: string;
  date: string | null;
  title: string;
  legacy?: boolean;
  systemChange?: boolean;
  sections: { title: string; items: string[] }[];
}
export const version = "2.3.0";
export const currentRelease: Release = {
  version,
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
  darkRelease,
  entranceRelease,
  systemRelease,
  ...legacy,
];
