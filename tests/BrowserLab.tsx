import { RoomSwitchLab } from "./RoomSwitchLab";
import { useEffect, useRef, useState } from "react";
import type { Root } from "react-dom/client";
import { Controller } from "../src/client/room/controller";
import App from "../src/client/App";
import { syntheticAdapter } from "./synthetic";
import { freshKey } from "../src/client/id";
import { mediaDeadline } from "../src/client/media/deadline";
import { WatchLab } from "./WatchLab";
import { LayoutLab } from "./LayoutLab";
import { FeatureLab } from "./FeatureLab";
import { ScreenAudioLab } from "./ScreenAudioLab";
type Result = { test: string; status: "PASS" | "FAIL"; detail?: unknown };
async function until(condition: () => boolean, label: string, ms = 20000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > ms) throw new Error("Tempo esgotado: " + label);
    await new Promise((r) => setTimeout(r, 150));
  }
}
function assert(ok: unknown, label: string) {
  if (!ok) throw new Error(label);
}
export function BrowserLab() {
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [shown, setShown] = useState(-1);
  const [mobile, setMobile] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(390);
  const [previewHeight, setPreviewHeight] = useState(844);
  const [previewPage, setPreviewPage] = useState("/");
  const [layoutReport, setLayoutReport] = useState("");
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const cleanup = useRef<() => Promise<void>>(async () => {});
  useEffect(
    () => () => {
      void cleanup.current();
    },
    [],
  );
  async function run() {
    await cleanup.current();
    setRunning(true);
    setResults([]);
    let engines: Controller[] = [];
    const sources = ["Ana", "Bia", "Caio"].map((name, i) =>
      syntheticAdapter(name, ["#303274", "#58344e", "#2c4f56"][i]),
    );
    const report = (test: string, detail?: unknown) =>
      setResults((old) => [...old, { test, status: "PASS", detail }]);
    try {
      engines = sources.map((s) => {
        const e = new Controller(s.adapter, false);
        e.sounds = false;
        return e;
      });
      cleanup.current = async () => {
        await Promise.all(engines.map((e) => e.destroy()));
        sources.forEach((s) => s.dispose());
      };
      setControllers(engines);
      const [a, b, c] = engines;
      const code =
        "QA" + freshKey().replaceAll("-", "").slice(0, 14).toUpperCase();
      for (const [i, e] of engines.entries())
        await e.enter(["Ana", "Bia", "Caio"][i], code);
      await until(
        () =>
          engines.every(
            (e) =>
              e.view.status === "connected" &&
              e.view.snapshot?.participants.length === 3,
          ),
        "3 participantes",
      );
      report(
        "Três sessões anônimas independentes",
        engines.map((e) => e.view.id),
      );
      await mediaDeadline(
        Promise.all(engines.slice(0, 2).map((e) => e.startScreen(true))),
        "Início das capturas não terminou",
        18000,
      );
      await until(
        () => a.publications.has("screen") && b.publications.has("screen"),
        "2 telas",
      );
      const aScreen = a.publications.get("screen")!.id,
        bScreen = b.publications.get("screen")!.id;
      report("Duas capturas sintéticas publicadas");
      a.select(bScreen);
      b.select(aScreen);
      c.select(aScreen);
      c.setPreviews(true);
      c.previews([bScreen]);
      await mediaDeadline(
        Promise.all(
          engines.map(async (e) => {
            e.joinCall();
            await e.microphone();
            await e.camera();
          }),
        ),
        "Início de voz/câmera não terminou",
        20000,
      );
      report("Voz e câmera sintéticas publicadas");
      await until(
        () =>
          engines.every(
            (e) =>
              e.peers.infos().filter((p) => !p.sending).length >= 5 &&
              e.peers.infos().every((p) => p.state === "connected"),
          ),
        "mídias simultâneas",
        40000,
      );
      await Promise.all(engines.map((e) => e.peers.stats()));
      report(
        "Telas cruzadas, voz e câmera simultâneas por WebRTC",
        engines.map((e) => ({
          name: e.view.snapshot?.participants.find((p) => p.id === e.view.id)
            ?.name,
          peers: e.peers.infos().length,
        })),
      );
      await until(
        () =>
          c.peers
            .infos()
            .some(
              (p) =>
                p.publicationId === bScreen &&
                p.tier === "preview" &&
                (p.bytes || 0) > 0,
            ),
        "miniatura com bytes",
      );
      const preview = c.peers
        .infos()
        .find((p) => p.publicationId === bScreen && p.tier === "preview")!;
      assert(
        (preview.width || 0) <= 320 && preview.width! > 0,
        "miniatura deve ter até 320 pixels",
      );
      assert(
        !c.peers
          .infos()
          .some((p) => p.publicationId === bScreen && p.tier === "main"),
        "alta qualidade não solicitada",
      );
      report("Miniatura real limitada a 320 × 180 / 5 FPS", preview);
      c.previews([]);
      await until(
        () => !c.peers.infos().some((p) => p.tier === "preview"),
        "miniatura cancelada",
      );
      assert(
        b.captures.sources.get("screen")?.stream.active,
        "captura preservada",
      );
      report("Miniatura invisível deixa de receber, captura continua");
      c.select(bScreen);
      await until(
        () =>
          c.peers
            .infos()
            .some(
              (p) =>
                p.publicationId === bScreen &&
                p.tier === "main" &&
                p.state === "connected",
            ) &&
          !c.peers
            .infos()
            .some(
              (p) =>
                !p.sending && p.publicationId === aScreen && p.tier === "main",
            ),
        "troca seletiva",
      );
      report(
        "Troca da transmissão principal encerra apenas a assinatura anterior",
      );
      await b.quality({ fps: 10, bitrate: 400, resolution: 480 });
      await until(
        () =>
          b.peers
            .infos()
            .some(
              (p) =>
                p.sending &&
                p.publicationId === bScreen &&
                (p.width || Infinity) <= 640 &&
                (p.fps || Infinity) <= 12,
            ),
        "qualidade aplicada",
        25000,
      );
      report(
        "FPS, escala e bitrate aplicados",
        b.peers.infos().filter((p) => p.sending && p.publicationId === bScreen),
      );
      await a.microphone();
      assert(a.captures.micMuted, "mute manual ligado");
      a.deafen();
      a.deafen();
      assert(a.captures.micMuted, "deafen preserva mute manual");
      await a.microphone();
      a.deafen();
      assert(
        a.captures.sources.get("voice")?.stream.getAudioTracks()[0].enabled ===
          false,
        "deafen suspende envio",
      );
      a.deafen();
      assert(
        a.captures.sources.get("voice")?.stream.getAudioTracks()[0].enabled ===
          true,
        "deafen restaura envio",
      );
      report(
        "Mute e ensurdecer preservam intenção e suspendem a trilha enviada",
      );
      const screenTrack = a.captures.sources
        .get("screen")!
        .stream.getVideoTracks()[0];
      await a.captures.changeMicrophone("synthetic-next");
      await a.captures.startCamera("synthetic-next");
      assert(
        a.captures.sources.get("screen")!.stream.getVideoTracks()[0] ===
          screenTrack,
        "troca não interrompe tela",
      );
      report("Substituição de câmera e microfone mantém a captura de tela");
      const id = a.view.id;
      const before = a.peers.infos().map((p) => p.id);
      a.socket!.io.engine.close();
      await until(() => a.view.status === "reconnecting", "queda sinalização");
      await until(() => a.view.status === "connected", "reentrada", 20000);
      assert(a.view.id === id, "identidade estável");
      assert(
        a.captures.sources.get("screen")!.stream.getVideoTracks()[0] ===
          screenTrack,
        "captura reutilizada",
      );
      assert(a.view.snapshot?.participants.length === 3, "sem duplicação");
      assert(
        before.some((id) => a.peers.entries.has(id)),
        "peer preservado",
      );
      report(
        "Reconexão de sinalização sem F5, sem duplicação e com mídia preservada",
      );
      await c.reconnectMedia();
      await until(
        () =>
          c.peers
            .infos()
            .filter((p) => !p.sending)
            .every((p) => p.state === "connected"),
        "novas gerações",
      );
      report("Reconexão explícita descarta gerações anteriores");
      const stopTrack = b.captures.sources
        .get("screen")!
        .stream.getVideoTracks()[0];
      stopTrack.stop();
      stopTrack.dispatchEvent(new Event("ended"));
      await until(
        () =>
          !b.publications.has("screen") &&
          !c.peers.infos().some((p) => p.publicationId === bScreen),
        "fim de captura",
      );
      assert(
        b.captures.sources.has("voice") && b.captures.sources.has("camera"),
        "outras fontes continuam",
      );
      report("Evento ended da tela libera conexões e preserva voz e câmera");
      const memory = engines.map((e) => ({
        participants: e.view.snapshot?.participants.length,
        connections: e.peers.infos().length,
        streams: e.captures.sources.size,
      }));
      report("Diagnóstico final", memory);
      setResults((old) => [
        ...old,
        {
          test: "Suite concluída — fontes sintéticas, transporte WebRTC real; não substitui testes físicos.",
          status: "PASS",
          detail: {
            browser: navigator.userAgent,
            platform: navigator.platform,
            at: new Date().toISOString(),
          },
        },
      ]);
    } catch (e) {
      setResults((old) => [
        ...old,
        {
          test: e instanceof Error ? e.message : String(e),
          status: "FAIL",
          detail: engines.map((e) => ({
            status: e.view.status,
            error: e.view.error,
            sources: [...e.captures.sources.keys()],
            peers: [...e.peers.entries.values()].map((p) => ({
              ...p.info,
              round: p.round,
              started: p.started,
              signaling: p.pc.signalingState,
              local: !!p.pc.localDescription,
              remote: !!p.pc.remoteDescription,
              queuedIce: p.candidates.length,
            })),
          })),
        },
      ]);
    } finally {
      setRunning(false);
    }
  }
  if (shown >= 0 && controllers[shown])
    return (
      <>
        <div className="lab-banner">
          LABORATÓRIO · MÍDIA SINTÉTICA ·{" "}
          <button onClick={() => setShown(-1)}>Voltar aos resultados</button>
        </div>
        <App engine={controllers[shown]} />
      </>
    );
  return (
    <main className="lab">
      <h1>VIO · laboratório de integração</h1>
      <FeatureLab />
      <ScreenAudioLab />
      <p>
        Fontes sintéticas. Três sessões independentes usam o servidor e conexões
        WebRTC reais. Nenhum microfone, câmera ou tela pessoal é capturado.
      </p>
      <button className="primary" disabled={running} onClick={() => void run()}>
        {running ? "Testes em execução…" : "Executar testes de mídia"}
      </button>
      <button className="secondary" onClick={() => setMobile(!mobile)}>
        Inspecionar mobile
      </button>
      {mobile && (
        <label>
          Largura da prévia
          <select
            value={previewWidth}
            onChange={(event) => setPreviewWidth(+event.target.value)}
          >
            <option value={320}>320 px</option>
            <option value={390}>390 px</option>
            <option value={768}>768 px</option>
            <option value={1024}>1024 px</option>
            <option value={1366}>1366 px</option>
            <option value={1440}>1440 px</option>
            <option value={1920}>1920 px</option>
          </select>
        </label>
      )}
      {mobile && (
        <>
          <label>
            Altura da prévia
            <select
              value={previewHeight}
              onChange={(e) => setPreviewHeight(+e.target.value)}
            >
              {[390, 600, 768, 844, 900, 1080].map((height) => (
                <option value={height} key={height}>
                  {height} px
                </option>
              ))}
            </select>
          </label>
          <label>
            Página da prévia
            <select
              value={previewPage}
              onChange={(e) => setPreviewPage(e.target.value)}
            >
              <option value="/">Entrada</option>
              <option value="/qa-layout">Sala sintética</option>
              <option value="/qa-watch">Várias telas</option>
            </select>
          </label>
          <button
            className="secondary"
            onClick={() => {
              const doc = previewFrame.current?.contentDocument;
              if (!doc) return;
              const root = doc.documentElement;
              const player = doc
                .querySelector(".player")
                ?.getBoundingClientRect();
              const cards = doc
                .querySelector(".floating-people")
                ?.getBoundingClientRect();
              const dock = doc.querySelector(".dock")?.getBoundingClientRect();
              setLayoutReport(
                JSON.stringify(
                  {
                    width: root.clientWidth,
                    scrollWidth: root.scrollWidth,
                    height: root.clientHeight,
                    scrollHeight: root.scrollHeight,
                    playerHeight: player?.height,
                    playerWidth: player?.width,
                    playerLeft: player?.left,
                    playerRightGap: player
                      ? root.clientWidth - player.right
                      : null,
                    previewWidth: doc
                      .querySelector(".preview-image")
                      ?.getBoundingClientRect().width,
                    previewHeight: doc
                      .querySelector(".preview-image")
                      ?.getBoundingClientRect().height,
                    cardsInside:
                      player && cards
                        ? cards.left >= player.left &&
                          cards.right <= player.right &&
                          cards.top >= player.top &&
                          cards.bottom <= player.bottom
                        : null,
                    dockInside:
                      player && dock
                        ? dock.left >= player.left &&
                          dock.right <= player.right &&
                          dock.bottom <= player.bottom
                        : null,
                    cardOpacity: doc.defaultView?.getComputedStyle(
                      doc.querySelector(".floating-people") || root,
                    ).opacity,
                    watched: [...doc.querySelectorAll(".watched-screen")].map(
                      (screen) => {
                        const rect = screen.getBoundingClientRect();
                        const video = screen.querySelector("video")!;
                        return {
                          label: screen.getAttribute("aria-label"),
                          width: rect.width,
                          height: rect.height,
                          inside:
                            rect.left >= 0 &&
                            rect.right <= root.clientWidth &&
                            rect.top >= 0 &&
                            rect.bottom <= root.clientHeight,
                          playing: !video.paused,
                          muted: video.muted,
                          controlsInside: [
                            ...screen.querySelectorAll("button, input"),
                          ].every((el) => {
                            const r = el.getBoundingClientRect();
                            return (
                              r.left >= rect.left &&
                              r.right <= rect.right &&
                              r.top >= rect.top &&
                              r.bottom <= rect.bottom
                            );
                          }),
                        };
                      },
                    ),
                  },
                  null,
                  2,
                ),
              );
            }}
          >
            Medir layout da prévia
          </button>
          <pre aria-label="Medições do layout">{layoutReport}</pre>
        </>
      )}
      {controllers.map((e, i) => (
        <button key={i} className="secondary" onClick={() => setShown(i)}>
          Abrir sala {["Ana", "Bia", "Caio"][i]}
        </button>
      ))}
      <p role="status">
        {running
          ? "EM EXECUÇÃO"
          : results.some((r) => r.status === "FAIL")
            ? "FALHOU"
            : results.length
              ? "CONCLUÍDO"
              : "PRONTO"}
      </p>
      <p className="field-note">Navegador: {navigator.userAgent}</p>
      <ol>
        {results.map((r, i) => (
          <li key={i}>
            <strong>
              {r.status} · {r.test}
            </strong>
            {r.detail !== undefined && (
              <details>
                <summary>Evidência</summary>
                <pre>{JSON.stringify(r.detail, null, 2)}</pre>
              </details>
            )}
          </li>
        ))}
      </ol>
      <button
        className="secondary"
        onClick={() => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(
            new Blob([JSON.stringify(results, null, 2)], {
              type: "application/json",
            }),
          );
          a.download = "media-results.json";
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }}
      >
        Baixar resultados
      </button>
      {mobile && (
        <iframe
          ref={previewFrame}
          title={`VIO em ${previewWidth} por ${previewHeight} pixels`}
          src={previewPage}
          style={{
            display: "block",
            width: previewWidth,
            height: previewHeight,
            margin: "25px auto",
            border: "1px solid #555",
          }}
        />
      )}
    </main>
  );
}
export async function mountLab(root: Root) {
  const config = await fetch("/api/config").then((r) => r.json());
  if (!config.testLab) throw new Error("Laboratório desabilitado.");
  root.render(
    location.pathname === "/qa-switch" ? (
      <RoomSwitchLab />
    ) : location.pathname === "/qa-layout" ? (
      <LayoutLab />
    ) : location.pathname === "/qa-watch" ? (
      <WatchLab />
    ) : (
      <BrowserLab />
    ),
  );
}
