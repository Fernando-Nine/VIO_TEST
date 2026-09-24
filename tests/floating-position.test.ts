import assert from "node:assert/strict";
import test from "node:test";
import {
  anchors,
  anchorPoint,
  clampPoint,
  nearestAnchor,
} from "../src/client/components/floating-position";

test("arraste encaixa nas seis posições dentro da área útil do vídeo", () => {
  const bounds = {
    width: 1000,
    height: 540,
    panelWidth: 320,
    panelHeight: 120,
  };
  for (const anchor of anchors) {
    const point = anchorPoint(anchor.id, bounds);
    assert.equal(nearestAnchor(point, bounds), anchor.id);
    assert.deepEqual(clampPoint(point, bounds), point);
  }
  assert.equal(nearestAnchor({ x: 652, y: 300 }, bounds), "bottom-right");
  assert.equal(nearestAnchor({ x: 380, y: 20 }, bounds), "top-center");
});
test("redimensionamento mantém o painel acessível e limita arraste fora da tela", () => {
  const mobile = { width: 292, height: 460, panelWidth: 292, panelHeight: 130 };
  assert.deepEqual(clampPoint({ x: -200, y: 900 }, mobile), { x: 0, y: 330 });
  assert.deepEqual(anchorPoint("bottom-right", mobile), { x: 0, y: 330 });
  assert.deepEqual(
    anchorPoint("top-right", { ...mobile, width: 180, height: 50 }),
    { x: 0, y: 0 },
  );
});
