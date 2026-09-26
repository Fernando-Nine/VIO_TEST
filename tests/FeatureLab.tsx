import { useState } from "react";
import { Captures } from "../src/client/media/capture";
import { observeVoiceActivity } from "../src/client/media/voice-activity";
import { ScreenPlayback } from "../src/client/media/screen-playback";

const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
function assert(ok: unknown, label: string): asserts ok {
  if (!ok) throw new Error(label);
}
async function until(condition: () => boolean, label: string) {
  for (let i = 0; i < 60; i++) {
    if (condition()) return;
    await pause(50);
  }
  throw new Error(label);
}

/** Real Web Audio, generated tone only. Never requests a physical input. */
export function FeatureLab() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  async function run() {
    setRunning(true);
    setResults([]);
    const context = new AudioContext();
    const playback = new ScreenPlayback();
    const oscillator = context.createOscillator();
    oscillator.frequency.value = 440;
    const amplitude = context.createGain();
    amplitude.gain.value = 0.07;
    const destination = context.createMediaStreamDestination();
    oscillator.connect(amplitude);
    amplitude.connect(destination);
    oscillator.start();
    const emptyStream = new MediaStream();
    const captures = new Captures({
      device: async () => destination.stream.clone(),
      screen: async () => {
        throw new Error("Este teste não captura tela");
      },
    });
    let stopObserving = () => {};
    const report = (text: string) =>
      setResults((old) => [...old, `PASS · ${text}`]);
    try {
      await context.resume();
      let speaking = false;
      stopObserving = observeVoiceActivity(emptyStream, (value) => {
        speaking = value;
      });
      await pause(160);
      assert(!speaking, "Stream vazio não deve acender");
      const track = destination.stream.getAudioTracks()[0];
      emptyStream.addTrack(track);
      emptyStream.dispatchEvent(new Event("addtrack"));
      await until(() => speaking, "Não detectou trilha de áudio tardia");
      report("Indicador acende com a trilha que chega após o cartão");
      amplitude.gain.value = 0;
      await until(() => !speaking, "Não apagou após silêncio");
      amplitude.gain.value = 0.07;
      await until(() => speaking, "Não retomou após silêncio");
      emptyStream.removeTrack(track);
      emptyStream.dispatchEvent(new Event("removetrack"));
      await until(() => !speaking, "Não apagou após remoção da trilha");
      const replacement = track.clone();
      emptyStream.addTrack(replacement);
      emptyStream.dispatchEvent(new Event("addtrack"));
      await until(() => speaking, "Não detectou substituição da trilha");
      stopObserving();
      stopObserving = () => {};
      assert(
        replacement.readyState === "live",
        "Detector parou a trilha de reprodução",
      );
      replacement.stop();
      report("Silêncio, remoção e substituição funcionam no mesmo MediaStream");

      await captures.setVoiceSettings({
        ...captures.voiceSettings,
        autoGainControl: false,
      });
      await captures.startVoice();
      const source = context.createMediaStreamSource(
        captures.sources.get("voice")!.stream,
      );
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      const silent = context.createGain();
      silent.gain.value = 0;
      source.connect(analyser);
      analyser.connect(silent);
      silent.connect(context.destination);
      const values = new Float32Array(2048);
      async function rms() {
        await pause(260);
        let sum = 0;
        for (let i = 0; i < 8; i++) {
          analyser.getFloatTimeDomainData(values);
          sum += Math.sqrt(
            values.reduce((total, v) => total + v * v, 0) / values.length,
          );
          await pause(25);
        }
        return sum / 8;
      }
      const threshold = captures.threshold;
      const baseline = await rms();
      assert(baseline > 0.02, "Nenhum sinal na saída do microfone sintético");
      captures.setManualGain(3);
      const high = (await rms()) / baseline;
      captures.setManualGain(0.2);
      const low = (await rms()) / baseline;
      assert(
        Math.abs(high - 3) < 0.25 && Math.abs(low - 0.2) < 0.03,
        "Ganho real diferente do solicitado",
      );
      assert(captures.threshold === threshold, "Ganho alterou a sensibilidade");
      report(
        `Volume real: 300% = ${high.toFixed(2)}×; 20% = ${low.toFixed(2)}×; sensibilidade preservada`,
      );
      captures.setManualGain(3);
      // Generated tracks have no automatic gain hardware. A rejected change must
      // leave the accepted manual setting intact, instead of pretending success.
      let accepted = true;
      try {
        await captures.setVoiceSettings({
          ...captures.voiceSettings,
          autoGainControl: true,
        });
      } catch {
        accepted = false;
      }
      const after = (await rms()) / baseline;
      if (accepted) {
        assert(Math.abs(after - 1) < 0.1, "Automático e manual estão somando");
        report(
          `Automático aceito neutraliza a etapa manual (${after.toFixed(2)}×)`,
        );
      } else {
        assert(
          !captures.voiceSettings.autoGainControl && Math.abs(after - 3) < 0.25,
          "Falha no AGC perdeu o ajuste manual",
        );
        report(
          "Fonte sintética sem AGC: rejeição preserva a configuração e o ganho manual",
        );
      }
      source.disconnect();
      const screenGraph = playback.create(destination.stream)!;
      const screenSource = context.createMediaStreamSource(screenGraph.stream);
      screenSource.connect(analyser);
      screenGraph.setVolume(1);
      const screenBase = await rms();
      assert(screenBase > 0.02, "Nenhum sinal na reprodução de tela");
      screenGraph.setVolume(3);
      const screenHigh = (await rms()) / screenBase;
      screenGraph.setVolume(0);
      const screenSilent = await rms();
      assert(
        Math.abs(screenHigh - 3) < 0.25,
        "Ganho da tela não alcançou 300%",
      );
      assert(screenSilent < 0.001, "Volume zero da tela não silenciou");
      screenGraph.close();
      assert(
        track.readyState === "live",
        "Reprodução interrompeu a captura original",
      );
      screenSource.disconnect();
      report(
        `Áudio da tela: 300% = ${screenHigh.toFixed(2)}×; zero silencia; captura preservada`,
      );
      analyser.disconnect();
      silent.disconnect();
    } catch (error) {
      setResults((old) => [
        ...old,
        `FAIL · ${error instanceof Error ? error.message : error}`,
      ]);
    } finally {
      stopObserving();
      captures.stop("voice");
      playback.close();
      oscillator.stop();
      destination.stream.getTracks().forEach((track) => track.stop());
      await context.close();
      setRunning(false);
    }
  }
  return (
    <section aria-label="Validação de áudio 2.0">
      <button
        className="secondary"
        disabled={running}
        onClick={() => void run()}
      >
        {running ? "Verificando áudio…" : "Verificar indicador e ganho 2.0"}
      </button>
      <ol>
        {results.map((result, i) => (
          <li key={i}>{result}</li>
        ))}
      </ol>
    </section>
  );
}
