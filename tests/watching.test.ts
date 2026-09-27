import test from "node:test";
import assert from "node:assert/strict";
import {
  watchScreen,
  unwatchScreen,
  watchOnlyScreen,
} from "../src/client/room/watching";

test("assistir é explícito; foco mantém a mesma lista, ordem e assinaturas desejadas", () => {
  const idle = { watching: [], selected: "" };
  const one = watchScreen(idle, "ana");
  const pair = watchScreen(one, "bia", true);
  assert.deepEqual(idle, { watching: [], selected: "" });
  assert.deepEqual(pair, { watching: ["ana", "bia"], selected: "ana" });
  const focused = watchScreen(pair, "bia");
  assert.equal(focused.watching, pair.watching);
  assert.equal(focused.selected, "bia");
  assert.equal(watchScreen(focused, "ana").watching, pair.watching);
  let many = pair;
  for (const name of ["caio", "davi", "eva", "fabio"])
    many = watchScreen(many, name, true);
  assert.equal(many.watching.length, 6);
  assert.equal(many.selected, "ana");
  const focus = watchScreen(many, "eva");
  assert.equal(focus.watching, many.watching);
  assert.deepEqual(watchOnlyScreen(focus, "caio"), {
    watching: ["caio"],
    selected: "caio",
  });
  assert.equal(unwatchScreen(focus, "bia").selected, "eva");
});

test("trocar pela terceira tela preserva a secundária e fechar promove só a já aberta", () => {
  const pair = { watching: ["ana", "bia"], selected: "bia" };
  const next = watchScreen(pair, "caio");
  assert.deepEqual(next, { watching: ["ana", "caio"], selected: "caio" });
  assert.deepEqual(unwatchScreen(next, "ana"), {
    watching: ["caio"],
    selected: "caio",
  });
  const remaining = unwatchScreen(next, "caio");
  assert.deepEqual(remaining, { watching: ["ana"], selected: "ana" });
  assert.deepEqual(unwatchScreen(remaining, "ana"), {
    watching: [],
    selected: "",
  });
});
