import test from "node:test";
import assert from "node:assert/strict";
import {
  operateWidget,
  timerDisplay,
  timerElapsed,
  timerFinished,
  timerRinging,
  widgetContent,
  contentKind,
  type SharedWidget,
} from "../src/shared/widgets";

test("cronômetro repete pelo relógio compartilhado sem eventos ou timers de fundo", () => {
  const block = {
    id: crypto.randomUUID(),
    kind: "timer" as const,
    label: "Intervalo",
    duration: 60,
    elapsed: 0,
    startedAt: 1000,
    mode: "down" as const,
    loop: true,
  };
  assert.equal(timerDisplay(block, 31000), 30);
  assert.equal(timerDisplay(block, 61000), 60);
  assert.equal(timerDisplay(block, 136000), 45);
  assert.equal(timerDisplay({ ...block, mode: "up" }, 136000), 15);
  const widget: SharedWidget = {
    id: crypto.randomUUID(),
    owner: "owner",
    kind: "timer",
    title: "Cronômetro",
    blocks: [block],
    revision: 0,
    createdAt: 0,
  };
  const paused = operateWidget(
    widget,
    { kind: "timer", blockId: block.id, action: "pause", revision: 0 },
    136000,
  );
  const p = paused.blocks[0];
  assert.equal(p.kind, "timer");
  if (p.kind === "timer") {
    assert.equal(timerElapsed(p, 200000), 15);
    assert.equal(p.startedAt, null);
  }
  const done = { ...block, loop: false };
  assert.equal(timerDisplay(done, 90000), 0);
  assert.equal(timerFinished(done, 90000), true);
  const restart = operateWidget(
    { ...widget, blocks: [done] },
    { kind: "timer", blockId: block.id, action: "start", revision: 0 },
    90000,
  );
  assert.equal(
    restart.blocks[0].kind === "timer" &&
      timerDisplay(restart.blocks[0], 91000),
    59,
  );
});

test("alarme do fim é estado do widget: desligar vale para todos e reiniciar rearma", () => {
  const block = {
    id: crypto.randomUUID(),
    kind: "timer" as const,
    label: "Pausa",
    duration: 60,
    elapsed: 0,
    startedAt: 1000,
    mode: "down" as const,
    loop: false,
  };
  const widget: SharedWidget = {
    id: crypto.randomUUID(),
    owner: "owner",
    kind: "timer",
    title: "Cronômetro",
    blocks: [block],
    revision: 3,
    createdAt: 0,
  };
  assert.equal(timerRinging(block, 60000), false);
  assert.equal(timerRinging(block, 61000), true);
  assert.equal(timerRinging(block, 120999), true);
  assert.equal(timerRinging(block, 121000), false);
  assert.equal(timerRinging({ ...block, loop: true }, 61000), false);
  // A stale revision still silences: two people pressing at once is fine.
  const silenced = operateWidget(
    widget,
    { kind: "timer", blockId: block.id, action: "silence", revision: 1 },
    70000,
  );
  const s = silenced.blocks[0];
  assert.ok(s.kind === "timer" && s.silenced && !timerRinging(s, 70000));
  const again = operateWidget(
    silenced,
    { kind: "timer", blockId: block.id, action: "start", revision: 4 },
    80000,
  );
  const a = again.blocks[0];
  assert.ok(a.kind === "timer" && !a.silenced && timerRinging(a, 140000));
});

test("widgets dedicados recusam tipos misturados e loop sem duração", () => {
  const score = {
    id: crypto.randomUUID(),
    kind: "score",
    label: "Pontos",
    value: 0,
  };
  assert.equal(
    widgetContent.safeParse({ kind: "notes", title: "Notas", blocks: [score] })
      .success,
    false,
  );
  assert.equal(
    widgetContent.safeParse({
      kind: "custom",
      title: "Placar",
      blocks: [score],
    }).success,
    true,
  );
  assert.equal(
    widgetContent.safeParse({
      kind: "timer",
      title: "Relógio",
      blocks: [
        {
          id: crypto.randomUUID(),
          kind: "timer",
          label: "Tempo",
          duration: 0,
          elapsed: 0,
          startedAt: null,
          mode: "up",
          loop: true,
        },
      ],
    }).success,
    false,
  );
  assert.equal(
    contentKind({
      title: "Nome alterado",
      blocks: [
        {
          id: crypto.randomUUID(),
          kind: "text",
          label: "Texto",
          value: "preservado",
        },
      ],
    }),
    "notes",
  );
});
