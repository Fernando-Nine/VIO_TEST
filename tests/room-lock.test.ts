import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { io, type Socket } from "socket.io-client";
import { createApp } from "../src/server/app";
import { readConfig } from "../src/server/config";
import {
  issueInvite,
  issueRoomCredential,
  issueToken,
  verifyInvite,
  verifyRoomCredential,
} from "../src/server/security";
import {
  defaultPermissions,
  type Admission,
  type InviteResult,
  type JoinResult,
  type Reply,
  type WaitingPerson,
} from "../src/shared/protocol";

// #242: locked room, waiting room and signed invites.
const origin = "http://localhost:3000";
const secret = "test-only-room-lock-secret-value-000";
async function server() {
  const app = await createApp(
    readConfig({
      PORT: "0",
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: origin,
      STUN_URLS: "",
    }),
  );
  app.http.listen(0, "127.0.0.1");
  await once(app.http, "listening");
  const address = app.http.address() as { port: number };
  return { ...app, url: `http://127.0.0.1:${address.port}` };
}
const sockets: Socket[] = [];
async function person(url: string) {
  const session = issueToken(secret, 3_600_000);
  const socket = io(url, {
    transports: ["websocket"],
    auth: { token: session.token },
    extraHeaders: { Origin: origin },
    reconnection: false,
  });
  sockets.push(socket);
  await new Promise((resolve) => socket.once("connect", () => resolve(0)));
  const seen: { waiting?: WaitingPerson[] } = {};
  socket.on("waiting-list", (list: WaitingPerson[]) => (seen.waiting = list));
  return { socket, id: session.id, seen };
}
function request<T = unknown>(socket: Socket, action: string, data = {}) {
  return new Promise<T>((resolve, reject) =>
    socket
      .timeout(3000)
      .emit("command", { action, data }, (e: Error | null, r: Reply<T>) =>
        e ? reject(e) : r.ok ? resolve(r.data) : reject(new Error(r.code)),
      ),
  );
}
const join = (socket: Socket, data: Record<string, unknown>) =>
  request<JoinResult>(socket, "join", data);
const next = <T>(socket: Socket, event: string) =>
  new Promise<T>((resolve) => socket.once(event, resolve));
const admission = (socket: Socket) => next<Admission>(socket, "admission");
const waitingCount = (p: { seen: { waiting?: WaitingPerson[] } }) =>
  p.seen.waiting?.length;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
test.after(() => sockets.forEach((s) => s.disconnect()));

test("convite: assinatura, sala, validade e separado da credencial", () => {
  const body = { code: "ROOMA", gen: "abcdefgh123", exp: Date.now() + 60000 };
  const good = issueInvite(secret, body);
  assert.equal(verifyInvite(secret, good, "ROOMA")?.gen, body.gen);
  assert.equal(verifyInvite(secret, good, "ROOMB"), null);
  assert.equal(verifyInvite(secret + "x", good, "ROOMA"), null);
  assert.equal(verifyInvite(secret, good.slice(0, -4) + "AAAA", "ROOMA"), null);
  assert.equal(
    verifyInvite(secret, issueInvite(secret, { ...body, exp: 1 }), "ROOMA"),
    null,
  );
  // An invite never works as a creator seat, nor the other way around.
  assert.equal(verifyRoomCredential(secret, good, "ROOMA"), null);
  const seat = issueRoomCredential(secret, 60000, {
    code: "ROOMA",
    rank: 1,
    admins: [],
    permissions: defaultPermissions,
  });
  assert.equal(verifyInvite(secret, seat, "ROOMA"), null);
  // Credentials signed before `locked` existed still verify.
  assert.equal(verifyRoomCredential(secret, seat, "ROOMA")?.rank, 1);
});

