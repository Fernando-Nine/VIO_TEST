import test from "node:test";
import assert from "node:assert/strict";
import {
  displayVideo,
  loadShareChoice,
  saveShareChoice,
  shareQuality,
} from "../src/client/components/share-options";

test("share quality follows resolution and frame rate", () => {
  assert.deepEqual(shareQuality({ resolution: 720, fps: 30, audio: true }), {
    resolution: 720,
    fps: 30,
    bitrate: 1800,
  });
  assert.equal(
    shareQuality({ resolution: 1080, fps: 60, audio: false }).bitrate,
    6000,
  );
  // "Fonte" sends the source height, capped at 2160p.
  assert.equal(
    shareQuality({ resolution: 0, fps: 30, audio: true }, 1440).resolution,
    1440,
  );
  assert.equal(
    shareQuality({ resolution: 0, fps: 60, audio: true }, 4320).resolution,
    2160,
  );
  assert.equal(
    shareQuality({ resolution: 0, fps: 60, audio: true }).bitrate,
    8000,
  );
});

test("display constraints hint the surface and cap the size", () => {
  assert.deepEqual(
    displayVideo("window", { resolution: 480, fps: 15, audio: false }),
    {
      displaySurface: "window",
      frameRate: { ideal: 15, max: 15 },
      width: { max: 853 },
      height: { max: 480 },
    },
  );
  assert.equal(
    displayVideo("monitor", { resolution: 0, fps: 30, audio: true }).height,
    undefined,
  );
});

test("share choice is remembered and sanitized", () => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  } as Storage;
  assert.deepEqual(loadShareChoice(), {
    resolution: 720,
    fps: 30,
    audio: true,
  });
  saveShareChoice({ resolution: 1080, fps: 60, audio: false });
  assert.deepEqual(loadShareChoice(), {
    resolution: 1080,
    fps: 60,
    audio: false,
  });
  store.set("vio:share", '{"resolution":999,"fps":"x","audio":1}');
  assert.deepEqual(loadShareChoice(), {
    resolution: 720,
    fps: 30,
    audio: true,
  });
});
