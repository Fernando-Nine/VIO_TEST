import test from "node:test";
import assert from "node:assert/strict";
import { rectangularUnion } from "../src/client/canvas/slot-spans";
import { colorInk, contrast, colorPresets } from "../src/shared/colors";
import { RoomWidgets } from "../src/server/widgets";

test("mesclas retangulares não têm limite de três no modelo bidimensional", () => {
  assert.deepEqual(
    rectangularUnion([
      { row: 0, column: 0, rows: 2, columns: 2 },
      { row: 0, column: 2, rows: 1, columns: 1 },
      { row: 1, column: 2, rows: 1, columns: 1 },
    ]),
    { row: 0, column: 0, rows: 2, columns: 3 },
  );
  assert.equal(
    rectangularUnion([
      { row: 0, column: 0, rows: 2, columns: 2 },
      { row: 0, column: 2, rows: 1, columns: 1 },
    ]),
    null,
  );
  assert.equal(
    rectangularUnion([
      { row: 0, column: 0, rows: 2, columns: 2 },
      { row: 0, column: 1, rows: 2, columns: 1 },
    ]),
    null,
  );
});
test("chat mantém as últimas 100 mensagens e cores têm contraste AA", () => {
  const widgets = new RoomWidgets();
  widgets.create("owner", "chat", { kind: "chat", title: "Chat", blocks: [] });
  for (let i = 0; i < 105; i++)
    widgets.message("chat", {
      id: String(i),
      authorId: "a",
      authorName: "Ana",
      color: "#2727F5",
      text: String(i),
      sentAt: 100000 + i * 1000,
    });
  assert.equal(widgets.list()[0].messages!.length, 100);
  assert.equal(widgets.list()[0].messages![0].text, "5");
  for (const background of [
    "#14151f",
    "#151722",
    "#22263b",
    "#10121c",
    "#242838",
  ])
    assert.ok(contrast("#f1f2fa", background) >= 4.5);
  for (const { color } of colorPresets)
    assert.ok(contrast(colorInk(color), color) >= 4.5);
  widgets.clear();
  assert.equal(widgets.list().length, 0);
});
