import { useEffect, useRef, useState } from "react";
import { Controller } from "../src/client/room/controller";
import App from "../src/client/App";
import { syntheticAdapter } from "./synthetic";
import { freshKey } from "../src/client/id";
import { colorPresets } from "../src/shared/colors";

type Baseline = {
  video: HTMLMediaElement;
  stream: MediaProvider | null;
  time: number;
  pauses: number;
  remove: () => void;
};
/** Local rendering proof uses synthetic media directly; signaling still uses the real server. */
export function WatchLab() {
  const [engine, setEngine] = useState<Controller>();
  const [report, setReport] = useState("");
  const [busy, setBusy] = useState(false);
  const cleanup = useRef(async () => {});
  const publishers = useRef<Controller[]>([]);
  const baseline = useRef<Baseline[]>([]);
  const commands = useRef(0);
  const startCommands = useRef(0);
  const ids = useRef<string[]>([]);
  useEffect(
    () => () => {
      baseline.current.forEach((b) => b.remove());
      void cleanup.current();
    },
    [],
  );
  async function prepare() {
    setBusy(true);
    const sources = ["Ana", "Bia", "Caio", "Davi", "Eva", "Você"].map(
      (name, i) =>
        syntheticAdapter(
          name,
          ["#252768", "#234b56", "#51334c", "#343e70", "#394437", "#2727f5"][i],
        ),
    );
    const rooms = sources.map(
      (source) => new Controller(source.adapter, false),
    );
    publishers.current = rooms.slice(0, 5);
    cleanup.current = async () => {
      await Promise.all(rooms.map((room) => room.destroy()));
      sources.forEach((s) => s.dispose());
    };
    try {
      const code =
        "PAIR" + freshKey().replaceAll("-", "").slice(0, 10).toUpperCase();
      for (const [i, room] of rooms.entries()) {
        room.sounds = false;
        await room.enter(
          ["Ana", "Bia", "Caio", "Davi", "Eva", "Você"][i],
          code,
        );
      }
      const start = Date.now();
      while (!rooms.every((room) => room.view.status === "connected")) {
        if (Date.now() - start > 15000) throw new Error("Sala não conectou");
        await new Promise((r) => setTimeout(r, 100));
      }
      for (const room of rooms.slice(0, 5)) await room.startScreen(true);
      rooms[0].joinCall();
      await rooms[0].microphone();
      const viewer = rooms[5];
      const originalStream = viewer.peers.stream.bind(viewer.peers);
      viewer.peers.stream = (id, tier = "main") => {
        const owner = rooms.find((room) =>
          [...room.publications.values()].some((p) => p.id === id),
        );
        const publication =
          owner && [...owner.publications.values()].find((p) => p.id === id);
        // Deliberate rendering fixture, not an assertion of remote WebRTC transport.
        if (
          owner &&
          publication &&
          (publication.kind === "screen"
            ? tier === "preview" || viewer.view.watching.includes(id)
            : viewer.inCall)
        )
          return owner.captures.sources.get(publication.kind)?.stream;
        return originalStream(id, tier);
      };
      const originalRequest = viewer.request.bind(viewer);
      viewer.request = (action, data) => {
        if (["subscribe", "unsubscribe"].includes(action)) commands.current++;
        return originalRequest(action, data) as never;
      };
      setReport(
        JSON.stringify({
          initialWatching: viewer.view.watching,
          initialInCall: viewer.inCall,
          initialLocalSources: [...viewer.captures.sources.keys()],
          initialIncomingVoice: viewer.peers
            .infos()
            .filter((p) => !p.sending && p.kind === "voice").length,
          initialIncomingScreens: viewer.peers
            .infos()
            .filter((p) => !p.sending && p.kind === "screen").length,
        }),
      );
      setEngine(viewer);
    } catch (error) {
      setReport(String(error));
      await cleanup.current();
    }
    setBusy(false);
  }
  function record() {
    baseline.current.forEach((b) => b.remove());
    baseline.current = [
      ...document.querySelectorAll<HTMLMediaElement>(
        ".watched-screen video, .watched-screen audio",
      ),
    ].map((video) => {
      const b: Baseline = {
        video,
        stream: video.srcObject,
        time: video.currentTime,
        pauses: 0,
        remove: () => {},
      };
      const paused = () => b.pauses++;
      video.addEventListener("pause", paused);
      b.remove = () => video.removeEventListener("pause", paused);
      return b;
    });
    startCommands.current = commands.current;
    ids.current = engine!.peers
      .infos()
      .filter((p) => !p.sending && p.kind === "screen" && p.tier === "main")
      .map((p) => p.id)
      .sort();
    setReport(
      JSON.stringify(
        { recorded: baseline.current.length, subscriptions: ids.current },
        null,
        2,
      ),
    );
  }
  function verify() {
    const current = [
      ...document.querySelectorAll<HTMLMediaElement>(
        ".watched-screen video, .watched-screen audio",
      ),
    ];
    const subscriptions = engine!.peers
      .infos()
      .filter((p) => !p.sending && p.kind === "screen" && p.tier === "main")
      .map((p) => p.id)
      .sort();
    const videos = baseline.current.map((b) => ({
      type: b.video.tagName.toLowerCase(),
      sameElement: current.includes(b.video),
      sameStream: b.video.srcObject === b.stream,
      advancing: b.video.currentTime > b.time,
      pauses: b.pauses,
      playing: !b.video.paused,
      audible: !b.video.muted && b.video.volume > 0,
      liveAudio: (b.video.srcObject as MediaStream)
        ?.getAudioTracks()
        .some((t) => t.readyState === "live"),
    }));
    setReport(
      JSON.stringify(
        {
          videos,
          sameSubscriptions:
            JSON.stringify(subscriptions) === JSON.stringify(ids.current),
          subscriptionCommandsSinceRecord:
            commands.current - startCommands.current,
          focused: engine!.view.selected,
          watching: engine!.view.watching,
          inCall: engine!.inCall,
          micMuted: engine!.captures.micMuted,
          localSources: [...engine!.captures.sources.keys()],
          incomingVoice: engine!.peers
            .infos()
            .filter((p) => !p.sending && p.kind === "voice").length,
          errors: engine!.view.error,
        },
        null,
        2,
      ),
    );
  }
  return engine ? (
    <>
      <App engine={engine} />
      <details
        className="watch-lab-report"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          zIndex: 30,
          maxWidth: "95vw",
          maxHeight: "45vh",
          overflow: "auto",
          background: "#101320",
          border: "1px solid #656b8a",
          padding: 8,
          fontSize: 12,
        }}
      >
        <summary>QA · renderização sintética + sinalização real</summary>
        <p>Não comprova transporte de áudio/vídeo entre aparelhos.</p>
        <button onClick={record}>Registrar antes da troca</button> ·{" "}
        <button onClick={verify}>Verificar continuidade</button> ·{" "}
        <button
          onClick={() =>
            void Promise.all(
              publishers.current.map((room, i) =>
                room.setColor(colorPresets[i].color),
              ),
            ).catch((error) => setReport(String(error)))
          }
        >
          Colorir transmissores
        </button>{" "}
        ·{" "}
        <button onClick={() => void publishers.current[1].stop("screen")}>
          Encerrar tela de Bia
        </button>
        <pre aria-label="Resultado de continuidade">{report}</pre>
      </details>
    </>
  ) : (
    <main className="lab">
      <h1>Ensaio de várias telas</h1>
      <p>
        Seis sessões; cinco vídeos sintéticos com áudio. Nenhum dispositivo
        pessoal é capturado.
      </p>
      <button
        className="primary"
        disabled={busy}
        onClick={() => void prepare()}
      >
        Preparar várias telas
      </button>
      <pre>{report}</pre>
    </main>
  );
}
