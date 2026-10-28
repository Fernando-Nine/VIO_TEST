import type { Quality } from "../../shared/protocol";
import type { Slot } from "../media/capture";
import type { Controller } from "../room/controller";
import { nativeInvoke, type DesktopSource } from "./bridge";
import { selectProcess, selectVideo } from "./capture";

/**
 * Native share API for the app's own picker (#191/#192): list sources with
 * `listVideoSources` + `videoThumbnail` (./video), then call `startNativeShare`.
 */
export { listVideoSources, videoThumbnail, type VideoSource } from "./video";
import type { VideoSource } from "./video";

/** `app` is the chosen window's application; `system` is the whole PC without VIO. */
export type ShareAudio = "none" | "app" | "system";
export interface NativeShareRequest {
  source: VideoSource;
  /** Same presets as the web build; resolution and fps also size the capture. */
  quality: Quality;
  audio: ShareAudio;
  /** Swap the source of the current share instead of starting a new one (#160). */
  replace?: boolean;
  /** Which screen (#194): `engine.captures.nextScreen()` adds one; default the first. */
  slot?: Slot;
}

/** Native rate at or above the requested one; the track caps the rest. */
export function captureRate(fps: number): 15 | 30 | 60 {
  return fps <= 15 ? 15 : fps <= 30 ? 30 : 60;
}

export async function startNativeShare(
  engine: Controller,
  {
    source,
    quality,
    audio,
    replace = false,
    slot = "screen",
  }: NativeShareRequest,
) {
  if (audio === "app" && source.kind !== "window")
    throw new Error("Escolha uma janela para transmitir o som dela.");
  const sound =
    audio === "none"
      ? undefined
      : await nativeInvoke<DesktopSource>("desktop_share_audio", {
          sourceId: source.id,
          system: audio === "system",
        });
  selectProcess(sound);
  selectVideo(source, {
    width: Math.round((quality.resolution * 16) / 9),
    height: quality.resolution,
    fps: captureRate(quality.fps),
  });
  await engine.startScreen(Boolean(sound), replace, slot);
  await engine.quality(quality, slot);
}
