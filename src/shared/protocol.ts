import { z } from "zod";
import { widgetSchemas, type SharedWidget, type RoomNotice } from "./widgets";
export const kinds = ["screen", "voice", "camera"] as const;
export type Kind = (typeof kinds)[number];
/** Screens one person may share at once (#194); the desktop app captures as many. */
export const MAX_SCREENS = 3;
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
/** Room-wide permissions (Discord-like roles). The creator can do everything. */
export const roomPermissions = z
  .object({
    /** Guests start/pause/reset timers, silence alarms, open/close polls, run tasks. */
    guestControl: z.boolean(),
    /** Guests edit public widgets (structure, text and score blocks). */
    guestEdit: z.boolean(),
    /** Guests create room widgets. Personal widgets never reach the server. */
    guestCreate: z.boolean(),
    guestChat: z.boolean(),
    guestScreen: z.boolean(),
    guestVoice: z.boolean(),
    guestCamera: z.boolean(),
    /** Admins create room widgets. Creator only. */
    adminCreate: z.boolean(),
    /** Admins close widgets created by others. Creator only. */
    adminClose: z.boolean(),
  })
  .strict();
export type RoomPermissions = z.infer<typeof roomPermissions>;
export type RoomPermission = keyof RoomPermissions;
export const defaultPermissions: RoomPermissions = {
  guestControl: false,
  guestEdit: false,
  guestCreate: false,
  guestChat: true,
  guestScreen: true,
  guestVoice: true,
  guestCamera: false,
  adminCreate: true,
  adminClose: true,
};
export const schemas = {
  ...widgetSchemas,
  "room-permissions": z
    .object({ permissions: roomPermissions.partial().strict() })
    .strict()
    .refine((x) => Object.keys(x.permissions).length > 0),
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
  role: z
    .object({
      participantId: uuid,
      action: z.enum(["promote", "revoke", "transfer"]),
    })
    .strict(),
  /** Room owner blocks or frees someone's voice for everyone (#122). */
  moderate: z
    .object({ participantId: uuid, voiceBlocked: z.boolean() })
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
  /** Server-measured signaling round trip, not media latency. */
  pingMs?: number;
  role?: "creator" | "admin" | "guest";
  avatarUrl?: string;
  /** Silenced for everyone by the room owner: voice publishing is refused. */
  voiceBlocked?: boolean;
}
export interface Snapshot {
  epoch: string;
  code: string;
  createdAt: number;
  serverTime: number;
  participants: Participant[];
  widgets?: SharedWidget[];
  notices?: RoomNotice[];
  creatorId?: string;
  /** Always sent by the server; absent only in old snapshots. */
  permissions?: RoomPermissions;
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
