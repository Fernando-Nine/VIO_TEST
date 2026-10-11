import { useCallback, useId, useRef, useState, useEffect } from "react";
import { Eye } from "lucide-react";
import type { Controller } from "../room/controller";
import { AnchoredPopover } from "./AnchoredPopover";

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
  const delay = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => () => clearTimeout(delay.current), []);
  const viewers = new Set(
    engine.view.snapshot?.screenViewers?.[publicationId] || [],
  );
  const people =
    engine.view.snapshot?.participants.filter((p) => viewers.has(p.id)) || [];
  const info = engine.screenInfo(publicationId);
  const name =
    info?.publication.owner === engine.view.id
      ? "sua tela"
      : `tela de ${info?.name || "participante"}`;
  return (
    <div
      className="spectators"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") {
          clearTimeout(delay.current);
          setOpen(true);
        }
      }}
      onPointerLeave={() => {
        delay.current = setTimeout(close, 220);
      }}
    >
      <button
        ref={button}
        className="icon-button"
        aria-label={`${people.length} espectadores da ${name}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          clearTimeout(delay.current);
          setOpen((v) => !v);
        }}
      >
        <Eye size={16} />
        <span>{people.length}</span>
      </button>
      {open && (
        <AnchoredPopover
          anchor={button}
          id={id}
          className="spectators-panel"
          close={close}
        >
          <strong>Assistindo à {name}</strong>
          {people.length ? (
            <ul>
              {people.map((p) => (
                <li key={p.id}>
                  {p.name}
                  {p.id === engine.view.id ? " · você" : ""}
                  {!p.online ? " · reconectando" : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>Ninguém assistindo ainda.</p>
          )}
          <small>
            Inclui áudio em segundo plano e pessoas conectando. Miniaturas não
            contam.
          </small>
        </AnchoredPopover>
      )}
    </div>
  );
}
