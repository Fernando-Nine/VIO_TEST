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
      MAX_PARTICIPANTS: "6", // A legacy deployment must not reintroduce the cap.
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
test("oito pessoas entram sem teto de seis; aviso e duração pertencem à sala", async () => {
  const app = await server();
  const sockets: Socket[] = [];
  try {
    const config = await fetch(app.url + "/api/config").then((r) => r.json());
    assert.equal(config.maxParticipants, null);
    assert.equal(config.recommendedParticipants, 6);
    const snapshots: Snapshot[] = [];
    for (let i = 0; i < 8; i++) {
      const socket = await connect(app.url, (await session(app.url)).token);
      sockets.push(socket);
      const reply = await request<{ snapshot: Snapshot }>(socket, "join", {
        name: `Pessoa ${i + 1}`,
        code: "QALIMITE",
      });
      snapshots.push(data(reply).snapshot);
    }
    assert.equal(snapshots[7].participants.length, 8);
    assert.equal(snapshots[7].recommendedParticipants, 6);
    assert.equal(snapshots[7].maxParticipants, null);
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
    assert.equal(room.subscriptions.size, 2);
    assert.equal(room.subscriptions.has(first.id), true);
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
        color: "#26D0C7",
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
        color: "#26D0C7",
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
    assert.equal(again.snapshot.participants[0].color, "#26D0C7");
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

test("origem de casca nativa é aceita sem afrouxar a regra da web", async () => {
  const app = "tauri://localhost";

  // A lista de casca aceita esquema próprio e host local, e recusa o resto.
  // Estas três recusas são o ponto do teste: sem elas ALLOWED_APP_ORIGINS
  // viraria a porta dos fundos para burlar a exigência de HTTPS.
  for (const ruim of [
    "https://evil.example",
    "http://evil.example",
    "null",
    "*",
    "tauri://localhost/algum/caminho",
  ])
    assert.throws(
      () =>
        readConfig({
          PORT: "0",
          SESSION_SECRET: secret,
          ALLOWED_ORIGINS: origin,
          ALLOWED_APP_ORIGINS: ruim,
        }),
      new RegExp("ALLOWED_APP_ORIGINS"),
      `deveria recusar ${ruim}`,
    );

  // A regra de produção continua valendo para a lista web.
  assert.throws(() =>
    readConfig({
      NODE_ENV: "production",
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: "http://inseguro.example",
      ALLOWED_APP_ORIGINS: app,
    }),
  );

  const instance = await createApp(
    readConfig({
      PORT: "0",
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: origin,
      ALLOWED_APP_ORIGINS: `${app},http://tauri.localhost`,
      STUN_URLS: "",
    }),
  );
  instance.http.listen(0, "127.0.0.1");
  await once(instance.http, "listening");
  const url = `http://127.0.0.1:${(instance.http.address() as any).port}`;
  try {
    const abrir = (origem?: string) =>
      fetch(url + "/api/session", {
        method: "POST",
        ...(origem ? { headers: { Origin: origem } } : {}),
      });

    assert.equal((await abrir(app)).status, 200, "casca nativa deve entrar");
    assert.equal(
      (await abrir("http://tauri.localhost")).status,
      200,
      "casca do Windows deve entrar",
    );
    assert.equal((await abrir(origin)).status, 200, "web continua entrando");
    assert.equal(
      (await abrir("https://evil.example")).status,
      403,
      "origem desconhecida continua barrada",
    );
    assert.equal(
      (await abrir()).status,
      403,
      "origem ausente continua barrada",
    );

    // E o socket segue a mesma regra do /api/session.
    const token = (await (await abrir(app)).json()).token;
    const socket = await connect(url, token, app);
    try {
      assert.equal(socket.connected, true, "socket da casca deve conectar");
    } finally {
      socket.disconnect();
    }
    await assert.rejects(
      connect(url, token, "https://evil.example"),
      "socket de origem desconhecida continua barrado",
    );
  } finally {
    await instance.close();
  }
});

test("Cloudflare Realtime: TURN por segundo caminho, mutuamente exclusivo do coturn", async () => {
  // As duas variáveis vêm sempre juntas.
  assert.throws(() =>
    readConfig({
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: origin,
      CLOUDFLARE_TURN_KEY_ID: "key123",
    }),
  );
  assert.throws(() =>
    readConfig({
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: origin,
      CLOUDFLARE_TURN_API_TOKEN: "token123",
    }),
  );
  // Nunca junto com o caminho do coturn — ambíguo demais pra adivinhar qual
  // dos dois o servidor deveria seguir.
  assert.throws(() =>
    readConfig({
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: origin,
      TURN_URLS: "turn:relay.example:3478",
      TURN_SECRET: secret,
      CLOUDFLARE_TURN_KEY_ID: "key123",
      CLOUDFLARE_TURN_API_TOKEN: "token123",
    }),
  );

  const config = readConfig({
    PORT: "0",
    SESSION_SECRET: secret,
    ALLOWED_ORIGINS: origin,
    CLOUDFLARE_TURN_KEY_ID: "key123",
    CLOUDFLARE_TURN_API_TOKEN: "token123",
    TURN_TTL_SECONDS: "600",
  });

  const cloudflareResponse = {
    iceServers: [
      { urls: ["stun:stun.cloudflare.com:3478"] },
      {
        urls: ["turn:turn.cloudflare.com:3478?transport=udp"],
        username: "short-lived-username",
        credential: "short-lived-password",
      },
    ],
  };
  const cloudflareUrl =
    "https://rtc.live.cloudflare.com/v1/turn/keys/key123/credentials/generate-ice-servers";
  const calls: { url: string; init: RequestInit }[] = [];
  let statusToReturn = 201;
  const originalFetch = global.fetch;
  // Cirúrgico de propósito: só intercepta a URL da Cloudflare. Um mock que
  // substitui fetch por inteiro também captura a chamada real que o próprio
  // teste faz a /api/session — e session() passa a receber a resposta errada.
  // Foi exatamente isso que travou a primeira versão deste teste: a exceção
  // acontecia antes do try, o servidor nunca fechava, e o processo ficava
  // pendurado esperando um socket que não existia mais.
  global.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = String(input);
    if (!url.startsWith("https://rtc.live.cloudflare.com/"))
      return originalFetch(input as any, init);
    calls.push({ url, init: init! });
    if (statusToReturn !== 201)
      return new Response("falhou", { status: statusToReturn });
    return new Response(JSON.stringify(cloudflareResponse), { status: 201 });
  }) as typeof fetch;

  try {
    const app = await createApp(config);
    app.http.listen(0, "127.0.0.1");
    await once(app.http, "listening");
    const url = `http://127.0.0.1:${(app.http.address() as any).port}`;
    let a: Socket | undefined;
    try {
      a = await connect(url, (await session(url)).token);
      data(await request(a, "join", { name: "Relay", code: "QACF" }));

      const ice = data(await request<any>(a, "ice"));
      assert.equal(ice.turn, true);
      assert.deepEqual(ice.iceServers, cloudflareResponse.iceServers);
      assert.ok(ice.expiresAt > Date.now());
      assert.ok(ice.expiresAt <= Date.now() + 601000);

      // A chamada bateu no endpoint certo, com o token no header — nunca no
      // corpo nem em qualquer lugar visível ao cliente.
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, cloudflareUrl);
      assert.equal(
        (calls[0].init.headers as Record<string, string>).Authorization,
        "Bearer token123",
      );
      assert.equal(JSON.parse(String(calls[0].init.body)).ttl, 600);
      assert.equal(JSON.stringify(ice).includes("token123"), false);

      // Uma segunda chamada de "ice" logo em seguida reaproveita a
      // credencial — não bate na Cloudflare de novo. É a mesma pessoa
      // pedindo de novo (ex: reconexão rápida) ou outro participante da sala.
      const iceOutraVez = data(await request<any>(a, "ice"));
      assert.equal(calls.length, 1);
      assert.deepEqual(iceOutraVez.iceServers, cloudflareResponse.iceServers);
    } finally {
      a?.disconnect();
      await app.close();
    }

    // A Cloudflare fora do ar não vira um servidor quebrado — o pedido falha
    // com uma mensagem, não trava a sala nem derruba a conexão. Sala nova
    // (sem cache de credencial ainda) para isolar este caso do de cima.
    statusToReturn = 500;
    const app2 = await createApp(config);
    app2.http.listen(0, "127.0.0.1");
    await once(app2.http, "listening");
    const url2 = `http://127.0.0.1:${(app2.http.address() as any).port}`;
    let b: Socket | undefined;
    try {
      b = await connect(url2, (await session(url2)).token);
      data(await request(b, "join", { name: "Relay", code: "QACF2" }));
      const falhou = await request(b, "ice");
      assert.equal(falhou.ok, false);
      assert.equal((falhou as any).code, "TURN_UNAVAILABLE");

      // Volta a funcionar assim que a Cloudflare volta a responder — sem
      // precisar reconectar nem reentrar na sala.
      statusToReturn = 201;
      const recuperou = data(await request<any>(b, "ice"));
      assert.deepEqual(recuperou.iceServers, cloudflareResponse.iceServers);
    } finally {
      b?.disconnect();
      await app2.close();
    }
  } finally {
    global.fetch = originalFetch;
  }
});
test("credencial TURN estática: par fixo da config, sem HMAC", async () => {
  // Usuário e senha vêm sempre juntos.
  assert.throws(() =>
    readConfig({
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: origin,
      TURN_URLS: "turn:relay.example:3478",
      TURN_USERNAME: "usuario",
    }),
  );
  // Estática e efêmera são modos diferentes de fazer a mesma coisa: juntas, não
  // há como saber qual das duas o servidor deveria mandar.
  assert.throws(() =>
    readConfig({
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: origin,
      TURN_URLS: "turn:relay.example:3478",
      TURN_USERNAME: "usuario",
      TURN_PASSWORD: "senha",
      TURN_SECRET: secret,
    }),
  );
  // Credencial sem relay pra onde apontar é config pela metade.
  assert.throws(() =>
    readConfig({
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: origin,
      TURN_USERNAME: "usuario",
      TURN_PASSWORD: "senha",
    }),
  );
  // URL malformada continua barrada, agora com mensagem própria.
  assert.throws(() =>
    readConfig({
      SESSION_SECRET: secret,
      ALLOWED_ORIGINS: origin,
      TURN_URLS: "relay.example:3478",
      TURN_USERNAME: "usuario",
      TURN_PASSWORD: "senha",
    }),
  );
  const config = readConfig({
    PORT: "0",
    SESSION_SECRET: secret,
    ALLOWED_ORIGINS: origin,
    TURN_URLS: "turn:relay.example:3478,turns:relay.example:5349",
    TURN_USERNAME: "usuario-do-provedor",
    TURN_PASSWORD: "senha-estatica-do-provedor",
  });
  const app = await createApp(config);
  app.http.listen(0, "127.0.0.1");
  await once(app.http, "listening");
  const url = `http://127.0.0.1:${(app.http.address() as any).port}`;
  const a = await connect(url, (await session(url)).token);
  try {
    data(await request(a, "join", { name: "Estatica", code: "QASTAT" }));
    const ice = data(await request<any>(a, "ice"));
    assert.equal(ice.turn, true);
    const relay = ice.iceServers[1];
    assert.deepEqual(relay.urls, [
      "turn:relay.example:3478",
      "turns:relay.example:5349",
    ]);
    // O par sai exatamente como entrou: sem prefixo de expiração no usuário e
    // sem HMAC na credencial, que é o que distingue este modo do coturn.
    assert.equal(relay.username, "usuario-do-provedor");
    assert.equal(relay.credential, "senha-estatica-do-provedor");
    // Duas chamadas devolvem a mesma credencial — não há rotação a esperar.
    const outra = data(await request<any>(a, "ice"));
    assert.equal(outra.iceServers[1].credential, relay.credential);
  } finally {
    a.disconnect();
    await app.close();
  }
});

