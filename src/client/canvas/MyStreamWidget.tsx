import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MonitorUp,
  Pause,
  Play,
  RefreshCw,
  Square,
  VolumeX,
} from "lucide-react";
import type { Participant, Publication } from "../../shared/protocol";
import { screenResolutions } from "../../shared/protocol";
import type { Controller } from "../room/controller";
import type { PeerInfo } from "../media/peers";
import type { Slot } from "../media/capture";
import type { MenuItem } from "../components/ContextMenu";
import { Media } from "../components/Media";
import { participantStyle } from "../components/participant-style";
import { HeaderTools, useMenuItems } from "./header-tools";
import type { WidgetProps } from "./widgets";
import "./my-stream.css";

const initials = (name: string) => [...name].slice(0, 2).join("").toUpperCase();
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const mbps = (kbps: number) => decimal.format(kbps / 1000);
/** Samples kept for the focus chart: one every 2 s, the last 60 s. */
const historyLength = 30;

/** The paused video is the publication's "muted" flag, which viewers see. */
export function setStreamPaused(
  engine: Controller,
  paused: boolean,
  video?: HTMLVideoElement | null,
  slot: Slot = "screen",
) {
  const publication = engine.publications.get(slot);
  const track = engine.captures.sources.get(slot)?.stream.getVideoTracks()[0];
  if (!publication || !track) return;
  // Pausing the element first keeps the last frame instead of black.
  if (paused) video?.pause();
  else void video?.play().catch(() => {});
  track.enabled = !paused;
  void engine
    .request("state", { publicationId: publication.id, muted: paused })
    .catch((e) => engine.fail(e));
  engine.bump();
}

/** The local track is the truth; the publication follows it via "state". */
export const streamPaused = (engine: Controller, slot: Slot = "screen") =>
  engine.captures.sources.get(slot)?.stream.getVideoTracks()[0]?.enabled ===
  false;

/** The local capture slot behind one of my publications (#194). */
export function slotOf(engine: Controller, publicationId?: string) {
  for (const [slot, publication] of engine.publications)
    if (publication.id === publicationId) return slot;
  return undefined;
}

/** Pausar, Silenciar, Trocar and Parar, shared by the buttons and the menu. */
export function streamActions(
  engine: Controller,
  replaceShare: (slot: Slot) => void,
  video?: HTMLVideoElement | null,
  slot: Slot = "screen",
  share?: () => void,
): (MenuItem & { active?: boolean; hint?: string })[] {
  const publication = engine.publications.get(slot);
  if (!publication) return [];
  const paused = streamPaused(engine, slot);
  const silenced = engine.captures.isScreenAudioMuted(slot);
  return [
    {
      label: paused ? "Continuar" : "Pausar",
      icon: paused ? Play : Pause,
      run: () => setStreamPaused(engine, !paused, video, slot),
    },
    ...(publication.audio
      ? [
          {
            label: silenced ? "Ativar o som" : "Silenciar o som",
            icon: VolumeX,
            active: silenced,
            hint: "Quem assiste vê a tela, sem som.",
            run: () => engine.setScreenAudioMuted(!silenced, slot),
          },
        ]
      : []),
    {
      label: "Trocar o que transmito",
      icon: RefreshCw,
      run: () => replaceShare(slot),
    },
    // Up to MAX_SCREENS at once (#194).
    ...(share && engine.captures.nextScreen()
      ? [{ label: "Compartilhar outra tela", icon: MonitorUp, run: share }]
      : []),
    {
      label: "Parar",
      icon: Square,
      danger: true,
      separated: true,
      run: () => void engine.stop(slot),
    },
  ];
}

function surfaceLabel(track?: MediaStreamTrack) {
  const surface = track?.getSettings().displaySurface;
  return surface === "monitor"
    ? "Tela inteira"
    : surface === "window"
      ? "Janela"
      : surface === "browser"
        ? "Aba do navegador"
        : "";
}

function stats(infos: PeerInfo[]) {
  const sum = (values: (number | undefined)[]) =>
    values.reduce<number>((total, v) => total + (v ?? 0), 0);
  const average = (values: (number | undefined)[]) => {
    const known = values.filter((v): v is number => v !== undefined);
    return known.length ? sum(known) / known.length : undefined;
  };
  const main = infos.filter((i) => i.tier === "main");
  return {
    bitrate: infos.some((i) => i.bitrate !== undefined)
      ? sum(infos.map((i) => i.bitrate))
      : undefined,
    fps: main.reduce<number | undefined>(
      (best, i) => (i.fps === undefined ? best : Math.max(best ?? 0, i.fps)),
      undefined,
    ),
    rtt: average(infos.map((i) => i.rtt)),
    loss: average(infos.map((i) => i.loss)),
  };
}

