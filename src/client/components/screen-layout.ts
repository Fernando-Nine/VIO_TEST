import { anchors, type Anchor } from "./floating-position";

export interface Area {
  width: number;
  height: number;
}
export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Placement {
  x: number;
  y: number;
  width: number;
}
export type Arrangement = "right" | "bottom";
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
export function fitScreen(
  rect: Pick<ScreenRect, "x" | "y" | "width">,
  area: Area,
): ScreenRect {
  const max = Math.max(1, Math.min(area.width, (area.height * 16) / 9));
  const width = clamp(rect.width, Math.min(144, max), max);
  const height = (width * 9) / 16;
  return {
    width,
    height,
    x: clamp(rect.x, 0, Math.max(0, area.width - width)),
    y: clamp(rect.y, 0, Math.max(0, area.height - height)),
  };
}
export function savePlacement(rect: ScreenRect, area: Area): Placement {
  return {
    x: rect.x / Math.max(1, area.width - rect.width),
    y: rect.y / Math.max(1, area.height - rect.height),
    width: rect.width / Math.max(1, area.width),
  };
}
export function restorePlacement(position: Placement, area: Area): ScreenRect {
  const size = fitScreen(
    { x: 0, y: 0, width: position.width * area.width },
    area,
  );
  return fitScreen(
    {
      ...size,
      x: position.x * (area.width - size.width),
      y: position.y * (area.height - size.height),
    },
    area,
  );
}
export function placeScreen(
  rect: ScreenRect,
  anchor: Anchor,
  area: Area,
): ScreenRect {
  const point = anchors.find((item) => item.id === anchor)!;
  const size = fitScreen(rect, area);
  return {
    ...size,
    x: Math.max(0, area.width - size.width) * point.x,
    y: Math.max(0, area.height - size.height) * point.y,
  };
}
export function arrangeScreen(
  index: number,
  count: number,
  area: Area,
  mode: Arrangement,
): ScreenRect {
  const gap = 10;
  const bottom = mode === "bottom" || area.width < 600;
  const laneWidth = bottom ? area.width : Math.min(area.width * 0.46, 650);
  const laneHeight = bottom ? area.height * 0.52 : area.height;
  const columns = Math.max(
    1,
    Math.ceil(
      Math.sqrt(
        (((Math.max(1, count) * laneWidth) / Math.max(1, laneHeight)) * 9) / 16,
      ),
    ),
  );
  const rows = Math.max(1, Math.ceil(count / columns));
  const width = Math.min(
    340,
    (laneWidth - gap * (columns - 1)) / columns,
    (((laneHeight - gap * (rows - 1)) / rows) * 16) / 9,
  );
  const size = fitScreen({ x: 0, y: 0, width }, area);
  // When space is scarce, overlap within bounds instead of imposing another screen cap.
  const dx =
    columns > 1
      ? Math.min(
          size.width + gap,
          Math.max(0, laneWidth - size.width) / (columns - 1),
        )
      : 0;
  const dy =
    rows > 1
      ? Math.min(
          size.height + gap,
          Math.max(0, laneHeight - size.height) / (rows - 1),
        )
      : 0;
  return fitScreen(
    {
      width: size.width,
      x: area.width - size.width - (index % columns) * dx,
      y: bottom
        ? area.height - size.height - Math.floor(index / columns) * dy
        : Math.floor(index / columns) * dy,
    },
    area,
  );
}
