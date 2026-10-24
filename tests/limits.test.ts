import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { Limits } from "../src/server/security";

test("limites aceitam rajada humana, repõem aos poucos e barram flood", () => {
  let now = 1_000_000;
  mock.method(Date, "now", () => now);
  try {
    const limits = new Limits();
    // A quick run of 40 edits (burst) passes at once.
    for (let i = 0; i < 40; i++) limits.take("a:edit", 120, 60000, 40);
    assert.throws(() => limits.take("a:edit", 120, 60000, 40), /Aguarde/);
    // Half a second later one more edit fits (120/min = 2 per second).
    now += 500;
    limits.take("a:edit", 120, 60000, 40);
    // A sustained flood stops at the steady rate: 10 s allow about 20 more.
    now += 10_000;
    let passed = 0;
    for (let i = 0; i < 100; i++)
      try {
        limits.take("a:edit", 120, 60000, 40);
        passed++;
      } catch {
        break;
      }
    assert.ok(passed >= 19 && passed <= 21, String(passed));
    // Other keys are independent; full buckets are forgotten by clean().
    limits.take("b:edit", 120, 60000, 40);
    now += 60_000;
    limits.clean();
    limits.take("a:edit", 120, 60000, 40);
  } finally {
    mock.restoreAll();
  }
});
