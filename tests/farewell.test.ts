import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { io, type Socket } from "socket.io-client";
import { createApp } from "../src/server/app";
import { readConfig } from "../src/server/config";
import { issueToken } from "../src/server/security";
import { freshKey } from "../src/client/id";
import {
  participantFields,
  type JoinResult,
  type Publication,
  type Reply,
} from "../src/shared/protocol";

// #286: a page that leaves on purpose says goodbye over HTTP.
const origin = "http://localhost:3000";
const secret = "test-only-farewell-secret-value-0123456789";
const FAREWELL = 300;
const GRACE = 1200;
const PROBE = 200;
const QUIET = 800;
async function server() {
  const app = await createApp({
    ...readConfig({
      PORT: "0",
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: origin,
      STUN_URLS: "",
    }),
    farewell: FAREWELL,
    grace: GRACE,
    holderProbe: PROBE,
    holderQuiet: QUIET,
  });
  app.http.listen(0, "127.0.0.1");
  await once(app.http, "listening");
  const port = (app.http.address() as { port: number }).port;
  return { ...app, url: `http://127.0.0.1:${port}` };
}
type App = Awaited<ReturnType<typeof server>>;
const token = () => issueToken(secret, 3600000).token;
async function connect(app: App, auth: string) {
  const socket = io(app.url, {
    transports: ["websocket"],
    auth: { token: auth },
    extraHeaders: { Origin: origin },
    reconnection: false,
  });
  await event(socket, "connect");
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
function farewell(
  app: App,
  body: unknown,
  { origin: from = origin as string | null, type = "text/plain" } = {},
) {
  return fetch(app.url + "/api/leave", {
    method: "POST",
    headers: {
      ...(from && { Origin: from }),
      "Content-Type": type,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const event = (socket: Socket, name: string, timeout = 5000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${name}`)), timeout);
    socket.once(name, (value: unknown) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const room = (app: App, code: string) => app.rooms.rooms.get(code)!;
const member = (app: App, code: string, id: string) =>
  room(app, code).members.get(id);
/** Two people in a room: Ana (creator, page "pa") and Bia (page "pb"). */
async function pair(app: App) {
  const ta = token(),
    tb = token();
  const sa = await connect(app, ta),
    sb = await connect(app, tb);
  const a = await join(sa, { name: "Ana", page: "pa" });
  const code = a.snapshot.code;
  const b = await join(sb, { name: "Bia", code, page: "pb" });
  return { ta, tb, sa, sb, a, b, code };
}
const close = (...sockets: Socket[]) => sockets.forEach((s) => s.close());

test("rota de saída: origem, corpo, tamanho e token", async () => {
  const app = await server();
  try {
    const good = { token: token(), page: "p1" };
    assert.equal((await farewell(app, good, { origin: null })).status, 403);
    assert.equal(
      (await farewell(app, good, { origin: "https://evil.example" })).status,
      403,
    );
    assert.equal(
      (await farewell(app, { token: "x.y", page: "p1" })).status,
      403,
    );
    for (const body of [
      "não é json",
      { token: good.token },
      { ...good, extra: 1 },
      { ...good, explicit: false },
      { ...good, page: "a b" },
    ])
      assert.equal((await farewell(app, body)).status, 400);
    assert.equal(
      (await farewell(app, good, { type: "application/json" })).status,
      400,
    );
    // Parser errors keep their 4xx (bad charset = 415), never a 400 for all.
    assert.equal(
      (await farewell(app, good, { type: "text/plain; charset=x-nope" }))
        .status,
      415,
    );
    const big = await farewell(app, { ...good, page: "x".repeat(3000) });
    assert.equal(big.status, 413);
    const text = await big.text();
    assert.deepEqual(Object.keys(JSON.parse(text)), ["message"]);
    assert.doesNotMatch(text, /at |Error/);
    const ok = await farewell(app, good);
    assert.equal(ok.status, 204);
    // Insecure context (http on a LAN IP): no randomUUID, the fallback id passes.
    Object.defineProperty(crypto, "randomUUID", {
      value: undefined,
      configurable: true,
    });
    let page: string;
    try {
      page = freshKey();
    } finally {
      delete (crypto as { randomUUID?: unknown }).randomUUID;
    }
    assert.match(page, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab]/);
    assert.equal((await farewell(app, { ...good, page })).status, 204);
  } finally {
    await app.close();
  }
});

test("aviso de outra página, sem page ou da fila de espera não muda nada", async () => {
  const app = await server();
  try {
    const { ta, tb, sa, sb, a, b, code } = await pair(app);
    assert.equal(
      (await farewell(app, { token: tb, page: "outra" })).status,
      204,
    );
    await delay(FAREWELL + 150);
    assert.equal(member(app, code, b.id)?.online, true);
    // A client without `page` (old cache) never matches.
    const tc = token();
    const sc = await connect(app, tc);
    const c = await join(sc, { name: "Cris", code });
    await farewell(app, { token: tc, page: "pa" });
    await delay(50);
    assert.equal(member(app, code, c.id)?.online, true);
    // Locked room: someone at the door is not a member.
    await request(sa, "room-permissions", { permissions: { locked: true } });
    const td = token();
    const sd = await connect(app, td);
    await assert.rejects(
      join(sd, { name: "Duda", code, page: "pd" }),
      /WAITING/,
    );
    assert.equal(room(app, code).waiting.size, 1);
    await farewell(app, { token: td, page: "pd", explicit: true });
    await delay(50);
    assert.equal(room(app, code).waiting.size, 1);
    assert.equal(room(app, code).members.size, 3);
    assert.equal(member(app, code, a.id)?.role, "creator");
    void ta;
    close(sa, sb, sc, sd);
  } finally {
    await app.close();
  }
});

test("sem explicit e com alguém online: sai no prazo e só empresta o lugar", async () => {
  const app = await server();
  try {
    const { ta, sa, sb, a, b, code } = await pair(app);
    const tc = token();
    const sc = await connect(app, tc);
    const c = await join(sc, { name: "Cris", code, page: "pc" });
    await request(sa, "call", { active: true });
    await request<Publication>(sa, "publish", {
      kind: "screen",
      key: crypto.randomUUID(),
      audio: false,
      muted: false,
    });
    const ended = event(sb, "publication-ended");
    const gone = event(sa, "disconnect");
    assert.equal((await farewell(app, { token: ta, page: "pa" })).status, 204);
    await gone;
    await ended;
    const left = member(app, code, a.id)!;
    assert.equal(left.online, false);
    assert.equal(left.inCall, false);
    assert.deepEqual(left.publications, []);
    // Cris says goodbye a little later: each leaves at its own time.
    await delay(150);
    await farewell(app, { token: tc, page: "pc" });
    await delay(FAREWELL - 150 + 120);
    assert.equal(member(app, code, a.id), undefined);
    assert.ok(member(app, code, c.id));
    assert.equal(room(app, code).creatorId, b.id);
    assert.equal(room(app, code).provisional, true);
    await delay(200);
    assert.equal(member(app, code, c.id), undefined);
    close(sa, sb, sc);
  } finally {
    await app.close();
  }
});

test("sozinho na sala, o criador espera o grace inteiro e a sala fica como estava", async () => {
  const app = await server();
  try {
    const t = token();
    const s = await connect(app, t);
    const joined = await join(s, { name: "Ana", page: "pa" });
    const code = joined.snapshot.code;
    await request(s, "room-permissions", { permissions: { guestChat: false } });
    await request(s, "widget-create", {
      id: crypto.randomUUID(),
      content: {
        title: "Partida",
        blocks: [
          {
            id: crypto.randomUUID(),
            kind: "score",
            label: "Pontos",
            value: 0,
          },
        ],
      },
    });
    await farewell(app, { token: t, page: "pa" });
    await delay(FAREWELL + 150);
    app.rooms.clean();
    assert.equal(member(app, code, joined.id)?.online, false);
    assert.equal(room(app, code).widgets.list().length, 1);
    assert.equal(room(app, code).permissions.guestChat, false);
    await delay(GRACE);
    app.rooms.clean();
    assert.equal(room(app, code).members.size, 0);
    close(s);
  } finally {
    await app.close();
  }
});

test("recarregar antes do prazo mantém papel, lugar e nada morto", async () => {
  const app = await server();
  try {
    const { ta, sa, sb, a, b, code } = await pair(app);
    await request(sa, "role", { participantId: b.id, action: "promote" });
    await request(sa, "call", { active: true });
    await request<Publication>(sa, "publish", {
      kind: "screen",
      key: crypto.randomUUID(),
      audio: false,
      muted: false,
    });
    assert.equal((await farewell(app, { token: ta, page: "pa" })).status, 204);
    // Ana's new page comes back with the same token and a new page id.
    const reload = await connect(app, ta);
    const back = await join(reload, { name: "Ana", code, page: "pa2" });
    assert.equal(back.snapshot.creatorId, a.id);
    await delay(FAREWELL + 150);
    app.rooms.clean();
    const me = member(app, code, a.id)!;
    assert.equal(me.online, true);
    assert.equal(me.role, "creator");
    assert.equal(me.inCall, false);
    assert.deepEqual(me.publications, []);
    assert.equal(member(app, code, b.id)?.role, "admin");
    close(sa, sb, reload);
  } finally {
    await app.close();
  }
});

test("ordem invertida: join novo antes do aviso recebe SESSION_IN_USE e entra depois", async () => {
  const app = await server();
  try {
    const { ta, sa, sb, a, code } = await pair(app);
    await request<Publication>(sa, "publish", {
      kind: "screen",
      key: crypto.randomUUID(),
      audio: false,
      muted: false,
    });
    const next = await connect(app, ta);
    await assert.rejects(
      join(next, { name: "Ana", code, page: "pa2" }),
      /SESSION_IN_USE/,
    );
    await farewell(app, { token: ta, page: "pa" });
    const back = await join(next, { name: "Ana", code, page: "pa2" });
    assert.equal(back.snapshot.creatorId, a.id);
    const me = back.snapshot.participants.find((p) => p.id === a.id)!;
    assert.deepEqual(me.publications, []);
    assert.equal(me.online, true);
    // The late farewell of the old page does nothing to the new one.
    await farewell(app, { token: ta, page: "pa" });
    await delay(FAREWELL + 150);
    assert.equal(member(app, code, a.id)?.online, true);
    close(sa, sb, next);
  } finally {
    await app.close();
  }
});

test("reentrar de outra página derruba as transmissões da página antiga", async () => {
  const app = await server();
  try {
    const { ta, sa, sb, a, code } = await pair(app);
    await request<Publication>(sa, "publish", {
      kind: "screen",
      key: crypto.randomUUID(),
      audio: false,
      muted: false,
    });
    sa.close();
    await delay(50);
    // No farewell arrived (crash): the new page still starts clean.
    const next = await connect(app, ta);
    const back = await join(next, { name: "Ana", code, page: "pa2" });
    const me = back.snapshot.participants.find((p) => p.id === a.id)!;
    assert.deepEqual(me.publications, []);
    close(sb, next);
  } finally {
    await app.close();
  }
});

test("join recusado de página nova não derruba a mídia", async () => {
  const app = await server();
  try {
    const { ta, sa, sb, a, code } = await pair(app);
    await request<Publication>(sa, "publish", {
      kind: "screen",
      key: crypto.randomUUID(),
      audio: false,
      muted: false,
    });
    room(app, code).members.get(a.id)!.inCall = true;
    const next = await connect(app, ta);
    await assert.rejects(
      join(next, { name: "Ana", code, page: "pa2" }),
      /SESSION_IN_USE/,
    );
    await assert.rejects(
      join(next, { name: "Ana", code: "ZZZZZZ", page: "pa2" }),
      /ALREADY_JOINED/,
    );
    const me = member(app, code, a.id)!;
    assert.equal(me.publications.length, 1);
    assert.equal(me.inCall, true);
    assert.equal(me.page, "pa");
    close(sa, sb, next);
  } finally {
    await app.close();
  }
});

test("explicit sai na hora e passa o lugar de criador", async () => {
  const app = await server();
  try {
    const { ta, sa, sb, a, b, code } = await pair(app);
    sa.close();
    await delay(50);
    await farewell(app, { token: ta, page: "pa", explicit: true });
    await delay(50);
    assert.equal(member(app, code, a.id), undefined);
    assert.equal(room(app, code).creatorId, b.id);
    assert.equal(room(app, code).provisional, false);
    close(sb);
  } finally {
    await app.close();
  }
});

test("queda sem aviso espera o grace", async () => {
  const app = await server();
  try {
    const { sa, sb, a, code } = await pair(app);
    sa.close();
    await delay(FAREWELL + 150);
    app.rooms.clean();
    assert.equal(member(app, code, a.id)?.online, false);
    await delay(GRACE);
    app.rooms.clean();
    assert.equal(member(app, code, a.id), undefined);
    close(sb);
  } finally {
    await app.close();
  }
});

test("participante no snapshot só leva os campos permitidos", async () => {
  const app = await server();
  try {
    const { tb, sa, sb, a, code } = await pair(app);
    await farewell(app, { token: tb, page: "pb" });
    await delay(50);
    const snapshot = app.rooms.snapshot(room(app, code), a.id);
    for (const p of snapshot.participants) {
      for (const key of Object.keys(p))
        assert.ok((participantFields as readonly string[]).includes(key), key);
      assert.ok(!("page" in p) && !("leavesAt" in p) && !("socketId" in p));
    }
    close(sa, sb);
  } finally {
    await app.close();
  }
});

// #301: a page whose old socket the server still holds (half-open after a
// network change) must not look like another tab.
const watch = async (viewer: Socket, publicationId: string) =>
  request<{ id: string }>(viewer, "subscribe", {
    publicationId,
    tier: "main",
    nonce: crypto.randomUUID(),
  });
const answer = (socket: Socket) =>
  socket.on("presence-probe", (ack: () => void) => ack());

test("mesma página com o socket velho preso assume o lugar e mantém a mídia", async () => {
  const app = await server();
  try {
    const { ta, sa, sb, a, code } = await pair(app);
    answer(sa);
    const screen = await request<Publication>(sa, "publish", {
      kind: "screen",
      key: crypto.randomUUID(),
      audio: false,
      muted: false,
    });
    const sub = await watch(sb, screen.id);
    let ended = false;
    sb.on("publication-ended", () => (ended = true));
    // Same page (same Controller) back on a new connection.
    const again = await connect(app, ta);
    const dropped = event(sa, "disconnect");
    const back = await join(again, { name: "Ana", code, page: "pa" });
    await dropped;
    const me = member(app, code, a.id)!;
    assert.equal(me.socketId, again.id);
    assert.equal(me.online, true);
    assert.deepEqual(
      back.snapshot.participants
        .find((p) => p.id === a.id)!
        .publications.map((p) => p.id),
      [screen.id],
    );
    assert.ok(room(app, code).subscriptions.has(sub.id));
    await delay(50);
    assert.equal(member(app, code, a.id)?.online, true);
    assert.equal(ended, false);
    close(sb, again);
  } finally {
    await app.close();
  }
});

test("página nova e socket velho mudo: o servidor sonda, espera o silêncio e a página entra", async () => {
  const app = await server();
  try {
    const { ta, sa, sb, a, code } = await pair(app);
    // `sa` never answers the probe, but it just talked: maybe only frozen.
    const next = await connect(app, ta);
    await assert.rejects(
      join(next, { name: "Ana", code, page: "pa2" }),
      /SESSION_IN_USE/,
    );
    assert.equal(sa.connected, true);
    await delay(QUIET);
    // Mute and quiet: the join waits for the probe and enters in the same call.
    const dropped = event(sa, "disconnect");
    const back = await join(next, { name: "Ana", code, page: "pa2" });
    await dropped;
    assert.equal(back.snapshot.creatorId, a.id);
    assert.equal(member(app, code, a.id)?.socketId, next.id);
    close(sb, next);
  } finally {
    await app.close();
  }
});

test("página nova com a aba antiga viva segue em conflito", async () => {
  const app = await server();
  try {
    const { ta, sa, sb, a, code } = await pair(app);
    answer(sa);
    const next = await connect(app, ta);
    await assert.rejects(
      join(next, { name: "Ana", code, page: "pa2" }),
      /SESSION_IN_USE/,
    );
    await delay(QUIET);
    await assert.rejects(
      join(next, { name: "Ana", code, page: "pa2" }),
      /SESSION_IN_USE/,
    );
    assert.equal(sa.connected, true);
    assert.equal(member(app, code, a.id)?.socketId, sa.id);
    close(sa, sb, next);
  } finally {
    await app.close();
  }
});

test("saída explícita depois de 'Entrar nesta aba': só a mesma página tira a pessoa", async () => {
  const app = await server();
  try {
    const { ta, sa, sb, a, code } = await pair(app);
    // Another page's explicit goodbye leaves this one in place.
    await farewell(app, { token: ta, page: "pa9", explicit: true });
    await delay(50);
    assert.equal(member(app, code, a.id)?.socketId, sa.id);
    // The same page (enterHere without a socket) leaves for good.
    await farewell(app, { token: ta, page: "pa", explicit: true });
    await delay(50);
    assert.equal(member(app, code, a.id), undefined);
    close(sa, sb);
  } finally {
    await app.close();
  }
});

test("aviso atrasado da página que já voltou derruba a mídia (por isso o bfcache troca o page)", async () => {
  const app = await server();
  try {
    const { ta, sa, sb, a, code } = await pair(app);
    const screen = await request<Publication>(sb, "publish", {
      kind: "screen",
      key: crypto.randomUUID(),
      audio: false,
      muted: false,
    });
    await watch(sa, screen.id);
    sa.close();
    await delay(50);
    // Back from the bfcache with the same page; the pagehide farewell is late.
    const back = await connect(app, ta);
    await join(back, { name: "Ana", code, page: "pa" });
    const sub = await watch(back, screen.id);
    const dropped = event(back, "disconnect");
    await farewell(app, { token: ta, page: "pa" });
    await dropped;
    assert.equal(room(app, code).subscriptions.has(sub.id), false);
    // A restored page with a fresh page id is immune to the late farewell.
    const restored = await connect(app, ta);
    await join(restored, { name: "Ana", code, page: "pa3" });
    const again = await watch(restored, screen.id);
    await farewell(app, { token: ta, page: "pa" });
    await delay(50);
    assert.equal(member(app, code, a.id)?.socketId, restored.id);
    assert.ok(room(app, code).subscriptions.has(again.id));
    close(sb, restored);
  } finally {
    await app.close();
  }
});

// #292: the same page load under a new identity (expired token, "Entrar nesta
// aba") takes the old id's place at once: no duplicate, no leave in between.
function names(socket: Socket) {
  const seen: string[][] = [];
  socket.on("snapshot", (s: JoinResult["snapshot"]) =>
    seen.push(s.participants.map((p) => p.name)),
  );
  return seen;
}
const unique = (seen: string[][]) =>
  seen.every((names) => new Set(names).size === names.length);

test("#292: mesma página com id novo assume o lugar sem duplicata nem sonda", async () => {
  const app = await server();
  try {
    const { ta, sa, sb, a, code } = await pair(app);
    const seen = names(sb);
    const old = member(app, code, a.id)!;
    const sa2 = await connect(app, token());
    const gone = event(sa, "disconnect");
    const started = Date.now();
    const next = await join(sa2, { name: "Ana", code, page: "pa" });
    // No probe: the page is the tab's secret.
    assert.ok(Date.now() - started < PROBE);
    await gone;
    assert.notEqual(next.id, a.id);
    assert.equal(member(app, code, a.id), undefined);
    assert.equal(app.rooms.membership.get(a.id), undefined);
    const now = member(app, code, next.id)!;
    assert.equal(now.role, "creator");
    assert.equal(room(app, code).creatorId, next.id);
    assert.equal(now.color, old.color);
    assert.ok(next.credential);
    await delay(50);
    assert.ok(seen.length > 0 && unique(seen), JSON.stringify(seen));
    assert.deepEqual(seen.at(-1)!.sort(), ["Ana", "Bia"]);
    // The old identity's late farewell changes nothing.
    await farewell(app, { token: ta, page: "pa", explicit: true });
    assert.ok(member(app, code, next.id));
    close(sa2, sb);
  } finally {
    await app.close();
  }
});

test("#292: sem page ou com page diferente, id novo é outra pessoa", async () => {
  const app = await server();
  try {
    const s1 = await connect(app, token()),
      s2 = await connect(app, token()),
      s3 = await connect(app, token());
    const a = await join(s1, { name: "Ana" });
    const code = a.snapshot.code;
    const b = await join(s2, { name: "Bia", code });
    assert.ok(member(app, code, a.id) && member(app, code, b.id));
    const c = await join(s3, { name: "Caio", code, page: "pc" });
    assert.equal(room(app, code).members.size, 3);
    assert.ok(member(app, code, c.id));
    close(s1, s2, s3);
  } finally {
    await app.close();
  }
});

test("#292: corrida do aviso de 'Entrar nesta aba' com o join novo, nas duas ordens", async () => {
  for (const order of ["aviso antes", "join antes"]) {
    const app = await server();
    try {
      const { ta, sa, sb, a, code } = await pair(app);
      const seen = names(sb);
      sa.close();
      await delay(50);
      const sa2 = await connect(app, token());
      let next: JoinResult;
      if (order === "aviso antes") {
        await farewell(app, { token: ta, page: "pa", explicit: true });
        next = await join(sa2, { name: "Ana", code, page: "pa" });
      } else {
        next = await join(sa2, { name: "Ana", code, page: "pa" });
        await farewell(app, { token: ta, page: "pa", explicit: true });
      }
      await delay(50);
      assert.equal(member(app, code, a.id), undefined, order);
      assert.ok(member(app, code, next.id)?.online, order);
      assert.equal(room(app, code).members.size, 2, order);
      assert.ok(unique(seen), order);
      close(sa2, sb);
    } finally {
      await app.close();
    }
  }
});
