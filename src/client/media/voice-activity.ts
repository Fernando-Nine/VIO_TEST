/** One indicator's reading, run on every shared tick. */
type Meter = () => void;

/**
 * Every speaking indicator shares one AudioContext and one timer (#24): a context
 * per person kept a render callback each, and Safari caps how many can exist.
 * The context closes when the last indicator goes away.
 */
const voice = {
  context: undefined as AudioContext | undefined,
  sink: undefined as GainNode | undefined,
  meters: new Set<Meter>(),
  timer: undefined as ReturnType<typeof setInterval> | undefined,
};
const resumeVoice = () => {
  void voice.context?.resume().catch(() => {});
};
function voiceContext() {
  if (!voice.context) {
    voice.context = new AudioContext();
    // Analysers only run when pulled to the destination; silence keeps them inaudible.
    voice.sink = voice.context.createGain();
    voice.sink.gain.value = 0;
    voice.sink.connect(voice.context.destination);
    window.addEventListener("pointerdown", resumeVoice);
    window.addEventListener("keydown", resumeVoice);
  }
  resumeVoice();
  return { context: voice.context, sink: voice.sink! };
}
function addMeter(meter: Meter) {
  voice.meters.add(meter);
  voice.timer ??= setInterval(() => {
    for (const each of voice.meters) each();
  }, 80);
}
function removeMeter(meter: Meter) {
  voice.meters.delete(meter);
  if (voice.meters.size) return;
  clearInterval(voice.timer);
  voice.timer = undefined;
  window.removeEventListener("pointerdown", resumeVoice);
  window.removeEventListener("keydown", resumeVoice);
  voice.sink?.disconnect();
  void voice.context?.close().catch(() => {});
  voice.context = undefined;
  voice.sink = undefined;
}

/** Tracks can arrive after the MediaStream object is first rendered. */
export function observeVoiceActivity(
  stream: MediaStream | undefined,
  changed: (speaking: boolean) => void,
  localLevel?: () => number,
) {
  let source: MediaStreamAudioSourceNode | undefined;
  let analyser: AnalyserNode | undefined;
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
    const { context, sink } = voiceContext();
    if (!analyser) {
      analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(sink);
    }
    source = context.createMediaStreamSource(new MediaStream([track]));
    source.connect(analyser);
    track.addEventListener("ended", attach);
  };
  const meter = () => {
    let level = localLevel?.() || 0;
    if (
      analyser &&
      track?.readyState === "live" &&
      !track.muted &&
      voice.context?.state === "running"
    ) {
      analyser.getFloatTimeDomainData(buffer);
      level =
        Math.sqrt(buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length) *
        8;
    }
    if (level > 0.025) hold = Date.now() + 200;
    report(Date.now() < hold);
  };
  stream?.addEventListener("addtrack", attach);
  stream?.addEventListener("removetrack", attach);
  addMeter(meter);
  attach();
  return () => {
    stream?.removeEventListener("addtrack", attach);
    stream?.removeEventListener("removetrack", attach);
    track?.removeEventListener("ended", attach);
    source?.disconnect();
    analyser?.disconnect();
    removeMeter(meter);
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
