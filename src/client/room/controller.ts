import { CanvasStore } from "../canvas/model";
import {
  trimMessages,
  type ChatMessageEvent,
  type SharedWidget,
} from "../../shared/widgets";
import { io, type Socket } from "socket.io-client";
import type {
  Action,
  IceConfig,
  Kind,
  Publication,
  Reply,
  RuntimeConfig,
  Snapshot,
  Subscription,
  Tier,
  VideoDemand,
} from "../../shared/protocol";
import { Captures, mediaError, type CaptureAdapter } from "../media/capture";
import { Peers } from "../media/peers";
import { SoundCues } from "../media/sounds";
import {
  readSoundEvents,
  volumePreference,
  type Cue,
} from "../media/sound-preferences";
import { presenceCues } from "./presence-cues";
import { defaultColor, normalizeColor } from "../../shared/colors";
import { freshKey } from "../id";
import { api, socketOrigin, invite, embedded } from "../endpoint";
import { AudioOutput, outputError } from "../media/audio-output";
import { ScreenPlayback } from "../media/screen-playback";
import { watchScreen, unwatchScreen, watchOnlyScreen } from "./watching";
import {
  recoveryDelay,
  recoveryCode,
  permanentRecoveryError,
} from "./recovery";
export interface View {
  revision: number;
  status: "idle" | "connecting" | "connected" | "reconnecting" | "failed";
  snapshot: Snapshot | null;
  id: string;
  selected: string;
  watching: string[];
  error: string;
  notice: string;
  signalingPing?: number;
}
export class Controller {
  view: View = {
    revision: 0,
    status: "idle",
    snapshot: null,
    id: "",
    selected: "",
    watching: [],
    error: "",
    notice: "",
  };
  readonly canvas: CanvasStore;
  readonly chatRead = new Map<string, number>();
  markChatRead(id: string, time: number) {
    if ((this.chatRead.get(id) || 0) >= time) return;
    this.chatRead.set(id, time);
    this.bump();
  }
  watchRequest?: (id: string, together: boolean, single?: boolean) => boolean;
  private desiredVideo = new Map<string, VideoDemand>();
  private sentVideo = new Map<string, string>();
  config?: RuntimeConfig;
  socket?: Socket;
  readonly captures: Captures;
  readonly peers: Peers;
  readonly output = new AudioOutput((error, recovered) => {
    if (recovered)
      this.view.notice = `${outputError(error)} O som agora usa a saída padrão do sistema.`;
    else
      this.fail(
        new Error(`${outputError(error)} Confira a saída em Ajustes → Áudio.`),
      );
    this.savePreferences();
  });
  private unwatchOutput?: () => void;
  publications = new Map<Kind, Publication>();
  visiblePreviews = new Set<string>();
  private listeners = new Set<() => void>();
  private session?: { token: string; id: string; expiresAt: number };
  private intent?: { name: string; code?: string; color?: string };
  private roomEntered = false;
  roomColor = defaultColor;
  /** The color chosen last, kept on this device and applied when entering a room. */
  savedColor = "";
  private subscriptions = new Map<
    string,
    { nonce: string; id?: string; epoch?: string }
  >();
  private ticker?: ReturnType<typeof setInterval>;
  private iceTimer?: ReturnType<typeof setTimeout>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private recoveryAttempt = 0;
  private sessionRefresh?: Promise<void>;
  private removeNetworkListeners?: () => void;
  private captureQueue = Promise.resolve();
  private reconciling?: number;
  private reconcileAgain = false;
  private joinAttempt = 0;
  private generation = 0;
  private disposed = false;
  readonly playback = new ScreenPlayback();
  inCall = false;
  private callGeneration = 0;
  private voicePending = false;
  private cameraPending = false;
  peopleHidden = false;
  screenArrangement = { mode: "right" as "right" | "bottom", revision: 0 };
  fineAudio = false;
  private screenLevels = new Map<string, { volume: number; muted: boolean }>();
  sounds = true;
  soundEvents = readSoundEvents(undefined);
  soundVolume = 0.7;
  masterVolume = 1;
  participantColors = true;
  previewsEnabled = false;
  remoteMute = false;
  screenVolume = 0.8;
  volumes = new Map<string, number>();
  private cues = new SoundCues(this.output);
  private snapshotReceivedAt = 0;
  private icePending?: Promise<IceConfig>;
  private missingSince = new Map<string, number>();
  private screenCatalog = new Map<
    string,
    { publication: Publication; name: string; color: string }
  >();
  private missingScreens = new Map<string, number>();
  constructor(
    adapter?: CaptureAdapter,
    private persist = true,
    private connectSocket: typeof io = io,
  ) {
    this.canvas = new CanvasStore(persist);
    this.captures = new Captures(adapter, (kind, ended) => {
      this.bump();
      const generation = this.generation;
      this.captureQueue = this.captureQueue
        .then(() =>
          generation === this.generation
            ? this.syncCapture(kind, ended)
            : undefined,
        )
        .catch((e) => this.fail(e));
    });
    this.peers = new Peers(
      () => this.view.id,
      this.captures,
      (s) => {
        if (this.socket?.connected)
          this.socket
            .timeout(8000)
            .emit(
              "signal",
              s,
              (error: Error | null, reply: { ok: boolean; code?: string }) => {
                if (error || !reply?.ok) {
                  const peer = this.peers.entries.get(s.id);
                  if (peer) {
                    peer.info.rejectedSignals =
                      (peer.info.rejectedSignals || 0) + 1;
                    peer.info.error =
                      "A sinalização da mídia não foi confirmada. Tente reconectar a mídia.";
                    this.bump();
                  }
                }
              },
            );
      },
      () => this.bump(),
      () => this.view.status === "connected",
      () => this.refreshIce(),
    );
    if (persist) {
      try {
        const p = JSON.parse(localStorage.getItem("vio:preferences") || "{}");
        this.captures.micMuted = !!p.micMuted;
        this.captures.micDevice = p.micDevice || "";
        this.captures.cameraDevice = p.cameraDevice || "";
        this.sounds = p.sounds !== false;
        this.soundEvents = readSoundEvents(p.soundEvents);
        this.soundVolume = volumePreference(p.soundVolume, 0.7);
        this.masterVolume = volumePreference(p.masterVolume, 1);
        this.participantColors = p.participantColors !== false;
        this.peopleHidden = p.peopleHidden === true;
        this.fineAudio = p.fineAudio === true && this.playback.supported;
        this.previewsEnabled = p.previewsEnabled === true;
        this.savedColor =
          (typeof p.color === "string" && normalizeColor(p.color)) || "";
        if (this.output.supported && typeof p.outputDevice === "string")
          void this.output.restore(p.outputDevice).then(() => this.bump());
        if (Number.isFinite(p.manualGain))
          this.captures.setManualGain(p.manualGain);
        if (Number.isFinite(p.threshold))
          this.captures.threshold = Math.min(-20, Math.max(-65, p.threshold));
        for (const key of [
          "echoCancellation",
          "noiseSuppression",
          "autoGainControl",
        ] as const)
          if (
            typeof p.voiceSettings?.[key] === "boolean" &&
            (key !== "autoGainControl" ||
              navigator.mediaDevices?.getSupportedConstraints().autoGainControl)
          )
            this.captures.voiceSettings[key] = p.voiceSettings[key];
      } catch {}
    }
    this.unwatchOutput = this.output.watchDevices();
    this.updateCueVolume();
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.view;
  bump() {
    this.view = { ...this.view, revision: this.view.revision + 1 };
    for (const listener of this.listeners) listener();
  }
  fail(error: unknown) {
    if (
      this.disposed ||
      (error instanceof DOMException && error.name === "AbortError")
    )
      return;
    this.view.error = mediaError(error);
    this.bump();
  }
  dismiss() {
    this.view.error = "";
    this.view.notice = "";
    this.bump();
  }
  savePreferences() {
    this.updateCueVolume();
    if (this.persist)
      try {
        localStorage.setItem(
          "vio:preferences",
          JSON.stringify({
            micMuted: this.captures.micMuted,
            micDevice: this.captures.micDevice,
            cameraDevice: this.captures.cameraDevice,
            sounds: this.sounds,
            soundEvents: this.soundEvents,
            soundVolume: this.soundVolume,
            masterVolume: this.masterVolume,
            participantColors: this.participantColors,
            peopleHidden: this.peopleHidden,
            fineAudio: this.fineAudio,
            previewsEnabled: this.previewsEnabled,
            color: this.savedColor || undefined,
            outputDevice: this.output.pendingDeviceId || this.output.deviceId,
            manualGain: this.captures.manualGain,
            threshold: this.captures.threshold,
            voiceSettings: this.captures.voiceSettings,
          }),
        );
      } catch {}
    this.bump();
  }
  private updateCueVolume() {
    this.cues.setVolume(this.sounds ? this.masterVolume * this.soundVolume : 0);
  }
  private lastChatCue = -Infinity;
  /** One chime per burst of chat messages, not one per line. */
  private chatCue() {
    const now = performance.now();
    if (now - this.lastChatCue < 4000) return;
    this.lastChatCue = now;
    void this.playCue("chat-message");
  }
  playCue(cue: Cue, preview = false): Promise<boolean> {
    if (this.disposed || !this.sounds || (!preview && !this.soundEvents[cue]))
      return Promise.resolve(false);
    this.updateCueVolume();
    return this.cues.play(cue);
  }
  receiveSharedWidget(widget: SharedWidget) {
    if (!this.view.snapshot) return;
    const existing = this.view.snapshot.widgets?.find(
      (w) => w.id === widget.id,
    );
    if (existing && existing.revision > widget.revision) return;
    this.view.snapshot = {
      ...this.view.snapshot,
      widgets: [
        ...(this.view.snapshot.widgets || []).filter((w) => w.id !== widget.id),
        widget,
      ],
    };
    this.bump();
  }
  async setColor(value: string) {
    const color = normalizeColor(value);
    if (!color) throw new Error("Use uma cor HEX válida, como #2727F5.");
    const result = await this.request<{ color: string }>("color", { color });
    this.roomColor = result.color;
    if (this.intent) this.intent.color = result.color;
    this.savedColor = result.color;
    this.savePreferences();
    this.bump();
  }
  /** Brings the saved color into a room just entered; a failure keeps the room's. */
  private async applySavedColor() {
    const color = this.savedColor;
    if (!color || color === this.roomColor) return;
    try {
      const result = await this.request<{ color: string }>("color", { color });
      this.roomColor = result.color;
      if (this.intent) this.intent.color = result.color;
      this.bump();
    } catch {
      /* The rate limit or a dropped socket only delays it to the next join. */
    }
  }
  async initialize() {
    if (this.config) return;
    const response = await fetch(api("/api/config"), {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error(
        "O serviço está iniciando. Tente novamente em instantes.",
      );
    this.config = await response.json();
  }
  private async getSession(fresh = false) {
    const generation = this.generation;
    if (!fresh && this.persist && !this.session)
      try {
        this.session =
          JSON.parse(sessionStorage.getItem("vio:session") || "null") ||
          undefined;
      } catch {}
    if (fresh || !this.session || this.session.expiresAt < Date.now() + 30000) {
      const res = await fetch(api("/api/session"), {
        method: "POST",
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok)
        throw new Error(
          "Não foi possível abrir uma sessão. Aguarde e tente novamente.",
        );
      const session = await res.json();
      if (generation !== this.generation)
        throw new DOMException("Room changed", "AbortError");
      this.session = session;
      this.storeSession();
    }
    return this.session!;
  }
  private storeSession() {
    if (this.persist)
      try {
        sessionStorage.setItem("vio:session", JSON.stringify(this.session));
      } catch {}
  }
  request<T = unknown>(action: Action, data: unknown = {}): Promise<T> {
    const socket = this.socket,
      generation = this.generation,
      actor = this.view.id;
    return new Promise((resolve, reject) => {
      if (!socket?.connected) {
        reject(
          new Error("Reconectando à sala. Aguarde para tentar esta ação."),
        );
        return;
      }
      socket
        .timeout(10000)
        .emit(
          "command",
          { action, data },
          (error: Error | null, reply: Reply<T>) => {
            if (
              generation !== this.generation ||
              socket !== this.socket ||
              actor !== this.view.id
            ) {
              reject(new DOMException("Room changed", "AbortError"));
              return;
            }
            if (error)
              reject(
                new Error("A sala demorou a responder. Tente reconectar."),
              );
            else if (!reply?.ok)
              reject(
                Object.assign(new Error(reply?.message || "Pedido recusado."), {
                  code: reply && !reply.ok ? reply.code : undefined,
                }),
              );
            else resolve(reply.data);
          },
        );
    });
  }
  async enter(name: string, code?: string, recovering = false) {
    const previousAttempts = recovering ? this.recoveryAttempt : 0;
    if (this.disposed) return;
    if (this.intent || this.socket) void this.leave();
    const generation = ++this.generation;
    const current = () => generation === this.generation && !this.disposed;
    if (this.sounds) this.cues.unlock();
    this.view.status = "connecting";
    this.view.error = "";
    this.bump();
    this.intent = {
      name,
      code: code?.trim().toUpperCase() || undefined,
      color: this.roomColor,
    };
    this.recoveryAttempt = previousAttempts;
    if (typeof window !== "undefined") {
      const online = () => {
        if (!current()) return;
        if (this.view.status !== "connected")
          this.scheduleRecovery(undefined, true);
        else this.peers.resume();
      };
      const offline = () => {
        if (!current()) return;
        this.view.notice =
          "A rede parece indisponível. Vamos reconectar automaticamente.";
        this.bump();
      };
      const visible = () => {
        if (document.visibilityState === "visible") online();
      };
      window.addEventListener("online", online);
      window.addEventListener("offline", offline);
      document.addEventListener("visibilitychange", visible);
      this.removeNetworkListeners = () => {
        window.removeEventListener("online", online);
        window.removeEventListener("offline", offline);
        document.removeEventListener("visibilitychange", visible);
      };
    }
    try {
      await this.initialize();
      if (!current()) return;
      const session = await this.getSession();
      if (!current()) return;
      this.view.id = session.id;
      this.socket?.removeAllListeners();
      this.socket?.disconnect();
      const socket = this.connectSocket(
        this.config!.signalingUrl || socketOrigin(),
        {
          path: this.config!.socketPath,
          transports: ["websocket"],
          auth: { token: session.token },
          autoConnect: false,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 30000,
          randomizationFactor: 0.4,
        },
      );
      this.socket = socket;
      socket.on("presence-probe", (ack: () => void) => {
        if (current() && typeof ack === "function") ack();
      });
      socket.on("participant-ping", (event: { id: string; pingMs: number }) => {
        if (!current() || !this.view.snapshot) return;
        this.view.snapshot = {
          ...this.view.snapshot,
          participants: this.view.snapshot.participants.map((person) =>
            person.id === event.id
              ? { ...person, pingMs: event.pingMs }
              : person,
          ),
        };
        this.bump();
      });
      socket.on("connect", () => void this.rejoin());
      socket.on("disconnect", (reason) => {
        if (!current() || !this.intent) return;
        this.view.status = "reconnecting";
        this.bump();
        if (reason === "io server disconnect") this.scheduleRecovery();
      });
      socket.on("server-restarting", () => {
        this.view.status = "reconnecting";
        this.view.notice =
          "A sala está reiniciando. Seu áudio e vídeo podem continuar enquanto reconectamos.";
        this.bump();
      });
      socket.on("connect_error", (error: Error) => {
        if (!current()) return;
        if (error.message === "SESSION_EXPIRED") {
          this.scheduleRecovery(
            Object.assign(error, { code: "SESSION_EXPIRED" }),
          );
          return;
        }
        this.view.status = "reconnecting";
        this.view.error =
          "A conexão caiu. Tentando voltar à sala automaticamente…";
        if (!socket.active)
          this.scheduleRecovery(Object.assign(error, { code: error.message }));
        this.bump();
      });
      socket.io.on("reconnect_failed", () => {
        if (!current()) return;
        this.scheduleRecovery();
      });
      socket.on("snapshot", (snapshot: Snapshot) =>
        this.receiveSnapshot(snapshot),
      );
      socket.on("screen-viewers", (screenViewers: Record<string, string[]>) => {
        if (!current() || !this.view.snapshot) return;
        this.view.snapshot = { ...this.view.snapshot, screenViewers };
        this.bump();
      });
      socket.on(
        "widget-updated",
        (event: { id: string; widget: SharedWidget | null }) => {
          if (!current() || !this.view.snapshot) return;
          const before = this.view.snapshot.widgets?.find(
            (w) => w.id === event.id,
          );
          const last = event.widget?.messages?.at(-1);
          if (
            before &&
            last &&
            last.authorId !== this.view.id &&
            last.id !== before.messages?.at(-1)?.id
          )
            this.chatCue();
          const widgets = (this.view.snapshot.widgets || []).filter(
            (w) => w.id !== event.id,
          );
          if (event.widget) widgets.push(event.widget);
          this.view.snapshot = { ...this.view.snapshot, widgets };
          this.bump();
        },
      );
      socket.on("chat-message", (event: ChatMessageEvent) => {
        if (!current() || !this.view.snapshot) return;
        const chat = this.view.snapshot.widgets?.find((w) => w.id === event.id);
        const messages = chat?.messages || [];
        if (
          !chat ||
          messages.some(
            (m) =>
              m.id === event.message.id &&
              m.authorId === event.message.authorId,
          )
        )
          return;
        if (event.message.authorId !== this.view.id) this.chatCue();
        const next = {
          ...chat,
          revision: event.revision,
          messages: trimMessages([...messages, event.message]),
        };
        this.view.snapshot = {
          ...this.view.snapshot,
          widgets: (this.view.snapshot.widgets || []).map((w) =>
            w.id === event.id ? next : w,
          ),
        };
        this.bump();
      });
      socket.on("video-demand", (event: VideoDemand & { id: string }) => {
        if (current())
          void this.peers.demand(event.id, event).catch((e) => this.fail(e));
      });
      socket.on("subscription", (sub: Subscription) => {
        void this.peers.accept(sub).catch((e) => this.fail(e));
      });
      socket.on("subscription-ended", (id: string) => this.peers.close(id));
      socket.on("publication-ended", (id: string) => {
        this.peers.closePublication(id);
        if (this.view.snapshot)
          this.view.snapshot = {
            ...this.view.snapshot,
            participants: this.view.snapshot.participants.map((person) => ({
              ...person,
              publications: person.publications.filter((p) => p.id !== id),
            })),
          };
        this.screenCatalog.delete(id);
        this.visiblePreviews.delete(id);
        this.stopWatching(id);
      });
      socket.on("signal", (signal) => void this.peers.signal(signal));
      socket.connect();
      clearInterval(this.ticker);
      this.ticker = setInterval(() => void this.heartbeat(), 10000);
    } catch (e) {
      if (!current()) return;
      this.scheduleRecovery(e);
    }
  }
  private scheduleRecovery(error?: unknown, soon = false) {
    if (!this.intent || this.disposed || this.reconnectTimer) return;
    if (permanentRecoveryError(error)) {
      this.view.status = "failed";
      this.fail(error);
      return;
    }
    const generation = this.generation;
    this.view.status = "reconnecting";
    this.view.error = "";
    this.view.notice =
      "Reconectando automaticamente. Suas capturas continuam abertas.";
    this.bump();
    const delay = ["RATE_LIMIT", "CONNECTION_LIMIT"].includes(
      recoveryCode(error) || "",
    )
      ? 60000
      : recoveryDelay(soon ? 0 : this.recoveryAttempt++);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (generation !== this.generation || !this.intent || this.disposed)
        return;
      void this.retry(recoveryCode(error) === "SESSION_EXPIRED");
    }, delay);
  }
  private async newSession() {
    if (!this.intent || !this.socket) return;
    if (this.sessionRefresh) return this.sessionRefresh;
    const generation = this.generation,
      socket = this.socket;
    const pending = (async () => {
      const session = await this.getSession(true);
      if (generation !== this.generation || socket !== this.socket) return;
      this.joinAttempt++;
      // An expired identity cannot authorize its old subscriptions. Captures,
      // mute/device preferences and room intent survive this identity renewal.
      this.peers.closeAll();
      this.publications.clear();
      this.subscriptions.clear();
      this.sentVideo.clear();
      this.view.id = session.id;
      socket.auth = { token: session.token };
      socket.disconnect().connect();
    })();
    this.sessionRefresh = pending;
    try {
      await pending;
    } finally {
      if (this.sessionRefresh === pending) this.sessionRefresh = undefined;
    }
  }
  async retry(newSession = false) {
    if (!this.intent) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    try {
      if (newSession) await this.newSession();
      else if (this.socket?.connected) await this.rejoin();
      else if (this.socket) this.socket.connect();
      else await this.enter(this.intent.name, this.intent.code, true);
    } catch (e) {
      this.scheduleRecovery(e);
    }
  }
  private async rejoin() {
    if (!this.intent) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    const generation = this.generation,
      attempt = ++this.joinAttempt,
      socket = this.socket;
    const current = () =>
      generation === this.generation &&
      attempt === this.joinAttempt &&
      socket === this.socket &&
      !!this.intent;
    try {
      const result = await this.request<{ id: string; snapshot: Snapshot }>(
        "join",
        this.intent,
      );
      if (!current() || !this.intent) return;
      this.intent.code = result.snapshot.code;
      this.view.id = result.id;
      this.view.status = "connected";
      void this.heartbeat();
      this.view.error = "";
      this.view.notice = "";
      this.receiveSnapshot(result.snapshot, false);
      void this.applySavedColor();
      if (!this.roomEntered) {
        this.roomEntered = true;
        void this.playCue("room-enter");
      }
      await this.refreshIce();
      if (!current()) return;
      if (this.inCall) await this.request("call", { active: true });
      for (const kind of new Set([
        ...this.captures.sources.keys(),
        ...this.publications.keys(),
      ])) {
        if (!current()) return;
        await this.syncCapture(kind);
      }
      await this.reconcile();
      if (!current()) return;
      this.peers.resume();
      this.recoveryAttempt = 0;
      this.bump();
      // So reescreve a barra de enderecos quando ela existe de verdade. Dentro
      // de uma casca nativa nao ha barra, e o "link" seria do esquema da casca.
      if (this.persist && !embedded) {
        const url = invite(result.snapshot.code);
        history.replaceState(null, "", url);
      }
    } catch (e) {
      if (!current()) return;
      this.scheduleRecovery(e);
    }
  }
  private receiveSnapshot(snapshot: Snapshot, announce = true) {
    if (
      !this.intent ||
      (this.intent.code && snapshot.code !== this.intent.code)
    )
      return;
    if (announce && this.roomEntered && this.view.status === "connected")
      for (const cue of presenceCues(
        this.view.snapshot,
        snapshot,
        this.view.id,
      ))
        void this.playCue(cue);
    // Room broadcasts omit widgets; they arrive through widget events.
    const previous = this.view.snapshot;
    this.view.snapshot =
      snapshot.widgets ||
      !previous ||
      previous.epoch !== snapshot.epoch ||
      previous.code !== snapshot.code
        ? snapshot
        : { ...snapshot, widgets: previous.widgets };
    const ownColor = snapshot.participants.find(
      (p) => p.id === this.view.id,
    )?.color;
    if (ownColor) {
      this.roomColor = ownColor;
      this.intent.color = ownColor;
    }
    this.snapshotReceivedAt = performance.now();
    const present = new Set<string>();
    for (const person of snapshot.participants)
      for (const publication of person.publications)
        if (publication.kind === "screen") {
          present.add(publication.id);
          this.screenCatalog.set(publication.id, {
            publication,
            name: person.name,
            color: person.color || defaultColor,
          });
          this.missingScreens.delete(publication.id);
        }
    for (const id of this.view.watching)
      if (!present.has(id) && !this.missingScreens.has(id))
        this.missingScreens.set(id, Date.now());
    for (const id of this.screenCatalog.keys())
      if (!present.has(id) && !this.view.watching.includes(id))
        this.screenCatalog.delete(id);
    this.bump();
    if (this.view.status === "connected") void this.reconcile();
  }
  private async syncCapture(kind: Kind, ended = false) {
    if (this.view.status !== "connected") return;
    if (kind !== "screen" && !this.inCall && this.captures.sources.has(kind)) {
      this.captures.stop(kind);
      return;
    }
    const generation = this.generation;
    const source = this.captures.sources.get(kind);
    const previous = this.publications.get(kind);
    if (!source || ended) {
      if (previous) {
        this.publications.delete(kind);
        this.peers.closePublication(previous.id);
        await this.request("unpublish", { publicationId: previous.id }).catch(
          () => {},
        );
        if (generation === this.generation && kind === "screen")
          this.chime(false);
      }
      this.bump();
      return;
    }
    const muted =
      kind === "voice" && (this.captures.micMuted || this.captures.deaf);
    if (
      previous?.key === source.key &&
      this.view.snapshot?.participants.some(
        (m) =>
          m.id === this.view.id &&
          m.publications.some((p) => p.id === previous.id),
      )
    ) {
      if (previous.muted !== muted) {
        await this.request("state", { publicationId: previous.id, muted });
        previous.muted = muted;
      }
      await this.peers.update(kind);
      this.bump();
      return;
    }
    const publication = await this.request<Publication>("publish", {
      kind,
      key: source.key,
      audio: source.stream.getAudioTracks().length > 0,
      muted,
    });
    if (
      generation !== this.generation ||
      this.captures.sources.get(kind) !== source
    )
      return;
    this.publications.set(kind, publication);
    await this.peers.update(kind);
    if (!previous && kind === "screen") this.chime(true);
    this.bump();
  }
  private chime(up: boolean) {
    void this.playCue(up ? "share-on" : "share-off");
  }
  async refreshIce() {
    if (this.icePending) return this.icePending;
    const generation = this.generation;
    const pending = this.request<IceConfig>("ice")
      .then((config) => {
        if (generation !== this.generation)
          throw new DOMException("Room changed", "AbortError");
        this.peers.ice = config;
        clearTimeout(this.iceTimer);
        this.iceTimer = setTimeout(
          () => {
            if (this.view.status === "connected")
              void this.refreshIce().catch((e) => this.fail(e));
          },
          Math.max(30000, config.expiresAt - Date.now() - 60000),
        );
        return config;
      })
      .finally(() => {
        if (this.icePending === pending) this.icePending = undefined;
      });
    this.icePending = pending;
    return pending;
  }
  async heartbeat() {
    if (this.view.status !== "connected") return;
    try {
      const start = performance.now();
      await this.request("ping");
      this.view.signalingPing = Math.round(performance.now() - start);
      if (this.session && this.session.expiresAt < Date.now() + 300000) {
        this.session = await this.request("renew");
        this.storeSession();
        if (this.socket) this.socket.auth = { token: this.session!.token };
      }
      await this.reconcile();
      this.bump();
    } catch (e) {
      if (
        recoveryCode(e) === "SESSION_EXPIRED" ||
        recoveryCode(e) === "NOT_JOINED"
      )
        this.scheduleRecovery(e);
      else this.fail(e);
    }
  }
  screenLevel(id: string) {
    return (
      this.screenLevels.get(id) || { volume: this.screenVolume, muted: false }
    );
  }
  setScreenLevel(
    id: string,
    patch: Partial<{ volume: number; muted: boolean }>,
  ) {
    const next = { ...this.screenLevel(id), ...patch };
    if (!Number.isFinite(next.volume)) return;
    next.volume = Math.min(this.fineAudio ? 3 : 1, Math.max(0, next.volume));
    this.screenLevels.set(id, next);
    if (next.volume > 1) this.playback.unlock();
    this.bump();
  }
  setFineAudio(enabled: boolean) {
    this.fineAudio = enabled && this.playback.supported;
    if (this.fineAudio) this.playback.unlock();
    if (!this.fineAudio)
      for (const [id, level] of this.screenLevels)
        this.screenLevels.set(id, {
          ...level,
          volume: Math.min(1, level.volume),
        });
    this.savePreferences();
  }
  togglePeople() {
    this.peopleHidden = !this.peopleHidden;
    this.savePreferences();
  }
  arrangeScreens(mode: "right" | "bottom") {
    this.screenArrangement = {
      mode,
      revision: this.screenArrangement.revision + 1,
    };
    this.bump();
  }
  joinCall() {
    if (this.inCall || !this.view.snapshot) return;
    this.callGeneration++;
    this.inCall = true;
    void this.request("call", { active: true }).catch((e) => this.fail(e));
    this.captures.micMuted = true;
    this.captures.deaf = false;
    this.bump();
    void this.reconcile();
  }
  async leaveCall() {
    void this.request("call", { active: false }).catch((e) => this.fail(e));
    this.callGeneration++;
    this.inCall = false;
    this.voicePending = false;
    this.cameraPending = false;
    this.captures.micMuted = true;
    this.captures.deaf = false;
    await Promise.all([this.stop("voice"), this.stop("camera")]);
    this.bump();
    void this.reconcile();
  }
  select(id: string) {
    this.watch(id);
  }
  screenInfo(id: string) {
    return this.screenCatalog.get(id);
  }
  watch(id: string, together = false, approved = false) {
    if (!this.screenCatalog.has(id)) return;
    if (!approved && this.watchRequest && !this.watchRequest(id, together))
      return;
    if (this.screenLevel(id).volume > 1) this.playback.unlock();
    const next = watchScreen(this.view, id, together);
    const changed = next.watching !== this.view.watching;
    this.view.watching = next.watching;
    this.view.selected = next.selected;
    this.bump();
    if (changed) void this.reconcile();
  }
  watchOnly(id: string) {
    if (this.watchRequest) {
      this.watchRequest(id, false, true);
      return;
    }
    if (!this.screenCatalog.has(id)) return;
    if (this.screenLevel(id).volume > 1) this.playback.unlock();
    const next = watchOnlyScreen(this.view, id);
    this.view.watching = next.watching;
    this.view.selected = next.selected;
    this.bump();
    void this.reconcile();
  }
  stopWatching(id: string) {
    const next = unwatchScreen(this.view, id);
    this.view.watching = next.watching;
    this.view.selected = next.selected;
    this.missingScreens.delete(id);
    this.bump();
    void this.reconcile();
  }
  setVideoDemand(publicationId: string, demand: VideoDemand) {
    const previous = this.desiredVideo.get(publicationId);
    if (previous?.video === demand.video && previous.height === demand.height)
      return;
    this.desiredVideo.set(publicationId, demand);
    void this.flushVideoDemands();
  }
  private async flushVideoDemands() {
    if (!this.socket?.connected) return;
    for (const info of this.peers.infos()) {
      if (info.sending || info.kind !== "screen" || info.tier !== "main")
        continue;
      const demand = this.desiredVideo.get(info.publicationId);
      if (!demand) continue;
      const key = JSON.stringify(demand);
      if (this.sentVideo.get(info.id) === key) continue;
      this.sentVideo.set(info.id, key);
      try {
        await this.request("demand", { id: info.id, ...demand });
      } catch {
        this.sentVideo.delete(info.id);
      }
    }
  }
  serverNow() {
    const s = this.view.snapshot;
    return s
      ? s.serverTime + performance.now() - this.snapshotReceivedAt
      : Date.now();
  }
  roomSeconds() {
    const snapshot = this.view.snapshot;
    if (!snapshot?.createdAt || !snapshot.serverTime) return 0;
    return Math.max(
      0,
      Math.floor(
        (snapshot.serverTime -
          snapshot.createdAt +
          performance.now() -
          this.snapshotReceivedAt) /
          1000,
      ),
    );
  }
  setPreviews(enabled: boolean) {
    this.previewsEnabled = enabled;
    if (!enabled) this.visiblePreviews.clear();
    this.savePreferences();
    void this.reconcile();
  }
  private previewSources = new Map<string, string[]>();
  previews(ids: string[], source = "default") {
    if (ids.length) this.previewSources.set(source, ids);
    else this.previewSources.delete(source);
    const candidates = [...new Set([...this.previewSources.values()].flat())];
    const next = new Set(
      this.previewsEnabled
        ? candidates
            .filter((id) => !this.view.watching.includes(id))
            .slice(0, this.config?.maxPreviews || 2)
        : [],
    );
    if (
      next.size === this.visiblePreviews.size &&
      [...next].every((id) => this.visiblePreviews.has(id))
    )
      return;
    this.visiblePreviews = next;
    void this.reconcile();
  }
  private async reconcile() {
    const generation = this.generation;
    if (this.reconciling === generation) {
      this.reconcileAgain = true;
      return;
    }
    if (this.view.status !== "connected" || !this.view.snapshot) return;
    this.reconciling = generation;
    try {
      do {
        this.reconcileAgain = false;
        const epoch = `${this.view.snapshot!.epoch}:${this.joinAttempt}`;
        for (const [id, since] of this.missingScreens)
          if (Date.now() - since >= 30000) this.stopWatching(id);
        const desired = new Map<
          string,
          { publicationId: string; tier: Tier }
        >();
        const publications = this.view.snapshot!.participants.flatMap(
          (m) => m.publications,
        );
        for (const p of publications) {
          if (p.owner === this.view.id || (p.kind !== "screen" && !this.inCall))
            continue;
          if (p.kind !== "screen" || this.view.watching.includes(p.id))
            desired.set(p.id + ":main", { publicationId: p.id, tier: "main" });
          else if (this.previewsEnabled && this.visiblePreviews.has(p.id))
            desired.set(p.id + ":preview", {
              publicationId: p.id,
              tier: "preview",
            });
        }
        // Preserve live peer media during server restart while the other participant reenters.
        for (const [key, intent] of this.subscriptions) {
          if (!desired.has(key)) {
            const [id, tier] = key.split(":");
            const peer = intent.id
              ? this.peers.entries.get(intent.id)
              : undefined;
            if (
              !publications.some((p) => p.id === id) &&
              ((peer?.sub.publication.kind !== "screen" && this.inCall) ||
                this.view.watching.includes(id)) &&
              peer?.pc.connectionState === "connected"
            ) {
              const since = this.missingSince.get(id) ?? Date.now();
              this.missingSince.set(id, since);
              if (Date.now() - since < 30000) continue;
            }
            this.missingSince.delete(id);
            if (intent.id) {
              this.peers.close(intent.id);
              await this.request("unsubscribe", { id: intent.id }).catch(
                () => {},
              );
            }
            if (generation !== this.generation) return;
            this.subscriptions.delete(key);
          }
        }
        for (const [key, data] of desired) {
          this.missingSince.delete(data.publicationId);
          let intent = this.subscriptions.get(key);
          if (!intent) {
            intent = { nonce: freshKey() };
            this.subscriptions.set(key, intent);
          }
          if (
            intent.id &&
            intent.epoch === epoch &&
            this.peers.entries.has(intent.id)
          )
            continue;
          const sub = await this.request<Subscription>("subscribe", {
            ...data,
            nonce: intent.nonce,
          });
          if (generation !== this.generation) return;
          intent.id = sub.id;
          intent.epoch = epoch;
          await this.peers.accept(sub);
          if (generation !== this.generation) return;
        }
      } while (this.reconcileAgain && this.view.status === "connected");
      void this.flushVideoDemands();
    } catch (e) {
      if (generation === this.generation && this.view.status === "connected")
        this.fail(e);
    } finally {
      if (this.reconciling === generation) this.reconciling = undefined;
    }
  }
  async startScreen(audio: boolean) {
    const generation = this.generation;
    if (this.sounds) this.cues.unlock();
    try {
      await this.captures.startScreen(audio);
      await this.captureQueue;
    } catch (e) {
      if (generation === this.generation) this.fail(e);
    }
  }
  async microphone() {
    if (!this.inCall || this.voicePending) return;
    const generation = this.callGeneration;
    this.voicePending = true;
    if (this.sounds) this.cues.unlock();
    try {
      if (!this.captures.sources.has("voice")) {
        await this.captures.startVoice();
        if (
          !this.inCall ||
          generation !== this.callGeneration ||
          !this.captures.sources.has("voice")
        ) {
          return;
        }
        this.captures.micMuted = false;
      } else this.captures.micMuted = !this.captures.micMuted;
      this.captures.syncMute();
      void this.playCue(this.captures.micMuted ? "mute" : "unmute");
      this.savePreferences();
      await this.captureQueue;
    } catch (e) {
      if (generation === this.callGeneration) this.fail(e);
    } finally {
      if (generation === this.callGeneration) this.voicePending = false;
    }
  }
  deafen() {
    if (!this.inCall) return;
    this.captures.deaf = !this.captures.deaf;
    this.captures.syncMute();
    void this.playCue(this.captures.deaf ? "deafen" : "undeafen");
    this.bump();
  }
  async camera() {
    if (!this.inCall || this.cameraPending) return;
    const generation = this.callGeneration;
    this.cameraPending = true;
    try {
      if (this.captures.sources.has("camera")) this.captures.stop("camera");
      else {
        await this.captures.startCamera();
        if (!this.inCall || generation !== this.callGeneration) return;
      }
      await this.captureQueue;
    } catch (e) {
      if (generation === this.callGeneration) this.fail(e);
    } finally {
      if (generation === this.callGeneration) this.cameraPending = false;
    }
  }
  async stop(kind: Kind) {
    this.captures.stop(kind);
    await this.captureQueue;
  }
  async quality(q: typeof this.captures.quality) {
    await this.captures.applyQuality(q);
    await this.peers.update("screen");
    this.bump();
  }
  async reconnectMedia(forceRelay = this.peers.forceRelay) {
    try {
      if (forceRelay && !this.peers.ice.turn) {
        this.fail(
          new Error("Configure TURN no servidor antes de forçar o relay."),
        );
        return;
      }
      this.peers.forceRelay = forceRelay;
      const ice = await this.refreshIce();
      for (const p of this.peers.entries.values()) {
        p.pc.setConfiguration({
          iceServers: ice.iceServers,
          iceTransportPolicy: forceRelay ? "relay" : "all",
        });
        p.attempts = 0;
      }
      // Fresh subscriptions give both endpoints an unambiguous generation and discard stale ICE.
      for (const intent of this.subscriptions.values()) {
        if (intent.id) {
          this.peers.close(intent.id);
          await this.request("unsubscribe", { id: intent.id });
        }
        intent.nonce = freshKey();
        intent.id = undefined;
      }
      await this.reconcile();
      this.peers.restartOutgoing();
      this.peers.resume();
      this.bump();
    } catch (e) {
      this.fail(e);
    }
  }
  async leave(announce = true) {
    this.cues.cancel();
    if (announce && this.roomEntered) void this.playCue("room-leave");
    this.roomEntered = false;
    this.roomColor = defaultColor;
    this.intent = undefined;
    this.generation++;
    clearInterval(this.ticker);
    clearTimeout(this.iceTimer);
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.removeNetworkListeners?.();
    this.removeNetworkListeners = undefined;
    this.sessionRefresh = undefined;
    const socket = this.socket;
    this.socket = undefined;
    socket?.removeAllListeners();
    socket?.io.removeAllListeners("reconnect_failed");
    // Release the local room now; the old socket owns only its own acknowledgement.
    if (socket?.connected)
      socket
        .timeout(1500)
        .emit("command", { action: "leave", data: {} }, () =>
          socket.disconnect(),
        );
    else socket?.disconnect();
    this.session = undefined;
    if (this.persist)
      try {
        sessionStorage.removeItem("vio:session");
      } catch {}
    this.icePending = undefined;
    this.reconciling = undefined;
    this.reconcileAgain = false;
    this.captureQueue = Promise.resolve();
    this.captures.stopAll();
    this.callGeneration++;
    this.inCall = false;
    this.voicePending = false;
    this.cameraPending = false;
    this.captures.micMuted = true;
    this.captures.deaf = false;
    this.screenLevels.clear();
    this.peers.closeAll();
    this.publications.clear();
    this.subscriptions.clear();
    this.screenCatalog.clear();
    this.desiredVideo.clear();
    this.sentVideo.clear();
    this.canvas.resetRoom();
    this.previewSources.clear();
    this.missingScreens.clear();
    this.missingSince.clear();
    this.visiblePreviews.clear();
    this.view = {
      revision: 0,
      status: "idle",
      snapshot: null,
      id: "",
      selected: "",
      watching: [],
      error: "",
      notice: "",
    };
    if (this.persist) history.replaceState(null, "", location.pathname);
    this.bump();
  }
  async destroy() {
    if (this.disposed) return;
    this.disposed = true;
    await this.leave();
    this.peers.destroy();
    this.cues.close();
    this.playback.close();
    this.unwatchOutput?.();
    this.output.destroy();
    this.listeners.clear();
  }
}
