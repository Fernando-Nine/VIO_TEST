import { presets, type Kind, type Quality } from "../../shared/protocol";
import { freshKey } from "../id";
import { mediaDeadline } from "./deadline";
export interface CaptureAdapter {
  screen(audio: boolean): Promise<MediaStream>;
  device(constraints: MediaStreamConstraints): Promise<MediaStream>;
  stopScreen?(): void;
  screenAudioMessage?(): string;
}
export const browserCapture: CaptureAdapter = {
  screen: (audio) =>
    navigator.mediaDevices.getDisplayMedia({
      video: true,
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
  sources = new Map<Kind, LocalSource>();
  quality: Quality = { ...presets.Média };
  micMuted = false;
  deaf = false;
  threshold = -55;
  manualGain = 1;
  voiceLevel = 0;
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
  private thumbnail?: {
    stream: MediaStream;
    video: HTMLVideoElement;
    timer: ReturnType<typeof setInterval>;
  };
  private generation = { screen: 0, voice: 0, camera: 0 };
  private thumbnailPending?: Promise<MediaStream>;
  constructor(
    private adapter: CaptureAdapter = browserCapture,
    private changed: (kind: Kind, ended?: boolean) => void = () => {},
  ) {
    if (
      typeof navigator !== "undefined" &&
      !navigator.mediaDevices?.getSupportedConstraints().autoGainControl
    )
      this.voiceSettings.autoGainControl = false;
  }
  private save(kind: Kind, stream: MediaStream) {
    const previous = this.sources.get(kind);
    const source = { kind, key: previous?.key || freshKey(), stream };
    this.sources.set(kind, source);
    for (const track of stream.getTracks())
      track.addEventListener(
        "ended",
        () => {
          if (this.sources.get(kind)?.stream === stream) this.stop(kind);
        },
        { once: true },
      );
    if (previous) previous.stream.getTracks().forEach((t) => t.stop());
    this.changed(kind);
    return source;
  }
  async startScreen(audio: boolean) {
    if (this.sources.has("screen")) return;
    const generation = ++this.generation.screen;
    const stream = await this.adapter.screen(audio);
    if (generation !== this.generation.screen) {
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
    if (generation !== this.generation.screen) {
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
    this.save("screen", stream);
    await this.applyQuality(this.quality);
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
    const generation = ++this.generation.camera;
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
    if (generation !== this.generation.camera) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.cameraDevice = deviceId;
    this.facing = facing;
    this.save("camera", stream);
  }
  async applyQuality(q: Quality) {
    this.quality = q;
    const track = this.sources.get("screen")?.stream.getVideoTracks()[0];
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
  async previewStream() {
    if (this.thumbnail) return this.thumbnail.stream;
    if (this.thumbnailPending) return this.thumbnailPending;
    this.thumbnailPending = this.createPreview().finally(() => {
      this.thumbnailPending = undefined;
    });
    return this.thumbnailPending;
  }
  private async createPreview() {
    const source = this.sources.get("screen");
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
    if (this.sources.get("screen") !== source) {
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
    this.thumbnail = { stream, video, timer };
    return stream;
  }
  stopPreview() {
    if (this.thumbnail) {
      clearInterval(this.thumbnail.timer);
      this.thumbnail.stream.getTracks().forEach((t) => t.stop());
      this.thumbnail.video.pause();
      this.thumbnail.video.srcObject = null;
      this.thumbnail = undefined;
    }
  }
  stop(kind: Kind) {
    this.generation[kind]++;
    const source = this.sources.get(kind);
    this.sources.delete(kind);
    source?.stream.getTracks().forEach((t) => t.stop());
    if (kind === "screen") {
      this.adapter.stopScreen?.();
      this.stopPreview();
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
    }
    this.changed(kind, true);
  }
  stopAll() {
    for (const kind of ["screen", "voice", "camera"] as const) this.stop(kind);
  }
}
