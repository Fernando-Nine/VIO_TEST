// PROVISIONAL (#344): removed with #352 together with src/client/desktop/ducking.ts.
import test from "node:test";
import assert from "node:assert/strict";
import {
  duckingAsked,
  duckingOff,
  markDuckingAsked,
  setDuckingOff,
} from "../src/client/desktop/ducking";

function windows(initial: number | null) {
  const state = { value: initial, writes: [] as (number | null)[] };
  const invoke = async <T>(command: string, args?: Record<string, unknown>) => {
    if (command === "desktop_ducking") return state.value as T;
    assert.equal(command, "desktop_set_ducking");
    state.value = args?.value as number | null;
    state.writes.push(state.value);
    return undefined as T;
  };
  return { state, invoke };
}

test("preferência de comunicações do Windows: desligar e voltar restaura o valor anterior", async () => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  } as Storage;
  assert.equal(await duckingOff(), undefined, "fora do app não lê nada");
  assert.equal(duckingAsked(), false);
  markDuckingAsked();
  assert.equal(duckingAsked(), true);

  const mute = windows(0);
  assert.equal(await duckingOff(mute.invoke), false);
  await setDuckingOff(true, mute.invoke);
  assert.equal(await duckingOff(mute.invoke), true);
  await setDuckingOff(true, mute.invoke);
  assert.deepEqual(mute.state.writes, [3], "já em 3 não grava de novo");
  await setDuckingOff(false, mute.invoke);
  assert.equal(mute.state.value, 0);

  store.clear();
  const absent = windows(null);
  await setDuckingOff(true, absent.invoke);
  await setDuckingOff(false, absent.invoke);
  assert.deepEqual(absent.state.writes, [3, null], "sem valor volta ao padrão");

  store.set("vio:ducking", '{"asked":1,"previous":9}');
  assert.equal(duckingAsked(), false);
  const odd = windows(3);
  await setDuckingOff(false, odd.invoke);
  assert.equal(odd.state.value, null, "valor salvo inválido vira o padrão");
});
