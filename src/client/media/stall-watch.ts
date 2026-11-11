/**
 * Watchdog for incoming video that stops arriving while the connection still
 * reads "connected" (#345). Pure bookkeeping: `Peers` feeds it getStats samples
 * and carries out the action it returns.
 *
 * Escalation per subscription: no progress for `stallMs` → ICE restart; still
 * none `stallMs` later → full resubscription. Progress after any of these
 * returns "recovered" once, so the caller can clear its warning. Resubscriptions are counted per
 * publication and tier (the subscription id changes with each one), backed off
 * and capped; after the cap the watchdog reports once and stops.
 */
export const STALL_MS = 10_000;
/** A still screen share may send almost nothing for a while; wait longer. */
export const SCREEN_STALL_MS = 25_000;
export const RESUBSCRIBE_LIMIT = 3;
/** Media flowing this long clears a publication's resubscription history. */
export const HEALTHY_MS = 60_000;
export type StallAction = "restart" | "resubscribe" | "give-up" | "recovered";
interface Live {
  progress: number;
  seen: number;
  restartedAt?: number;
  /** An action was returned and no progress has been seen since. */
  stalled?: boolean;
}
interface History {
  count: number;
  nextAt: number;
  healthySince?: number;
  gaveUp?: boolean;
}
export class StallWatch {
  private live = new Map<string, Live>();
  private history = new Map<string, History>();
  /**
   * @param id subscription id (one peer)
   * @param key `publicationId:tier`, stable across resubscriptions
   * @param progress any counter that grows while media arrives
   * @param expecting false while no video is due or measurable (demand off,
   *   offline, hidden tab, PC not connected, no receiver): the clock restarts
   */
  check(
    id: string,
    key: string,
    progress: number,
    expecting: boolean,
    now: number,
    stallMs = STALL_MS,
  ): StallAction | undefined {
    let live = this.live.get(id);
    if (!live) {
      live = { progress, seen: now };
      this.live.set(id, live);
    }
    const history = this.history.get(key);
    if (!expecting || progress !== live.progress) {
      const moved = progress !== live.progress;
      live.progress = progress;
      live.seen = now;
      live.restartedAt = undefined;
      if (expecting && history) {
        history.healthySince ??= now;
        if (now - history.healthySince >= HEALTHY_MS) this.history.delete(key);
      }
      if (expecting && moved && live.stalled) {
        live.stalled = false;
        // A later stall may warn again.
        if (history) history.gaveUp = false;
        return "recovered";
      }
      return;
    }
    if (history) history.healthySince = undefined;
    if (live.restartedAt === undefined) {
      if (now - live.seen < stallMs) return;
      live.restartedAt = now;
      live.stalled = true;
      return "restart";
    }
    if (now - live.restartedAt < stallMs) return;
    const h = history ?? { count: 0, nextAt: 0 };
    this.history.set(key, h);
    if (h.count >= RESUBSCRIBE_LIMIT) {
      if (h.gaveUp) return;
      h.gaveUp = true;
      return "give-up";
    }
    if (now < h.nextAt) return;
    h.count++;
    h.nextAt = now + stallMs * 2 ** (h.count + 1);
    return "resubscribe";
  }
  forget(id: string) {
    this.live.delete(id);
  }
  /** The publication left the room: its resubscription history goes too. */
  forgetPublication(publicationId: string) {
    for (const key of this.history.keys())
      if (key.startsWith(`${publicationId}:`)) this.history.delete(key);
  }
  clear() {
    this.live.clear();
    this.history.clear();
  }
}
