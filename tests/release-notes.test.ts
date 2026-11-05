import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readPendingNotes,
  renderChangelog,
  shortCommit,
} from "../scripts/build-info";
import {
  currentRelease,
  previewSection,
  registeredReleases,
  releases,
  withPendingNotes,
} from "../src/shared/releases";

async function withNotes(files: Record<string, string>) {
  const dir = await mkdtemp(join(tmpdir(), "vio-changes-"));
  for (const [name, text] of Object.entries(files))
    await writeFile(join(dir, name), text);
  return dir;
}

test("notas pendentes: um parágrafo por arquivo, por número da issue, sem o README", async () => {
  const dir = await withNotes({
    "README.md": "# Como escrever\n\nInstruções.",
    "281-avisos.md": "Os avisos não empurram\nmais o layout.\n",
    "35-cursor.md": "O cursor não some mais.",
  });
  try {
    assert.deepEqual(readPendingNotes(dir), [
      "O cursor não some mais.",
      "Os avisos não empurram mais o layout.",
    ]);
    await writeFile(join(dir, "Nota Solta.md"), "Texto.");
    assert.throws(() => readPendingNotes(dir), /<issue>-<slug>\.md/);
    await rm(join(dir, "Nota Solta.md"));
    await writeFile(join(dir, "40-dois.md"), "Um.\n\nDois.");
    assert.throws(() => readPendingNotes(dir), /único parágrafo/);
  } finally {
    await rm(dir, { recursive: true });
  }
  assert.deepEqual(readPendingNotes(join(tmpdir(), "vio-sem-pasta")), []);
});

test("notas pendentes aparecem na versão atual e ficam fora do CHANGELOG", async () => {
  const note = "Nota pendente de teste, ainda sem versão.";
  const shown = withPendingNotes(registeredReleases[0], [note]);
  const section = shown.sections.find((s) => s.title === previewSection);
  assert.equal(section?.items.at(-1), note);
  assert.ok(
    !registeredReleases[0].sections.some((s) => s.items.includes(note)),
  );
  const stable = { ...registeredReleases[0], sections: [] };
  assert.deepEqual(withPendingNotes(stable, [note]).sections, [
    { title: previewSection, items: [note] },
  ]);
  assert.equal(releases[0], currentRelease);
  assert.deepEqual(releases.slice(1), registeredReleases.slice(1));
  const changelog = renderChangelog(registeredReleases, "");
  assert.ok(!changelog.includes(note));
  const committed = await readFile("CHANGELOG.md", "utf8");
  assert.ok(
    committed.startsWith(changelog),
    "CHANGELOG.md sai só do registro, sem as notas de changes/.",
  );
  assert.equal(shortCommit("8BD04E1f00"), "8bd04e1");
  assert.equal(shortCommit("main; rm -rf"), null);
  assert.equal(shortCommit(undefined), null);
});
