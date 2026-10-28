import test from "node:test";
import assert from "node:assert/strict";
import {
  CanvasStore,
  gridPlacement,
  persistentCanvas,
  restoreCanvas,
  type WidgetInstance,
} from "../src/client/canvas/model";

const widget = (id: string): WidgetInstance => ({
  id,
  type: "chat",
  title: id,
  config: {},
});
function grid(rows: number, columns: number, widgets: string[] = []) {
  const store = new CanvasStore();
  store.preset(`grid-${rows}x${columns}` as "grid-2x2");
  widgets.forEach((id, i) =>
    store.add(widget(id), store.getSnapshot().slots[i].id),
  );
  return store;
}
const cells = (store: CanvasStore) => {
  const s = store.getSnapshot();
  const [rows, columns] = s.preset.slice(5).split("x").map(Number);
  const placement = gridPlacement(s.slots, rows, columns);
  assert.ok(placement, "spans tile the grid");
  return s.slots.map((slot) => ({
    ...placement.get(slot.id)!,
    w: slot.widgetId,
  }));
};

test("juntar na grade cobre células inteiras e leva o coberto ao próximo espaço livre", () => {
  const store = grid(2, 3, ["a", "b"]);
  const ids = store.getSnapshot().slots.map((s) => s.id);
  store.resizeSlot(ids[0], 2, 2);
  const s = store.getSnapshot();
  assert.equal(s.slots.length, 3);
  assert.deepEqual(cells(store), [
    { row: 0, column: 0, rows: 2, columns: 2, w: "a" },
    { row: 0, column: 2, rows: 1, columns: 1, w: "b" },
    { row: 1, column: 2, rows: 1, columns: 1, w: undefined },
  ]);
  assert.equal(s.slots[0].mergedIds?.length, 3);
  // Separar devolve as células, sem perder ids.
  store.resizeSlot(ids[0], 1, 1);
  const back = store.getSnapshot().slots;
  assert.equal(back.length, 6);
  assert.deepEqual(new Set(back.map((t) => t.id)).size, 6);
  assert.equal(back[0].widgetId, "a");
});

test("sem espaço livre, o coberto vai para não exibidos", () => {
  const store = grid(1, 2, ["a", "b"]);
  store.resizeSlot(store.getSnapshot().slots[0].id, 1, 2);
  const s = store.getSnapshot();
  assert.equal(s.slots.length, 1);
  assert.deepEqual(s.hidden, ["b"]);
});

test("espaço vazio juntado recebe o widget coberto", () => {
  const store = grid(2, 2, []);
  const ids = store.getSnapshot().slots.map((s) => s.id);
  store.add(widget("x"), ids[3]);
  store.resizeSlot(ids[0], 2, 2);
  assert.equal(store.getSnapshot().slots[0].widgetId, "x");
});

test("juntar no meio mantém a ordem das células e a grade restaurada", () => {
  const store = grid(3, 3, ["a", "b", "c", "d"]);
  const ids = store.getSnapshot().slots.map((s) => s.id);
  store.resizeSlot(ids[4], 2, 2);
  assert.deepEqual(
    cells(store).map(({ row, column, rows, columns }) => [
      row,
      column,
      rows,
      columns,
    ]),
    [
      [0, 0, 1, 1],
      [0, 1, 1, 1],
      [0, 2, 1, 1],
      [1, 0, 1, 1],
      [1, 1, 2, 2],
      [2, 0, 1, 1],
    ],
  );
  const restored = restoreCanvas(
    JSON.parse(JSON.stringify(persistentCanvas(store.getSnapshot()))),
  );
  assert.deepEqual(restored.slots[4].span, { rows: 2, columns: 2 });
  // Mudar o tamanho da grade separa os espaços.
  store.preset("grid-2x2");
  assert.ok(store.getSnapshot().slots.every((t) => !t.span));
});
