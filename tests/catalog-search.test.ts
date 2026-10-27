import test from "node:test";
import assert from "node:assert/strict";
import { searchWidgets } from "../src/client/canvas/catalog-search";

const items = [
  { title: "Cronômetro", description: "Contagem livre ou regressiva." },
  { title: "Votação", description: "Pergunta, opções e prazo." },
  { title: "Dados", description: "Comandos, resultados e histórico." },
];

test("busca de widget ignora acentos e procura também na descrição", () => {
  assert.deepEqual(
    searchWidgets("cronometro", items).map((w) => w.title),
    ["Cronômetro"],
  );
  assert.deepEqual(
    searchWidgets("OPCOES prazo", items).map((w) => w.title),
    ["Votação"],
  );
  assert.equal(searchWidgets("  ", items).length, 3);
  assert.equal(searchWidgets("xadrez", items).length, 0);
});
