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
export interface View {
  revision: number;
  status: "idle" | "connecting" | "connected" | "reconnecting" | "failed";
  snapshot: Snapshot | null;
  id: string;
  selected: string;
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
    error: "",
    notice: "",
  };
  config?: RuntimeConfig;
  socket?: Socket;
  readonly captures: Captures;
  readonly peers: Peers;
  publications = new Map<Kind, Publication>();
  visiblePreviews = new Set<string>();
  private listeners = new Set<() => void>();
  private session?: { token: string; id: string; expiresAt: number };
  private intent?: { name: string; code?: string };
  private subscriptions = new Map<string, { nonce: string; id?: string }>();
  private ticker?: ReturnType<typeof setInterval>;
  private iceTimer?: ReturnType<typeof setTimeout>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private captureQueue = Promise.resolve();
  private reconciling = false;
  private reconcileAgain = false;
  private joining = false;
  private generation = 0;
  private disposed = false;
  sounds = true;
  remoteMute = false;
  screenVolume = 0.8;
  volumes = new Map<string, number>();
  private cues = new SoundCues();
  private icePending?: Promise<IceConfig>;
  private missingSince = new Map<string, number>();
  constructor(
    adapter?: CaptureAdapter,
    private persist = true,
  ) {
    this.captures = new Captures(adapter, (kind, ended) => {
      this.bump();
      this.captureQueue = this.captureQueue
        .then(() => this.syncCapture(kind, ended))
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
      } catch {}
    }
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
      this.session = await res.json();
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
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(
          new Error("Reconectando à sala. Aguarde para tentar esta ação."),
        );
        return;
      }
      this.socket
        .timeout(10000)
        .emit(
          "command",
          { action, data },
          (error: Error | null, reply: Reply<T>) => {
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
    if (this.sounds) this.cues.unlock();
    this.view.status = "connecting";
    this.view.error = "";
    this.bump();
    this.intent = { name, code: code?.trim().toUpperCase() || undefined };
    try {
      await this.initialize();
      const session = await this.getSession();
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
        if (this.view.selected === id) this.view.selected = "";
        this.bump();
      });
      socket.on("signal", (signal) => void this.peers.signal(signal));
      socket.connect();
      clearInterval(this.ticker);
      this.ticker = setInterval(() => void this.heartbeat(), 10000);
    } catch (e) {
      this.view.status = "failed";
      this.fail(e);
    }
  }
  private async newSession() {
    if (!this.intent) return;
    const intent = this.intent;
    await this.getSession(true);
    this.peers.closeAll();
    this.publications.clear();
    this.subscriptions.clear();
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
    if (this.joining || !this.intent) return;
    this.joining = true;
    const generation = ++this.generation;
    try {
      const result = await this.request<{ id: string; snapshot: Snapshot }>(
        "join",
        this.intent,
      );
      if (generation !== this.generation || !this.intent) return;
      this.intent.code = result.snapshot.code;
      this.view.id = result.id;
      this.view.status = "connected";
      this.view.error = "";
      this.view.notice = "";
      this.receiveSnapshot(result.snapshot);
      await this.refreshIce();
      for (const kind of this.captures.sources.keys())
        await this.syncCapture(kind);
      await this.reconcile();
      this.peers.resume();
      this.bump();
      // So reescreve a barra de enderecos quando ela existe de verdade. Dentro
      // de uma casca nativa nao ha barra, e o "link" seria do esquema da casca.
      if (this.persist && !embedded) {
        const url = invite(result.snapshot.code);
        history.replaceState(null, "", url);
      }
    } catch (e) {
      this.view.status = "failed";
      this.fail(e);
    } finally {
      this.joining = false;
    }
  }
  private receiveSnapshot(snapshot: Snapshot) {
    if (
      !this.intent ||
      (this.intent.code && snapshot.code !== this.intent.code)
    )
      return;
    this.view.snapshot = snapshot;
    if (!this.view.selected) {
      const screens = snapshot.participants
        .flatMap((m) => m.publications)
        .filter((p) => p.kind === "screen");
      this.view.selected =
        (screens.find((p) => p.owner !== this.view.id) || screens[0])?.id || "";
    }
    this.bump();
    if (this.view.status === "connected") void this.reconcile();
  }
  private async syncCapture(kind: Kind, ended = false) {
    if (this.view.status !== "connected") return;
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
    this.icePending = this.request<IceConfig>("ice")
      .then((config) => {
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
        this.icePending = undefined;
      });
    return this.icePending;
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
  select(id: string) {
    this.view.selected = id;
    this.bump();
    void this.reconcile();
  }
  previews(ids: string[]) {
    this.visiblePreviews = new Set(ids.slice(0, this.config?.maxPreviews || 2));
    void this.reconcile();
  }
  private async reconcile() {
    if (this.reconciling) {
      this.reconcileAgain = true;
      return;
    }
    if (this.view.status !== "connected" || !this.view.snapshot) return;
    this.reconciling = true;
    try {
      do {
        this.reconcileAgain = false;
        const desired = new Map<
          string,
          { publicationId: string; tier: Tier }
        >();
        const publications = this.view.snapshot!.participants.flatMap(
          (m) => m.publications,
        );
        for (const p of publications) {
          if (p.owner === this.view.id) continue;
          if (p.kind !== "screen" || p.id === this.view.selected)
            desired.set(p.id + ":main", { publicationId: p.id, tier: "main" });
          else if (this.visiblePreviews.has(p.id))
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
          const sub = await this.request<Subscription>("subscribe", {
            ...data,
            nonce: intent.nonce,
          });
          intent.id = sub.id;
          await this.peers.accept(sub);
        }
      } while (this.reconcileAgain && this.view.status === "connected");
    } catch (e) {
      if (this.view.status === "connected") this.fail(e);
    } finally {
      this.reconciling = false;
    }
  }
  async startScreen(audio: boolean) {
    if (this.sounds) this.cues.unlock();
    try {
      await this.captures.startScreen(audio);
      await this.captureQueue;
    } catch (e) {
      this.fail(e);
    }
  }
  async microphone() {
    if (this.sounds) this.cues.unlock();
    try {
      if (!this.captures.sources.has("voice")) await this.captures.startVoice();
      else this.captures.micMuted = !this.captures.micMuted;
      this.captures.syncMute();
      if (this.sounds)
        this.cues.play(this.captures.micMuted ? "mute" : "unmute");
      this.savePreferences();
      await this.captureQueue;
    } catch (e) {
      this.fail(e);
    }
  }
  deafen() {
    this.captures.deaf = !this.captures.deaf;
    this.captures.syncMute();
    if (this.sounds) this.cues.play(this.captures.deaf ? "deafen" : "undeafen");
    this.bump();
  }
  async camera() {
    try {
      if (this.captures.sources.has("camera")) this.captures.stop("camera");
      else await this.captures.startCamera();
      await this.captureQueue;
    } catch (e) {
      this.fail(e);
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
    if (this.socket?.connected) await this.request("leave").catch(() => {});
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.captures.stopAll();
    this.peers.closeAll();
    this.publications.clear();
    this.subscriptions.clear();
    this.view = {
      revision: 0,
      status: "idle",
      snapshot: null,
      id: "",
      selected: "",
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
    this.listeners.clear();
  }
}
