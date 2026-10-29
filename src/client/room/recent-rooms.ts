/**
 * Recent rooms and the saved name (#259). Only on this device: never sent to
 * the server. "Esquecer" deletes the entry.
 */
export interface RecentRoom {
  code: string;
  /** Personal name for the room, seen only on this device. */
  label?: string;
  lastSeen: number;
}
const ROOMS_KEY = "vio:recent-rooms";
const NAME_KEY = "vio:name";
export const RECENT_LIMIT = 12;
const codePattern = /^[A-Z0-9]{4,24}$/;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private window or full storage: the list just isn't kept. */
  }
}

export function loadRecent(): RecentRoom[] {
  const list = read<unknown>(ROOMS_KEY, []);
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (r): r is RecentRoom =>
        !!r &&
        typeof r.code === "string" &&
        codePattern.test(r.code) &&
        Number.isFinite(r.lastSeen) &&
        (r.label === undefined || typeof r.label === "string"),
    )
    .slice(0, RECENT_LIMIT);
}
/** Newest first; entering again moves the room to the top, keeping its label. */
export function touchRecent(
  list: RecentRoom[],
  code: string,
  now = Date.now(),
): RecentRoom[] {
  const old = list.find((r) => r.code === code);
  return [
    { ...old, code, lastSeen: now },
    ...list.filter((r) => r.code !== code),
  ].slice(0, RECENT_LIMIT);
}
export function renameRecent(list: RecentRoom[], code: string, label: string) {
  const clean = label.trim().slice(0, 40);
  return list.map((r) =>
    r.code === code ? { ...r, label: clean || undefined } : r,
  );
}
export function forgetRecent(list: RecentRoom[], code: string) {
  return list.filter((r) => r.code !== code);
}
export function saveRecent(list: RecentRoom[]) {
  write(ROOMS_KEY, list);
}

export function loadName(): string {
  const name = read<unknown>(NAME_KEY, "");
  return typeof name === "string" ? name.slice(0, 32) : "";
}
export function saveName(name: string) {
  write(NAME_KEY, name.trim().slice(0, 32));
}

/** Room color from its code: the same square for the same room. */
const roomColors = ["#a6a9ff", "#ff9f6b", "#6bc6ff", "#f28bd0", "#b8e06b"];
export function recentColor(code: string) {
  let hash = 0;
  for (const c of code) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return roomColors[hash % roomColors.length];
}

/** "Última vez há 2 dias". */
export function lastSeenText(lastSeen: number, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - lastSeen) / 60000));
  const plural = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;
  if (minutes < 1) return "Agora há pouco";
  if (minutes < 60)
    return `Última vez há ${plural(minutes, "minuto", "minutos")}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Última vez há ${plural(hours, "hora", "horas")}`;
  const days = Math.round(hours / 24);
  if (days < 7) return `Última vez há ${plural(days, "dia", "dias")}`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `Última vez há ${plural(weeks, "semana", "semanas")}`;
  }
  const months = Math.round(days / 30);
  return `Última vez há ${plural(months, "mês", "meses")}`;
}

/** A pasted code or room link: the code, and the invite when there is one. */
export function parseRoomInput(
  value: string,
): { code: string; invite?: string; link: boolean } | null {
  const text = value.trim();
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      const code = url.searchParams.get("sala")?.toUpperCase() || "";
      if (!codePattern.test(code)) return null;
      const invite = url.searchParams.get("convite") || undefined;
      return { code, link: true, ...(invite && { invite }) };
    } catch {
      return null;
    }
  }
  const code = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return codePattern.test(code) ? { code, link: false } : null;
}

/** Drawn code for a new room; 13 characters keep it as hard to guess as the server's. */
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function drawCode(length = 13) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