test("sala trancada: conhecidos entram, os demais esperam aprovação", async () => {
  const app = await server();
  try {
    const ana = await person(app.url);
    const bia = await person(app.url);
    const code = (await join(ana.socket, { name: "Ana" })).snapshot.code;
    await join(bia.socket, { name: "Bia", code });
    const permissions = await request<{ locked?: boolean }>(
      ana.socket,
      "room-permissions",
      { permissions: { locked: true } },
    );
    assert.equal(permissions.locked, true);
    // Someone who was already here comes back straight in.
    await request(bia.socket, "leave");
    await join(bia.socket, { name: "Bia", code });

    const caio = await person(app.url);
    const waitingEvent = next<{ expiresAt: number }>(caio.socket, "waiting");
    await assert.rejects(join(caio.socket, { name: "Caio", code }), /WAITING/);
    assert.ok((await waitingEvent).expiresAt > Date.now());
    await delay(50);
    assert.equal(ana.seen.waiting?.length, 1);
    assert.equal(ana.seen.waiting![0].name, "Caio");
    assert.equal(waitingCount(bia), undefined, "guests do not see the line");
    const request_ = ana.seen.waiting![0].id;
    await assert.rejects(
      request(bia.socket, "admit", { id: request_, allow: true }),
      /FORBIDDEN/,
    );
    // Waiting is not membership.
    await assert.rejects(request(caio.socket, "color", { color: "#112233" }));
    const allowed = admission(caio.socket);
    await request(ana.socket, "admit", { id: request_, allow: true });
    assert.equal((await allowed).allowed, true);
    assert.equal(ana.seen.waiting?.length, 0);
    const entered = await join(caio.socket, { name: "Caio", code });
    assert.ok(entered.snapshot.participants.some((p) => p.id === caio.id));

    // Turned away: cannot knock again right away.
    const davi = await person(app.url);
    await assert.rejects(join(davi.socket, { name: "Davi", code }), /WAITING/);
    await delay(50);
    const refused = admission(davi.socket);
    await request(ana.socket, "admit", {
      id: ana.seen.waiting![0].id,
      allow: false,
    });
    assert.equal((await refused).allowed, false);
    await assert.rejects(
      join(davi.socket, { name: "Davi", code }),
      /ENTRY_REFUSED/,
    );

    // Leaving the line or disconnecting clears it for the managers.
    const eva = await person(app.url);
    await assert.rejects(join(eva.socket, { name: "Eva", code }), /WAITING/);
    await delay(50);
    assert.equal(ana.seen.waiting?.length, 1);
    await request(eva.socket, "leave");
    await delay(50);
    assert.equal(ana.seen.waiting?.length, 0);
    const fred = await person(app.url);
    await assert.rejects(join(fred.socket, { name: "Fred", code }), /WAITING/);
    fred.socket.disconnect();
    await delay(100);
    assert.equal(ana.seen.waiting?.length, 0);

    // Admins lock and unlock; unlocking lets everyone waiting in.
    await request(ana.socket, "role", {
      participantId: bia.id,
      action: "promote",
    });
    const gil = await person(app.url);
    await assert.rejects(join(gil.socket, { name: "Gil", code }), /WAITING/);
    await delay(50);
    assert.equal(waitingCount(bia), 1, "new admin sees the line");
    const opened = admission(gil.socket);
    await request(bia.socket, "room-permissions", {
      permissions: { locked: false },
    });
    assert.equal((await opened).allowed, true);
    await join(gil.socket, { name: "Gil", code });
    await assert.rejects(
      request(bia.socket, "room-permissions", {
        permissions: { adminCreate: false },
      }),
      /FORBIDDEN/,
    );
    await assert.rejects(
      request(caio.socket, "room-permissions", {
        permissions: { locked: true },
      }),
      /FORBIDDEN/,
    );
  } finally {
    await app.close();
  }
});

test("convite: entra direto na sala trancada até ser revogado", async () => {
  const app = await server();
  try {
    const ana = await person(app.url);
    const bia = await person(app.url);
    const code = (await join(ana.socket, { name: "Ana" })).snapshot.code;
    await join(bia.socket, { name: "Bia", code });
    await request(ana.socket, "room-permissions", {
      permissions: { locked: true },
    });
    await assert.rejects(
      request(bia.socket, "invite-create", { ttl: "1h" }),
      /FORBIDDEN/,
    );
    await assert.rejects(
      request(ana.socket, "invite-create", { ttl: "30d" }),
      /INVALID_REQUEST/,
    );
    const { invite, expiresAt } = await request<InviteResult>(
      ana.socket,
      "invite-create",
      { ttl: "7d" },
    );
    assert.ok(Math.abs(expiresAt - Date.now() - 7 * 86400000) < 5000);
    const caio = await person(app.url);
    await join(caio.socket, { name: "Caio", code, invite });
    // Another room's invite or garbage is ignored: the line, not an error.
    const davi = await person(app.url);
    await assert.rejects(
      join(davi.socket, { name: "Davi", code, invite: "x.y" }),
      /WAITING/,
    );
    await request(ana.socket, "invite-revoke");
    const eva = await person(app.url);
    await assert.rejects(
      join(eva.socket, { name: "Eva", code, invite }),
      /WAITING/,
    );
    const fresh = await request<InviteResult>(ana.socket, "invite-create", {
      ttl: "1h",
    });
    const fred = await person(app.url);
    await join(fred.socket, { name: "Fred", code, invite: fresh.invite });
  } finally {
    await app.close();
  }
});
