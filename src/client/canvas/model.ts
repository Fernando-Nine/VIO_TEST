import { freshKey } from "../id";

export const presetNames = {
  "grid-1": "Uma tela",
  "grid-2": "Duas lado a lado",
  "grid-3": "Três espaços",
  "grid-4": "Quatro · 2 × 2",
  "grid-5": "Cinco espaços",
  "grid-6": "Seis espaços",
  "focus-left": "Grande à esquerda + 3",
  "focus-right": "Grande à direita + 3",
  "focus-top": "Grande em cima + 3",
  "focus-bottom": "Grande embaixo + 3",
  "strip-left": "Foco à esquerda + tira",
  "strip-right": "Foco à direita + tira",
  "strip-top": "Foco em cima + tira",
  "strip-bottom": "Foco embaixo + tira",
} as const;
export type Preset = keyof typeof presetNames;
export interface WidgetInstance {
  id: string;
  type: string;
  title: string;
  config: Record<string, string>;
  state?: unknown;
  transient?: boolean;
}
export interface Offer {
  id: string;
  title: string;
}
export interface Slot {
  id: string;
  widgetId?: string;
  offer?: Offer;
}
export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Floating {
  widgetId: string;
  rect: Placement;
  previousSlot?: string;
  minimized?: boolean;
  parked?: boolean;
}
export interface CanvasState {
  schemaVersion: 1;
  revision: number;
  preset: Preset;
  ratio: number;
  freeMovement: boolean;
  single: boolean;
  focusId: string | null;
  slots: Slot[];
  widgets: WidgetInstance[];
  floating: Floating[];
  pending: Offer[];
  hidden: string[];
}
export const newSlot = (): Slot => ({ id: freshKey() });
export function newCanvas(): CanvasState {
  const people: WidgetInstance = {
    id: freshKey(),
    type: "people",
    title: "Pessoas na sala",
    config: {},
  };
  return {
    schemaVersion: 1,
    revision: 0,
    preset: "grid-1",
    ratio: 0.7,
    freeMovement: true,
    single: false,
    focusId: null,
    slots: [newSlot()],
    widgets: [people],
    floating: [
      {
        widgetId: people.id,
        rect: { x: 0.7, y: 0.04, width: 0.29, height: 0.45 },
      },
    ],
    pending: [],
    hidden: [],
  };
}
export const isStrip = (state: CanvasState) =>
  state.preset.startsWith("strip-");
/** The large slot is authoritative, including after restoring a saved layout. */
export function focusedWidgetId(state: CanvasState): string | null {
  const primary = state.slots[0]?.widgetId;
  if (
    primary &&
    (!state.preset.startsWith("grid-") || state.preset === "grid-3")
  )
    return primary;
  return (
    (state.widgets.some((w) => w.id === state.focusId)
      ? state.focusId
      : null) ||
    primary ||
    state.slots.find((s) => s.widgetId)?.widgetId ||
    state.widgets[0]?.id ||
    null
  );
}
export const canRemoveSlot = (state: CanvasState, id: string) => {
  const slot = state.slots.find((s) => s.id === id);
  return (
    !!slot &&
    !slot.widgetId &&
    !slot.offer &&
    state.slots.length > (isStrip(state) ? 4 : 1)
  );
};
export function fitted(rect: Placement): Placement {
  const finite = (x: number, fallback: number) =>
    Number.isFinite(x) ? x : fallback;
  const width = Math.max(0.15, Math.min(1, finite(rect.width, 0.34)));
  const height = Math.max(0.15, Math.min(1, finite(rect.height, 0.4)));
  return {
    width,
    height,
    x: Math.max(0, Math.min(1 - width, finite(rect.x, 0))),
    y: Math.max(0, Math.min(1 - height, finite(rect.y, 0))),
  };
}

