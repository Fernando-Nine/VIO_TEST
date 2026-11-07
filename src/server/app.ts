import express from "express";
import helmet from "helmet";
import proxyaddr from "proxy-addr";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { Server } from "socket.io";
import { Rooms } from "./rooms";
import { Fault, Limits, verifyToken, issueToken, log } from "./security";
import { readConfig, type Config } from "./config";
import { version } from "../shared/releases";
import { farewellSchema } from "../shared/protocol";
export async function createApp(config: Config = readConfig(), dev = false) {
  const app = express();
  const http = createServer(app);
  const limits = new Limits();
  const counts = new Map<string, number>();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use(
    helmet({
      contentSecurityPolicy: dev
        ? false
        : {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              fontSrc: ["'self'"],
              imgSrc: ["'self'", "data:"],
              connectSrc: [
                "'self'",
                ...config.origins,
                ...config.origins.map((v) => v.replace(/^http/, "ws")),
              ],
              mediaSrc: ["'self'", "blob:"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              upgradeInsecureRequests: config.production ? [] : null,
            },
          },
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: config.production ? undefined : false,
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "camera=(self), microphone=(self), display-capture=(self), fullscreen=(self), speaker-selection=(self)",
    );
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const o = req.headers.origin;
    // The Windows app loads its bundled interface from https://tauri.localhost.
    if (o && (config.origins.includes(o) || config.appOrigins.includes(o))) {
      res.setHeader("Access-Control-Allow-Origin", o);
      res.setHeader("Vary", "Origin");
    }
    next();
  });
  // Origem permitida num lugar só: web (com a regra de HTTPS) mais casca nativa
  // (lista própria). Antes esta condição estava escrita duas vezes, e duas
  // cópias de uma regra de segurança é uma a mais do que se consegue manter
  // iguais. Origem AUSENTE continua recusada, de propósito.
  const origemPermitida = (origin?: string) =>
    !!origin &&
    (config.origins.includes(origin) || config.appOrigins.includes(origin));

  app.get("/healthz", (_req, res) => res.json({ ok: true, version }));
  app.get("/api/config", (_req, res) =>
    res.json({
      signalingUrl: config.signalingUrl,
      socketPath: config.socketPath,
      maxParticipants: null,
      recommendedParticipants: config.recommendedParticipants,
      maxPreviews: config.maxPreviews,
      testLab: config.testLab,
    }),
  );
  app.post("/api/session", (req, res) => {
    try {
      if (!origemPermitida(req.headers.origin))
        throw new Fault("ORIGIN", "Origem não permitida.");
      limits.take((req.ip || "unknown") + ":session", 30);
      res.json(issueToken(config.secret, config.sessionTtl));
    } catch (e) {
      res
        .status(e instanceof Fault && e.code === "RATE_LIMIT" ? 429 : 403)
        .json({ message: e instanceof Error ? e.message : "Pedido inválido." });
    }
  });
  // Farewell of a page that leaves (#286). Sent with fetch keepalive, not
  // sendBeacon: a no-cors beacon under no-referrer carries `Origin: null`.
  // text/plain keeps it a simple request; the token never goes in the URL.
  app.post(
    "/api/leave",
    express.text({ type: "text/plain", limit: "2kb" }),
    (req, res) => {
      const refuse = (status: number, message: string) =>
        res.status(status).json({ message });
      if (!origemPermitida(req.headers.origin))
        return refuse(403, "Origem não permitida.");
      try {
        limits.take((req.ip || "unknown") + ":leave", 30);
      } catch {
        return refuse(429, "Muitos pedidos. Aguarde um instante.");
      }
      let body: unknown = null;
      try {
        if (typeof req.body === "string") body = JSON.parse(req.body);
      } catch {}
      const parsed = farewellSchema.safeParse(body);
      if (!parsed.success) return refuse(400, "Pedido inválido.");
      let id: string;
      try {
        id = verifyToken(config.secret, parsed.data.token).id;
      } catch {
        return refuse(403, "Sessão inválida.");
      }
      rooms.farewell(id, parsed.data.page, !!parsed.data.explicit);
      res.status(204).end();
    },
  );
  // Body parser errors (too large, bad charset) of this route only, no stack.
  app.use(
    "/api/leave",
    (
      error: { status?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const given = Number(error?.status);
      const status =
        Number.isInteger(given) && given >= 400 && given < 500 ? given : 500;
      res.status(status).json({
        message:
          status === 413
            ? "Pedido grande demais."
            : status < 500
              ? "Pedido inválido."
              : "Não foi possível sair agora.",
      });
    },
  );
  const trust =
    typeof config.trustProxy === "number"
      ? (_ip: string, i: number) => i < (config.trustProxy as number)
      : config.trustProxy
        ? proxyaddr.compile(config.trustProxy)
        : () => false;
  const io = new Server(http, {
    path: config.socketPath,
    maxHttpBufferSize: 65536,
    transports: ["websocket"],
    serveClient: false,
    pingInterval: 20000,
    pingTimeout: 20000,
    cors: {
      origin: [...config.origins, ...config.appOrigins],
      credentials: false,
    },
    allowRequest: (req, done) => {
      try {
        if (!origemPermitida(req.headers.origin))
          return done("Origin denied", false);
        const ip = proxyaddr(req, trust);
        limits.take(ip + ":handshake", 60);
        if ((counts.get(ip) || 0) >= config.maxSocketsPerIp)
          return done("Connection limit", false);
        done(null, true);
      } catch {
        done("Rate limit", false);
      }
    },
  });
  io.use((socket, next) => {
    try {
      const session = verifyToken(config.secret, socket.handshake.auth?.token);
      const ip = proxyaddr(socket.request, trust);
      if ((counts.get(ip) || 0) >= config.maxSocketsPerIp)
        throw new Fault(
          "CONNECTION_LIMIT",
          "O VIO está cheio agora. Tente de novo em instantes.",
        );
      socket.data = { id: session.id, expires: session.exp, ip };
      next();
    } catch (e) {
      // Only a bad token means a new identity (verifyToken's own Fault). Any
      // other failure keeps the token: the client retries with it (#292).
      next(new Error(e instanceof Fault ? e.code : "CONNECTION_ERROR"));
    }
  });
  const rooms = new Rooms(io, config);
  io.on("connection", (socket) => {
    const ip = socket.data.ip;
    counts.set(ip, (counts.get(ip) || 0) + 1);
    rooms.bind(socket);
    socket.on("disconnect", () => {
      const n = (counts.get(ip) || 1) - 1;
      if (n) counts.set(ip, n);
      else counts.delete(ip);
    });
  });
  const cleanup = setInterval(() => {
    rooms.clean();
    limits.clean();
  }, 10000);
  cleanup.unref();
  let vite: { close: () => Promise<void> } | undefined;
  if (dev) {
    const { createServer: createViteServer } = await import("vite");
    const v = await createViteServer({
      server: { middlewareMode: true, hmr: { server: http } },
      appType: "spa",
    });
    app.use(v.middlewares);
    vite = v;
  } else {
    const client = resolve("dist/client");
    app.get("/sw.js", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Service-Worker-Allowed", "/");
      res.sendFile(resolve(client, "sw.js"));
    });
    app.get("/source.tar.gz", (_req, res) => {
      const path = resolve("dist/source.tar.gz");
      if (existsSync(path))
        res.download(path, "vio-" + version + "-source.tar.gz");
      else
        res
          .status(404)
          .send("Execute npm run build para gerar o código-fonte.");
    });
    app.use(express.static(client));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve(client, "index.html")),
    );
  }
  return {
    app,
    http,
    io,
    rooms,
    config,
    async close() {
      clearInterval(cleanup);
      io.emit("server-restarting");
      await vite?.close();
      await new Promise<void>((resolve) => io.close(() => resolve()));
      if (http.listening)
        await new Promise<void>((resolve) => http.close(() => resolve()));
    },
  };
}
