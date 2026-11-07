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

// #286: the same session open twice stops after two tries and "Entrar nesta
// aba" joins as a new tab would, without taking the creator seat.
test("mesma sessão em duas abas: para após duas tentativas e entra sem a credencial", async () => {
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
  globalThis.fetch = (input, init) =>
    nativeFetch(
      typeof input === "string" && input.startsWith("/") ? url + input : input,
      { ...init, headers: { ...init?.headers, Origin: origin } },
    );
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
    await until(() => second.view.status === "failed", 8000);
    assert.equal(second.view.conflict, true);
    assert.equal(second.view.error, "Esta sala já está aberta em outra aba.");
    assert.ok(Date.now() - started >= 2500, "two tries before giving up");

    await second.enterHere();
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
