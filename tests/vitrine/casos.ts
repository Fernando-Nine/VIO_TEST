/**
 * Showcase catalogue (#269): every screen the visual checks walk through.
 * Plain data on purpose: the browser page (`../VitrineLab.tsx`) reads the
 * `sala`/`widget`/`tamanho` fields, the Playwright spec reads `passos`.
 */
export type Tamanho = "pequeno" | "grande";

/** A click on something the real interface offers, found by role and name. */
export type Passo =
  | { clicar: string; papel: "button" | "tab" | "menuitem" }
  | { clicarDireito: string }
  | { esperar: string };

export interface Caso {
  id: string;
  grupo: "inicio" | "widget" | "ajustes" | "dialogo" | "balao";
  /** What the page prepares: the start screens, or a room with fake people. */
  sala: "landing" | "inicio-app" | "inicio-app-entrar" | "sala";
  widget?: string;
  tamanho?: Tamanho;
  /** Fake toasts pushed on the page. */
  avisos?: boolean;
  passos?: Passo[];
}

export const WIDGETS = [
  "screen",
  "people",
  "cameras",
  "stream",
  "chat",
  "timer",
  "custom",
  "poll",
  "dice",
  "random",
  "tasks",
] as const;

export const ABAS_DE_AJUSTES = [
  ["audio", "Áudio"],
  ["video", "Vídeo"],
  ["notificacoes", "Notificações"],
  ["aparencia", "Aparência"],
  ["acessibilidade", "Acessibilidade"],
  ["aplicativo", "Aplicativo"],
  ["sala", "Sala"],
] as const;

const abrirAjustes: Passo = { clicar: "Ajustes", papel: "button" };

export const CASOS: Caso[] = [
  { id: "inicio-landing", grupo: "inicio", sala: "landing" },
  { id: "inicio-app", grupo: "inicio", sala: "inicio-app" },
  { id: "inicio-app-entrar", grupo: "inicio", sala: "inicio-app-entrar" },
  ...WIDGETS.flatMap((widget) =>
    (["pequeno", "grande"] as const).map(
      (tamanho): Caso => ({
        id: `widget-${widget}-${tamanho}`,
        grupo: "widget",
        sala: "sala",
        widget,
        tamanho,
      }),
    ),
  ),
  ...ABAS_DE_AJUSTES.map(
    ([id, nome]): Caso => ({
      id: `ajustes-${id}`,
      grupo: "ajustes",
      sala: "sala",
      widget: "people",
      tamanho: "grande",
      passos: [
        abrirAjustes,
        { clicar: nome, papel: "tab" },
        { esperar: "dialog" },
      ],
    }),
  ),
  {
    id: "dialogo-pessoas",
    grupo: "dialogo",
    sala: "sala",
    tamanho: "grande",
    passos: [{ clicar: "Pessoas na sala", papel: "button" }],
  },
  {
    id: "dialogo-compartilhar",
    grupo: "dialogo",
    sala: "sala",
    tamanho: "grande",
    passos: [{ clicar: "Compartilhar", papel: "button" }],
  },
  {
    id: "dialogo-adicionar-widget",
    grupo: "dialogo",
    sala: "sala",
    tamanho: "grande",
    passos: [{ clicar: "Adicionar widget", papel: "button" }],
  },
  {
    id: "balao-avisos",
    grupo: "balao",
    sala: "sala",
    widget: "chat",
    tamanho: "grande",
    avisos: true,
  },
  {
    id: "balao-menu-do-widget",
    grupo: "balao",
    sala: "sala",
    widget: "people",
    tamanho: "grande",
    passos: [{ clicarDireito: ".widget-header" }, { esperar: "menu" }],
  },
];
