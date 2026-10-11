import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { RoomNotes } from "../src/server/notes";
import { noteCopyInput, widgetContent } from "../src/shared/widgets";

test("cópias de notas são imutáveis, deduplicadas e identificadas pelo servidor", () => {
  const notes = new RoomNotes();
  const input = { id: randomUUID(), label: "Roteiro", value: "Começo" };
  const sent = notes.send("owner", "Ana", input);
  input.value = "Edição posterior";
  assert.equal(sent.value, "Começo");
  assert.equal(sent.senderName, "Ana");
  assert.ok(sent.sentAt > 0);
  assert.equal(notes.send("owner", "Ana", { ...input, value: "Começo" }), sent);
  assert.throws(() =>
    notes.send("other", "Bia", { ...input, value: "Começo" }),
  );
  assert.throws(() => notes.send("owner", "Ana", input));
  assert.equal(notes.list().length, 1);
  notes.clear();
  assert.equal(notes.list().length, 0);
});
test("notas limitam tamanho, autoria declarada, quantidade de cópias e seis caixas", () => {
  const input = { id: randomUUID(), label: "Nota", value: "x" };
  assert.equal(
    noteCopyInput.safeParse({ ...input, senderId: "fake" }).success,
    false,
  );
  assert.equal(
    noteCopyInput.safeParse({ ...input, value: "x".repeat(2001) }).success,
    false,
  );
  const notes = new RoomNotes();
  for (let i = 0; i < 12; i++)
    notes.send("a", "Ana", { ...input, id: randomUUID() });
  assert.throws(() => notes.send("a", "Ana", input));
  for (let person = 1; person < 5; person++)
    for (let i = 0; i < 12; i++)
      notes.send(String(person), "Pessoa", { ...input, id: randomUUID() });
  assert.throws(() => notes.send("sixth", "Pessoa", input));
  const blocks = Array.from({ length: 6 }, () => ({
    id: randomUUID(),
    kind: "text",
    label: "Caixa",
    value: "",
  }));
  assert.equal(
    widgetContent.safeParse({ kind: "notes", title: "Notas", blocks }).success,
    true,
  );
  assert.equal(
    widgetContent.safeParse({
      kind: "notes",
      title: "Notas",
      blocks: [...blocks, { ...blocks[0], id: randomUUID() }],
    }).success,
    false,
  );
});
