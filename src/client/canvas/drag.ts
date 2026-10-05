import type { Box } from "./geometry";

export interface Point {
  x: number;
  y: number;
}
export interface DropSlot extends Box {
  id: string;
}

/** Slot hit testing uses the pointer, never the size of the dragged video. */
export function dropSlotAt(point: Point, slots: DropSlot[], bounds: Box) {
  const inside = (box: Box) =>
    point.x >= box.x &&
    point.y >= box.y &&
    point.x < box.x + box.width &&
    point.y < box.y + box.height;
  if (!inside(bounds)) return undefined;
  return slots.find(inside);
}

/** Keyboard dragging advances by one visible slot in the requested direction. */
export function adjacentDropSlot(point: Point, key: string, slots: DropSlot[]) {
  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  const direction = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  return slots
    .map((slot) => {
      const dx = slot.x + slot.width / 2 - point.x;
      const dy = slot.y + slot.height / 2 - point.y;
      const forward = (horizontal ? dx : dy) * direction;
      const lateral = Math.abs(horizontal ? dy : dx);
      return { slot, forward, distance: Math.hypot(dx, dy) + lateral };
    })
    .filter((candidate) => candidate.forward > 1)
    .sort((a, b) => a.distance - b.distance)[0]?.slot;
}
