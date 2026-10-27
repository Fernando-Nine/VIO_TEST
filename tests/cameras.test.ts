import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraGrid,
  nextFeatured,
  SPEAKER_HOLD_MS,
} from "../src/client/canvas/camera-layout";
import { cameraEncoding } from "../src/client/media/video-quality";

test("destaque só muda após 1,5 s de fala contínua de outra pessoa", () => {
  const cams = ["ana", "bia", "caio"];
  const since = new Map([["bia", 1000]]);
  assert.equal(
    nextFeatured("ana", cams, since, 1000 + SPEAKER_HOLD_MS - 1),
    "ana",
  );
  assert.equal(nextFeatured("ana", cams, since, 1000 + SPEAKER_HOLD_MS), "bia");
  // Whoever started first wins; the highlight stays when nobody speaks.
  since.set("caio", 500);
  assert.equal(nextFeatured("ana", cams, since, 5000), "caio");
  assert.equal(nextFeatured("bia", cams, new Map(), 5000), "bia");
  // The highlighted camera turned off: the first one takes over.
  assert.equal(nextFeatured("zé", cams, new Map(), 5000), "ana");
  assert.equal(nextFeatured("ana", [], new Map(), 5000), undefined);
});

test("lateral mostra 3 ao lado, foco 4 embaixo, Tira e fixada só uma", () => {
  const cams = ["a", "b", "c", "d", "e"];
  const column = cameraGrid(cams, "c", "column", false);
  assert.equal(column.places.get("c")?.role, "main");
  assert.deepEqual(
    cams.filter((id) => column.places.get(id)?.role === "side"),
    ["a", "b", "d"],
  );
  assert.equal(column.places.get("e")?.role, "hidden");
  const row = cameraGrid(cams, "a", "row", false);
  assert.equal(
    cams.filter((id) => row.places.get(id)?.role === "side").length,
    4,
  );
  assert.equal(
    cameraGrid(cams, "a", "row", false, true).places.get("e")?.role,
    "hidden",
  );
  for (const grid of [
    cameraGrid(cams, "b", "strip", false),
    cameraGrid(cams, "b", "column", true),
  ]) {
    assert.equal(grid.places.get("b")?.role, "main");
    assert.equal(
      cams.filter((id) => grid.places.get(id)?.role === "hidden").length,
      4,
    );
  }
});

test("câmera pequena é barata; só o destaque em foco recebe a principal", () => {
  const small = cameraEncoding({ video: "small", height: 120 }, 360);
  assert.equal(small.maxBitrate, 120000);
  assert.equal(small.scaleResolutionDownBy, 3);
  assert.equal(
    cameraEncoding({ video: "small", height: 720 }, 360).scaleResolutionDownBy,
    1.5,
  );
  assert.equal(
    cameraEncoding({ video: "focus", height: 720 }, 360).maxBitrate,
    450000,
  );
  assert.equal(cameraEncoding(undefined, 360).maxBitrate, 450000);
});