test("várias telas mantêm IDs; encerrar uma preserva as outras; voz é independente", async () => {
  const app = await server();
  const sockets: Socket[] = [];
  try {
    for (let i = 0; i < 7; i++) {
      const socket = await connect(app.url, (await session(app.url)).token);
      sockets.push(socket);
      data(
        await request(socket, "join", { name: `Pessoa ${i}`, code: "QAPAIR" }),
      );
    }
    const publications: Publication[] = [];
    for (let i = 0; i < 6; i++)
      publications.push(
        data(
          await request<Publication>(sockets[i], "publish", {
            kind: "screen",
            key: crypto.randomUUID(),
            audio: true,
            muted: false,
          }),
        ),
      );
    const viewer = sockets[6];
    const intents = publications.map((p) => ({
      publicationId: p.id,
      tier: "main",
      nonce: crypto.randomUUID(),
    }));
    const a = data(
      await request<Subscription>(viewer, "subscribe", intents[0]),
    );
    const b = data(
      await request<Subscription>(viewer, "subscribe", intents[1]),
    );
    const room = app.rooms.rooms.get("QAPAIR")!;
    assert.equal(room.subscriptions.size, 2);
    for (const [i, id] of [
      [0, a.id],
      [1, b.id],
    ] as const)
      assert.equal(
        data(await request<Subscription>(viewer, "subscribe", intents[i])).id,
        id,
      );
    const extra: Subscription[] = [];
    for (const intent of intents.slice(2))
      extra.push(
        data(await request<Subscription>(viewer, "subscribe", intent)),
      );
    assert.equal(room.subscriptions.size, 6);
    assert.ok(extra.every((sub) => room.subscriptions.has(sub.id)));
    const replacement = data(
      await request<Subscription>(viewer, "subscribe", {
        ...intents[0],
        nonce: crypto.randomUUID(),
      }),
    );
    assert.notEqual(replacement.id, a.id);
    assert.equal(room.subscriptions.has(b.id), true);
    const voice = data(
      await request<Publication>(sockets[0], "publish", {
        kind: "voice",
        key: crypto.randomUUID(),
        audio: true,
        muted: false,
      }),
    );
    const voiceSub = data(
      await request<Subscription>(viewer, "subscribe", {
        publicationId: voice.id,
        tier: "main",
        nonce: crypto.randomUUID(),
      }),
    );
    assert.equal(room.subscriptions.size, 7);
    data(await request(viewer, "unsubscribe", { id: replacement.id }));
    const c = data(
      await request<Subscription>(viewer, "subscribe", intents[2]),
    );
    assert.equal(room.subscriptions.has(b.id), true);
    assert.equal(room.subscriptions.has(c.id), true);
    data(
      await request(sockets[1], "unpublish", {
        publicationId: publications[1].id,
      }),
    );
    assert.equal(room.subscriptions.has(b.id), false);
    assert.equal(room.subscriptions.has(c.id), true);
    assert.equal(room.subscriptions.has(voiceSub.id), true);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await app.close();
  }
});

