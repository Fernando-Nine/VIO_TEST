import { useId, useLayoutEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import type { Controller } from "../room/controller";

export function Spectators({
  engine,
  publicationId,
}: {
  engine: Controller;
  publicationId: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const hasPopover =
    typeof HTMLElement !== "undefined" &&
    "showPopover" in HTMLElement.prototype;
  useLayoutEffect(() => {
    if (!open || !panel.current || !hasPopover) return;
    const el = panel.current,
      trigger = button.current;
    if (!trigger) return;
    const win = trigger.ownerDocument.defaultView;
    const position = () => {
      const rect = trigger.getBoundingClientRect();
      el.style.left = `${Math.max(8, Math.min((win?.innerWidth || 320) - el.offsetWidth - 8, rect.right - el.offsetWidth))}px`;
      el.style.top = `${Math.max(8, Math.min(rect.bottom + 5, (win?.innerHeight || 500) - el.offsetHeight - 8))}px`;
    };
    el.showPopover();
    position();
    win?.addEventListener("resize", position);
    return () => {
      if (el.matches(":popover-open")) el.hidePopover();
      win?.removeEventListener("resize", position);
    };
  }, [open, hasPopover]);
  const viewers = new Set(
    engine.peers
      .infos()
      .filter(
        (p) =>
          p.sending &&
          p.publicationId === publicationId &&
          p.tier === "main" &&
          p.state === "connected",
      )
      .map((p) => p.viewer),
  );
  const people =
    engine.view.snapshot?.participants.filter((p) => viewers.has(p.id)) || [];
  return (
    <div
      className="spectators"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={(e) => {
        if (
          !e.currentTarget.contains(e.currentTarget.ownerDocument.activeElement)
        )
          setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        className="icon-button"
        aria-label={`${people.length} espectadores da sua transmissão`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <Eye size={16} />
        <span>{people.length}</span>
      </button>
      {open && (
        <div
          ref={panel}
          popover={hasPopover ? "manual" : undefined}
          className="spectators-panel"
          id={id}
          role="group"
          aria-label="Espectadores"
        >
          <strong>Conectados à sua tela</strong>
          {people.length ? (
            <ul>
              {people.map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
            </ul>
          ) : (
            <p>Ninguém assistindo ainda.</p>
          )}
          <small>Inclui quem mantém o áudio em segundo plano.</small>
        </div>
      )}
    </div>
  );
}
