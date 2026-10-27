import { canvasShortcuts, snapPressed } from "./shortcuts";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import {
  DragDropProvider,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/react";
import {
  Accessibility,
  Feedback,
  PointerActivationConstraints,
  PointerSensor,
} from "@dnd-kit/dom";
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
import {
  LiveScreens,
  ScreenToast,
  type ScreenEvent,
} from "../components/LiveScreens";
import { canManageRoom, roleAllows, roomRole } from "../../shared/permissions";
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
  autoGrid,
  gridPreset,
  gridSize,
  type Offer,
  type Slot,
  type WidgetInstance,
} from "./model";
import { floatingBox, useCanvasGeometry } from "./geometry";
import { wheelTarget } from "./strip-wheel";
import { useStripInput, stripStops } from "./strip-input";
import { WidgetFrame } from "./WidgetFrame";
import { WidgetCatalog, type Scope } from "./WidgetCatalog";
import { GridPicker } from "./GridPicker";
import { NotShown } from "./NotShown";
import { adjacentDropSlot, dropSlotAt, type Point } from "./drag";
import { createWidget, titleOf, widgetRegistry } from "./widgets";
import { createModule } from "./ModuleWidget";
import { createContent } from "./CustomWidget";
import { isModule } from "../../shared/room-modules";

