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
    label: "Ensurdecer",
    description: "Ao silenciar o que você ouve na sala.",
  },
  {
    cue: "undeafen",
    label: "Voltar a ouvir",
    description: "Ao reativar o áudio da sala.",
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
