// This module is loaded directly by AudioWorklet; it has no runtime dependencies.
export class StereoQueue {
  constructor(outputRate = 48000) {
    this.data = new Float32Array(9600 * 2);
    this.head = 0;
    this.frames = 0;
    this.phase = 0;
    this.ratio = 48000 / outputRate;
    this.buffering = true;
    this.dropped = 0;
    this.underruns = 0;
  }
  clear() {
    this.head = this.frames = this.phase = 0;
    this.buffering = true;
  }
  push(pcm) {
    if (!(pcm instanceof Float32Array) || pcm.length % 2 || pcm.length > 9600)
      return;
    const incoming = pcm.length / 2;
    // Catch up after a paused WebView rather than playing stale audio.
    if (this.frames + incoming > 4800) {
      this.dropped += this.frames;
      this.clear();
    }
    for (let i = 0; i < incoming; i++) {
      const offset = ((this.head + this.frames + i) % 9600) * 2;
      for (let ch = 0; ch < 2; ch++) {
        const value = pcm[i * 2 + ch];
        this.data[offset + ch] = Number.isFinite(value)
          ? Math.max(-1, Math.min(1, value))
          : 0;
      }
    }
    this.frames += incoming;
  }
  render(left, right) {
    left.fill(0);
    right.fill(0);
    if (this.buffering && this.frames < 960) return;
    this.buffering = false;
    for (let i = 0; i < left.length; i++) {
      if (this.frames < 2) {
        this.underruns++;
        this.clear();
        break;
      }
      const current = this.head * 2;
      const next = ((this.head + 1) % 9600) * 2;
      left[i] =
        this.data[current] +
        (this.data[next] - this.data[current]) * this.phase;
      right[i] =
        this.data[current + 1] +
        (this.data[next + 1] - this.data[current + 1]) * this.phase;
      this.phase += this.ratio;
      const consume = Math.floor(this.phase);
      this.phase -= consume;
      this.head = (this.head + consume) % 9600;
      this.frames = Math.max(0, this.frames - consume);
    }
  }
}
if (typeof registerProcessor === "function") {
  class VioProcessAudio extends AudioWorkletProcessor {
    constructor() {
      super();
      this.queue = new StereoQueue(sampleRate);
      this.stopped = false;
      this.port.onmessage = ({ data }) => {
        if (data === "stop") {
          this.stopped = true;
          this.queue.clear();
          this.port.close();
        } else if (data === "reset") this.queue.clear();
        else this.queue.push(data);
      };
    }
    process(_inputs, outputs) {
      const output = outputs[0];
      if (output?.length >= 2) this.queue.render(output[0], output[1]);
      return !this.stopped;
    }
  }
  registerProcessor("vio-process-audio", VioProcessAudio);
}
