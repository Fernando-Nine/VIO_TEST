import test from "node:test";
import assert from "node:assert/strict";
import {
  leaveRoom,
  roomEntry,
  showRoom,
} from "../src/client/room/room-history";

/** A tab's session history, enough for pushState, replaceState and back. */
function tab(first: string) {
  const entries: { url: string; state: unknown }[] = [
    { url: first, state: null },
  ];
  let index = 0;
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
      if (index > 0) index--;
    },
    forward() {
      if (index < entries.length - 1) index++;
    },
  };
  return {
    history: history as unknown as History & { forward(): void },
    entries,
    get url() {
      return entries[index].url;
    },
  };
}
const room = (code: string, invite = "") =>
  new URL(`https://vio.test/?sala=${code}${invite}`);

test("room history: entering pushes one entry over the start (#309)", () => {
  const t = tab("https://vio.test/?sala=ABCD&convite=x.y");
  assert.equal(showRoom("ABCD", room("ABCD"), t.history), true);
  assert.deepEqual(
    t.entries.map((e) => e.url),
    ["https://vio.test/", "https://vio.test/?sala=ABCD"],
  );
  assert.equal(roomEntry(t.history.state), "ABCD");
  // Reconnects and reloads replace the entry, never stack.
  assert.equal(showRoom("ABCD", room("ABCD"), t.history), false);
  assert.equal(t.history.length, 2);
  // Another room replaces it too.
  showRoom("WXYZ", room("WXYZ"), t.history);
  assert.equal(t.history.length, 2);
  assert.equal(roomEntry(t.history.state), "WXYZ");
});

test("room history: Sair goes back to the start, Forward still returns", () => {
  const t = tab("https://vio.test/");
  showRoom("ABCD", room("ABCD"), t.history);
  leaveRoom(true, t.history, "/");
  assert.equal(t.url, "https://vio.test/");
  assert.equal(t.history.length, 2);
  t.history.forward();
  assert.equal(roomEntry(t.history.state), "ABCD");
});

test("room history: without a start of this page, the entry becomes it", () => {
  const t = tab("https://vio.test/?sala=ABCD");
  t.history.replaceState(
    { vioRoom: "ABCD" },
    "",
    "https://vio.test/?sala=ABCD",
  );
  leaveRoom(false, t.history, "/");
  assert.equal(t.history.length, 1);
  assert.equal(t.history.state, null);
  assert.equal(t.url, "/");
});

test("room history: only our own state marks a room entry", () => {
  for (const state of [
    null,
    undefined,
    "ABCD",
    {},
    { vioRoom: 3 },
    { vioRoom: "" },
  ])
    assert.equal(roomEntry(state), undefined);
  assert.equal(roomEntry({ vioRoom: "ABCD" }), "ABCD");
});
