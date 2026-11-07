import test from "node:test";
import assert from "node:assert/strict";
import { Controller } from "../src/client/room/controller";
import {
  RoomHistory,
  isRoomEntry,
  resumes,
  roomEntry,
} from "../src/client/room/room-history";

/**
 * A tab's session history. Like a browser, `back()` lands later (a task
 * after the call) and then fires popstate through `pop`.
 */
function tab(first: string, delay = 5) {
  const entries: { url: string; state: unknown }[] = [
    { url: first, state: null },
  ];
  let index = 0;
  let backs = 0;
  let pop: (state: unknown) => void = () => {};
  const history = {
    get state() {
      return entries[index].state;
    },
    get length() {
      return entries.length;
    },
    pushState(state: unknown, _: string, url: string | URL) {
      entries.splice(index + 1);
      entries.push({ url: String(url), state });
      index++;
    },
    replaceState(state: unknown, _: string, url: string | URL) {
      entries[index] = { url: String(url), state };
    },
    back() {
      backs++;
      setTimeout(() => {
        if (index === 0) return;
        index--;
        pop(entries[index].state);
      }, delay);
    },
  };
  const t = {
    history: history as unknown as History,
    entries,
    forward() {
      index++;
      pop(entries[index].state);
    },
    goBack() {
      index--;
      pop(entries[index].state);
    },
    onPop(handler: (state: unknown) => void) {
      pop = handler;
    },
    get url() {
      return entries[index].url;
    },
    get backs() {
      return backs;
    },
  };
  return t;
}
const room = (code: string) => `https://vio.test/?sala=${code}`;

test("room history: entering pushes one entry over the start (#309)", async () => {
  const t = tab("https://vio.test/?sala=ABCD&convite=x.y");
  const bar = new RoomHistory(t.history, () => "/");
  await bar.show("ABCD", room("ABCD"));
  assert.deepEqual(
    t.entries.map((e) => e.url),
    ["/", room("ABCD")],
  );
  assert.equal(roomEntry(t.history.state), "ABCD");
  // Reconnects, reloads and another room replace the entry, never stack.
  await bar.show("ABCD", room("ABCD"));
  await bar.show("WXYZ", room("WXYZ"));
  assert.equal(t.entries.length, 2);
  assert.equal(roomEntry(t.history.state), "WXYZ");
});

test("room history: a new room's entry gets its code when it comes", async () => {
  const t = tab("https://vio.test/");
  const bar = new RoomHistory(t.history, () => "/");
  await bar.show("", "/");
  assert.equal(isRoomEntry(t.history.state), true);
  assert.equal(roomEntry(t.history.state), undefined);
  await bar.show("NEWROOM1", room("NEWROOM1"));
  assert.equal(t.entries.length, 2);
  assert.equal(roomEntry(t.history.state), "NEWROOM1");
});

test("room history: Sair goes back without a loop, Forward returns", async () => {
  const t = tab("https://vio.test/");
  const bar = new RoomHistory(t.history, () => "/");
  const popped: unknown[] = [];
  t.onPop((state) => popped.push(bar.popped(state)));
  await bar.show("ABCD", room("ABCD"));
  await bar.leave();
  assert.equal(t.url, "/");
  assert.deepEqual(popped, ["ignore"]);
  t.forward();
  assert.deepEqual(popped.at(-1), { room: "ABCD" });
  // Back from the browser: "start", and leaving from there never goes back again.
  t.goBack();
  assert.equal(popped.at(-1), "start");
  await bar.leave();
  assert.equal(t.backs, 1);
  assert.equal(t.entries.length, 2);
});

test("room history: a new room right after Sair waits for the back (#309)", async () => {
  const t = tab("https://vio.test/");
  const bar = new RoomHistory(t.history, () => "/");
  const popped: unknown[] = [];
  t.onPop((state) => popped.push(bar.popped(state)));
  await bar.show("ABCD", room("ABCD"));
  void bar.leave();
  void bar.show("WXYZ", room("WXYZ"));
  await bar.settled();
  // The late popstate was ours: nobody is thrown out of the new room.
  assert.deepEqual(popped, ["ignore"]);
  assert.deepEqual(
    t.entries.map((e) => e.url),
    ["/", room("WXYZ")],
  );
  assert.equal(roomEntry(t.history.state), "WXYZ");
});

test("room history: a back later than the wait keeps the new room (#309)", async () => {
  const t = tab("https://vio.test/", 60);
  const bar = new RoomHistory(t.history, () => "/", 10);
  const popped: unknown[] = [];
  t.onPop((state) => popped.push(bar.popped(state)));
  await bar.show("ABCD", room("ABCD"));
  await bar.leave();
  await bar.show("WXYZ", room("WXYZ"));
  await new Promise((resolve) => setTimeout(resolve, 100));
  // The late popstate is swallowed and the new room's entry comes back.
  assert.deepEqual(popped, ["ignore"]);
  assert.equal(roomEntry(t.history.state), "WXYZ");
  assert.equal(t.url, room("WXYZ"));
  // Only the first late one: a real Back afterwards is the start again.
  t.goBack();
  assert.equal(popped.at(-1), "start");
});

test("room history: without a start of this page, the entry becomes it", async () => {
  const t = tab(room("ABCD"));
  t.history.replaceState({ vioRoom: "ABCD" }, "", room("ABCD"));
  const bar = new RoomHistory(t.history, () => "/");
  await bar.leave();
  assert.equal(t.backs, 0);
  assert.equal(t.entries.length, 1);
  assert.equal(t.history.state, null);
});

test("room history: the start page is owned once, only after a push", async () => {
  const t = tab("https://vio.test/");
  const bar = new RoomHistory(t.history, () => "/");
  t.onPop((state) => bar.popped(state));
  await bar.show("ABCD", room("ABCD"));
  await bar.leave();
  // Back at the start: the next leave just rewrites it.
  await bar.leave();
  assert.equal(t.backs, 1);
});

test("room history: only our own valid state marks a room entry", () => {
  for (const state of [
    null,
    undefined,
    "ABCD",
    {},
    { vioRoom: 3 },
    { vioRoom: "abcd" },
    { vioRoom: "x".repeat(500) },
    { vioRoom: "A".repeat(25) },
  ]) {
    assert.equal(roomEntry(state), undefined);
    assert.equal(isRoomEntry(state), false);
  }
  assert.equal(roomEntry({ vioRoom: "ABCD" }), "ABCD");
});

test("room history: a reload resumes only from the room's own entry", () => {
  assert.equal(resumes(null, "ABCD"), false);
  assert.equal(resumes({ vioRoom: "WXYZ" }, "ABCD"), false);
  assert.equal(resumes({ vioRoom: "ABCD" }, "ABCD"), true);
});

test("room history: leave(…, false) keeps the entry, leave() leaves it", async () => {
  const calls: string[] = [];
  const address = {
    leave: async () => void calls.push("leave"),
    show: async () => void calls.push("show"),
    popped: () => "ignore" as const,
  } as unknown as RoomHistory;
  const engine = new Controller(undefined, false, undefined, address);
  engine.sounds = false;
  await engine.leave(true, false);
  assert.deepEqual(calls, []);
  await engine.leave();
  assert.deepEqual(calls, ["leave"]);
  await engine.destroy();
  assert.deepEqual(calls, ["leave"]);
});