test("presença na chamada inclui quem só escuta e não publica microfone", async () => {
  const app = await server();
  const a = await connect(app.url, (await session(app.url)).token);
  try {
    const joined = data(
      await request<{ id: string; snapshot: Snapshot }>(a, "join", {
        name: "Ouvinte",
        code: "QACALL",
      }),
    );
    assert.equal(joined.snapshot.participants[0].inCall, false);
    data(await request(a, "call", { active: true }));
    const room = app.rooms.rooms.get("QACALL")!;
    assert.equal(app.rooms.snapshot(room).participants[0].inCall, true);
    assert.deepEqual(app.rooms.snapshot(room).participants[0].publications, []);
    data(await request(a, "call", { active: false }));
    assert.equal(app.rooms.snapshot(room).participants[0].inCall, false);
    assert.equal(
      (await request(a, "call", { active: true, owner: "someone" })).ok,
      false,
    );
  } finally {
    a.disconnect();
    await app.close();
  }
});

test("trocar identidades não contorna limites de sessão e entrada por IP", async () => {
  const app = await server();
  const sockets: Socket[] = [];
  try {
    const tokens: string[] = [];
    for (let i = 0; i < 30; i++) tokens.push((await session(app.url)).token);
    const blocked = await fetch(app.url + "/api/session", {
      method: "POST",
      headers: { Origin: origin },
    });
    assert.equal(blocked.status, 429);
    // Five identities stay below each token's limit, but share the IP budget.
    for (const token of tokens.slice(0, 5))
      sockets.push(await connect(app.url, token));
    for (let i = 0; i < 40; i++) {
      const socket = sockets[i % sockets.length];
      data(await request(socket, "join", { name: "Teste", code: "RATE" + i }));
      data(await request(socket, "leave"));
    }
    const denied = await request(sockets[0], "join", {
      name: "Teste",
      code: "RATEBLOCK",
    });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.code, "RATE_LIMIT");
    assert.equal(app.rooms.rooms.has("RATEBLOCK"), false);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await app.close();
  }
});

