import { canManageRoom } from "../../shared/permissions";
import { canvasShortcuts } from "./shortcuts";
import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { useDraggable } from "@dnd-kit/react";
import { ArrowLeftRight, Grip, Pencil, X } from "lucide-react";
import { ContextMenu, type MenuItem } from "../components/ContextMenu";
import { HeaderToolsSlot, type Rename } from "./header-tools";
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
  const [tools, setTools] = useState<HTMLElement | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [rename, setRenameState] = useState<Rename>();
  const [renaming, setRenaming] = useState(false);
  const slot = useMemo(
    () => ({
      slot: tools,
      // Wrapped so React stores the function instead of calling it.
      setRename: (next: Rename | undefined) => setRenameState(() => next),
    }),
    [tools],
  );
  function commitTitle(input: HTMLInputElement) {
    const next = input.value.trim();
    setRenaming(false);
    if (!rename || !next || next === title) return;
    rename(next.slice(0, 64)).catch((e) => engine.fail(e));
  }
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
  const removeLabel = endsForEveryone
    ? "Encerrar para todos"
    : widget.type === "screen"
      ? "Desconectar transmissão"
      : "Remover deste layout";
  const menuItems: MenuItem[] = [
    ...(rename
      ? [{ label: "Renomear", icon: Pencil, run: () => setRenaming(true) }]
      : []),
    ...(def?.menu?.(props) || []),
    ...(focused
      ? []
      : [
          {
            label: "Trazer para o foco",
            icon: ArrowLeftRight,
            run: props.focus,
          },
        ]),
    { label: removeLabel, icon: X, danger: true, run: props.close },
  ];
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
      <header
        className="widget-header"
        onContextMenu={(event) => {
          if ((event.target as HTMLElement).closest("input, textarea")) return;
          event.preventDefault();
          // The ContextMenu key reports no pointer position: open at the title.
          const box = event.currentTarget.getBoundingClientRect();
          setMenu(
            event.clientX || event.clientY
              ? { x: event.clientX, y: event.clientY }
              : { x: box.left + 12, y: box.bottom },
          );
        }}
      >
        {renaming ? (
          <label className="widget-handle widget-rename">
            <Icon size={15} aria-hidden="true" />
            <input
              aria-label={`Nome de ${title}`}
              defaultValue={title}
              maxLength={64}
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => commitTitle(e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== "Escape") return;
                e.stopPropagation();
                if (e.key === "Escape") e.currentTarget.value = title;
                e.currentTarget.blur();
                // Keyboard users land back on the title they were editing.
                requestAnimationFrame(() =>
                  element.current
                    ?.querySelector<HTMLElement>("button.widget-handle")
                    ?.focus({ preventScroll: true }),
                );
              }}
            />
          </label>
        ) : (
          <button
            ref={handleRef}
            className="widget-handle"
            tabIndex={props.tabIndex}
            onFocus={props.onFocusHeader}
            onKeyDown={(event) => {
              if (event.key === "F2" && rename) {
                event.preventDefault();
                setRenaming(true);
              } else props.navigate(event);
            }}
            onDoubleClick={() => rename && setRenaming(true)}
            aria-label={`Mover ${title}. Use espaço para mover pelo teclado. No mouse, segure ${canvasShortcuts.snap.label} para encaixar.${rename ? " F2 renomeia." : ""}`}
            title={`Arrastar livremente · ${canvasShortcuts.snap.label} encaixa${rename ? " · clique duplo renomeia" : ""}`}
          >
            <Icon size={15} aria-hidden="true" />
            <span>{title}</span>
          </button>
        )}
        <HeaderAccessory widget={widget} engine={engine} />
        <div className="widget-tools" ref={setTools} />
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
            title={removeLabel}
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
        <HeaderToolsSlot.Provider value={slot}>
          <Body
            {...props}
            visible={visible}
            height={Math.max(0, box.height - 38)}
          />
        </HeaderToolsSlot.Provider>
      </div>
      {menu && (
        <ContextMenu
          at={menu}
          items={menuItems}
          label={`Ações de ${title}`}
          close={() => setMenu(null)}
          doc={element.current?.ownerDocument}
        />
      )}
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
