import { rectangularUnion } from "./slot-spans";
import { freshKey } from "../id";

type GridRows = 1 | 2 | 3;
type GridColumns = 1 | 2 | 3 | 4;
export type GridPreset = `grid-${GridRows}x${GridColumns}`;
export type StripPreset = `strip-${"left" | "right" | "top" | "bottom"}`;
export type Preset = GridPreset | StripPreset;
export const MAX_GRID = { rows: 3, columns: 4 } as const;
export const gridPreset = (rows: number, columns: number) =>
  `grid-${rows}x${columns}` as GridPreset;
/** Rows and columns of a grid preset; null for the strip. */
export function gridSize(preset: string) {
  const match = /^grid-([1-3])x([1-4])$/.exec(preset);
  return match ? { rows: +match[1], columns: +match[2] } : null;
}
/** Smallest grid that holds `count` cells, preferring square-ish shapes. */
export function autoGrid(count: number): GridPreset {
  const n = Math.max(1, Math.min(MAX_GRID.rows * MAX_GRID.columns, count));
  let best: { rows: number; columns: number } = { ...MAX_GRID };
  for (let rows = 1; rows <= MAX_GRID.rows; rows++)
    for (let columns = 1; columns <= MAX_GRID.columns; columns++) {
      const area = rows * columns,
        bestArea = best.rows * best.columns;
      if (area < n) continue;
      if (
        area < bestArea ||
        (area === bestArea &&
          Math.abs(columns - rows) < Math.abs(best.columns - best.rows))
      )
        best = { rows, columns };
    }
  return gridPreset(best.rows, best.columns);
}
const legacyPresets: Record<string, Preset> = {
  "grid-1": "grid-1x1",
  "grid-2": "grid-1x2",
  "grid-3": "grid-2x2",
  "grid-4": "grid-2x2",
  "grid-5": "grid-2x3",
  "grid-6": "grid-2x3",
  "focus-left": "strip-left",
  "focus-right": "strip-right",
  "focus-top": "strip-top",
  "focus-bottom": "strip-bottom",
};
export function readPreset(value: unknown): Preset | null {
  if (typeof value !== "string") return null;
  if (gridSize(value)) return value as GridPreset;
  if (/^strip-(left|right|top|bottom)$/.test(value)) return value as Preset;
  return legacyPresets[value] || null;
}
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
  span?: { rows: number; columns: number };
  mergedIds?: string[];
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
  schemaVersion: 2;
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
  return {
    schemaVersion: 2,
    revision: 0,
    preset: "strip-left",
    ratio: 0.7,
    freeMovement: true,
    single: false,
    focusId: null,
    slots: Array.from({ length: 4 }, newSlot),
    widgets: [],
    floating: [],
    pending: [],
    hidden: [],
  };
}
export const slotUnits = (slot: Slot) =>
  (slot.span?.rows || 1) * (slot.span?.columns || 1);
export const isStrip = (state: CanvasState) =>
  state.preset.startsWith("strip-");
