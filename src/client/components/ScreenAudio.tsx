import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import type { Controller } from "../room/controller";
import type { AudioOutput } from "../media/audio-output";
import type { ScreenPlayback } from "../media/screen-playback";

export type BoostState = {
  stream?: MediaStream;
  active: boolean;
  failed: boolean;
};

/** Keep the original remote track playing, including while amplification is active.
 * Chromium's WebRTC renderer can otherwise feed silence into Web Audio. */
export function ScreenAudio({
  stream,
  engine,
  muted: mutedByUser,
  volume,
  name,
}: {
  stream?: MediaStream;
  engine: Controller;
  muted: boolean;
  volume: number;
  name: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const masterVolume = engine.masterVolume;
  const muted = mutedByUser || masterVolume === 0;
  const [blocked, setBlocked] = useState(false);
  const [retry, setRetry] = useState(0);
  const [boost, setBoost] = useState<BoostState>({
    active: false,
    failed: false,
  });
  const wantsBoost = volume > 1;
  const boosted =
    wantsBoost && boost.stream === stream && boost.active && !blocked;
  useEffect(() => {
    const element = audio.current;
    if (!element || !stream) return;
    let active = true;
    // Never replace this with a generated stream: normal audio needs no graph.
    const play = () => {
      if (!stream.getAudioTracks().some((track) => track.readyState === "live"))
        return;
      // Wait for audio before binding: an initially inactive stream can stay at
      // HAVE_NOTHING in Chromium even after a later track is added.
      if (
        element.srcObject !== stream ||
        element.readyState === 0 ||
        element.ended
      )
        element.srcObject = stream;
      void element.play().then(
        () => active && setBlocked(false),
        (error: unknown) => {
          if (
            active &&
            !(error instanceof DOMException && error.name === "AbortError")
          )
            setBlocked(true);
        },
      );
    };
    play();
    stream.addEventListener("addtrack", play);
    return () => {
      active = false;
      stream.removeEventListener("addtrack", play);
      element.pause();
      element.srcObject = null;
    };
  }, [stream]);
  useEffect(() => {
    if (audio.current && engine.output.supported)
      return engine.output.register(audio.current);
  }, [engine]);
  useEffect(() => {
    const element = audio.current;
    if (!element || !stream) return;
    let active = true;
    element.muted = muted || boosted;
    element.volume = Math.max(0, Math.min(1, volume)) * masterVolume;
    // Unmuting can require a new play attempt after an autoplay rejection.
    if (stream.getAudioTracks().some((track) => track.readyState === "live"))
      void element.play().then(
        () => active && setBlocked(false),
        (error: unknown) => {
          if (
            active &&
            !(error instanceof DOMException && error.name === "AbortError")
          )
            setBlocked(true);
        },
      );
    return () => {
      active = false;
    };
  }, [volume, masterVolume, muted, boosted, stream, retry]);
  const boostFailed = wantsBoost && boost.stream === stream && boost.failed;
  return (
    <>
      <audio
        ref={audio}
        aria-label={`Áudio da tela de ${name}`}
        data-screen-audio="native"
        autoPlay
        muted={muted || boosted}
      />
      {wantsBoost && stream && (
        <AudioBoost
          stream={stream}
          playback={engine.playback}
          output={engine.output}
          volume={volume * masterVolume}
          muted={muted || !boosted}
          label={`Áudio amplificado da tela de ${name}`}
          marker={{ "data-screen-audio": "boost" }}
          retry={retry}
          onState={setBoost}
        />
      )}
      {!muted && ((blocked && !boosted) || boostFailed) && (
        <button
          className="play-blocked"
          title={
            boostFailed
              ? "O áudio continua em até 100%. Clique para tentar ativar o ganho extra."
              : undefined
          }
          onClick={() => {
            if (wantsBoost) engine.playback.unlock();
            void audio.current?.play().then(
              () => setBlocked(false),
              () => setBlocked(true),
            );
            setRetry((value) => value + 1);
          }}
        >
          <Volume2 size={16} />
          {blocked && !boosted
            ? `Ativar áudio de ${name}`
            : "Ativar amplificação"}
        </button>
      )}
    </>
  );
}

/** Only mounted above 100% (screens and voices). If unavailable, the native
 * element remains audible. */
export function AudioBoost({
  stream,
  playback,
  output,
  volume,
  muted,
  label,
  marker,
  retry,
  onState,
}: {
  stream: MediaStream;
  playback: ScreenPlayback;
  output: AudioOutput;
  volume: number;
  muted: boolean;
  label: string;
  marker: Record<`data-${string}`, string>;
  retry: number;
  onState: (state: BoostState) => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const graph = useRef<ReturnType<ScreenPlayback["create"]>>(undefined);
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let active = true;
    const state = () => {
      if (!active) return;
      const ready =
        !!graph.current &&
        graph.current.context.state === "running" &&
        !element.paused;
      onState({ stream, active: ready, failed: !ready });
    };
    try {
      const processed = playback.create(stream);
      if (!processed) throw new Error("Amplification unavailable");
      graph.current = processed;
      element.srcObject = processed.stream;
      processed.context.addEventListener("statechange", state);
    } catch {
      onState({ stream, active: false, failed: true });
    }
    const play = () => {
      if (graph.current)
        void element.play().then(state, () => {
          if (active) onState({ stream, active: false, failed: true });
        });
    };
    play();
    stream.addEventListener("addtrack", play);
    element.addEventListener("pause", state);
    element.addEventListener("playing", state);
    return () => {
      active = false;
      stream.removeEventListener("addtrack", play);
      element.removeEventListener("pause", state);
      element.removeEventListener("playing", state);
      graph.current?.context.removeEventListener("statechange", state);
      element.pause();
      element.srcObject = null;
      graph.current?.close();
      graph.current = undefined;
      onState({ stream, active: false, failed: false });
    };
  }, [stream, playback, onState, retry]);
  useEffect(() => {
    if (audio.current && output.supported)
      return output.register(audio.current);
  }, [output]);
  useEffect(() => {
    graph.current?.setVolume(volume);
  }, [volume, stream, retry]);
  return (
    <audio ref={audio} autoPlay muted={muted} {...marker} aria-label={label} />
  );
}
