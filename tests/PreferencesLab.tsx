import { useState } from "react";
import { Controller } from "../src/client/room/controller";
import { freshKey } from "../src/client/id";
import type { Cue } from "../src/client/media/sound-preferences";

const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
async function until(condition: () => boolean, label: string) {
  for (let i = 0; i < 100; i++) {
    if (condition()) return;
    await pause(50);
  }
  throw new Error(label);
}
function assert(condition: unknown, label: string): void {
  if (!condition) throw new Error(label);
}
/** Production controllers and real signaling; only deliberate user actions are simulated. */
export function PreferencesLab() {
  const [results, setResults] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  async function run() {
    setRunning(true);
    setResults([]);
    const a = new Controller(undefined, false),
      b = new Controller(undefined, false);
    b.sounds = false;
    const observed: Cue[] = [];
    const play = a.playCue.bind(a);
    a.playCue = async (cue, preview) => {
      observed.push(cue);
      return play(cue, preview);
    };
    const report = (value: string) =>
      setResults((old) => [...old, `PASS · ${value}`]);
    const code =
      "SOUND" + freshKey().replaceAll("-", "").slice(0, 8).toUpperCase();
    try {
      await a.enter("Teste A", code);
      await until(
        () => a.view.status === "connected",
        "Entrada inicial não terminou",
      );
      assert(
        observed.join() === "room-enter",
        "Entrada própria disparou um número incorreto de sons",
      );
      await b.enter("Teste B", code);
      await until(
        () => a.view.snapshot?.participants.length === 2,
        "Presença remota não chegou",
      );
      assert(
        observed.join() === "room-enter,room-enter",
        "Entrada remota não gerou um único som",
      );
      await b.setColor("#EC75B5");
      await a.setColor("#26D0C7");
      b.joinCall();
      await until(
        () =>
          !!a.view.snapshot?.participants.find((p) => p.id === b.view.id)
            ?.inCall,
        "Chamada não sincronizou",
      );
      assert(observed.length === 2, "Cor ou chamada disparou som de entrada");
      report(
        "Uma entrada própria e uma remota; snapshots de cor/chamada não repetem o som",
      );
      a.socket!.disconnect();
      await until(
        () =>
          b.view.snapshot?.participants.find((p) => p.id === a.view.id)
            ?.online === false,
        "Queda não observada",
      );
      a.socket!.connect();
      await until(
        () => a.view.status === "connected",
        "Reconexão não terminou",
      );
      assert(observed.length === 2, "Reconexão tocou som de entrada outra vez");
      assert(a.roomColor === "#26D0C7", "Reconexão perdeu a cor");
      report("Reconexão preserva a cor e não repete o aviso de entrada");
      await b.leave();
      await until(
        () => a.view.snapshot?.participants.length === 1,
        "Saída remota não chegou",
      );
      assert(
        observed.join() === "room-enter,room-enter,room-leave",
        "Saída remota não tocou uma vez",
      );
      a.soundEvents.mute = false;
      assert((await play("mute")) === false, "Evento desabilitado ainda toca");
      assert(await play("mute", true), "Prévia explícita de som não tocou");
      a.masterVolume = 0;
      assert(
        (await play("share-on")) === false,
        "Volume geral zero não silenciou efeitos",
      );
      a.masterVolume = 1;
      a.soundVolume = 0;
      assert(
        (await play("share-on")) === false,
        "Volume dos efeitos zero não silenciou",
      );
      a.soundVolume = 0.7;
      a.sounds = false;
      assert(
        (await play("share-on", true)) === false,
        "Feedback sonoro desligado ainda toca",
      );
      a.sounds = true;
      report(
        "Eventos independentes, prévia explícita e dois volumes respeitam o silêncio",
      );
      await a.leave();
      assert(
        observed.join() === "room-enter,room-enter,room-leave,room-leave",
        "Saída própria não tocou uma vez",
      );
      assert(
        a.roomColor === "#2727F5",
        "Saída explícita levou a cor para outra sala",
      );
      await a.destroy();
      assert(observed.length === 4, "Desmontagem repetiu aviso de saída");
      report(
        "Saída explícita toca uma vez e encerra a cor daquela sala; desmontagem é silenciosa",
      );
    } catch (error) {
      setResults((old) => [
        ...old,
        `FAIL · ${error instanceof Error ? error.message : error}`,
      ]);
    } finally {
      await a.destroy();
      await b.destroy();
      setRunning(false);
    }
  }
  return (
    <section aria-label="Sons e identidade da sala">
      <h2>Sons e identidade · 2.6.0</h2>
      <button
        className="secondary"
        disabled={running}
        onClick={() => void run()}
      >
        {running ? "Verificando preferências…" : "Verificar sons e reconexão"}
      </button>
      <pre aria-label="Resultado das preferências">{results.join("\n")}</pre>
    </section>
  );
}
