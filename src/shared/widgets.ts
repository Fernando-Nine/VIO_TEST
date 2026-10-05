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
    })
    .strict(),
]);
export const widgetContent = z
  .object({ title: label, blocks: z.array(widgetBlock).min(1).max(6) })
  .strict();
export type WidgetBlock = z.infer<typeof widgetBlock>;
export type WidgetContent = z.infer<typeof widgetContent>;
export interface SharedWidget extends WidgetContent {
  id: string;
  owner: string;
  revision: number;
  createdAt: number;
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
  const elapsed = Math.min(
    604800,
    block.elapsed +
      (block.startedAt === null
        ? 0
        : Math.max(0, (now - block.startedAt) / 1000)),
  );
  return block.duration ? Math.min(block.duration, elapsed) : elapsed;
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
                operation.action === "reset" ? 0 : timerElapsed(block, now),
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
