import test from "node:test";
import assert from "node:assert/strict";
import {
  HEALTHY_MS,
  RESUBSCRIBE_LIMIT,
  STALL_MS,
  StallWatch,
} from "../src/client/media/stall-watch";

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
