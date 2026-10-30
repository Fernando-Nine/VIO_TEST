import type { Quality, VideoDemand } from "../../shared/protocol";

/** Target height, preserving aspect ratio and never enlarging the source. */
export function screenScale(height: number | undefined, resolution: number) {
  return height && Number.isFinite(height) && resolution > 0
    ? Math.max(1, height / resolution)
    : 1;
}

/**
 * Camera encoding per viewer (#162): a small tile gets a cheap stream, only the
 * focused highlight gets the full one. No demand yet = full, as before.
 */
export function cameraEncoding(
  demand: VideoDemand | undefined,
  height?: number,
): RTCRtpEncodingParameters {
  if (demand?.video === "small")
    return {
      maxBitrate: 120000,
      maxFramerate: 12,
      scaleResolutionDownBy: screenScale(height, Math.min(demand.height, 240)),
    };
  if (demand?.video === "fit")
    return {
      maxBitrate: 300000,
      maxFramerate: 20,
      scaleResolutionDownBy: screenScale(height, demand.height),
    };
  return { maxBitrate: 450000, maxFramerate: 20, scaleResolutionDownBy: 1 };
}

export function videoEncoding(
  quality: Quality,
  kind: string,
  tier: string,
  height?: number,
  demand?: VideoDemand,
): RTCRtpEncodingParameters {
  if (tier === "preview")
    return { maxBitrate: 90000, maxFramerate: 5, scaleResolutionDownBy: 1 };
  if (kind !== "screen") return cameraEncoding(demand, height);
  return {
    maxBitrate: quality.bitrate * 1000,
    maxFramerate: quality.fps,
    scaleResolutionDownBy: screenScale(height, quality.resolution),
  };
}

/**
 * Upload cap for every screen this person sends, in kbps (#23). Each viewer gets its
 * own encoding (P2P), so Alta to six viewers would ask ~24 Mbps of a home upload.
 */
export const screenUploadBudget = 8000;
/** No viewer is pushed below this, even when the cap is crowded. */
const minimumShare = 300;

/**
 * Splits `budget` among viewers wanting `wanted` kbps each: whoever wants less than
 * an equal share keeps it, and the rest is shared again among the others.
 */
export function splitBudget(wanted: number[], budget = screenUploadBudget) {
  const shares = wanted.map(() => 0);
  let left = budget;
  let open = wanted.map((_, i) => i);
  while (open.length) {
    const equal = left / open.length;
    const small = open.filter((i) => wanted[i] <= equal);
    if (!small.length) {
      for (const i of open)
        shares[i] = Math.max(minimumShare, Math.floor(equal));
      break;
    }
    for (const i of small) {
      shares[i] = wanted[i];
      left -= wanted[i];
    }
    open = open.filter((i) => wanted[i] > equal);
  }
  return shares;
}
