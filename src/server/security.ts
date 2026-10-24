import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
export class Fault extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
/**
 * Token buckets: each key holds up to `burst` actions (default: the per-window
 * limit) and refills continuously at `limit` per `window`. Quick human bursts
 * pass, a refill comes back within seconds instead of a whole minute, and a
 * sustained flood still stops at the steady rate.
 */
export class Limits {
  private buckets = new Map<
    string,
    { tokens: number; at: number; ttl: number }
  >();
  take(key: string, limit: number, window = 60000, burst = limit) {
    const now = Date.now();
    const b = this.buckets.get(key) || { tokens: burst, at: now, ttl: 0 };
    b.tokens = Math.min(burst, b.tokens + ((now - b.at) * limit) / window);
    b.at = now;
    // Time until the bucket is full again; then it can be forgotten.
    b.ttl = ((burst - b.tokens + 1) * window) / limit;
    this.buckets.set(key, b);
    if (b.tokens < 1)
      throw new Fault(
        "RATE_LIMIT",
        "Muitas ações seguidas. Aguarde um instante e tente de novo.",
      );
    b.tokens -= 1;
  }
  clean() {
    const now = Date.now();
    for (const [k, v] of this.buckets)
      if (now - v.at > v.ttl) this.buckets.delete(k);
  }
}
export function stableId(secret: string, value: string) {
  return createHmac("sha256", secret)
    .update(value)
    .digest("base64url")
    .slice(0, 32);
}
export function issueToken(secret: string, ttl: number, id = randomUUID()) {
  const exp = Date.now() + ttl;
  const body = Buffer.from(JSON.stringify({ id, exp })).toString("base64url");
  return {
    token:
      body +
      "." +
      createHmac("sha256", secret).update(body).digest("base64url"),
    id,
    expiresAt: exp,
  };
}
export function verifyToken(
  secret: string,
  token: unknown,
): { id: string; exp: number } {
  try {
    if (typeof token !== "string" || token.length > 600) throw 0;
    const [body, signature, extra] = token.split(".");
    if (extra || !body || !signature) throw 0;
    const expected = createHmac("sha256", secret).update(body).digest();
    const actual = Buffer.from(signature, "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw 0;
    const result = JSON.parse(Buffer.from(body, "base64url").toString());
    if (
      !/^[\da-f-]{36}$/i.test(result.id) ||
      !Number.isFinite(result.exp) ||
      result.exp <= Date.now()
    )
      throw 0;
    return result;
  } catch {
    throw new Fault(
      "SESSION_EXPIRED",
      "Sua sessão expirou. Reconecte para continuar.",
    );
  }
}
export const generateCode = () => randomBytes(8).toString("hex").toUpperCase();
export const log = (
  event: string,
  detail: Record<string, string | number | boolean> = {},
) =>
  process.stdout.write(
    JSON.stringify({ time: new Date().toISOString(), event, ...detail }) + "\n",
  );
