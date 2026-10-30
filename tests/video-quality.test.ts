import test from "node:test";
import assert from "node:assert/strict";
import { screenResolutions, presets } from "../src/shared/protocol";
import {
  screenUploadBudget,
  splitBudget,
  videoEncoding,
} from "../src/client/media/video-quality";

test("240p a 2160p definem a altura enviada e preservam a proporção", () => {
  for (const resolution of screenResolutions) {
    const encoding = videoEncoding(
      { ...presets.Alta, resolution },
      "screen",
      "main",
      2160,
    );
    const scale = encoding.scaleResolutionDownBy!;
    assert.equal(2160 / scale, resolution);
    assert.ok(Math.abs(3840 / scale / resolution - 16 / 9) < 1e-10);
  }
});

test("fonte menor não é ampliada e mudança de tamanho recalcula a redução", () => {
  const quality = { ...presets.Média, resolution: 1080 };
  assert.equal(
    videoEncoding(quality, "screen", "main", 720).scaleResolutionDownBy,
    1,
  );
  assert.equal(
    videoEncoding(quality, "screen", "main", 2160).scaleResolutionDownBy,
    2,
  );
  assert.equal(
    videoEncoding(quality, "screen", "main").scaleResolutionDownBy,
    1,
  );
});

test("a escolha de 4K não aumenta bitrate, FPS ou escala da miniatura nem da câmera", () => {
  const quality = { fps: 60, bitrate: 8000, resolution: 2160 };
  assert.deepEqual(videoEncoding(quality, "screen", "preview", 180), {
    maxBitrate: 90000,
    maxFramerate: 5,
    scaleResolutionDownBy: 1,
  });
  assert.deepEqual(videoEncoding(quality, "camera", "main", 360), {
    maxBitrate: 450000,
    maxFramerate: 20,
    scaleResolutionDownBy: 1,
  });
});

test("teto de envio: Alta para 6 espectadores cabe no teto, dividido por igual (#23)", () => {
  const shares = splitBudget(Array(6).fill(4000));
  assert.ok(shares.reduce((a, b) => a + b, 0) <= screenUploadBudget);
  assert.deepEqual(new Set(shares), new Set([1333]));
  assert.deepEqual(splitBudget([4000, 4000]), [4000, 4000]);
});

test("teto de envio: quem pede pouco fica com o seu e sobra para os outros", () => {
  assert.deepEqual(
    splitBudget([450, 4000, 4000, 4000], 8000),
    [450, 2516, 2516, 2516],
  );
  assert.deepEqual(splitBudget(Array(40).fill(4000)).at(0), 300);
});
