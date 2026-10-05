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
import {
  ArrowDown,
  ArrowUp,
  Columns3,
  LayoutGrid,
  Maximize,
  MonitorUp,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Dialog } from "../components/Dialog";
import { ScreenAudio } from "../components/ScreenAudio";
import type { Controller } from "../room/controller";
import { freshKey } from "../id";
import {
  fitted,
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
        "Use espaço para começar a mover, setas para escolher uma posição e espaço para soltar. Escape cancela. O menu Organizar também permite mover sem arrastar.",
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
}

function CanvasSlot({
  slot,
  index,
  register,
  add,
  accept,
  decline,
  remove,
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
            <button
              className="icon-button remove-slot"
              aria-label={`Remover espaço vazio ${index + 1}`}
              onClick={remove}
            >
              <X size={14} />
            </button>
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
  const [announcement, announce] = useState("");
  const [roving, setRoving] = useState<string | null>(null);
  const [newInStrip, setNewInStrip] = useState(0);
  const pendingFocus = useRef<string | null>(null);
  const seen = useRef(new Set<string>());
  const stripMode = isStrip(state);
  useStripInput(root, strip, stripMode && !state.single);
  const offer = state.pending[0];
  const ordered = [
    ...state.slots.flatMap((s) =>
      s.widgetId && !state.hidden.includes(s.widgetId) ? [s.widgetId] : [],
    ),
    ...state.floating.filter((f) => !f.minimized).map((f) => f.widgetId),
  ];
  const minimizedIds = [
    ...state.hidden,
    ...state.floating.filter((f) => f.minimized).map((f) => f.widgetId),
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

  function focus(id: string) {
    const widget = store.getSnapshot().widgets.find((w) => w.id === id);
    store.focus(id);
    if (widget?.type === "screen")
      engine.watch(widget.config.publicationId, false, true);
    setRoving(id);
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
          const float = current.floating.find((f) => f.widgetId === widget.id);
          if (float?.minimized) store.minimize(widget.id);
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
  function remove(widget: WidgetInstance) {
    if (widget.type === "screen")
      engine.stopWatching(widget.config.publicationId);
    store.remove(widget.id);
    announce(`${titleOf(widget, engine)} removido do seu layout.`);
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
  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
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
  }, [geometry, roving, root]);
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
    disabled: state.freeMovement || state.single,
    hidden: !!slot.widgetId && state.hidden.includes(slot.widgetId),
    restore: () => slot.widgetId && store.minimize(slot.widgetId),
  });
  const organizedWidget = state.widgets.find((w) => w.id === organizing);
  const currentFloat = state.floating.find((f) => f.widgetId === organizing);
  const visibleSlots =
    geometry.bounds.width < 380 ? 1 : geometry.bounds.width < 680 ? 2 : 3;

  return (
    <div className="room-canvas">
      <div className="canvas-toolbar">
        <button className="text-button" onClick={() => setLayoutOpen(true)}>
          <LayoutGrid size={16} />
          <span>Layout</span>
        </button>
        <button
          className="text-button"
          onClick={() => {
            setCatalog("auto");
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
          onClick={() =>
            store.change((s) => {
              s.single = !s.single;
              s.focusId ||=
                s.slots.find((t) => t.widgetId)?.widgetId ||
                s.widgets[0]?.id ||
                null;
            })
          }
        >
          <Columns3 size={16} />
          <span>{state.single ? "Voltar ao conjunto" : "Foco único"}</span>
        </button>
        {stripMode && (
          <div className="strip-controls">
            <button
              className="icon-button"
              onClick={() => scrollStep(-1)}
              aria-label="Voltar um item da tira"
            >
              <ArrowUp size={15} />
            </button>
            <button
              className="icon-button"
              onClick={() => scrollStep(1)}
              aria-label="Avançar um item da tira"
            >
              <ArrowDown size={15} />
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
        <button
          className="icon-button canvas-fullscreen"
          onClick={props.fullscreen}
          aria-label="Tela cheia da sala"
        >
          <Maximize size={16} />
        </button>
      </div>
      <DragDropProvider
        plugins={plugins}
        onDragStart={(event) => {
          const id = String(event.operation.source?.id || "");
          setDrag({ id, x: 0, y: 0 });
          props.interaction(true);
        }}
        onDragMove={(event) =>
          setDrag(
            (current) =>
              current && { ...current, ...event.operation.transform },
          )
        }
        onDragEnd={(event) => {
          const id = String(event.operation.source?.id || ""),
            target = event.operation.target?.id;
          if (!event.canceled && id) {
            if (target && !state.freeMovement) {
              store.reorder(id, String(target));
              announce("Widget encaixado na posição escolhida.");
            } else {
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
                      (box.x + event.operation.transform.x) /
                      geometry.bounds.width,
                    y:
                      (box.y + event.operation.transform.y) /
                      geometry.bounds.height,
                    width: Math.min(0.8, box.width / geometry.bounds.width),
                    height: Math.min(0.8, box.height / geometry.bounds.height),
                  }),
                );
            }
          }
          setDrag(null);
          props.interaction(false);
        }}
      >
        <div
          className={`canvas-viewport ${drag ? "canvas-dragging" : ""}`}
          ref={root}
        >
          <div
            className={`canvas-layout ${state.preset} ${state.single ? "single-focus" : ""}`}
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
          {state.widgets.map((widget) => {
            const slot = state.slots.find((s) => s.widgetId === widget.id),
              floating = state.floating.find((f) => f.widgetId === widget.id);
            const focused = state.single
              ? state.focusId === widget.id
              : !state.preset.startsWith("grid-") || state.preset === "grid-3"
                ? state.slots[0].widgetId === widget.id
                : state.focusId === widget.id;
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
            const visible =
              !state.hidden.includes(widget.id) &&
              !floating?.minimized &&
              (state.single
                ? focused
                : !!floating ||
                  !!(slot && geometry.slots.get(slot.id)?.visible));
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
                options={() => setOrganizing(widget.id)}
                close={() => remove(widget)}
                minimize={() => store.minimize(widget.id)}
              />
            );
          })}
        </div>
      </DragDropProvider>
      {minimizedIds.length > 0 && (
        <div className="minimized-widgets" aria-label="Widgets escondidos">
          {minimizedIds.map((id) => {
            const w = state.widgets.find((w) => w.id === id);
            return (
              w && (
                <button
                  key={id}
                  onClick={() => {
                    if (
                      state.floating.some((f) => f.widgetId === id && f.parked)
                    )
                      setOrganizing(id);
                    else {
                      store.minimize(id);
                      store.change((s) => {
                        s.single = false;
                      });
                    }
                  }}
                >
                  {titleOf(w, engine)} <Plus size={14} />
                </button>
              )
            );
          })}
        </div>
      )}
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
          <p className="field-note">
            As escolhas mudam apenas seu layout. Ao reduzir os espaços, os
            widgets excedentes ficam escondidos, com áudio ativo. Escolha onde
            restaurar pelo botão com o nome deles. No celular, o conjunto de
            quatro espaços usa uma grade 2 × 2; a tira mostra um ou dois itens
            por vez.
          </p>
          <label>
            Disposição
            <select
              value={state.preset}
              onChange={(e) => store.preset(e.target.value as Preset)}
            >
              {Object.entries(presetNames).map(([id, label]) => (
                <option value={id} key={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {!state.preset.startsWith("grid-") && (
            <label>
              Tamanho do foco <output>{Math.round(state.ratio * 100)}%</output>
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
          <button className="secondary" onClick={() => store.addSlot()}>
            <Plus size={16} /> Adicionar espaço vazio
          </button>
          <label className="toggle">
            <span>
              Movimento livre
              <small>
                Desativa o encaixe ao arrastar. O menu de cada widget ainda
                permite escolher uma posição.
              </small>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={state.freeMovement}
              onChange={(e) =>
                store.change((s) => {
                  s.freeMovement = e.target.checked;
                })
              }
            />
          </label>
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
              store.minimize(organizedWidget.id);
              setOrganizing(null);
            }}
          >
            Esconder este widget
          </button>
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
              <div className="widget-catalog">
                {Object.values(widgetRegistry)
                  .filter((w) => w.id !== "screen")
                  .map((w) => (
                    <button
                      className="catalog-item"
                      key={w.id}
                      onClick={() => addWidget(w.id)}
                    >
                      <SlidersHorizontal size={19} />
                      <strong>{w.title}</strong>
                      <span>{w.description}</span>
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
                        else
                          store.add(
                            {
                              id: freshKey(),
                              type: "custom",
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
