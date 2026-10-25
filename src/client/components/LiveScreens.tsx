import { useEffect, useId, useRef, useState } from "react";
import { Radio, X } from "lucide-react";
import { AnchoredPopover } from "./AnchoredPopover";

export type LiveScreen = { id: string; title: string; watching: boolean };
/** Someone started a screen: shown once in the corner, then kept in the bell. */
export type ScreenEvent = {
  id: string;
  publicationId: string;
  name: string;
  at: number;
  read: boolean;
};

/** Discreet toolbar icon that exists only while other people are streaming. */
export function LiveScreens({
  screens,
  watch,
}: {
  screens: LiveScreen[];
  watch: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!screens.length) setOpen(false);
  }, [screens.length]);
  if (!screens.length) return null;
  const leave = () => {
    timer.current = setTimeout(() => setOpen(false), 400);
  };
  const label =
    screens.length === 1
      ? `${screens[0].title} ao vivo`
      : `${screens.length} telas ao vivo`;
  return (
    <div
      className="live-screens"
      onPointerEnter={(e) => {
        clearTimeout(timer.current);
        if (e.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={leave}
    >
      <button
        ref={anchor}
        className="text-button live-screens-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(true)}
      >
        <Radio size={16} aria-hidden="true" />
        <span className="live-screens-count">{screens.length}</span>
      </button>
      {open && (
        <AnchoredPopover
          anchor={anchor}
          id={id}
          label="Telas ao vivo"
          className="live-screens-panel"
          close={() => setOpen(false)}
          onPointerEnter={() => clearTimeout(timer.current)}
          onPointerLeave={leave}
        >
          <ul>
            {screens.map((screen) => (
              <li key={screen.id}>
                <i className="live-pulse" aria-hidden="true" />
                <span title={screen.title}>{screen.title}</span>
                {screen.watching ? (
                  <small>Assistindo</small>
                ) : (
                  <button
                    className="secondary"
                    onClick={() => {
                      watch(screen.id);
                      setOpen(false);
                    }}
                  >
                    Assistir
                  </button>
                )}
              </li>
            ))}
          </ul>
        </AnchoredPopover>
      )}
    </div>
  );
}

const TOAST_MS = 6000;

/** Corner label for the latest new screen; hides itself and the bell keeps it. */
export function ScreenToast({
  event,
  watch,
  done,
}: {
  event: ScreenEvent;
  watch: () => void;
  done: () => void;
}) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(done, TOAST_MS);
    return () => clearTimeout(timer);
  }, [event.id, paused, done]);
  return (
    <div
      className="screen-toast"
      role="status"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="screen-toast-avatar" aria-hidden="true">
        {[...event.name].slice(0, 2).join("").toUpperCase()}
      </span>
      <p>
        <strong>{event.name}</strong> começou a transmitir
      </p>
      <button className="primary" onClick={watch}>
        Assistir
      </button>
      <button
        className="icon-button"
        aria-label="Dispensar aviso"
        onClick={done}
      >
        <X size={15} />
      </button>
    </div>
  );
}
