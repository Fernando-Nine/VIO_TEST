import { canManageRoom, roleAllows, roomRole } from "../../shared/permissions";
import { isModule } from "../../shared/room-modules";
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
import {
  ArrowLeftRight,
  Ellipsis,
  Grip,
  Pencil,
  Minus,
  PictureInPicture2,
  ShieldCheck,
  X,
} from "lucide-react";
import { Dialog } from "../components/Dialog";
import { ContextMenu, type MenuItem } from "../components/ContextMenu";
import { ScreenVolumeSlider } from "../components/ScreenVolume";
import { VolumeNumber } from "../components/VolumeSlider";
import {
  ControlBadge,
  HeaderToolsSlot,
  controlOf,
  type MenuSource,
  type Rename,
} from "./header-tools";
import type { Controller } from "../room/controller";
import { reducedMotion } from "../components/motion";
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
  underDock?: boolean;
  moving?: { x: number; y: number };
  motionKey: string;
  tabIndex: number;
  onFocusHeader: () => void;
  navigate: (event: KeyboardEvent) => void;
  focus: () => void;
  close: () => void;
  /** Deletes a room widget for everyone (owner or allowed manager). */
  end: () => void;
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
  // Touch long press on the header opens the same menu (iOS has no contextmenu).
  const press = useRef(0);
  const pressAt = useRef({ x: 0, y: 0 });
  const cancelPress = () => clearTimeout(press.current);
  const [rename, setRenameState] = useState<Rename>();
  const [bodyMenu, setBodyMenu] = useState<MenuSource>();
  const [renaming, setRenaming] = useState(false);
  const slot = useMemo(
    () => ({
      slot: tools,
      // Wrapped so React stores the function instead of calling it.
      setRename: (next: Rename | undefined) => setRenameState(() => next),
      setMenu: (next: MenuSource | undefined) => setBodyMenu(() => next),
    }),
    [tools],
  );
  function commitTitle(input: HTMLInputElement) {
    const next = input.value.trim();
    setRenaming(false);
    if (!rename || !next || next === title) return;
    rename(next.slice(0, 64)).catch((e) => engine.fail(e));
  }
  const snapshot = engine.view.snapshot;
  const shared = widget.config.sharedId
    ? snapshot?.widgets?.find((w) => w.id === widget.config.sharedId)
    : undefined;
  const manages = canManageRoom(snapshot, engine.view.id);
  const role = snapshot ? roomRole(snapshot, engine.view.id) : "guest";
  const endsForEveryone =
    !!shared &&
    (shared.owner === engine.view.id ||
      (manages && roleAllows(snapshot?.permissions, role, "adminClose")));
  // Personal content widgets carry "Só você"; app views (people, call) carry none.
  const badged =
    !!shared ||
    isModule(widget.type) ||
    ["timer", "custom", "notes"].includes(widget.type);
  const [access, setAccess] = useState(false);
  const control = shared && controlOf(snapshot, shared);
  // A room-wide grant already lets everyone control; nothing to choose then.
  const choosesAccess =
    !!shared &&
    manages &&
    !roleAllows(
      snapshot?.permissions,
      "guest",
      shared.kind === "chat" ? "guestChat" : "guestControl",
    );
  function setAllGuests(allowed: boolean) {
    setAccess(false);
    if (!shared || !!shared.allGuestsEdit === allowed) return;
    engine
      .request("widget-permission", { id: shared.id, allGuests: true, allowed })
      .catch((e) => engine.fail(e));
  }
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
    if (reducedMotion(element.current.ownerDocument.defaultView || window))
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
  // Room widget: − closes only for you, × for everyone (whoever may); a
  // personal widget only closes (docs/design/cabecalho-widget.md).
  const removeLabel =
    widget.type === "screen"
      ? "Desconectar transmissão"
      : shared
        ? "Fechar só para mim"
        : "Fechar";
  // Same order everywhere (docs/design/widgets-padrao.md): focus, rename,
  // widget actions and appearance, access, then remove and end.
  const menuItems: MenuItem[] = [
    ...(focused
      ? []
      : [
          {
            label: "Trazer para o foco",
            icon: ArrowLeftRight,
            run: props.focus,
          },
        ]),
    ...(widget.type === "screen" && !floating
      ? [
          {
            label: "Janela flutuante",
            icon: PictureInPicture2,
            run: () => engine.canvas.detach(widget.id),
          },
        ]
      : []),
    ...(rename
      ? [{ label: "Renomear", icon: Pencil, run: () => setRenaming(true) }]
      : []),
    ...(def?.menu?.(props) || []),
    ...(bodyMenu?.() || []),
    ...(choosesAccess
      ? [
          {
            label: "Quem pode controlar",
            icon: ShieldCheck,
            run: () => setAccess(true),
          },
        ]
      : []),
    {
      label: removeLabel,
      icon: shared ? Minus : X,
      separated: true,
      run: props.close,
    },
    ...(endsForEveryone
      ? [
          {
            label: "Fechar para todos",
            icon: X,
            danger: true,
            run: props.end,
          },
        ]
      : []),
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
      className={`widget-host ${widget.type === "screen" ? "is-screen" : ""} ${focused ? "is-focused" : ""} ${floating ? "is-floating" : ""} ${widget.type === "screen" && !props.active ? "screen-controls-idle" : ""} ${moving ? "is-dragging" : ""} ${props.underDock ? "under-dock" : ""}`}
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
        onPointerDown={(event) => {
          if (
            event.pointerType !== "touch" ||
            (event.target as HTMLElement).closest(
              "input, textarea, .widget-actions, .widget-tools",
            )
          )
            return;
          const at = { x: event.clientX, y: event.clientY };
          pressAt.current = at;
          press.current = window.setTimeout(() => setMenu(at), 500);
        }}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onPointerMove={(event) => {
          // A finger never holds perfectly still; only a drag cancels.
          if (
            event.pointerType === "touch" &&
            Math.hypot(
              event.clientX - pressAt.current.x,
              event.clientY - pressAt.current.y,
            ) > 8
          )
            cancelPress();
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
        {badged && <ControlBadge snapshot={snapshot} widget={shared} />}
        <div className="widget-actions">
          <button
            className="icon-button widget-more"
            aria-label={`Ações de ${title}`}
            aria-haspopup="menu"
            onClick={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              setMenu({ x: box.left, y: box.bottom });
            }}
          >
            <Ellipsis size={16} />
          </button>
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
          {shared ? (
            <button
              className="icon-button widget-close"
              onClick={props.close}
              aria-label={`Fechar ${title} só para mim`}
              title={"Fechar só para mim\nContinua aberto para os outros."}
            >
              <Minus size={16} />
            </button>
          ) : (
            <button
              className="icon-button widget-close"
              onClick={props.close}
              aria-label={
                widget.type === "screen"
                  ? `Desconectar ${title}`
                  : `Fechar ${title}`
              }
              title={removeLabel}
            >
              <X size={16} />
            </button>
          )}
          {endsForEveryone && (
            <button
              className="icon-button widget-close widget-close-all"
              onClick={props.end}
              aria-label={`Fechar ${title} para todos`}
              title="Fechar para todos"
            >
              <X size={16} />
            </button>
          )}
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
          className="widget-menu"
          close={() => setMenu(null)}
          origin={element.current}
          header={
            widget.type === "screen" &&
            person &&
            person.publication.owner !== engine.view.id && (
              <label className="person-menu-volume">
                <span>
                  Volume desta tela
                  <VolumeNumber
                    value={
                      engine.screenLevel(widget.config.publicationId).volume
                    }
                    reset={() =>
                      engine.setScreenLevel(widget.config.publicationId, {
                        volume: 1,
                      })
                    }
                  />
                </span>
                <ScreenVolumeSlider
                  engine={engine}
                  id={widget.config.publicationId}
                />
              </label>
            )
          }
        />
      )}
      {access && control && (
        <Dialog
          title="Quem pode controlar"
          centered
          close={() => setAccess(false)}
        >
          <div className="control-choice" role="group" aria-label={title}>
            <button
              aria-pressed={control.level === "all"}
              onClick={() => setAllGuests(true)}
            >
              <strong>Todos</strong>
              <span>Convidados também controlam.</span>
            </button>
            <button
              aria-pressed={control.level !== "all"}
              onClick={() => setAllGuests(false)}
            >
              <strong>Admins</strong>
              <span>Só o criador e os administradores.</span>
            </button>
          </div>
        </Dialog>
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
