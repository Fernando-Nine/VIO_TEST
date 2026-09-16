import legacy from "./legacy-releases.json" with { type: "json" };
export interface Release {
  version: string;
  date: string | null;
  title: string;
  legacy?: boolean;
  systemChange?: boolean;
  sections: { title: string; items: string[] }[];
}
export const version = "2.0.0";
export const currentRelease: Release = {
  version,
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
export const releases: Release[] = [currentRelease, ...legacy];
