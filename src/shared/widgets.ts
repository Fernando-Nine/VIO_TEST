import { z } from "zod";

const identifier = z.string().uuid();
const label = z.string().trim().min(1).max(64);
export const widgetBlock = z.discriminatedUnion("kind", [
  z
    .object({
      id: identifier,
      kind: z.literal("score"),
      label,
      value: z.number().int().min(-999999).max(999999),
    })
    .strict(),
  z
    .object({
      id: identifier,
      kind: z.literal("text"),
      label,
      value: z.string().max(2000),
    })
    .strict(),
  z
    .object({
      id: identifier,
      kind: z.literal("timer"),
      label,
      duration: z.number().int().min(0).max(86400),
      elapsed: z.number().min(0).max(604800),
      startedAt: z.number().finite().min(0).max(8640000000000000).nullable(),
      mode: z.enum(["up", "down"]).optional(),
      loop: z.boolean().optional(),
    })
    .strict(),
]);
export const widgetContent = z
  .object({
    kind: z.enum(["custom", "notes", "timer", "chat"]).optional(),
    title: label,
    blocks: z.array(widgetBlock).max(6),
  })
  .strict()
  .refine((content) => {
    if (content.kind === "chat") return content.blocks.length === 0;
    if (!content.blocks.length) return false;
    if (
      content.kind &&
      !content.blocks.every(
        (b) =>
          b.kind ===
          (
            {
              custom: "score",
              notes: "text",
              timer: "timer",
              chat: "text",
            } as const
          )[content.kind!],
      )
    )
      return false;
    if (content.kind === "timer" && content.blocks.length !== 1) return false;
    return content.blocks.every(
      (b) =>
        b.kind !== "timer" ||
        ((!b.loop || b.duration > 0) && (b.mode !== "down" || b.duration > 0)),
    );
  });
export type WidgetBlock = z.infer<typeof widgetBlock>;
export type WidgetContent = z.infer<typeof widgetContent>;
export function contentKind(
  content: WidgetContent,
): "custom" | "notes" | "timer" | "chat" {
  return (
    content.kind ||
    (content.blocks.every((b) => b.kind === "text")
      ? "notes"
      : content.blocks.every((b) => b.kind === "timer")
        ? "timer"
        : "custom")
  );
}
export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  color: string;
  avatarUrl?: string;
  text: string;
  sentAt: number;
}
export interface ShareRequest {
  id: string;
  owner: string;
  ownerName: string;
  content: WidgetContent;
  status: "pending" | "approved" | "denied";
  createdAt: number;
}
export interface RoomNotice {
  id: string;
  text: string;
  createdAt: number;
}
export interface SharedWidget extends WidgetContent {
  messages?: ChatMessage[];
  guestEditors?: string[];
  allGuestsEdit?: boolean;
  id: string;
  owner: string;
  revision: number;
  createdAt: number;
}
export const noteCopyInput = z
  .object({
    id: identifier,
    label,
    value: z.string().max(2000),
  })
  .strict();
export interface NoteCopy extends z.infer<typeof noteCopyInput> {
  senderId: string;
  senderName: string;
  sentAt: number;
}
export const widgetOperation = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("score"),
      blockId: identifier,
      delta: z.union([z.literal(-1), z.literal(1)]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("text"),
      blockId: identifier,
      value: z.string().max(2000),
      revision: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("timer"),
      blockId: identifier,
      action: z.enum(["start", "pause", "reset"]),
      revision: z.number().int().nonnegative(),
    })
    .strict(),
]);
export type WidgetOperation = z.infer<typeof widgetOperation>;
export const widgetSchemas = {
  "chat-send": z
    .object({
      id: identifier,
      messageId: identifier,
      text: z.string().trim().min(1).max(2000),
    })
    .strict(),
  "widget-review": z.object({ id: identifier, approve: z.boolean() }).strict(),
  "widget-permission": z
    .object({
      id: identifier,
      participantId: identifier.optional(),
      allGuests: z.boolean().optional(),
      allowed: z.boolean(),
    })
    .strict()
    .refine((x) => Boolean(x.participantId) !== (x.allGuests === true)),
  "widget-create": z
    .object({ id: identifier, content: widgetContent })
    .strict(),
  "widget-structure": z
    .object({
      id: identifier,
      revision: z.number().int().nonnegative(),
      content: widgetContent,
    })
    .strict(),
  "widget-delete": z.object({ id: identifier }).strict(),
  "widget-operate": z
    .object({
      id: identifier,
      operationId: identifier,
      operation: widgetOperation,
    })
    .strict(),
};

export function timerElapsed(
  block: Extract<WidgetBlock, { kind: "timer" }>,
  now: number,
) {
  const elapsed =
    block.elapsed +
    (block.startedAt === null
      ? 0
      : Math.max(0, (now - block.startedAt) / 1000));
  return block.duration
    ? block.loop
      ? elapsed % block.duration
      : Math.min(block.duration, elapsed)
    : Math.min(604800, elapsed);
}
export function timerFinished(
  block: Extract<WidgetBlock, { kind: "timer" }>,
  now: number,
) {
  return (
    !block.loop &&
    !!block.duration &&
    timerElapsed(block, now) >= block.duration
  );
}
export function timerDisplay(
  block: Extract<WidgetBlock, { kind: "timer" }>,
  now: number,
) {
  return (block.mode || (block.duration ? "down" : "up")) === "down"
    ? Math.max(0, block.duration - timerElapsed(block, now))
    : timerElapsed(block, now);
}

/** Pure operation semantics shared by the local widget and authoritative server. */
export function operateWidget(
  widget: SharedWidget,
  operation: WidgetOperation,
  now: number,
): SharedWidget {
  const block = widget.blocks.find((b) => b.id === operation.blockId);
  if (!block || block.kind !== operation.kind) throw new Error("BLOCK_MISSING");
  if (operation.kind !== "score" && operation.revision !== widget.revision)
    throw new Error("WIDGET_CONFLICT");
  const next: WidgetBlock =
    block.kind === "score" && operation.kind === "score"
      ? {
          ...block,
          value: Math.max(
            -999999,
            Math.min(999999, block.value + operation.delta),
          ),
        }
      : block.kind === "text" && operation.kind === "text"
        ? { ...block, value: operation.value }
        : block.kind === "timer" && operation.kind === "timer"
          ? {
              ...block,
              elapsed:
                operation.action === "reset" ||
                (operation.action === "start" && timerFinished(block, now))
                  ? 0
                  : timerElapsed(block, now),
              startedAt: operation.action === "start" ? now : null,
            }
          : block;
  return {
    ...widget,
    revision: widget.revision + 1,
    blocks: widget.blocks.map((b) => (b.id === block.id ? next : b)),
  };
}

export function validContent(content: WidgetContent) {
  return (
    new Set(content.blocks.map((b) => b.id)).size === content.blocks.length
  );
}
