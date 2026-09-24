import { useEffect, useRef, useState } from "react";
import { Controller } from "../src/client/room/controller";
import App from "../src/client/App";
import { syntheticAdapter } from "./synthetic";
import { freshKey } from "../src/client/id";

/** Development-only fixture: real room presence, synthetic local video, no device permissions. */
export function LayoutLab() {
  const [engine, setEngine] = useState<Controller>();
  const [status, setStatus] = useState("");
  const cleanup = useRef<() => Promise<void>>(async () => {});
  useEffect(
    () => () => {
      void cleanup.current();
    },
    [],
  );
  async function prepare() {
    setStatus("Preparando…");
    const names = ["Ana", "Bia", "Caio", "Davi", "Eva", "Fábio"];
    const sources = names.map((name) => syntheticAdapter(name, "#283722"));
    const engines = sources.map(
      (source) => new Controller(source.adapter, false),
    );
    cleanup.current = async () => {
      await Promise.all(engines.map((e) => e.destroy()));
      sources.forEach((s) => s.dispose());
    };
    try {
      const code =
        "UI" + freshKey().replaceAll("-", "").slice(0, 12).toUpperCase();
      for (const [i, room] of engines.entries()) {
        room.sounds = false;
        await room.enter(names[i], code);
      }
      await engines[0].startScreen(false);
      await engines[1].startScreen(false);
      engines[0].select(engines[0].publications.get("screen")!.id);
      setEngine(engines[0]);
    } catch (error) {
      setStatus(String(error));
      await cleanup.current();
    }
  }
  return engine ? (
    <App engine={engine} />
  ) : (
    <main className="lab">
      <h1>Ensaio de layout</h1>
      <p>
        Seis sessões e duas telas sintéticas. O ensaio verifica a interface; não
        comprova recepção de mídia entre dispositivos.
      </p>
      <button
        className="primary"
        onClick={() => void prepare()}
        disabled={status === "Preparando…"}
      >
        Preparar sala sintética
      </button>
      <p role="status">{status}</p>
    </main>
  );
}
