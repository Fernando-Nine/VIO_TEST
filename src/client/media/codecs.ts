// Sender codec order (#247). Chromium offers VP8 first, encoded in software, and the
// P2P mesh encodes once per viewer. When this device encodes H.264 in hardware, H.264
// goes first: far less CPU per viewer, and the viewers decode it in hardware too.
// Every other codec stays in the list, so a peer without H.264 still negotiates.

type Codec = { mimeType: string; sdpFmtpLine?: string };

/** H.264 that WebRTC can packetize without interleaving, constrained baseline first. */
function rank(codec: Codec) {
  if (codec.mimeType.toLowerCase() !== "video/h264") return 3;
  const fmtp = codec.sdpFmtpLine ?? "";
  if (!/packetization-mode=1/.test(fmtp)) return 2;
  return /profile-level-id=42e0/i.test(fmtp) ? 0 : 1;
}

/** H.264 ahead of the rest, original order kept inside each group. */
export function preferH264<T extends Codec>(codecs: readonly T[]): T[] {
  return codecs
    .map((codec, index) => ({ codec, index, rank: rank(codec) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ codec }) => codec);
}

let probe: Promise<RTCRtpCodec[] | null> | undefined;

/**
 * The order to set on video senders, or null to keep the browser default (no
 * hardware H.264, or an engine that cannot tell). Asked once per page.
 */
export function videoCodecs(): Promise<RTCRtpCodec[] | null> {
  probe ??= (async () => {
    try {
      const codecs = RTCRtpSender.getCapabilities?.("video")?.codecs;
      if (!codecs?.some((c) => rank(c) < 3)) return null;
      const info = await navigator.mediaCapabilities.encodingInfo({
        type: "webrtc",
        video: {
          contentType: "video/H264",
          width: 1920,
          height: 1080,
          bitrate: 4_000_000,
          framerate: 60,
        },
      });
      return info.supported && info.powerEfficient ? preferH264(codecs) : null;
    } catch {
      return null;
    }
  })();
  return probe;
}

/** Applies the order to the transceiver behind `sender`; harmless if refused. */
export async function preferVideoCodecs(
  pc: RTCPeerConnection,
  sender: RTCRtpSender,
) {
  const codecs = await videoCodecs();
  if (!codecs) return;
  const transceiver = pc.getTransceivers().find((t) => t.sender === sender);
  try {
    transceiver?.setCodecPreferences(codecs);
  } catch {
    // An engine that rejects the list keeps its own order.
  }
}
