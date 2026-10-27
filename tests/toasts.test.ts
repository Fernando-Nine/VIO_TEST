import test from "node:test";
import assert from "node:assert/strict";
import { ToastQueue, type Toast } from "../src/client/components/Toasts";

const toast = (id: string, kind: Toast["kind"] = "info"): Toast => ({
  id,
  kind,
  label: id,
  text: id,
  duration: 4000,
});
const ids = (queue: ToastQueue) => ({
  shown: queue.getSnapshot().shown.map((t) => t.id),
  queue: queue.getSnapshot().queue.map((t) => t.id),
});

test("avisos: um por vez, os outros esperam na fila", () => {
  const queue = new ToastQueue();
  queue.push(toast("bia"));
  queue.push(toast("rafa"));
  queue.push(toast("caio"));
  assert.deepEqual(ids(queue), { shown: ["bia"], queue: ["rafa", "caio"] });
  queue.close("bia");
  assert.deepEqual(ids(queue), { shown: ["rafa"], queue: ["caio"] });
});

test("avisos: importante entra por cima, no máximo dois na tela", () => {
  const queue = new ToastQueue();
  queue.push(toast("bia"));
  queue.push(toast("rafa"));
  queue.push(toast("tela", "important"));
  assert.deepEqual(ids(queue), { shown: ["tela", "bia"], queue: ["rafa"] });
  queue.push(toast("erro", "error"));
  assert.deepEqual(ids(queue), {
    shown: ["tela", "bia"],
    queue: ["erro", "rafa"],
  });
  queue.close("bia");
  assert.deepEqual(ids(queue), { shown: ["erro", "tela"], queue: ["rafa"] });
});

test("avisos: mesmo id atualiza no lugar; fechar silencioso não chama onClose", () => {
  const queue = new ToastQueue();
  let closed = 0;
  queue.push({ ...toast("engine", "error"), onClose: () => closed++ });
  queue.push({
    ...toast("engine", "error"),
    text: "outra",
    onClose: () => closed++,
  });
  assert.equal(queue.getSnapshot().shown.length, 1);
  assert.equal(queue.getSnapshot().shown[0].text, "outra");
  queue.close("engine", false);
  assert.equal(closed, 0);
  queue.push({ ...toast("engine", "error"), onClose: () => closed++ });
  queue.close("engine");
  assert.equal(closed, 1);
});
