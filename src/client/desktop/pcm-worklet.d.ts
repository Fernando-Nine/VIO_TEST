export class StereoQueue {
  constructor(outputRate?: number);
  frames: number;
  dropped: number;
  underruns: number;
  clear(): void;
  push(pcm: Float32Array): void;
  render(left: Float32Array, right: Float32Array): void;
}