test("cor pertence à própria sessão, sincroniza e permanece na reconexão", async () => {
  const app = await server();
  const identity = await session(app.url);
  let a = await connect(app.url, identity.token);
  const b = await connect(app.url, (await session(app.url)).token);
  const outsider = await connect(app.url, (await session(app.url)).token);
  try {
    const first = data(
      await request<{ id: string; snapshot: Snapshot }>(a, "join", {
        name: "Ana",
        code: "QACOLOR",
      }),
    );
    assert.equal(first.snapshot.participants[0].color, "#2727F5");
    data(await request(b, "join", { name: "Bia", code: "QACOLOR" }));
    assert.equal(
      (await request(outsider, "color", { color: "#FF0000" })).ok,
      false,
    );
    const changed = new Promise<Snapshot>((resolve) =>
      b.once("snapshot", resolve),
    );
    data(await request(a, "color", { color: "#ec75b5" }));
    const snapshot = await changed;
    assert.equal(
      snapshot.participants.find((p) => p.id === first.id)?.color,
      "#EC75B5",
    );
    assert.equal(
      snapshot.participants.find((p) => p.id !== first.id)?.color,
      "#2727F5",
    );
    for (const payload of [
      { color: "#00FF00", owner: first.id },
      { color: "#fff;display:none" },
      { color: "<svg>" },
      { color: "#12345678" },
    ])
      assert.equal((await request(b, "color", payload)).ok, false);
    const offline = new Promise<Snapshot>((resolve) =>
      b.once("snapshot", resolve),
    );
    a.disconnect();
    await offline;
    a = await connect(app.url, identity.token);
    const rejoin = data(
      await request<{ snapshot: Snapshot }>(a, "join", {
        name: "Ana",
        code: "QACOLOR",
        color: "#2727F5",
      }),
    );
    assert.equal(
      rejoin.snapshot.participants.find((p) => p.id === first.id)?.color,
      "#EC75B5",
    );
    data(await request(a, "leave"));
    const next = data(
      await request<{ snapshot: Snapshot }>(a, "join", {
        name: "Ana",
        code: "QACOLOR2",
      }),
    );
    assert.equal(next.snapshot.participants[0].color, "#2727F5");
  } finally {
    a.disconnect();
    b.disconnect();
    outsider.disconnect();
    await app.close();
  }
});

