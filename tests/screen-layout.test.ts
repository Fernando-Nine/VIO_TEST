import test from "node:test";
import assert from "node:assert/strict";
import {
  arrangeScreen,
  fitScreen,
  restorePlacement,
  savePlacement,
  placeScreen,
} from "../src/client/components/screen-layout";

test("janelas ficam dentro da área útil em desktop, celular e orientação horizontal", () => {
  for (const area of [
    { width: 1360, height: 600 },
    { width: 344, height: 490 },
    { width: 670, height: 160 },
    { width: 1, height: 1 },
  ])
    for (const mode of ["right", "bottom"] as const)
      for (const count of [1, 2, 5, 12, 30])
        for (let i = 0; i < count; i++) {
          const rect = arrangeScreen(i, count, area, mode);
          assert.ok(Object.values(rect).every(Number.isFinite));
          assert.ok(
            rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0,
          );
          assert.ok(rect.x + rect.width <= area.width + 0.001);
          assert.ok(rect.y + rect.height <= area.height + 0.001);
        }
});
test("posição proporcional sobrevive ao redimensionamento e presets alcançam bordas", () => {
  const area = { width: 1200, height: 600 };
  const rect = fitScreen({ x: 900, y: 400, width: 320 }, area);
  const saved = savePlacement(rect, area);
  assert.deepEqual(restorePlacement(saved, area), rect);
  const phone = { width: 344, height: 430 };
  const restored = restorePlacement(saved, phone);
  assert.ok(restored.x + restored.width <= phone.width);
  assert.ok(restored.y + restored.height <= phone.height);
  const corner = placeScreen(restored, "bottom-right", phone);
  assert.equal(corner.x + corner.width, phone.width);
  assert.equal(corner.y + corner.height, phone.height);
});
