import { useEffect, useRef, useState, type RefObject } from "react";
import { Play, VideoOff } from "lucide-react";
export function Media({
  stream,
  muted = true,
  volume = 1,
  className = "",
  label,
  videoRef,
}: {
  stream?: MediaStream;
  muted?: boolean;
  volume?: number;
  className?: string;
  label: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef || localRef;
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream || null;
    if (stream)
      void el
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    return () => {
      el.pause();
      el.srcObject = null;
    };
  }, [stream, ref]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = muted;
    el.volume = Math.min(1, Math.max(0, volume));
    if (stream) void el.play().catch(() => setBlocked(true));
  }, [muted, volume, stream, ref]);
  return (
    <>
      <video
        ref={ref}
        aria-label={label}
        className={className}
        autoPlay
        playsInline
        muted={muted}
      />
      {blocked && className === "main-video" && (
        <button
          className="play-blocked"
          onClick={() =>
            void ref.current
              ?.play()
              .then(() => setBlocked(false))
              .catch(() => setBlocked(true))
          }
        >
          <Play size={18} /> Reproduzir {muted ? "vídeo" : "com áudio"}
        </button>
      )}
    </>
  );
}
export function RemoteVoice({
  stream,
  muted,
  volume,
  label,
}: {
  stream?: MediaStream;
  muted: boolean;
  volume: number;
  label: string;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream || null;
    el.muted = muted;
    el.volume = volume;
    if (stream)
      void el
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    return () => {
      el.pause();
      el.srcObject = null;
    };
  }, [stream, muted, volume]);
  return (
    <>
      <audio ref={ref} aria-label={label} autoPlay />
      {blocked && !muted && (
        <button
          className="audio-unlock"
          onClick={() => void ref.current?.play().then(() => setBlocked(false))}
        >
          <Play size={16} /> Ouvir {label}
        </button>
      )}
    </>
  );
}
export function useSpeaking(
  stream: MediaStream | undefined,
  muted: boolean,
  localLevel?: () => number,
) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    if (muted || (!stream && !localLevel)) {
      setSpeaking(false);
      return;
    }
    let context: AudioContext | undefined,
      source: MediaStreamAudioSourceNode | undefined,
      analyser: AnalyserNode | undefined,
      hold = 0;
    const buffer = new Float32Array(256);
    if (stream?.getAudioTracks().length && !localLevel) {
      context = new AudioContext();
      source = context.createMediaStreamSource(stream);
      analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      void context.resume();
    }
    const resume = () => void context?.resume();
    window.addEventListener("pointerdown", resume);
    const timer = setInterval(() => {
      let level = localLevel?.() || 0;
      if (analyser) {
        analyser.getFloatTimeDomainData(buffer);
        level =
          Math.sqrt(buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length) *
          8;
      }
      if (level > 0.025) hold = Date.now() + 200;
      setSpeaking(Date.now() < hold);
    }, 100);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", resume);
      source?.disconnect();
      analyser?.disconnect();
      void context?.close();
    };
  }, [stream, muted, localLevel]);
  return speaking;
}
