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
} from "../../shared/protocol";
import { Captures, mediaError, type CaptureAdapter } from "../media/capture";
import { Peers } from "../media/peers";
import { SoundCues } from "../media/sounds";
import { freshKey } from "../id";
import { api, socketOrigin, invite, embedded } from "../endpoint";
import { AudioOutput, outputError } from "../media/audio-output";
import { ScreenPlayback } from "../media/screen-playback";
import { watchScreen, unwatchScreen, watchOnlyScreen } from "./watching";
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
  private intent?: { name: string; code?: string };
  private subscriptions = new Map<
    string,
    { nonce: string; id?: string; epoch?: string }
  >();
  private ticker?: ReturnType<typeof setInterval>;
  private iceTimer?: ReturnType<typeof setTimeout>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
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
    { publication: Publication; name: string }
  >();
  private missingScreens = new Map<string, number>();
  constructor(
    adapter?: CaptureAdapter,
    private persist = true,
  ) {
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
        this.peopleHidden = p.peopleHidden === true;
        this.fineAudio = p.fineAudio === true && this.playback.supported;
        this.previewsEnabled = p.previewsEnabled === true;
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
    if (this.persist)
      try {
        localStorage.setItem(
          "vio:preferences",
          JSON.stringify({
            micMuted: this.captures.micMuted,
            micDevice: this.captures.micDevice,
            cameraDevice: this.captures.cameraDevice,
            sounds: this.sounds,
            peopleHidden: this.peopleHidden,
            fineAudio: this.fineAudio,
            previewsEnabled: this.previewsEnabled,
            outputDevice: this.output.pendingDeviceId || this.output.deviceId,
            manualGain: this.captures.manualGain,
            threshold: this.captures.threshold,
            voiceSettings: this.captures.voiceSettings,
          }),
        );
      } catch {}
    this.bump();
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
      generation = this.generation;
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
            if (generation !== this.generation || socket !== this.socket) {
              reject(new DOMException("Room changed", "AbortError"));
              return;
            }
            if (error)
              reject(
                new Error("A sala demorou a responder. Tente reconectar."),
              );
            else if (!reply?.ok)
              reject(new Error(reply?.message || "Pedido recusado."));
            else resolve(reply.data);
          },
        );
    });
  }
  async enter(name: string, code?: string) {
    if (this.disposed) return;
    if (this.intent || this.socket) void this.leave();
    const generation = ++this.generation;
    const current = () => generation === this.generation && !this.disposed;
    if (this.sounds) this.cues.unlock();
    this.view.status = "connecting";
    this.view.error = "";
    this.bump();
    this.intent = { name, code: code?.trim().toUpperCase() || undefined };
    try {
      await this.initialize();
      if (!current()) return;
      const session = await this.getSession();
      if (!current()) return;
      this.view.id = session.id;
      this.socket?.removeAllListeners();
      this.socket?.disconnect();
      const socket = io(this.config!.signalingUrl || socketOrigin(), {
        path: this.config!.socketPath,
        transports: ["websocket"],
        auth: { token: session.token },
        autoConnect: false,
        reconnectionAttempts: 8,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        randomizationFactor: 0.4,
      });
      this.socket = socket;
      socket.on("connect", () => void this.rejoin());
      socket.on("disconnect", (reason) => {
        if (!this.intent) return;
        this.view.status = "reconnecting";
        this.bump();
        if (reason === "io server disconnect")
          this.reconnectTimer = setTimeout(() => socket.connect(), 1500);
      });
      socket.on("server-restarting", () => {
        this.view.status = "reconnecting";
        this.view.notice =
          "A sala está reiniciando. Seu áudio e vídeo podem continuar enquanto reconectamos.";
        this.bump();
      });
      socket.on("connect_error", (error: Error) => {
        if (error.message === "SESSION_EXPIRED") {
          void this.newSession().catch((e) => this.fail(e));
          return;
        }
        this.view.status = "reconnecting";
        this.view.error =
          "Não foi possível conectar à sala. Verifique a conexão e tente novamente.";
        this.bump();
      });
      socket.io.on("reconnect_failed", () => {
        if (!current()) return;
        this.view.status = "failed";
        this.bump();
      });
      socket.on("snapshot", (snapshot: Snapshot) =>
        this.receiveSnapshot(snapshot),
      );
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
      this.view.status = "failed";
      this.fail(e);
    }
  }
  private async newSession() {
    if (!this.intent) return;
    const intent = this.intent;
    await this.leave();
    await this.enter(intent.name, intent.code);
  }
  async retry(newSession = false) {
    if (!this.intent) return;
    try {
      if (newSession) await this.newSession();
      else if (this.socket?.connected) await this.rejoin();
      else if (this.socket) this.socket.connect();
      else await this.enter(this.intent.name, this.intent.code);
    } catch (e) {
      this.fail(e);
    }
  }
  private async rejoin() {
    if (!this.intent) return;
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
      this.receiveSnapshot(result.snapshot);
      await this.refreshIce();
      if (!current()) return;
      if (this.inCall) await this.request("call", { active: true });
      for (const kind of this.captures.sources.keys()) {
        if (!current()) return;
        await this.syncCapture(kind);
      }
      await this.reconcile();
      if (!current()) return;
      this.peers.resume();
      this.bump();
      // So reescreve a barra de enderecos quando ela existe de verdade. Dentro
      // de uma casca nativa nao ha barra, e o "link" seria do esquema da casca.
      if (this.persist && !embedded) {
        const url = invite(result.snapshot.code);
        history.replaceState(null, "", url);
      }
    } catch (e) {
      if (!current()) return;
      this.view.status = "failed";
      this.fail(e);
    }
  }
  private receiveSnapshot(snapshot: Snapshot) {
    if (
      !this.intent ||
      (this.intent.code && snapshot.code !== this.intent.code)
    )
      return;
    this.view.snapshot = snapshot;
    this.snapshotReceivedAt = performance.now();
    const present = new Set<string>();
    for (const person of snapshot.participants)
      for (const publication of person.publications)
        if (publication.kind === "screen") {
          present.add(publication.id);
          this.screenCatalog.set(publication.id, {
            publication,
            name: person.name,
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
        if (kind === "screen") this.chime(false);
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
    if (this.sounds) this.cues.play(up ? "share-on" : "share-off");
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
      this.fail(e);
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
  watch(id: string, together = false) {
    if (!this.screenCatalog.has(id)) return;
    if (this.screenLevel(id).volume > 1) this.playback.unlock();
    const next = watchScreen(this.view, id, together);
    const changed = next.watching !== this.view.watching;
    this.view.watching = next.watching;
    this.view.selected = next.selected;
    this.bump();
    if (changed) void this.reconcile();
  }
  watchOnly(id: string) {
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
  previews(ids: string[]) {
    const next = new Set(
      this.previewsEnabled
        ? ids
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
      if (this.sounds)
        this.cues.play(this.captures.micMuted ? "mute" : "unmute");
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
    if (this.sounds) this.cues.play(this.captures.deaf ? "deafen" : "undeafen");
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
  async leave() {
    this.intent = undefined;
    this.generation++;
    clearInterval(this.ticker);
    clearTimeout(this.iceTimer);
    clearTimeout(this.reconnectTimer);
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
