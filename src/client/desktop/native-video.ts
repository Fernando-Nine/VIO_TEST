import { nativeInvoke } from "./bridge";
import type { VideoSource } from "./video";

/**
 * Native screen video (#192): the app writes NV12 frames into a WebView2 SharedBuffer
 * and this module feeds them to a MediaStreamTrackGenerator. Layout in `wire.rs`.
 */
const HEADER = 64;
const SLOT_HEADER = 16;
const SLOTS = 3;

interface SharedBufferEvent extends Event {
  additionalData?: unknown;
  getBuffer(): ArrayBuffer;
}
interface WebView {
  addEventListener(
    type: "sharedbufferreceived",
    listener: (event: SharedBufferEvent) => void,
  ): void;
  releaseBuffer(buffer: ArrayBuffer): void;
}
declare class MediaStreamTrackGenerator extends MediaStreamTrack {
  constructor(init: { kind: "video" | "audio" });
  readonly writable: WritableStream<VideoFrame>;
}

function webview() {
  return (window as Window & { chrome?: { webview?: WebView } }).chrome
    ?.webview;
}

export function nv12Size(width: number, height: number) {
  return width * height + (width * height) / 2;
}
export function slotSize(width: number, height: number) {
  return Math.ceil((SLOT_HEADER + nv12Size(width, height)) / 64) * 64;
}

/** Checks the header the app wrote against the size it reported. */
export function checkVideoBuffer(
  buffer: ArrayBuffer,
  width: number,
  height: number,
) {
  const view = new DataView(buffer);
  const size = slotSize(width, height);
  if (
    buffer.byteLength < HEADER + SLOTS * size ||
    view.getUint32(0, true) !== 0x56494f56 ||
    view.getUint32(4, true) !== 1 ||
    view.getUint32(8, true) !== width ||
    view.getUint32(12, true) !== height ||
    view.getUint32(16, true) !== SLOTS ||
    view.getUint32(20, true) !== size
  )
    throw new Error("O formato da imagem do Windows não é compatível.");
  return size;
}

/**
 * Reads one slot only if no write overlapped it (seqlock): both marks must match the
 * sequence before and after the copy. Returns the NV12 view and its timestamp.
 */
export function readSlot(
  buffer: ArrayBuffer,
  size: number,
  slot: number,
  sequence: number,
  width: number,
  height: number,
  copy: (data: Uint8Array, timestamp: number) => void,
) {
  const base = HEADER + slot * size;
  const marks = new DataView(buffer, base, SLOT_HEADER);
  const intact = () =>
    marks.getUint32(0, true) === sequence &&
    marks.getUint32(4, true) === sequence;
  if (!intact()) return false;
  const timestamp = Number(marks.getBigUint64(8, true));
  copy(
    new Uint8Array(buffer, base + SLOT_HEADER, nv12Size(width, height)),
    timestamp,
  );
  return intact();
}

const received = new Map<string, ArrayBuffer>();
const waiting = new Map<string, (buffer: ArrayBuffer) => void>();
let listening = false;
function listen(view: WebView) {
  if (listening) return;
  listening = true;
  view.addEventListener("sharedbufferreceived", (event) => {
    const data = event.additionalData as
      | { vio?: unknown; captureId?: unknown }
      | undefined;
    if (data?.vio !== "video" || typeof data.captureId !== "string") return;
    const id = data.captureId;
    const buffer = event.getBuffer();
    const resolve = waiting.get(id);
    if (resolve) {
      waiting.delete(id);
      resolve(buffer);
      return;
    }
    // The buffer may arrive before the start reply, or for a start that then failed.
    received.set(id, buffer);
    setTimeout(() => {
      if (received.get(id) !== buffer) return;
      received.delete(id);
      view.releaseBuffer(buffer);
    }, 10000);
  });
}
function bufferFor(id: string) {
  const ready = received.get(id);
  if (ready) {
    received.delete(id);
    return Promise.resolve(ready);
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const timer = setTimeout(() => {
      waiting.delete(id);
      reject(new Error("O aplicativo não entregou a imagem a tempo."));
    }, 5000);
    waiting.set(id, (buffer) => {
      clearTimeout(timer);
      resolve(buffer);
    });
  });
}

