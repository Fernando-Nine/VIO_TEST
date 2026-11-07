import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { io } from "socket.io-client";
import { Controller } from "../src/client/room/controller";
import { createApp } from "../src/server/app";
import { readConfig } from "../src/server/config";
import type { Action, Reply } from "../src/shared/protocol";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate: () => boolean, timeout = 15000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error("Condition timed out");
    await delay(20);
  }
}

// #226 end to end: the client keeps the seat and reclaims it after a restart.
test("cliente guarda a credencial e volta como criador depois de um reinício real", async () => {
  const origin = "http://localhost:3000";
  const start = async (port: number) => {
    const app = await createApp(
      readConfig({
        PORT: String(port),
        SESSION_SECRET: "test-only-room-credential-client-secret",
        ALLOWED_ORIGINS: origin,
        STUN_URLS: "",
      }),
    );
    app.http.listen(port, "127.0.0.1");
    await once(app.http, "listening");
    return app;
  };
  let app = await start(0);
  const port = (app.http.address() as { port: number }).port;
  const url = `http://127.0.0.1:${port}`;
  const nativeFetch = globalThis.fetch;
  const locationDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "location",
  );
  Object.defineProperty(globalThis, "location", {
    value: new URL(url),
    configurable: true,
  });
  globalThis.fetch = (input, init) =>
    nativeFetch(
      typeof input === "string" && input.startsWith("/") ? url + input : input,
      { ...init, headers: { ...init?.headers, Origin: origin } },
    );
  const connect = ((uri, options) =>
    io(uri, { ...options, extraHeaders: { Origin: origin } })) as typeof io;
  const owner = new Controller(undefined, false, connect);
  owner.sounds = false;
  const guestSession = await (
    await globalThis.fetch("/api/session", { method: "POST" })
  ).json();
  const guest = io(url, {
    transports: ["websocket"],
    auth: { token: guestSession.token },
    extraHeaders: { Origin: origin },
  });
  const join = (code: string) =>
    new Promise<Reply<{ snapshot: { creatorId: string } }>>((resolve) =>
      guest
        .timeout(5000)
        .emit(
          "command",
          { action: "join", data: { name: "Bia", code } },
          (e: Error | null, r: Reply<{ snapshot: { creatorId: string } }>) =>
            resolve(e ? { ok: false, code: "TIMEOUT", message: e.message } : r),
        ),
    );
  try {
    await owner.enter("Ana");
    await until(() => owner.view.status === "connected");
    const code = owner.view.snapshot!.code;
    assert.equal(owner.view.snapshot!.creatorId, owner.view.id);

    // Restart while Bia is ready to come back first.
    // Hold Ana's rejoin until Bia has recreated the room.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const request = owner.request.bind(owner);
    owner.request = (async (action: Action, data?: unknown) => {
      if (action === "join") await gate;
      return request(action, data);
    }) as typeof owner.request;
    const back = new Promise((resolve) =>
      guest.once("connect", () => resolve(0)),
    );
    await app.close();
    app = await start(port);
    await back;
    const first = await join(code);
    assert.ok(first.ok && first.data.snapshot.creatorId === guestSession.id);
    release();

    await until(
      () =>
        owner.view.status === "connected" &&
        owner.view.snapshot?.epoch === app.rooms.epoch &&
        owner.view.snapshot?.creatorId === owner.view.id,
    );
    const people = owner.view.snapshot!.participants;
    assert.equal(people.find((p) => p.id === guestSession.id)?.role, "guest");
    assert.ok(
      owner.view.snapshot!.notices!.some((n) =>
        /voltou e é de novo/.test(n.text),
      ),
    );
  } finally {
    guest.disconnect();
    await owner.destroy();
    await app.close();
    globalThis.fetch = nativeFetch;
    if (locationDescriptor)
      Object.defineProperty(globalThis, "location", locationDescriptor);
    else Reflect.deleteProperty(globalThis, "location");
  }
});

