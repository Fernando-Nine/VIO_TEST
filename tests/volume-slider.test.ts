import assert from "node:assert/strict";
import test from "node:test";
import {
  clampVolume,
  volumeKeyStep,
} from "../src/client/components/VolumeSlider";

test("#167: setas andam 5%, Page Up/Down 25%, sem passar dos limites", () => {
  assert.equal(volumeKeyStep("ArrowUp"), 0.05);
  assert.equal(volumeKeyStep("ArrowLeft"), -0.05);
  assert.equal(volumeKeyStep("PageDown"), -0.25);
  assert.equal(volumeKeyStep("Home"), undefined);
  assert.equal(clampVolume(1 + 0.05, 3), 1.05);
  assert.equal(clampVolume(2.9 + 0.25, 3), 3);
  assert.equal(clampVolume(0.1 - 0.25, 2), 0);
  assert.equal(clampVolume(0.15 + 0.05, 1), 0.2);
});
