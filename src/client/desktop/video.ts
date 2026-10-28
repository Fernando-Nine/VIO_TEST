import { nativeInvoke } from "./bridge";

/** A screen or window listed by the app itself (#192), not by the WebView2 picker. */
export interface VideoSource {
  /** Opaque and valid for one listing; the page never sees a handle or PID. */
  id: string;
  kind: "screen" | "window";
  title: string;
  width: number;
  height: number;
  primary: boolean;
  /** Minimized windows have no thumbnail until restored. */
  minimized: boolean;
}

const THUMB_MAX = { width: 320, height: 180 };

/** `VIOT` v1 header + RGBA pixels, at most 320×180. */
export function decodeThumbnail(buffer: ArrayBuffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 16)
    throw new Error("A miniatura do Windows veio incompleta.");
  const view = new DataView(buffer);
  const width = view.getUint32(8, true);
  const height = view.getUint32(12, true);
  if (
    view.getUint32(0, true) !== 0x56494f54 ||
    view.getUint32(4, true) !== 1 ||
    width < 1 ||
    height < 1 ||
    width > THUMB_MAX.width ||
    height > THUMB_MAX.height ||
    buffer.byteLength !== 16 + width * height * 4
  )
    throw new Error("O formato da miniatura do Windows não é compatível.");
  return {
    width,
    height,
    rgba: new Uint8ClampedArray(buffer, 16, width * height * 4),
  };
}

export function listVideoSources() {
  return nativeInvoke<VideoSource[]>("desktop_video_sources");
}

/**
 * Object URL of one native frame of the source; the caller revokes it.
 * Resolves undefined for minimized windows.
 */
export async function videoThumbnail(source: VideoSource) {
  if (source.minimized) return undefined;
  const { width, height, rgba } = decodeThumbnail(
    await nativeInvoke<ArrayBuffer>("desktop_video_thumbnail", {
      sourceId: source.id,
    }),
  );
  const canvas = new OffscreenCanvas(width, height);
  canvas
    .getContext("2d")
    ?.putImageData(new ImageData(rgba, width, height), 0, 0);
  // JPEG encodes several times faster than PNG for a 320×180 preview (#247).
  return URL.createObjectURL(
    await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 }),
  );
}
