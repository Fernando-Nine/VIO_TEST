import type { Quality } from "../../shared/protocol";

/** 0 = the source's own resolution ("Fonte"). */
export const shareResolutions = [480, 720, 1080, 0] as const;
export const shareRates = [15, 30, 60] as const;
export type ShareResolution = (typeof shareResolutions)[number];
export type ShareRate = (typeof shareRates)[number];
export type ShareSurface = "monitor" | "window" | "browser";

export interface ShareChoice {
  resolution: ShareResolution;
  fps: ShareRate;
  audio: boolean;
}

const KEY = "vio:share";
const fallback: ShareChoice = { resolution: 720, fps: 30, audio: true };

/** Personal choices (#191): remembered per browser/app, never sent to the room. */
export function loadShareChoice(): ShareChoice {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<
      Record<keyof ShareChoice, unknown>
    >;
    return {
      resolution: shareResolutions.includes(saved.resolution as never)
        ? (saved.resolution as ShareResolution)
        : fallback.resolution,
      fps: shareRates.includes(saved.fps as never)
        ? (saved.fps as ShareRate)
        : fallback.fps,
      audio: typeof saved.audio === "boolean" ? saved.audio : fallback.audio,
    };
  } catch {
    return { ...fallback };
  }
}

export function saveShareChoice(choice: ShareChoice) {
  try {
    localStorage.setItem(KEY, JSON.stringify(choice));
  } catch {
    // Private mode: the choice just isn't remembered.
  }
}

const baseBitrate: Record<ShareResolution, number> = {
  480: 700,
  720: 1800,
  1080: 4000,
  0: 6000,
};
const rateFactor: Record<ShareRate, number> = { 15: 0.75, 30: 1, 60: 1.5 };

/** "Fonte" sends up to the source height (capped at 2160p); nothing is enlarged. */
export function shareQuality(
  { resolution, fps }: ShareChoice,
  sourceHeight?: number,
): Quality {
  const height =
    resolution ||
    Math.min(
      2160,
      sourceHeight && sourceHeight > 0 ? Math.round(sourceHeight) : 2160,
    );
  return {
    resolution: height,
    fps,
    bitrate: Math.min(
      8000,
      Math.round((baseBitrate[resolution] * rateFactor[fps]) / 50) * 50,
    ),
  };
}

/** `getDisplayMedia` video constraints: picker hint plus the chosen ceiling. */
export function displayVideo(
  surface: ShareSurface,
  { resolution, fps }: ShareChoice,
): MediaTrackConstraints {
  return {
    displaySurface: surface,
    frameRate: { ideal: fps, max: fps },
    ...(resolution
      ? {
          width: { max: Math.round((resolution * 16) / 9) },
          height: { max: resolution },
        }
      : {}),
  };
}

/** Only Chromium captures sound (and offers tabs) in `getDisplayMedia`. */
export function chromium() {
  const data = (
    navigator as Navigator & {
      userAgentData?: { brands?: { brand: string }[] };
    }
  ).userAgentData;
  if (data?.brands)
    return data.brands.some(({ brand }) =>
      /Chromium|Google Chrome/.test(brand),
    );
  return (
    /Chrome\//.test(navigator.userAgent) &&
    !/Firefox\//.test(navigator.userAgent)
  );
}
