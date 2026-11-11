import test from "node:test";
import assert from "node:assert/strict";
import {
  HEALTHY_MS,
  RESUBSCRIBE_LIMIT,
  SCREEN_STALL_MS,
  STALL_MS,
  StallWatch,
} from "../src/client/media/stall-watch";
import { Peers } from "../src/client/media/peers";
import type { Captures } from "../src/client/media/capture";
import type { Signal } from "../src/shared/protocol";

const key = "pub:main";

test("vídeo parado: ICE restart, depois reassinatura, com espera e teto", () => {
  const w = new StallWatch();
  assert.equal(w.check("a", key, 100, true, 0), undefined);
  assert.equal(w.check("a", key, 100, true, STALL_MS - 1), undefined);
  assert.equal(w.check("a", key, 100, true, STALL_MS), "restart");
  assert.equal(w.check("a", key, 100, true, STALL_MS * 1.5), undefined);
  assert.equal(w.check("a", key, 100, true, STALL_MS * 2), "resubscribe");
  // The new subscription stalls too; the second resubscription waits for the backoff.
  w.forget("a");
  let t = STALL_MS * 2;
  assert.equal(w.check("b", key, 0, true, t), undefined);
  assert.equal(w.check("b", key, 0, true, (t += STALL_MS)), "restart");
  assert.equal(w.check("b", key, 0, true, (t += STALL_MS)), undefined);
  t = STALL_MS * 2 + STALL_MS * 4;
  assert.equal(w.check("b", key, 0, true, t), "resubscribe");
  let actions: unknown[] = [];
  for (let id = 0; id < 10; id++) {
    w.forget(String(id - 1));
    for (let i = 0; i < 40; i++)
      actions.push(w.check(String(id), key, 0, true, (t += STALL_MS / 2)));
  }
  actions = actions.filter(Boolean);
  assert.equal(
    actions.filter((a) => a === "resubscribe").length,
    RESUBSCRIBE_LIMIT - 2,
  );
  assert.equal(actions.filter((a) => a === "give-up").length, 1);
});

test("progresso ou demanda desligada não disparam nada", () => {
  const w = new StallWatch();
  for (let t = 0; t < STALL_MS * 10; t += 2000)
    assert.equal(w.check("a", key, t, true, t), undefined);
  for (let t = 0; t < STALL_MS * 10; t += 2000)
    assert.equal(w.check("b", "other:main", 0, false, t), undefined);
  // Turning the demand back on restarts the clock.
  const on = STALL_MS * 10;
  assert.equal(w.check("b", "other:main", 0, false, on), undefined);
  assert.equal(
    w.check("b", "other:main", 0, true, on + STALL_MS - 1),
    undefined,
  );
  assert.equal(w.check("b", "other:main", 0, true, on + STALL_MS), "restart");
});

test("mídia voltando apaga o restart pendente e, depois de um tempo, o histórico", () => {
  const w = new StallWatch();
  w.check("a", key, 0, true, 0);
  assert.equal(w.check("a", key, 0, true, STALL_MS), "restart");
  assert.equal(w.check("a", key, 0, true, STALL_MS * 2), "resubscribe");
  w.forget("a");
  w.check("b", key, 0, true, STALL_MS * 2);
  w.check("b", key, 5, true, STALL_MS * 3);
  w.check("b", key, 9, true, STALL_MS * 3 + HEALTHY_MS);
  // History gone: a later stall resubscribes without waiting for the old backoff.
  let t = STALL_MS * 3 + HEALTHY_MS;
  assert.equal(w.check("b", key, 9, true, (t += STALL_MS)), "restart");
  assert.equal(w.check("b", key, 9, true, (t += STALL_MS)), "resubscribe");
});

test("desistência e depois volta da mídia devolvem 'recovered' uma vez", () => {
  const w = new StallWatch();
  let t = 0;
  const actions: unknown[] = [];
  for (let id = 0; id <= RESUBSCRIBE_LIMIT; id++) {
    w.forget(String(id - 1));
    for (let i = 0; i < 40; i++)
      actions.push(w.check(String(id), key, 0, true, (t += STALL_MS / 2)));
  }
  assert.ok(actions.includes("give-up"));
  const last = String(RESUBSCRIBE_LIMIT);
  assert.equal(w.check(last, key, 1, true, (t += 2000)), "recovered");
  assert.equal(w.check(last, key, 2, true, (t += 2000)), undefined);
});

test("tela usa a espera maior antes do primeiro restart", () => {
  const w = new StallWatch();
  w.check("a", key, 0, true, 0, SCREEN_STALL_MS);
  assert.equal(
    w.check("a", key, 0, true, STALL_MS, SCREEN_STALL_MS),
    undefined,
  );
  assert.equal(
    w.check("a", key, 0, true, SCREEN_STALL_MS, SCREEN_STALL_MS),
    "restart",
  );
});

test("Peers: aba escondida, offline ou PC desconectada não contam; visível de novo recomeça o relógio", async () => {
  let now = 0;
  const realNow = Date.now;
  Date.now = () => now;
  const doc = globalThis as { document?: { hidden: boolean } };
  doc.document = { hidden: false };
  let online = true;
  const sent: Signal[] = [];
  const resubscribed: string[] = [];
  const captures = {
    sourceFor: () => undefined,
    keepPreviews: () => {},
  } as unknown as Captures;
  const peers = new Peers(
    () => "viewer",
    captures,
    (s) => sent.push(s),
    () => {},
    () => online,
    async () => ({ iceServers: [], expiresAt: Infinity, turn: false }),
    { resubscribe: (id) => resubscribed.push(id) },
  );
  peers.ice.expiresAt = Infinity;
  const pc = {
    connectionState: "connected",
    iceGatheringState: "complete",
    signalingState: "stable",
    getReceivers: () => [{ track: { kind: "video" } }],
    getStats: async () =>
      new Map([
        ["c", { type: "local-candidate" }],
        ["v", { type: "inbound-rtp", kind: "video", bytesReceived: 500 }],
      ]),
    setConfiguration: () => {},
    close: () => {},
  };
  const info = { id: "s1", publicationId: "p1", kind: "screen", tier: "main" };
  peers.entries.set("s1", {
    sub: {
      id: "s1",
      tier: "main",
      viewer: "viewer",
      publication: { id: "p1", kind: "screen", owner: "owner" },
    },
    pc,
    info,
    outgoing: false,
    stream: { getTracks: () => [] },
    round: 1,
    queue: Promise.resolve(),
    candidates: [],
    attempts: 0,
    started: false,
    events: new AbortController(),
  } as never);
  const tick = async (ms: number) => {
    now += ms;
    await peers.stats();
    await peers.entries.get("s1")?.queue;
  };
  try {
    await tick(0);
    for (const pause of [
      () => (doc.document!.hidden = true),
      () => (online = false),
      () => (pc.connectionState = "disconnected"),
    ]) {
      pause();
      for (let i = 0; i < 40; i++) await tick(2000);
      assert.equal(sent.length, 0);
      doc.document!.hidden = false;
      online = true;
      pc.connectionState = "connected";
      await tick(0);
      await tick(SCREEN_STALL_MS - 1);
      assert.equal(sent.length, 0);
    }
    await tick(1);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].restart, true);
    await tick(SCREEN_STALL_MS);
    assert.deepEqual(resubscribed, ["s1"]);
  } finally {
    Date.now = realNow;
    delete doc.document;
    peers.destroy();
  }
});
