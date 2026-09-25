import type { Quality } from "../../shared/protocol";

/** Target height, preserving aspect ratio and never enlarging the source. */
export function screenScale(height: number | undefined, resolution: number) {
  return height && Number.isFinite(height) && resolution > 0
    ? Math.max(1, height / resolution)
    : 1;
}

export function videoEncoding(
  quality: Quality,
  kind: string,
  tier: string,
  height?: number,
): RTCRtpEncodingParameters {
  if (tier === "preview")
    return { maxBitrate: 90000, maxFramerate: 5, scaleResolutionDownBy: 1 };
  if (kind !== "screen")
    return { maxBitrate: 450000, maxFramerate: 20, scaleResolutionDownBy: 1 };
  return {
    maxBitrate: quality.bitrate * 1000,
    maxFramerate: quality.fps,
    scaleResolutionDownBy: screenScale(height, quality.resolution),
  };
}
