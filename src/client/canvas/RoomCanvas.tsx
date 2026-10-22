import { canvasShortcuts, snapPressed } from "./shortcuts";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  DragDropProvider,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/react";
import { Accessibility, Feedback } from "@dnd-kit/dom";
import { Rectangle } from "@dnd-kit/geometry";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Blocks,
  Columns3,
  LayoutGrid,
  Maximize,
  Minimize,
  MonitorUp,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Notifications } from "../components/Notifications";
import { canManageRoom } from "../../shared/permissions";
import type { SharedWidget } from "../../shared/widgets";
import { contentKind } from "../../shared/widgets";
import { Dialog } from "../components/Dialog";
import { ScreenAudio } from "../components/ScreenAudio";
import type { Controller } from "../room/controller";
import { freshKey } from "../id";
import {
  fitted,
  focusedWidgetId,
  canRemoveSlot,
  isStrip,
  slotUnits,
  presetNames,
  type Offer,
  type Preset,
  type Slot,
  type WidgetInstance,
} from "./model";
import { floatingBox, useCanvasGeometry } from "./geometry";
import { wheelTarget } from "./strip-wheel";
import { useStripInput, stripStops } from "./strip-input";
import { WidgetFrame } from "./WidgetFrame";
import { adjacentDropSlot, dropSlotAt, type Point } from "./drag";
import { createWidget, titleOf, widgetRegistry } from "./widgets";
import { createModule } from "./ModuleWidget";
import { isModule, type ModuleKind } from "../../shared/room-modules";

const plugins = (
  defaults: Parameters<
    NonNullable<
      Extract<import("@dnd-kit/dom").DragDropManagerInput["plugins"], Function>
    >
  >[0],
) => [
  ...defaults.filter((p) => p !== Feedback && p !== Accessibility),
  Feedback.configure({ feedback: "none", dropAnimation: null }),
  Accessibility.configure({
    screenReaderInstructions: {
      draggable: `Use espaço, setas e espaço para encaixar. Escape cancela. No mouse, arraste livremente ou segure ${canvasShortcuts.snap.label} para encaixar.`,
    },
    announcements: {
      dragstart: () =>
        "Movendo widget. Use as setas para escolher uma posição.",
      dragover: () => "Posição de encaixe alterada.",
      dragend: (event: DragEndEvent) =>
        event.canceled ? "Movimento cancelado." : "Movimento concluído.",
    },
  }),
];
const screenWidget = (id: string): WidgetInstance => ({
  id: `screen:${id}`,
  type: "screen",
  title: "Transmissão",
  config: { publicationId: id },
  transient: true,
});

interface Props {
  engine: Controller;
  active: boolean;
  interaction: (busy: boolean) => void;
  settings: () => void;
  people: () => void;
  diagnostics: () => void;
  share: () => void;
  fullscreen: () => void;
  isFullscreen?: boolean;
}

function CanvasSlot({
  slot,
  index,
  register,
  add,
  accept,
  decline,
  remove,
  removable,
  disabled,
  hidden,
  restore,
  dragging,
  split,
}: {
  slot: Slot;
  index: number;
  register: (id: string, node: HTMLElement | null) => void;
  add: () => void;
  accept: (id: string, destination: "slot" | "float") => void;
  decline: (id: string) => void;
  remove: () => void;
  removable: boolean;
  disabled: boolean;
  hidden: boolean;
  restore: () => void;
  dragging: boolean;
  split: () => void;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: slot.id,
    disabled: disabled || !!slot.offer,
  });
  const nodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      ref(node);
      register(slot.id, node);
    },
    [ref, register, slot.id],
  );
  return (
    <div
      ref={nodeRef}
      className={`canvas-slot ${isDropTarget && !disabled ? "is-drop-target" : ""}`}
      data-slot-id={slot.id}
      data-span={slotUnits(slot)}
      style={{ "--slot-span": slotUnits(slot) } as CSSProperties}
      aria-label={`Espaço ${index + 1}`}
    >
      {Array.from({ length: slotUnits(slot) }, (_, i) => (
        <i
          key={i}
          className="slot-snap-point"
          aria-hidden="true"
          style={{ "--unit-index": i } as CSSProperties}
        />
      ))}
      {!slot.widgetId && !slot.offer && slotUnits(slot) > 1 && (
        <button className="split-slot text-button" onClick={split}>
          Dividir espaço
        </button>
      )}
      {hidden ? (
        <button className="add-widget" onClick={restore}>
          <Plus size={20} />
          Mostrar widget
        </button>
      ) : slot.offer ? (
        <div className="screen-offer">
          <MonitorUp size={24} />
          <strong>{slot.offer.title}</strong>
          <p>Compartilhou uma tela. Assistir?</p>
          <div>
            <button
              className="primary"
              onClick={() => accept(slot.offer!.id, "slot")}
            >
              Assistir
            </button>
            <button
              className="secondary"
              onClick={() => accept(slot.offer!.id, "float")}
            >
              Flutuante
            </button>
          </div>
          <button
            className="icon-button offer-dismiss"
            aria-label={`Recusar tela de ${slot.offer.title}`}
            onClick={() => decline(slot.offer!.id)}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        !slot.widgetId && (
          <>
            <button className="add-widget" onClick={add}>
              <Plus size={20} />
              <span>
                {dragging
                  ? `Pressione ${canvasShortcuts.snap.label} para encaixar o widget`
                  : "Adicionar widget"}
              </span>
            </button>
            {removable && (
              <button
                className="icon-button remove-slot"
                aria-label={`Remover espaço vazio ${index + 1}`}
                onClick={remove}
              >
                <X size={14} />
              </button>
            )}
          </>
        )
      )}
    </div>
  );
}

