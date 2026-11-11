/**
 * Watchdog for incoming video that stops arriving while the connection still
 * reads "connected" (#345). Pure bookkeeping: `Peers` feeds it getStats samples
 * and carries out the action it returns.
 *
 * Escalation per subscription: no progress for `STALL_MS` → ICE restart; still
 * none `STALL_MS` later → full resubscription. Resubscriptions are counted per
 * publication and tier (the subscription id changes with each one), backed off
 * and capped; after the cap the watchdog reports once and stops.
 */
export const STALL_MS = 10_000;
export const RESUBSCRIBE_LIMIT = 3;
/** Media flowing this long clears a publication's resubscription history. */
export const HEALTHY_MS = 60_000;
export type StallAction = "restart" | "resubscribe" | "give-up";
interface Live {
  progress: number;
  seen: number;
  restartedAt?: number;
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
   * @param expecting false while no video is due (demand off, offline, no receiver)
   */
  check(
    id: string,
    key: string,
    progress: number,
    expecting: boolean,
    now: number,
  ): StallAction | undefined {
    let live = this.live.get(id);
    if (!live) {
      live = { progress, seen: now };
      this.live.set(id, live);
    }
    const history = this.history.get(key);
    if (!expecting || progress !== live.progress) {
      live.progress = progress;
      live.seen = now;
      live.restartedAt = undefined;
      if (expecting && history) {
        history.healthySince ??= now;
        if (now - history.healthySince >= HEALTHY_MS) this.history.delete(key);
      }
      return;
    }
    if (history) history.healthySince = undefined;
    if (live.restartedAt === undefined) {
      if (now - live.seen < STALL_MS) return;
      live.restartedAt = now;
      return "restart";
    }
    if (now - live.restartedAt < STALL_MS) return;
    const h = history ?? { count: 0, nextAt: 0 };
    this.history.set(key, h);
    if (h.count >= RESUBSCRIBE_LIMIT) {
      if (h.gaveUp) return;
      h.gaveUp = true;
      return "give-up";
    }
    if (now < h.nextAt) return;
    h.count++;
    h.nextAt = now + STALL_MS * 2 ** (h.count + 1);
    return "resubscribe";
  }
  forget(id: string) {
    this.live.delete(id);
  }
  clear() {
    this.live.clear();
    this.history.clear();
  }
}
