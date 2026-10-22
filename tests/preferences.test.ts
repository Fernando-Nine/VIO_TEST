import test from "node:test";
import assert from "node:assert/strict";
import {
  colorInk,
  colorPresets,
  contrast,
  defaultColor,
  hexToHsv,
  hsvToHex,
  normalizeColor,
  readableAccent,
} from "../src/shared/colors";
import {
  schemas,
  type Participant,
  type Snapshot,
} from "../src/shared/protocol";
import {
  readSoundEvents,
  soundEvents,
  volumePreference,
} from "../src/client/media/sound-preferences";
import { presenceCues } from "../src/client/room/presence-cues";

test("cores personalizadas preservam HEX, bloqueiam conteúdo livre e mantêm contraste AA", () => {
  assert.equal(normalizeColor(" f0c "), "#FF00CC");
  assert.equal(normalizeColor("#2727f5"), defaultColor);
  for (const invalid of [
    "red",
    "url(https://x)",
    "#12345678",
    "#ggffff",
    "#fff;display:none",
  ])
    assert.equal(normalizeColor(invalid), undefined);
  assert.equal(
    schemas.color.safeParse({ color: "#ffffff", owner: "other" }).success,
    false,
  );
  assert.equal(schemas.color.safeParse({ color: "url(x)" }).success, false);
  assert.equal(
    schemas.join.safeParse({ name: "Teste", color: "<img>" }).success,
    false,
  );
  const colors = colorPresets.map((preset) => preset.color as string);
  for (let r = 0; r <= 255; r += 17)
    for (let g = 0; g <= 255; g += 17)
      for (let b = 0; b <= 255; b += 17)
        colors.push(
          "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join(""),
        );
  for (const color of colors) {
    assert.ok(contrast(color, colorInk(color)) >= 4.5, `Avatar ${color}`);
    assert.ok(
      contrast(readableAccent(color), "#242838") >= 4.5,
      `Destaque ${color}`,
    );
    const { h, s, v } = hexToHsv(color);
    assert.equal(hsvToHex(h, s, v), color.toUpperCase());
  }
});

test("preferências de som migram valores antigos e limitam volumes inválidos", () => {
  assert.ok(Object.values(readSoundEvents(undefined)).every(Boolean));
  const events = readSoundEvents({
    "room-enter": false,
    mute: false,
    unknown: true,
  });
  assert.equal(events["room-enter"], false);
  assert.equal(events.mute, false);
  assert.equal(events["share-on"], true);
  assert.equal(Object.keys(events).length, soundEvents.length);
  assert.equal(volumePreference(0, 1), 0);
  assert.equal(volumePreference(8, 1), 1);
  assert.equal(volumePreference(-5, 1), 0);
  assert.equal(volumePreference(NaN, 0.7), 0.7);
  assert.equal(volumePreference("0", 0.7), 0.7);
});

const person = (id: string, online = true): Participant => ({
  id,
  online,
  name: id,
  color: defaultColor,
  inCall: false,
  publications: [],
});
const snapshot = (
  participants: Participant[],
  epoch = "one",
  code = "ROOM",
): Snapshot => ({
  participants,
  epoch,
  code,
  createdAt: 1,
  serverTime: 2,
  maxParticipants: null,
  recommendedParticipants: 6,
});
test("sons de presença ignoram duplicatas, quedas, reconexões e troca de instância", () => {
  const a = snapshot([person("self"), person("friend")]);
  assert.deepEqual(presenceCues(null, a, "self"), []);
  assert.deepEqual(presenceCues(a, a, "self"), []);
  const offline = snapshot([person("self"), person("friend", false)]);
  assert.deepEqual(presenceCues(a, offline, "self"), []);
  assert.deepEqual(presenceCues(offline, a, "self"), []);
  assert.deepEqual(presenceCues(a, snapshot([person("self")]), "self"), [
    "room-leave",
  ]);
  assert.deepEqual(
    presenceCues(
      a,
      snapshot([...a.participants, person("new"), person("another")]),
      "self",
    ),
    ["room-enter"],
  );
  assert.deepEqual(
    presenceCues(a, snapshot([person("self")], "restart"), "self"),
    [],
  );
  assert.deepEqual(
    presenceCues(a, snapshot([person("self")], "one", "OTHER"), "self"),
    [],
  );
  assert.deepEqual(presenceCues(a, snapshot([person("friend")]), "self"), []);
});
