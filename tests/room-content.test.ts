import test from "node:test";
import assert from "node:assert/strict";
import { roomContentKind } from "../src/client/canvas/room-content";

test("Para a sala keeps the widget the person picked (#254)", () => {
  assert.equal(roomContentKind("custom", "room"), "custom");
  assert.equal(roomContentKind("timer", "room"), "timer");
  assert.equal(roomContentKind("poll", "room"), "module");
  assert.equal(roomContentKind("chat", "room"), "chat");
  assert.equal(roomContentKind("chat", "individual"), "chat");
  assert.equal(roomContentKind("custom", "individual"), null);
  assert.equal(roomContentKind("people", "room"), null);
});
