import test from "node:test";
import assert from "node:assert/strict";
import { addDie, critical, parts } from "../src/client/canvas/dice-parts";
import type { ModuleResult } from "../src/shared/room-modules";

const result = (expression: string, detail: string, label = "0") =>
  ({
    id: "r",
    authorId: "a",
    authorName: "Nine",
    at: 0,
    expression,
    label,
    detail,
  }) satisfies ModuleResult;

test("teclado de dados acumula o mesmo tipo e soma tipos diferentes", () => {
  assert.equal(addDie("", 20), "1d20");
  assert.equal(addDie("1d20", 20), "2d20");
  assert.equal(addDie("2d20", 6), "2d20+1d6");
  assert.equal(addDie("2d20+1d6", 6), "2d20+2d6");
  assert.equal(addDie("1d20+5", 20), "1d20+5+1d20");
  assert.equal(addDie("d8", 8), "2d8");
});

test("partes trocam cada termo de dado pelo que saiu", () => {
  assert.equal(parts(result("1d20+5", "1d20: [20] = 25")), "[20]+5");
  assert.equal(parts(result("2d6 + 3", "2d6: [4, 6] = 13")), "[4,6]+3");
  assert.equal(parts(result("2d20k1", "2d20: [(3), 17] = 17")), "[17]");
  assert.equal(parts(result("1d8+1d6", "1d8: [2] · 1d6: [5] = 7")), "[2]+[5]");
});

test("crítico é 20 natural mantido num d20", () => {
  assert.equal(critical(result("1d20+5", "1d20: [20] = 25")), true);
  assert.equal(critical(result("1d20", "1d20: [19] = 19")), false);
  assert.equal(critical(result("2d20kl1", "2d20: [(20), 4] = 4")), false);
  assert.equal(critical(result("1d100", "1d100: [20] = 20")), false);
});