test("alterações de cor têm limite por identidade sem bloquear os outros participantes", async () => {
  const app = await server();
  const a = await connect(app.url, (await session(app.url)).token);
  const b = await connect(app.url, (await session(app.url)).token);
  try {
    data(await request(a, "join", { name: "Ana", code: "QACOLORRATE" }));
    data(await request(b, "join", { name: "Bia", code: "QACOLORRATE" }));
    for (let i = 0; i < 20; i++)
      data(await request(a, "color", { color: i % 2 ? "#FF0000" : "#00FF00" }));
    const denied = await request(a, "color", { color: "#0000FF" });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.code, "RATE_LIMIT");
    data(await request(b, "color", { color: "#60CFDC" }));
  } finally {
    a.disconnect();
    b.disconnect();
    await app.close();
  }
});

test("widgets compartilhados isolam salas e estrutura, preservam operações concorrentes e rascunhos", async () => {
  const app = await server();
  const sockets: Socket[] = [];
  try {
    for (let i = 0; i < 3; i++)
      sockets.push(await connect(app.url, (await session(app.url)).token));
    const [owner, member, outsider] = sockets;
    const joined = data(
      await request<{ id: string }>(owner, "join", {
        name: "Criador",
        code: "QAWIDGET",
      }),
    );
    data(await request(member, "join", { name: "Colega", code: "QAWIDGET" }));
    data(
      await request(outsider, "join", {
        name: "Outra sala",
        code: "OUTRAWIDGET",
      }),
    );
    const id = crypto.randomUUID(),
      score = crypto.randomUUID(),
      text = crypto.randomUUID();
    const content = {
      title: "Partida",
      blocks: [
        { id: score, kind: "score", label: "Pontos", value: 0 },
        { id: text, kind: "text", label: "Notas", value: "Original" },
      ],
    };
    const received = new Promise<{ widget: { owner: string } }>((resolve) =>
      member.once("widget-updated", resolve),
    );
    data(await request(owner, "widget-create", { id, content }));
    assert.equal((await received).widget.owner, joined.id);
    for (const actor of [member, outsider]) {
      assert.equal(
        (await request(actor, "widget-structure", { id, revision: 0, content }))
          .ok,
        false,
      );
      assert.equal((await request(actor, "widget-delete", { id })).ok, false);
    }
    assert.equal(
      (
        await request(outsider, "widget-operate", {
          id,
          operationId: crypto.randomUUID(),
          operation: { kind: "score", blockId: score, delta: 1 },
        })
      ).ok,
      false,
    );
    const operationId = crypto.randomUUID();
    const increment = {
      id,
      operationId,
      operation: { kind: "score", blockId: score, delta: 1 },
    };
    data(await request(member, "widget-operate", increment));
    data(await request(member, "widget-operate", increment));
    await Promise.all(
      [owner, member].map((actor) =>
        request(actor, "widget-operate", {
          ...increment,
          operationId: crypto.randomUUID(),
        }).then(data),
      ),
    );
    const room = app.rooms.rooms.get("QAWIDGET")!;
    assert.equal(
      (room.widgets.entries.get(id)!.blocks[0] as { value: number }).value,
      3,
    );
    assert.equal(room.widgets.entries.get(id)!.revision, 3);
    const conflict = await request(member, "widget-operate", {
      id,
      operationId: crypto.randomUUID(),
      operation: {
        kind: "text",
        blockId: text,
        value: "Rascunho antigo",
        revision: 0,
      },
    });
    assert.equal(conflict.ok, false);
    if (!conflict.ok) assert.equal(conflict.code, "WIDGET_CONFLICT");
    assert.equal(
      (room.widgets.entries.get(id)!.blocks[1] as { value: string }).value,
      "Original",
    );
    data(
      await request(member, "widget-operate", {
        id,
        operationId: crypto.randomUUID(),
        operation: {
          kind: "text",
          blockId: text,
          value: "Texto revisado",
          revision: 3,
        },
      }),
    );
    assert.equal(
      (await request(owner, "widget-structure", { id, revision: 3, content }))
        .ok,
      false,
    );
    assert.equal(
      (await request(member, "widget-create", { id, content })).ok,
      false,
    );
    data(await request(owner, "leave"));
    data(
      await request(member, "widget-operate", {
        ...increment,
        operationId: crypto.randomUUID(),
      }),
    );
    assert.equal(
      (await request(member, "widget-structure", { id, revision: 5, content }))
        .ok,
      false,
    );
    assert.equal(room.widgets.entries.size, 1);
    data(await request(member, "leave"));
    assert.equal(room.widgets.entries.size, 0);
    room.touched = 0;
    app.rooms.clean();
    assert.equal(app.rooms.rooms.has("QAWIDGET"), false);
  } finally {
    sockets.forEach((s) => s.disconnect());
    await app.close();
  }
});

