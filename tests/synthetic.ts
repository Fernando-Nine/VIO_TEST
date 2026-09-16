import type { CaptureAdapter } from "../src/client/media/capture";
export function syntheticAdapter(name: string, color: string) {
  const cleanups = new Set<() => void>();
  function audio() {
    const context = new AudioContext();
    void context.resume();
    const oscillator = context.createOscillator();
    oscillator.frequency.value = 220;
    const gain = context.createGain();
    gain.gain.value = 0.07;
    const output = context.createMediaStreamDestination();
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start();
    const cleanup = () => {
      oscillator.stop();
      void context.close();
      cleanups.delete(cleanup);
    };
    cleanups.add(cleanup);
    return output.stream;
  }
  function video(label: string, w = 1280, h = 720) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    let step = 0;
    const draw = () => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${w / 24}px sans-serif`;
      ctx.fillText(`${name} · ${label}`, w * 0.07, h * 0.3);
      ctx.font = `${w / 45}px monospace`;
      ctx.fillText("MÍDIA SINTÉTICA · TESTE WEBRTC", w * 0.07, h * 0.42);
      ctx.fillText(new Date().toISOString(), w * 0.07, h * 0.55);
      ctx.fillStyle = "#ffffff30";
      ctx.fillRect((step++ * 7) % w, h * 0.7, w * 0.12, h * 0.08);
    };
    draw();
    const timer = setInterval(draw, 33);
    const stream = canvas.captureStream(30);
    const cleanup = () => {
      clearInterval(timer);
      cleanups.delete(cleanup);
    };
    cleanups.add(cleanup);
    stream
      .getVideoTracks()[0]
      .addEventListener("ended", cleanup, { once: true });
    return stream;
  }
  const adapter: CaptureAdapter = {
    async screen(withAudio) {
      const stream = video("TELA");
      if (withAudio)
        audio()
          .getAudioTracks()
          .forEach((t) => stream.addTrack(t));
      return stream;
    },
    async device(constraints) {
      return constraints.video ? video("CÂMERA", 640, 360) : audio();
    },
  };
  return {
    adapter,
    dispose() {
      for (const fn of [...cleanups]) fn();
    },
  };
}
