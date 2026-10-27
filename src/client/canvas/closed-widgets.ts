/**
 * Room widgets this browser closed with − ("only for me"). Personal, like
 * position and volume: the widget stays open for the rest of the room.
 */
const KEY = "vio:widgets:closed";
const LIMIT = 100;

export function loadClosed(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string").slice(-LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function saveClosed(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(-LIMIT)));
  } catch {
    // Private mode or full storage: the list lives only in this tab.
  }
}
