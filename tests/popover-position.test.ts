import test from "node:test";
import assert from "node:assert/strict";
import { popoverPosition } from "../src/client/components/popover-position";

const viewport = { left: 0, top: 0, width: 800, height: 600 };
const size = { width: 310, height: 200 };

test("popover inverte perto das bordas superior e inferior", () => {
  assert.deepEqual(
    popoverPosition({ top: 530, bottom: 570, right: 760 }, size, viewport),
    { left: 450, top: 324 },
  );
  assert.deepEqual(
    popoverPosition(
      { top: 10, bottom: 50, right: 30 },
      size,
      viewport,
      "above",
    ),
    { left: 8, top: 56 },
  );
});

test("popover permanece visível com teclado ou zoom deslocando a viewport", () => {
  assert.deepEqual(
    popoverPosition(
      { top: 530, bottom: 570, right: 850 },
      { width: 280, height: 240 },
      { left: 100, top: 200, width: 320, height: 300 },
    ),
    { left: 132, top: 252 },
  );
});

test("popover alto ou viewport estreita mantêm a origem e o fechamento acessíveis", () => {
  assert.deepEqual(
    popoverPosition(
      { top: 230, bottom: 270, right: 900 },
      { width: 220, height: 300 },
      { left: 0, top: 0, width: 236, height: 200 },
    ),
    { left: 8, top: 8 },
  );
});
