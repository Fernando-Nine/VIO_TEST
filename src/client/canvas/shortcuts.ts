export const canvasShortcuts = {
  snap: { label: "Shift", modifier: "shiftKey" },
} as const;
export function snapPressed(event: { shiftKey?: unknown }) {
  return event[canvasShortcuts.snap.modifier] === true;
}
