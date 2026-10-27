import { useId, useRef, useState } from "react";
import { EyeOff } from "lucide-react";
import { AnchoredPopover } from "../components/AnchoredPopover";
import { widgetRegistry } from "./widgets";
import type { WidgetInstance } from "./model";

/** Toolbar list of widgets the layout put away; exists only while N > 0. */
export function NotShown(props: {
  widgets: WidgetInstance[];
  title: (widget: WidgetInstance) => string;
  show: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const id = useId();
  const count = props.widgets.length;
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
            {props.widgets.map((widget) => {
              const Icon = widgetRegistry[widget.type]?.icon;
              const name = props.title(widget);
              return (
                <li key={widget.id}>
                  {Icon && <Icon size={16} aria-hidden="true" />}
                  <span title={name}>{name}</span>
                  <button
                    className="secondary"
                    aria-label={`Mostrar ${name}`}
                    onClick={() => {
                      props.show(widget.id);
                      if (count === 1) setOpen(false);
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
                props.widgets.forEach((widget) => props.show(widget.id));
                setOpen(false);
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
