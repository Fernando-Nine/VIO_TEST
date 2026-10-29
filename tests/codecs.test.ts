import test from "node:test";
import assert from "node:assert/strict";
import { preferH264 } from "../src/client/media/codecs";

test("hardware H.264 goes first, every other codec stays in order", () => {
  const vp8 = { mimeType: "video/VP8" };
  const rtx = { mimeType: "video/rtx" };
  const high = {
    mimeType: "video/H264",
    sdpFmtpLine:
      "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640c1f",
  };
  const baseline = {
    mimeType: "video/H264",
    sdpFmtpLine:
      "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f",
  };
  const single = {
    mimeType: "video/H264",
    sdpFmtpLine: "packetization-mode=0;profile-level-id=42e01f",
  };
  const vp9 = { mimeType: "video/VP9" };
  assert.deepEqual(preferH264([vp8, rtx, single, high, vp9, baseline]), [
    baseline,
    high,
    single,
    vp8,
    rtx,
    vp9,
  ]);
  assert.deepEqual(preferH264([vp8, vp9]), [vp8, vp9]);
});