// #286: the same session open twice stops after three tries and "Entrar nesta
// aba" joins as a new tab would, without taking the creator seat.
test("mesma sessão em duas abas: para após três tentativas e entra sem a credencial", async () => {
  const origin = "http://localhost:3000";
  const app = await createApp(
    readConfig({
      PORT: "0",
      SESSION_SECRET: "test-only-room-credential-client-secret",
      ALLOWED_ORIGINS: origin,
      STUN_URLS: "",
    }),
  );
  app.http.listen(0, "127.0.0.1");
  await once(app.http, "listening");
  const url = `http://127.0.0.1:${(app.http.address() as { port: number }).port}`;
  const nativeFetch = globalThis.fetch;
  const locationDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "location",
  );
  Object.defineProperty(globalThis, "location", {
    value: new URL(url),
    configurable: true,
  });
  const leaves: { token: string; page: string; explicit?: true }[] = [];
  globalThis.fetch = (input, init) => {
    if (input === "/api/leave") leaves.push(JSON.parse(String(init?.body)));
    return nativeFetch(
      typeof input === "string" && input.startsWith("/") ? url + input : input,
      { ...init, headers: { ...init?.headers, Origin: origin } },
    );
  };
  const connect = ((uri, options) =>
    io(uri, { ...options, extraHeaders: { Origin: origin } })) as typeof io;
  type Shared = { session?: unknown; credentials: Record<string, string> };
  const first = new Controller(undefined, false, connect);
  const second = new Controller(undefined, false, connect);
  first.sounds = second.sounds = false;
  try {
    await first.enter("Ana");
    await until(() => first.view.status === "connected");
    const code = first.view.snapshot!.code;
    const creator = first.view.id;
    // The second tab shares the session and the stored credential.
    const shared = first as unknown as Shared;
    Object.assign(second as unknown as Shared, {
      session: shared.session,
      credentials: { ...shared.credentials },
    });
    assert.ok(shared.credentials[code]);
    const started = Date.now();
    await second.enter("Ana", code);
    await until(() => second.view.status === "failed", 12000);
    assert.equal(second.view.conflict, true);
    assert.equal(second.view.error, "Esta sala já está aberta em outra aba.");
    assert.ok(Date.now() - started >= 6500, "three tries before giving up");

    const oldToken = (shared.session as { token: string }).token;
    await second.enterHere();
    // #301: the old identity is let go explicitly; the server keeps it for
    // the tab that is really open (another page).
    // (A late goodbye of the previous test may land here too: filter.)
    assert.deepEqual(
      leaves.filter((l) => l.token === oldToken).map((l) => l.explicit),
      [true],
    );
    await until(() => second.view.status === "connected");
    assert.notEqual(second.view.id, creator);
    assert.equal(second.view.conflict, undefined);
    await until(() => first.view.snapshot!.participants.length === 2);
    assert.equal(first.view.snapshot!.creatorId, creator);
    assert.equal(
      first.view.snapshot!.participants.find((p) => p.id === second.view.id)
        ?.role,
      "guest",
    );
    assert.ok(shared.credentials[code], "the shared credential survives");
  } finally {
    await second.destroy();
    await first.destroy();
    await app.close();
    globalThis.fetch = nativeFetch;
    if (locationDescriptor)
      Object.defineProperty(globalThis, "location", locationDescriptor);
    else Reflect.deleteProperty(globalThis, "location");
  }
});

