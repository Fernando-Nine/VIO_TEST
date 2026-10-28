import type { Quality } from "../../shared/protocol";
import type { Slot } from "../media/capture";
import type { Controller } from "../room/controller";
import { nativeInvoke, type DesktopSource } from "./bridge";
import { selectProcess, selectSoundOnly, selectVideo } from "./capture";

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

/** Sounds that can go without an image (#229): the whole PC first, then applications. */
export const listSoundSources = () =>
  nativeInvoke<DesktopSource[]>("desktop_sources");

/**
 * Shares only the sound of a listed application (e.g. music while a game is the
 * screen). It takes a screen slot like any share; the app streams up to three sounds,
 * never the same one twice, never the whole PC next to another, never VIO itself.
 */
export async function startNativeSound(
  engine: Controller,
  { sound, slot }: { sound: DesktopSource; slot: Slot },
) {
  selectProcess(sound);
  selectSoundOnly(true);
  try {
    await engine.startScreen(true, false, slot);
  } finally {
    // An early return must not turn the next screen share into sound only.
    selectSoundOnly(false);
  }
}