/** The large slot is authoritative, including after restoring a saved layout. */
export function focusedWidgetId(state: CanvasState): string | null {
  const primary = state.slots[0]?.widgetId;
  if (primary && (isStrip(state) || state.slots.length === 1)) return primary;
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
    // Grid cells come from the chosen size; only the strip has removable ones.
    isStrip(state) &&
    state.slots.reduce((n, s) => n + slotUnits(s), 0) - slotUnits(slot) >= 4
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
        const raw =
          localStorage.getItem("vio:canvas:v2") ||
          localStorage.getItem("vio:canvas:v1");
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
          "vio:canvas:v2",
          JSON.stringify(persistentCanvas(next)),
        );
      } catch {
        /* Preferences are optional. */
      }
    this.listeners.forEach((listener) => listener());
  }
  preset(preset: Preset) {
    this.change((s) => {
      // Leaving the strip restores its component cells without discarding content.
      if (!preset.startsWith("strip-"))
        s.slots = s.slots.flatMap((slot) => [
          { ...slot, span: undefined, mergedIds: undefined },
          ...Array.from({ length: slotUnits(slot) - 1 }, (_, i) => ({
            id: slot.mergedIds?.[i] || freshKey(),
          })),
        ]);
      s.preset = preset;
      s.single = false;
      const grid = gridSize(preset);
      if (grid) {
        const count = grid.rows * grid.columns;
        while (s.slots.length < count) s.slots.push(newSlot());
        const kept = s.slots.slice(0, count);
        // A smaller grid packs content into the cells it keeps; what still
        // does not fit goes to "not shown" instead of closing.
        for (const extra of s.slots.slice(count)) {
          if (!extra.widgetId && !extra.offer) continue;
          const free = kept.find((t) => !t.widgetId && !t.offer);
          if (free) Object.assign(free, pick(extra));
          else {
            if (extra.widgetId) s.hidden.push(extra.widgetId);
            if (extra.offer) s.pending.push(extra.offer);
          }
        }
        s.slots = kept;
        // A larger grid brings those widgets back.
        for (const slot of s.slots)
          if (!slot.widgetId && !slot.offer && s.hidden.length)
            slot.widgetId = s.hidden.shift();
      } else {
        let count = Math.max(
          4,
          s.slots.reduce((n, slot) => n + slotUnits(slot), 0),
        );
        // A preset must not silently hide an accepted widget or turn it into an overlay.
        count = Math.max(
          count,
          s.slots.reduce(
            (last, slot, i) => (slot.widgetId || slot.offer ? i + 1 : last),
            0,
          ),
        );
        while (s.slots.reduce((n, slot) => n + slotUnits(slot), 0) < count)
          s.slots.push(newSlot());
        // The strip grows without limit, so nothing needs to stay hidden.
        for (const widgetId of s.hidden.splice(0))
          s.slots.push({ ...newSlot(), widgetId });
        for (const offer of s.pending.splice(0))
          s.slots.push({ ...newSlot(), offer });
      }
      s.focusId = focusedWidgetId(s);
    });
  }
  mergeSlots(firstId: string, secondId: string) {
    this.change((s) => {
      if (!isStrip(s)) return;
      const index = s.slots.findIndex((slot) => slot.id === firstId);
      const first = s.slots[index],
        second = s.slots[index + 1];
      if (
        index < 1 ||
        !second ||
        second.id !== secondId ||
        first.widgetId ||
        first.offer ||
        second.widgetId ||
        second.offer
      )
        return;
      const a = slotUnits(first),
        b = slotUnits(second);
      const rectangle = rectangularUnion([
        { row: 0, column: 0, rows: a, columns: 1 },
        { row: a, column: 0, rows: b, columns: 1 },
      ]);
      if (!rectangle || a + b > 3) return;
      first.span = { rows: rectangle.rows, columns: rectangle.columns };
      first.mergedIds = [
        ...(first.mergedIds || []),
        second.id,
        ...(second.mergedIds || []),
      ];
      s.slots.splice(index + 1, 1);
    });
  }
  splitSlot(id: string) {
    this.change((s) => {
      const index = s.slots.findIndex((slot) => slot.id === id),
        slot = s.slots[index];
      if (!slot || slot.widgetId || slot.offer || slotUnits(slot) === 1) return;
      s.slots.splice(
        index,
        1,
        { id: slot.id },
        ...Array.from({ length: slotUnits(slot) - 1 }, (_, i) => ({
          id: slot.mergedIds?.[i] || freshKey(),
        })),
      );
    });
  }
  addSlot() {
    const slot = newSlot();
    this.change((s) => {
      if (isStrip(s)) {
        s.slots.push(slot);
        return;
      }
      if (s.slots.length >= MAX_GRID.rows * MAX_GRID.columns) return;
      s.slots.push(slot);
      s.preset = autoGrid(s.slots.length);
      const size = gridSize(s.preset)!;
      while (s.slots.length < size.rows * size.columns) s.slots.push(newSlot());
    });
    return slot.id;
  }
  removeSlot(id: string) {
    if (!canRemoveSlot(this.value, id)) return;
    this.change((s) => {
      const slot = s.slots.find((t) => t.id === id);
      if (!slot || slot.widgetId || slot.offer || s.slots.length <= 4) return;
      s.slots = s.slots.filter((t) => t.id !== id);
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
      const focus = s.slots[0];
      const firstScreen =
        !s.widgets.some((widget) => widget.type === "screen") &&
        !s.slots.some((slot) => slot.offer) &&
        !s.pending.length;
      const slot = isStrip(s)
        ? firstScreen && focus && !focus.widgetId && !focus.offer
          ? focus
          : s.slots
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
      s.hidden = s.hidden.filter((value) => value !== id);
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
      const wasHidden = s.hidden.includes(id);
      s.hidden = s.hidden.filter((value) => value !== id);
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
      // Swapping with a put-away widget puts the displaced one away too.
      if (previous && !source && wasHidden) s.hidden.push(previous);
      else if (previous && !source)
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
  /** Brings back a widget the layout put away: first free cell, else a window. */
  show(id: string) {
    if (!this.value.hidden.includes(id)) return;
    this.change((s) => {
      s.hidden = s.hidden.filter((value) => value !== id);
      const free = s.slots.find((t) => !t.widgetId && !t.offer);
      if (free) free.widgetId = id;
      else
        s.floating.push({
          widgetId: id,
          rect: fitted({ x: 0.5, y: 0.1, width: 0.4, height: 0.45 }),
        });
    });
  }
  /** Puts a widget in a chosen cell; whatever was there goes to "not shown". */
  replace(widget: WidgetInstance, slotId: string) {
    if (!this.value.widgets.some((w) => w.id === widget.id))
      this.change((s) => {
        s.widgets.push(widget);
        s.hidden.push(widget.id);
      });
    this.move(widget.id, slotId);
  }
  resetRoom() {
    this.change((s) => {
      const next = persistentCanvas(s);
      Object.assign(s, next, { pending: [] });
    });
  }
}

const pick = (slot: Slot): Partial<Slot> =>
  slot.widgetId ? { widgetId: slot.widgetId } : { offer: slot.offer };

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
      ...(s.span ? { span: s.span, mergedIds: s.mergedIds } : {}),
      ...(s.widgetId && ids.has(s.widgetId) ? { widgetId: s.widgetId } : {}),
    })),
    floating: value.floating.filter((f) => ids.has(f.widgetId)),
  };
}
export function restoreCanvas(raw: unknown): CanvasState {
  if (!raw || typeof raw !== "object") return newCanvas();
  const s = raw as CanvasState;
  const preset = readPreset(s.preset);
  if (
    ![1, 2].includes(s.schemaVersion) ||
    !preset ||
    !Array.isArray(s.slots) ||
    !s.slots.length ||
    s.slots.length > 512 ||
    !Array.isArray(s.widgets) ||
    s.widgets.length > 128 ||
    !Array.isArray(s.floating)
  )
    return newCanvas();
  // Widgets that became one: the first one found keeps its spot as the new
  // type, the others close. #159: People in the room, in the call and the
  // volume mixer are Pessoas; #160: Meus espectadores, Conexão and Minha tela
  // are Minha transmissão.
  const mergers = [
    { from: ["people", "call", "mixer"], type: "people", title: "Pessoas" },
    {
      from: ["stream", "viewers", "connection", "quick"],
      type: "stream",
      title: "Minha transmissão",
    },
  ].map((m) => ({ ...m, done: false }));
  const widgets = s.widgets
    .flatMap((w) => {
      const merger = w && mergers.find((m) => m.from.includes(w.type));
      if (!merger) return [w];
      if (merger.done) return [];
      merger.done = true;
      return [{ ...w, type: merger.type, title: merger.title }];
    })
    .filter(
      (w) =>
        w &&
        typeof w.id === "string" &&
        typeof w.type === "string" &&
        // Retired widgets: their slots come back empty.
        !["notes", "time"].includes(w.type) &&
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
  const slots: Slot[] = s.slots.map((t) => {
    const id = typeof t?.id === "string" ? t.id : freshKey();
    const units =
      t?.span &&
      Number.isSafeInteger(t.span.rows) &&
      Number.isSafeInteger(t.span.columns) &&
      t.span.rows > 0 &&
      t.span.columns > 0
        ? t.span.rows * t.span.columns
        : 1;
    const span =
      preset.startsWith("strip-") && t !== s.slots[0] && units > 1 && units <= 3
        ? {
            span: { rows: units, columns: 1 },
            mergedIds: Array.from({ length: units - 1 }, (_, i) => {
              const id = t.mergedIds?.[i];
              return typeof id === "string" &&
                !s.slots.some((slot) => slot.id === id) &&
                t.mergedIds?.indexOf(id) === i
                ? id
                : freshKey();
            }),
          }
        : {};
    if (t?.widgetId && ids.has(t.widgetId) && !placed.has(t.widgetId)) {
      placed.add(t.widgetId);
      return { id, ...span, widgetId: t.widgetId };
    }
    return { id, ...span };
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
  const hidden = new Set(
    Array.isArray(s.hidden)
      ? s.hidden.filter((id) => ids.has(id) && !placed.has(id))
      : [],
  );
  const grid = gridSize(preset);
  if (grid) {
    for (const extra of slots.splice(grid.rows * grid.columns))
      if (extra.widgetId) hidden.add(extra.widgetId);
    while (slots.length < grid.rows * grid.columns)
      slots.push({ id: freshKey() });
  }
  for (const widget of widgets)
    if (!placed.has(widget.id) && !hidden.has(widget.id))
      floating.push({
        widgetId: widget.id,
        rect: { x: 0.5, y: 0.1, width: 0.4, height: 0.4 },
      });
  return {
    schemaVersion: 2,
    revision: 0,
    preset,
    ratio: Math.max(
      0.4,
      Math.min(0.8, Number.isFinite(s.ratio) ? s.ratio : 0.7),
    ),
    single: false,
    focusId: null,
    freeMovement: true,
    slots,
    widgets,
    hidden: [...hidden],
    floating,
    pending: [],
  };
}
