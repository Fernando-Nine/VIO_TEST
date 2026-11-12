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
type Saved = { asked?: boolean; previous?: number | null };

function load(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}") as unknown;
    if (!saved || typeof saved !== "object") return {};
    const { asked, previous } = saved as Record<string, unknown>;
    return {
      asked: asked === true,
      previous:
        previous === null ||
        (typeof previous === "number" &&
          Number.isInteger(previous) &&
          previous >= 0 &&
          previous < DUCKING_OFF)
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

/**
 * Turning it off remembers what Windows had, so turning it back on restores that
 * choice (or the Windows default) instead of guessing a value.
 */
export async function setDuckingOff(
  off: boolean,
  invoke: Invoke = nativeInvoke,
) {
  if (off) {
    const current = await invoke<number | null>("desktop_ducking");
    if (current === DUCKING_OFF) return;
    store({ previous: current });
    await invoke("desktop_set_ducking", { value: DUCKING_OFF });
  } else {
    const previous = load().previous;
    await invoke("desktop_set_ducking", {
      value: previous === undefined ? null : previous,
    });
  }
}
