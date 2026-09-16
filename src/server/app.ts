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
    if (o && config.origins.includes(o)) {
      res.setHeader("Access-Control-Allow-Origin", o);
      res.setHeader("Vary", "Origin");
    }
    next();
  });
  app.get("/healthz", (_req, res) => res.json({ ok: true, version }));
  app.get("/api/config", (_req, res) =>
    res.json({
      signalingUrl: config.signalingUrl,
      socketPath: config.socketPath,
      maxParticipants: config.maxParticipants,
      maxPreviews: config.maxPreviews,
      testLab: config.testLab,
    }),
  );
  app.post("/api/session", (req, res) => {
    try {
      if (!req.headers.origin || !config.origins.includes(req.headers.origin))
        throw new Fault("ORIGIN", "Origem não permitida.");
      limits.take((req.ip || "unknown") + ":session", 30);
      res.json(issueToken(config.secret, config.sessionTtl));
    } catch (e) {
      res
        .status(e instanceof Fault && e.code === "RATE_LIMIT" ? 429 : 403)
        .json({ message: e instanceof Error ? e.message : "Pedido inválido." });
    }
  });
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
    cors: { origin: config.origins, credentials: false },
    allowRequest: (req, done) => {
      try {
        if (!req.headers.origin || !config.origins.includes(req.headers.origin))
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
        throw new Error("Limite de conexões atingido.");
      socket.data = { id: session.id, expires: session.exp, ip };
      next();
    } catch (e) {
      next(new Error(e instanceof Fault ? e.code : "SESSION_EXPIRED"));
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