const unstable = (info?: PeerInfo) =>
  !!info && ((info.loss ?? 0) > 2 || (info.rtt ?? 0) > 250);

function Viewer({ person, info }: { person: Participant; info?: PeerInfo }) {
  const bad = unstable(info);
  return (
    <li className="stream-viewer" style={participantStyle(person.color)}>
      <span className="stream-avatar" aria-hidden="true">
        {initials(person.name)}
      </span>
      <span className="stream-viewer-name">{person.name}</span>
      <span className={`stream-quality ${bad ? "is-unstable" : ""}`}>
        {bad ? "Instável" : "Boa"}
      </span>
      <span className="stream-mono">
        {info?.rtt ?? "—"} ms · {info?.loss?.toFixed(1) ?? "—"}%
      </span>
    </li>
  );
}

function Chart({ samples }: { samples: number[] }) {
  const max = Math.max(1, ...samples);
  const points = samples
    .map(
      (v, i, all) =>
        `${((historyLength - all.length + i) / (historyLength - 1)) * 100},${30 - (v / max) * 28}`,
    )
    .join(" ");
  return (
    <svg
      className="stream-chart"
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      role="img"
      aria-label="Envio nos últimos 60 segundos"
    >
      <polyline points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Minha transmissão (#160): preview, controls, who watches and the numbers. */
export function MyStreamWidget({
  engine,
  share,
  replaceShare,
  height,
}: WidgetProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const snapshot = engine.view.snapshot;
  const me = snapshot?.participants.find((p) => p.id === engine.view.id);
  const own: Publication[] =
    me?.publications.filter((p) => p.kind === "screen") || [];
  const current = own[Math.min(index, own.length - 1)];
  // The preview is the local capture; only the publication made from it has one.
  const slot = slotOf(engine, current?.id);
  const local = !!slot;
  const stream = slot ? engine.captures.sources.get(slot)?.stream : undefined;
  const track = stream?.getVideoTracks()[0];
  const infos = current
    ? engine.peers
        .infos()
        .filter((i) => i.sending && i.publicationId === current.id)
    : [];
  const numbers = stats(infos);
  const viewerIds = new Set(snapshot?.screenViewers?.[current?.id || ""] || []);
  const viewers = (snapshot?.participants || []).filter((p) =>
    viewerIds.has(p.id),
  );
  const actions = slot
    ? streamActions(engine, replaceShare, video.current, slot, share)
    : [];
  useMenuItems(actions.length ? actions : undefined);
  const paused = slot ? streamPaused(engine, slot) : !!current?.muted;
  const silenced = !!slot && engine.captures.isScreenAudioMuted(slot);
  // Keep the frozen frame when the pause comes from elsewhere (menu, reload).
  useEffect(() => {
    if (paused) video.current?.pause();
  }, [paused, stream]);
  const latest = useRef(numbers.bitrate);
  latest.current = numbers.bitrate;
  useEffect(() => {
    if (!current) return;
    const timer = setInterval(
      () =>
        setHistory((h) => [...h, latest.current ?? 0].slice(-historyLength)),
      2000,
    );
    return () => clearInterval(timer);
  }, [current?.id]);

  if (!current)
    return (
      <div className="my-stream is-empty">
        <p>Você não está transmitindo.</p>
        <button className="primary" onClick={() => share()}>
          <MonitorUp size={17} aria-hidden="true" /> Compartilhar
        </button>
      </div>
    );

  const strip = height < 170;
  const resolution = track?.getSettings().height;
  const source = surfaceLabel(track);
  const quality = engine.captures.qualityOf(
    slot ? engine.captures.sources.get(slot) : undefined,
  );
  const cells = [
    {
      label: "Envio",
      value: numbers.bitrate === undefined ? "—" : mbps(numbers.bitrate),
      unit: "Mbps",
    },
    {
      label: "Quadros",
      value: numbers.fps ?? "—",
      unit: "fps",
      extra: resolution ? `${resolution}p` : undefined,
    },
    {
      label: "Ping",
      value: numbers.rtt === undefined ? "—" : Math.round(numbers.rtt),
      unit: "ms",
    },
    {
      label: "Perda",
      value: numbers.loss === undefined ? "—" : decimal.format(numbers.loss),
      unit: "%",
    },
  ];
  return (
    <div className={`my-stream ${strip ? "is-strip" : ""}`}>
      {own.length > 1 && (
        <HeaderTools>
          <span
            className="stream-picker"
            role="group"
            aria-label="Trocar qual transmissão aparece aqui"
            title="Trocar qual transmissão aparece aqui"
          >
            <button
              type="button"
              aria-label="Transmissão anterior"
              onClick={() => setIndex((index + own.length - 1) % own.length)}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span className="stream-mono">
              {own.indexOf(current) + 1}/{own.length}
            </span>
            <button
              type="button"
              aria-label="Próxima transmissão"
              onClick={() => setIndex((index + 1) % own.length)}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </span>
        </HeaderTools>
      )}
      <div className="stream-preview">
        <Media
          stream={stream}
          videoRef={video}
          label="Prévia da sua transmissão"
          className="stream-video"
          muted
        />
        <span className={`stream-live ${paused ? "is-paused" : ""}`}>
          {!paused && <i className="live-pulse" />}
          {paused ? "Pausado" : "AO VIVO"}
          {silenced && (
            <VolumeX size={12} role="img" aria-label="Som silenciado" />
          )}
        </span>
        {source && !strip && <span className="stream-source">{source}</span>}
        {strip && (
          <span className="stream-overlay stream-mono">
            <Eye size={12} aria-label="Assistindo" /> {viewers.length}
            {numbers.bitrate !== undefined &&
              ` · ${mbps(numbers.bitrate)} Mbps`}
            {numbers.fps !== undefined && ` · ${numbers.fps} fps`}
          </span>
        )}
      </div>
      {!strip && (
        <>
          <div className="stream-controls">
            {actions.map((a) => {
              const Icon = a.icon!;
              const danger = !!a.danger;
              return (
                <button
                  key={a.label}
                  type="button"
                  className={`stream-control ${danger ? "is-stop" : ""} ${a.active ? "is-active" : ""}`}
                  aria-label={a.label}
                  aria-pressed={a.hint ? !!a.active : undefined}
                  title={a.hint || a.label}
                  onClick={a.run}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className={danger ? "" : "stream-control-text"}>
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="stream-side">
            <section className="stream-audience" aria-label="Quem assiste">
              <p className="stream-count">
                {!!viewers.length && (
                  <span className="stream-stack" aria-hidden="true">
                    {viewers.slice(0, 4).map((p) => (
                      <span
                        key={p.id}
                        className="stream-avatar"
                        style={participantStyle(p.color)}
                      >
                        {initials(p.name)}
                      </span>
                    ))}
                  </span>
                )}
                {viewers.length
                  ? `${viewers.length} assistindo`
                  : "Ninguém assistindo"}
              </p>
              {!!viewers.length && (
                <ul className="stream-viewers">
                  {viewers.map((p) => (
                    <Viewer
                      key={p.id}
                      person={p}
                      info={
                        infos.find(
                          (i) => i.viewer === p.id && i.tier === "main",
                        ) || infos.find((i) => i.viewer === p.id)
                      }
                    />
                  ))}
                </ul>
              )}
            </section>
            <dl className="stream-numbers">
              {cells.map((c) => (
                <div key={c.label}>
                  <dt>{c.label}</dt>
                  <dd>
                    <span className="stream-mono">{c.value}</span>{" "}
                    <small>{c.unit}</small>
                    {c.extra && (
                      <small className="stream-resolution">{c.extra}</small>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <Chart samples={history} />
            {local && (
              <div className="stream-quality-pick" aria-label="Qualidade">
                <select
                  aria-label="Resolução"
                  value={quality.resolution}
                  onChange={(e) =>
                    void engine
                      .quality({ ...quality, resolution: +e.target.value })
                      .catch((e) => engine.fail(e))
                  }
                >
                  {screenResolutions.map((p) => (
                    <option key={p} value={p}>
                      {p}p
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Quadros por segundo"
                  value={quality.fps}
                  onChange={(e) =>
                    void engine
                      .quality({ ...quality, fps: +e.target.value })
                      .catch((e) => engine.fail(e))
                  }
                >
                  {[5, 15, 24, 30, 60].map((f) => (
                    <option key={f} value={f}>
                      {f} fps
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
