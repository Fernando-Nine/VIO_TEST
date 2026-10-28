import { randomUUID, createHmac } from "node:crypto";
import type { Server, Socket } from "socket.io";
import type { Config } from "./config";
import { RoomWidgets } from "./widgets";
import type {
  RoomNotice,
  SharedWidget,
  ChatMessageEvent,
  WidgetClosed,
  WidgetUpdatedEvent,
} from "../shared/widgets";
import { pollOpen, viewModuleState } from "../shared/room-modules";
import { defaultColor } from "../shared/colors";
import {
  Fault,
  Limits,
  stableId,
  generateCode,
  issueToken,
  issueRoomCredential,
  verifyRoomCredential,
  CREDENTIAL_ADMINS,
  log,
} from "./security";
import {
  canSetPermission,
  canUseWidget,
  permissionText,
  roleAllows,
  type RoomRole,
} from "../shared/permissions";
import {
  defaultPermissions,
  MAX_SCREENS,
  type RoomPermission,
  type RoomPermissions,
  schemas,
  commandSchema,
  signalSchema,
  type Participant,
  type Publication,
  type Snapshot,
  type Subscription,
  type Action,
  type JoinResult,
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
  widgets: RoomWidgets;
  notices: RoomNotice[];
  creatorId: string;
  permissions: RoomPermissions;
  touched: number;
  /**
   * Seat ranking (#226): the rank of the creator's credential (-1 = none).
   * While `provisional`, the creator got the seat without one (first back after
   * a restart, or succession) and a credential of at least this rank takes it.
   */
  creatorRank: number;
  provisional: boolean;
  /** State came from defaults: the next winning credential also restores it. */
  fresh: boolean;
  /** Admins who hold a lent seat get admin back when the creator returns. */
  lentFromAdmin?: string;
  /** Admins named by a credential who have not come back yet. */
  restoredAdmins: Set<string>;
}
/** Long enough to outlive a weekend; reissued on every join of the creator. */
const CREDENTIAL_TTL = 30 * 24 * 3600 * 1000;
const publishPermission = {
  screen: "guestScreen",
  voice: "guestVoice",
  camera: "guestCamera",
} as const satisfies Record<Publication["kind"], RoomPermission>;
function voiceBlocked(): never {
  throw new Fault(
    "VOICE_BLOCKED",
    "O dono da sala silenciou sua voz para todos. Aguarde ele liberar.",
  );
}
function refuse(role: RoomRole, key: RoomPermission): never {
  throw new Fault(
    "FORBIDDEN",
    role === "admin"
      ? `O criador não permite que administradores possam ${permissionText[key]}.`
      : `A sala não permite que convidados possam ${permissionText[key]}.`,
  );
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
  /** Widgets are left out unless asked: they travel in widget events. */
  snapshot(room: Room, viewerId?: string, widgets = true): Snapshot {
    return {
      epoch: this.epoch,
      code: room.code,
      createdAt: room.createdAt,
      serverTime: Date.now(),
      maxParticipants: null,
      recommendedParticipants: this.config.recommendedParticipants,
      ...(widgets && {
        widgets: room.widgets.list().map((w) => this.view(w, viewerId)),
      }),
      notices: room.notices,
      creatorId: room.creatorId,
      permissions: room.permissions,
      screenViewers: this.screenViewers(room),
      participants: [...room.members.values()].map(
        ({ socketId, lastSeen, ...member }) => member,
      ),
    };
  }
  private role(room: Room, id: string): RoomRole {
    return id === room.creatorId
      ? "creator"
      : room.members.get(id)?.role === "admin"
        ? "admin"
        : "guest";
  }
  /** Ends publications whose kind the owner's role no longer allows. */
  private enforcePublications(room: Room) {
    for (const member of room.members.values()) {
      const role = this.role(room, member.id);
      for (const p of [...member.publications])
        if (!roleAllows(room.permissions, role, publishPermission[p.kind]))
          this.removePublication(room, p);
    }
  }
  /** What a given viewer may see of a widget (hidden poll votes). */
  private view(widget: SharedWidget, viewerId?: string): SharedWidget {
    return widget.module && widget.moduleState
      ? {
          ...widget,
          moduleState: viewModuleState(
            widget.module,
            widget.moduleState,
            viewerId,
            Date.now(),
          ),
        }
      : widget;
  }
  private emitWidget(
    room: Room,
    id: string,
    widget: SharedWidget | null,
    closed?: WidgetClosed,
  ) {
    if (!widget?.module || widget.module.kind !== "poll") {
      this.io.to(room.code).emit("widget-updated", {
        id,
        widget,
        ...(closed && { closed }),
      } satisfies WidgetUpdatedEvent);
      return;
    }
    for (const member of room.members.values())
      if (member.socketId)
        this.io
          .to(member.socketId)
          .emit("widget-updated", { id, widget: this.view(widget, member.id) });
  }
  /** Polls with a deadline reveal their votes when time runs out. */
  private scheduleReveal(room: Room, widget: SharedWidget) {
    const { module, moduleState: state } = widget;
    if (
      module?.kind !== "poll" ||
      !state ||
      !pollOpen(module, state, Date.now())
    )
      return;
    if (!module.duration) return;
    const startedAt = state.startedAt!;
    setTimeout(
      () => {
        const current = room.widgets.entries.get(widget.id);
        if (
          this.rooms.get(room.code) === room &&
          current?.moduleState?.startedAt === startedAt &&
          !current.moduleState.closed
        )
          this.emitWidget(room, widget.id, current);
      },
      Math.max(0, startedAt + module.duration * 1000 - Date.now()) + 50,
    ).unref();
  }
  private screenViewers(room: Room): Record<string, string[]> {
    const viewers: Record<string, string[]> = {};
    for (const sub of room.subscriptions.values()) {
      if (sub.tier !== "main" || sub.publication.kind !== "screen") continue;
      const ids = (viewers[sub.publication.id] ||= []);
      if (!ids.includes(sub.viewer)) ids.push(sub.viewer);
    }
    return viewers;
  }
  private broadcastViewers(room: Room) {
    this.io.to(room.code).emit("screen-viewers", this.screenViewers(room));
  }
  /** `widgets`: true for everyone, or the one member (a joiner) who needs them. */
  broadcast(room: Room, widgets: boolean | string = false) {
    room.touched = Date.now();
    for (const member of room.members.values())
      if (member.socketId)
        this.io
          .to(member.socketId)
          .emit(
            "snapshot",
            this.snapshot(
              room,
              member.id,
              widgets === true || widgets === member.id,
            ),
          );
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
    if (sub.tier === "main" && sub.publication.kind === "screen")
      this.broadcastViewers(room);
  }
  private removePublication(room: Room, p: Publication) {
    for (const sub of [...room.subscriptions.values()])
      if (sub.publication.id === p.id) this.closeSub(room, sub);
    this.io.to(room.code).emit("publication-ended", p.id);
    const member = room.members.get(p.owner);
    if (member)
      member.publications = member.publications.filter((v) => v.id !== p.id);
  }
  private notice(room: Room, text: string) {
    room.notices.push({ id: randomUUID(), text, createdAt: Date.now() });
    room.notices = room.notices.slice(-30);
  }
  /** Signed creator seat; provisional seats sign rank 0 so any real one wins. */
  private credential(room: Room) {
    const admins = new Set(room.restoredAdmins);
    for (const m of room.members.values())
      if (m.role === "admin" && m.id !== room.creatorId) admins.add(m.id);
    return issueRoomCredential(this.config.secret, CREDENTIAL_TTL, {
      code: room.code,
      rank: room.provisional ? 0 : room.creatorRank,
      admins: [...admins].slice(-CREDENTIAL_ADMINS),
      permissions: room.permissions,
    });
  }
  private sendCredential(room: Room) {
    this.send(room, room.creatorId, "room-credential", this.credential(room));
  }
  private leave(room: Room, member: Member, explicit = false) {
    for (const p of [...member.publications]) this.removePublication(room, p);
    for (const sub of [...room.subscriptions.values()])
      if (sub.viewer === member.id) this.closeSub(room, sub);
    room.members.delete(member.id);
    room.widgets.forget(member.id);
    if (!room.members.size) {
      room.widgets.clear();
      room.notices = [];
      room.permissions = { ...defaultPermissions };
      room.creatorRank = -1;
      room.provisional = true;
      room.fresh = true;
      room.restoredAdmins.clear();
    }
    if (room.creatorId === member.id && room.members.size) {
      const members = [...room.members.values()];
      const next =
        members.find((m) => m.role === "admin" && m.online) ||
        members.find((m) => m.online) ||
        members.find((m) => m.role === "admin") ||
        members[0];
      room.creatorId = next.id;
      if (next.role === "admin") room.lentFromAdmin = next.id;
      next.role = "creator";
      // Leaving on purpose hands the seat over; timing out only lends it.
      if (explicit && !room.provisional) room.creatorRank = Date.now();
      else room.provisional = true;
      this.notice(
        room,
        room.provisional
          ? `${next.name} é o criador da sala até ${member.name} voltar.`
          : `${next.name} agora é o criador da sala.`,
      );
      this.sendCredential(room);
    }
    this.membership.delete(member.id);
    this.broadcast(room, true);
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
      role: 20,
      moderate: 30,
      "room-permissions": 30,
      "chat-send": 45,
      "module-interact": 240,
      "widget-permission": 30,
      "widget-create": 20,
      "widget-structure": 120,
      "widget-delete": 30,
      "widget-restore": 30,
      "widget-operate": 300,
      demand: 360,
      join: 12,
      leave: 12,
      call: 30,
      color: 20,
      publish: 30,
      unpublish: 30,
      state: 100,
      subscribe: 180,
      unsubscribe: 180,
      ping: 30,
      ice: 12,
      renew: 12,
    };
    // Widgets are clicked and edited in quick runs; these absorb a run at once.
    const bursts: Partial<Record<Action, number>> = {
      "module-interact": 60,
      "widget-structure": 40,
      "widget-operate": 60,
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
        this.limits.take(
          socket.data.id + ":" + cmd.action,
          rates[cmd.action],
          60000,
          bursts[cmd.action],
        );
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
  private probePing(socket: Socket) {
    const code = this.membership.get(socket.data.id);
    if (!code || socket.data.pingPending) return;
    socket.data.pingPending = true;
    const start = performance.now();
    socket.timeout(3000).emit("presence-probe", (error: Error | null) => {
      socket.data.pingPending = false;
      const room = this.rooms.get(code);
      const member = room?.members.get(socket.data.id);
      if (error || !member?.online || member.socketId !== socket.id) return;
      member.pingMs = Math.max(0, Math.round(performance.now() - start));
      this.io
        .to(code)
        .emit("participant-ping", { id: member.id, pingMs: member.pingMs });
    });
  }
  private async command(
    socket: Socket,
    action: Action,
    data: any,
  ): Promise<unknown> {
    if (action === "ping") {
      this.probePing(socket);
      return { serverTime: Date.now() };
    }
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
      const recreated = !!(data.code || current);
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
          widgets: new RoomWidgets(),
          notices: [],
          creatorId: socket.data.id,
          permissions: { ...defaultPermissions },
          touched: Date.now(),
          // A known code that is gone means a restart: its creator may return.
          creatorRank: recreated ? -1 : Date.now(),
          provisional: recreated,
          fresh: recreated,
          restoredAdmins: new Set(),
        };
        this.rooms.set(code, room);
      }
      let member = room.members.get(socket.data.id);
      if (member?.socketId && member.socketId !== socket.id)
        throw new Fault(
          "SESSION_IN_USE",
          "Esta sessão já está aberta em outra aba. Abra uma nova sessão.",
        );
      const empty = !room.members.size;
      if (empty) room.creatorId = socket.data.id;
      const claim = verifyRoomCredential(
        this.config.secret,
        data.credential,
        code,
      );
      const reclaim =
        !!claim &&
        (claim.rank > room.creatorRank ||
          (room.provisional && claim.rank >= room.creatorRank));
      let previous: Member | undefined;
      if (reclaim) {
        if (room.creatorId !== socket.data.id)
          previous = room.members.get(room.creatorId);
        room.creatorId = socket.data.id;
        room.creatorRank = claim.rank;
        room.provisional = claim.rank === 0;
        if (room.fresh) room.permissions = { ...claim.permissions };
        room.fresh = false;
        for (const id of claim.admins)
          if (id === socket.data.id) continue;
          else if (room.members.has(id)) room.members.get(id)!.role = "admin";
          else room.restoredAdmins.add(id);
        if (previous)
          previous.role =
            claim.admins.includes(previous.id) ||
            room.lentFromAdmin === previous.id
              ? "admin"
              : "guest";
        room.lentFromAdmin = undefined;
      }
      const restoredAdmin = room.restoredAdmins.delete(socket.data.id);
      member = {
        id: socket.data.id,
        name: data.name,
        role:
          room.creatorId === socket.data.id
            ? "creator"
            : restoredAdmin
              ? "admin"
              : member?.role || "guest",
        color: member?.color || data.color || defaultColor,
        online: true,
        inCall: member?.inCall || false,
        lastSeen: Date.now(),
        publications: member?.publications || [],
        socketId: socket.id,
      };
      room.members.set(member.id, member);
      this.membership.set(member.id, code);
      if (previous) {
        this.notice(
          room,
          `${member.name} voltou e é de novo o criador da sala.`,
        );
        this.send(room, previous.id, "room-credential", null);
        this.enforcePublications(room);
      } else if (empty && room.provisional && !reclaim)
        this.notice(
          room,
          `${member.name} é o criador da sala até o criador anterior voltar.`,
        );
      await socket.join(code);
      this.broadcast(room, member.id);
      for (const sub of room.subscriptions.values())
        if (sub.viewer === member.id || sub.publication.owner === member.id)
          socket.emit("subscription", sub);
      return {
        id: member.id,
        snapshot: this.snapshot(room, member.id),
        ...(room.creatorId === member.id && {
          credential: this.credential(room),
        }),
      } satisfies JoinResult;
    }
    const [room, m] = this.member(socket);
    const manages = m.id === room.creatorId || m.role === "admin";
    const deny = () => {
      throw new Fault(
        "FORBIDDEN",
        "Esta ação exige permissão do criador ou de um administrador da sala.",
      );
    };
    const role = this.role(room, m.id);
    const require = (key: RoomPermission) => {
      if (!roleAllows(room.permissions, role, key)) refuse(role, key);
    };
    const useWidget = (
      widget: SharedWidget | undefined,
      need: RoomPermission,
    ) => {
      if (!widget)
        throw new Fault("NOT_FOUND", "Este widget não está mais disponível.");
      if (!canUseWidget(room.permissions, role, m.id, widget, need))
        refuse(role, need);
    };
    if (action === "room-permissions") {
      if (!manages) deny();
      for (const key of Object.keys(data.permissions) as RoomPermission[])
        if (!canSetPermission(role, key))
          throw new Fault(
            "FORBIDDEN",
            `Só o criador decide se administradores podem ${permissionText[key]}.`,
          );
      room.permissions = { ...room.permissions, ...data.permissions };
      this.enforcePublications(room);
      this.sendCredential(room);
      this.broadcast(room);
      return room.permissions;
    }
    if (action === "moderate") {
      if (m.id !== room.creatorId)
        throw new Fault(
          "FORBIDDEN",
          "Só o dono da sala pode silenciar alguém para todos.",
        );
      const target = room.members.get(data.participantId);
      if (!target || target.id === m.id)
        throw new Fault("INVALID_REQUEST", "Escolha outra pessoa da sala.");
      target.voiceBlocked = data.voiceBlocked || undefined;
      if (target.voiceBlocked)
        for (const p of [...target.publications])
          if (p.kind === "voice") this.removePublication(room, p);
      this.broadcast(room);
      return {};
    }
    if (action === "role") {
      if (m.id !== room.creatorId) deny();
      const target = room.members.get(data.participantId);
      if (!target || target.id === m.id)
        throw new Fault("INVALID_REQUEST", "Escolha outra pessoa da sala.");
      if (data.action === "transfer") {
        if (room.provisional && target.role === "admin")
          room.lentFromAdmin = target.id;
        m.role = "admin";
        target.role = "creator";
        target.voiceBlocked = undefined;
        room.creatorId = target.id;
        // A provisional creator can only lend the seat it was lent.
        if (!room.provisional) room.creatorRank = Date.now();
        this.send(room, m.id, "room-credential", null);
        this.notice(room, `${target.name} agora é o criador da sala.`);
      } else target.role = data.action === "promote" ? "admin" : "guest";
      this.enforcePublications(room);
      this.sendCredential(room);
      this.broadcast(room);
      return {};
    }
    if (action === "module-interact") {
      const current = room.widgets.entries.get(data.id);
      if (
        ["reset", "task", "session", "poll-control"].includes(
          data.operation.kind,
        )
      )
        useWidget(current, "guestControl");
      const widget = room.widgets.interact(
        { id: m.id, name: m.name },
        data.id,
        data.operationId,
        data.operation,
      );
      this.emitWidget(room, data.id, widget);
      if (data.operation.kind === "poll-control")
        this.scheduleReveal(room, widget);
      return this.view(widget, m.id);
    }
    if (action === "chat-send") {
      useWidget(room.widgets.entries.get(data.id), "guestChat");
      const [widget, added] = room.widgets.message(data.id, {
        id: data.messageId,
        authorId: m.id,
        authorName: m.name,
        color: m.color,
        avatarUrl: m.avatarUrl,
        text: data.text,
        sentAt: Date.now(),
      });
      if (added)
        this.io.to(room.code).emit("chat-message", {
          id: data.id,
          revision: widget.revision,
          message: widget.messages!.at(-1)!,
        } satisfies ChatMessageEvent);
      return { id: data.id, revision: widget.revision };
    }
    if (action.startsWith("widget-")) {
      let widget;
      const current = room.widgets.entries.get(data.id);
      if (action === "widget-create") {
        if (
          data.content.kind === "notes" ||
          (!data.content.kind &&
            data.content.blocks.every(
              (b: { kind: string }) => b.kind === "text",
            ))
        )
          throw new Fault(
            "INVALID_REQUEST",
            "Notas foram substituídas pelo Chat.",
          );
        if (data.content.kind === "chat" && !manages) deny();
        // Room widgets only: personal widgets stay on the device (#104).
        require(role === "admin" ? "adminCreate" : "guestCreate");
        widget = room.widgets.create(m.id, data.id, data.content);
      }
      if (action === "widget-permission") {
        if (!manages) deny();
        if (data.participantId && !room.members.has(data.participantId))
          throw new Fault("NOT_FOUND", "Pessoa indisponível.");
        widget = room.widgets.permission(
          data.id,
          data.participantId,
          data.allowed,
        );
      }
      if (action === "widget-structure") {
        useWidget(current, "guestEdit");
        widget = room.widgets.structure(
          m.id,
          data.id,
          data.revision,
          data.content,
          true,
        );
      }
      if (action === "widget-operate") {
        useWidget(
          current,
          data.operation.kind === "timer" ? "guestControl" : "guestEdit",
        );
        widget = room.widgets.operate(
          m.id,
          data.id,
          data.operationId,
          data.operation,
        );
      }
      // Room owner, admins (if allowed) and the widget's creator close for all.
      const mayClose = (target: SharedWidget) => {
        if (target.owner === m.id) return;
        if (!manages) deny();
        if (role === "admin") require("adminClose");
      };
      let closed: WidgetClosed | undefined;
      if (action === "widget-delete") {
        if (current) mayClose(current);
        closed = room.widgets.close(data.id, m.id, m.name);
      }
      if (action === "widget-restore") {
        const held = room.widgets.held(data.id);
        if (held.by !== m.id) mayClose(held.widget);
        widget = room.widgets.restore(data.id);
        this.scheduleReveal(room, widget);
      }
      this.emitWidget(room, data.id, widget || null, closed);
      return widget ? this.view(widget, m.id) : {};
    }
    if (action === "demand") {
      const sub = room.subscriptions.get(data.id);
      if (
        !sub ||
        sub.viewer !== m.id ||
        sub.tier !== "main" ||
        sub.publication.kind === "voice"
      )
        throw new Fault("FORBIDDEN", "Demanda de vídeo não autorizada.");
      sub.demand = { video: data.video, height: data.height };
      this.send(room, sub.publication.owner, "video-demand", {
        id: sub.id,
        ...sub.demand,
      });
      return {};
    }
    if (action === "color") {
      m.color = data.color;
      this.broadcast(room);
      return { color: m.color };
    }
    if (action === "leave") {
      this.leave(room, m, true);
      await socket.leave(room.code);
      return {};
    }
    if (action === "call") {
      m.inCall = data.active;
      if (!m.inCall)
        for (const p of [...m.publications])
          if (p.kind !== "screen") this.removePublication(room, p);
      this.broadcast(room);
      return {};
    }
    if (action === "publish") {
      require(publishPermission[data.kind as Publication["kind"]]);
      if (data.kind === "voice" && m.voiceBlocked) voiceBlocked();
      if (data.kind !== "screen") m.inCall = true;
      let p = m.publications.find(
        (p) => p.kind === data.kind && p.key === data.key,
      );
      if (!p) {
        // Screens add up to MAX_SCREENS (#194); voice and camera replace.
        const same = m.publications.filter((p) => p.kind === data.kind);
        if (data.kind !== "screen")
          for (const existing of same) this.removePublication(room, existing);
        else if (same.length >= MAX_SCREENS)
          throw new Fault(
            "SCREEN_LIMIT",
            "Você já transmite 3 telas. Encerre uma para compartilhar outra.",
          );
        p = {
          id: stableId(
            this.config.secret,
            [m.id, data.kind, data.key].join(":"),
          ),
          owner: m.id,
          createdAt: Date.now(),
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
        if (sub.tier === "main" && p.kind === "screen")
          this.broadcastViewers(room);
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
