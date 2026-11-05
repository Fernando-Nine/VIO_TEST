/**
 * The room this tab is in (#286), kept in sessionStorage so the next page of
 * the same tab knows it: a reload goes back by itself, another room gets its
 * own session instead of colliding with the old membership (ALREADY_JOINED).
 */
export interface TabRoom {
  code: string;
  /** When the page went away (pagehide); absent while it is open. */
  hiddenAt?: number;
}
const key = "vio:room";
/** A reload is back within this; a tab restored hours later is not. */
export const RESUME_WINDOW = 60000;

export function readTabRoom(storage?: Storage): TabRoom | undefined {
  try {
    const value = JSON.parse(storage?.getItem(key) || "null");
    if (!value || typeof value.code !== "string" || !value.code) return;
    return {
      code: value.code,
      ...(Number.isFinite(value.hiddenAt) && { hiddenAt: value.hiddenAt }),
    };
  } catch {
    return;
  }
}
export function writeTabRoom(room: TabRoom | undefined, storage?: Storage) {
  try {
    if (room) storage?.setItem(key, JSON.stringify(room));
    else storage?.removeItem(key);
  } catch {}
}
/** The room a reload goes back to by itself, if any. Never opens mic or camera. */
export function resumeCode(
  room: TabRoom | undefined,
  link: string,
  now = Date.now(),
) {
  if (room?.hiddenAt === undefined) return;
  if (now < room.hiddenAt || now - room.hiddenAt > RESUME_WINDOW) return;
  if (link && link.trim().toUpperCase() !== room.code) return;
  return room.code;
}
/** A page going to another room (or a new one) asks for a session of its own. */
export function needsFreshSession(room: TabRoom | undefined, target?: string) {
  return !!room && room.code !== (target?.trim().toUpperCase() || undefined);
}