/** Layout mechanics know only widget identity, geometry and occupancy. */
export class CanvasStore {
  private value: CanvasState;
  private listeners = new Set<() => void>();
  constructor(private persist = false) {
    this.value = newCanvas();
    if (persist)
      try {
        const raw = localStorage.getItem("vio:canvas:v1");
        if (raw && raw.length < 150000)
          this.value = restoreCanvas(JSON.parse(raw));
      } catch {
        /* A corrupt preference cannot prevent entering the room. */
      }
  }
  getSnapshot = () => this.value;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  change(edit: (draft: CanvasState) => void) {
    const next = structuredClone(this.value);
    edit(next);
    next.revision++;
    this.value = next;
    if (this.persist)
      try {
        localStorage.setItem(
          "vio:canvas:v1",
          JSON.stringify(persistentCanvas(next)),
        );
      } catch {
        /* Preferences are optional. */
      }
    this.listeners.forEach((listener) => listener());
  }
  preset(preset: Preset) {
    this.change((s) => {
      s.preset = preset;
      s.single = false;
      let count = preset.startsWith("grid-")
        ? Number(preset.slice(5))
        : isStrip(s)
          ? Math.max(4, s.slots.length)
          : 4;
      // A preset must not silently hide an accepted widget or turn it into an overlay.
      count = Math.max(
        count,
        s.slots.reduce(
          (last, slot, i) => (slot.widgetId || slot.offer ? i + 1 : last),
          0,
        ),
      );
      while (s.slots.length < count) s.slots.push(newSlot());
      if (!isStrip(s)) {
        s.slots = s.slots.slice(0, count);
      } else {
        for (const offer of s.pending.splice(0))
          s.slots.push({ ...newSlot(), offer });
      }
      if (preset.startsWith("grid-"))
        s.preset = `grid-${Math.min(6, count)}` as Preset;
      s.focusId = focusedWidgetId(s);
    });
  }
  addSlot() {
    const slot = newSlot();
    this.change((s) => {
      s.slots.push(slot);
      if (!isStrip(s))
        s.preset = `grid-${Math.min(6, s.slots.length)}` as Preset;
    });
    return slot.id;
  }
  removeSlot(id: string) {
    if (!canRemoveSlot(this.value, id)) return;
    this.change((s) => {
      const slot = s.slots.find((t) => t.id === id);
      if (
        !slot ||
        slot.widgetId ||
        slot.offer ||
        s.slots.length <= (isStrip(s) ? 4 : 1)
      )
        return;
      s.slots = s.slots.filter((t) => t.id !== id);
      if (!isStrip(s))
        s.preset = `grid-${Math.min(6, s.slots.length)}` as Preset;
    });
  }
  add(widget: WidgetInstance, target?: string, floating = false) {
    this.change((s) => {
      if (s.widgets.some((w) => w.id === widget.id)) return;
      if (
        widget.config.sharedId &&
        s.widgets.some((w) => w.config.sharedId === widget.config.sharedId)
      )
        return;
      s.widgets.push(widget);
      const slot =
        !floating &&
        (s.slots.find((t) => t.id === target && !t.widgetId) ||
          s.slots.find((t) => !t.widgetId && !t.offer));
      if (slot) {
        slot.widgetId = widget.id;
        delete slot.offer;
      } else
        s.floating.push({
          widgetId: widget.id,
          rect: fitted({
            x: 0.5,
            y: 0.1 + s.floating.length * 0.04,
            width: 0.4,
            height: 0.45,
          }),
        });
      if (!s.focusId) s.focusId = widget.id;
    });
  }
  updateWidget(id: string, patch: Partial<WidgetInstance>) {
    this.change((s) => {
      const index = s.widgets.findIndex((w) => w.id === id);
      if (index >= 0) s.widgets[index] = { ...s.widgets[index], ...patch, id };
    });
  }
  bindShared(id: string, sharedId: string) {
    // Sharing converts the original host in place. Retries/catalog adds cannot
    // create a second local host for the same room-scoped widget.
    for (const w of this.value.widgets)
      if (w.id !== id && w.config.sharedId === sharedId) this.remove(w.id);
    this.updateWidget(id, {
      config: { sharedId },
      transient: true,
      state: undefined,
    });
  }
  toggleSingle() {
    this.change((s) => {
      s.focusId = focusedWidgetId(s);
      s.single = !!s.focusId && !s.single;
    });
  }
  remove(id: string) {
    this.change((s) => {
      s.widgets = s.widgets.filter((w) => w.id !== id);
      s.hidden = s.hidden.filter((value) => value !== id);
      s.floating = s.floating.filter((w) => w.widgetId !== id);
      s.slots.forEach((t) => {
        if (t.widgetId === id) delete t.widgetId;
      });
      if (s.focusId === id) {
        s.focusId = s.slots.find((t) => t.widgetId)?.widgetId || null;
        if (!s.focusId) s.single = false;
      }
    });
  }
  offer(offer: Offer, reopen = false) {
    if (
      this.value.slots.some((t) => t.offer?.id === offer.id) ||
      this.value.pending.some((o) => o.id === offer.id)
    )
      return;
    this.change((s) => {
      const slot = isStrip(s)
        ? s.slots
            .slice(
              Math.max(
                1,
                s.slots.reduce(
                  (last, slot, index) =>
                    slot.widgetId || slot.offer ? index : last,
                  0,
                ) + 1,
              ),
            )
            .find((t) => !t.widgetId && !t.offer)
        : s.slots.find((t) => !t.widgetId && !t.offer);
      if (slot && !reopen) slot.offer = offer;
      else if (isStrip(s) && !reopen) s.slots.push({ ...newSlot(), offer });
      else s.pending.push(offer);
    });
  }
  decline(id: string) {
    this.change((s) => {
      s.pending = s.pending.filter((o) => o.id !== id);
      s.slots.forEach((t) => {
        if (t.offer?.id === id) delete t.offer;
      });
    });
  }
  accept(
    id: string,
    widget: WidgetInstance,
    destination: "slot" | "float" | "new",
  ) {
    const target = this.value.slots.find((t) => t.offer?.id === id)?.id;
    this.decline(id);
    this.add(
      widget,
      destination === "new" ? this.addSlot() : target,
      destination === "float",
    );
  }
  detach(id: string, rect?: Placement) {
    if (!this.value.widgets.some((w) => w.id === id)) return;
    this.change((s) => {
      const slot = s.slots.find((t) => t.widgetId === id);
      const current = s.floating.find((w) => w.widgetId === id);
      if (current) {
        current.rect = fitted(rect || current.rect);
        current.minimized = false;
        current.parked = false;
        return;
      }
      if (slot) delete slot.widgetId;
      s.floating.push({
        widgetId: id,
        previousSlot: slot?.id,
        rect: fitted(rect || { x: 0.55, y: 0.1, width: 0.4, height: 0.5 }),
      });
      if (s.focusId === id) s.single = false;
    });
  }
  raise(id: string) {
    const index = this.value.floating.findIndex((f) => f.widgetId === id);
    if (index < 0 || index === this.value.floating.length - 1) return;
    this.change((s) => {
      const [window] = s.floating.splice(index, 1);
      s.floating.push(window);
    });
  }
  move(id: string, targetId: string) {
    if (!this.value.widgets.some((w) => w.id === id)) return;
    this.change((s) => {
      const target = s.slots.find((t) => t.id === targetId);
      if (!target || target.widgetId === id) return;
      const source = s.slots.find((t) => t.widgetId === id);
      const floating = s.floating.find((t) => t.widgetId === id);
      const previous = target.widgetId;
      const invitation = target.offer;
      target.widgetId = id;
      delete target.offer;
      if (source) {
        source.widgetId = previous;
        if (invitation) source.offer = invitation;
      } else if (invitation) {
        if (isStrip(s)) s.slots.push({ ...newSlot(), offer: invitation });
        else s.pending.push(invitation);
      }
      if (target === s.slots[0] || source === s.slots[0])
        s.focusId = s.slots[0].widgetId || null;
      s.floating = s.floating.filter((t) => t.widgetId !== id);
      if (previous && !source)
        s.floating.push({
          widgetId: previous,
          rect: floating?.rect || { x: 0.5, y: 0.1, width: 0.4, height: 0.4 },
        });
    });
  }
  reorder(id: string, targetId: string) {
    const sourceIndex = this.value.slots.findIndex((t) => t.widgetId === id);
    const targetIndex = this.value.slots.findIndex((t) => t.id === targetId);
    if (!isStrip(this.value) || sourceIndex <= 0 || targetIndex <= 0) {
      this.move(id, targetId);
      return;
    }
    this.change((s) => {
      const [slot] = s.slots.splice(sourceIndex, 1);
      s.slots.splice(targetIndex, 0, slot);
    });
  }
  focus(id: string) {
    if (!this.value.widgets.some((w) => w.id === id)) return;
    this.move(id, this.value.slots[0].id);
    this.change((s) => {
      s.focusId = id;
      s.hidden = s.hidden.filter((value) => value !== id);
      const f = s.floating.find((x) => x.widgetId === id);
      if (f) f.minimized = false;
    });
  }
  resetRoom() {
    this.change((s) => {
      const next = persistentCanvas(s);
      Object.assign(s, next, { pending: [] });
    });
  }
}

