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
