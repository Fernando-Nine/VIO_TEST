import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import type { Controller } from "../room/controller";

export function ScreenAudio({
  stream,
  engine,
  muted,
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
  const graph = useRef<ReturnType<typeof engine.playback.create>>(undefined);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const element = audio.current;
    if (!element || !stream) return;
    const processed = engine.playback.create(stream);
    graph.current = processed;
    element.srcObject = processed?.stream || stream;
    const play = () =>
      void element
        .play()
        .then(() => setBlocked(processed?.context.state === "suspended"))
        .catch(() => setBlocked(true));
    play();
    stream.addEventListener("addtrack", play);
    return () => {
      stream.removeEventListener("addtrack", play);
      element.pause();
      element.srcObject = null;
      processed?.close();
      graph.current = undefined;
    };
  }, [stream, engine]);
  useEffect(() => {
    if (audio.current && engine.output.supported)
      return engine.output.register(audio.current);
  }, [engine]);
  useEffect(() => {
    if (!audio.current) return;
    audio.current.muted = muted;
    audio.current.volume = graph.current ? 1 : Math.min(1, volume);
    graph.current?.setVolume(volume);
  }, [volume, muted, stream]);
  return (
    <>
      <audio
        ref={audio}
        aria-label={`Áudio da tela de ${name}`}
        autoPlay
        muted={muted}
      />
      {blocked && !muted && (
        <button
          className="play-blocked"
          onClick={() => {
            engine.playback.unlock();
            void audio.current
              ?.play()
              .then(() => setBlocked(false))
              .catch(() => setBlocked(true));
          }}
        >
          <Volume2 size={16} /> Ativar áudio de {name}
        </button>
      )}
    </>
  );
}
