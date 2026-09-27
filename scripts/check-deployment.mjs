import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { globalAgent } from "node:https";
import { io } from "socket.io-client";
import { version } from "../src/shared/releases.ts";

const url = new URL(process.argv[2]);
assert.equal(url.protocol, "https:", "Informe a origem HTTPS do serviço.");
const origin = url.origin;
const checks = [];
const sockets = [];
const roomCode =
  "QA" + crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
const request = async (path, init = {}) =>
  fetch(origin + path, {
    ...init,
    signal: AbortSignal.timeout(path === "/healthz" ? 75000 : 20000),
  });
const command = (socket, action, data = {}) =>
  new Promise((resolve, reject) => {
    socket.timeout(10000).emit("command", { action, data }, (error, reply) => {
      if (error) return reject(error);
      if (!reply?.ok)
        return reject(new Error(reply?.message || "Comando recusado"));
      resolve(reply.data);
    });
  });
const connect = async (token) => {
  const socket = io(origin, {
    transports: ["websocket"],
    auth: { token },
    extraHeaders: { Origin: origin },
    reconnection: false,
    timeout: 15000,
    agent: globalAgent,
  });
  sockets.push(socket);
  await new Promise((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });
  return socket;
};
const report = {
  checkedAt: new Date().toISOString(),
  origin,
  checks,
  mediaTransport: "NOT_TESTED",
};
try {
  const health = await request("/healthz");
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);
  assert.match(
    health.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  assert.ok(health.headers.get("strict-transport-security"));
  checks.push("HTTPS, healthz, CSP e HSTS");
  const root = await request("/");
  assert.equal(root.status, 200);
  assert.match(await root.text(), /VIO/);
  const config = await (await request("/api/config")).json();
  assert.equal(config.testLab, false);
  assert.equal(config.maxParticipants, null);
  assert.equal(config.recommendedParticipants, 6);
  checks.push(
    "Página principal, configuração pública e laboratório desativado",
  );
  const manifest = await (await request("/manifest.webmanifest")).json();
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons.length, 3);
  const worker = await request("/sw.js");
  assert.equal(worker.status, 200);
  assert.match(worker.headers.get("cache-control"), /no-cache/);
  assert.match(worker.headers.get("content-type"), /javascript/);
  assert.ok((await worker.text()).includes(`vio-static-${version}`));
  checks.push(
    `Manifest e service worker ${version} entregues com cache de atualização correto`,
  );
  const source = await request("/source.tar.gz");
  assert.equal(source.status, 200);
  assert.match(source.headers.get("content-disposition"), /source\.tar\.gz/);
  assert.deepEqual(
    [...new Uint8Array(await source.arrayBuffer()).slice(0, 2)],
    [31, 139],
  );
  checks.push("Código-fonte disponível para download");
  const denied = await request("/api/session", {
    method: "POST",
    headers: { Origin: "https://example.invalid" },
  });
  assert.equal(denied.status, 403);
  checks.push("Sessão de origem externa recusada");
  const members = [];
  for (let i = 0; i < 3; i++) {
    const response = await request("/api/session", {
      method: "POST",
      headers: { Origin: origin },
    });
    assert.equal(response.status, 200);
    const session = await response.json();
    const socket = await connect(session.token);
    members.push(
      await command(socket, "join", {
        name: "Validação " + (i + 1),
        code: roomCode,
      }),
    );
  }
  assert.equal(new Set(members.map((m) => m.id)).size, 3);
  checks.push("Três sessões independentes entram na mesma sala por WSS");
  const ice = await command(sockets[0], "ice");
  assert.equal(ice.turn, true);
  const relay = ice.iceServers.filter((server) => server.credential);
  assert.ok(relay.length > 0);
  const relayUrls = relay.flatMap((server) => [server.urls].flat());
  assert.ok(relayUrls.some((value) => value.endsWith("?transport=udp")));
  assert.ok(relayUrls.some((value) => value.endsWith("?transport=tcp")));
  checks.push(
    "Sessão da sala recebe TURN UDP/TCP; credenciais omitidas do relatório",
  );
  const publications = [];
  for (const socket of sockets.slice(0, 2))
    publications.push(
      await command(socket, "publish", {
        kind: "screen",
        key: crypto.randomUUID(),
        audio: false,
        muted: false,
      }),
    );
  const subscription = await command(sockets[2], "subscribe", {
    publicationId: publications[0].id,
    tier: "main",
    nonce: crypto.randomUUID(),
  });
  const secondary = await command(sockets[2], "subscribe", {
    publicationId: publications[1].id,
    tier: "main",
    nonce: crypto.randomUUID(),
  });
  assert.notEqual(secondary.id, subscription.id);
  const routed = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Sinal não recebido")),
      10000,
    );
    sockets[2].once("signal", (signal) => {
      clearTimeout(timeout);
      resolve(signal);
    });
  });
  const signalAck = new Promise((resolve, reject) =>
    sockets[0].timeout(10000).emit(
      "signal",
      {
        id: subscription.id,
        round: 1,
        description: { type: "offer", sdp: "v=0" },
      },
      (error, reply) => (error ? reject(error) : resolve(reply)),
    ),
  );
  const [signal, ack] = await Promise.all([routed, signalAck]);
  assert.equal(ack.ok, true);
  assert.equal(signal.id, subscription.id);
  checks.push(
    "Duas publicações, assinatura seletiva e roteamento de sinalização",
  );
  report.status = "PASS";
} catch (error) {
  report.status = "FAIL";
  report.error = error.message;
  process.exitCode = 1;
} finally {
  await Promise.allSettled(
    sockets.filter((s) => s.connected).map((s) => command(s, "leave")),
  );
  sockets.forEach((s) => s.disconnect());
  const text = JSON.stringify(report, null, 2) + "\n";
  if (process.argv[3]) await writeFile(process.argv[3], text);
  console.log(text);
}
