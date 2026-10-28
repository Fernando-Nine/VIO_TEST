import test from "node:test";
import assert from "node:assert/strict";
import {
  nativeApi,
  selectProcess,
  selectVideo,
  windowsCapture,
} from "../src/client/desktop/capture";
import type { VideoSource } from "../src/client/desktop/video";

// The app's WebView2 is not available here: fake the media globals and the native side.
class Track extends EventTarget {
  stopped = false;
  enabled = true;
  constructor(readonly kind: "audio" | "video") {
    super();
  }
  stop() {
    this.stopped = true;
  }
}
class Stream {
  tracks: Track[];
  constructor(tracks: Track[] = []) {
    this.tracks = [...tracks];
  }
  getTracks = () => this.tracks;
  getVideoTracks = () => this.tracks.filter((t) => t.kind === "video");
  getAudioTracks = () => this.tracks.filter((t) => t.kind === "audio");
  addTrack = (track: Track) => void this.tracks.push(track);
}
class Context {
  state = "running";
  audioWorklet = { addModule: async () => {} };
  resume = async () => {};
  close = async () => {
    this.state = "closed";
  };
  createMediaStreamDestination = () => ({
    stream: new Stream([new Track("audio")]),
  });
}
class WorkletNode {
  port = { postMessage() {}, close() {} };
  onprocessorerror: unknown;
  connect() {}
  disconnect() {}
}
Object.assign(globalThis, {
  MediaStream: Stream,
  AudioContext: Context,
  AudioWorkletNode: WorkletNode,
});

function packet(state: number) {
  const buffer = new ArrayBuffer(48);
  const view = new DataView(buffer);
  [0x56494f41, 1, state, 0, 0, 2, 48000, 0].forEach((n, i) =>
    view.setUint32(i * 4, n, true),
  );
  return buffer;
}

/** Native side: one image per start, one sound per app at a time (like capture.rs). */
function fakeNative() {
  const videos = new Set<Track>();
  let peak = 0;
  const sounds = new Map<string, string>();
  let failAudio = false;
  let next = 0;
  nativeApi.startVideo = async (source, options) => {
    await new Promise((resolve) => setTimeout(resolve, 2));
    const track = new Track("video");
    videos.add(track);
    peak = Math.max(peak, videos.size);
    return {
      track: track as unknown as MediaStreamTrack,
      width: options.width,
      height: options.height,
      stats: () => ({ fps: 0, busyMs: 0, gpu: true }),
      stop: () => void videos.delete(track),
    };
  };
  nativeApi.invoke = (async (
    command: string,
    args?: Record<string, unknown>,
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 1));
    if (command === "desktop_start_audio") {
      const app = String(args?.sourceId);
      if (failAudio) throw new Error("O Windows não liberou este áudio.");
      if ([...sounds.values()].includes(app))
        throw new Error("O som deste aplicativo já está sendo transmitido.");
      const id = `capture-${++next}`;
      sounds.set(id, app);
      return id;
    }
    if (command === "desktop_read_audio")
      return packet(sounds.has(String(args?.captureId)) ? 1 : 2);
    if (command === "desktop_stop_audio") {
      sounds.delete(String(args?.captureId));
      return;
    }
    throw new Error(`comando inesperado ${command}`);
  }) as typeof nativeApi.invoke;
  return {
    videos,
    sounds,
    peak: () => peak,
    failAudio: (on: boolean) => (failAudio = on),
  };
}

const screen: VideoSource = {
  id: "screen",
  kind: "screen",
  title: "Tela inteira",
  width: 1920,
  height: 1080,
  primary: true,
  minimized: false,
};
const browser: VideoSource = { ...screen, id: "browser", kind: "window" };
const options = { width: 1280, height: 720, fps: 30 as const };

async function share(source: VideoSource, sound?: string) {
  selectProcess(sound ? { id: sound, title: "App", system: false } : undefined);
  selectVideo(source, options);
  return (await windowsCapture.screen(
    Boolean(sound),
    "screen",
  )) as unknown as Stream;
}

test("trocar tela → janela → tela, com e sem som, mantém uma só imagem e um só som", async () => {
  const native = fakeNative();
  for (const sound of [undefined, "firefox"]) {
    const first = await share(screen, sound);
    const second = await share(browser, sound);
    const third = await share(screen, sound);
    for (const stream of [first, second, third]) {
      assert.equal(stream.getVideoTracks().length, 1);
      assert.equal(stream.getAudioTracks().length, sound ? 1 : 0);
    }
    // The previous image runs until the new one is ready, then stops: never more than two.
    assert.equal(native.videos.size, 1);
    assert.ok(native.peak() <= 2);
    // The same application is captured again only after its previous capture was freed.
    assert.equal(native.sounds.size, sound ? 1 : 0);
    windowsCapture.stopScreen?.("screen");
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(native.videos.size, 0);
    assert.equal(native.sounds.size, 0);
  }
});

test("troca com som que falha não congela a transmissão anterior", async () => {
  const native = fakeNative();
  const before = await share(screen, "firefox");
  native.failAudio(true);
  await assert.rejects(share(browser, "spotify"), /não liberou/);
  // The new image was dropped; the old one still feeds viewers (without its sound).
  assert.equal(native.videos.size, 1);
  assert.equal(before.getVideoTracks()[0]?.stopped, false);
  let ended = false;
  before.getVideoTracks()[0]?.addEventListener("ended", () => (ended = true));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(ended, false);
  // A later swap still works.
  native.failAudio(false);
  await share(browser, "spotify");
  assert.equal(native.videos.size, 1);
  assert.equal(native.sounds.size, 1);
  windowsCapture.stopScreen?.("screen");
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(native.videos.size, 0);
});