export function RoomCanvas(props: Props) {
  const { engine } = props;
  const store = engine.canvas;
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const { geometry, root, strip, register, measure } = useCanvasGeometry(state);
  const [catalog, setCatalog] = useState<string | null>(null);
  const [catalogTab, setCatalogTab] = useState("native");
  const [communityNotice, setCommunityNotice] = useState(false);
  const [moduleChoice, setModuleChoice] = useState<ModuleKind | null>(null);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const dragOrigin = useRef<{
    box: Rectangle;
    initial: Point;
    point: Point;
  } | null>(null);
  const [announcement, announce] = useState("");
  const [roving, setRoving] = useState<string | null>(null);
  const [snap, setSnap] = useState(false);
  const shift = useRef(false);
  const keyboardDrag = useRef(false);
  const [nearTop, setNearTop] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [fullscreenIntro, setFullscreenIntro] = useState(false);
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const bar = toolbar.current;
    const player = bar?.closest<HTMLElement>(".player");
    if (!bar || !player) return;
    const measureToolbar = () =>
      player.style.setProperty(
        "--canvas-toolbar-height",
        `${bar.offsetHeight}px`,
      );
    const observer = new ResizeObserver(measureToolbar);
    observer.observe(bar);
    measureToolbar();
    return () => {
      observer.disconnect();
      player.style.removeProperty("--canvas-toolbar-height");
    };
  }, []);
  useLayoutEffect(() => {
    setNearTop(false);
    setFullscreenIntro(!!props.isFullscreen);
    if (
      props.isFullscreen &&
      toolbar.current?.contains(toolbar.current.ownerDocument.activeElement)
    )
      (
        toolbar.current.ownerDocument.activeElement as HTMLElement | null
      )?.blur();
    if (!props.isFullscreen) return;
    const timer = setTimeout(() => setFullscreenIntro(false), 1000);
    return () => clearTimeout(timer);
  }, [props.isFullscreen]);
  const seen = useRef(new Set<string>());
  const stripMode = isStrip(state);
  useLayoutEffect(() => {
    const player = root.current?.closest<HTMLElement>(".player");
    const strip = geometry.strip;
    // Lift the call dock above a bottom strip so it never covers it.
    const lift =
      stripMode &&
      !state.single &&
      strip &&
      strip.width > strip.height &&
      strip.y > geometry.bounds.height / 2
        ? geometry.bounds.height - strip.y
        : 0;
    player?.style.setProperty("--dock-lift", `${lift}px`);
  }, [geometry, stripMode, state.single, root]);
  useStripInput(root, strip, stripMode && !state.single);
  const offer = state.pending[0];
  useEffect(() => {
    const set = (value: boolean) => {
      shift.current = value;
      setSnap(value);
    };
    const key = (event: globalThis.KeyboardEvent | PointerEvent) => {
      set(snapPressed(event));
    };
    const blur = () => set(false);
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    window.addEventListener("blur", blur);
    window.addEventListener("pointermove", key, true);
    document.addEventListener("visibilitychange", blur);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pointermove", key, true);
      document.removeEventListener("visibilitychange", blur);
    };
  }, []);
  const ordered = [
    ...state.slots.flatMap((s) => (s.widgetId ? [s.widgetId] : [])),
    ...state.floating.map((f) => f.widgetId),
  ];
  const rovingId = roving && ordered.includes(roving) ? roving : ordered[0];
  const motionKey = `${state.preset}:${state.single}:${state.focusId}:${state.slots.map((s) => `${s.id}:${s.widgetId}`).join("|")}`;
  const watchingKey = engine.view.watching.join("|");
  const snapshot = engine.view.snapshot;
  const publications =
    snapshot?.participants.flatMap((p) =>
      p.publications
        .filter((pub) => pub.kind === "screen")
        .map((pub) => ({
          id: pub.id,
          title: p.name,
          own: p.id === engine.view.id,
        })),
    ) || [];
  const publicationsKey = publications.map((p) => p.id).join("|");
  const epoch = useRef(snapshot?.epoch);

  function focusHeader(id: string) {
    pendingFocus.current = id;
    setRoving(id);
  }
  function focus(id: string) {
    const widget = store.getSnapshot().widgets.find((w) => w.id === id);
    store.focus(id);
    if (widget?.type === "screen")
      engine.watch(widget.config.publicationId, false, true);
    focusHeader(id);
    announce(`${widget ? titleOf(widget, engine) : "Widget"} está no foco.`);
  }
  function accept(
    id: string,
    destination: "slot" | "float" | "new",
    single = false,
  ) {
    if (!engine.screenInfo(id)) {
      store.decline(id);
      return;
    }
    const widget = screenWidget(id);
    store.accept(id, widget, destination);
    engine.watch(id, true, true);
    if (!single)
      store.change((s) => {
        s.single = false;
      });
    if (single) {
      focus(widget.id);
      store.change((s) => {
        s.single = true;
      });
    } else if (
      stripMode &&
      !store.getSnapshot().slots[0].widgetId &&
      destination !== "float"
    )
      focus(widget.id);
    announce(
      `Transmissão aceita. ${destination === "float" ? "Janela flutuante aberta." : "Conectando no espaço escolhido."}`,
    );
  }
  useEffect(() => {
    if (epoch.current !== snapshot?.epoch) {
      seen.current.clear();
      epoch.current = snapshot?.epoch;
    }
    const current = store.getSnapshot();
    for (const widget of current.widgets) {
      if (
        widget.type === "screen" &&
        !engine.view.watching.includes(widget.config.publicationId)
      )
        store.remove(widget.id);
    }
    for (const id of engine.view.watching) {
      if (!store.getSnapshot().widgets.some((w) => w.id === `screen:${id}`)) {
        store.decline(id);
        store.add(screenWidget(id));
      }
    }
    for (const publication of publications) {
      if (seen.current.has(publication.id)) continue;
      seen.current.add(publication.id);
      if (!publication.own && !engine.view.watching.includes(publication.id)) {
        store.offer(publication);
      }
    }
    const live = new Set(publications.map((p) => p.id));
    const latest = store.getSnapshot();
    for (const item of [
      ...latest.pending,
      ...latest.slots.flatMap((s) => (s.offer ? [s.offer] : [])),
    ])
      if (!live.has(item.id)) store.decline(item.id);
    for (const widget of latest.widgets) {
      const approved = snapshot?.widgets?.find(
        (w) =>
          w.id === widget.config.pendingShareId && w.owner === engine.view.id,
      );
      if (approved) store.bindShared(widget.id, approved.id);
    }
    for (const widget of latest.widgets)
      if (
        widget.config.sharedId &&
        !snapshot?.widgets?.some((w) => w.id === widget.config.sharedId)
      )
        store.remove(widget.id);
  }, [
    publicationsKey,
    watchingKey,
    snapshot?.epoch,
    snapshot?.widgets,
    store,
    engine,
  ]);

  // Admission from People uses the same occupied-slot policy as new offers.
  useEffect(() => {
    engine.watchRequest = (id, together, single = false) => {
      const current = store.getSnapshot();
      const widget = current.widgets.find((w) => w.id === `screen:${id}`);
      if (widget) {
        if (!together) {
          focus(widget.id);
          if (single)
            store.change((s) => {
              s.single = true;
            });
        } else {
          store.change((s) => {
            s.single = false;
          });
        }
        return false;
      }
      const publication = engine.screenInfo(id);
      if (!publication) return false;
      const free = current.slots.some(
        (s) => !s.widgetId && (!s.offer || s.offer.id === id),
      );
      if (free || isStrip(current)) {
        store.offer({ id, title: publication.name });
        accept(id, "slot", single);
      } else store.offer({ id, title: publication.name }, true);
      return false;
    };
    return () => {
      engine.watchRequest = undefined;
    };
  });
  function openShared(widget: SharedWidget, bringToFocus = false) {
    const state = store.getSnapshot();
    const existing = state.widgets.find((w) => w.config.sharedId === widget.id);
    if (existing) {
      focus(existing.id);
      return;
    }
    const id = freshKey();
    const destination =
      state.slots.find((s) => s.id === catalog && !s.widgetId && !s.offer)
        ?.id ||
      state.slots.find((s) => !s.widgetId && !s.offer)?.id ||
      store.addSlot();
    store.add(
      {
        id,
        type: contentKind(widget),
        title: widget.title,
        config: { sharedId: widget.id },
        transient: true,
      },
      destination,
    );
    if (bringToFocus) focus(id);
    focusHeader(id);
    setCatalog(null);
  }
  async function addWidget(type: string, scope?: "room" | "individual") {
    if (isModule(type) && !scope) {
      setModuleChoice(type);
      return;
    }
    if (type === "chat" || (isModule(type) && scope === "room")) {
      try {
        const widget = await engine.request<SharedWidget>("widget-create", {
          id: freshKey(),
          content: isModule(type)
            ? createModule(type)
            : { kind: "chat", title: "Chat", blocks: [] },
        });
        engine.receiveSharedWidget(widget);
        openShared(widget);
      } catch (e) {
        engine.fail(e);
      }
      return;
    }
    const existing =
      !["custom", "notes", "timer"].includes(type) &&
      !isModule(type) &&
      store.getSnapshot().widgets.find((w) => w.type === type);
    if (existing) {
      focus(existing.id);
      setCatalog(null);
      return;
    }
    const widget = createWidget(type);
    const destination =
      store
        .getSnapshot()
        .slots.find((s) => s.id === catalog && !s.widgetId && !s.offer)?.id ||
      store.getSnapshot().slots.find((s) => !s.widgetId && !s.offer)?.id ||
      store.addSlot();
    store.add(widget, destination);
    setCatalog(null);
    focusHeader(widget.id);
    announce(`${widget.title} adicionado ao seu layout.`);
  }
  function showPublication(id: string) {
    const existing = store
      .getSnapshot()
      .widgets.find((w) => w.id === `screen:${id}`);
    if (existing) focus(existing.id);
    else {
      store.decline(id);
      const target = store
        .getSnapshot()
        .slots.find((s) => s.id === catalog && !s.widgetId && !s.offer);
      if (target) {
        store.add(screenWidget(id), target.id);
        engine.watch(id, true, true);
      } else if (catalog === "floating") {
        store.add(screenWidget(id), undefined, true);
        engine.watch(id, true, true);
      } else engine.watch(id, true);
    }
    setCatalog(null);
  }
  async function remove(widget: WidgetInstance) {
    const slotId = store
      .getSnapshot()
      .slots.find((s) => s.widgetId === widget.id)?.id;
    let endedForEveryone = false;
    if (widget.config.sharedId) {
      const shared = engine.view.snapshot?.widgets?.find(
        (w) => w.id === widget.config.sharedId,
      );
      if (
        shared &&
        (shared.owner === engine.view.id ||
          canManageRoom(snapshot, engine.view.id))
      ) {
        try {
          await engine.request("widget-delete", { id: shared.id });
          endedForEveryone = true;
        } catch (error) {
          engine.fail(error);
          return;
        }
      }
    }
    if (widget.type === "screen")
      engine.stopWatching(widget.config.publicationId);
    store.remove(widget.id);
    if (slotId) setHighlightedSlot(slotId);
    announce(
      endedForEveryone
        ? `${titleOf(widget, engine)} encerrado para todos na sala.`
        : `${titleOf(widget, engine)} removido do seu layout.`,
    );
  }
  function scrollStep(direction: number) {
    const el = strip.current;
    if (!el) return;
    const horizontal = getComputedStyle(el).gridAutoFlow === "column";
    const position = horizontal ? el.scrollLeft : el.scrollTop;
    const maximum = horizontal
      ? el.scrollWidth - el.clientWidth
      : el.scrollHeight - el.clientHeight;
    const target = wheelTarget(
      position,
      direction,
      stripStops(el),
      maximum,
      false,
    );
    el.scrollTo({
      [horizontal ? "left" : "top"]: target,
      behavior: el.ownerDocument.defaultView?.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
        ? "instant"
        : "smooth",
    });
  }
  function navigate(event: KeyboardEvent) {
    if (
      drag ||
      ![
        "ArrowRight",
        "ArrowLeft",
        "ArrowDown",
        "ArrowUp",
        "Home",
        "End",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    const index = Math.max(0, ordered.indexOf(rovingId));
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? ordered.length - 1
          : (index +
              (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) +
              ordered.length) %
            ordered.length;
    const id = ordered[next];
    if (!id) return;
    setRoving(id);
    pendingFocus.current = id;
    const slot = state.slots.find((s) => s.widgetId === id);
    if (slot && strip.current) {
      const node = [...strip.current.children].find(
        (node) => (node as HTMLElement).dataset.slotId === slot.id,
      );
      node?.scrollIntoView({ block: "nearest", inline: "nearest" });
      measure();
    }
  }
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id || catalog || layoutOpen) return;
    const host = [
      ...(root.current?.querySelectorAll<HTMLElement>("[data-widget-id]") ||
        []),
    ].find((node) => node.dataset.widgetId === id);
    if (host && !host.inert && host.style.visibility !== "hidden") {
      host
        .querySelector<HTMLButtonElement>(".widget-handle")
        ?.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [geometry, roving, root, catalog, layoutOpen]);
  const slotProps = (slot: Slot, index: number) => ({
    slot,
    index,
    register,
    add: () => {
      setCatalog(slot.id);
      setCatalogTab("native");
    },
    accept,
    decline: (id: string) => store.decline(id),
    remove: () => store.removeSlot(slot.id),
    removable: canRemoveSlot(state, slot.id),
    disabled: state.single || !(snap || keyboardDrag.current),
    hidden: false,
    restore: () => {},
    dragging: !!drag && !keyboardDrag.current,
    split: () => store.splitSlot(slot.id),
  });
  useLayoutEffect(() => {
    if (!highlightedSlot) return;
    const node = [
      ...(root.current?.querySelectorAll<HTMLElement>("[data-slot-id]") || []),
    ].find((n) => n.dataset.slotId === highlightedSlot);
    node?.scrollIntoView({ block: "nearest", inline: "nearest" });
    node
      ?.querySelector<HTMLButtonElement>(".add-widget")
      ?.focus({ preventScroll: true });
    setHighlightedSlot(null);
  }, [highlightedSlot, state.slots, root]);
  const visibleSlots =
    geometry.bounds.width < 380 ? 1 : geometry.bounds.width < 680 ? 2 : 3;
  const dropSlots = state.slots.flatMap((slot) => {
    const box = geometry.slots.get(slot.id);
    return box?.visible && !slot.offer ? [{ ...box, id: slot.id }] : [];
  });

  return (
    <div
      className={`room-canvas ${props.isFullscreen ? "is-fullscreen" : ""} ${nearTop || fullscreenIntro || notificationsOpen ? "show-top-toolbar" : ""}`}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse")
          setNearTop(
            event.clientY - event.currentTarget.getBoundingClientRect().top <=
              4 || !!(event.target as HTMLElement).closest(".canvas-toolbar"),
          );
      }}
      onPointerDownCapture={(event) => {
        if (
          event.currentTarget.ownerDocument.defaultView?.matchMedia(
            "(hover: none)",
          ).matches &&
          !(event.target as HTMLElement).closest(
            ".canvas-toolbar, .canvas-top-edge",
          )
        )
          setNearTop(false);
      }}
      onPointerLeave={() => setNearTop(false)}
    >
      <div
        className="canvas-top-edge"
        aria-hidden="true"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setNearTop(true);
        }}
        onPointerDown={(event) => {
          if (
            event.currentTarget.ownerDocument.defaultView?.matchMedia(
              "(hover: none)",
            ).matches
          )
            setNearTop(true);
        }}
      />
      <div
        className="canvas-toolbar"
        ref={toolbar}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setNearTop(true);
        }}
        onPointerLeave={(event) => {
          if (
            event.pointerType === "mouse" &&
            !(event.relatedTarget as HTMLElement | null)?.closest?.(
              ".canvas-top-edge",
            )
          )
            setNearTop(false);
        }}
      >
        <button className="text-button" onClick={() => setLayoutOpen(true)}>
          <LayoutGrid size={16} />
          <span>Layout</span>
        </button>
        <button
          className="text-button"
          aria-label="Adicionar widget"
          onClick={() => {
            // Target the first free slot; with none, picking a widget adds one.
            store.change((s) => {
              s.single = false;
            });
            setCatalog(
              state.slots.find((s) => !s.widgetId && !s.offer)?.id ?? "new",
            );
            setCatalogTab("native");
          }}
        >
          <Plus size={16} />
          <span>Widget</span>
        </button>
        <button
          className="text-button"
          aria-pressed={state.single}
          disabled={!state.widgets.length}
          onClick={() => store.toggleSingle()}
        >
          <Columns3 size={16} />
          <span>{state.single ? "Voltar ao conjunto" : "Foco único"}</span>
        </button>
        <Notifications
          engine={engine}
          openWidget={(w) => openShared(w, true)}
          openScreen={showPublication}
          onOpenChange={setNotificationsOpen}
        />
        <button
          className="icon-button canvas-fullscreen"
          onClick={props.fullscreen}
          aria-label={
            props.isFullscreen
              ? "Sair da tela cheia da sala"
              : "Tela cheia da sala"
          }
          aria-pressed={!!props.isFullscreen}
        >
          {props.isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>
      <DragDropProvider
        plugins={plugins}
        onDragStart={(event, manager) => {
          const id = String(event.operation.source?.id || "");
          const rect = event.operation.source?.element?.getBoundingClientRect();
          if (!rect) return;
          keyboardDrag.current =
            !!event.nativeEvent && "key" in event.nativeEvent;
          const initial = { ...event.operation.position.initial };
          const box = Rectangle.from(rect);
          dragOrigin.current = { box, initial, point: initial };
          // Feedback "none" keeps media hosts stable, but also omits dnd-kit's
          // geometry. Supply it explicitly for collision and keyboard sensors.
          manager.dragOperation.shape = box;
          setDrag({ id, x: 0, y: 0 });
          props.interaction(true);
        }}
        onDragMove={(event, manager) => {
          const origin = dragOrigin.current;
          const base = root.current?.getBoundingClientRect();
          if (!origin || !base) return;
          // dragmove runs before the library updates position/transform. Use
          // the event's requested coordinates, not its previous snapshot.
          let point = event.to || {
            x: origin.point.x + (event.by?.x || 0),
            y: origin.point.y + (event.by?.y || 0),
          };
          const native = event.nativeEvent;
          if (native && "shiftKey" in native) {
            shift.current = snapPressed(native);
            setSnap(shift.current);
          }
          if (native && "key" in native && !state.single) {
            const target = adjacentDropSlot(
              { x: origin.point.x - base.left, y: origin.point.y - base.top },
              String(native.key),
              dropSlots,
            );
            point = target
              ? {
                  x: base.left + target.x + target.width / 2,
                  y: base.top + target.y + target.height / 2,
                }
              : origin.point;
            event.preventDefault();
            manager.actions.move({ to: point, propagate: false });
          }
          origin.point = point;
          const x = point.x - origin.initial.x,
            y = point.y - origin.initial.y;
          manager.dragOperation.shape = new Rectangle(
            origin.box.left + x,
            origin.box.top + y,
            origin.box.width,
            origin.box.height,
          );
          setDrag({ id: String(event.operation.source?.id || ""), x, y });
        }}
        onDragEnd={(event) => {
          const id = String(event.operation.source?.id || "");
          const origin = dragOrigin.current;
          const base = root.current?.getBoundingClientRect();
          if (!event.canceled && id && origin && base) {
            const native = event.nativeEvent;
            if (native && "shiftKey" in native)
              shift.current = snapPressed(native);
            const point =
              native && "clientX" in native && "clientY" in native
                ? { x: Number(native.clientX), y: Number(native.clientY) }
                : origin.point;
            const target = dropSlotAt(
              { x: point.x - base.left, y: point.y - base.top },
              dropSlots,
              geometry.bounds,
            );
            if (
              target &&
              (shift.current || keyboardDrag.current) &&
              !state.single
            ) {
              store.reorder(id, target.id);
              announce("Widget encaixado na posição escolhida.");
            } else if (!state.single && !keyboardDrag.current) {
              const floating = state.floating.find((f) => f.widgetId === id);
              const slot = state.slots.find((s) => s.widgetId === id);
              const box = floating
                ? floatingBox(floating.rect, geometry.bounds)
                : slot && geometry.slots.get(slot.id);
              if (box)
                store.detach(
                  id,
                  fitted({
                    x:
                      (box.x + point.x - origin.initial.x) /
                      geometry.bounds.width,
                    y:
                      (box.y + point.y - origin.initial.y) /
                      geometry.bounds.height,
                    width: Math.min(0.8, box.width / geometry.bounds.width),
                    height: Math.min(0.8, box.height / geometry.bounds.height),
                  }),
                );
            } else {
              announce(
                "Solte sobre um espaço para encaixar. O widget manteve sua posição.",
              );
            }
          }
          dragOrigin.current = null;
          keyboardDrag.current = false;
          shift.current = false;
          setSnap(false);
          setDrag(null);
          props.interaction(false);
        }}
      >
        <div
          className={`canvas-viewport ${drag ? "canvas-dragging" : ""} ${snap || keyboardDrag.current ? "snap-enabled" : ""}`}
          ref={root}
        >
          <div
            className={`canvas-layout ${state.preset} ${state.single ? "single-focus" : ""}`}
            style={
              {
                "--focus-ratio": `${state.ratio * 100}%`,
                "--strip-visible": visibleSlots,
                "--grid-count": state.slots.length,
                "--auto-columns": Math.min(
                  state.slots.length,
                  geometry.bounds.width < 680
                    ? 2
                    : state.preset === "grid-4" || state.preset === "grid-2"
                      ? 2
                      : 3,
                ),
                "--grid-rows": Math.ceil(
                  state.slots.length /
                    Math.min(
                      state.slots.length,
                      geometry.bounds.width < 680
                        ? 2
                        : state.preset === "grid-4" || state.preset === "grid-2"
                          ? 2
                          : 3,
                    ),
                ),
              } as CSSProperties
            }
          >
            {stripMode ? (
              <>
                <CanvasSlot
                  key={state.slots[0].id}
                  {...slotProps(state.slots[0], 0)}
                />
                <div
                  className="canvas-strip"
                  ref={strip}
                  onScroll={measure}
                  aria-label="Tira de widgets"
                >
                  {state.slots.slice(1).map((slot, index) => (
                    <CanvasSlot key={slot.id} {...slotProps(slot, index + 1)} />
                  ))}
                </div>
              </>
            ) : (
              state.slots.map((slot, index) => (
                <CanvasSlot key={slot.id} {...slotProps(slot, index)} />
              ))
            )}
          </div>
          {stripMode && !state.single && (
            <div className="slot-junctions" aria-label="Mesclar espaços vazios">
              {state.slots.slice(1, -1).map((slot, i) => {
                const next = state.slots[i + 2],
                  a = geometry.slots.get(slot.id),
                  b = geometry.slots.get(next.id);
                const area = geometry.strip;
                if (
                  !a ||
                  !b ||
                  !area ||
                  !a.visible ||
                  !b.visible ||
                  slot.widgetId ||
                  slot.offer ||
                  next.widgetId ||
                  next.offer ||
                  slotUnits(slot) + slotUnits(next) > Math.min(3, visibleSlots)
                )
                  return null;
                const horizontal =
                  geometry.bounds.width < 680 ||
                  ["strip-top", "strip-bottom"].includes(state.preset);
                if (
                  horizontal
                    ? a.x < area.x - 2 ||
                      b.x + b.width > area.x + area.width + 2
                    : a.y < area.y - 2 ||
                      b.y + b.height > area.y + area.height + 2
                )
                  return null;
                return (
                  <button
                    className="merge-slot"
                    key={slot.id}
                    aria-label={`Mesclar espaços ${i + 2} e ${i + 3}`}
                    title="Mesclar espaços vazios"
                    style={{
                      left: horizontal
                        ? (a.x + a.width + b.x) / 2
                        : a.x + a.width / 2,
                      top: horizontal
                        ? a.y + a.height / 2
                        : (a.y + a.height + b.y) / 2,
                    }}
                    onClick={() => store.mergeSlots(slot.id, next.id)}
                  >
                    <Plus size={16} />
                  </button>
                );
              })}
            </div>
          )}
          {stripMode &&
            !state.single &&
            state.slots.slice(1).reduce((n, s) => n + slotUnits(s), 0) >
              visibleSlots && (
              <div
                className={`strip-controls ${geometry.bounds.width < 680 || ["strip-top", "strip-bottom"].includes(state.preset) ? "is-horizontal" : "is-vertical"}`}
                role="group"
                aria-label="Navegar pela tira"
                style={{
                  top: geometry.strip?.y || 8,
                  height: geometry.strip?.height || "auto",
                  left: geometry.strip?.x || 8,
                  width: geometry.strip?.width || "auto",
                }}
              >
                <button
                  className="icon-button"
                  onClick={() => scrollStep(-1)}
                  aria-label="Voltar um item da tira"
                >
                  {geometry.bounds.width < 680 ||
                  ["strip-top", "strip-bottom"].includes(state.preset) ? (
                    <ArrowLeft size={16} />
                  ) : (
                    <ArrowUp size={16} />
                  )}
                </button>
                <button
                  className="icon-button"
                  onClick={() => scrollStep(1)}
                  aria-label="Avançar um item da tira"
                >
                  {geometry.bounds.width < 680 ||
                  ["strip-top", "strip-bottom"].includes(state.preset) ? (
                    <ArrowRight size={16} />
                  ) : (
                    <ArrowDown size={16} />
                  )}
                </button>
              </div>
            )}
          {state.widgets.map((widget) => {
            const slot = state.slots.find((s) => s.widgetId === widget.id),
              floating = state.floating.find((f) => f.widgetId === widget.id);
            const focused = focusedWidgetId(state) === widget.id;
            const box =
              state.single && focused
                ? geometry.bounds
                : floating
                  ? floatingBox(
                      floating.rect,
                      geometry.bounds,
                      widgetRegistry[widget.type]?.minimum,
                    )
                  : slot && geometry.slots.get(slot.id);
            const visible = state.single
              ? focused
              : !!floating || !!(slot && geometry.slots.get(slot.id)?.visible);
            return (
              <WidgetFrame
                key={widget.id}
                {...props}
                widget={widget}
                engine={engine}
                box={box || { x: 0, y: 0, width: 1, height: 1 }}
                bounds={geometry.bounds}
                height={box?.height || 0}
                visible={visible}
                focused={focused}
                floating={!!floating && !state.single}
                floatingOrder={state.floating.findIndex(
                  (f) => f.widgetId === widget.id,
                )}
                active={props.active}
                stripAxis={
                  stripMode &&
                  !!slot &&
                  slot !== state.slots[0] &&
                  !state.single
                    ? geometry.bounds.width < 680 ||
                      ["strip-top", "strip-bottom"].includes(state.preset)
                      ? "x"
                      : "y"
                    : undefined
                }
                clip={slot ? geometry.slots.get(slot.id)?.clip : undefined}
                moving={drag?.id === widget.id ? drag : undefined}
                motionKey={motionKey}
                tabIndex={rovingId === widget.id ? 0 : -1}
                onFocusHeader={() => setRoving(widget.id)}
                navigate={navigate}
                focus={() => focus(widget.id)}
                close={() => void remove(widget)}
              />
            );
          })}
        </div>
      </DragDropProvider>
      <div className="canvas-audio">
        {engine.view.watching.map((id) => {
          const info = engine.screenInfo(id);
          if (!info || info.publication.owner === engine.view.id) return null;
          const level = engine.screenLevel(id);
          return (
            <ScreenAudio
              key={id}
              engine={engine}
              stream={engine.peers.stream(id)}
              name={info.name}
              volume={level.volume}
              muted={level.muted || engine.captures.deaf || engine.remoteMute}
            />
          );
        })}
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
      {offer && (
        <Dialog
          title="Todos os espaços estão ocupados"
          close={() => store.decline(offer.id)}
        >
          <p>
            {offer.title} compartilhou uma tela. Seu layout continuará como está
            até você escolher.
          </p>
          <div className="widget-dialog-actions">
            <button
              className="primary"
              onClick={() => accept(offer.id, "float")}
            >
              Assistir em janela flutuante
            </button>
            <button
              className="secondary"
              onClick={() => accept(offer.id, "new")}
            >
              Criar espaço no grid e assistir
            </button>
            <button
              className="text-button"
              onClick={() => store.decline(offer.id)}
            >
              Recusar por enquanto
            </button>
          </div>
          <p className="field-note">
            Você pode voltar a esta transmissão pelo widget Pessoas ou pelo
            catálogo.
          </p>
        </Dialog>
      )}
      {layoutOpen && (
        <Dialog title="Organizar seu espaço" close={() => setLayoutOpen(false)}>
          <fieldset className="layout-modes">
            <legend>Modo layout</legend>
            <div className="layout-choices">
              <button
                className="layout-choice"
                aria-pressed={!stripMode}
                onClick={() =>
                  store.preset(
                    `grid-${Math.min(6, state.slots.length)}` as Preset,
                  )
                }
              >
                <LayoutGrid />
                <strong>Grid automático</strong>
                <span>Todos os espaços fazem parte da grade.</span>
              </button>
              <button
                className="layout-choice"
                aria-pressed={stripMode}
                onClick={() => store.preset("strip-left")}
              >
                <Columns3 />
                <strong>Foco + tira</strong>
                <span>Um espaço grande e uma tira linear.</span>
              </button>
            </div>
          </fieldset>
          <fieldset className="layout-details">
            <legend>{stripMode ? "Posição do foco" : "Disposição"}</legend>
            {stripMode ? (
              <div
                className="layout-directions"
                role="group"
                aria-label="Posição do foco"
              >
                {(["left", "right", "top", "bottom"] as const).map(
                  (side, i) => (
                    <button
                      key={side}
                      aria-pressed={state.preset === `strip-${side}`}
                      onClick={() => store.preset(`strip-${side}`)}
                    >
                      {["Esquerda", "Direita", "Em cima", "Embaixo"][i]}
                    </button>
                  ),
                )}
              </div>
            ) : (
              <div
                className="layout-choices grid-presets"
                role="group"
                aria-label="Disposição do grid"
              >
                {Object.entries(presetNames)
                  .filter(([id]) => !id.startsWith("strip-"))
                  .map(([id, label]) => (
                    <button
                      key={id}
                      aria-pressed={state.preset === id}
                      onClick={() => store.preset(id as Preset)}
                    >
                      {label}
                    </button>
                  ))}
              </div>
            )}
            {!state.preset.startsWith("grid-") && (
              <label>
                Tamanho do foco{" "}
                <output>{Math.round(state.ratio * 100)}%</output>
                <input
                  aria-label="Proporção do espaço de foco"
                  type="range"
                  min=".4"
                  max=".8"
                  step=".05"
                  value={state.ratio}
                  onChange={(e) =>
                    store.change((s) => {
                      s.ratio = +e.target.value;
                    })
                  }
                />
              </label>
            )}
          </fieldset>
        </Dialog>
      )}
      {catalog && (
        <Dialog title="Adicionar widget" close={() => setCatalog(null)}>
          <div
            className="catalog-tabs"
            role="group"
            aria-label="Origem dos widgets"
          >
            {[
              ["native", "VIO"],
              ["live", "Telas"],
              ["room", "Sala"],
              ["community", "Comunidade"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={catalogTab === id}
                onClick={() => setCatalogTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {catalogTab === "native" && (
            <>
              <div className="widget-catalog">
                {Object.values(widgetRegistry)
                  .filter((w) => w.id !== "screen" && w.id !== "custom")
                  .map((w) => (
                    <button
                      className="catalog-item"
                      key={w.id}
                      disabled={
                        w.id === "canvas" ||
                        (w.id === "chat" &&
                          !canManageRoom(snapshot, engine.view.id))
                      }
                      onClick={() => void addWidget(w.id)}
                    >
                      <w.icon size={20} aria-hidden="true" />
                      <strong>{w.title}</strong>
                      <span>
                        {w.id === "chat" &&
                        !canManageRoom(snapshot, engine.view.id)
                          ? "Só o criador e administradores adicionam. Chats existentes ficam em Sala."
                          : w.description}
                      </span>
                    </button>
                  ))}
              </div>
            </>
          )}
          {catalogTab === "live" && (
            <>
              <div className="widget-catalog live-catalog">
                {!publications.length && (
                  <p className="widget-empty">
                    Ninguém está compartilhando tela. As transmissões aparecerão
                    aqui quando começarem.
                  </p>
                )}
                {publications.map((p) => (
                  <button
                    className="catalog-item"
                    key={p.id}
                    onClick={() => showPublication(p.id)}
                  >
                    <MonitorUp size={19} />
                    <strong>
                      {p.own ? "Minha prévia" : `Tela de ${p.title}`}
                    </strong>
                    <span>
                      {engine.view.watching.includes(p.id)
                        ? "Já está conectada · trazer para o foco"
                        : "Conecta somente quando você escolher"}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          {catalogTab === "room" && (
            <>
              {!snapshot?.widgets?.length ? (
                <p>
                  Ninguém compartilhou um widget ainda. Crie um widget
                  individual e use Compartilhar.
                </p>
              ) : (
                <div className="widget-catalog">
                  {snapshot.widgets.map((w) => (
                    <button
                      className="catalog-item"
                      key={w.id}
                      onClick={() => openShared(w)}
                    >
                      <strong>{w.title}</strong>
                      <span>
                        Criado por{" "}
                        {snapshot.participants.find((p) => p.id === w.owner)
                          ?.name || "alguém que saiu da sala"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <p className="field-note">
                Cada pessoa escolhe o que entra no próprio layout. O criador e
                administradores gerenciam widgets públicos; convidados editam
                com permissão.
              </p>
            </>
          )}
          {catalogTab === "community" && (
            <>
              <button
                className="catalog-item"
                onClick={() => setCommunityNotice(true)}
              >
                <Blocks size={20} aria-hidden="true" />
                <strong>Widget personalizado</strong>
              </button>
            </>
          )}
        </Dialog>
      )}
      {catalog && moduleChoice && (
        <Dialog
          title={widgetRegistry[moduleChoice].title}
          centered
          close={() => setModuleChoice(null)}
        >
          <p>Escolha onde usar este widget.</p>
          <div className="module-scope">
            <button
              className="primary"
              disabled={!canManageRoom(snapshot, engine.view.id)}
              onClick={() => {
                const type = moduleChoice;
                setModuleChoice(null);
                void addWidget(type, "room");
              }}
            >
              Adicionar à sala
            </button>
            <button
              className="secondary"
              onClick={() => {
                const type = moduleChoice;
                setModuleChoice(null);
                void addWidget(type, "individual");
              }}
            >
              Só para mim
            </button>
          </div>
          {!canManageRoom(snapshot, engine.view.id) && (
            <p className="field-note">
              Só o criador e administradores adicionam diretamente à sala. Você
              pode criar um individual e pedir para compartilhar.
            </p>
          )}
          <p className="field-note">
            Na sala, cada pessoa recebe um convite para adicionar ao próprio
            layout.
          </p>
        </Dialog>
      )}
      {catalog && communityNotice && (
        <Dialog
          title="Widgets personalizados"
          centered
          close={() => setCommunityNotice(false)}
        >
          <p>
            Em breve, você poderá encontrar widgets criados pela comunidade.
            Esta área vai crescer com novos widgets para a sua sala.
          </p>
        </Dialog>
      )}
    </div>
  );
}
