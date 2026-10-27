/** Tracks can arrive after the MediaStream object is first rendered. */
export function observeVoiceActivity(
  stream: MediaStream | undefined,
  changed: (speaking: boolean) => void,
  localLevel?: () => number,
) {
  let context: AudioContext | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let analyser: AnalyserNode | undefined;
  let silence: GainNode | undefined;
  let track: MediaStreamTrack | undefined;
  let hold = 0;
  let previous = false;
  const buffer = new Float32Array(256);
  const report = (value: boolean) => {
    if (value !== previous) {
      previous = value;
      changed(value);
    }
  };
  const resume = () => {
    void context?.resume().catch(() => {});
  };
  const attach = () => {
    if (localLevel) return;
    const next = stream?.getAudioTracks().find((t) => t.readyState === "live");
    if (next === track) return;
    track?.removeEventListener("ended", attach);
    source?.disconnect();
    source = undefined;
    track = next;
    hold = 0;
    report(false);
    if (!track || !stream) return;
    context ??= new AudioContext();
    if (!analyser) {
      analyser = context.createAnalyser();
      analyser.fftSize = 256;
      silence = context.createGain();
      silence.gain.value = 0;
      analyser.connect(silence);
      silence.connect(context.destination);
    }
    source = context.createMediaStreamSource(new MediaStream([track]));
    source.connect(analyser);
    track.addEventListener("ended", attach);
    resume();
  };
  stream?.addEventListener("addtrack", attach);
  stream?.addEventListener("removetrack", attach);
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);
  attach();
  const timer = setInterval(() => {
    let level = localLevel?.() || 0;
    if (
      analyser &&
      track?.readyState === "live" &&
      !track.muted &&
      context?.state === "running"
    ) {
      analyser.getFloatTimeDomainData(buffer);
      level =
        Math.sqrt(buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length) *
        8;
    }
    if (level > 0.025) hold = Date.now() + 200;
    report(Date.now() < hold);
  }, 80);
  return () => {
    clearInterval(timer);
    stream?.removeEventListener("addtrack", attach);
    stream?.removeEventListener("removetrack", attach);
    track?.removeEventListener("ended", attach);
    window.removeEventListener("pointerdown", resume);
    window.removeEventListener("keydown", resume);
    source?.disconnect();
    analyser?.disconnect();
    silence?.disconnect();
    void context?.close().catch(() => {});
  };
}

const shared = new Map<
  MediaStream,
  {
    listeners: Set<(speaking: boolean) => void>;
    speaking: boolean;
    stop: () => void;
  }
>();
/**
 * One analyser per remote stream, however many views show who speaks (People,
 * Cameras): each observer would otherwise open its own AudioContext (#24).
 */
export function shareVoiceActivity(
  stream: MediaStream | undefined,
  changed: (speaking: boolean) => void,
  localLevel?: () => number,
) {
  if (!stream || localLevel)
    return observeVoiceActivity(stream, changed, localLevel);
  let entry = shared.get(stream);
  if (!entry) {
    const created = {
      listeners: new Set<(speaking: boolean) => void>(),
      speaking: false,
      stop: () => {},
    };
    created.stop = observeVoiceActivity(stream, (speaking) => {
      created.speaking = speaking;
      for (const listener of created.listeners) listener(speaking);
    });
    shared.set(stream, created);
    entry = created;
  }
  const current = entry;
  current.listeners.add(changed);
  if (current.speaking) changed(true);
  return () => {
    current.listeners.delete(changed);
    if (current.listeners.size) return;
    current.stop();
    shared.delete(stream);
  };
}