export function persistentCanvas(value: CanvasState): CanvasState {
  const widgets = value.widgets.filter((w) => !w.transient);
  const ids = new Set(widgets.map((w) => w.id));
  return {
    ...value,
    widgets,
    hidden: value.hidden.filter((id) => ids.has(id)),
    single: false,
    focusId: null,
    pending: [],
    slots: value.slots.map((s) => ({
      id: s.id,
      ...(s.widgetId && ids.has(s.widgetId) ? { widgetId: s.widgetId } : {}),
    })),
    floating: value.floating.filter((f) => ids.has(f.widgetId)),
  };
}
export function restoreCanvas(raw: unknown): CanvasState {
  if (!raw || typeof raw !== "object") return newCanvas();
  const s = raw as CanvasState;
  if (
    s.schemaVersion !== 1 ||
    !Object.hasOwn(presetNames, s.preset) ||
    !Array.isArray(s.slots) ||
    !s.slots.length ||
    s.slots.length > 512 ||
    !Array.isArray(s.widgets) ||
    s.widgets.length > 128 ||
    !Array.isArray(s.floating)
  )
    return newCanvas();
  const widgets = s.widgets.filter(
    (w) =>
      w &&
      typeof w.id === "string" &&
      typeof w.type === "string" &&
      typeof w.title === "string" &&
      w.config &&
      typeof w.config === "object" &&
      Object.values(w.config).every((v) => typeof v === "string") &&
      !w.transient,
  );
  if (new Set(widgets.map((w) => w.id)).size !== widgets.length)
    return newCanvas();
  const placed = new Set<string>();
  const ids = new Set(widgets.map((w) => w.id));
  const slots = s.slots.map((t) => {
    const id = typeof t?.id === "string" ? t.id : freshKey();
    if (t?.widgetId && ids.has(t.widgetId) && !placed.has(t.widgetId)) {
      placed.add(t.widgetId);
      return { id, widgetId: t.widgetId };
    }
    return { id };
  });
  if (new Set(slots.map((t) => t.id)).size !== slots.length) return newCanvas();
  const floating: Floating[] = [];
  for (const f of s.floating) {
    if (!f || !ids.has(f.widgetId) || placed.has(f.widgetId) || !f.rect)
      continue;
    placed.add(f.widgetId);
    if (f.parked) slots.push({ id: freshKey(), widgetId: f.widgetId });
    else
      floating.push({
        ...f,
        minimized: false,
        parked: false,
        rect: fitted(f.rect),
      });
  }
  for (const widget of widgets)
    if (!placed.has(widget.id))
      floating.push({
        widgetId: widget.id,
        rect: { x: 0.5, y: 0.1, width: 0.4, height: 0.4 },
      });
  return {
    schemaVersion: 1,
    revision: 0,
    preset: s.preset,
    ratio: Math.max(
      0.4,
      Math.min(0.8, Number.isFinite(s.ratio) ? s.ratio : 0.7),
    ),
    single: false,
    focusId: null,
    freeMovement: true,
    slots,
    widgets,
    hidden: [],
    floating,
    pending: [],
  };
}
