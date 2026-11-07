import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { io } from "socket.io-client";
import { Controller } from "../src/client/room/controller";
import { createApp } from "../src/server/app";
import { readConfig } from "../src/server/config";
import {
  conflictDelay,
  conflictText,
  recoveryDelay,
} from "../src/client/room/recovery";
import {
  needsFreshSession,
  readTabRoom,
  RESUME_WINDOW,
  resumeCode,
  writeTabRoom,
} from "../src/client/room/tab-room";
import type { Action } from "../src/shared/protocol";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate: () => boolean, timeout = 6000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error("Condition timed out");
    await delay(20);
  }
}
test("recuperação automática supera oito tentativas, reentra após restart e cancela ao sair", async () => {
  const origin = "http://localhost:3000";
  const config = readConfig({
    PORT: "0",
    SESSION_SECRET: "test-only-automatic-recovery-secret",
    ALLOWED_ORIGINS: origin,
    STUN_URLS: "",
  });
  let app = await createApp(config);
  app.http.listen(0, "127.0.0.1");
  await once(app.http, "listening");
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
  const engine = new Controller(undefined, false, ((uri, options) =>
    io(uri, {
      ...options,
      extraHeaders: { Origin: origin },
      reconnectionDelay: 35,
      reconnectionDelayMax: 50,
    })) as typeof io);
  engine.sounds = false;
  try {
    await engine.enter("Recuperação", "QARECOVERY");
    await until(() => engine.view.status === "connected");
    const id = engine.view.id,
      epoch = engine.view.snapshot!.epoch;
    let joins = 0;
    const request = engine.request.bind(engine);
    engine.request = <T>(action: Action, data?: unknown) => {
      if (action === "join" && ++joins === 1)
        return Promise.reject(new Error("Simulated lost join ACK"));
      return request<T>(action, data);
    };
    engine.socket!.io.engine.close();
    await until(() => joins >= 2 && engine.view.status === "connected");
    assert.equal(engine.view.id, id);
    assert.equal(engine.view.snapshot!.participants.length, 1);
    let attempts = 0;
    engine.socket!.io.on("reconnect_attempt", () => attempts++);
    await app.close();
    await until(() => attempts >= 10);
    assert.equal(engine.view.status, "reconnecting");
    app = await createApp({ ...config, port });
    app.http.listen(port, "127.0.0.1");
    await once(app.http, "listening");
    await until(
      () =>
        engine.view.status === "connected" &&
        engine.view.snapshot?.epoch !== epoch,
    );
    assert.equal(engine.view.id, id);
    assert.equal(engine.view.snapshot!.participants.length, 1);
    engine.socket!.io.engine.close();
    await engine.leave();
    await delay(1200);
    assert.equal(engine.view.status, "idle");
    assert.equal(engine.socket, undefined);
    assert.ok(recoveryDelay(50, 0) >= 24000);
    assert.ok(recoveryDelay(50, 1) <= 36000);
  } finally {
    await engine.destroy();
    await app.close();
    globalThis.fetch = nativeFetch;
    if (locationDescriptor)
      Object.defineProperty(globalThis, "location", locationDescriptor);
    else Reflect.deleteProperty(globalThis, "location");
  }
});

test("conflito de sessão: três tentativas curtas e depois para (#286)", () => {
  assert.equal(conflictDelay(0), 1000);
  assert.equal(conflictDelay(1), 2000);
  assert.equal(conflictDelay(2), 4000);
  assert.equal(conflictDelay(3), undefined);
  assert.ok(Object.hasOwn(conflictText, "SESSION_IN_USE"));
  assert.ok(Object.hasOwn(conflictText, "ALREADY_JOINED"));
  assert.ok(!Object.hasOwn(conflictText, "toString"));
});

test("sala da aba: recarregar volta sozinho, outra sala pede sessão nova (#286)", () => {
  const now = 1_000_000;
  const room = { code: "ABCDE", hiddenAt: now - 5000 };
  assert.equal(resumeCode(room, "", now), "ABCDE");
  assert.equal(resumeCode(room, " abcde ", now), "ABCDE");
  assert.equal(resumeCode(room, "OTHER", now), undefined);
  assert.equal(resumeCode({ code: "ABCDE" }, "", now), undefined);
  assert.equal(
    resumeCode({ code: "ABCDE", hiddenAt: now - RESUME_WINDOW - 1 }, "", now),
    undefined,
  );
  assert.equal(
    resumeCode({ code: "ABCDE", hiddenAt: now + 1 }, "", now),
    undefined,
  );
  assert.equal(resumeCode(undefined, "", now), undefined);

  assert.equal(needsFreshSession(undefined, "ABCDE"), false);
  assert.equal(needsFreshSession(room, "abcde"), false);
  assert.equal(needsFreshSession(room, "OTHER"), true);
  assert.equal(needsFreshSession(room, undefined), true);

  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  } as Storage;
  writeTabRoom(room, storage);
  assert.deepEqual(readTabRoom(storage), room);
  data.set("vio:room", '{"code":1}');
  assert.equal(readTabRoom(storage), undefined);
  data.set("vio:room", "not json");
  assert.equal(readTabRoom(storage), undefined);
  writeTabRoom(undefined, storage);
  assert.equal(data.size, 0);
});
