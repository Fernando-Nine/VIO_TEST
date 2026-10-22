import type {
  IceConfig,
  Signal,
  Subscription,
  VideoDemand,
} from "../../shared/protocol";
import type { Captures } from "./capture";
import { mediaDeadline } from "./deadline";
import { videoEncoding } from "./video-quality";
import { addRemoteTrack, removeRemoteTrack } from "./remote-stream";
export interface PeerInfo {
  id: string;
  publicationId: string;
  owner: string;
  viewer: string;
  tier: string;
  kind: string;
  sending: boolean;
  state: RTCPeerConnectionState;
  rtt?: number;
  relay?: boolean;
  bitrate?: number;
  width?: number;
  height?: number;
  fps?: number;
  bytes?: number;
  loss?: number;
  error?: string;
  attempts: number;
  localCandidates?: number;
  remoteCandidates?: number;
  gathering?: RTCIceGatheringState;
  sentIce?: number;
  iceEvents?: number;
  receivedIce?: number;
  rejectedSignals?: number;
}
interface Peer {
  videoSender?: RTCRtpSender;
  sub: Subscription;
  pc: RTCPeerConnection;
  stream: MediaStream;
  outgoing: boolean;
  round: number;
  queue: Promise<void>;
  candidates: Signal[];
  timer?: ReturnType<typeof setTimeout>;
  attempts: number;
  started: boolean;
  lastBytes?: number;
  lastTime?: number;
  sourceHeight?: number;
  info: PeerInfo;
  events: AbortController;
}
export class Peers {
  entries = new Map<string, Peer>();
  ice: IceConfig = { iceServers: [], expiresAt: 0, turn: false };
  forceRelay = false;
  private statsTimer: ReturnType<typeof setInterval>;
  private collecting = false;
  private pendingVideoDemand = new Map<string, VideoDemand>();
  private accepting = new Set<string>();
  private generation = 0;
  constructor(
    private me: () => string,
    private captures: Captures,
    private send: (signal: Signal) => void,
    private changed: () => void,
    private online: () => boolean,
    private freshIce: () => Promise<IceConfig>,
  ) {
    this.statsTimer = setInterval(() => void this.stats(), 2000);
  }
  infos() {
    return [...this.entries.values()].map((p) => p.info);
  }
  stream(publicationId: string, tier = "main") {
    return [...this.entries.values()].find(
      (p) =>
        !p.outgoing &&
        p.sub.publication.id === publicationId &&
        p.sub.tier === tier,
    )?.stream;
  }
  private serial(peer: Peer, fn: () => Promise<void>) {
    peer.queue = peer.queue
      .then(async () => {
        if (this.entries.get(peer.sub.id) === peer) await fn();
      })
      .catch((e) => {
        peer.info.error =
          e instanceof Error ? e.message : "Falha na negociação.";
        this.changed();
      });
    return peer.queue;
  }
  async accept(sub: Subscription) {
    const generation = this.generation;
    if (this.ice.expiresAt < Date.now()) {
      this.accepting.add(sub.id);
      const ice = await this.freshIce();
      // close() during the await drops the id; creating the PC now would orphan it.
      if (!this.accepting.delete(sub.id) || generation !== this.generation)
        return;
      this.ice = ice;
    }
    const existing = this.entries.get(sub.id);
    if (existing) {
      if (existing.pc.connectionState === "failed") this.recover(existing);
      return;
    }
    const outgoing = sub.publication.owner === this.me();
    if (outgoing && !this.captures.sources.has(sub.publication.kind)) return;
    const pendingDemand = this.pendingVideoDemand.get(sub.id);
    if (
      outgoing &&
      sub.tier === "main" &&
      sub.publication.kind === "screen" &&
      pendingDemand
    )
      sub = { ...sub, demand: pendingDemand };
    this.pendingVideoDemand.delete(sub.id);
    const pc = new RTCPeerConnection({
      iceServers: this.ice.iceServers,
      iceTransportPolicy: this.forceRelay ? "relay" : "all",
    });
    const info: PeerInfo = {
      id: sub.id,
      publicationId: sub.publication.id,
      owner: sub.publication.owner,
      viewer: sub.viewer,
      tier: sub.tier,
      kind: sub.publication.kind,
      sending: outgoing,
      state: "new",
      attempts: 0,
    };
    const peer: Peer = {
      sub,
      pc,
      info,
      outgoing,
      stream: new MediaStream(),
      round: 0,
      queue: Promise.resolve(),
      candidates: [],
      attempts: 0,
      started: false,
      events: new AbortController(),
    };
    this.entries.set(sub.id, peer);
    pc.addEventListener(
      "icecandidate",
      (e) => {
        info.iceEvents = (info.iceEvents || 0) + 1;
        if (e.candidate) {
          info.sentIce = (info.sentIce || 0) + 1;
          this.send({
            id: sub.id,
            round: peer.round,
            candidate: {
              candidate: e.candidate.candidate,
              sdpMid: e.candidate.sdpMid,
              sdpMLineIndex: e.candidate.sdpMLineIndex,
              usernameFragment: e.candidate.usernameFragment,
            },
          });
        }
      },
      { signal: peer.events.signal },
    );
    pc.ontrack = (e) => {
      addRemoteTrack(peer.stream, e.track);
      e.track.onunmute = () => this.changed();
      e.track.onended = () => {
        removeRemoteTrack(peer.stream, e.track);
        this.changed();
      };
      this.changed();
    };
    pc.onconnectionstatechange = () => {
      info.state = pc.connectionState;
      if (pc.connectionState === "connected") {
        clearTimeout(peer.timer);
        peer.timer = undefined;
        peer.attempts = 0;
        info.attempts = 0;
        info.error = undefined;
      } else if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      )
        this.recover(peer);
      this.changed();
    };
    if (outgoing)
      await this.serial(peer, async () => {
        const stream =
          sub.tier === "preview"
            ? await this.captures.previewStream()
            : this.captures.sources.get(sub.publication.kind)?.stream;
        if (this.entries.get(sub.id) !== peer) {
          if (
            ![...this.entries.values()].some(
              (p) => p.outgoing && p.sub.tier === "preview",
            )
          )
            this.captures.stopPreview();
          return;
        }
        if (!stream) throw new Error("A captura foi encerrada.");
        for (const track of stream.getTracks()) {
          const sender = pc.addTrack(track, stream);
          if (track.kind === "video") peer.videoSender = sender;
        }
        peer.started = true;
        await this.offer(peer, false);
      });
    if (pc.connectionState !== "connected") this.recover(peer);
    this.changed();
  }
  private async offer(peer: Peer, restart: boolean) {
    if (!this.online() || peer.pc.signalingState !== "stable") return;
    peer.round++;
    await peer.pc.setLocalDescription(
      await peer.pc.createOffer({ iceRestart: restart }),
    );
    this.send({
      id: peer.sub.id,
      round: peer.round,
      description: { type: "offer", sdp: peer.pc.localDescription!.sdp },
    });
  }
  signal(signal: Signal) {
    const peer = this.entries.get(signal.id);
    if (!peer) return;
    if (signal.candidate)
      peer.info.receivedIce = (peer.info.receivedIce || 0) + 1;
    return this.serial(peer, async () => {
      if (signal.restart) {
        if (peer.outgoing) await this.offer(peer, true);
        return;
      }
      if (signal.description) {
        if (signal.round < peer.round) return;
        if (peer.outgoing) {
          if (
            signal.description.type !== "answer" ||
            signal.round !== peer.round ||
            peer.pc.signalingState !== "have-local-offer"
          )
            return;
        } else {
          if (signal.description.type !== "offer") return;
          peer.round = signal.round;
        }
        await peer.pc.setRemoteDescription(signal.description);
        if (!peer.outgoing) {
          await peer.pc.setLocalDescription(await peer.pc.createAnswer());
          this.send({
            id: peer.sub.id,
            round: peer.round,
            description: { type: "answer", sdp: peer.pc.localDescription!.sdp },
          });
        }
        const queued = peer.candidates.splice(0);
        for (const item of queued)
          if (item.round === peer.round)
            await peer.pc.addIceCandidate(item.candidate!);
        if (peer.outgoing) await this.parameters(peer);
      } else if (signal.candidate) {
        if (signal.round < peer.round) return;
        if (!peer.pc.remoteDescription || signal.round > peer.round) {
          if (peer.candidates.length < 128) peer.candidates.push(signal);
          return;
        }
        await peer.pc.addIceCandidate(signal.candidate);
      }
    });
  }
  private recover(peer: Peer) {
    if (peer.timer || !this.entries.has(peer.sub.id)) return;
    peer.timer = setTimeout(
      () => {
        peer.timer = undefined;
        if (peer.pc.connectionState === "connected") return;
        if (!this.online()) {
          this.recover(peer);
          return;
        }
        peer.attempts = Math.min(5, peer.attempts + 1);
        peer.info.attempts = peer.attempts;
        void this.serial(peer, async () => {
          if (this.ice.expiresAt < Date.now() + 60000)
            this.ice = await this.freshIce();
          peer.pc.setConfiguration({
            iceServers: this.ice.iceServers,
            iceTransportPolicy: this.forceRelay ? "relay" : "all",
          });
          if (peer.outgoing) {
            if (peer.pc.signalingState === "have-local-offer")
              await peer.pc.setLocalDescription({ type: "rollback" });
            await this.offer(peer, true);
          } else
            this.send({ id: peer.sub.id, round: peer.round, restart: true });
        });
        if (peer.attempts >= 4)
          peer.info.error =
            "A mídia ainda não voltou. Continuamos tentando; redes restritas podem precisar de TURN.";
        this.recover(peer);
        this.changed();
      },
      Math.min(2000 * 2 ** peer.attempts, 30000) * (0.85 + Math.random() * 0.3),
    );
  }
  resume() {
    for (const peer of this.entries.values())
      if (peer.pc.connectionState !== "connected") {
        if (peer.outgoing && peer.started)
          void this.serial(peer, () => this.offer(peer, true));
        this.recover(peer);
      }
  }
  restartOutgoing() {
    for (const peer of this.entries.values())
      if (peer.outgoing && peer.started)
        void this.serial(peer, async () => {
          if (peer.pc.signalingState === "have-local-offer")
            await peer.pc.setLocalDescription({ type: "rollback" });
          await this.offer(peer, true);
        });
  }
  async demand(id: string, demand: VideoDemand) {
    const peer = this.entries.get(id);
    if (!peer) {
      this.pendingVideoDemand.set(id, demand);
      while (this.pendingVideoDemand.size > 512)
        this.pendingVideoDemand.delete(
          this.pendingVideoDemand.keys().next().value!,
        );
      return;
    }
    if (
      !peer.outgoing ||
      peer.sub.tier !== "main" ||
      peer.sub.publication.kind !== "screen"
    )
      return;
    peer.sub.demand = { video: demand.video, height: demand.height };
    await this.serial(peer, () => this.parameters(peer));
  }
  async parameters(peer: Peer) {
    const sender = peer.videoSender;
    if (!sender) return;
    const source = this.captures.sources
      .get(peer.sub.publication.kind)
      ?.stream.getVideoTracks()[0];
    const demand = peer.sub.demand;
    const active = demand?.video !== "off";
    if (!sender.track && active && source) await sender.replaceTrack(source);
    const height = (sender.track || source)?.getSettings().height;
    const quality = { ...this.captures.quality };
    if (demand && peer.sub.tier === "main") {
      quality.resolution = Math.min(quality.resolution, demand.height);
      if (demand.video === "small") {
        quality.fps = Math.min(quality.fps, 12);
        quality.bitrate = Math.min(quality.bitrate, 450);
      } else if (demand.video === "fit")
        quality.bitrate = Math.min(
          quality.bitrate,
          Math.max(
            500,
            Math.round(
              quality.bitrate *
                (quality.resolution / this.captures.quality.resolution),
            ),
          ),
        );
    }
    const p = sender.getParameters();
    if (!p.encodings?.length) {
      if (!active) await sender.replaceTrack(null);
      return;
    }
    Object.assign(
      p.encodings[0],
      videoEncoding(quality, peer.sub.publication.kind, peer.sub.tier, height),
      { active },
    );
    try {
      await mediaDeadline(
        sender.setParameters(p),
        "O navegador não confirmou os parâmetros do envio.",
      );
      peer.sourceHeight = height;
    } catch {
      if (!active) {
        await sender.replaceTrack(null);
        peer.sourceHeight = height;
      } else
        peer.info.error =
          "O navegador limitou os parâmetros do envio; confira as estatísticas efetivas.";
    }
  }
  async update(kind: string) {
    for (const peer of this.entries.values())
      if (
        peer.outgoing &&
        peer.sub.publication.kind === kind &&
        peer.sub.tier !== "preview"
      ) {
        await this.serial(peer, async () => {
          const source = this.captures.sources.get(peer.sub.publication.kind);
          for (const sender of peer.pc.getSenders()) {
            const track = source?.stream
              .getTracks()
              .find((t) => t.kind === sender.track?.kind);
            if (track && sender.track !== track)
              await sender.replaceTrack(track);
          }
          await this.parameters(peer);
        });
      }
  }
  close(id: string) {
    this.pendingVideoDemand.delete(id);
    this.accepting.delete(id);
    const peer = this.entries.get(id);
    if (!peer) return;
    this.entries.delete(id);
    clearTimeout(peer.timer);
    peer.events.abort();
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    peer.stream.getTracks().forEach((t) => {
      t.onended = null;
      t.onunmute = null;
      t.stop();
    });
    if (
      ![...this.entries.values()].some(
        (p) => p.outgoing && p.sub.tier === "preview",
      )
    )
      this.captures.stopPreview();
    this.changed();
  }
  closePublication(id: string) {
    for (const peer of [...this.entries.values()])
      if (peer.sub.publication.id === id) this.close(peer.sub.id);
  }
  async stats() {
    if (this.collecting) return;
    this.collecting = true;
    try {
      await Promise.allSettled(
        [...this.entries.values()].map(async (peer) => {
          if (peer.pc.connectionState === "closed") return;
          if (
            peer.outgoing &&
            peer.sub.publication.kind === "screen" &&
            peer.sub.tier === "main"
          ) {
            const height = this.captures.sources
              .get("screen")
              ?.stream.getVideoTracks()[0]
              ?.getSettings().height;
            if (height !== peer.sourceHeight)
              await this.serial(peer, () => this.parameters(peer));
          }
          const stats = await peer.pc.getStats();
          let selected: any;
          let localCandidates = 0,
            remoteCandidates = 0;
          stats.forEach((stat) => {
            if (stat.type === "local-candidate") localCandidates++;
            if (stat.type === "remote-candidate") remoteCandidates++;
            if (stat.type === "transport" && stat.selectedCandidatePairId)
              selected = stats.get(stat.selectedCandidatePairId);
          });
          Object.assign(peer.info, {
            localCandidates,
            remoteCandidates,
            gathering: peer.pc.iceGatheringState,
          });
          if (peer.pc.iceGatheringState === "complete" && !localCandidates)
            peer.info.error =
              "Nenhuma rota de mídia foi encontrada. Verifique a rede ou configure TURN.";
          if (!selected)
            stats.forEach((s) => {
              if (
                s.type === "candidate-pair" &&
                s.state === "succeeded" &&
                s.nominated
              )
                selected = s;
            });
          if (selected) {
            peer.info.rtt =
              typeof selected.currentRoundTripTime === "number"
                ? Math.round(selected.currentRoundTripTime * 1000)
                : undefined;
            const local = stats.get(selected.localCandidateId),
              remote = stats.get(selected.remoteCandidateId);
            peer.info.relay =
              local?.candidateType === "relay" ||
              remote?.candidateType === "relay";
          }
          stats.forEach((s) => {
            if (
              s.type === (peer.outgoing ? "outbound-rtp" : "inbound-rtp") &&
              (s.kind === "video" || peer.sub.publication.kind === "voice")
            ) {
              const bytes = peer.outgoing ? s.bytesSent : s.bytesReceived;
              if (peer.lastTime && s.timestamp > peer.lastTime)
                peer.info.bitrate = Math.round(
                  ((bytes - (peer.lastBytes || 0)) * 8) /
                    (s.timestamp - peer.lastTime),
                );
              peer.lastTime = s.timestamp;
              peer.lastBytes = bytes;
              const packets = (s.packetsReceived || 0) + (s.packetsLost || 0);
              Object.assign(peer.info, {
                loss:
                  !peer.outgoing && packets > 0
                    ? (Math.max(0, s.packetsLost || 0) / packets) * 100
                    : undefined,
                bytes,
                width: s.frameWidth,
                height: s.frameHeight,
                fps: s.framesPerSecond,
              });
            }
          });
        }),
      );
      this.changed();
    } finally {
      this.collecting = false;
    }
  }
  closeAll() {
    this.generation++;
    this.pendingVideoDemand.clear();
    this.accepting.clear();
    for (const id of [...this.entries.keys()]) this.close(id);
  }
  destroy() {
    clearInterval(this.statsTimer);
    this.closeAll();
  }
}
