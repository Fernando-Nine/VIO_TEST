import { useEffect, useRef, useState, type RefObject } from "react";
import { Play, VideoOff } from "lucide-react";
import { observeVoiceActivity } from "../media/voice-activity";
import type { AudioOutput } from "../media/audio-output";
export function Media({
  stream,
  muted = true,
  volume = 1,
  className = "",
  label,
  videoRef,
  output,
}: {
  stream?: MediaStream;
  muted?: boolean;
  volume?: number;
  className?: string;
  label: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
  output?: AudioOutput;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef || localRef;
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream || null;
    const play = () => {
      if (stream)
        void el
          .play()
          .then(() => setBlocked(false))
          .catch(() => setBlocked(true));
    };
    play();
    stream?.addEventListener("addtrack", play);
    return () => {
      stream?.removeEventListener("addtrack", play);
      el.pause();
      el.srcObject = null;
    };
  }, [stream, ref]);
  useEffect(() => {
    if (ref.current && output?.supported) return output.register(ref.current);
  }, [output, ref]);
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
  output,
}: {
  stream?: MediaStream;
  muted: boolean;
  volume: number;
  label: string;
  output?: AudioOutput;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let active = true;
    const play = () => {
      if (
        !stream?.getAudioTracks().some((track) => track.readyState === "live")
      )
        return;
      if (el.srcObject !== stream || el.readyState === 0 || el.ended)
        el.srcObject = stream;
      void el.play().then(
        () => active && setBlocked(false),
        () => active && setBlocked(true),
      );
    };
    play();
    stream?.addEventListener("addtrack", play);
    return () => {
      active = false;
      stream?.removeEventListener("addtrack", play);
      el.pause();
      el.srcObject = null;
    };
  }, [stream]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.muted = muted || volume === 0;
    element.volume = Math.min(1, Math.max(0, volume));
    let active = true;
    if (stream?.getAudioTracks().some((track) => track.readyState === "live"))
      void element.play().then(
        () => active && setBlocked(false),
        () => active && setBlocked(true),
      );
    return () => {
      active = false;
    };
  }, [stream, muted, volume]);
  useEffect(() => {
    if (ref.current && output?.supported) return output.register(ref.current);
  }, [output]);
  return (
    <>
      <audio ref={ref} aria-label={label} autoPlay />
      {blocked && !muted && volume > 0 && (
        <button
          className="audio-unlock"
          onClick={() =>
            void ref.current?.play().then(
              () => setBlocked(false),
              () => setBlocked(true),
            )
          }
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
    setSpeaking(false);
    if (muted || (!stream && !localLevel)) {
      return;
    }
    return observeVoiceActivity(stream, setSpeaking, localLevel);
  }, [stream, muted, localLevel]);
  return speaking;
}
