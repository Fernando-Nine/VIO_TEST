/**
 * The room in the browser history (#309): entering pushes one entry over the
 * start page, so Back leaves the room (as Sair does) and Forward returns.
 * Only the entry's state marks it; the URL (`?sala=`) is the shareable link.
 */
export interface RoomEntry {
  /** The room's code, or "" while a new room has none yet. */
  vioRoom: string;
}
/** Same shape as `roomCode` in `shared/protocol.ts`. */
const code = /^[A-Z0-9]{4,24}$/;
/** True for an entry this app pushed for a room (its code may be pending). */
export function isRoomEntry(state: unknown): state is RoomEntry {
  if (!state || typeof state !== "object") return false;
  const room = (state as Partial<RoomEntry>).vioRoom;
  return room === "" || (typeof room === "string" && code.test(room));
}
/** The room of a history entry's state, if it is one of ours with a code. */
export function roomEntry(state: unknown): string | undefined {
  return isRoomEntry(state) && state.vioRoom ? state.vioRoom : undefined;
}
/** A reload goes back by itself only from the room's own entry (#286). */
export function resumes(state: unknown, room: string) {
  return roomEntry(state) === room;
}
export type Popped = "ignore" | "start" | { room: string };
/**
 * The address bar of one document. Every change waits for the previous one,
 * so a `back()` still on its way never lands on the entry of a newer room.
 */
export class RoomHistory {
  /** This document turned the entry below the room into the start page. */
  private ownsStart = false;
  /** Resolves the `back()` this class asked for, when its popstate comes. */
  private returning?: () => void;
  /** That `back()` timed out: its popstate may still come, once. */
  private late = false;
  /** The room entry shown since the last leave, to restore after a late back. */
  private shown?: { entry: RoomEntry; url: URL | string };
  private queue = Promise.resolve();
  constructor(
    private readonly history: History,
    private readonly start: () => string,
    private readonly wait = 1000,
  ) {}
  /** Resolves when every queued change has reached the bar. */
  settled() {
    return this.queue;
  }
  private then(step: () => void | Promise<void>) {
    this.queue = this.queue.then(step).catch(() => {});
    return this.queue;
  }
  /**
   * Shows the room: a new visit pushes it over the start page; anything else
   * (reconnect, reload, the code of a new room, another room) replaces it.
   */
  show(room: string, url: URL | string) {
    return this.then(() => {
      const entry: RoomEntry = { vioRoom: room };
      this.shown = { entry, url };
      if (isRoomEntry(this.history.state)) {
        this.history.replaceState(entry, "", url);
        return;
      }
      this.history.replaceState(null, "", this.start());
      this.history.pushState(entry, "", url);
      this.ownsStart = true;
    });
  }
  /**
   * Leaves the room's entry: back to the start page this document made (so
   * Forward still returns), or else the entry becomes the start page.
   */
  leave() {
    return this.then(() => {
      this.shown = undefined;
      this.late = false;
      if (!isRoomEntry(this.history.state) || !this.ownsStart) {
        this.history.replaceState(null, "", this.start());
        return;
      }
      this.ownsStart = false;
      return new Promise<void>((resolve) => {
        const done = (late = false) => {
          clearTimeout(timer);
          this.late = late;
          this.returning = undefined;
          resolve();
        };
        const timer = setTimeout(() => done(true), this.wait);
        this.returning = done;
        this.history.back();
      });
    });
  }
  /** What a popstate means: our own `back()`, the start page or a room. */
  popped(state: unknown): Popped {
    if (this.returning) {
      this.returning();
      return "ignore";
    }
    if (this.late && !isRoomEntry(state)) {
      // Our timed-out `back()` landed after all: put back the newer room.
      this.late = false;
      if (this.shown) {
        this.history.pushState(this.shown.entry, "", this.shown.url);
        this.ownsStart = true;
      }
      return "ignore";
    }
    this.late = false;
    if (!isRoomEntry(state)) return "start";
    // A popstate never crosses documents: Forward to a room entry lands over
    // the start page this document pushed it on.
    this.ownsStart = true;
    return state.vioRoom ? { room: state.vioRoom } : "ignore";
  }
}
