import test from "node:test";
import assert from "node:assert/strict";
import {
  CanvasStore,
  fitted,
  focusedWidgetId,
  canRemoveSlot,
  newCanvas,
  persistentCanvas,
  restoreCanvas,
  type WidgetInstance,
} from "../src/client/canvas/model";
import { floatingBox, overlap } from "../src/client/canvas/geometry";
import { adjacentDropSlot, dropSlotAt } from "../src/client/canvas/drag";

const dropSlots = [
  { id: "large", x: 0, y: 0, width: 700, height: 600 },
  { id: "top", x: 710, y: 0, width: 290, height: 190 },
  { id: "middle", x: 710, y: 200, width: 290, height: 190 },
  { id: "bottom", x: 710, y: 400, width: 290, height: 200 },
];
test("arraste usa posição final do ponteiro e não a área do widget grande", () => {
  const bounds = { x: 0, y: 0, width: 1000, height: 600 };
  assert.equal(dropSlotAt({ x: 850, y: 300 }, dropSlots, bounds)?.id, "middle");
  assert.equal(dropSlotAt({ x: 705, y: 300 }, dropSlots, bounds), undefined);
  assert.equal(
    dropSlotAt(
      { x: 850, y: 650 },
      [
        ...dropSlots,
        { id: "outside-strip", x: 710, y: 610, width: 290, height: 190 },
      ],
      bounds,
    ),
    undefined,
  );
});
test("arraste por teclado avança uma posição visível, incluindo o foco grande", () => {
  assert.equal(
    adjacentDropSlot({ x: 350, y: 300 }, "ArrowRight", dropSlots)?.id,
    "middle",
  );
  assert.equal(
    adjacentDropSlot({ x: 855, y: 295 }, "ArrowUp", dropSlots)?.id,
    "top",
  );
  assert.equal(
    adjacentDropSlot({ x: 855, y: 295 }, "ArrowLeft", dropSlots)?.id,
    "large",
  );
  assert.equal(
    adjacentDropSlot({ x: 855, y: 500 }, "ArrowDown", dropSlots),
    undefined,
  );
});
const widget = (id: string, transient = true): WidgetInstance => ({
  id,
  type: "screen",
  title: id,
  config: { publicationId: id },
  transient,
});
function filled(count: number) {
  const store = new CanvasStore();
  store.change((s) => {
    s.widgets = [];
    s.floating = [];
    s.preset = "grid-1";
    s.slots = s.slots.slice(0, 1);
  });
  for (let i = 1; i < count; i++) store.addSlot();
  for (let i = 0; i < count; i++) store.add(widget(`video-${i}`));
  return store;
}
test("interagir com flutuante o traz à frente sem mover nem recriar widgets", () => {
  const store = filled(3);
  store.detach("video-1");
  store.detach("video-2");
  const before = store.getSnapshot();
  store.raise("video-1");
  const after = store.getSnapshot();
  assert.deepEqual(after.floating, [before.floating[1], before.floating[0]]);
  assert.deepEqual(after.widgets, before.widgets);
  assert.deepEqual(after.slots, before.slots);
  assert.equal(after.focusId, before.focusId);
  assert.equal(after.single, before.single);
  store.raise("video-1");
  store.raise("video-0");
  store.raise("absent");
  assert.equal(store.getSnapshot(), after);
});
test("nova transmissão reserva só espaço vazio; recusar preserva grid e conteúdo", () => {
  const store = filled(1);
  store.addSlot();
  const before = store.getSnapshot();
  store.offer({ id: "incoming", title: "Ana" });
  assert.equal(store.getSnapshot().slots[1].offer?.id, "incoming");
  assert.equal(store.getSnapshot().widgets.length, 1);
  store.decline("incoming");
  assert.deepEqual(store.getSnapshot().slots, before.slots);
  assert.deepEqual(store.getSnapshot().widgets, before.widgets);
});
test("grid cheio não expande sozinho; criar espaço é explícito e permite mais de seis", () => {
  const store = filled(6);
  const before = store.getSnapshot();
  store.offer({ id: "seventh", title: "Bia" });
  assert.deepEqual(store.getSnapshot().slots, before.slots);
  assert.equal(store.getSnapshot().pending[0].id, "seventh");
  store.accept("seventh", widget("seventh"), "new");
  assert.equal(store.getSnapshot().slots.length, 7);
  assert.equal(store.getSnapshot().slots[6].widgetId, "seventh");
  assert.equal(store.getSnapshot().floating.length, 0);
});
test("aceitar flutuante libera convite sem mudar os demais espaços", () => {
  const store = filled(2);
  store.addSlot();
  const original = store.getSnapshot().slots;
  store.offer({ id: "third", title: "Caio" });
  store.accept("third", widget("third"), "float");
  assert.deepEqual(store.getSnapshot().slots, original);
  assert.equal(store.getSnapshot().floating[0].widgetId, "third");
});
test("tela grande participa do grid; focar troca posições e não ativa foco único", () => {
  const store = filled(4);
  store.preset("focus-left");
  const ids = store.getSnapshot().widgets.map((w) => w.id);
  store.focus("video-2");
  assert.equal(store.getSnapshot().slots[0].widgetId, "video-2");
  assert.equal(store.getSnapshot().slots[2].widgetId, "video-0");
  assert.equal(store.getSnapshot().single, false);
  assert.deepEqual(
    store.getSnapshot().widgets.map((w) => w.id),
    ids,
  );
  assert.equal(store.getSnapshot().floating.length, 0);
  store.change((s) => {
    s.single = true;
  });
  store.focus("video-3");
  assert.equal(store.getSnapshot().single, true);
  assert.deepEqual(
    store.getSnapshot().widgets.map((w) => w.id),
    ids,
  );
});
test("tira cresce só no fim, reordena linearmente e devolve o foco à posição de origem", () => {
  const store = filled(4);
  store.preset("strip-right");
  const original = store.getSnapshot().slots;
  store.offer({ id: "new", title: "Davi" });
  assert.deepEqual(store.getSnapshot().slots.slice(0, 4), original);
  assert.equal(store.getSnapshot().pending.length, 0);
  store.reorder("video-1", original[3].id);
  assert.deepEqual(
    store
      .getSnapshot()
      .slots.slice(0, 4)
      .map((s) => s.widgetId),
    ["video-0", "video-2", "video-3", "video-1"],
  );
  store.focus("video-3");
  assert.deepEqual(
    store
      .getSnapshot()
      .slots.slice(0, 4)
      .map((s) => s.widgetId),
    ["video-3", "video-2", "video-0", "video-1"],
  );
  assert.equal(store.getSnapshot().slots[4].offer?.id, "new");
});
test("foco único mantém lugares e identidades e restaura todo o conjunto", () => {
  const store = filled(4);
  const before = store.getSnapshot();
  store.toggleSingle();
  assert.deepEqual(store.getSnapshot().slots, before.slots);
  assert.deepEqual(store.getSnapshot().widgets, before.widgets);
  store.toggleSingle();
  assert.deepEqual(store.getSnapshot().slots, before.slots);
  assert.equal(store.getSnapshot().single, false);
});

