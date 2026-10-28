import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { io, type Socket } from "socket.io-client";
import { createApp } from "../src/server/app";
import { readConfig } from "../src/server/config";
import {
  issueRoomCredential,
  issueToken,
  verifyRoomCredential,
  verifyToken,
} from "../src/server/security";
import {
  defaultPermissions,
  type JoinResult,
  type Reply,
} from "../src/shared/protocol";

// #226: the creator seat survives a restart and a long absence.
const origin = "http://localhost:3000";
const secret = "test-only-room-credential-secret-value";
async function server(port = 0) {
  const app = await createApp(
    readConfig({
      PORT: String(port),
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: origin,
      STUN_URLS: "",
    }),
  );
  app.http.listen(port, "127.0.0.1");
  await once(app.http, "listening");
  const address = app.http.address() as { port: number };
  return {
    ...app,
    port: address.port,
    url: `http://127.0.0.1:${address.port}`,
  };
}
async function connect(url: string, token: string) {
  const socket = io(url, {
    transports: ["websocket"],
    auth: { token },
    extraHeaders: { Origin: origin },
    reconnection: false,
  });
  await new Promise((resolve) => socket.once("connect", () => resolve(0)));
  return socket;
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
/** Latest `room-credential` event (string, or null to forget). */
function track(socket: Socket) {
  const seen: { value?: string | null } = {};
  socket.on("room-credential", (value: string | null) => (seen.value = value));
  return seen;
}
const role = (r: JoinResult, id: string) =>
  r.snapshot.participants.find((p) => p.id === id)?.role;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("credencial de sala: assinatura, sala, validade e separação do token", () => {
  const body = {
    code: "ROOMA",
    rank: 5,
    admins: [],
    permissions: defaultPermissions,
  };
  const good = issueRoomCredential(secret, 60000, body);
  assert.equal(verifyRoomCredential(secret, good, "ROOMA")?.rank, 5);
  assert.equal(verifyRoomCredential(secret, good, "ROOMB"), null);
  assert.equal(
    verifyRoomCredential("other-secret-".repeat(3), good, "ROOMA"),
    null,
  );
  assert.equal(
    verifyRoomCredential(secret, good.slice(0, -4) + "AAAA", "ROOMA"),
    null,
  );
  assert.equal(
    verifyRoomCredential(
      secret,
      issueRoomCredential(secret, -1, body),
      "ROOMA",
    ),
    null,
  );
  // A forged body with extra fields or too many admins never parses.
  assert.equal(
    verifyRoomCredential(
      secret,
      issueRoomCredential(secret, 60000, { ...body, extra: 1 } as typeof body),
      "ROOMA",
    ),
    null,
  );
  // Session tokens and room credentials never stand in for each other.
  const session = issueToken(secret, 60000);
  assert.equal(verifyRoomCredential(secret, session.token, "ROOMA"), null);
  assert.throws(() => verifyToken(secret, good));
});

test("reinício real: quem chega primeiro é provisório e o criador recupera cargo, admins e permissões", async () => {
  let app = await server();
  const port = app.port;
  const a = issueToken(secret, 3_600_000);
  const b = issueToken(secret, 3_600_000);
  const c = issueToken(secret, 3_600_000);
  let sa = await connect(app.url, a.token);
  let sb = await connect(app.url, b.token);
  let sc: Socket | undefined;
  try {
    const seen = track(sa);
    const created = await join(sa, { name: "Ana" });
    const code = created.snapshot.code;
    assert.ok(created.credential);
    await join(sb, { name: "Bia", code });
    await request(sa, "role", { participantId: b.id, action: "promote" });
    await request(sa, "room-permissions", {
      permissions: { guestChat: false },
    });
    await delay(50);
    const credential = seen.value!;
    assert.deepEqual(verifyRoomCredential(secret, credential, code)?.admins, [
      b.id,
    ]);

    sa.disconnect();
    sb.disconnect();
    await app.close();
    app = await server(port);
    sb = await connect(app.url, b.token);
    sa = await connect(app.url, a.token);
    sc = await connect(app.url, c.token);
    // Bia comes back first, without a credential: creator only for now.
    const first = await join(sb, { name: "Bia", code });
    assert.equal(first.snapshot.creatorId, b.id);
    assert.ok(first.credential, "provisional creator keeps a weak seat");
    assert.equal(verifyRoomCredential(secret, first.credential, code)?.rank, 0);
    assert.match(
      first.snapshot.notices!.at(-1)!.text,
      /até o criador anterior voltar/,
    );
    const forgotten = track(sb);
    // A credential for another room or a forged one changes nothing.
    const other = issueRoomCredential(secret, 60000, {
      code: "OTHERROOM",
      rank: Date.now(),
      admins: [],
      permissions: defaultPermissions,
    });
    const stranger = await join(sc, { name: "Caio", code, credential: other });
    assert.equal(stranger.snapshot.creatorId, b.id);
    assert.equal(stranger.credential, undefined);

    const back = await join(sa, { name: "Ana", code, credential });
    assert.equal(back.snapshot.creatorId, a.id);
    assert.equal(role(back, b.id), "admin");
    assert.equal(role(back, c.id), "guest");
    assert.equal(back.snapshot.permissions?.guestChat, false);
    assert.match(back.snapshot.notices!.at(-1)!.text, /Ana voltou/);
    await delay(50);
    assert.equal(forgotten.value, null, "provisional seat is withdrawn");
    // The older provisional seat cannot take it back.
    sb.disconnect();
    sb = await connect(app.url, b.token);
    const retry = await join(sb, {
      name: "Bia",
      code,
      credential: first.credential,
    });
    assert.equal(retry.snapshot.creatorId, a.id);
  } finally {
    sa.disconnect();
    sb.disconnect();
    sc?.disconnect();
    await app.close();
  }
});

test("criador fora além da tolerância recupera o cargo; transferência e segunda aba não", async () => {
  const app = await server();
  const a = issueToken(secret, 3_600_000);
  const b = issueToken(secret, 3_600_000);
  const a2 = issueToken(secret, 3_600_000);
  let sa = await connect(app.url, a.token);
  const sb = await connect(app.url, b.token);
  const sa2 = await connect(app.url, a2.token);
  try {
    const created = await join(sa, { name: "Ana" });
    const code = created.snapshot.code;
    await join(sb, { name: "Bia", code });
    await request(sa, "role", { participantId: b.id, action: "promote" });
    sa.disconnect();
    await delay(50);
    const room = app.rooms.rooms.get(code)!;
    room.members.get(a.id)!.lastSeen -= 10 * 60_000;
    app.rooms.clean();
    assert.equal(room.creatorId, b.id);
    assert.match(
      room.notices.at(-1)!.text,
      /Bia é o criador da sala até Ana voltar/,
    );

    sa = await connect(app.url, a.token);
    const seen = track(sa);
    const back = await join(sa, {
      name: "Ana",
      code,
      credential: created.credential,
    });
    assert.equal(back.snapshot.creatorId, a.id);
    assert.equal(role(back, b.id), "admin");

    // Same credential in a second tab while the creator is here: no flip.
    const tab = await join(sa2, {
      name: "Ana",
      code,
      credential: back.credential,
    });
    assert.equal(tab.snapshot.creatorId, a.id);
    assert.equal(tab.credential, undefined);

    // After a transfer, the old seat no longer counts.
    await request(sa, "role", { participantId: b.id, action: "transfer" });
    await delay(50);
    assert.equal(seen.value, null);
    sa.disconnect();
    sa = await connect(app.url, a.token);
    const stale = await join(sa, {
      name: "Ana",
      code,
      credential: back.credential,
    });
    assert.equal(stale.snapshot.creatorId, b.id);
    assert.equal(role(stale, a.id), "admin");
  } finally {
    sa.disconnect();
    sb.disconnect();
    sa2.disconnect();
    await app.close();
  }
});
