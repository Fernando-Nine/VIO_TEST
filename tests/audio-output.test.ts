import test from "node:test";
import assert from "node:assert/strict";
import { AudioOutput } from "../src/client/media/audio-output";

function target() {
  return {
    sinkId: "",
    calls: [] as string[],
    async setSinkId(id: string) {
      this.calls.push(id);
      this.sinkId = id;
    },
  };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("saída padrão não é reaberta a cada vídeo, voz ou som de botão", async () => {
  const output = new AudioOutput(() => assert.fail("Unexpected fallback"));
  const audio = target();
  const unregister = output.register(audio);
  await output.ready();
  await output.select("default");
  assert.deepEqual(audio.calls, []);
  await output.select("fone");
  unregister();
  output.register(audio);
  await output.ready();
  assert.deepEqual(audio.calls, ["fone"]);
});

test("vídeo removido durante troca não derruba a saída da conversa", async () => {
  const started = deferred(),
    finish = deferred();
  const output = new AudioOutput(() =>
    assert.fail("Stale failure changed audio"),
  );
  const voice = target();
  output.register(voice);
  await output.select("fone");
  const unregister = output.register({
    async setSinkId() {
      started.resolve();
      await finish.promise;
      throw new DOMException("Detached element", "AbortError");
    },
  });
  await started.promise;
  unregister();
  finish.resolve();
  await output.ready();
  assert.equal(output.deviceId, "fone");
  assert.equal(voice.sinkId, "fone");
});

test("desconexão de dispositivo restaura áudio uma vez e elementos futuros usam o padrão", async () => {
  const warnings: boolean[] = [];
  const output = new AudioOutput((_error, recovered) =>
    warnings.push(recovered),
  );
  const voice = target(),
    screen = target();
  output.register(voice);
  output.register(screen);
  await output.select("fone");
  await output.reconcileDevices([{ kind: "audiooutput", deviceId: "caixa" }]);
  await output.reconcileDevices([]);
  const later = target();
  output.register(later);
  await output.ready();
  assert.deepEqual(warnings, [true]);
  assert.deepEqual(
    [output.deviceId, voice.sinkId, screen.sinkId, later.sinkId],
    ["", "", "", ""],
  );
  assert.deepEqual(later.calls, []);
});

test("dispositivo salvo invisível não é aplicado; confirmação fica nos ajustes", async () => {
  const output = new AudioOutput(() =>
    assert.fail("Restore should not interrupt the room"),
  );
  const voice = target();
  output.register(voice);
  await output.restore("id-antigo", async () => [
    { kind: "audiooutput", deviceId: "default" },
  ]);
  assert.equal(output.deviceId, "");
  assert.equal(output.pendingDeviceId, "id-antigo");
  assert.match(output.restoreMessage, /confirmada/);
  assert.deepEqual(voice.calls, []);
  await output.select("fone-atual");
  assert.equal(output.restoreMessage, "");
  assert.equal(output.pendingDeviceId, "");
});

test("restauração atrasada nunca substitui uma escolha feita pelo usuário", async () => {
  const devices = deferred();
  const output = new AudioOutput(() => assert.fail("Unexpected fallback"));
  const voice = target();
  output.register(voice);
  const restoring = output.restore("antigo", async () => {
    await devices.promise;
    return [{ kind: "audiooutput", deviceId: "antigo" }];
  });
  await output.select("novo");
  devices.resolve();
  await restoring;
  assert.equal(output.deviceId, "novo");
  assert.equal(voice.sinkId, "novo");
});

test("falha real no destino de um novo vídeo restaura todos os elementos", async () => {
  const warnings: boolean[] = [];
  const output = new AudioOutput((_error, recovered) =>
    warnings.push(recovered),
  );
  const voice = target();
  output.register(voice);
  await output.select("fone");
  output.register({
    async setSinkId(id) {
      if (id) throw new DOMException("Permission revoked", "NotAllowedError");
    },
  });
  await output.ready();
  assert.deepEqual(warnings, [true]);
  assert.equal(voice.sinkId, "");
  assert.equal(output.deviceId, "");
});

test("falha ao voltar ao padrão não informa recuperação inexistente", async () => {
  const warnings: boolean[] = [];
  const output = new AudioOutput((_error, recovered) =>
    warnings.push(recovered),
  );
  output.register({
    async setSinkId(id) {
      if (!id)
        throw new DOMException("Audio backend unavailable", "AbortError");
    },
  });
  await output.select("fone");
  await output.reconcileDevices([]);
  assert.deepEqual(warnings, [false]);
});
