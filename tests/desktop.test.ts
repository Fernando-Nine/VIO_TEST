import test from "node:test";
import assert from "node:assert/strict";
import { StereoQueue } from "../src/client/desktop/pcm-worklet.js";
import { decodePacket } from "../src/client/desktop/bridge";

function tone(frames: number, rate = 48000) {
  const data = new Float32Array(frames * 2);
  for (let i = 0; i < frames; i++) {
    data[i * 2] = Math.sin((2 * Math.PI * 440 * i) / rate) * 0.7;
    data[i * 2 + 1] = -data[i * 2];
  }
  return data;
}
test("fila do AudioWorklet preserva estéreo e reamostra 48 kHz para 44,1 kHz", () => {
  const queue = new StereoQueue(44100);
  queue.push(tone(4800));
  const left = new Float32Array(4096),
    right = new Float32Array(4096);
  queue.render(left, right);
  let crossings = 0;
  for (let i = 1; i < left.length; i++) {
    assert.ok(Math.abs(left[i] + right[i]) < 0.00001);
    if (left[i - 1] <= 0 && left[i] > 0) crossings++;
  }
  assert.ok(Math.abs((crossings * 44100) / left.length - 440) < 12);
  assert.ok(queue.frames > 300 && queue.frames < 400);
});
test("áudio atrasado é descartado e falta de dados produz silêncio, sem memória crescente", () => {
  const queue = new StereoQueue();
  for (let i = 0; i < 1000; i++) queue.push(tone(480));
  assert.ok(queue.frames <= 4800);
  assert.ok(queue.dropped > 470000);
  const left = new Float32Array(5000),
    right = new Float32Array(5000);
  queue.render(left, right);
  assert.equal(left[4999], 0);
  assert.equal(right[4999], 0);
  assert.ok(queue.underruns > 0);
  queue.clear();
  queue.push(new Float32Array(9600).fill(NaN));
  queue.render(left, right);
  assert.ok(left.every((value) => value === 0));
});
test("ponte WASAPI recusa pacote truncado, formato desconhecido e tamanho excessivo", () => {
  const buffer = new ArrayBuffer(48),
    view = new DataView(buffer);
  [0x56494f41, 1, 1, 7, 0, 2, 48000, 0].forEach((n, i) =>
    view.setUint32(i * 4, n, true),
  );
  view.setFloat32(32, 0.5, true);
  view.setFloat32(36, -0.5, true);
  const packet = decodePacket(buffer);
  assert.equal(packet.sequence, 7);
  assert.deepEqual([...packet.pcm], [0.5, -0.5, 0, 0]);
  assert.throws(() => decodePacket(buffer.slice(0, 40)));
  assert.throws(() => decodePacket(new ArrayBuffer(38440)));
  view.setUint32(4, 2, true);
  assert.throws(() => decodePacket(buffer));
});
