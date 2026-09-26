import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { GripHorizontal, Pin, PinOff, Minus } from "lucide-react";
import {
  anchors,
  anchorPoint,
  clampPoint,
  nearestAnchor,
  type Anchor,
  type Bounds,
  type Point,
} from "./floating-position";

export function FloatingPeople({
  children,
  onInteraction,
  count,
  hidden,
  hide,
}: {
  children: ReactNode;
  count: number;
  hidden: boolean;
  hide: () => void;
  onInteraction: (busy: boolean) => void;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<Anchor>("top-right");
  const [bounds, setBounds] = useState<Bounds>({
    width: 0,
    height: 0,
    panelWidth: 0,
    panelHeight: 0,
  });
  const [point, setPoint] = useState<Point | null>(null);
  const [target, setTarget] = useState<Anchor | null>(null);
  const [menu, setMenu] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const gesture = useRef<{
    id: number;
    start: Point;
    origin: Point;
    point: Point;
    moved: boolean;
  } | null>(null);
  const ignoreClick = useRef(false);
  useLayoutEffect(() => {
    const measure = () => {
      if (!layer.current || !panel.current) return;
      setBounds({
        width: layer.current.clientWidth,
        height: layer.current.clientHeight,
        panelWidth: panel.current.offsetWidth,
        panelHeight: panel.current.offsetHeight,
      });
    };
    const observer = new ResizeObserver(measure);
    if (layer.current) observer.observe(layer.current);
    if (panel.current) observer.observe(panel.current);
    measure();
    return () => observer.disconnect();
  }, [hidden]);
  const position = point
    ? clampPoint(point, bounds)
    : anchorPoint(anchor, bounds);
  function place(next: Anchor) {
    setAnchor(next);
    setMenu(false);
    setAnnouncement(
      `Cards: ${anchors.find((item) => item.id === next)!.label.toLowerCase()}.`,
    );
    handle.current?.focus({ preventScroll: true });
    onInteraction(false);
  }
  function finish(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    ignoreClick.current = drag.moved;
    if (drag.moved && !cancel) place(nearestAnchor(drag.point, bounds));
    gesture.current = null;
    setPoint(null);
    setTarget(null);
    onInteraction(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <div className="floating-layer" ref={layer} hidden={hidden}>
      {target && (
        <div
          className="snap-target"
          aria-hidden="true"
          style={{
            width: bounds.panelWidth,
            height: bounds.panelHeight,
            transform: `translate(${anchorPoint(target, bounds).x}px, ${anchorPoint(target, bounds).y}px)`,
          }}
        />
      )}
      <section
        ref={panel}
        className={`floating-people ${point ? "is-dragging" : ""} ${pinned ? "is-pinned" : ""} ${menu ? "has-menu" : ""}`}
        id="floating-participants"
        aria-label="Pessoas na sala"
        data-position={anchor}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          width: count < 3 ? 200 : 282,
        }}
      >
        <div className="floating-toolbar">
          <button
            ref={handle}
            className="cards-handle"
            aria-label="Mover cards"
            aria-expanded={menu}
            aria-controls="card-positions"
            title="Arraste para mover. Clique ou use as setas para escolher uma posição."
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              ignoreClick.current = false;
              gesture.current = {
                id: event.pointerId,
                start: { x: event.clientX, y: event.clientY },
                origin: position,
                point: position,
                moved: false,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
              onInteraction(true);
            }}
            onPointerMove={(event) => {
              const drag = gesture.current;
              if (!drag || drag.id !== event.pointerId) return;
              const dx = event.clientX - drag.start.x,
                dy = event.clientY - drag.start.y;
              if (!drag.moved && Math.hypot(dx, dy) < 5) return;
              drag.moved = true;
              drag.point = clampPoint(
                { x: drag.origin.x + dx, y: drag.origin.y + dy },
                bounds,
              );
              setMenu(false);
              setPoint(drag.point);
              setTarget(nearestAnchor(drag.point, bounds));
            }}
            onPointerUp={(event) => finish(event)}
            onPointerCancel={(event) => finish(event, true)}
            onLostPointerCapture={(event) => finish(event, true)}
            onClick={() => {
              if (ignoreClick.current) {
                ignoreClick.current = false;
                return;
              }
              setMenu(!menu);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                gesture.current = null;
                setPoint(null);
                setTarget(null);
                setMenu(false);
                onInteraction(false);
                return;
              }
              if (
                ![
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "ArrowDown",
                  "Home",
                  "End",
                ].includes(event.key)
              )
                return;
              event.preventDefault();
              const current = anchors.findIndex((item) => item.id === anchor);
              const column = current % 3,
                row = Math.floor(current / 3);
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? 5
                    : event.key === "ArrowLeft"
                      ? row * 3 + Math.max(0, column - 1)
                      : event.key === "ArrowRight"
                        ? row * 3 + Math.min(2, column + 1)
                        : event.key === "ArrowUp"
                          ? column
                          : column + 3;
              place(anchors[next].id);
            }}
          >
            <GripHorizontal size={16} aria-hidden="true" />
            <span>
              {count} {count === 1 ? "pessoa" : "pessoas"}
            </span>
          </button>
          <button
            className="cards-pin"
            aria-label={
              pinned ? "Ocultar cards quando inativo" : "Manter cards visíveis"
            }
            aria-pressed={pinned}
            onClick={() => setPinned(!pinned)}
            title={pinned ? "Ocultar por inatividade" : "Manter visíveis"}
          >
            {pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button
            className="cards-pin"
            aria-label="Ocultar participantes"
            title="Ocultar participantes"
            onClick={hide}
          >
            <Minus size={16} />
          </button>
        </div>
        <div
          style={{
            gridTemplateColumns: `repeat(${count < 3 ? 2 : 3}, minmax(0, 1fr))`,
          }}
          className="people-strip"
          tabIndex={0}
          aria-label="Cards dos participantes; role para ver todos"
        >
          {children}
        </div>
        {menu && (
          <div
            className="card-positions"
            id="card-positions"
            role="group"
            aria-label="Posição dos cards"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setMenu(false);
                handle.current?.focus();
              }
            }}
          >
            {anchors.map((item) => (
              <button
                key={item.id}
                aria-label={item.label}
                aria-pressed={anchor === item.id}
                title={item.label}
                onClick={() => place(item.id)}
              >
                <span
                  style={{
                    justifySelf:
                      item.x === 0 ? "start" : item.x === 1 ? "end" : "center",
                    alignSelf: item.y ? "end" : "start",
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </section>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
