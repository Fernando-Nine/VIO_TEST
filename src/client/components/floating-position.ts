export const anchors = [
  { id: "top-left", label: "Em cima, à esquerda", x: 0, y: 0 },
  { id: "top-center", label: "Em cima, ao centro", x: 0.5, y: 0 },
  { id: "top-right", label: "Em cima, à direita", x: 1, y: 0 },
  { id: "bottom-left", label: "Embaixo, à esquerda", x: 0, y: 1 },
  { id: "bottom-center", label: "Embaixo, ao centro", x: 0.5, y: 1 },
  { id: "bottom-right", label: "Embaixo, à direita", x: 1, y: 1 },
] as const;
export type Anchor = (typeof anchors)[number]["id"];
export type Point = { x: number; y: number };
export type Bounds = {
  width: number;
  height: number;
  panelWidth: number;
  panelHeight: number;
};
export function clampPoint(point: Point, bounds: Bounds): Point {
  return {
    x: Math.max(0, Math.min(point.x, bounds.width - bounds.panelWidth)),
    y: Math.max(0, Math.min(point.y, bounds.height - bounds.panelHeight)),
  };
}
export function anchorPoint(anchor: Anchor, bounds: Bounds): Point {
  const position = anchors.find((item) => item.id === anchor)!;
  return clampPoint(
    {
      x: position.x * Math.max(0, bounds.width - bounds.panelWidth),
      y: position.y * Math.max(0, bounds.height - bounds.panelHeight),
    },
    bounds,
  );
}
export function nearestAnchor(point: Point, bounds: Bounds): Anchor {
  return anchors.reduce((best, next) => {
    const a = anchorPoint(best.id, bounds),
      b = anchorPoint(next.id, bounds);
    return Math.hypot(point.x - b.x, point.y - b.y) <
      Math.hypot(point.x - a.x, point.y - a.y)
      ? next
      : best;
  }).id;
}
