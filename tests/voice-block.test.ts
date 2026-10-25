import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { io } from "socket.io-client";
import { Controller } from "../src/client/room/controller";
import { createApp } from "../src/server/app";
import { readConfig } from "../src/server/config";
import type { Action } from "../src/shared/protocol";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate: () => boolean, timeout = 6000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error("Condition timed out");
    await delay(20);
  }
}
// Stands in for the microphone: no AudioContext or tracks in Node.
const fakeVoice = (key: string) => {
  let stopped = false;
  const stream = {
    getAudioTracks: () => [],
    getTracks: () => [{ stop: () => (stopped = true) }],
  } as unknown as MediaStream;
  return {
    source: { kind: "voice" as const, key, stream },
    stopped: () => stopped,
  };
};

test("voz bloqueada pelo dono solta o microfone e não republica", async () => {
  const origin = "http://localhost:3000";
  const app = await createApp(
    readConfig({
      PORT: "0",
      SESSION_SECRET: "test-only-voice-block-secret-value",
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
  const owner = new Controller(undefined, false, connect);
  const guest = new Controller(undefined, false, connect);
  owner.sounds = guest.sounds = false;
  const sync = (kind: "voice") =>
    (guest as unknown as { syncCapture(k: string): Promise<void> }).syncCapture(
      kind,
    );
  const publishes: string[] = [];
  const request = guest.request.bind(guest);
  guest.request = <T>(action: Action, data?: unknown) => {
    if (action === "publish") publishes.push(action);
    return request<T>(action, data);
  };
  const ownVoice = () =>
    guest.view.snapshot?.participants
      .find((p) => p.id === guest.view.id)
      ?.publications.some((p) => p.kind === "voice");
  try {
    await owner.enter("Dono", "QAVOICEBLOCK");
    await until(() => owner.view.status === "connected");
    await guest.enter("Convidado", "QAVOICEBLOCK");
    await until(() => guest.view.status === "connected");
    guest.joinCall();
    const mic = fakeVoice(crypto.randomUUID());
    guest.captures.sources.set("voice", mic.source);
    await sync("voice");
    await until(() => !!ownVoice());

    await owner.request("moderate", {
      participantId: guest.view.id,
      voiceBlocked: true,
    });
    await until(
      () => guest.voiceBlocked && !guest.captures.sources.has("voice"),
    );
    assert.ok(mic.stopped());
    await until(() => !ownVoice());

    // Reconnect/unmute paths call syncCapture again: nothing is published.
    const before = publishes.length;
    guest.captures.sources.set("voice", fakeVoice(crypto.randomUUID()).source);
    await sync("voice");
    await guest.microphone();
    assert.equal(publishes.length, before);
    assert.equal(guest.captures.sources.has("voice"), false);
    assert.equal(guest.view.error, "");

    // Snapshot lagging behind the block: the server's refusal ends it quietly.
    await owner.request("moderate", {
      participantId: guest.view.id,
      voiceBlocked: false,
    });
    await until(() => !guest.voiceBlocked);
    await owner.request("moderate", {
      participantId: guest.view.id,
      voiceBlocked: true,
    });
    const snapshot = guest.view.snapshot!;
    guest.view.snapshot = {
      ...snapshot,
      participants: snapshot.participants.map((p) =>
        p.id === guest.view.id ? { ...p, voiceBlocked: undefined } : p,
      ),
    };
    guest.captures.sources.set("voice", fakeVoice(crypto.randomUUID()).source);
    await sync("voice").catch(() => {});
    assert.equal(guest.captures.sources.has("voice"), false);
    assert.equal(guest.view.error, "");
  } finally {
    await guest.destroy();
    await owner.destroy();
    await app.close();
    globalThis.fetch = nativeFetch;
    if (locationDescriptor)
      Object.defineProperty(globalThis, "location", locationDescriptor);
    else Reflect.deleteProperty(globalThis, "location");
  }
});