test("persistência remove publicações e widgets de outra sala, mantém conteúdo individual", () => {
  const store = filled(2);
  store.add(
    {
      id: "local",
      type: "notes",
      title: "Notas",
      config: {},
      state: { title: "rascunho" },
    },
    undefined,
    true,
  );
  store.add(
    {
      id: "room-only",
      type: "custom",
      title: "Sala",
      config: { sharedId: "shared" },
      transient: true,
    },
    undefined,
    true,
  );
  const restored = restoreCanvas(
    JSON.parse(JSON.stringify(persistentCanvas(store.getSnapshot()))),
  );
  assert.deepEqual(
    restored.widgets.map((w) => w.id),
    ["local"],
  );
  assert.deepEqual(restored.widgets[0].state, { title: "rascunho" });
  assert.ok(restored.slots.every((s) => !s.widgetId && !s.offer));
  assert.equal(restored.floating.length, 1);
});
test("layout corrompido e posições fora da tela não tornam o app inacessível", () => {
  assert.equal(restoreCanvas({ schemaVersion: 9 }).schemaVersion, 1);
  const raw = newCanvas();
  raw.slots.push({ ...raw.slots[0] });
  assert.equal(restoreCanvas(raw).slots.length, 4);
  for (const rect of [
    { x: Infinity, y: NaN, width: -4, height: Infinity },
    { x: 3, y: -1, width: 0.8, height: 0.9 },
  ]) {
    const fit = fitted(rect);
    const box = floatingBox(fit, { x: 0, y: 0, width: 320, height: 180 });
    assert.ok(
      box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= 320 &&
        box.y + box.height <= 180,
    );
  }
  assert.deepEqual(
    overlap(
      { x: 0, y: 100, width: 80, height: 60 },
      { x: 0, y: 0, width: 100, height: 120 },
    ),
    { x: 0, y: 100, width: 80, height: 20 },
  );
});

