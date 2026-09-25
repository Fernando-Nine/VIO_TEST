import { randomUUID, createHmac } from "node:crypto";
import type { Server, Socket } from "socket.io";
import type { Config } from "./config";
import {
  Fault,
  Limits,
  stableId,
  generateCode,
  issueToken,
  log,
} from "./security";
import {
  schemas,
  commandSchema,
  signalSchema,
  type Participant,
  type Publication,
  type Snapshot,
  type Subscription,
  type Action,
} from "../shared/protocol";
interface Member extends Participant {
  socketId?: string;
  lastSeen: number;
}
interface Room {
  code: string;
  createdAt: number;
  members: Map<string, Member>;
  subscriptions: Map<string, Subscription>;
  touched: number;
}
export class Rooms {
  readonly epoch = randomUUID();
  readonly rooms = new Map<string, Room>();
  readonly membership = new Map<string, string>();
  private limits = new Limits();
  // Uma credencial da Cloudflare vale pra sala inteira, não por participante —
  // ao contrário do username do coturn, que embute o id de quem pediu. Isso é
  // o pretendido: TURN autentica contra o relay, não identifica quem é quem no
  // VIO, e reemitir uma credencial nova a cada "ice" bateria a API deles sem
  // necessidade. Guarda até faltar um minuto pra expirar.
  private cloudflareIce: { iceServers: unknown[]; expiresAt: number } | null =
    null;
  constructor(
    private io: Server,
    private config: Config,
  ) {}
  private async fetchCloudflareIce(): Promise<{
    iceServers: unknown[];
    expiresAt: number;
  }> {
    const now = Date.now();
    if (this.cloudflareIce && this.cloudflareIce.expiresAt - now > 60_000)
      return this.cloudflareIce;
    const ttl = this.config.turnTtl;
    let response: Response;
    try {
      response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${this.config.cloudflareTurnKeyId}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.cloudflareTurnApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl }),
          signal: AbortSignal.timeout(8000),
        },
      );
    } catch (e) {
      log("cloudflare_turn_unreachable", {
        error: e instanceof Error ? e.message : String(e),
      });
      throw new Fault(
        "TURN_UNAVAILABLE",
        "Não foi possível obter credenciais de relay agora. Tente de novo em instantes.",
      );
    }
    if (!response.ok) {
      log("cloudflare_turn_error", { status: response.status });
      throw new Fault(
        "TURN_UNAVAILABLE",
        "Não foi possível obter credenciais de relay agora. Tente de novo em instantes.",
      );
    }
    const body = (await response.json().catch(() => null)) as {
      iceServers?: unknown[];
    } | null;
    if (!body || !Array.isArray(body.iceServers)) {
      log("cloudflare_turn_bad_response", {});
      throw new Fault(
        "TURN_UNAVAILABLE",
        "Resposta inesperada do provedor de relay.",
      );
    }
    const result = { iceServers: body.iceServers, expiresAt: now + ttl * 1000 };
    this.cloudflareIce = result;
    return result;
  }
  snapshot(room: Room): Snapshot {
    return {
      epoch: this.epoch,
      code: room.code,
      createdAt: room.createdAt,
      serverTime: Date.now(),
      maxParticipants: null,
      recommendedParticipants: this.config.recommendedParticipants,
      participants: [...room.members.values()].map(
        ({ socketId, lastSeen, ...member }) => member,
      ),
    };
  }
  broadcast(room: Room) {
    room.touched = Date.now();
    this.io.to(room.code).emit("snapshot", this.snapshot(room));
  }
  private member(socket: Socket): [Room, Member] {
    const code = this.membership.get(socket.data.id);
    const room = code && this.rooms.get(code);
    const member = room && room.members.get(socket.data.id);
    if (!room || !member || member.socketId !== socket.id)
      throw new Fault("NOT_JOINED", "Entre em uma sala para continuar.");
    return [room, member];
  }
  private send(room: Room, id: string, event: string, data: unknown) {
    const s = room.members.get(id)?.socketId;
    if (s) this.io.to(s).emit(event, data);
  }
  private closeSub(room: Room, sub: Subscription) {
    room.subscriptions.delete(sub.id);
    this.send(room, sub.viewer, "subscription-ended", sub.id);
    this.send(room, sub.publication.owner, "subscription-ended", sub.id);
  }
  private removePublication(room: Room, p: Publication) {
    for (const sub of [...room.subscriptions.values()])
      if (sub.publication.id === p.id) this.closeSub(room, sub);
    this.io.to(room.code).emit("publication-ended", p.id);
    const member = room.members.get(p.owner);
    if (member)
      member.publications = member.publications.filter((v) => v.id !== p.id);
  }
  private leave(room: Room, member: Member) {
    for (const p of [...member.publications]) this.removePublication(room, p);
    for (const sub of [...room.subscriptions.values()])
      if (sub.viewer === member.id) this.closeSub(room, sub);
    room.members.delete(member.id);
    this.membership.delete(member.id);
    this.broadcast(room);
  }
  clean() {
    this.limits.clean();
    const now = Date.now();
    for (const room of this.rooms.values()) {
      for (const m of room.members.values())
        if (!m.online && now - m.lastSeen > this.config.grace)
          this.leave(room, m);
      if (!room.members.size && now - room.touched > this.config.roomTtl)
        this.rooms.delete(room.code);
    }
  }
  bind(socket: Socket) {
    const rates: Record<Action, number> = {
      join: 12,
      leave: 12,
      publish: 30,
      unpublish: 30,
      state: 100,
      subscribe: 180,
      unsubscribe: 180,
      ping: 30,
      ice: 12,
      renew: 12,
    };
    socket.on("command", async (raw: unknown, ack: unknown) => {
      if (typeof ack !== "function") return;
      try {
        if (socket.data.expires < Date.now())
          throw new Fault(
            "SESSION_EXPIRED",
            "Sua sessão expirou. Reconecte para continuar.",
          );
        const cmd = commandSchema.parse(raw);
        this.limits.take(socket.data.id + ":" + cmd.action, rates[cmd.action]);
        if (cmd.action === "join")
          this.limits.take(socket.data.ip + ":join", 40);
        const data = schemas[cmd.action].parse(cmd.data);
        const result = await this.command(socket, cmd.action, data);
        ack({ ok: true, data: result });
      } catch (e) {
        const f =
          e instanceof Fault
            ? e
            : new Fault(
                "INVALID_REQUEST",
                "Pedido inválido ou fora dos limites.",
              );
        ack({ ok: false, code: f.code, message: f.message });
      }
    });
    socket.on("signal", (raw: unknown, ack?: (value: unknown) => void) => {
      try {
        this.limits.take(socket.data.id + ":signal", 600);
        if (socket.data.expires < Date.now())
          throw new Fault("SESSION_EXPIRED", "Sessão expirada.");
        const signal = signalSchema.parse(raw);
        const [room, m] = this.member(socket);
        const sub = room.subscriptions.get(signal.id);
        if (!sub || (sub.viewer !== m.id && sub.publication.owner !== m.id))
          throw new Fault("FORBIDDEN", "Conexão não autorizada.");
        if (
          (signal.description?.type === "offer" &&
            m.id !== sub.publication.owner) ||
          (signal.description?.type === "answer" && m.id !== sub.viewer) ||
          (signal.restart && m.id !== sub.viewer)
        )
          throw new Fault("FORBIDDEN", "Negociação inválida.");
        this.send(
          room,
          m.id === sub.viewer ? sub.publication.owner : sub.viewer,
          "signal",
          signal,
        );
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, code: "FORBIDDEN" });
      }
    });
    socket.on("disconnect", () => {
      const code = this.membership.get(socket.data.id);
      const room = code && this.rooms.get(code);
      const m = room && room.members.get(socket.data.id);
      if (room && m && m.socketId === socket.id) {
        m.online = false;
        m.socketId = undefined;
        m.lastSeen = Date.now();
        this.broadcast(room);
      }
    });
  }
  private async command(
    socket: Socket,
    action: Action,
    data: any,
  ): Promise<unknown> {
    if (action === "ping") return { serverTime: Date.now() };
    if (action === "renew") {
      const result = issueToken(
        this.config.secret,
        this.config.sessionTtl,
        socket.data.id,
      );
      socket.data.expires = result.expiresAt;
      return result;
    }
    if (action === "join") {
      const current = this.membership.get(socket.data.id);
      const code = data.code || current || generateCode();
      if (current && current !== code)
        throw new Fault(
          "ALREADY_JOINED",
          "Saia da sala atual antes de entrar em outra.",
        );
      let room = this.rooms.get(code);
      if (!room) {
        if (this.rooms.size >= this.config.maxRooms)
          throw new Fault(
            "CAPACITY",
            "O serviço está ocupado. Tente novamente em instantes.",
          );
        room = {
          code,
          createdAt: Date.now(),
          members: new Map(),
          subscriptions: new Map(),
          touched: Date.now(),
        };
        this.rooms.set(code, room);
      }
      let member = room.members.get(socket.data.id);
      if (member?.socketId && member.socketId !== socket.id)
        throw new Fault(
          "SESSION_IN_USE",
          "Esta sessão já está aberta em outra aba. Abra uma nova sessão.",
        );
      member = {
        id: socket.data.id,
        name: data.name,
        online: true,
        lastSeen: Date.now(),
        publications: member?.publications || [],
        socketId: socket.id,
      };
      room.members.set(member.id, member);
      this.membership.set(member.id, code);
      await socket.join(code);
      this.broadcast(room);
      for (const sub of room.subscriptions.values())
        if (sub.viewer === member.id || sub.publication.owner === member.id)
          socket.emit("subscription", sub);
      return { id: member.id, snapshot: this.snapshot(room) };
    }
    const [room, m] = this.member(socket);
    if (action === "leave") {
      this.leave(room, m);
      await socket.leave(room.code);
      return {};
    }
    if (action === "publish") {
      let p = m.publications.find(
        (p) => p.kind === data.kind && p.key === data.key,
      );
      if (!p) {
        const existing = m.publications.find((p) => p.kind === data.kind);
        if (existing) this.removePublication(room, existing);
        p = {
          id: stableId(
            this.config.secret,
            [m.id, data.kind, data.key].join(":"),
          ),
          owner: m.id,
          kind: data.kind,
          key: data.key,
          audio: data.audio,
          muted: data.muted,
        };
        m.publications.push(p);
      } else {
        p.audio = data.audio;
        p.muted = data.muted;
      }
      this.broadcast(room);
      return p;
    }
    if (action === "unpublish" || action === "state") {
      const p = m.publications.find((p) => p.id === data.publicationId);
      if (!p) throw new Fault("NOT_FOUND", "Esta fonte já foi encerrada.");
      if (action === "unpublish") this.removePublication(room, p);
      else p.muted = data.muted;
      this.broadcast(room);
      return {};
    }
    if (action === "subscribe") {
      const p = [...room.members.values()]
        .flatMap((m) => m.publications)
        .find((p) => p.id === data.publicationId);
      if (!p || p.owner === m.id)
        throw new Fault("NOT_FOUND", "Transmissão indisponível.");
      if (data.tier === "preview" && p.kind !== "screen")
        throw new Fault("INVALID_REQUEST", "Miniatura inválida.");
      const own = [...room.subscriptions.values()].filter(
        (s) => s.viewer === m.id,
      );
      if (data.tier === "main" && p.kind === "screen")
        for (const s of own)
          if (
            s.tier === "main" &&
            s.publication.kind === "screen" &&
            s.publication.id !== p.id
          )
            this.closeSub(room, s);
      if (
        data.tier === "preview" &&
        own.filter((s) => s.tier === "preview" && s.publication.id !== p.id)
          .length >= this.config.maxPreviews
      )
        throw new Fault("PREVIEW_LIMIT", "Limite de miniaturas atingido.");
      const id = stableId(
        this.config.secret,
        [p.id, m.id, data.tier, data.nonce].join(":"),
      );
      for (const s of own)
        if (s.publication.id === p.id && s.tier === data.tier && s.id !== id)
          this.closeSub(room, s);
      let sub = room.subscriptions.get(id);
      if (!sub) {
        sub = {
          id,
          publication: p,
          viewer: m.id,
          tier: data.tier,
          nonce: data.nonce,
        };
        room.subscriptions.set(id, sub);
      }
      this.send(room, m.id, "subscription", sub);
      this.send(room, p.owner, "subscription", sub);
      return sub;
    }
    if (action === "unsubscribe") {
      const sub = room.subscriptions.get(data.id);
      if (sub && sub.viewer !== m.id)
        throw new Fault("FORBIDDEN", "Assinatura não autorizada.");
      if (sub) this.closeSub(room, sub);
      return {};
    }
    if (action === "ice") {
      // Três jeitos de ligar TURN, mutuamente exclusivos (config.ts garante que
      // só um deles vem preenchido): Cloudflare Realtime, que emite a credencial
      // do lado dela e este servidor só repassa; credencial efêmera derivada
      // aqui por HMAC (coturn); ou par usuário/senha estático da config.
      if (this.config.cloudflareTurnKeyId) {
        const { iceServers, expiresAt } = await this.fetchCloudflareIce();
        return { iceServers, expiresAt, turn: true };
      }
      const expiresAt = Date.now() + this.config.turnTtl * 1000;
      const iceServers: unknown[] = [];
      if (this.config.stunUrls.length)
        iceServers.push({ urls: this.config.stunUrls });
      if (this.config.turnUrls.length) {
        // Credencial estática não tem o que derivar: vai como veio da config.
        // O expiresAt acima continua valendo como cadência de renovação do
        // cliente, mas aqui ele não expira nada — só a troca manual da senha no
        // painel do provedor invalida.
        if (this.config.turnUsername) {
          iceServers.push({
            urls: this.config.turnUrls,
            username: this.config.turnUsername,
            credential: this.config.turnPassword,
          });
        } else {
          const username = Math.floor(expiresAt / 1000) + ":" + m.id;
          iceServers.push({
            urls: this.config.turnUrls,
            username,
            credential: createHmac("sha1", this.config.turnSecret)
              .update(username)
              .digest("base64"),
          });
        }
      }
      return { iceServers, expiresAt, turn: !!this.config.turnUrls.length };
    }
    throw new Fault("INVALID_REQUEST", "Ação desconhecida.");
  }
}
