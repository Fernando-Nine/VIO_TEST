import type { Motion } from "../media/sound-preferences";

/** Ajustes › Acessibilidade: "reduce" forces reduced motion everywhere. */
export function applyMotion(motion: Motion, doc = document) {
  if (motion === "reduce") doc.documentElement.dataset.motion = "reduce";
  else delete doc.documentElement.dataset.motion;
}
/** For JS animations: the system setting or the user's "Sempre". */
export function reducedMotion(win: Window = window) {
  // The flag lives on the main document, also for the PiP window.
  return (
    document.documentElement.dataset.motion === "reduce" ||
    win.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
