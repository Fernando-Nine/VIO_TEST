/** Cameras widget (#162): who is highlighted and where each camera sits. */

/** Continuous speech needed before the highlight moves, so it never flickers. */
export const SPEAKER_HOLD_MS = 1500;

/**
 * Next highlighted camera. Keeps the current one unless someone else has been
 * speaking for `hold` ms; falls back to the first camera when it turns off.
 * `since` maps a camera owner to when their current speech started.
 */
export function nextFeatured(
  current: string | undefined,
  cameras: string[],
  since: ReadonlyMap<string, number>,
  now: number,
  hold = SPEAKER_HOLD_MS,
): string | undefined {
  let best: string | undefined;
  for (const id of cameras) {
    const start = since.get(id);
    if (id === current || start === undefined || now - start < hold) continue;
    if (best === undefined || start < since.get(best)!) best = id;
  }
  if (best) return best;
  return current && cameras.includes(current) ? current : cameras[0];
}

export type CameraMode = "column" | "row" | "strip";
export interface CameraPlace {
  role: "main" | "side" | "hidden";
  gridRow?: string;
  gridColumn?: string;
}
export interface CameraGrid {
  columns: string;
  rows: string;
  places: Map<string, CameraPlace>;
}

/** Side cameras each size shows: column of 3, row of 4 (3 when narrow). */
export function sideCount(mode: CameraMode, narrow: boolean) {
  return mode === "strip" ? 0 : mode === "row" && !narrow ? 4 : 3;
}

/**
 * Grid placement. Every camera keeps its own element; only these styles
 * change, so moving the highlight never reparents a video.
 */
export function cameraGrid(
  cameras: string[],
  featured: string | undefined,
  mode: CameraMode,
  pinned: boolean,
  narrow = false,
): CameraGrid {
  const places = new Map<string, CameraPlace>();
  const others = cameras.filter((id) => id !== featured);
  const sides = pinned ? [] : others.slice(0, sideCount(mode, narrow));
  for (const id of others)
    if (!sides.includes(id)) places.set(id, { role: "hidden" });
  if (!featured || !cameras.includes(featured))
    return { columns: "1fr", rows: "1fr", places };
  if (!sides.length) {
    places.set(featured, { role: "main", gridRow: "1", gridColumn: "1" });
    return { columns: "minmax(0, 1fr)", rows: "minmax(0, 1fr)", places };
  }
  if (mode === "column") {
    places.set(featured, { role: "main", gridRow: "1 / -1", gridColumn: "1" });
    sides.forEach((id, i) =>
      places.set(id, { role: "side", gridRow: `${i + 1}`, gridColumn: "2" }),
    );
    return {
      columns: "minmax(0, 1fr) 118px",
      rows: `repeat(${sides.length}, minmax(0, 1fr))`,
      places,
    };
  }
  places.set(featured, { role: "main", gridRow: "1", gridColumn: "1 / -1" });
  sides.forEach((id, i) =>
    places.set(id, { role: "side", gridRow: "2", gridColumn: `${i + 1}` }),
  );
  return {
    columns: `repeat(${sideCount(mode, narrow)}, minmax(0, 1fr))`,
    rows: "minmax(0, 1fr) 112px",
    places,
  };
}
