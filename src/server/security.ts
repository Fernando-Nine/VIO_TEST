import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { roomCode, roomPermissions, uuid } from "../shared/protocol";
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
/** Admins carried by a room credential; more are kept in memory only. */
export const CREDENTIAL_ADMINS = 16;
const credentialBody = z
  .object({
    code: roomCode,
    /** When this creator seat was granted; a higher rank wins. 0 = provisional. */
    rank: z.number().int().min(0),
    admins: z.array(uuid).max(CREDENTIAL_ADMINS),
    permissions: roomPermissions,
    exp: z.number().int(),
  })
  .strict();
export type RoomCredential = z.infer<typeof credentialBody>;
/** Signs a JSON body under a purpose prefix, so one kind never verifies as another. */
function sign(secret: string, prefix: string, value: object) {
  const body = Buffer.from(JSON.stringify(value)).toString("base64url");
  return (
    body +
    "." +
    createHmac("sha256", secret)
      .update(prefix + body)
      .digest("base64url")
  );
}
/** The body if the signature is genuine and it matches `schema`; else null. */
function verifySigned<T>(
  secret: string,
  prefix: string,
  token: unknown,
  schema: z.ZodType<T>,
  max: number,
): T | null {
  try {
    if (typeof token !== "string" || token.length > max) return null;
    const [body, signature, extra] = token.split(".");
    if (extra !== undefined || !body || !signature) return null;
    const expected = createHmac("sha256", secret)
      .update(prefix + body)
      .digest();
    const actual = Buffer.from(signature, "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      return null;
    return schema.parse(JSON.parse(Buffer.from(body, "base64url").toString()));
  } catch {
    return null;
  }
}
/**
 * Creator seat of a room, signed so it survives a server restart without a
 * database (#226). Bearer: session ids rotate per tab and on expiry, so it is
 * bound to the room code, not to the person. The "room." prefix keeps it from
 * ever verifying as a session token, and vice versa.
 */
export function issueRoomCredential(
  secret: string,
  ttl: number,
  credential: Omit<RoomCredential, "exp">,
) {
  return sign(secret, "room.", { ...credential, exp: Date.now() + ttl });
}
/** The credential if it is genuine, unexpired and for this room; else null. */
export function verifyRoomCredential(
  secret: string,
  token: unknown,
  code: string,
): RoomCredential | null {
  const result = verifySigned(secret, "room.", token, credentialBody, 2048);
  return result?.code === code && result.exp > Date.now() ? result : null;
}
const inviteBody = z
  .object({
    code: roomCode,
    /** Invite generation of the room; revoking starts a new one (#242). */
    gen: z.string().regex(/^[\w-]{8,32}$/),
    exp: z.number().int(),
  })
  .strict();
export type RoomInvite = z.infer<typeof inviteBody>;
/** Signed invite (#242): enters this room directly, even when locked. */
export const issueInvite = (secret: string, invite: RoomInvite) =>
  sign(secret, "invite.", invite);
/** The invite if it is genuine, unexpired and for this room; else null. */
export function verifyInvite(
  secret: string,
  token: unknown,
  code: string,
): RoomInvite | null {
  const result = verifySigned(secret, "invite.", token, inviteBody, 512);
  return result?.code === code && result.exp > Date.now() ? result : null;
}
export const generateCode = () => randomBytes(8).toString("hex").toUpperCase();
export const log = (
  event: string,
  detail: Record<string, string | number | boolean> = {},
) =>
  process.stdout.write(
    JSON.stringify({ time: new Date().toISOString(), event, ...detail }) + "\n",
  );
