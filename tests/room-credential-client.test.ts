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
