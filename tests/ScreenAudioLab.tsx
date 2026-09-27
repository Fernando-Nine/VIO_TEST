import { useRef, useState } from "react";
import { ScreenAudio } from "../src/client/components/ScreenAudio";
import { Controller } from "../src/client/room/controller";
import { addRemoteTrack } from "../src/client/media/remote-stream";

type Scene = {
  stream: MediaStream;
  engine: Controller;
  volume: number;
  muted: boolean;
};
const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(condition: () => unknown, label: string) {
  for (let i = 0; i < 80; i++) {
    if (condition()) return;
    await pause(50);
  }
  throw new Error(label);
}
function assert(ok: unknown, label: string) {
  if (!ok) throw new Error(label);
}

/** Actual ScreenAudio component and browser media pipeline. Synthetic input, no device permission. */
export function ScreenAudioLab() {
  const host = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<Scene>();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  async function run() {
    setRunning(true);
    setResults([]);
    const engine = new Controller(undefined, false);
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const amplitude = context.createGain();
    amplitude.gain.value = 0.04;
    const destination = context.createMediaStreamDestination();
    oscillator.connect(amplitude).connect(destination);
    oscillator.start();
    const stream = new MediaStream();
    let graphCalls = 0;
    let failBoost = false;
    let graph: ReturnType<typeof engine.playback.create>;
    const create = engine.playback.create.bind(engine.playback);
    engine.playback.create = (input) => {
      graphCalls++;
      if (failBoost) throw new Error("Deliberate amplifier failure");
      graph = create(input);
      return graph;
    };
    const native = () =>
      host.current?.querySelector<HTMLAudioElement>(
        '[data-screen-audio="native"]',
      );
    const boosted = () =>
      host.current?.querySelector<HTMLAudioElement>(
        '[data-screen-audio="boost"]',
      );
    const show = (volume: number, muted = false) =>
      setScene({ stream, engine, volume, muted });
    const report = (message: string) =>
      setResults((old) => [...old, `PASS · ${message}`]);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    const drain = context.createGain();
    drain.gain.value = 0;
    analyser.connect(drain).connect(context.destination);
    async function rms(input: MediaStream) {
      const source = context.createMediaStreamSource(input);
      source.connect(analyser);
      const samples = new Float32Array(2048);
      await pause(250);
      let total = 0;
      for (let i = 0; i < 6; i++) {
        analyser.getFloatTimeDomainData(samples);
        total += Math.sqrt(
          samples.reduce((sum, value) => sum + value * value, 0) /
            samples.length,
        );
        await pause(30);
      }
      source.disconnect();
      return total / 6;
    }
    try {
      await context.resume();
      show(0.8);
      await until(() => native(), "Player não foi montado");
      assert(
        graphCalls === 0,
        "Reprodução normal criou processamento obrigatório",
      );
      const element = native()!;
      const track = destination.stream.getAudioTracks()[0];
      addRemoteTrack(stream, track);
      await until(
        () =>
          !element.paused && element.readyState >= 2 && element.currentTime > 0,
        "Trilha tardia não começou a tocar",
      );
      assert(
        !element.muted &&
          element.volume === 0.8 &&
          element.srcObject === stream,
        "Reprodução direta não está audível",
      );
      report(
        "80%: faixa tardia toca no stream original, sem criar amplificador",
      );
      const baseline = await rms(stream);
      assert(baseline > 0.01, "Fonte sintética sem sinal");
      show(0);
      await until(() => element.volume === 0, "Volume zero não silenciou");
      show(0.8, true);
      await until(() => element.muted, "Mute não aplicado");
      show(0.8);
      await until(
        () => !element.muted && !element.paused && element.volume === 0.8,
        "Desmute não retomou",
      );
      assert(graphCalls === 0, "Ajuste normal criou grafo de áudio");
      report("Volume zero, mute e desmute funcionam na reprodução direta");

      engine.playback.unlock();
      show(3);
      await until(
        () =>
          graph &&
          boosted() &&
          !boosted()!.muted &&
          !boosted()!.paused &&
          element.muted,
        "Amplificação não ficou ativa",
      );
      assert(
        element.srcObject === stream && !element.paused,
        "Amplificação desconectou o renderer nativo",
      );
      const ratio = (await rms(graph!.stream)) / baseline;
      assert(
        Math.abs(ratio - 3) < 0.2,
        "Ganho de 300% não corresponde ao sinal",
      );
      show(3, true);
      await until(
        () => element.muted && boosted()?.muted,
        "Mute não silenciou ambos os caminhos",
      );
      show(3);
      await until(
        () => !boosted()?.muted && element.muted,
        "Desmute amplificado não retomou",
      );
      report(
        `300%: sinal ${ratio.toFixed(2)}×, sem saída duplicada; renderer original continua tocando`,
      );

      await graph!.context.suspend();
      await until(
        () => !element.muted && element.volume === 1 && boosted()?.muted,
        "Contexto suspenso silenciou toda a reprodução",
      );
      assert(
        !element.paused && element.srcObject === stream,
        "Fallback perdeu o áudio original",
      );
      await graph!.context.resume();
      await until(
        () => element.muted && !boosted()?.muted,
        "Amplificação não voltou após retomada",
      );
      report(
        "Suspender o processamento restaura áudio nativo a 100%; retomar devolve o ganho",
      );

      show(0.8);
      await until(
        () => !boosted() && !element.muted && element.volume === 0.8,
        "Retorno ao volume normal falhou",
      );
      assert(
        element === native() && element.srcObject === stream && !element.paused,
        "Troca de modo recriou ou pausou o player",
      );
      failBoost = true;
      show(3);
      await until(
        () => host.current?.textContent?.includes("Ativar amplificação"),
        "Falha não foi informada",
      );
      assert(
        !element.muted && !element.paused && element.volume === 1,
        "Falha de criação do ganho cortou o som",
      );
      report(
        "Falha do amplificador mantém áudio original a 100% e oferece nova tentativa",
      );
      setScene(undefined);
      await until(() => !native(), "Player não desmontou");
      assert(
        track.readyState === "live",
        "Desmontagem parou a captura original",
      );
      report(
        "Desmontagem preserva a captura; nenhum hardware pessoal foi solicitado",
      );
    } catch (error) {
      const element = native();
      setResults((old) => [
        ...old,
        `FAIL · ${error instanceof Error ? error.message : String(error)}`,
        JSON.stringify({
          paused: element?.paused,
          readyState: element?.readyState,
          time: element?.currentTime,
          muted: element?.muted,
          track: stream
            .getAudioTracks()
            .map((t) => ({
              state: t.readyState,
              muted: t.muted,
              enabled: t.enabled,
            })),
          error: element?.error?.message,
          message: host.current?.textContent,
        }),
      ]);
    } finally {
      setScene(undefined);
      await pause(50);
      await engine.destroy();
      oscillator.stop();
      stream.getTracks().forEach((track) => track.stop());
      destination.stream.getTracks().forEach((track) => track.stop());
      await context.close();
      setRunning(false);
    }
  }
  return (
    <section aria-label="Regressão do áudio da transmissão">
      <h2>Áudio da transmissão · 2.4.1</h2>
      <p>
        Componente real com sinal sintético. Não comprova transporte WebRTC
        entre aparelhos.
      </p>
      <button
        className="secondary"
        disabled={running}
        onClick={() => void run()}
      >
        {running
          ? "Verificando reprodução…"
          : "Verificar reprodução e recuperação"}
      </button>
      <div ref={host} style={{ position: "relative", minHeight: 80 }}>
        {scene && <ScreenAudio {...scene} name="Bancada" />}
      </div>
      <pre aria-label="Resultado do áudio da transmissão">
        {results.join("\n")}
      </pre>
    </section>
  );
}
