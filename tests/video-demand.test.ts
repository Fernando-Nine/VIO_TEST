import test from "node:test";
import assert from "node:assert/strict";
import { Peers } from "../src/client/media/peers";
import type { Captures } from "../src/client/media/capture";
import type { VideoDemand } from "../src/shared/protocol";

test("demanda pausa apenas o sender de vídeo e restaura a mesma faixa após fallback", async () => {
  const video = {
    kind: "video",
    enabled: true,
    getSettings: () => ({ height: 2160 }),
  } as MediaStreamTrack;
  const captures = {
    quality: { resolution: 1080, fps: 30, bitrate: 4000 },
    sources: new Map([
      ["screen", { stream: { getVideoTracks: () => [video] } }],
    ]),
  } as unknown as Captures;
  const peers = new Peers(
    () => "owner",
    captures,
    () => {},
    () => {},
    () => true,
    async () => ({ iceServers: [], expiresAt: Infinity, turn: false }),
  );
  let reject = false;
  let current: MediaStreamTrack | null = video;
  let parameters: RTCRtpSendParameters | undefined;
  const replacements: (MediaStreamTrack | null)[] = [];
  const sender = {
    get track() {
      return current;
    },
    getParameters: () => ({ encodings: [{}] }),
    setParameters: async (p: RTCRtpSendParameters) => {
      if (reject) throw Error("unsupported");
      parameters = p;
    },
    replaceTrack: async (track: MediaStreamTrack | null) => {
      current = track;
      replacements.push(track);
    },
  } as unknown as RTCRtpSender;
  const peer = {
    videoSender: sender,
    sub: {
      publication: { kind: "screen" },
      tier: "main",
      demand: { video: "off", height: 240 } as VideoDemand,
    },
    info: {},
    pc: {
      getSenders: () => {
        throw Error("must not touch audio sender");
      },
    },
  } as unknown as Parameters<Peers["parameters"]>[0];
  try {
    await peers.parameters(peer);
    assert.equal(parameters!.encodings[0].active, false);
    assert.equal(replacements.length, 0);
    assert.equal(video.enabled, true);
    reject = true;
    await peers.parameters(peer);
    assert.equal(current, null);
    assert.equal(video.enabled, true);
    reject = false;
    peer.sub.demand = { video: "small", height: 240 };
    await peers.parameters(peer);
    assert.equal(current, video);
    assert.equal(parameters!.encodings[0].active, true);
    assert.equal(parameters!.encodings[0].maxBitrate, 450000);
    assert.equal(parameters!.encodings[0].maxFramerate, 12);
    assert.equal(parameters!.encodings[0].scaleResolutionDownBy, 9);
    peer.sub.demand = { video: "focus", height: 2160 };
    await peers.parameters(peer);
    assert.equal(parameters!.encodings[0].maxBitrate, 4000000);
    assert.equal(parameters!.encodings[0].scaleResolutionDownBy, 2);
    assert.deepEqual(replacements, [null, video]);
  } finally {
    peers.destroy();
  }
});