test("reduzir preset preserva os widgets visíveis, sem esconder nem sobrepor", () => {
  const store = filled(4);
  store.preset("grid-1");
  assert.equal(store.getSnapshot().slots.length, 4);
  assert.equal(store.getSnapshot().floating.length, 0);
  assert.equal(store.getSnapshot().hidden.length, 0);
  store.focus("video-2");
  assert.equal(store.getSnapshot().slots[0].widgetId, "video-2");
});

test("foco único usa o espaço grande depois de mudança de preset e foco antigo", () => {
  const store = filled(4);
  store.change((s) => {
    s.focusId = "video-3";
  });
  store.preset("strip-right");
  assert.equal(focusedWidgetId(store.getSnapshot()), "video-0");
  store.toggleSingle();
  assert.equal(store.getSnapshot().focusId, "video-0");
  assert.equal(store.getSnapshot().single, true);
  store.toggleSingle();
  store.focus("video-2");
  store.toggleSingle();
  assert.equal(store.getSnapshot().focusId, "video-2");
});

test("fechar espaço vazio na tira só fica disponível acima de quatro espaços", () => {
  const store = filled(1);
  store.preset("strip-left");
  const id = store.getSnapshot().slots[3].id;
  assert.equal(canRemoveSlot(store.getSnapshot(), id), false);
  store.removeSlot(id);
  assert.equal(store.getSnapshot().slots.length, 4);
  const extra = store.addSlot();
  assert.equal(canRemoveSlot(store.getSnapshot(), extra), true);
  store.removeSlot(extra);
  assert.equal(store.getSnapshot().slots.length, 4);
});

test("compartilhar converte o host original e catálogo não duplica o sharedId", () => {
  const store = filled(1);
  const originalSlot = store.getSnapshot().slots[0].id;
  store.bindShared("video-0", "room-widget");
  store.add({
    id: "duplicate",
    type: "custom",
    title: "Outro",
    config: { sharedId: "room-widget" },
  });
  store.bindShared("video-0", "room-widget");
  assert.equal(store.getSnapshot().widgets.length, 1);
  assert.equal(store.getSnapshot().slots[0].id, originalSlot);
  assert.equal(store.getSnapshot().slots[0].widgetId, "video-0");
  assert.equal(store.getSnapshot().widgets[0].config.sharedId, "room-widget");
});

test("convite no fim da tira não ocupa buraco anterior nem desloca outros itens", () => {
  const store = filled(4);
  store.preset("strip-left");
  store.remove("video-2");
  store.offer({ id: "new", title: "Nova" });
  assert.equal(store.getSnapshot().slots[2].widgetId, undefined);
  assert.equal(store.getSnapshot().slots[2].offer, undefined);
  assert.equal(store.getSnapshot().slots[4].offer?.id, "new");
});

test("primeira transmissão ocupa o foco vazio; seguintes entram na tira nos quatro sentidos", () => {
  for (const preset of [
    "strip-left",
    "strip-right",
    "strip-top",
    "strip-bottom",
  ] as const) {
    const store = new CanvasStore();
    store.preset(preset);
    store.offer({ id: "first", title: "Primeira" });
    store.offer({ id: "second", title: "Segunda" });
    assert.equal(store.getSnapshot().slots[0].offer?.id, "first");
    assert.equal(store.getSnapshot().slots[1].offer?.id, "second");
    assert.equal(
      store.getSnapshot().widgets.length,
      0,
      "convite não aceita nem assina sozinho",
    );
  }
});

test("primeira transmissão não substitui widget que já ocupa o foco", () => {
  const store = new CanvasStore();
  const focus = store.getSnapshot().slots[0].id;
  store.add(
    { id: "my-timer", type: "timer", title: "Cronômetro", config: {} },
    focus,
  );
  store.offer({ id: "first", title: "Primeira" });
  assert.equal(store.getSnapshot().slots[0].widgetId, "my-timer");
  assert.equal(store.getSnapshot().slots[1].offer?.id, "first");
});

test("fim de transmissão durante arraste não cria widget fantasma e foco preserva convite", () => {
  const store = filled(2);
  const slot = store.getSnapshot().slots[0].id;
  store.remove("video-0");
  store.detach("video-0");
  store.move("video-0", slot);
  store.focus("video-0");
  assert.equal(store.getSnapshot().floating.length, 0);
  assert.equal(store.getSnapshot().slots[0].widgetId, undefined);
  store.offer({ id: "incoming", title: "Nova" });
  store.focus("video-1");
  assert.equal(store.getSnapshot().slots[0].widgetId, "video-1");
  assert.equal(store.getSnapshot().slots[1].offer?.id, "incoming");
  assert.equal(store.getSnapshot().widgets.length, 1);
});
