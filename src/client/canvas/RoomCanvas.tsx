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
  Columns3,
  LayoutGrid,
  Maximize,
  Minimize,
  MonitorUp,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
  presetNames,
  type Offer,
  type Preset,
  type Slot,
  type WidgetInstance,
} from "./model";
import { floatingBox, useCanvasGeometry } from "./geometry";
import { useStripInput } from "./strip-input";
import { WidgetFrame } from "./WidgetFrame";
import { adjacentDropSlot, dropSlotAt, type Point } from "./drag";
import { createWidget, titleOf, widgetRegistry } from "./widgets";

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
      draggable:
        "Use espaço, setas e espaço para encaixar. Escape cancela. No mouse, arraste livremente ou segure Shift para encaixar. Layout oferece Mover widget sem arrastar.",
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
      className={`canvas-slot ${isDropTarget ? "is-drop-target" : ""}`}
      data-slot-id={slot.id}
      aria-label={`Espaço ${index + 1}`}
    >
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
              <span>Adicionar widget</span>
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
  const [organizing, setOrganizing] = useState<string | null>(null);
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
  const [highlightedSlot, setHighlightedSlot] = useState<string | null>(null);
  const [newInStrip, setNewInStrip] = useState(0);
  const pendingFocus = useRef<string | null>(null);
  const seen = useRef(new Set<string>());
  const stripMode = isStrip(state);
  useStripInput(root, strip, stripMode && !state.single);
  const offer = state.pending[0];
  useEffect(() => {
    const set = (value: boolean) => {
      shift.current = value;
      setSnap(value);
    };
    const key = (event: globalThis.KeyboardEvent) => {
      set(event.shiftKey);
    };
    const blur = () => set(false);
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      window.removeEventListener("blur", blur);
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
    let added = 0;
    for (const publication of publications) {
      if (seen.current.has(publication.id)) continue;
      seen.current.add(publication.id);
      if (!publication.own && !engine.view.watching.includes(publication.id)) {
        store.offer(publication);
        added++;
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
    if (added && isStrip(latest)) setNewInStrip((n) => n + added);
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
  function addWidget(type: string) {
    const existing =
      !["custom", "notes", "timer"].includes(type) &&
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
      if (shared?.owner === engine.view.id) {
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
    const nodes = [...el.querySelectorAll<HTMLElement>(".canvas-slot")];
    const horizontal = el.scrollWidth > el.clientWidth + 2;
    const position = horizontal ? el.scrollLeft : el.scrollTop;
    const offset = (node: HTMLElement) =>
      horizontal
        ? node.offsetLeft - (nodes[0]?.offsetLeft || 0)
        : node.offsetTop - (nodes[0]?.offsetTop || 0);
    const index = nodes.reduce(
      (best, node, i) =>
        Math.abs(offset(node) - position) <
        Math.abs(offset(nodes[best]) - position)
          ? i
          : best,
      0,
    );
    const target =
      nodes[Math.max(0, Math.min(nodes.length - 1, index + direction))];
    if (!target) return;
    el.scrollTo({
      [horizontal ? "left" : "top"]: offset(target),
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
    if (!id || catalog || organizing || layoutOpen) return;
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
  }, [geometry, roving, root, catalog, organizing, layoutOpen]);
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
  const organizedWidget = state.widgets.find((w) => w.id === organizing);
  const currentFloat = state.floating.find((f) => f.widgetId === organizing);
  const visibleSlots =
    geometry.bounds.width < 380 ? 1 : geometry.bounds.width < 680 ? 2 : 3;
  const dropSlots = state.slots.flatMap((slot) => {
    const box = geometry.slots.get(slot.id);
    return box?.visible && !slot.offer ? [{ ...box, id: slot.id }] : [];
  });

  return (
    <div
      className={`room-canvas ${props.isFullscreen ? "is-fullscreen" : ""} ${nearTop || layoutOpen || catalog ? "show-top-toolbar" : ""}`}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setNearTop(
          event.pointerType !== "mouse" || event.clientY - rect.top < 64,
        );
      }}
      onPointerLeave={() => setNearTop(false)}
    >
      <div
        className="canvas-top-edge"
        aria-hidden="true"
        onPointerEnter={() => setNearTop(true)}
      />
      <div className="canvas-toolbar">
        <button className="text-button" onClick={() => setLayoutOpen(true)}>
          <LayoutGrid size={16} />
          <span>Layout</span>
        </button>
        <button
          className="text-button"
          aria-label="Adicionar espaço vazio"
          onClick={() => {
            const id =
              state.slots.find((s) => !s.widgetId && !s.offer)?.id ||
              store.addSlot();
            setHighlightedSlot(id);
            store.change((s) => {
              s.single = false;
            });
            announce(
              "Espaço vazio pronto. Clique em Adicionar widget para escolher o conteúdo.",
            );
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
        {state.single && (
          <label className="single-focus-select">
            <span className="sr-only">Trocar tela em foco único</span>
            <select
              aria-label="Trocar tela em foco único"
              value={focusedWidgetId(state) || ""}
              onChange={(event) => focus(event.target.value)}
            >
              {state.widgets.map((w) => (
                <option key={w.id} value={w.id}>
                  {titleOf(w, engine)}
                </option>
              ))}
            </select>
          </label>
        )}
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
          setDrag(null);
          props.interaction(false);
        }}
      >
        <div
          className={`canvas-viewport ${drag ? "canvas-dragging" : ""} ${snap || keyboardDrag.current ? "snap-enabled" : ""}`}
          ref={root}
        >
          <div
            className={`canvas-layout ${state.preset} ${stripMode && state.slots.length - 1 > visibleSlots ? "with-strip-navigation" : ""} ${state.single ? "single-focus" : ""}`}
            style={
              {
                "--focus-ratio": `${state.ratio * 100}%`,
                "--strip-visible": visibleSlots,
                "--grid-count": state.slots.length,
                "--grid-rows": Math.ceil(
                  state.slots.length / (geometry.bounds.width < 680 ? 2 : 3),
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
          {stripMode &&
            !state.single &&
            state.slots.length - 1 > visibleSlots && (
              <div
                className="strip-controls"
                role="group"
                aria-label="Navegar pela tira"
                style={{
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
                {newInStrip > 0 && (
                  <button
                    className="text-button strip-notice"
                    onClick={() => {
                      strip.current?.scrollTo({
                        top: strip.current.scrollHeight,
                        left: strip.current.scrollWidth,
                        behavior: "instant",
                      });
                      setNewInStrip(0);
                    }}
                  >
                    {newInStrip}{" "}
                    {newInStrip === 1 ? "convite novo" : "convites novos"}
                  </button>
                )}
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
            <legend>1. Modo do layout</legend>
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
            <legend>2. Organize este modo</legend>
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
            <p className="field-note">
              O layout preserva os widgets abertos. Espaços vazios podem ser
              removidos pelo X. Arraste livremente; segure Shift para encaixar.
            </p>
          </fieldset>
          <fieldset>
            <legend>Mover widget sem arrastar</legend>
            <p className="field-note">
              Escolha um widget e depois seu destino. Funciona também no toque e
              pelo teclado.
            </p>
            <div className="slot-destinations">
              {state.widgets.map((w) => (
                <button
                  key={w.id}
                  className="secondary"
                  onClick={() => {
                    setLayoutOpen(false);
                    setOrganizing(w.id);
                  }}
                >
                  {titleOf(w, engine)}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="field-note">
            A partir de seis participantes, o envio direto entre navegadores
            exige mais rede e processamento. A sala não tem limite fixo de
            pessoas.
          </p>
        </Dialog>
      )}
      {organizedWidget && (
        <Dialog
          title={`Organizar ${titleOf(organizedWidget, engine)}`}
          close={() => setOrganizing(null)}
        >
          <div className="widget-dialog-actions">
            <button
              className="primary"
              onClick={() => {
                focus(organizedWidget.id);
                setOrganizing(null);
              }}
            >
              Trazer para o foco
            </button>
            {widgetRegistry[organizedWidget.type]?.canFloat && (
              <button
                className="secondary"
                onClick={() => {
                  store.detach(organizedWidget.id);
                  setOrganizing(null);
                }}
              >
                Usar janela flutuante
              </button>
            )}
          </div>
          <button
            className="secondary"
            onClick={() => {
              const slot = store.addSlot();
              store.move(organizedWidget.id, slot);
              setOrganizing(null);
            }}
          >
            Criar um espaço e encaixar
          </button>
          <p>
            Escolha um espaço. Se estiver ocupado, os dois widgets trocam de
            lugar.
          </p>
          <div className="slot-destinations">
            {state.slots.map((slot, i) => (
              <button
                className="secondary"
                disabled={!!slot.offer || slot.widgetId === organizedWidget.id}
                key={slot.id}
                onClick={() => {
                  store.move(organizedWidget.id, slot.id);
                  setOrganizing(null);
                }}
              >
                Espaço {i + 1}
                {slot.widgetId
                  ? ` · ${titleOf(state.widgets.find((w) => w.id === slot.widgetId)!, engine)}`
                  : " · vazio"}
              </button>
            ))}
          </div>
          {currentFloat && (
            <fieldset>
              <legend>Posição da janela</legend>
              <label>
                Horizontal
                <input
                  type="range"
                  min={0}
                  max={1 - currentFloat.rect.width}
                  step=".01"
                  value={currentFloat.rect.x}
                  onChange={(e) =>
                    store.detach(organizedWidget.id, {
                      ...currentFloat.rect,
                      x: +e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Vertical
                <input
                  type="range"
                  min={0}
                  max={1 - currentFloat.rect.height}
                  step=".01"
                  value={currentFloat.rect.y}
                  onChange={(e) =>
                    store.detach(organizedWidget.id, {
                      ...currentFloat.rect,
                      y: +e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Largura
                <input
                  type="range"
                  min=".2"
                  max="1"
                  step=".05"
                  value={currentFloat.rect.width}
                  onChange={(e) =>
                    store.detach(organizedWidget.id, {
                      ...currentFloat.rect,
                      width: +e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Altura
                <input
                  type="range"
                  min=".2"
                  max="1"
                  step=".05"
                  value={currentFloat.rect.height}
                  onChange={(e) =>
                    store.detach(organizedWidget.id, {
                      ...currentFloat.rect,
                      height: +e.target.value,
                    })
                  }
                />
              </label>
            </fieldset>
          )}
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
              ["native", "Do VIO"],
              ["live", "Ao vivo"],
              ["room", "Da sala"],
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
                  .filter((w) => w.id !== "screen")
                  .map((w) => (
                    <button
                      className="catalog-item"
                      key={w.id}
                      onClick={() => addWidget(w.id)}
                    >
                      <w.icon size={20} aria-hidden="true" />
                      <strong>{w.title}</strong>
                      <span>{w.description}</span>
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
                      onClick={() => {
                        const existing = state.widgets.find(
                          (widget) => widget.config.sharedId === w.id,
                        );
                        if (existing) focus(existing.id);
                        else {
                          const id = freshKey();
                          store.add(
                            {
                              id,
                              type: contentKind(w),
                              title: w.title,
                              config: { sharedId: w.id },
                              transient: true,
                            },
                            catalog === "auto"
                              ? store
                                  .getSnapshot()
                                  .slots.find((s) => !s.widgetId && !s.offer)
                                  ?.id || store.addSlot()
                              : catalog,
                          );
                          focusHeader(id);
                        }
                        setCatalog(null);
                      }}
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
                Adicionar não muda a organização de outras pessoas. O criador
                gerencia a estrutura; todos usam o conteúdo.
              </p>
            </>
          )}
          {catalogTab === "community" && (
            <p>
              O catálogo da comunidade ainda não está disponível. Esta versão
              usa somente widgets internos do VIO, sem executar código de
              terceiros.
            </p>
          )}
        </Dialog>
      )}
    </div>
  );
}