// dnd-kit starts a mouse drag on the handle at pointerdown, so a plain click
// (or double click to rename) would already detach the widget. Require a
// small movement first; touch and other pointers keep the library defaults.
const sensors = (
  defaults: Parameters<
    NonNullable<
      Extract<import("@dnd-kit/dom").DragDropManagerInput["sensors"], Function>
    >
  >[0],
) => [
  PointerSensor.configure({
    activationConstraints: (event, source) => {
      if (event.pointerType === "mouse")
        return [new PointerActivationConstraints.Distance({ value: 4 })];
      const fallback = PointerSensor.defaults.activationConstraints;
      return typeof fallback === "function"
        ? fallback(event, source)
        : fallback;
    },
  }),
  ...defaults.filter((s) => s !== PointerSensor),
];
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
      draggable: `Use espaço, setas e espaço para encaixar. Escape cancela. No mouse, arraste livremente ou segure ${canvasShortcuts.snap.label} para encaixar; na tira, arrastar ao longo dela muda a ordem.`,
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
  catalog,
  accept,
  decline,
  remove,
  removable,
  disabled,
  hidden,
  restore,
  dragging,
  split,
  reorderTarget,
}: {
  slot: Slot;
  index: number;
  register: (id: string, node: HTMLElement | null) => void;
  add: () => void;
  catalog?: ReactNode;
  accept: (id: string, destination: "slot" | "float") => void;
  decline: (id: string) => void;
  remove: () => void;
  removable: boolean;
  disabled: boolean;
  hidden: boolean;
  restore: () => void;
  dragging: boolean;
  split: () => void;
  /** A strip widget dragged along the strip lands here. */
  reorderTarget: boolean;
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
      className={`canvas-slot ${isDropTarget && !disabled ? "is-drop-target" : ""} ${reorderTarget ? "is-reorder-target" : ""}`}
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
        !slot.widgetId &&
        (catalog || (
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
        ))
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
  // The catalog inside an empty slot (the panel uses `catalog`).
  const [slotCatalog, setSlotCatalog] = useState<string | null>(null);
  const [communityNotice, setCommunityNotice] = useState(false);
  const target = slotCatalog ?? catalog;
  const closeCatalog = () => {
    setCatalog(null);
    setSlotCatalog(null);
  };
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
  const [stripTarget, setStripTarget] = useState<string | null>(null);
  const shift = useRef(false);
  const keyboardDrag = useRef(false);
  const [nearTop, setNearTop] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [screenEvents, setScreenEvents] = useState<ScreenEvent[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const hideToast = useCallback(() => setToast(null), []);
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
  const stripBox = geometry.strip;
  // Lift the call dock above a bottom strip so it never covers it.
  // Only the full-screen pill floats over the canvas; elsewhere the dock is
  // a footer below it (docs/design/chamada.md).
  const dockLift =
    props.isFullscreen &&
    stripMode &&
    !state.single &&
    stripBox &&
    stripBox.width > stripBox.height &&
    stripBox.y > geometry.bounds.height / 2
      ? geometry.bounds.height - stripBox.y
      : 0;
  useLayoutEffect(() => {
    root.current
      ?.closest<HTMLElement>(".player")
      ?.style.setProperty("--dock-lift", `${dockLift}px`);
  }, [dockLift, root]);
  // In full screen the dock floats at the bottom centre; widgets ending right
  // there reserve its height so their last controls stay usable.
  const underDock = (box: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) =>
    !!props.isFullscreen &&
    Math.abs(box.y + box.height - (geometry.bounds.height - dockLift)) < 14 &&
    box.x < geometry.bounds.width / 2 + 230 &&
    box.x + box.width > geometry.bounds.width / 2 - 230;
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
  const liveScreens = publications
    .filter((p) => !p.own)
    .map((p) => ({ ...p, watching: engine.view.watching.includes(p.id) }));
  const toastEvent = screenEvents.find((e) => e.id === toast);
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
    // A fresh room (or epoch) only primes what is already live: those
    // screens are in the live icon, not news to announce.
    const primed = epoch.current === snapshot?.epoch && seen.current.size > 0;
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
    // Seed with a marker so an empty room still counts as primed later.
    if (!seen.current.size) seen.current.add("");
    for (const publication of publications) {
      if (seen.current.has(publication.id)) continue;
      seen.current.add(publication.id);
      if (
        primed &&
        !publication.own &&
        !engine.view.watching.includes(publication.id)
      ) {
        const event = {
          id: freshKey(),
          publicationId: publication.id,
          name: publication.title,
          at: Date.now(),
          read: false,
        };
        setScreenEvents((events) => [...events, event].slice(-30));
        setToast(event.id);
      }
    }
    const live = new Set(publications.map((p) => p.id));
    const latest = store.getSnapshot();
    for (const item of [
      ...latest.pending,
      ...latest.slots.flatMap((s) => (s.offer ? [s.offer] : [])),
    ])
      if (!live.has(item.id)) store.decline(item.id);
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
      state.slots.find((s) => s.id === target && !s.widgetId && !s.offer)?.id ||
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
    closeCatalog();
  }
  // "Para a sala" only for whoever the room lets create (#104).
  const createsForRoom =
    !!snapshot &&
    roleAllows(
      snapshot.permissions,
      roomRole(snapshot, engine.view.id),
      roomRole(snapshot, engine.view.id) === "admin"
        ? "adminCreate"
        : "guestCreate",
    );
  async function addWidget(type: string, scope: Scope) {
    const scoped = isModule(type) || type === "timer";
    if (type === "chat" || (scoped && scope === "room")) {
      try {
        const widget = await engine.request<SharedWidget>("widget-create", {
          id: freshKey(),
          content: isModule(type)
            ? createModule(type)
            : type === "timer"
              ? createContent("timer")
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
      closeCatalog();
      return;
    }
    const widget = createWidget(type);
    const destination =
      store
        .getSnapshot()
        .slots.find((s) => s.id === target && !s.widgetId && !s.offer)?.id ||
      store.getSnapshot().slots.find((s) => !s.widgetId && !s.offer)?.id ||
      store.addSlot();
    store.add(widget, destination);
    closeCatalog();
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
      const free = store
        .getSnapshot()
        .slots.find((s) => s.id === target && !s.widgetId && !s.offer);
      if (free) {
        store.add(screenWidget(id), free.id);
        engine.watch(id, true, true);
      } else if (target === "floating") {
        store.add(screenWidget(id), undefined, true);
        engine.watch(id, true, true);
      } else engine.watch(id, true);
    }
    closeCatalog();
  }
  async function remove(widget: WidgetInstance, forEveryone = false) {
    const slotId = store
      .getSnapshot()
      .slots.find((s) => s.widgetId === widget.id)?.id;
    let endedForEveryone = false;
    if (forEveryone && widget.config.sharedId) {
      const shared = engine.view.snapshot?.widgets?.find(
        (w) => w.id === widget.config.sharedId,
      );
      if (shared) {
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
    if (!id || target || layoutOpen) return;
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
  }, [geometry, roving, root, target, layoutOpen]);
  const slotProps = (slot: Slot, index: number) => ({
    slot,
    index,
    register,
    add: () => setSlotCatalog(slot.id),
    catalog:
      slotCatalog === slot.id ? (
        <WidgetCatalog
          compact
          canRoom={createsForRoom}
          chatAllowed={canManageRoom(snapshot, engine.view.id)}
          add={(type, scope) => void addWidget(type, scope)}
          close={() => setSlotCatalog(null)}
        />
      ) : undefined,
    accept,
    decline: (id: string) => store.decline(id),
    remove: () => store.removeSlot(slot.id),
    removable: canRemoveSlot(state, slot.id),
    disabled: state.single || !(snap || keyboardDrag.current),
    hidden: false,
    restore: () => {},
    dragging: !!drag && !keyboardDrag.current,
    split: () => store.splitSlot(slot.id),
    reorderTarget: stripTarget === slot.id,
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
  // Phones use one column: the focus on top in 16:9, the rest below.
  const compact = geometry.bounds.width < 680;
  const horizontalStrip =
    !compact && ["strip-top", "strip-bottom"].includes(state.preset);
  const grid = gridSize(state.preset);
  // Switching to the grid picks the smallest one that shows everything.
  const gridToFit = autoGrid(
    state.slots.filter((t) => t.widgetId || t.offer).length +
      state.hidden.length,
  );
  const visibleSlots = compact
    ? Math.max(
        1,
        Math.floor(
          (geometry.bounds.height - (geometry.bounds.width * 9) / 16) /
            ((geometry.bounds.width * 9) / 16),
        ),
      )
    : 3;
  const dropSlots = state.slots.flatMap((slot) => {
    const box = geometry.slots.get(slot.id);
    return box?.visible && !slot.offer ? [{ ...box, id: slot.id }] : [];
  });
  /**
   * Inside the strip, a strip widget reorders (null: drops back in place);
   * outside it, the drag floats the widget as before. Undefined: not a reorder.
   */
  function stripDrop(id: string, point: Point) {
    const area = geometry.strip;
    const base = root.current?.getBoundingClientRect();
    if (!stripMode || state.single || !area || !base) return undefined;
    if (state.slots.findIndex((s) => s.widgetId === id) <= 0) return undefined;
    const local = { x: point.x - base.left, y: point.y - base.top };
    const target = dropSlotAt(local, dropSlots, area);
    if (!target) return undefined;
    const index = state.slots.findIndex((s) => s.id === target.id);
    return index > 0 && state.slots[index].widgetId !== id ? target.id : null;
  }

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
            setSlotCatalog(null);
            setCatalog(
              state.slots.find((s) => !s.widgetId && !s.offer)?.id ?? "new",
            );
          }}
        >
          <Plus size={16} />
          <span>Widget</span>
        </button>
        {state.hidden.length > 0 && (
          <NotShown
            widgets={state.hidden.flatMap((id) => {
              const widget = state.widgets.find((w) => w.id === id);
              return widget ? [widget] : [];
            })}
            title={(widget) => titleOf(widget, engine)}
            show={(id) => store.show(id)}
          />
        )}
        {state.single && (
          <button className="text-button" onClick={() => store.toggleSingle()}>
            <Columns3 size={16} />
            <span>Voltar ao conjunto</span>
          </button>
        )}
        <Notifications
          engine={engine}
          openWidget={(w) => openShared(w, true)}
          openScreen={showPublication}
          screenEvents={screenEvents.filter((e) => e.id !== toast)}
          onOpenChange={setNotificationsOpen}
        />
        <LiveScreens screens={liveScreens} watch={showPublication} />
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
        sensors={sensors}
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
          setStripTarget(
            keyboardDrag.current || shift.current
              ? null
              : stripDrop(String(event.operation.source?.id || ""), point) ||
                  null,
          );
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
            const along =
              shift.current || keyboardDrag.current
                ? undefined
                : stripDrop(id, point);
            if (along !== undefined) {
              if (along) {
                store.reorder(id, along);
                announce("Widget movido na tira.");
              }
            } else if (
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
          setStripTarget(null);
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
            className={`canvas-layout ${grid ? "grid" : state.preset} ${state.single ? "single-focus" : ""}`}
            onScroll={compact && grid ? measure : undefined}
            style={
              {
                "--focus-ratio": `${state.ratio * 100}%`,
                "--strip-visible": visibleSlots,
                "--grid-rows": grid?.rows ?? 1,
                "--grid-columns": grid?.columns ?? 1,
                "--compact-row": `${Math.round(((geometry.bounds.width - 8) * 9) / 16)}px`,
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
                const horizontal = horizontalStrip;
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
                className={`strip-controls ${horizontalStrip ? "is-horizontal" : "is-vertical"}`}
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
                  {horizontalStrip ? (
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
                  {horizontalStrip ? (
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
                underDock={
                  widget.type !== "screen" &&
                  !floating &&
                  !!box &&
                  underDock(box)
                }
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
                    ? horizontalStrip
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
                end={() => void remove(widget, true)}
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
      {toastEvent && (
        <ScreenToast
          event={toastEvent}
          done={hideToast}
          watch={() => {
            setScreenEvents((events) =>
              events.map((e) =>
                e.id === toastEvent.id ? { ...e, read: true } : e,
              ),
            );
            setToast(null);
            showPublication(toastEvent.publicationId);
          }}
        />
      )}
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
          {compact ? (
            <label className="layout-switch">
              <span>
                <strong>Foco no topo</strong>
                <span>Um widget fixo em cima; os outros rolam embaixo.</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={stripMode}
                onChange={(e) =>
                  store.preset(e.target.checked ? "strip-left" : gridToFit)
                }
              />
            </label>
          ) : (
            <>
              <fieldset className="layout-modes">
                <legend>Modo</legend>
                <div className="layout-choices">
                  <button
                    className="layout-choice"
                    aria-pressed={!stripMode}
                    onClick={() => !grid && store.preset(gridToFit)}
                  >
                    <LayoutGrid />
                    <strong>Grade</strong>
                    <span>Todos do mesmo tamanho.</span>
                  </button>
                  <button
                    className="layout-choice"
                    aria-pressed={stripMode}
                    onClick={() => !stripMode && store.preset("strip-left")}
                  >
                    <Columns3 />
                    <strong>Foco + tira</strong>
                    <span>Um grande e uma fileira.</span>
                  </button>
                </div>
              </fieldset>
              <fieldset className="layout-details">
                <legend>{stripMode ? "Posição do foco" : "Tamanho"}</legend>
                {stripMode ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <GridPicker
                      value={grid}
                      pick={(size) =>
                        store.preset(gridPreset(size.rows, size.columns))
                      }
                    />
                    <p className="field-note">
                      De 1×1 (um widget só) até 3 linhas por 4 colunas.
                    </p>
                  </>
                )}
              </fieldset>
            </>
          )}
        </Dialog>
      )}
      {catalog && (
        <Dialog title="Adicionar widget" close={() => setCatalog(null)}>
          <WidgetCatalog
            canRoom={createsForRoom}
            chatAllowed={canManageRoom(snapshot, engine.view.id)}
            add={(type, scope) => void addWidget(type, scope)}
            close={() => setCatalog(null)}
            notShown={
              state.hidden.length > 0 && (
                <section className="catalog-group">
                  <h3>Não exibidos</h3>
                  <div className="widget-catalog">
                    {state.hidden.flatMap((id) => {
                      const widget = state.widgets.find((w) => w.id === id);
                      if (!widget) return [];
                      const Icon = widgetRegistry[widget.type]?.icon;
                      return [
                        <button
                          className="catalog-item"
                          key={id}
                          onClick={() => {
                            store.show(id);
                            setCatalog(null);
                          }}
                        >
                          {Icon && <Icon size={20} aria-hidden="true" />}
                          <span className="catalog-text">
                            <strong>{titleOf(widget, engine)}</strong>
                            <span>Mostrar</span>
                          </span>
                        </button>,
                      ];
                    })}
                  </div>
                </section>
              )
            }
            tabs={[
              [
                "Telas",
                <>
                  <div className="widget-catalog live-catalog">
                    {!publications.length && (
                      <p className="widget-empty">
                        Ninguém está compartilhando tela. As transmissões
                        aparecerão aqui quando começarem.
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
                </>,
              ],
              [
                "Sala",
                <>
                  {!snapshot?.widgets?.length ? (
                    <p className="widget-empty">
                      Nenhum widget da sala ainda. Crie um em Widgets, Para a
                      sala.
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
                </>,
              ],
              [
                "Comunidade",
                <>
                  <button
                    className="catalog-item"
                    onClick={() => setCommunityNotice(true)}
                  >
                    <Blocks size={20} aria-hidden="true" />
                    <strong>Widget personalizado</strong>
                  </button>
                </>,
              ],
            ]}
          />
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
