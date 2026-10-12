import { canManageRoom } from "../../shared/permissions";
import { canvasShortcuts } from "./shortcuts";
import {
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { useDraggable } from "@dnd-kit/react";
import { ArrowLeftRight, Grip, X } from "lucide-react";
import type { Controller } from "../room/controller";
import { participantStyle } from "../components/participant-style";
import {
  HeaderAccessory,
  titleOf,
  widgetRegistry,
  type WidgetProps,
} from "./widgets";
import type { Box } from "./geometry";
import type { Placement, WidgetInstance } from "./model";

interface Props extends WidgetProps {
  box: Box;
  bounds: Box;
  clip?: string;
  floating: boolean;
  floatingOrder: number;
  active: boolean;
  stripAxis?: "x" | "y";
  moving?: { x: number; y: number };
  motionKey: string;
  tabIndex: number;
  onFocusHeader: () => void;
  navigate: (event: KeyboardEvent) => void;
  focus: () => void;
  close: () => void;
  interaction: (busy: boolean) => void;
}
const Body = memo(
  function Body(props: WidgetProps) {
    const Render = widgetRegistry[props.widget.type]?.render;
    return Render ? (
      <Render {...props} />
    ) : (
      <p className="widget-empty">
        Este widget não está disponível nesta versão. Você pode removê-lo pelo
        menu.
      </p>
    );
  },
  (previous, next) =>
    !previous.visible && !next.visible && previous.widget === next.widget,
);

export function WidgetFrame(props: Props) {
  const {
    widget,
    engine,
    box,
    bounds,
    visible,
    focused,
    floating,
    moving,
    motionKey,
  } = props;
  const element = useRef<HTMLElement>(null);
  const previous = useRef<{ box: Box; key: string; visible: boolean } | null>(
    null,
  );
  const resize = useRef<{
    x: number;
    y: number;
    rect: Placement;
    pointer: number;
  } | null>(null);
  const { ref, handleRef } = useDraggable({
    id: widget.id,
    disabled: !visible || engine.canvas.getSnapshot().single,
  });
  const hostRef = useCallback(
    (node: HTMLElement | null) => {
      element.current = node;
      ref(node);
    },
    [ref],
  );
  const title = titleOf(widget, engine);
  const endsForEveryone =
    !!widget.config.sharedId &&
    engine.view.snapshot?.widgets?.some(
      (shared) =>
        shared.id === widget.config.sharedId &&
        (shared.owner === engine.view.id ||
          canManageRoom(engine.view.snapshot, engine.view.id)),
    );
  const def = widgetRegistry[widget.type];
  const Icon = def?.icon || Grip;
  useLayoutEffect(() => {
    const last = previous.current;
    previous.current = { box, key: motionKey, visible };
    if (
      !last ||
      !element.current ||
      !visible ||
      !last.visible ||
      moving ||
      last.key === motionKey ||
      box.width < 1 ||
      box.height < 1
    )
      return;
    if (
      element.current.ownerDocument.defaultView?.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
    )
      return;
    element.current.animate(
      [
        {
          transform: `translate3d(${last.box.x}px,${last.box.y}px,0) scale(${last.box.width / box.width},${last.box.height / box.height})`,
        },
        { transform: `translate3d(${box.x}px,${box.y}px,0) scale(1,1)` },
      ],
      { duration: 200, easing: "cubic-bezier(.2,.7,.2,1)" },
    );
  }, [box, motionKey, moving, visible]);
  const person =
    widget.type === "screen"
      ? engine.screenInfo(widget.config.publicationId)
      : undefined;
  const style = {
    ...participantStyle(person?.color, engine.participantColors),
    width: box.width,
    height: box.height,
    transform: `translate3d(${box.x + (moving?.x || 0)}px,${box.y + (moving?.y || 0)}px,0)`,
    clipPath: moving || floating || focused ? undefined : props.clip,
    visibility: visible || moving ? "visible" : "hidden",
    zIndex: moving
      ? 1000
      : floating
        ? 10 + props.floatingOrder
        : focused
          ? 3
          : 2,
  } as CSSProperties;
  function resizeTo(width: number, height: number) {
    engine.canvas.detach(widget.id, {
      x: box.x / bounds.width,
      y: box.y / bounds.height,
      width: Math.max(def?.minimum.width || 180, width) / bounds.width,
      height: Math.max(def?.minimum.height || 120, height) / bounds.height,
    });
  }
  return (
    <section
      ref={hostRef}
      style={style}
      className={`widget-host ${widget.type === "screen" ? "is-screen" : ""} ${focused ? "is-focused" : ""} ${floating ? "is-floating" : ""} ${widget.type === "screen" && !props.active ? "screen-controls-idle" : ""} ${moving ? "is-dragging" : ""}`}
      data-widget-id={widget.id}
      data-strip-axis={props.stripAxis}
      aria-label={title}
      inert={!visible && !moving ? true : undefined}
      onPointerDownCapture={() => floating && engine.canvas.raise(widget.id)}
      onFocusCapture={() => floating && engine.canvas.raise(widget.id)}
    >
      <header className="widget-header">
        <button
          ref={handleRef}
          className="widget-handle"
          tabIndex={props.tabIndex}
          onFocus={props.onFocusHeader}
          onKeyDown={props.navigate}
          aria-label={`Mover ${title}. Use espaço para mover pelo teclado. No mouse, segure ${canvasShortcuts.snap.label} para encaixar.`}
          title={`Arrastar livremente · ${canvasShortcuts.snap.label} encaixa`}
        >
          <Icon size={15} aria-hidden="true" />
          <span>{title}</span>
        </button>
        <HeaderAccessory widget={widget} engine={engine} />
        <div className="widget-actions">
          {!focused && (
            <button
              className="icon-button widget-focus"
              onClick={props.focus}
              aria-label={`Focar ${title}`}
              title="Trazer para o foco"
            >
              <ArrowLeftRight size={16} />
            </button>
          )}
          <button
            className="icon-button"
            onClick={props.close}
            aria-label={
              endsForEveryone
                ? `Encerrar ${title} para todos`
                : widget.type === "screen"
                  ? `Desconectar ${title}`
                  : `Remover ${title} deste layout`
            }
            title={
              endsForEveryone
                ? "Encerrar para todos na sala"
                : widget.type === "screen"
                  ? "Desconectar transmissão"
                  : "Remover deste layout"
            }
          >
            <X size={15} />
          </button>
        </div>
      </header>
      <div
        className="widget-body"
        onClick={(event) => {
          if (
            props.stripAxis &&
            (event.target as HTMLElement).closest(".widget-screen") &&
            !(event.target as HTMLElement).closest("button")
          )
            props.focus();
        }}
      >
        <Body
          {...props}
          visible={visible}
          height={Math.max(0, box.height - 38)}
        />
      </div>
      {floating && (
        <button
          className="widget-resizer"
          aria-label={`Redimensionar ${title}. Use as setas do teclado.`}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            resize.current = {
              x: event.clientX,
              y: event.clientY,
              pointer: event.pointerId,
              rect: {
                x: box.x / bounds.width,
                y: box.y / bounds.height,
                width: box.width / bounds.width,
                height: box.height / bounds.height,
              },
            };
            props.interaction(true);
          }}
          onPointerMove={(event) => {
            const start = resize.current;
            if (!start || start.pointer !== event.pointerId) return;
            resizeTo(
              start.rect.width * bounds.width + event.clientX - start.x,
              start.rect.height * bounds.height + event.clientY - start.y,
            );
          }}
          onPointerUp={() => {
            resize.current = null;
            props.interaction(false);
          }}
          onPointerCancel={() => {
            if (resize.current)
              engine.canvas.detach(widget.id, resize.current.rect);
            resize.current = null;
            props.interaction(false);
          }}
          onLostPointerCapture={() => {
            resize.current = null;
            props.interaction(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && resize.current) {
              engine.canvas.detach(widget.id, resize.current.rect);
              resize.current = null;
              props.interaction(false);
            }
            if (!event.key.startsWith("Arrow")) return;
            event.preventDefault();
            const step = event.shiftKey ? 48 : 16;
            resizeTo(
              box.width +
                (event.key === "ArrowRight"
                  ? step
                  : event.key === "ArrowLeft"
                    ? -step
                    : 0),
              box.height +
                (event.key === "ArrowDown"
                  ? step
                  : event.key === "ArrowUp"
                    ? -step
                    : 0),
            );
          }}
        >
          ◢
        </button>
      )}
    </section>
  );
}
