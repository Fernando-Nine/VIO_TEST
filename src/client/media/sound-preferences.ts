export const soundEvents = [
  {
    cue: "room-enter",
    label: "Entrar na sala",
    description: "Quando você ou outra pessoa entra.",
  },
  {
    cue: "room-leave",
    label: "Sair da sala",
    description: "Quando você ou outra pessoa sai.",
  },
  {
    cue: "share-on",
    label: "Começar a compartilhar",
    description: "Confirma o início da sua transmissão.",
  },
  {
    cue: "share-off",
    label: "Parar de compartilhar",
    description: "Confirma o fim da sua transmissão.",
  },
  {
    cue: "unmute",
    label: "Ligar o microfone",
    description: "Seu microfone passa a transmitir.",
  },
  {
    cue: "mute",
    label: "Desligar o microfone",
    description: "Seu microfone deixa de transmitir.",
  },
  {
    cue: "deafen",
    label: "Desativar áudio",
    description: "Ao desligar seu microfone e as vozes.",
  },
  {
    cue: "undeafen",
    label: "Reativar áudio",
    description: "Ao voltar a ouvir as vozes.",
  },
  {
    cue: "screen-new",
    label: "Nova transmissão",
    description: "Quando outra pessoa começa a compartilhar a tela.",
  },
  {
    cue: "chat-message",
    label: "Nova mensagem",
    description: "Mensagens de outras pessoas no chat, no máximo a cada 4 s.",
  },
  {
    cue: "poll-open",
    label: "Votação aberta",
    description: "Quando uma votação começa.",
  },
  {
    cue: "poll-end",
    label: "Fim da votação",
    description: "Quando a votação termina e o vencedor aparece.",
  },
  {
    cue: "timer-end",
    label: "Fim do cronômetro",
    description: "Quando um cronômetro chega ao final.",
  },
  {
    cue: "knock",
    label: "Bateu na porta",
    description: "Quando alguém pede para entrar na sala trancada.",
  },
] as const;
export type Cue = (typeof soundEvents)[number]["cue"];
export type SoundEvents = Record<Cue, boolean>;
export function readSoundEvents(value: unknown): SoundEvents {
  const saved =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    soundEvents.map(({ cue }) => [cue, saved[cue] !== false]),
  ) as SoundEvents;
}
export function volumePreference(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

/** Balloons (toasts) by kind; everything still goes to the bell. */
export const balloonKinds = ["people", "screens"] as const;
export type BalloonKind = (typeof balloonKinds)[number];
export type Balloons = Record<BalloonKind, boolean>;
export function readBalloons(value: unknown): Balloons {
  const saved =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    balloonKinds.map((kind) => [kind, saved[kind] !== false]),
  ) as Balloons;
}
/** "system" follows prefers-reduced-motion; "reduce" always reduces. */
export type Motion = "system" | "reduce";

/** Rows of the Balão × Som table in Ajustes › Notificações. */
export const notificationRows: {
  label: string;
  hint?: string;
  balloon?: BalloonKind;
  cues: Cue[];
}[] = [
  {
    label: "Alguém entrou ou saiu",
    balloon: "people",
    cues: ["room-enter", "room-leave"],
  },
  { label: "Bateu na porta", hint: "Sala trancada.", cues: ["knock"] },
  { label: "Nova tela", balloon: "screens", cues: ["screen-new"] },
  {
    label: "Widgets",
    hint: "Chat, votação e cronômetro.",
    cues: ["chat-message", "poll-open", "poll-end", "timer-end"],
  },
  {
    label: "Suas ações",
    hint: "Microfone, áudio e tela.",
    cues: ["share-on", "share-off", "unmute", "mute", "deafen", "undeafen"],
  },
];
