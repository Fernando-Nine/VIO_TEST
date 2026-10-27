import { useId, useRef, useState } from "react";
import { EyeOff, type LucideIcon } from "lucide-react";
import { AnchoredPopover } from "../components/AnchoredPopover";

export interface NotShownEntry {
  id: string;
  name: string;
  icon?: LucideIcon;
  /** "Você fechou", "Novo, de Lia" or "Sem espaço na grade". */
  reason: string;
  show: () => void;
}

/** Toolbar list of widgets you are not seeing; exists only while N > 0. */
export function NotShown(props: {
  entries: NotShownEntry[];
  showAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const id = useId();
  const count = props.entries.length;
  const label = `${count} ${count === 1 ? "widget" : "widgets"} que você não está vendo`;
  return (
    <>
      <button
        ref={anchor}
        className="text-button not-shown-trigger"
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <EyeOff size={16} aria-hidden="true" />
        <span>
          <b>{count}</b> não {count === 1 ? "exibido" : "exibidos"}
        </span>
      </button>
      {open && (
        <AnchoredPopover
          anchor={anchor}
          id={id}
          label="Widgets que você não está vendo"
          className="live-screens-panel not-shown-panel"
          close={() => setOpen(false)}
        >
          <h3>Widgets que você não está vendo</h3>
          <ul>
            {props.entries.map((entry) => {
              const Icon = entry.icon;
              return (
                <li key={entry.id}>
                  {Icon && <Icon size={16} aria-hidden="true" />}
                  <span className="not-shown-name">
                    <span title={entry.name}>{entry.name}</span>
                    <small>{entry.reason}</small>
                  </span>
                  <button
                    className="secondary"
                    aria-label={`Mostrar ${entry.name}`}
                    onClick={() => {
                      setOpen(false);
                      entry.show();
                    }}
                  >
                    Mostrar
                  </button>
                </li>
              );
            })}
          </ul>
          {count > 1 && (
            <button
              className="text-button not-shown-all"
              onClick={() => {
                setOpen(false);
                props.showAll();
              }}
            >
              Mostrar todos
            </button>
          )}
        </AnchoredPopover>
      )}
    </>
  );
}
