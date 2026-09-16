import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { io, type Socket } from "socket.io-client";
import { createApp } from "../src/server/app";
import { readConfig } from "../src/server/config";
import { verifyToken, issueToken } from "../src/server/security";
import type {
  Reply,
  Snapshot,
  Publication,
  Subscription,
} from "../src/shared/protocol";
const origin = "http://localhost:3000";
const secret = "test-only-session-secret-do-not-use-in-production";
async function server(port = 0) {
  const instance = await createApp(
    readConfig({
      PORT: String(port),
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: origin,
      STUN_URLS: "",
    }),
  );
  instance.http.listen(port, "127.0.0.1");
  await once(instance.http, "listening");
  return {
    ...instance,
    url: `http://127.0.0.1:${(instance.http.address() as any).port}`,
  };
}
async function session(url: string) {
  const res = await fetch(url + "/api/session", {
    method: "POST",
    headers: { Origin: origin },
  });
  assert.equal(res.status, 200);
  return res.json() as Promise<{
    token: string;
    id: string;
    expiresAt: number;
  }>;
}
async function connect(url: string, token: string, customOrigin = origin) {
  const socket = io(url, {
    transports: ["websocket"],
    auth: { token },
    extraHeaders: { Origin: customOrigin },
    reconnection: false,
  });
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  return socket;
}
function request<T = any>(
  socket: Socket,
  action: string,
  data: unknown = {},
): Promise<Reply<T>> {
  return new Promise((resolve, reject) =>
    socket
      .timeout(3000)
      .emit("command", { action, data }, (e: Error | null, r: Reply<T>) =>
        e ? reject(e) : resolve(r),
      ),
  );
}
function data<T>(r: Reply<T>): T {
  if (!r.ok) assert.fail(r.message);
  return r.data;
}
test("tokens assinados rejeitam adulteração e expiração", () => {
  const issued = issueToken(secret, 60000);
  assert.equal(verifyToken(secret, issued.token).id, issued.id);
  assert.throws(() => verifyToken(secret, issued.token.slice(0, -5) + "AAAAA"));
  assert.throws(() => verifyToken(secret, issueToken(secret, -1).token));
});
test("seis pessoas entram, a sétima é recusada e a duração pertence à sala", async () => {
  const app = await server();
  const sockets: Socket[] = [];
  try {
    const config = await fetch(app.url + "/api/config").then((r) => r.json());
    assert.equal(config.maxParticipants, 6);
    const snapshots: Snapshot[] = [];
    for (let i = 0; i < 7; i++) {
      const socket = await connect(app.url, (await session(app.url)).token);
      sockets.push(socket);
      const reply = await request<{ snapshot: Snapshot }>(socket, "join", {
        name: `Pessoa ${i + 1}`,
        code: "QALIMITE",
      });
      if (i < 6) snapshots.push(data(reply).snapshot);
      else {
        assert.equal(reply.ok, false);
        if (!reply.ok) assert.equal(reply.code, "ROOM_FULL");
      }
    }
    assert.equal(snapshots[5].participants.length, 6);
    assert.equal(new Set(snapshots.map((s) => s.createdAt)).size, 1);
    assert.ok(snapshots[5].serverTime >= snapshots[0].serverTime);
    assert.ok(snapshots[0].createdAt <= snapshots[0].serverTime);
    const rejoin = data(
      await request<{ snapshot: Snapshot }>(sockets[0], "join", {
        name: "Pessoa 1",
        code: "QALIMITE",
      }),
    );
    assert.equal(rejoin.snapshot.createdAt, snapshots[0].createdAt);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await app.close();
  }
});
test("três sessões, nomes iguais, publicações simultâneas e assinatura seletiva", async () => {
  const app = await server();
  const sockets: Socket[] = [];
  try {
    for (let i = 0; i < 3; i++)
      sockets.push(await connect(app.url, (await session(app.url)).token));
    const joins = [];
    for (const s of sockets)
      joins.push(
        data(
          await request<{ id: string; snapshot: Snapshot }>(s, "join", {
            name: "Mesmo nome",
            code: "QA1234",
          }),
        ),
      );
    assert.equal(new Set(joins.map((v) => v.id)).size, 3);
    const a = data(
      await request<Publication>(sockets[0], "publish", {
        kind: "screen",
        key: crypto.randomUUID(),
        audio: true,
        muted: false,
      }),
    );
    const b = data(
      await request<Publication>(sockets[1], "publish", {
        kind: "screen",
        key: crypto.randomUUID(),
        audio: true,
        muted: false,
      }),
    );
    const first = data(
      await request<Subscription>(sockets[2], "subscribe", {
        publicationId: a.id,
        tier: "main",
        nonce: crypto.randomUUID(),
      }),
    );
    const second = data(
      await request<Subscription>(sockets[2], "subscribe", {
        publicationId: b.id,
        tier: "main",
        nonce: crypto.randomUUID(),
      }),
    );
    const room = app.rooms.rooms.get("QA1234")!;
    assert.equal(room.subscriptions.size, 1);
    assert.equal(room.subscriptions.has(first.id), false);
    assert.equal(room.subscriptions.has(second.id), true);
    assert.equal(room.members.get(joins[0].id)?.publications[0].id, a.id);
    const routed = new Promise<any>((resolve) =>
      sockets[2].once("signal", resolve),
    );
    const ack = await new Promise<any>((resolve) =>
      sockets[1].emit(
        "signal",
        { id: second.id, round: 1, description: { type: "offer", sdp: "v=0" } },
        resolve,
      ),
    );
    assert.equal(ack.ok, true);
    assert.equal((await routed).id, second.id);
    const candidateRoute = new Promise<any>((resolve) =>
      sockets[2].once("signal", resolve),
    );
    const candidateAck = await new Promise<any>((resolve) =>
      sockets[1].emit(
        "signal",
        {
          id: second.id,
          round: 1,
          candidate: {
            candidate: "candidate:1 1 udp 2113937151 192.0.2.1 50000 typ host",
            sdpMid: "0",
            sdpMLineIndex: 0,
            usernameFragment: "test",
          },
        },
        resolve,
      ),
    );
    assert.equal(candidateAck.ok, true);
    assert.equal((await candidateRoute).candidate.sdpMid, "0");
    const preview = data(
      await request<Subscription>(sockets[2], "subscribe", {
        publicationId: a.id,
        tier: "preview",
        nonce: crypto.randomUUID(),
      }),
    );
    data(await request(sockets[2], "unsubscribe", { id: preview.id }));
    assert.equal(room.members.get(joins[0].id)?.publications.length, 1);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await app.close();
  }
});
test("isolamento entre salas, falsa identidade e ação de terceiros são recusados", async () => {
  const app = await server();
  const a = await connect(app.url, (await session(app.url)).token);
  const b = await connect(app.url, (await session(app.url)).token);
  try {
    data(await request(a, "join", { name: "Alice", code: "SALA1111" }));
    data(await request(b, "join", { name: "Bob", code: "SALA2222" }));
    const p = data(
      await request<Publication>(a, "publish", {
        kind: "camera",
        key: crypto.randomUUID(),
        audio: false,
        muted: false,
      }),
    );
    assert.equal(
      (
        await request(b, "subscribe", {
          publicationId: p.id,
          tier: "main",
          nonce: crypto.randomUUID(),
        })
      ).ok,
      false,
    );
    assert.equal(
      (await request(b, "unpublish", { publicationId: p.id })).ok,
      false,
    );
    assert.equal(
      (
        await request(b, "join", {
          name: "X",
          code: "SALA2222",
          id: "inventado",
        })
      ).ok,
      false,
    );
    const reply = await new Promise<any>((resolve) =>
      b.emit(
        "signal",
        { id: p.id, round: 1, description: { type: "offer", sdp: "v=0" } },
        resolve,
      ),
    );
    assert.equal(reply.ok, false);
  } finally {
    a.disconnect();
    b.disconnect();
    await app.close();
  }
});
test("origem indevida, token adulterado e conexão simultânea com a mesma sessão", async () => {
  const app = await server();
  const token = await session(app.url);
  let a: Socket | undefined, b: Socket | undefined;
  try {
    const denied = await fetch(app.url + "/api/session", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
    });
    assert.equal(denied.status, 403);
    for (const [candidate, orig] of [
      [token.token, "https://evil.example"],
      ["invalid", origin],
    ]) {
      const s = io(app.url, {
        transports: ["websocket"],
        auth: { token: candidate },
        extraHeaders: { Origin: orig },
        reconnection: false,
      });
      await new Promise<void>((resolve) =>
        s.once("connect_error", () => resolve()),
      );
      assert.equal(s.connected, false);
      s.disconnect();
    }
    a = await connect(app.url, token.token);
    b = await connect(app.url, token.token);
    data(await request(a, "join", { name: "Primeira aba", code: "QAABAS" }));
    const r = await request(b, "join", { name: "Segunda aba", code: "QAABAS" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "SESSION_IN_USE");
  } finally {
    a?.disconnect();
    b?.disconnect();
    await app.close();
  }
});
test("validação de nomes, payloads, rate limit e cabeçalhos de segurança", async () => {
  const app = await server();
  const a = await connect(app.url, (await session(app.url)).token);
  try {
    assert.equal(
      (await request(a, "join", { name: "x".repeat(100), code: "QARATE" })).ok,
      false,
    );
    assert.equal(
      (await request(a, "join", { name: "x\u0000", code: "QARATE" })).ok,
      false,
    );
    data(await request(a, "join", { name: "<img src=x>", code: "QARATE" }));
    const replies = [];
    for (let i = 0; i < 31; i++) replies.push(await request(a, "ping"));
    assert.equal(replies.at(-1)?.ok, false);
    const response = await fetch(app.url + "/healthz");
    assert.equal(response.status, 200);
    assert.ok(
      response.headers
        .get("content-security-policy")
        ?.includes("frame-ancestors 'none'"),
    );
    assert.ok(
      response.headers
        .get("permissions-policy")
        ?.includes("display-capture=(self)"),
    );
  } finally {
    a.disconnect();
    await app.close();
  }
});
test("reentrada após reinício real do servidor preserva identidade e IDs de publicação", async () => {
  let app = await server();
  const token = await session(app.url);
  const port = (app.http.address() as any).port;
  const key = crypto.randomUUID();
  let a = await connect(app.url, token.token);
  try {
    const join = data(
      await request<{ id: string }>(a, "join", {
        name: "Retorno",
        code: "QARESTART",
      }),
    );
    const publication = data(
      await request<Publication>(a, "publish", {
        kind: "screen",
        key,
        audio: false,
        muted: false,
      }),
    );
    const epoch = app.rooms.epoch;
    a.disconnect();
    await app.close();
    app = await server(port);
    assert.notEqual(app.rooms.epoch, epoch);
    a = await connect(app.url, token.token);
    const again = data(
      await request<{ id: string; snapshot: Snapshot }>(a, "join", {
        name: "Retorno",
        code: "QARESTART",
      }),
    );
    const recovered = data(
      await request<Publication>(a, "publish", {
        kind: "screen",
        key,
        audio: false,
        muted: false,
      }),
    );
    assert.equal(again.id, join.id);
    assert.equal(recovered.id, publication.id);
    assert.equal(again.snapshot.participants.length, 1);
    data(await request(a, "join", { name: "Retorno", code: "QARESTART" }));
    assert.equal(app.rooms.rooms.get("QARESTART")?.members.size, 1);
  } finally {
    a.disconnect();
    await app.close();
  }
});
test("credenciais TURN temporárias e configuração de produção fechada", async () => {
  assert.throws(() =>
    readConfig({ NODE_ENV: "production", SESSION_SECRET: secret }),
  );
  assert.throws(() =>
    readConfig({ SESSION_SECRET: secret, WEB_CONCURRENCY: "2" }),
  );
  const config = readConfig({
    PORT: "0",
    SESSION_SECRET: secret,
    ALLOWED_ORIGINS: origin,
    TURN_URLS: "turn:relay.example:3478",
    TURN_SECRET: secret,
  });
  const app = await createApp(config);
  app.http.listen(0, "127.0.0.1");
  await once(app.http, "listening");
  const url = `http://127.0.0.1:${(app.http.address() as any).port}`;
  const a = await connect(url, (await session(url)).token);
  try {
    assert.equal((await request(a, "ice")).ok, false);
    data(await request(a, "join", { name: "Relay", code: "QATURN" }));
    const ice = data(await request<any>(a, "ice"));
    assert.equal(ice.turn, true);
    assert.ok(ice.expiresAt > Date.now());
    assert.ok(ice.expiresAt <= Date.now() + 601000);
    assert.ok(ice.iceServers[1].credential);
    assert.equal(JSON.stringify(ice).includes(secret), false);
  } finally {
    a.disconnect();
    await app.close();
  }
});
