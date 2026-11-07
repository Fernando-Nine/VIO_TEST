import type { Snapshot } from "../../shared/protocol";
import type { Cue } from "../media/sound-preferences";

/** How long the people of a room before a restart may come back in silence. */
export const RESTART_QUIET_MS = 120000;

/**
 * A server restart (#292): who was in this room before it and has not come
 * back yet, and the screens they showed. Tied to one room and one epoch.
 */
export interface RestartQuiet {
  code: string;
  epoch: string;
  pending: Set<string>;
  screens: Set<string>;
  until: number;
}

function active(quiet: RestartQuiet | undefined, next: Snapshot, now: number) {
  return quiet &&
    quiet.code === next.code &&
    quiet.epoch === next.epoch &&
    now < quiet.until
    ? quiet
    : undefined;
}

function screens(snapshot: Snapshot, self: string) {
  return snapshot.participants
    .filter((p) => p.id !== self)
    .flatMap((p) => p.publications)
    .filter((pub) => pub.kind === "screen")
    .map((pub) => pub.id);
}

/**
 * Snapshot repeats, transient offline states and a server restart are not
 * arrivals. Neither is the same tab under a new identity: the server swaps
 * its offline old id for the new one in a single snapshot (#292).
 */
export function presenceCues(
  previous: Snapshot | null,
  next: Snapshot,
  self: string,
  quiet?: RestartQuiet,
  now = performance.now(),
): Cue[] {
  if (!previous || previous.epoch !== next.epoch || previous.code !== next.code)
    return [];
  const back = active(quiet, next, now);
  const before = new Map(previous.participants.map((p) => [p.id, p]));
  const after = new Set(next.participants.map((p) => p.id));
  const gone = [...before.values()].filter(
    (p) => p.id !== self && !after.has(p.id),
  );
  const arrived = [...after].filter(
    (id) => id !== self && !before.has(id) && !back?.pending.has(id),
  );
  const swaps = Math.min(gone.filter((p) => !p.online).length, arrived.length);
  const cues: Cue[] = [];
  if (gone.length > swaps) cues.push("room-leave");
  if (arrived.length > swaps) cues.push("room-enter");
  const known = new Set(screens(previous, self));
  if (
    screens(next, self).some((id) => !known.has(id) && !back?.screens.has(id))
  )
    cues.push("screen-new");
  return cues;
}

/**
 * The silence after this snapshot: opened by a restart, closed once everyone
 * (and every screen) is back or after `RESTART_QUIET_MS`, whichever is first.
 */
export function nextQuiet(
  previous: Snapshot | null,
  next: Snapshot,
  self: string,
  quiet: RestartQuiet | undefined,
  now = performance.now(),
): RestartQuiet | undefined {
  if (previous && previous.code === next.code && previous.epoch !== next.epoch)
    quiet = {
      code: next.code,
      epoch: next.epoch,
      pending: new Set(
        previous.participants.map((p) => p.id).filter((id) => id !== self),
      ),
      screens: new Set(screens(previous, self)),
      until: now + RESTART_QUIET_MS,
    };
  const current = active(quiet, next, now);
  if (!current) return undefined;
  for (const p of next.participants) {
    current.pending.delete(p.id);
    for (const pub of p.publications) current.screens.delete(pub.id);
  }
  return current.pending.size || current.screens.size ? current : undefined;
}
