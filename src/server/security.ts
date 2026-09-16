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
export class Limits {
  private buckets = new Map<string, { count: number; expires: number }>();
  take(key: string, limit: number, window = 60000) {
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b || b.expires < now) {
      b = { count: 0, expires: now + window };
      this.buckets.set(key, b);
    }
    if (++b.count > limit)
      throw new Fault(
        "RATE_LIMIT",
        "Muitas tentativas. Aguarde um momento e tente novamente.",
      );
  }
  clean() {
    for (const [k, v] of this.buckets)
      if (v.expires < Date.now()) this.buckets.delete(k);
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
