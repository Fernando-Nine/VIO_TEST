import type { Snapshot } from "../../shared/protocol";
import type { Cue } from "../media/sound-preferences";

/** Snapshot repeats, transient offline states and a server restart are not arrivals. */
export function presenceCues(
  previous: Snapshot | null,
  next: Snapshot,
  self: string,
): Cue[] {
  if (!previous || previous.epoch !== next.epoch || previous.code !== next.code)
    return [];
  const before = new Set(previous.participants.map((p) => p.id));
  const after = new Set(next.participants.map((p) => p.id));
  const cues: Cue[] = [];
  if ([...before].some((id) => id !== self && !after.has(id)))
    cues.push("room-leave");
  if ([...after].some((id) => id !== self && !before.has(id)))
    cues.push("room-enter");
  const screens = (snapshot: Snapshot) =>
    snapshot.participants
      .filter((p) => p.id !== self)
      .flatMap((p) => p.publications)
      .filter((pub) => pub.kind === "screen")
      .map((pub) => pub.id);
  const known = new Set(screens(previous));
  if (screens(next).some((id) => !known.has(id))) cues.push("screen-new");
  return cues;
}
