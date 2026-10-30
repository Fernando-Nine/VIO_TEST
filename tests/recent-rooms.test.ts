import test from "node:test";
import assert from "node:assert/strict";
import {
  RECENT_LIMIT,
  drawCode,
  forgetRecent,
  lastSeenText,
  parseRoomInput,
  renameRecent,
  touchRecent,
} from "../src/client/room/recent-rooms";

test("recent rooms: newest first, keep the label, at most 12 (#259)", () => {
  let list = touchRecent([], "AAAA1", 1);
  list = renameRecent(list, "AAAA1", "  Sexta do terror ");
  list = touchRecent(list, "BBBB2", 2);
  list = touchRecent(list, "AAAA1", 3);
  assert.deepEqual(
    list.map((r) => r.code),
    ["AAAA1", "BBBB2"],
  );
  assert.equal(list[0].label, "Sexta do terror");
  assert.equal(renameRecent(list, "AAAA1", " ")[0].label, undefined);
  assert.deepEqual(
    forgetRecent(list, "AAAA1").map((r) => r.code),
    ["BBBB2"],
  );
  for (let i = 0; i < 20; i++) list = touchRecent(list, `ROOM${i}`, 10 + i);
  assert.equal(list.length, RECENT_LIMIT);
  assert.equal(list[0].code, "ROOM19");
});

test("enter accepts a code or a pasted link (#259)", () => {
  assert.deepEqual(parseRoomInput(" k7q2mx "), { code: "K7Q2MX", link: false });
  assert.deepEqual(
    parseRoomInput(
      "https://vio-quest.onrender.com/?sala=K7Q2MX&convite=invite.x",
    ),
    { code: "K7Q2MX", link: true, invite: "invite.x" },
  );
  assert.equal(parseRoomInput("https://example.com/?sala=a"), null);
  assert.equal(parseRoomInput("ab"), null);
});

test("drawn code and last-seen text", () => {
  assert.match(drawCode(), /^[A-Z2-9]{13}$/);
  const day = 24 * 3600000;
  assert.equal(lastSeenText(0, 2 * day), "Última vez há 2 dias");
  assert.equal(lastSeenText(0, 7 * day), "Última vez há 1 semana");
  assert.equal(lastSeenText(0, 60000), "Última vez há 1 minuto");
});
