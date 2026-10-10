interface AnchorBox {
  top: number;
  bottom: number;
  right: number;
}
interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Coordinates stay within the visible viewport, including keyboard/zoom offsets. */
export function popoverPosition(
  anchor: AnchorBox,
  size: { width: number; height: number },
  viewport: Viewport,
  side: "above" | "below" = "below",
) {
  const left = viewport.left + 8;
  const top = viewport.top + 8;
  const right = Math.max(left, viewport.left + viewport.width - size.width - 8);
  const bottom = Math.max(
    top,
    viewport.top + viewport.height - size.height - 8,
  );
  const above = anchor.top - size.height - 6;
  const below = anchor.bottom + 6;
  const preferred = side === "above" ? above : below;
  const alternative = side === "above" ? below : above;
  const y =
    preferred >= top && preferred <= bottom
      ? preferred
      : alternative >= top && alternative <= bottom
        ? alternative
        : preferred;
  return {
    left: Math.max(left, Math.min(right, anchor.right - size.width)),
    top: Math.max(top, Math.min(bottom, y)),
  };
}
