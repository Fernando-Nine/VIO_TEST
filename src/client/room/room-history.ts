/**
 * The room in the browser history (#309): entering pushes one entry over the
 * start page, so Back leaves the room (as Sair does) and Forward returns.
 * Only the entry's state marks it; the URL (`?sala=`) is the shareable link.
 */
export interface RoomEntry {
  vioRoom: string;
}
/** The room of a history entry's state, if it is one of ours. */
export function roomEntry(state: unknown): string | undefined {
  if (!state || typeof state !== "object") return;
  const room = (state as Partial<RoomEntry>).vioRoom;
  return typeof room === "string" && room ? room : undefined;
}
/**
 * Shows `code` in the address bar. A new visit turns the current entry into
 * the start page (no `?sala=`, no invite) and pushes the room over it; a
 * reconnect, a reload or another room replaces the room entry, never stacks.
 * True when this document now owns the start entry just below the room.
 */
export function showRoom(code: string, url: URL, history: History) {
  const entry: RoomEntry = { vioRoom: code };
  if (roomEntry(history.state)) {
    history.replaceState(entry, "", url);
    return false;
  }
  const start = new URL(url);
  start.search = "";
  history.replaceState(null, "", start);
  history.pushState(entry, "", url);
  return true;
}
/**
 * Leaves the room's entry. Over a start entry of this same document, goes back
 * to it (Forward still returns); otherwise turns the entry into the start page.
 */
export function leaveRoom(
  ownsStart: boolean,
  history: History,
  start = location.pathname,
) {
  if (roomEntry(history.state) && ownsStart) {
    history.back();
    return;
  }
  history.replaceState(null, "", start);
}
