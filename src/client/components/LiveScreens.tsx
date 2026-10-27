import { useEffect, useId, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { AnchoredPopover } from "./AnchoredPopover";

export type LiveScreen = { id: string; title: string; watching: boolean };
/** Someone started a screen: a toast at the top, then kept in the bell. */
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
