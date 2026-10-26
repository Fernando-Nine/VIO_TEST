import test from "node:test";
import assert from "node:assert/strict";
import { contrast, luminance } from "../src/shared/colors";
import {
  colorAt,
  harmonyPalette,
  optionColors,
  paletteColors,
  pollColored,
  withPalette,
  palettes,
  sliceInk,
  swatches,
} from "../src/shared/palettes";
import { moduleConfig, moduleResets } from "../src/shared/room-modules";
import { widgetContent } from "../src/shared/widgets";

test("paleta aleatória é harmônica: vizinhas diferem em luminosidade", () => {
  for (let seed = 1; seed < 50; seed++) {
    let x = seed;
    const random = () => (x = (x * 16807) % 2147483647) / 2147483647;
    const colors = harmonyPalette(random);
    assert.equal(colors.length, 5);
    colors.forEach((c, i) => {
      assert.match(c, /^#[\dA-F]{6}$/);
      const next = colors[(i + 1) % colors.length];
      assert.ok(
        Math.abs(luminance(c) - luminance(next)) > 0.03,
        `${c} ${next}`,
      );
    });
  }
});

test("sexta opção não repete a cor da primeira", () => {
  const base = palettes.sunset;
  assert.equal(paletteColors(undefined), palettes.indigo);
  assert.notEqual(colorAt(base, 5), base[0]);
  assert.ok(Math.abs(luminance(colorAt(base, 5)) - luminance(base[0])) > 0.1);
  assert.equal(swatches(base).length, 12);
});

test("texto da fatia escolhe a tinta com melhor contraste", () => {
  for (const color of Object.values(palettes).flat())
    assert.ok(contrast(color, sliceInk(color)) >= 4.5, color);
});

test("cor e paleta são validadas e não reiniciam o sorteio", () => {
  const id = () => crypto.randomUUID();
  const base = moduleConfig.parse({
    kind: "random",
    removeDrawn: true,
    options: [
      { id: id(), label: "A", weight: 1 },
      { id: id(), label: "B", weight: 1 },
    ],
  });
  if (base.kind !== "random") throw new Error();
  const colored = moduleConfig.parse({
    ...base,
    palette: "forest",
    options: base.options.map((o) => ({ ...o, color: "#4CDDC3" })),
  });
  assert.equal(moduleResets(base, colored), false);
  assert.equal(
    moduleResets(base, { ...base, options: base.options.slice().reverse() }),
    true,
  );
  assert.equal(
    moduleConfig.safeParse({
      ...base,
      options: base.options.map((o) => ({ ...o, color: "red" })),
    }).success,
    false,
  );
  assert.equal(
    moduleConfig.safeParse({ ...base, palette: "neon" }).success,
    false,
  );
});

test("votação aceita cor por opção e paleta sem zerar votos", () => {
  const id = () => crypto.randomUUID();
  const base = moduleConfig.parse({
    kind: "poll",
    question: "Filme?",
    duration: 0,
    options: [
      { id: id(), label: "A" },
      { id: id(), label: "B" },
    ],
  });
  if (base.kind !== "poll") throw new Error();
  assert.equal(pollColored(base), false);
  const colored = moduleConfig.parse(withPalette(base, "sunset"));
  if (colored.kind !== "poll") throw new Error();
  assert.equal(pollColored(colored), true);
  assert.deepEqual(optionColors(colored), palettes.sunset.slice(0, 2));
  assert.equal(moduleResets(base, colored), false);
  assert.equal(moduleResets(base, { ...base, question: "Série?" }), true);
});

test("cor de um widget só vale para cronômetro e personalizado", () => {
  const timer = {
    id: crypto.randomUUID(),
    kind: "timer" as const,
    label: "Cronômetro",
    duration: 60,
    elapsed: 0,
    startedAt: null,
  };
  const ok = (content: object) => widgetContent.safeParse(content).success;
  assert.ok(
    ok({ kind: "timer", title: "T", blocks: [timer], color: "#E8615A" }),
  );
  assert.ok(
    !ok({ kind: "timer", title: "T", blocks: [timer], color: "#E8615" }),
  );
  assert.ok(
    !ok({
      kind: "notes",
      title: "N",
      blocks: [
        { id: crypto.randomUUID(), kind: "text", label: "A", value: "" },
      ],
      color: "#E8615A",
    }),
  );
});