interface Tick {
  sequence: number;
  slot: number;
  state: number;
  fps: number;
  busyMs: number;
  gpu: boolean;
}
export interface NativeVideoOptions {
  /** Output box; the app keeps the source aspect and never upscales. */
  width: number;
  height: number;
  fps: 15 | 30 | 60;
  cursor?: boolean;
}
export interface NativeVideo {
  track: MediaStreamTrack;
  width: number;
  height: number;
  /** Frames written by the app and its capture→page time per frame, last second;
   * `gpu` is false when NV12 is made on the CPU (no video processor). */
  stats(): { fps: number; busyMs: number; gpu: boolean };
  stop(): void;
}

/**
 * A generator track is not a screencast to Chrome: without a hint the encoder treats
 * it as a camera and its quality scaler shrinks a 1080p screen to 480×270 within
 * seconds (#267). "detail" keeps the resolution and drops frame rate instead, as
 * getDisplayMedia does.
 */
export function asScreenContent<T extends { contentHint: string }>(
  track: T,
): T {
  track.contentHint = "detail";
  return track;
}

export async function startNativeVideo(
  source: VideoSource,
  options: NativeVideoOptions,
): Promise<NativeVideo> {
  const view = webview();
  if (!view || typeof MediaStreamTrackGenerator !== "function")
    throw new Error(
      "Esta versão do WebView2 não permite a captura nativa. Atualize o Windows.",
    );
  listen(view);
  const started = await nativeInvoke<{
    captureId: string;
    width: number;
    height: number;
  }>("desktop_video_start", {
    sourceId: source.id,
    width: options.width,
    height: options.height,
    fps: options.fps,
    cursor: options.cursor ?? true,
  });
  const { captureId, width, height } = started;
  let buffer: ArrayBuffer | undefined;
  let stopped = false;
  let stats = { fps: 0, busyMs: 0, gpu: true };
  let maxFps: number = options.fps;
  const generator = asScreenContent(
    new MediaStreamTrackGenerator({ kind: "video" }),
  );
  const writer = generator.writable.getWriter();
  const stop = () => {
    if (stopped) return;
    stopped = true;
    generator.stop();
    void writer.close().catch(() => {});
    void nativeInvoke("desktop_video_stop", { captureId }).catch(() => {});
    if (buffer) view.releaseBuffer(buffer);
  };
  const end = () => {
    if (stopped) return;
    stop();
    // track.stop() deliberately does not emit ended; notify Captures explicitly.
    generator.dispatchEvent(new Event("ended"));
  };
  try {
    buffer = await bufferFor(captureId);
    const size = checkVideoBuffer(buffer, width, height);
    // A generator track reports no settings; peers size the encoding from them, and
    // the quality menu caps the frame rate through applyConstraints.
    Object.defineProperties(generator, {
      getSettings: {
        value: (): MediaTrackSettings => ({
          width,
          height,
          frameRate: maxFps,
          displaySurface: source.kind === "screen" ? "monitor" : "window",
        }),
      },
      applyConstraints: {
        value: async (constraints?: MediaTrackConstraints) => {
          const rate = constraints?.frameRate;
          const value = typeof rate === "number" ? rate : rate?.max;
          if (typeof value === "number" && value > 0)
            maxFps = Math.min(options.fps, value);
        },
      },
    });
    const shared = buffer;
    void (async () => {
      let after = 0;
      let last = -Infinity;
      while (!stopped) {
        const tick = await nativeInvoke<Tick>("desktop_video_wait", {
          captureId,
          after,
        });
        if (stopped) return;
        if (tick.state >= 2) return end();
        stats = { fps: tick.fps, busyMs: tick.busyMs, gpu: tick.gpu };
        if (tick.sequence === after) continue;
        after = tick.sequence;
        if ((writer.desiredSize ?? 1) <= 0) continue;
        let frame: VideoFrame | undefined;
        const intact = readSlot(
          shared,
          size,
          tick.slot,
          tick.sequence,
          width,
          height,
          (data, timestamp) => {
            // Page-side cap below the native rate (quality menu), with 2 ms slack.
            if (timestamp - last < 1e6 / maxFps - 2000) return;
            frame = new VideoFrame(data, {
              format: "NV12",
              codedWidth: width,
              codedHeight: height,
              timestamp,
              colorSpace: {
                primaries: "bt709",
                transfer: "bt709",
                matrix: "bt709",
                fullRange: false,
              },
            });
          },
        );
        const ready = frame as VideoFrame | undefined;
        if (!ready) continue;
        if (!intact) {
          ready.close();
          continue;
        }
        last = ready.timestamp;
        void writer.write(ready).catch(end);
      }
    })().catch(end);
  } catch (error) {
    stop();
    throw error;
  }
  return {
    track: generator,
    width,
    height,
    stats: () => stats,
    stop,
  };
}
