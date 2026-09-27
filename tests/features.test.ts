import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { AudioOutput } from "../src/client/media/audio-output";
import { connectionMetric, formatDuration } from "../src/client/room/status";
import { releases, version } from "../src/shared/releases";

test("ping distingue sinalização e tela, latência e conexão interrompida", () => {
  assert.equal(connectionMetric("connected", 38, false, []).tone, "good");
  assert.equal(connectionMetric("connected", 150, false, []).tone, "warn");
  assert.equal(connectionMetric("connected", 301, false, []).tone, "bad");
  const awaiting = connectionMetric("connected", 12, true, []);
  assert.equal(awaiting.source, "Tela");
  assert.equal(awaiting.label, "Aguardando");
  assert.equal(
    connectionMetric("connected", 12, true, [
      { state: "connected", rtt: 80 },
      { state: "connected", rtt: 275 },
    ]).label,
    "275 ms",
  );
  assert.equal(
    connectionMetric("connected", 12, true, [
      { state: "disconnected", rtt: 20 },
    ]).tone,
    "bad",
  );
  assert.equal(
    connectionMetric("reconnecting", 12, false, []).label,
    "Conectando",
  );
  assert.equal(formatDuration(3661.9), "01:01:01");
  assert.equal(formatDuration(86400), "24:00:00");
});

test("saída muda voz, tela e elementos futuros; falha reverte a seleção", async () => {
  const target = (reject = false) => ({
    sink: "",
    reject,
    async setSinkId(id: string) {
      if (this.reject && id === "indisponivel")
        throw new Error("Device not found");
      this.sink = id;
    },
  });
  const output = new AudioOutput(() =>
    assert.fail("Falha inesperada no registro"),
  );
  const voice = target(),
    screen = target(true),
    later = target();
  const unregister = output.register(voice);
  output.register(screen);
  await output.select("fone");
  assert.equal(voice.sink, "fone");
  assert.equal(screen.sink, "fone");
  output.register(later);
  await output.ready();
  assert.equal(later.sink, "fone");
  await assert.rejects(output.select("indisponivel"));
  assert.equal(output.deviceId, "fone");
  assert.deepEqual(
    [voice.sink, screen.sink, later.sink],
    ["fone", "fone", "fone"],
  );
  unregister();
  await output.select("caixa");
  assert.equal(voice.sink, "fone");
  assert.deepEqual([screen.sink, later.sink], ["caixa", "caixa"]);
});

test("service worker jamais intercepta navegação, sala, sessão ou socket", async () => {
  const listeners: Record<string, (event: any) => void> = {};
  const cached: string[] = [],
    network: string[] = [];
  const cache = {
    match: async () => undefined,
    put: async (request: Request) => {
      cached.push(request.url);
    },
  };
  runInNewContext(await readFile("public/sw.js", "utf8"), {
    URL,
    self: {
      location: { origin: "https://vio.example" },
      addEventListener: (name: string, listener: any) => {
        listeners[name] = listener;
      },
    },
    caches: { open: async () => cache },
    fetch: async (request: Request) => {
      network.push(request.url);
      return {
        ok: true,
        type: "basic",
        clone() {
          return this;
        },
      };
    },
  });
  const request = async (path: string, mode = "cors", method = "GET") => {
    let intercepted = false,
      response: Promise<unknown> | undefined;
    listeners.fetch({
      request: { url: new URL(path, "https://vio.example").href, mode, method },
      respondWith(value: Promise<unknown>) {
        intercepted = true;
        response = value;
      },
    });
    await response;
    return intercepted;
  };
  for (const path of [
    "/",
    "/?sala=TESTE",
    "/sala/TESTE",
    "/room/TESTE",
    "/api/session",
    "/api/config",
    "/socket.io/?EIO=4&transport=polling",
    "/custom-socket",
    "/source.tar.gz",
    "/assets/app.js?sala=TESTE",
    "https://external.example/assets/app.js",
  ])
    assert.equal(await request(path), false, path);
  assert.equal(await request("/assets/app.js", "navigate"), false);
  assert.equal(await request("/assets/app.js", "cors", "POST"), false);
  assert.deepEqual(network, []);
  for (const path of [
    "/assets/app-abc.js",
    "/assets/app-abc.css",
    "/assets/font.woff2",
    "/icons/vio-192.png",
  ])
    assert.equal(await request(path), true, path);
  assert.equal(cached.length, 4);
  assert.deepEqual(cached, network);
});

test("changelog preserva o histórico inteiro e a mudança de sistema", async () => {
  const source = await readFile("docs/CHANGELOG-VIO_2.md");
  const sha = createHash("sha1")
    .update(`blob ${source.length}\0`)
    .update(source)
    .digest("hex");
  assert.equal(sha, "458665f5a357c0f0f1c261d055e5e18429839d9c");
  const historic = releases.filter((r) => r.legacy);
  const versions = [...source.toString().matchAll(/^## \[(.*?)\]/gm)].map(
    (m) => m[1],
  );
  assert.deepEqual(
    historic.map((r) => r.version),
    versions,
  );
  assert.equal(historic.length, 16);
  assert.equal(version, "2.4.1");
  assert.equal(
    releases.find((release) => release.version === "2.0.0")?.systemChange,
    true,
  );
  const originalBullets = [
    ...source.toString().matchAll(/^[-*] (.*(?:\n {2,}[^\n]+)*)/gm),
  ].map((m) => m[1].replace(/\s+/g, " ").trim());
  const displayedBullets = historic.flatMap((r) =>
    r.sections.flatMap((s) => s.items),
  );
  assert.deepEqual(displayedBullets, originalBullets);
});
