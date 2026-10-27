import { useEffect, useRef, useState, type RefObject } from "react";
import { Play, VideoOff } from "lucide-react";
import { shareVoiceActivity } from "../media/voice-activity";
import type { AudioOutput } from "../media/audio-output";
import type { ScreenPlayback } from "../media/screen-playback";
import { AudioBoost, type BoostState } from "./ScreenAudio";
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
// The native <audio> always stays mounted and playing (muted while boosted): the
// speaking indicator and Chromium's WebRTC renderer depend on it. Above 100% a
// Web Audio gain (#118) plays a second, amplified copy, only on this device.
export function RemoteVoice({
  stream,
  muted,
  volume,
  label,
  output,
  playback,
}: {
  stream?: MediaStream;
  muted: boolean;
  volume: number;
  label: string;
  output?: AudioOutput;
  playback?: ScreenPlayback;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [blocked, setBlocked] = useState(false);
  const [retry, setRetry] = useState(0);
  const [boost, setBoost] = useState<BoostState>({
    active: false,
    failed: false,
  });
  const wantsBoost = !muted && volume > 1 && !!output && !!playback?.supported;
  const boosted =
    wantsBoost && boost.stream === stream && boost.active && !blocked;
  const boostFailed = wantsBoost && boost.stream === stream && boost.failed;
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
    element.muted = muted || volume === 0 || boosted;
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
  }, [stream, muted, volume, boosted, retry]);
  useEffect(() => {
    if (ref.current && output?.supported) return output.register(ref.current);
  }, [output]);
  return (
    <>
      <audio ref={ref} aria-label={label} autoPlay />
      {wantsBoost && stream && output && playback && (
        <AudioBoost
          stream={stream}
          playback={playback}
          output={output}
          volume={volume}
          muted={muted || !boosted}
          label={`Voz amplificada de ${label}`}
          marker={{ "data-voice-audio": "boost" }}
          retry={retry}
          onState={setBoost}
        />
      )}
      {!muted && volume > 0 && ((blocked && !boosted) || boostFailed) && (
        <button
          className="audio-unlock"
          title={
            boostFailed && !blocked
              ? "A voz continua em até 100%. Clique para tentar ativar o ganho extra."
              : undefined
          }
          onClick={() => {
            if (wantsBoost) playback?.unlock();
            void ref.current?.play().then(
              () => setBlocked(false),
              () => setBlocked(true),
            );
            setRetry((value) => value + 1);
          }}
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
    return shareVoiceActivity(stream, setSpeaking, localLevel);
  }, [stream, muted, localLevel]);
  return speaking;
}