test("widgets rejeitam campos extras, payloads excessivos, blocos duplicados e excesso por criador", async () => {
  const app = await server();
  const socket = await connect(app.url, (await session(app.url)).token);
  try {
    data(
      await request(socket, "join", { name: "Criador", code: "QAWIDGETLIMIT" }),
    );
    const block = {
      id: crypto.randomUUID(),
      kind: "text",
      label: "Nota",
      value: "Texto",
    };
    const content = { title: "Notas", blocks: [block] };
    assert.equal(
      (
        await request(socket, "widget-create", {
          id: crypto.randomUUID(),
          content,
          owner: "fake",
        })
      ).ok,
      false,
    );
    assert.equal(
      (
        await request(socket, "widget-create", {
          id: crypto.randomUUID(),
          content: { ...content, blocks: [block, block] },
        })
      ).ok,
      false,
    );
    assert.equal(
      (
        await request(socket, "widget-create", {
          id: crypto.randomUUID(),
          content: {
            ...content,
            blocks: [{ ...block, value: "a".repeat(2001) }],
          },
        })
      ).ok,
      false,
    );
    for (let i = 0; i < 6; i++)
      data(
        await request(socket, "widget-create", {
          id: crypto.randomUUID(),
          content,
        }),
      );
    const result = await request(socket, "widget-create", {
      id: crypto.randomUUID(),
      content,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "WIDGET_LIMIT");
  } finally {
    socket.disconnect();
    await app.close();
  }
});

test("somente espectador autenticado regula seu vídeo main; áudio e outras assinaturas permanecem", async () => {
  const app = await server();
  const sockets: Socket[] = [];
  try {
    for (let i = 0; i < 3; i++) {
      const socket = await connect(app.url, (await session(app.url)).token);
      sockets.push(socket);
      data(
        await request(socket, "join", {
          name: `Pessoa ${i}`,
          code: i === 2 ? "QADEMANDOTHER" : "QADEMAND",
        }),
      );
    }
    const [owner, viewer, outsider] = sockets;
    const publication = data(
      await request<Publication>(owner, "publish", {
        kind: "screen",
        key: crypto.randomUUID(),
        audio: true,
        muted: false,
      }),
    );
    const subscription = data(
      await request<Subscription>(viewer, "subscribe", {
        publicationId: publication.id,
        tier: "main",
        nonce: crypto.randomUUID(),
      }),
    );
    const received = new Promise<{ id: string; video: string }>((resolve) =>
      owner.once("video-demand", resolve),
    );
    data(
      await request(viewer, "demand", {
        id: subscription.id,
        video: "off",
        height: 240,
      }),
    );
    assert.deepEqual(await received, {
      id: subscription.id,
      video: "off",
      height: 240,
    });
    const room = app.rooms.rooms.get("QADEMAND")!;
    assert.equal(room.subscriptions.size, 1);
    assert.equal(
      room.subscriptions.get(subscription.id)?.publication.audio,
      true,
    );
    assert.equal(
      (
        await request(owner, "demand", {
          id: subscription.id,
          video: "off",
          height: 240,
        })
      ).ok,
      false,
    );
    assert.equal(
      (
        await request(outsider, "demand", {
          id: subscription.id,
          video: "focus",
          height: 1080,
        })
      ).ok,
      false,
    );
    const preview = data(
      await request<Subscription>(viewer, "subscribe", {
        publicationId: publication.id,
        tier: "preview",
        nonce: crypto.randomUUID(),
      }),
    );
    assert.equal(
      (
        await request(viewer, "demand", {
          id: preview.id,
          video: "focus",
          height: 2160,
        })
      ).ok,
      false,
    );
    assert.equal(
      (
        await request(viewer, "demand", {
          id: subscription.id,
          video: "focus",
          height: 99999,
        })
      ).ok,
      false,
    );
    data(
      await request(viewer, "demand", {
        id: subscription.id,
        video: "focus",
        height: 1080,
      }),
    );
    assert.equal(room.subscriptions.get(subscription.id)?.id, subscription.id);
    assert.equal(
      room.subscriptions.get(subscription.id)?.demand?.video,
      "focus",
    );
  } finally {
    sockets.forEach((s) => s.disconnect());
    await app.close();
  }
});

test("espectadores são por publicação, excluem miniaturas e nunca vazam para outra sala", async () => {
  const app = await server();
  const sockets: Socket[] = [];
  try {
    for (let i = 0; i < 4; i++)
      sockets.push(await connect(app.url, (await session(app.url)).token));
    const ids: string[] = [];
    for (const [i, socket] of sockets.entries())
      ids.push(
        data(
          await request<{ id: string }>(socket, "join", {
            name: `Pessoa ${i}`,
            code: i === 3 ? "QAVIEWOTHER" : "QAVIEWERS",
          }),
        ).id,
      );
    const publish = async (socket: Socket) =>
      data(
        await request<Publication>(socket, "publish", {
          kind: "screen",
          key: crypto.randomUUID(),
          audio: true,
          muted: false,
        }),
      );
    const a = await publish(sockets[0]),
      b = await publish(sockets[1]);
    const watch = async (
      socket: Socket,
      publicationId: string,
      tier: "main" | "preview",
    ) =>
      data(
        await request<Subscription>(socket, "subscribe", {
          publicationId,
          tier,
          nonce: crypto.randomUUID(),
        }),
      );
    await watch(sockets[2], a.id, "preview");
    const joined = new Promise<Record<string, string[]>>((resolve) =>
      sockets[1].once("screen-viewers", resolve),
    );
    const main = await watch(sockets[2], a.id, "main");
    assert.deepEqual((await joined)[a.id], [ids[2]]);
    await watch(sockets[0], b.id, "main");
    const room = app.rooms.rooms.get("QAVIEWERS")!;
    assert.deepEqual(app.rooms.snapshot(room).screenViewers, {
      [a.id]: [ids[2]],
      [b.id]: [ids[0]],
    });
    assert.deepEqual(
      app.rooms.snapshot(app.rooms.rooms.get("QAVIEWOTHER")!).screenViewers,
      {},
    );
    assert.equal(
      (
        await request(sockets[3], "subscribe", {
          publicationId: a.id,
          tier: "main",
          nonce: crypto.randomUUID(),
        })
      ).ok,
      false,
    );
    data(await request(sockets[2], "unsubscribe", { id: main.id }));
    assert.equal(app.rooms.snapshot(room).screenViewers![a.id], undefined);
    data(await request(sockets[1], "unpublish", { publicationId: b.id }));
    assert.deepEqual(app.rooms.snapshot(room).screenViewers, {});
  } finally {
    sockets.forEach((socket) => socket.disconnect());
    await app.close();
  }
});

test("compartilhar é idempotente e somente criador encerra a instância para todos", async () => {
  const app = await server();
  const owner = await connect(app.url, (await session(app.url)).token),
    member = await connect(app.url, (await session(app.url)).token);
  try {
    data(await request(owner, "join", { name: "Criador", code: "QACLOSE" }));
    data(await request(member, "join", { name: "Colega", code: "QACLOSE" }));
    const id = crypto.randomUUID(),
      content = {
        kind: "notes",
        title: "Notas",
        blocks: [
          {
            id: crypto.randomUUID(),
            kind: "text",
            label: "Texto",
            value: "Não duplicar",
          },
        ],
      };
    data(await request(owner, "widget-create", { id, content }));
    data(await request(owner, "widget-create", { id, content }));
    assert.equal(app.rooms.rooms.get("QACLOSE")!.widgets.entries.size, 1);
    assert.equal((await request(member, "widget-delete", { id })).ok, false);
    const closed = new Promise<{ id: string; widget: null }>((resolve) =>
      member.once("widget-updated", resolve),
    );
    data(await request(owner, "widget-delete", { id }));
    assert.deepEqual(await closed, { id, widget: null });
    assert.equal(app.rooms.rooms.get("QACLOSE")!.widgets.entries.size, 0);
  } finally {
    owner.disconnect();
    member.disconnect();
    await app.close();
  }
});
