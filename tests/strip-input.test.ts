import test from "node:test";
import assert from "node:assert/strict";
import { nearestStop, wheelPixels, wheelTarget } from "../src/client/canvas/strip-wheel";
import { snapPressed } from "../src/client/canvas/shortcuts";
import { newCanvas } from "../src/client/canvas/model";

test("roda isolada avança um card; sequência acompanha deltas e para no alinhamento mais próximo", () => {
  const stops = [0, 208, 416, 624, 832];
  assert.equal(wheelTarget(0, 12, stops, 416, false), 208);
  assert.equal(wheelTarget(208, -900, stops, 416, false), 0);
  assert.equal(wheelTarget(112, 27, stops, 416, true), 139);
  assert.equal(wheelTarget(139, -8, stops, 416, true), 131);
  assert.equal(nearestStop(131, stops, 416), 208);
  assert.equal(wheelTarget(410, 27, stops, 416, true), 416);
  assert.equal(wheelTarget(416, 900, stops, 416, false), 416);
});
test("roda normaliza pixels, linhas e páginas nos dois eixos", () => {
  assert.equal(wheelPixels(5, 0, 600), 5);
  assert.equal(wheelPixels(-2, 1, 600), -32);
  assert.equal(wheelPixels(1, 2, 800), 800);
});
test("encaixe lê o modificador atual e o padrão oferece foco mais três slots", () => {
  assert.equal(snapPressed({ shiftKey: true }), true);
  assert.equal(snapPressed({ shiftKey: false }), false);
  assert.equal(snapPressed({}), false);
  assert.equal(newCanvas().preset, "strip-left");
  assert.equal(newCanvas().slots.length, 4);
});
