import type { InviteTtl } from "../../shared/protocol";

/** "Vale até amanhã, 21:40." in local time (#260). */
export function validUntil(expiresAt: number, now = Date.now()) {
  const end = new Date(expiresAt);
  const time = end.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(end) - day(new Date(now))) / 86400000);
  const when =
    days <= 0
      ? "hoje"
      : days === 1
        ? "amanhã"
        : end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `Vale até ${when}, ${time}.`;
}

const TTL_KEY = "vio:invite-ttl";
export const ttlChoices: { ttl: InviteTtl; label: string }[] = [
  { ttl: "1h", label: "1 hora" },
  { ttl: "1d", label: "1 dia" },
  { ttl: "7d", label: "7 dias" },
];
/** Last validity chosen; 1 dia by default. */
export function loadTtl(): InviteTtl {
  try {
    const saved = localStorage.getItem(TTL_KEY);
    return ttlChoices.find((c) => c.ttl === saved)?.ttl ?? "1d";
  } catch {
    return "1d";
  }
}
export function saveTtl(ttl: InviteTtl) {
  try {
    localStorage.setItem(TTL_KEY, ttl);
  } catch {
    /* Preferences are optional. */
  }
}
