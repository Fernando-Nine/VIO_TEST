import { randomBytes } from "node:crypto";
export interface Config {
  port: number;
  production: boolean;
  origins: string[];
  secret: string;
  sessionTtl: number;
  grace: number;
  roomTtl: number;
  maxParticipants: number;
  maxRooms: number;
  maxPreviews: number;
  maxSocketsPerIp: number;
  socketPath: string;
  signalingUrl: string;
  trustProxy: string | number | false;
  turnUrls: string[];
  turnSecret: string;
  turnTtl: number;
  stunUrls: string[];
  cloudflareTurnKeyId: string;
  cloudflareTurnApiToken: string;
  testLab: boolean;
}
function integer(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const n = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new Error("Configuração numérica fora dos limites.");
  return n;
}
export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === "production";
  const port = integer(env.PORT, 3000, 0, 65535);
  const secret =
    env.SESSION_SECRET || (production ? "" : randomBytes(32).toString("hex"));
  if (secret.length < 32)
    throw new Error(
      "SESSION_SECRET deve ter ao menos 32 caracteres em produção.",
    );
  const origins = (
    env.ALLOWED_ORIGINS ||
    (production ? "" : `http://localhost:${port},http://127.0.0.1:${port}`)
  )
    .split(",")
    .filter(Boolean)
    .map((v) => new URL(v.trim()).origin);
  if (env.RENDER_EXTERNAL_URL)
    origins.push(new URL(env.RENDER_EXTERNAL_URL).origin);
  if (
    !origins.length ||
    origins.some(
      (v) => v === "null" || (production && !v.startsWith("https://")),
    )
  )
    throw new Error("Configure ALLOWED_ORIGINS com origens HTTPS explícitas.");
  const trustProxy =
    !env.TRUST_PROXY || env.TRUST_PROXY === "false"
      ? false
      : /^\d+$/.test(env.TRUST_PROXY)
        ? integer(env.TRUST_PROXY, 0, 0, 5)
        : env.TRUST_PROXY;
  if (trustProxy === "true")
    throw new Error(
      "Use um número de hops ou CIDRs explícitos em TRUST_PROXY.",
    );
  const turnUrls = (env.TURN_URLS || "").split(",").filter(Boolean);
  const turnSecret = env.TURN_SECRET || "";
  if (
    turnUrls.length &&
    (turnSecret.length < 32 || turnUrls.some((v) => !/^turns?:[^\s]+$/.test(v)))
  )
    throw new Error("TURN exige URLs válidas e TURN_SECRET com 32 caracteres.");
  // Segundo jeito de ligar TURN: em vez de auto-hospedar coturn, delegar a
  // emissão de credencial para a API da Cloudflare Realtime. As duas variáveis
  // vêm sempre juntas — uma sem a outra é config pela metade — e nunca junto
  // com TURN_URLS/TURN_SECRET, porque aí não haveria como saber qual dos dois
  // caminhos o servidor deveria seguir.
  const cloudflareTurnKeyId = env.CLOUDFLARE_TURN_KEY_ID || "";
  const cloudflareTurnApiToken = env.CLOUDFLARE_TURN_API_TOKEN || "";
  if (!!cloudflareTurnKeyId !== !!cloudflareTurnApiToken)
    throw new Error(
      "CLOUDFLARE_TURN_KEY_ID e CLOUDFLARE_TURN_API_TOKEN devem ser configurados juntos.",
    );
  if (cloudflareTurnKeyId && turnUrls.length)
    throw new Error(
      "Configure TURN por um caminho só: TURN_URLS/TURN_SECRET (coturn) OU " +
        "CLOUDFLARE_TURN_KEY_ID/CLOUDFLARE_TURN_API_TOKEN (Cloudflare), nunca os dois.",
    );
  if (env.WEB_CONCURRENCY && env.WEB_CONCURRENCY !== "1")
    throw new Error(
      "Este backend exige uma instância; coordenação distribuída não está habilitada.",
    );
  if (production && env.ENABLE_TEST_LAB === "1")
    throw new Error("O laboratório é exclusivo de desenvolvimento.");
  return {
    port,
    production,
    origins: [...new Set(origins)],
    secret,
    trustProxy,
    sessionTtl: integer(env.SESSION_TTL_SECONDS, 3600, 300, 86400) * 1000,
    grace: integer(env.RECONNECT_GRACE_SECONDS, 90, 10, 300) * 1000,
    roomTtl: integer(env.ROOM_TTL_SECONDS, 300, 10, 3600) * 1000,
    maxParticipants: integer(env.MAX_PARTICIPANTS, 6, 2, 6),
    maxRooms: integer(env.MAX_ROOMS, 200, 1, 10000),
    maxPreviews: 2,
    maxSocketsPerIp: integer(env.MAX_SOCKETS_PER_IP, 20, 4, 200),
    socketPath: env.SOCKET_PATH || "/socket.io",
    signalingUrl: env.SIGNALING_URL || "",
    turnUrls,
    turnSecret,
    turnTtl: integer(env.TURN_TTL_SECONDS, 600, 60, 3600),
    stunUrls: (env.STUN_URLS ?? "stun:stun.l.google.com:19302")
      .split(",")
      .filter(Boolean),
    cloudflareTurnKeyId,
    cloudflareTurnApiToken,
    testLab: env.ENABLE_TEST_LAB === "1",
  };
}
