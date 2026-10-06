import { z } from "zod";
import { widgetSchemas, type SharedWidget } from "./widgets";
export const kinds = ["screen", "voice", "camera"] as const;
export type Kind = (typeof kinds)[number];
export type Tier = "main" | "preview";
export const uuid = z.string().uuid();
export const participantColor = z
  .string()
  .regex(/^#[\da-fA-F]{6}$/)
  .transform((color) => color.toUpperCase());
export const roomCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,24}$/);
export const schemas = {
  ...widgetSchemas,
  demand: z
    .object({
      id: z.string().max(80),
      video: z.enum(["off", "small", "fit", "focus"]),
      height: z.number().int().min(120).max(2160),
    })
    .strict(),
  join: z
    .object({
      name: z
        .string()
        .trim()
        .min(1)
        .max(32)
        .regex(/^[^\p{Cc}\p{Cf}]+$/u),
      code: roomCode.optional(),
      color: participantColor.optional(),
    })
    .strict(),
  leave: z.object({}).strict(),
  call: z.object({ active: z.boolean() }).strict(),
  color: z.object({ color: participantColor }).strict(),
  publish: z
    .object({
      kind: z.enum(kinds),
      key: uuid,
      audio: z.boolean(),
      muted: z.boolean(),
    })
    .strict(),
  unpublish: z.object({ publicationId: z.string().max(80) }).strict(),
  state: z
    .object({ publicationId: z.string().max(80), muted: z.boolean() })
    .strict(),
  subscribe: z
    .object({
      publicationId: z.string().max(80),
      tier: z.enum(["main", "preview"]),
      nonce: uuid,
    })
    .strict(),
  unsubscribe: z.object({ id: z.string().max(80) }).strict(),
  ping: z.object({}).strict(),
  ice: z.object({}).strict(),
  renew: z.object({}).strict(),
};
export type Action = keyof typeof schemas;
export const commandSchema = z
  .object({
    action: z.enum(Object.keys(schemas) as [Action, ...Action[]]),
    data: z.unknown(),
  })
  .strict();
export const signalSchema = z
  .object({
    id: z.string().max(80),
    round: z.number().int().min(0).max(10000),
    description: z
      .object({ type: z.enum(["offer", "answer"]), sdp: z.string().max(60000) })
      .strict()
      .optional(),
    candidate: z
      .object({
        candidate: z.string().max(4096),
        sdpMid: z.string().max(80).nullable().optional(),
        sdpMLineIndex: z.number().int().min(0).max(64).nullable().optional(),
        usernameFragment: z.string().max(256).optional().nullable(),
      })
      .strict()
      .optional(),
    restart: z.boolean().optional(),
  })
  .strict()
  .refine(
    (x) =>
      [x.description, x.candidate, x.restart].filter((x) => x !== undefined)
        .length === 1,
  );
export type Signal = z.infer<typeof signalSchema>;
export interface Publication {
  createdAt?: number;
  id: string;
  owner: string;
  kind: Kind;
  key: string;
  audio: boolean;
  muted: boolean;
}
export interface Participant {
  id: string;
  name: string;
  color: string;
  online: boolean;
  inCall: boolean;
  publications: Publication[];
}
export interface Snapshot {
  epoch: string;
  code: string;
  createdAt: number;
  serverTime: number;
  participants: Participant[];
  widgets?: SharedWidget[];
  /** Explicit main screen subscriptions, scoped to members of this room. */
  screenViewers?: Record<string, string[]>;
  maxParticipants: null;
  recommendedParticipants: number;
}
export interface Subscription {
  id: string;
  publication: Publication;
  viewer: string;
  tier: Tier;
  nonce: string;
  demand?: VideoDemand;
}
export interface VideoDemand {
  video: "off" | "small" | "fit" | "focus";
  height: number;
}
export type Reply<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };
export interface IceConfig {
  iceServers: RTCIceServer[];
  expiresAt: number;
  turn: boolean;
}
export interface RuntimeConfig {
  signalingUrl: string;
  socketPath: string;
  maxParticipants: null;
  recommendedParticipants: number;
  maxPreviews: number;
  testLab: boolean;
}
export interface Quality {
  fps: number;
  bitrate: number;
  resolution: number;
}
export const screenResolutions = [240, 480, 720, 1080, 1440, 2160] as const;
export const presets: Record<string, Quality> = {
  Alta: { fps: 30, bitrate: 4000, resolution: 1080 },
  Média: { fps: 24, bitrate: 1800, resolution: 720 },
  Baixa: { fps: 15, bitrate: 700, resolution: 480 },
};
