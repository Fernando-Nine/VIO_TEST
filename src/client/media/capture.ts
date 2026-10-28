import {
  MAX_SCREENS,
  presets,
  type Kind,
  type Publication,
  type Quality,
} from "../../shared/protocol";
import { freshKey } from "../id";
import { mediaDeadline } from "./deadline";
/**
 * Where a local capture lives: one voice, one camera and up to MAX_SCREENS
 * screens (#194). "screen" is the first one, the one the room UI controls.
 */
export type Slot = Kind | `screen:${number}`;
export const screenSlots: Slot[] = Array.from(
  { length: MAX_SCREENS },
  (_, i) => (i ? (`screen:${i + 1}` as const) : "screen"),
);
export const slotKind = (slot: Slot): Kind =>
  slot.startsWith("screen") ? "screen" : (slot as Kind);
/** Extra screens start lighter: the uplink carries all of them at once. */
export function extraScreenQuality(q: Quality): Quality {
  const low = presets.Baixa;
  return {
    fps: Math.min(q.fps, low.fps),
    bitrate: Math.min(q.bitrate, low.bitrate),
    resolution: Math.min(q.resolution, low.resolution),
  };
}
export interface CaptureAdapter {
  screen(audio: boolean, slot: Slot): Promise<MediaStream>;
  device(constraints: MediaStreamConstraints): Promise<MediaStream>;
  stopScreen?(slot: Slot): void;
  screenAudioMessage?(): string;
  /** Program name of a sound shared without an image (#236). */
  soundLabel?(slot: Slot): string | undefined;
}
/** Picker hint and size ceiling chosen in the share dialog (#191). */
let displayVideo: MediaTrackConstraints | true = true;
export function setDisplayVideo(video?: MediaTrackConstraints) {
  displayVideo = video ?? true;
}
export const browserCapture: CaptureAdapter = {
  screen: (audio) =>
    navigator.mediaDevices.getDisplayMedia({
      video: displayVideo,
      audio: audio
        ? {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        : false,
    }),
  device: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
};
export function mediaError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  return (
    (
      {
        NotAllowedError:
          "Permissão não concedida. Autorize o acesso no navegador e tente novamente.",
        NotFoundError:
          "Nenhum dispositivo disponível. Conecte um microfone ou uma câmera.",
        NotReadableError:
          "O dispositivo está ocupado ou indisponível. Verifique outros aplicativos.",
        OverconstrainedError:
          "O dispositivo não aceita esta configuração. Escolha outro dispositivo.",
        InvalidStateError:
          "Inicie a captura pelo botão, com esta janela em foco.",
      } as Record<string, string>
    )[name] ||
    (error instanceof Error
      ? error.message
      : "Não foi possível iniciar a mídia.")
  );
}
export interface LocalSource {
  kind: Kind;
  key: string;
  stream: MediaStream;
  /** Extra screens only; the first follows `Captures.quality`. */
  quality?: Quality;
  /** Screen slot with sound and no image (#236): the program it comes from. */
  label?: string;
}
export class Captures {
  get canShare() {
    return (
      this.adapter !== browserCapture ||
      !!navigator.mediaDevices?.getDisplayMedia
    );
  }
  get canUseDevices() {
    return (
      this.adapter !== browserCapture || !!navigator.mediaDevices?.getUserMedia
    );
  }
  sources = new Map<Slot, LocalSource>();
  quality: Quality = { ...presets.Média };
  micMuted = false;
  deaf = false;
  threshold = -55;
  manualGain = 1;
  voiceLevel = 0;
  /** Raw input level in dB, before the gate; drives the settings meter. */
  inputDb = -100;
  voiceSettings = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  micDevice = "";
  cameraDevice = "";
  facing: "user" | "environment" = "user";
  audioMessage = "";
  qualityMessage = "";
  private rawVoice?: MediaStream;
  private context?: AudioContext;
  private input?: MediaStreamAudioSourceNode;
  private gate?: GainNode;
  private voiceGain?: GainNode;
  private analyser?: AnalyserNode;
  private voiceTimer?: ReturnType<typeof setInterval>;
  private thumbnails = new Map<
    Slot,
    {
      stream: MediaStream;
      video: HTMLVideoElement;
      timer: ReturnType<typeof setInterval>;
    }
  >();
  private generation = new Map<Slot, number>();
  private thumbnailPending = new Map<Slot, Promise<MediaStream>>();
  private silenced = new Set<Slot>();
  /** Sound of the first screen; other screens use `isScreenAudioMuted`. */
  get screenAudioMuted() {
    return this.silenced.has("screen");
  }
  constructor(
    private adapter: CaptureAdapter = browserCapture,
    private changed: (slot: Slot, ended?: boolean) => void = () => {},
  ) {
    if (
      typeof navigator !== "undefined" &&
      !navigator.mediaDevices?.getSupportedConstraints().autoGainControl
    )
      this.voiceSettings.autoGainControl = false;
  }
  private bumpGeneration(slot: Slot) {
    const next = (this.generation.get(slot) ?? 0) + 1;
    this.generation.set(slot, next);
    return next;
  }
  private save(slot: Slot, stream: MediaStream) {
    const kind = slotKind(slot);
    const previous = this.sources.get(slot);
    // Same key = same publication: peers swap tracks and viewers stay connected.
    const source: LocalSource = {
      kind,
      key: previous?.key || freshKey(),
      stream,
      quality:
        previous?.quality ??
        (kind === "screen" && slot !== "screen"
          ? extraScreenQuality(this.quality)
          : undefined),
    };
    this.sources.set(slot, source);
    if (kind === "screen") {
      for (const track of stream.getAudioTracks())
        track.enabled = !this.silenced.has(slot);
      const paused = previous?.stream.getVideoTracks()[0]?.enabled === false;
      const video = stream.getVideoTracks()[0];
      if (paused && video) video.enabled = false;
      const thumbnail = this.thumbnails.get(slot);
      if (thumbnail) {
        thumbnail.video.srcObject = stream;
        void thumbnail.video.play().catch(() => {});
      }
    }
    for (const track of stream.getTracks())
      track.addEventListener(
        "ended",
        () => {
          if (this.sources.get(slot)?.stream === stream) this.stop(slot);
        },
        { once: true },
      );
    if (previous) previous.stream.getTracks().forEach((t) => t.stop());
    this.changed(slot);
    return source;
  }
  /** The local capture behind one of our publications. */
  sourceFor(publication: Pick<Publication, "kind" | "key">) {
    for (const source of this.sources.values())
      if (source.kind === publication.kind && source.key === publication.key)
        return source;
  }
  slotOf(source: LocalSource) {
    for (const [slot, s] of this.sources) if (s === source) return slot;
  }
  /** Effective sending quality of a capture. */
  qualityOf(source?: LocalSource) {
    return source?.quality ?? this.quality;
  }
  /** First free screen slot, or undefined at MAX_SCREENS. */
  nextScreen() {
    return screenSlots.find((slot) => !this.sources.has(slot));
  }
  get screens() {
    return screenSlots.flatMap((slot) => {
      const source = this.sources.get(slot);
      return source ? [{ slot, source }] : [];
    });
  }
  isScreenAudioMuted(slot: Slot) {
    return this.silenced.has(slot);
  }
  /** Silences the shared sound for everyone; the track keeps flowing, so nothing renegotiates. */
  setScreenAudioMuted(muted: boolean, slot: Slot = "screen") {
    if (muted) this.silenced.add(slot);
    else this.silenced.delete(slot);
    for (const track of this.sources.get(slot)?.stream.getAudioTracks() ?? [])
      track.enabled = !muted;
  }
  /**
   * With `replace`, a new source takes over the same publication (#160).
   * Another screen goes in `nextScreen()`; the server refuses past MAX_SCREENS.
   */
  async startScreen(audio: boolean, replace = false, slot: Slot = "screen") {
    if (this.sources.has(slot) && !replace) return;
    const generation = this.bumpGeneration(slot);
    const stream = await this.adapter.screen(audio, slot);
    if (generation !== this.generation.get(slot)) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    for (const track of stream.getAudioTracks()) {
      try {
        await mediaDeadline(
          track.applyConstraints({
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }),
          "O navegador não confirmou os ajustes de áudio.",
        );
      } catch {
        this.audioMessage =
          "O navegador não aceitou todos os ajustes de processamento de áudio.";
      }
    }
    if (generation !== this.generation.get(slot)) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    const hasAudio = stream.getAudioTracks().length > 0;
    const surface = stream.getVideoTracks()[0]?.getSettings().displaySurface;
    this.audioMessage = hasAudio
      ? "Áudio recebido da captura. A origem e o isolamento dependem da opção escolhida no navegador."
      : "O navegador retornou somente vídeo. Para incluir som, tente uma aba com a opção de compartilhar áudio.";
    if (surface === "monitor" && hasAudio)
      this.audioMessage +=
        " O som do sistema pode incluir a conversa desta sala; prefira uma aba ou use fones.";
    if (this.adapter.screenAudioMessage)
      this.audioMessage = this.adapter.screenAudioMessage();
    const source = this.save(slot, stream);
    if (!stream.getVideoTracks().length)
      source.label = this.adapter.soundLabel?.(slot);
    await this.applyQuality(this.qualityOf(source), slot);
  }
  async startVoice() {
    if (this.sources.has("voice")) return;
    this.context = new AudioContext();
    const context = this.context;
    void this.context.resume();
    let raw: MediaStream;
    try {
      raw = await this.adapter.device({
        audio: {
          ...this.voiceSettings,
          autoGainControl: { exact: this.voiceSettings.autoGainControl },
          ...(this.micDevice ? { deviceId: { exact: this.micDevice } } : {}),
        },
        video: false,
      });
    } catch (e) {
      void context.close().catch(() => {});
      if (this.context === context) this.context = undefined;
      throw e;
    }
    if (this.context !== context || context.state === "closed") {
      raw.getTracks().forEach((track) => track.stop());
      void context.close().catch(() => {});
      return;
    }
    this.rawVoice = raw;
    this.input = this.context.createMediaStreamSource(raw);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    this.gate = this.context.createGain();
    this.gate.gain.value = 0;
    this.voiceGain = this.context.createGain();
    this.voiceGain.gain.value = this.voiceSettings.autoGainControl
      ? 1
      : this.manualGain;
    const destination = this.context.createMediaStreamDestination();
    this.input.connect(this.analyser);
    this.input.connect(this.gate);
    this.gate.connect(this.voiceGain);
    this.voiceGain.connect(destination);
    const buffer = new Float32Array(this.analyser.fftSize);
    let hold = 0;
    let open = false;
    this.voiceTimer = setInterval(() => {
      if (!this.analyser || !this.gate || !this.context) return;
      this.analyser.getFloatTimeDomainData(buffer);
      const rms = Math.sqrt(
        buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length,
      );
      const db = 20 * Math.log10(rms + 1e-8);
      this.inputDb = db;
      if (db > this.threshold) hold = Date.now() + 180;
      const next = Date.now() < hold && !this.micMuted && !this.deaf;
      if (next !== open) {
        open = next;
        this.gate.gain.setTargetAtTime(
          next ? 1 : 0,
          this.context.currentTime,
          next ? 0.008 : 0.04,
        );
      }
      this.voiceLevel = next
        ? this.voiceLevel * 0.55 + Math.min(1, rms * 8) * 0.45
        : 0;
    }, 50);
    this.save("voice", destination.stream);
    this.syncMute();
    for (const track of raw.getTracks())
      track.addEventListener(
        "ended",
        () => {
          if (this.rawVoice === raw) this.stop("voice");
        },
        { once: true },
      );
  }
  async changeMicrophone(deviceId: string) {
    this.micDevice = deviceId;
    if (!this.sources.has("voice")) return;
    const stream = await this.adapter.device({
      audio: {
        ...this.voiceSettings,
        autoGainControl: { exact: this.voiceSettings.autoGainControl },
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
      video: false,
    });
    if (!this.context || !this.analyser || !this.gate) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    const old = this.rawVoice;
    this.input?.disconnect();
    this.rawVoice = stream;
    this.input = this.context.createMediaStreamSource(stream);
    this.input.connect(this.analyser);
    this.input.connect(this.gate);
    old?.getTracks().forEach((t) => t.stop());
    this.syncMute();
    stream.getTracks().forEach((track) =>
      track.addEventListener(
        "ended",
        () => {
          if (this.rawVoice === stream) this.stop("voice");
        },
        { once: true },
      ),
    );
    this.changed("voice");
  }
  async setVoiceSettings(settings: typeof this.voiceSettings) {
    const track = this.rawVoice?.getAudioTracks()[0];
    if (track)
      await mediaDeadline(
        track.applyConstraints({
          ...settings,
          autoGainControl: { exact: settings.autoGainControl },
        }),
        "O navegador não confirmou os ajustes do microfone.",
      );
    this.voiceSettings = settings;
    this.setManualGain(this.manualGain);
  }
  setManualGain(value: number) {
    if (!Number.isFinite(value)) return;
    this.manualGain = Math.min(3, Math.max(0.2, value));
    if (this.voiceGain && this.context)
      this.voiceGain.gain.setTargetAtTime(
        this.voiceSettings.autoGainControl ? 1 : this.manualGain,
        this.context.currentTime,
        0.015,
      );
  }
  voiceEffective() {
    return this.rawVoice?.getAudioTracks()[0]?.getSettings();
  }
  voiceBlocked() {
    return this.context?.state === "suspended";
  }
  async resumeVoice() {
    await this.context?.resume();
    this.changed("voice");
  }
  syncMute() {
    const enabled = !this.micMuted && !this.deaf;
    this.rawVoice?.getAudioTracks().forEach((t) => (t.enabled = enabled));
    this.sources
      .get("voice")
      ?.stream.getAudioTracks()
      .forEach((t) => (t.enabled = enabled));
    if (!enabled) this.voiceLevel = 0;
    this.changed("voice");
  }
  async startCamera(deviceId = this.cameraDevice, facing = this.facing) {
    const generation = this.bumpGeneration("camera");
    const stream = await this.adapter.device({
      video: {
        width: { ideal: 640 },
        height: { ideal: 360 },
        frameRate: { ideal: 20, max: 24 },
        ...(deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: facing } }),
      },
      audio: false,
    });
    if (generation !== this.generation.get("camera")) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.cameraDevice = deviceId;
    this.facing = facing;
    this.save("camera", stream);
  }
  async applyQuality(q: Quality, slot: Slot = "screen") {
    const source = this.sources.get(slot);
    if (slot === "screen") this.quality = q;
    else if (source) source.quality = q;
    const track = source?.stream.getVideoTracks()[0];
    if (!track) return;
    try {
      await mediaDeadline(
        track.applyConstraints({ frameRate: { ideal: q.fps, max: q.fps } }),
        "O navegador não confirmou a qualidade da captura.",
      );
      this.qualityMessage = "";
    } catch {
      this.qualityMessage =
        "O navegador limitou os ajustes de captura. Confira os valores efetivos abaixo.";
    }
  }
  async previewStream(slot: Slot = "screen") {
    const ready = this.thumbnails.get(slot);
    if (ready) return ready.stream;
    const waiting = this.thumbnailPending.get(slot);
    if (waiting) return waiting;
    const pending = this.createPreview(slot).finally(() => {
      if (this.thumbnailPending.get(slot) === pending)
        this.thumbnailPending.delete(slot);
    });
    this.thumbnailPending.set(slot, pending);
    return pending;
  }
  private async createPreview(slot: Slot) {
    const source = this.sources.get(slot);
    if (!source) throw new Error("A tela foi encerrada.");
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = source.stream;
    try {
      await mediaDeadline(
        video.play(),
        "Não foi possível iniciar a miniatura ao vivo.",
      );
    } catch (e) {
      video.pause();
      video.srcObject = null;
      throw e;
    }
    if (this.sources.get(slot) !== source) {
      video.pause();
      video.srcObject = null;
      throw new Error("A tela foi encerrada.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.captureStream)
      throw new Error("Miniaturas ao vivo indisponíveis neste navegador.");
    const draw = () => {
      const w = video.videoWidth || 320,
        h = video.videoHeight || 180,
        scale = Math.min(320 / w, 180 / h);
      ctx.fillStyle = "#090a0e";
      ctx.fillRect(0, 0, 320, 180);
      ctx.drawImage(
        video,
        (320 - w * scale) / 2,
        (180 - h * scale) / 2,
        w * scale,
        h * scale,
      );
    };
    draw();
    const stream = canvas.captureStream(5);
    const timer = setInterval(draw, 200);
    this.thumbnails.set(slot, { stream, video, timer });
    return stream;
  }
  /** Without a slot, stops every preview. */
  stopPreview(slot?: Slot) {
    for (const [key, thumbnail] of this.thumbnails) {
      if (slot && key !== slot) continue;
      clearInterval(thumbnail.timer);
      thumbnail.stream.getTracks().forEach((t) => t.stop());
      thumbnail.video.pause();
      thumbnail.video.srcObject = null;
      this.thumbnails.delete(key);
    }
  }
  /** Stops the previews of screens nobody watches as a preview any more. */
  keepPreviews(used: Set<Slot>) {
    for (const slot of [...this.thumbnails.keys()])
      if (!used.has(slot)) this.stopPreview(slot);
  }
  stop(slot: Slot) {
    const kind = slotKind(slot);
    this.bumpGeneration(slot);
    const source = this.sources.get(slot);
    this.sources.delete(slot);
    source?.stream.getTracks().forEach((t) => t.stop());
    if (kind === "screen") {
      this.adapter.stopScreen?.(slot);
      this.stopPreview(slot);
      this.silenced.delete(slot);
    }
    if (kind === "voice") {
      clearInterval(this.voiceTimer);
      this.rawVoice?.getTracks().forEach((t) => t.stop());
      this.input?.disconnect();
      this.analyser?.disconnect();
      this.gate?.disconnect();
      this.voiceGain?.disconnect();
      this.voiceGain = undefined;
      void this.context?.close();
      this.rawVoice = undefined;
      this.context = undefined;
      this.voiceLevel = 0;
      this.inputDb = -100;
    }
    this.changed(slot, true);
  }
  stopAll() {
    const extras = screenSlots.filter(
      (s) => s !== "screen" && this.sources.has(s),
    );
    for (const slot of [...extras, "screen", "voice", "camera"] as Slot[])
      this.stop(slot);
  }
}
