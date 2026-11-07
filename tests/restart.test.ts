import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import net from "node:net";
import { io } from "socket.io-client";
import { Controller } from "../src/client/room/controller";
import { createApp } from "../src/server/app";
import { readConfig } from "../src/server/config";

// #292: a server restart (same SESSION_SECRET, new process) brings everyone
// back once, in silence, even a tab that comes back under a new identity.
const origin = "http://localhost:3000";
const config = readConfig({
  PORT: "0",
  SESSION_SECRET: "test-only-restart-secret-value-0123456789",
  ALLOWED_ORIGINS: origin,
  STUN_URLS: "",
});
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean, timeout = 15000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error("timeout");
    await delay(20);
  }
}
async function start() {
  const app = await createApp(config);
  app.http.listen(0, "127.0.0.1");
  await once(app.http, "listening");
  return { app, port: (app.http.address() as { port: number }).port };
}

test(
  "reinício: cada pessoa volta uma vez, sem som de entrar ou sair",
  { timeout: 60000 },
  async () => {
    let server = await start();
    // The clients keep one address while the process behind it changes.
    let target = server.port;
    const proxy = net.createServer((client) => {
      const upstream = net.connect(target, "127.0.0.1");
      client.pipe(upstream).pipe(client);
      client.on("error", () => upstream.destroy());
      upstream.on("error", () => client.destroy());
    });
    proxy.listen(0, "127.0.0.1");
    await once(proxy, "listening");
    const url = `http://127.0.0.1:${(proxy.address() as { port: number }).port}`;
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
        typeof input === "string" && input.startsWith("/")
          ? url + input
          : input,
        { ...init, headers: { ...init?.headers, Origin: origin } },
      );
    const duplicates: string[] = [];
    const person = () => {
      const engine = new Controller(undefined, false, ((uri, options) =>
        io(uri, {
          ...options,
          extraHeaders: { Origin: origin },
        })) as typeof io);
      const cues: string[] = [];
      Object.assign(engine, {
        playCue: async (cue: string) => void cues.push(cue),
      });
      engine.subscribe(() => {
        const names = engine.view.snapshot?.participants.map((p) => p.name);
        if (names && new Set(names).size !== names.length)
          duplicates.push(names.join(","));
      });
      return { engine, cues };
    };
    const ana = person(),
      bia = person(),
      caio = person();
    const everyone = [ana, bia, caio];
    try {
      await ana.engine.enter("Ana");
      await until(() => ana.engine.view.status === "connected");
      const code = ana.engine.view.snapshot!.code;
      await bia.engine.enter("Bia", code);
      await caio.engine.enter("Caio", code);
      await until(() =>
        everyone.every(
          (x) =>
            x.engine.view.status === "connected" &&
            x.engine.view.snapshot?.participants.length === 3,
        ),
      );
      for (const x of everyone) x.cues.length = 0;

      await server.app.close();
      await delay(500);
      server = await start();
      target = server.port;
      const back = () =>
        everyone.every(
          (x) =>
            x.engine.view.status === "connected" &&
            x.engine.view.snapshot?.epoch === server.app.rooms.epoch &&
            x.engine.view.snapshot.participants.filter((p) => p.online)
              .length === 3,
        );
      await until(back);

      // The same tab under a new identity (an expired token) swaps in place.
      const old = bia.engine.view.id;
      await (
        bia.engine as unknown as { newSession(): Promise<void> }
      ).newSession();
      await until(() => bia.engine.view.id !== old && back());
      const members = [...server.app.rooms.rooms.get(code)!.members.values()];
      assert.deepEqual(members.map((m) => m.name).sort(), [
        "Ana",
        "Bia",
        "Caio",
      ]);
      await delay(300);
      assert.deepEqual(duplicates, []);
      for (const x of everyone)
        assert.deepEqual(x.cues, [], "sem som na volta");

      // Someone really new still sounds.
      const dani = person();
      await dani.engine.enter("Dani", code);
      await until(() => ana.engine.view.snapshot?.participants.length === 4);
      await delay(100);
      assert.deepEqual(ana.cues, ["room-enter"]);
      await dani.engine.destroy();
    } finally {
      for (const x of everyone) await x.engine.destroy();
      await server.app.close();
      proxy.close();
      globalThis.fetch = nativeFetch;
      if (locationDescriptor)
        Object.defineProperty(globalThis, "location", locationDescriptor);
      else Reflect.deleteProperty(globalThis, "location");
    }
  },
);
