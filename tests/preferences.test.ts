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
import {
  nextQuiet,
  presenceCues,
  RESTART_QUIET_MS,
  type RestartQuiet,
} from "../src/client/room/presence-cues";

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

/** Feeds snapshots in order, as `receiveSnapshot` does, and keeps the cues. */
function listener(self = "self") {
  let previous: Snapshot | null = null;
  let quiet: RestartQuiet | undefined;
  return (next: Snapshot, now = 0) => {
    const cues = presenceCues(previous, next, self, quiet, now);
    quiet = nextQuiet(previous, next, self, quiet, now);
    previous = next;
    return cues;
  };
}
const before = snapshot([person("self"), person("ana"), person("bia")]);

test("#292 (a): quem volta depois de um reinício não toca som", () => {
  const hear = listener();
  hear(before);
  assert.deepEqual(hear(snapshot([person("self")], "two")), []);
  assert.deepEqual(hear(snapshot([person("self"), person("ana")], "two")), []);
  assert.deepEqual(
    hear(snapshot([person("self"), person("ana"), person("bia")], "two")),
    [],
  );
  // Everyone is back: the silence is over and a real arrival sounds.
  assert.deepEqual(
    hear(
      snapshot(
        [person("self"), person("ana"), person("bia"), person("caio")],
        "two",
      ),
    ),
    ["room-enter"],
  );
});

test("#292 (b): quem é novo durante a janela do reinício toca som", () => {
  const hear = listener();
  hear(before);
  hear(snapshot([person("self")], "two"));
  assert.deepEqual(
    hear(snapshot([person("self"), person("ana"), person("caio")], "two")),
    ["room-enter"],
  );
  // A real leave of someone online still sounds inside the window.
  assert.deepEqual(hear(snapshot([person("self"), person("ana")], "two")), [
    "room-leave",
  ]);
});

test("#292 (c): depois da janela, quem volta toca som de novo", () => {
  const hear = listener();
  hear(before, 0);
  hear(snapshot([person("self")], "two"), 0);
  assert.deepEqual(
    hear(snapshot([person("self"), person("ana")], "two"), RESTART_QUIET_MS),
    ["room-enter"],
  );
});

test("#292 (d): outra sala não herda o silêncio do reinício", () => {
  const hear = listener();
  hear(before);
  hear(snapshot([person("self")], "two"));
  hear(snapshot([person("self")], "two", "OTHER"));
  assert.deepEqual(
    hear(snapshot([person("self"), person("ana")], "two", "OTHER")),
    ["room-enter"],
  );
});

test("#292: a mesma aba com identidade nova troca de id em silêncio", () => {
  const hear = listener();
  const gone = snapshot([person("self"), person("ana", false)]);
  hear(gone);
  assert.deepEqual(hear(snapshot([person("self"), person("ana-2")])), []);
  // An offline member leaving alone (grace or farewell) still sounds.
  hear(gone);
  assert.deepEqual(hear(snapshot([person("self")])), ["room-leave"]);
});

test("#292: telas de quem volta do reinício não tocam o som de tela nova", () => {
  const screen = (owner: string, id: string): Participant => ({
    ...person(owner),
    publications: [
      { id, owner, kind: "screen", key: id, audio: false, muted: false },
    ],
  });
  const hear = listener();
  hear(snapshot([person("self"), screen("ana", "s1")]));
  hear(snapshot([person("self")], "two"));
  assert.deepEqual(hear(snapshot([person("self"), person("ana")], "two")), []);
  assert.deepEqual(
    hear(snapshot([person("self"), screen("ana", "s1")], "two")),
    [],
  );
  assert.deepEqual(
    hear(
      snapshot(
        [
          person("self"),
          {
            ...screen("ana", "s1"),
            publications: [
              ...screen("ana", "s1").publications,
              ...screen("ana", "s9").publications,
            ],
          },
        ],
        "two",
      ),
    ),
    ["screen-new"],
  );
});

test("som de transmissão nova só para telas de outras pessoas", () => {
  const screen = (owner: string, id: string): Participant => ({
    ...person(owner),
    publications: [
      { id, owner, kind: "screen", key: id, audio: false, muted: false },
    ],
  });
  const a = snapshot([person("self"), person("friend")]);
  assert.deepEqual(
    presenceCues(a, snapshot([person("self"), screen("friend", "s1")]), "self"),
    ["screen-new"],
  );
  assert.deepEqual(
    presenceCues(a, snapshot([screen("self", "s2"), person("friend")]), "self"),
    [],
  );
  const live = snapshot([person("self"), screen("friend", "s1")]);
  assert.deepEqual(presenceCues(live, live, "self"), []);
});

test("#163: tabela de notificações cobre cada som uma vez e balões padrão ligados", async () => {
  const { notificationRows, readBalloons, soundEvents } = await import(
    "../src/client/media/sound-preferences"
  );
  const cues = notificationRows.flatMap((row) => row.cues);
  assert.equal(new Set(cues).size, cues.length);
  assert.deepEqual(
    [...cues].sort(),
    soundEvents.map((event) => event.cue).sort(),
  );
  assert.deepEqual(readBalloons(undefined), { people: true, screens: true });
  assert.deepEqual(readBalloons({ people: false, other: false }), {
    people: false,
    screens: true,
  });
});
