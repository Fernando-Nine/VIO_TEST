import { z } from "zod";
import { rollDice } from "./dice";
import { paletteIds } from "./palettes";

const id = z.string().uuid();
const label = z.string().trim().min(1).max(120);
export const moduleConfig = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("poll"),
      question: label,
      options: z.array(z.object({ id, label }).strict()).min(2).max(12),
      duration: z.number().int().min(0).max(86400),
    })
    .strict(),
  z
    .object({
      kind: z.literal("dice"),
      expression: z.string().trim().min(1).max(200),
    })
    .strict(),
  z
    .object({
      kind: z.literal("random"),
      options: z
        .array(
          z
            .object({
              id,
              label,
              weight: z.number().int().min(1).max(1000),
              color: z
                .string()
                .regex(/^#[\da-fA-F]{6}$/)
                .optional(),
            })
            .strict(),
        )
        .min(2)
        .max(50),
      removeDrawn: z.boolean(),
      palette: z.enum(paletteIds).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("tasks"),
      items: z
        .array(
          z
            .object({
              id,
              label,
              assignee: z.string().max(64),
              duration: z.number().int().min(0).max(86400),
            })
            .strict(),
        )
        .min(1)
        .max(30),
    })
    .strict(),
]);
export type ModuleConfig = z.infer<typeof moduleConfig>;
export type ModuleKind = ModuleConfig["kind"];
export const isModule = (kind: string | undefined): kind is ModuleKind =>
  ["poll", "dice", "random", "tasks"].includes(kind || "");