// #301: a network change leaves the old socket half open and mute. The page
// that comes back on a new connection gets in by retrying, never by asking.
test('socket velho mudo: a página nova entra sozinha, sem "Entrar nesta aba"', async () => {
  const origin = "http://localhost:3000";
  const app = await createApp({
    ...readConfig({
      PORT: "0",
      SESSION_SECRET: "test-only-room-credential-client-secret",
      ALLOWED_ORIGINS: origin,
      STUN_URLS: "",
    }),
    holderProbe: 200,
    holderQuiet: 800,
  });
  app.http.listen(0, "127.0.0.1");
  await once(app.http, "listening");
  const url = `http://127.0.0.1:${(app.http.address() as { port: number }).port}`;
  const nativeFetch = globalThis.fetch;
  const locationDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "location",
  );
  Object.defineProperty(globalThis, "location", {
    value: new URL(url),
    configurable: true,
  });
  globalThis.fetch = (input, init) =>
    nativeFetch(
      typeof input === "string" && input.startsWith("/") ? url + input : input,
      { ...init, headers: { ...init?.headers, Origin: origin } },
    );
  const connect = ((uri, options) =>
    io(uri, { ...options, extraHeaders: { Origin: origin } })) as typeof io;
  const session = await (
    await globalThis.fetch("/api/session", { method: "POST" })
  ).json();
  // The old connection: joined, then never answers the presence probe.
  const old = io(url, {
    transports: ["websocket"],
    auth: { token: session.token },
    extraHeaders: { Origin: origin },
    reconnection: false,
  });
  const page = new Controller(undefined, false, connect);
  page.sounds = false;
  (page as unknown as { session: unknown }).session = session;
  try {
    await new Promise((resolve) => old.once("connect", () => resolve(0)));
    const joined = await old.timeout(5000).emitWithAck("command", {
      action: "join",
      data: { name: "Ana", page: "old-000000000000" },
    });
    assert.ok((joined as Reply<unknown>).ok);
    const code = (joined as { data: { snapshot: { code: string } } }).data
      .snapshot.code;
    let asked = false;
    const tick = setInterval(() => (asked ||= !!page.view.conflict), 10);
    await page.enter("Ana", code);
    await until(() => page.view.status === "connected", 10000);
    clearInterval(tick);
    assert.equal(asked, false, 'no "Entrar nesta aba"');
    assert.equal(page.view.id, session.id);
    await until(() => !old.connected, 2000);
    assert.equal(
      app.rooms.rooms.get(code)!.members.get(session.id)!.socketId,
      page.socket!.id,
    );
  } finally {
    old.close();
    await page.destroy();
    await app.close();
    globalThis.fetch = nativeFetch;
    if (locationDescriptor)
      Object.defineProperty(globalThis, "location", locationDescriptor);
    else Reflect.deleteProperty(globalThis, "location");
  }
});

// #301: back from the bfcache, the page is a new one for the server, so the
// late farewell of the pagehide does not take it out of the room again.
test("voltar do bfcache troca a página e o aviso atrasado não derruba a sala", async () => {
  const origin = "http://localhost:3000";
  const app = await createApp({
    ...readConfig({
      PORT: "0",
      SESSION_SECRET: "test-only-room-credential-client-secret",
      ALLOWED_ORIGINS: origin,
      STUN_URLS: "",
    }),
    farewell: 300,
  });
  app.http.listen(0, "127.0.0.1");
  await once(app.http, "listening");
  const url = `http://127.0.0.1:${(app.http.address() as { port: number }).port}`;
  const nativeFetch = globalThis.fetch;
  const locationDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "location",
  );
  Object.defineProperty(globalThis, "location", {
    value: new URL(url),
    configurable: true,
  });
  const held: { input: string; init?: RequestInit }[] = [];
  let hold = false;
  const send = (input: string, init?: RequestInit) =>
    nativeFetch(input.startsWith("/") ? url + input : input, {
      ...init,
      headers: { ...init?.headers, Origin: origin },
    });
  globalThis.fetch = (input, init) => {
    if (hold && input === "/api/leave") {
      held.push({ input, init });
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return send(String(input), init);
  };
  const connect = ((uri, options) =>
    io(uri, { ...options, extraHeaders: { Origin: origin } })) as typeof io;
  const ana = new Controller(undefined, false, connect);
  const bia = new Controller(undefined, false, connect);
  ana.sounds = bia.sounds = false;
  try {
    await ana.enter("Ana");
    await until(() => ana.view.status === "connected");
    const code = ana.view.snapshot!.code;
    await bia.enter("Bia", code);
    await until(() => bia.view.status === "connected");
    // pagehide into the bfcache: the farewell is held back (slow network).
    hold = true;
    ana.farewell();
    ana.socket?.disconnect();
    await until(() => ana.view.status !== "connected");
    await ana.restored();
    await until(() => ana.view.status === "connected");
    hold = false;
    assert.equal(held.length, 1);
    assert.equal((await send(held[0].input, held[0].init)).status, 204);
    await delay(600);
    app.rooms.clean();
    assert.equal(ana.view.status, "connected");
    const me = app.rooms.rooms.get(code)!.members.get(ana.view.id);
    assert.equal(me?.online, true);
    assert.equal(me?.socketId, ana.socket?.id);
    assert.equal(ana.inCall, false);
  } finally {
    await bia.destroy();
    await ana.destroy();
    await app.close();
    globalThis.fetch = nativeFetch;
    if (locationDescriptor)
      Object.defineProperty(globalThis, "location", locationDescriptor);
    else Reflect.deleteProperty(globalThis, "location");
  }
});
