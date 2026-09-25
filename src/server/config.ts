import { randomBytes } from "node:crypto";
export interface Config {
  port: number;
  production: boolean;
  origins: string[];
  appOrigins: string[];
  secret: string;
  sessionTtl: number;
  grace: number;
  roomTtl: number;
  recommendedParticipants: number;
  maxRooms: number;
  maxPreviews: number;
  maxSocketsPerIp: number;
  socketPath: string;
  signalingUrl: string;
  trustProxy: string | number | false;
  turnUrls: string[];
  turnSecret: string;
  turnUsername: string;
  turnPassword: string;
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

  // Origens de casca nativa (Tauri, invólucro de celular). Ficam numa lista
  // SEPARADA de propósito: a exigência de HTTPS acima protege a web e não pode
  // ser afrouxada para caber um esquema próprio.
  //
  // O que uma casca manda: "tauri://localhost" no macOS/Linux e
  // "http://tauri.localhost" no Windows; "capacitor://localhost" num invólucro
  // de celular. Por isso http(s) aqui só passa em host local — senão esta lista
  // viraria a porta dos fundos para burlar a regra de HTTPS logo acima.
  const appOrigins = (env.ALLOWED_APP_ORIGINS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const origemDeAppValida = (valor: string) => {
    if (valor === "null" || valor === "*") return false;
    let url: URL;
    try {
      url = new URL(valor);
    } catch {
      return false;
    }
    // Origem pura: sem caminho, busca ou fragmento.
    if (url.pathname !== "" && url.pathname !== "/") return false;
    if (url.search || url.hash) return false;
    if (url.protocol === "http:" || url.protocol === "https:")
      return (
        url.hostname === "localhost" || url.hostname.endsWith(".localhost")
      );
    return true;
  };
  if (!appOrigins.every(origemDeAppValida))
    throw new Error(
      "ALLOWED_APP_ORIGINS aceita só origem de casca nativa, sem caminho " +
        "(ex: tauri://localhost, capacitor://localhost, http://tauri.localhost).",
    );
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
  // Credencial estática: o provedor entrega um par usuário/senha fixo em vez de
  // um segredo pra derivar credencial efêmera. É o que os planos gratuitos de
  // TURN gerenciado costumam dar. Pior em segurança — não expira, então quem a
  // interceptar usa o relay até ela ser trocada à mão —, daí ficar atrás de uma
  // escolha explícita e nunca ser o padrão.
  const turnUsername = env.TURN_USERNAME || "";
  const turnPassword = env.TURN_PASSWORD || "";
  const turnStatic = !!(turnUsername || turnPassword);
  if (turnUrls.some((v) => !/^turns?:[^\s]+$/.test(v)))
    throw new Error("TURN_URLS exige URLs começando com turn: ou turns:.");
  if (turnStatic && !(turnUsername && turnPassword))
    throw new Error(
      "TURN_USERNAME e TURN_PASSWORD devem ser configurados juntos.",
    );
  if (turnStatic && turnSecret)
    throw new Error(
      "Escolha um modo de credencial: TURN_SECRET (efêmera) OU " +
        "TURN_USERNAME/TURN_PASSWORD (estática), nunca os dois.",
    );
  if (turnStatic && !turnUrls.length)
    throw new Error("TURN_USERNAME/TURN_PASSWORD exigem TURN_URLS.");
  if (turnUrls.length && !turnStatic && turnSecret.length < 32)
    throw new Error(
      "TURN exige TURN_SECRET com 32 caracteres ou, para credencial estática, " +
        "TURN_USERNAME e TURN_PASSWORD.",
    );
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
    appOrigins: [...new Set(appOrigins)],
    secret,
    trustProxy,
    sessionTtl: integer(env.SESSION_TTL_SECONDS, 3600, 300, 86400) * 1000,
    grace: integer(env.RECONNECT_GRACE_SECONDS, 90, 10, 300) * 1000,
    roomTtl: integer(env.ROOM_TTL_SECONDS, 300, 10, 3600) * 1000,
    // Advisory only. Legacy MAX_PARTICIPANTS must not restore the retired cap.
    recommendedParticipants: 6,
    maxRooms: integer(env.MAX_ROOMS, 200, 1, 10000),
    maxPreviews: 2,
    maxSocketsPerIp: integer(env.MAX_SOCKETS_PER_IP, 20, 4, 200),
    socketPath: env.SOCKET_PATH || "/socket.io",
    signalingUrl: env.SIGNALING_URL || "",
    turnUrls,
    turnSecret,
    turnUsername,
    turnPassword,
    turnTtl: integer(env.TURN_TTL_SECONDS, 600, 60, 3600),
    stunUrls: (env.STUN_URLS ?? "stun:stun.l.google.com:19302")
      .split(",")
      .filter(Boolean),
    cloudflareTurnKeyId,
    cloudflareTurnApiToken,
    testLab: env.ENABLE_TEST_LAB === "1",
  };
}