export const moduleAction = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("reset"),
      revision: z.number().int().nonnegative(),
    })
    .strict(),
  z.object({ kind: z.literal("vote"), optionId: id }).strict(),
  z
    .object({
      kind: z.literal("roll"),
      expression: z.string().trim().min(1).max(200),
    })
    .strict(),
  z.object({ kind: z.literal("draw") }).strict(),
  z
    .object({
      kind: z.literal("task"),
      itemId: id,
      done: z.boolean(),
      revision: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("session"),
      action: z.enum(["start", "pause", "next", "reset"]),
      revision: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("poll-control"),
      action: z.enum(["start", "close", "reset"]),
      revision: z.number().int().nonnegative(),
    })
    .strict(),
]);
export type ModuleAction = z.infer<typeof moduleAction>;
export interface ModuleActor {
  id: string;
  name: string;
}
export interface ModuleResult {
  id: string;
  authorId: string;
  authorName: string;
  at: number;
  expression?: string;
  label: string;
  detail: string;
}
export interface ModuleState {
  /** While a poll is open, viewers receive only their own vote here. */
  votes?: Record<string, string>;
  /** Number of people who voted; set on non-empty poll states sent to clients. */
  voters?: number;
  startedAt?: number | null;
  closed?: boolean;
  history?: ModuleResult[];
  drawn?: string[];
  done?: Record<string, boolean>;
  activeIndex?: number;
  elapsed?: number;
}
export const moduleTitles: Record<ModuleKind, string> = {
  poll: "Votação",
  dice: "Dados",
  random: "Sorteador",
  tasks: "Tarefas + agenda",
};
export function defaultModule(
  kind: ModuleKind,
  key: () => string,
): ModuleConfig {
  if (kind === "poll")
    return {
      kind,
      question: "Qual opção você prefere?",
      duration: 300,
      options: [
        { id: key(), label: "Opção 1" },
        { id: key(), label: "Opção 2" },
      ],
    };
  if (kind === "dice") return { kind, expression: "1d20" };
  if (kind === "random")
    return {
      kind,
      removeDrawn: false,
      options: [
        { id: key(), label: "Opção 1", weight: 1 },
        { id: key(), label: "Opção 2", weight: 1 },
      ],
    };
  return {
    kind,
    items: [
      { id: key(), label: "Primeira etapa", assignee: "", duration: 900 },
    ],
  };
}
export function validModule(config: ModuleConfig) {
  const items =
    config.kind === "poll" || config.kind === "random"
      ? config.options
      : config.kind === "tasks"
        ? config.items
        : [];
  return new Set(items.map((i) => i.id)).size === items.length;
}
/** Colors and palette only change how the wheel looks; results are kept. */
export function moduleResets(
  before: ModuleConfig | undefined,
  after: ModuleConfig,
) {
  const plain = (config: ModuleConfig | undefined) =>
    JSON.stringify(
      config?.kind === "random"
        ? {
            ...config,
            palette: undefined,
            options: config.options.map((o) => ({ ...o, color: undefined })),
          }
        : config,
    );
  return plain(before) !== plain(after);
}
export function moduleElapsed(state: ModuleState, now: number) {
  return (
    (state.elapsed || 0) +
    (state.startedAt == null ? 0 : Math.max(0, (now - state.startedAt) / 1000))
  );
}
export function pollOpen(
  config: ModuleConfig,
  state: ModuleState,
  now: number,
) {
  return (
    config.kind === "poll" &&
    state.startedAt != null &&
    !state.closed &&
    !(config.duration > 0 && now >= state.startedAt + config.duration * 1000)
  );
}
/** Per-viewer state: other people's votes stay hidden until the poll ends. */
export function viewModuleState(
  config: ModuleConfig,
  state: ModuleState,
  viewerId: string | undefined,
  now: number,
): ModuleState {
  if (config.kind !== "poll" || !Object.keys(state).length) return state;
  const votes = state.votes || {};
  const voters = Object.keys(votes).length;
  if (!pollOpen(config, state, now)) return { ...state, voters };
  const own = viewerId ? votes[viewerId] : undefined;
  return { ...state, voters, votes: own ? { [viewerId!]: own } : {} };
}
/** The caller enforces editing permissions and supplies the authenticated actor/time/randomness. */
export function applyModuleAction(
  config: ModuleConfig,
  state: ModuleState,
  action: ModuleAction,
  actor: ModuleActor,
  operationId: string,
  revision: number,
  now: number,
  random: (max: number) => number,
): ModuleState {
  if ("revision" in action && action.revision !== revision)
    throw new Error(
      "O widget mudou. Confira a versão atual e tente novamente.",
    );
  if (action.kind === "reset") return {};
  if (config.kind === "poll" && action.kind === "vote") {
    if (
      state.startedAt == null ||
      state.closed ||
      (config.duration > 0 && now >= state.startedAt + config.duration * 1000)
    )
      throw new Error("A votação não está aberta.");
    if (!config.options.some((o) => o.id === action.optionId))
      throw new Error("Opção indisponível.");
    if (
      !state.votes?.[actor.id] &&
      Object.keys(state.votes || {}).length >= 5000
    )
      throw new Error("Limite de votos desta votação atingido.");
    return { ...state, votes: { ...state.votes, [actor.id]: action.optionId } };
  }
  if (config.kind === "poll" && action.kind === "poll-control") {
    if (action.action === "reset") return {};
    if (action.action === "close") return { ...state, closed: true };
    if (state.startedAt != null)
      throw new Error("Reinicie a votação antes de abrir novamente.");
    return { ...state, startedAt: now, closed: false };
  }
  if (config.kind === "dice" && action.kind === "roll") {
    const results = rollDice(action.expression, random);
    const result: ModuleResult = {
      id: operationId,
      authorId: actor.id,
      authorName: actor.name,
      at: now,
      expression: action.expression,
      label: results.map((r) => String(r.total)).join(" · "),
      detail: results
        .map(
          (r, i) =>
            `${results.length > 1 ? `${i + 1}) ` : ""}${r.detail} = ${r.total}`,
        )
        .join("\n")
        .slice(0, 6000),
    };
    return { ...state, history: [...(state.history || []), result].slice(-20) };
  }
  if (config.kind === "random" && action.kind === "draw") {
    const options = config.options.filter(
      (o) => !config.removeDrawn || !state.drawn?.includes(o.id),
    );
    if (!options.length)
      throw new Error("Todas as opções já saíram. Reinicie em Editar.");
    let value = random(options.reduce((sum, o) => sum + o.weight, 0));
    const selected = options.find((o) => (value -= o.weight) < 0)!;
    return {
      ...state,
      drawn: config.removeDrawn ? [...(state.drawn || []), selected.id] : [],
      history: [
        ...(state.history || []),
        {
          id: operationId,
          authorId: actor.id,
          authorName: actor.name,
          at: now,
          label: selected.label,
          detail: `Peso ${selected.weight}`,
        },
      ].slice(-20),
    };
  }
  if (config.kind === "tasks" && action.kind === "task") {
    if (!config.items.some((i) => i.id === action.itemId))
      throw new Error("Esta tarefa não existe mais.");
    return { ...state, done: { ...state.done, [action.itemId]: action.done } };
  }
  if (config.kind === "tasks" && action.kind === "session") {
    if (action.action === "reset") return {};
    if (action.action === "next")
      return {
        ...state,
        activeIndex: Math.min(
          config.items.length - 1,
          (state.activeIndex || 0) + 1,
        ),
        elapsed: 0,
        startedAt: null,
      };
    return {
      ...state,
      elapsed: moduleElapsed(state, now),
      startedAt: action.action === "start" ? now : null,
    };
  }
  throw new Error("Ação incompatível com este widget.");
}
