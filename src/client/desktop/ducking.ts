// PROVISIONAL (#344): WebView2 opens the microphone as a Windows "communications"
// stream, so Windows lowers every other sound during a call. Until VIO captures the
// microphone itself (#352), the app offers to set the per-user Windows preference
// (Sound › Communications, `UserDuckingPreference`) to "Do nothing". When #352 lands,
// this file, the prompt and the toggle in Ajustes › Áudio are removed and VIO no
// longer changes Windows settings.
import { desktop, nativeInvoke } from "./bridge";

type Invoke = <T>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<T>;

/** Windows value for "Do nothing"; `null` means the key is absent (Windows default). */
export const DUCKING_OFF = 3;
const key = "vio:ducking";
/**
 * What Windows had before VIO set "Do nothing": a raw DWORD, `null` when the value
 * was absent, or `"unchanged"` when it was already 3 (VIO changed nothing). Missing
 * means there is nothing for VIO to restore.
 */
type Previous = number | null | "unchanged";
type Saved = { asked?: boolean; previous?: Previous };

const dword = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 0xffffffff;

function load(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}") as unknown;
    if (!saved || typeof saved !== "object") return {};
    const { asked, previous } = saved as Record<string, unknown>;
    return {
      asked: asked === true,
      previous:
        previous === null || previous === "unchanged" || dword(previous)
          ? previous
          : undefined,
    };
  } catch {
    return {};
  }
}
function store(change: Saved) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...load(), ...change }));
  } catch {}
}

export const duckingAsked = () => load().asked === true;
export const markDuckingAsked = () => store({ asked: true });

/** Whether Windows leaves other sounds alone during calls; `undefined` off the app. */
export async function duckingOff(
  invoke: Invoke | undefined = desktop ? nativeInvoke : undefined,
): Promise<boolean | undefined> {
  if (!invoke) return undefined;
  return (await invoke<number | null>("desktop_ducking")) === DUCKING_OFF;
}

/** Whether turning ducking back on has a state of VIO's own to restore. */
export function duckingRestorable() {
  const previous = load().previous;
  return previous !== undefined && previous !== "unchanged";
}

/**
 * Turning it off remembers exactly what Windows had; turning it back on restores
 * that state (the raw value, or the absent value) and writes nothing when VIO had
 * not changed anything.
 */
export async function setDuckingOff(
  off: boolean,
  invoke: Invoke = nativeInvoke,
) {
  if (off) {
    const current = await invoke<number | null>("desktop_ducking");
    if (current === DUCKING_OFF) {
      // A saved value means VIO's own change is still in place (restoring clears
      // it), so keep it; with none, Windows was already "Do nothing" before VIO.
      if (load().previous === undefined) store({ previous: "unchanged" });
      return;
    }
    store({ previous: current });
    await invoke("desktop_set_ducking", { value: DUCKING_OFF });
    return;
  }
  const previous = load().previous;
  if (previous === undefined || previous === "unchanged") return;
  await invoke("desktop_set_ducking", { value: previous });
  store({ previous: undefined });
}
