import test from "node:test";
import assert from "node:assert/strict";
import { validUntil } from "../src/client/room/invite-text";
import { inviteExpired } from "../src/client/room/controller";

const token = (exp: number) =>
  Buffer.from(
    JSON.stringify({ code: "K7Q2MX", gen: "abcdefgh", exp }),
  ).toString("base64url") + ".signature";

test("invite expiry is read from the token (#260)", () => {
  assert.equal(inviteExpired(token(1000), 2000), true);
  assert.equal(inviteExpired(token(3000), 2000), false);
  assert.equal(inviteExpired(undefined), false);
  assert.equal(inviteExpired("not a token"), false);
});

test("invite validity in local words (#260)", () => {
  const now = new Date(2026, 9, 29, 10, 0).getTime();
  assert.equal(
    validUntil(new Date(2026, 9, 29, 11, 5).getTime(), now),
    "Vale até hoje, 11:05.",
  );
  assert.equal(
    validUntil(new Date(2026, 9, 30, 21, 40).getTime(), now),
    "Vale até amanhã, 21:40.",
  );
  assert.equal(
    validUntil(new Date(2026, 10, 5, 9, 0).getTime(), now),
    "Vale até 05/11, 09:00.",
  );
});
