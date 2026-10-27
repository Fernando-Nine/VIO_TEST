import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutGrid, MicOff, Pin, Video } from "lucide-react";
import { roleAllows, roomRole } from "../../shared/permissions";
import type { Participant, Publication } from "../../shared/protocol";
import type { Controller } from "../room/controller";
import { ContextMenu, type MenuItem } from "../components/ContextMenu";
import { Media, useSpeaking } from "../components/Media";
import { menuPoint } from "../components/PersonMenu";
import { participantStyle } from "../components/participant-style";
import {
  cameraGrid,
  nextFeatured,
  type CameraMode,
  type CameraPlace,
} from "./camera-layout";
import { HeaderTools } from "./header-tools";
import type { WidgetProps } from "./widgets";
import "./cameras.css";

interface Camera {
  person: Participant;
  publication: Publication;
}

/** Pins the widget on one camera; `undefined` goes back to automatic. */
export function pinCamera(
  engine: Controller,
  widgetId: string,
  personId: string | undefined,
) {
  const widget = engine.canvas
    .getSnapshot()
    .widgets.find((w) => w.id === widgetId);
  if (!widget) return;
  const { pinned: _, ...config } = widget.config;
  engine.canvas.updateWidget(widgetId, {
    config: personId ? { ...config, pinned: personId } : config,
  });
}

export function camerasOf(engine: Controller): Camera[] {
  return (engine.view.snapshot?.participants || []).flatMap((person) => {
    const publication = person.publications.find((p) => p.kind === "camera");
    return publication ? [{ person, publication }] : [];
  });
}

/** Reports who speaks for every camera, shown or not, so the highlight can move. */
function SpeakerProbe({
  person,
  engine,
  report,
}: {
  person: Participant;
  engine: Controller;
  report: (id: string, speaking: boolean) => void;
}) {
  const own = person.id === engine.view.id;
  const voice = person.publications.find((p) => p.kind === "voice");
  const stream = voice
    ? own
      ? engine.captures.sources.get("voice")?.stream
      : engine.peers.stream(voice.id)
    : undefined;
  const level = useCallback(() => engine.captures.voiceLevel, [engine]);
  const speaking = useSpeaking(
    stream,
    !voice || !!voice.muted || !person.online,
    own ? level : undefined,
  );
  useEffect(() => {
    report(person.id, speaking);
  }, [person.id, speaking, report]);
  useEffect(() => () => report(person.id, false), [person.id, report]);
  return null;
}

function usePageVisible(box: React.RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const doc = box.current?.ownerDocument || document;
    const changed = () => setVisible(doc.visibilityState !== "hidden");
    doc.addEventListener("visibilitychange", changed);
    changed();
    return () => doc.removeEventListener("visibilitychange", changed);
  }, [box]);
  return visible;
}

const off = { video: "off", height: 120 } as const;

/** One camera. Its element stays put; only the grid place changes (#162). */
function CameraTile({
  camera,
  place,
  engine,
  speaking,
  focused,
  active,
  strip,
  onMenu,
}: {
  camera: Camera;
  place: CameraPlace;
  engine: Controller;
  speaking: boolean;
  focused: boolean;
  active: boolean;
  strip: boolean;
  onMenu: (camera: Camera, at: { x: number; y: number }) => void;
}) {
  const { person, publication } = camera;
  const own = person.id === engine.view.id;
  const stream = own
    ? engine.captures.sources.get("camera")?.stream
    : engine.peers.stream(publication.id);
  const tile = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = tile.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(Math.round(entry.contentRect.height)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const hidden = place.role === "hidden";
  const target = Math.min(
    720,
    Math.max(
      120,
      Math.ceil((height * Math.min(devicePixelRatio || 1, 1.5)) / 60) * 60,
    ),
  );
  const video =
    !active || hidden
      ? "off"
      : place.role === "main" && focused
        ? "focus"
        : place.role === "main" && height >= 330
          ? "fit"
          : "small";
  useEffect(() => {
    if (own) return;
    const timer = setTimeout(
      () =>
        engine.setVideoDemand(
          publication.id,
          video === "off" ? off : { video, height: target },
        ),
      220,
    );
    return () => clearTimeout(timer);
  }, [engine, own, publication.id, video, target]);
  useEffect(() => {
    if (!own) return () => engine.setVideoDemand(publication.id, off);
  }, [engine, own, publication.id]);
  const micOff =
    person.voiceBlocked ||
    !person.publications.some((p) => p.kind === "voice" && !p.muted);
  const press = useRef(0);
  return (
    <div
      ref={tile}
      className={`camera-tile is-${place.role} ${own ? "is-own" : ""} ${speaking ? "is-speaking" : ""}`}
      style={{
        ...participantStyle(person.color, engine.participantColors),
        gridRow: place.gridRow,
        gridColumn: place.gridColumn,
      }}
      hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      aria-label={`Câmera de ${person.name}${own ? ", você" : ""}${speaking ? ", falando" : ""}`}
      onContextMenu={(event) => {
        event.preventDefault();
        onMenu(camera, menuPoint(event));
      }}
      onPointerDown={(event) => {
        if (event.pointerType !== "touch") return;
        const at = { x: event.clientX, y: event.clientY };
        press.current = window.setTimeout(() => onMenu(camera, at), 500);
      }}
      onPointerUp={() => clearTimeout(press.current)}
      onPointerCancel={() => clearTimeout(press.current)}
    >
      <Media
        stream={stream}
        className="camera-video"
        label={`Câmera de ${person.name}`}
      />
      <span className="camera-label">
        <span className="camera-name">
          {person.name}
          {own && <small> · você</small>}
        </span>
        {micOff && (
          <MicOff
            className="camera-mic"
            role="img"
            aria-label="Microfone desligado"
          />
        )}
      </span>
      {strip && speaking && <span className="camera-speaking">falando</span>}
    </div>
  );
}

/** Câmeras (#162): who speaks in the highlight, the others beside it. */
export function CamerasWidget({
  widget,
  engine,
  visible,
  focused,
}: WidgetProps) {
  const root = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setBox({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const pageVisible = usePageVisible(root);
  // Your own camera goes last: with nobody speaking, someone else is highlighted.
  const cameras = camerasOf(engine).sort(
    (a, b) =>
      Number(a.person.id === engine.view.id) -
      Number(b.person.id === engine.view.id),
  );
  const ids = cameras.map((c) => c.person.id);
  const idsKey = ids.join("|");
  const pinned = ids.includes(widget.config.pinned || "")
    ? widget.config.pinned
    : undefined;
  const since = useRef(new Map<string, number>());
  const [speakers, setSpeakers] = useState<ReadonlySet<string>>(new Set());
  const report = useCallback((id: string, speaking: boolean) => {
    if (speaking === since.current.has(id)) return;
    if (speaking) since.current.set(id, Date.now());
    else since.current.delete(id);
    setSpeakers(new Set(since.current.keys()));
  }, []);
  const [auto, setAuto] = useState<string>();
  useEffect(() => {
    const list = idsKey ? idsKey.split("|") : [];
    const pick = () =>
      setAuto((current) =>
        nextFeatured(current, list, since.current, Date.now()),
      );
    pick();
    if (list.length < 2) return;
    const timer = setInterval(pick, 250);
    return () => clearInterval(timer);
  }, [idsKey]);
  const featured = pinned || (auto && ids.includes(auto) ? auto : ids[0]);
  const mode: CameraMode =
    box.height && box.height < 200
      ? "strip"
      : focused || box.height >= 420
        ? "row"
        : "column";
  const grid = cameraGrid(ids, featured, mode, !!pinned, box.width < 500);
  const [menu, setMenu] = useState<{
    camera: Camera;
    at: { x: number; y: number };
    origin: Element | null;
  } | null>(null);
  const pinnedName = cameras.find((c) => c.person.id === pinned)?.person.name;
  const nameOf = (camera: Camera) =>
    camera.person.id === engine.view.id ? "a minha câmera" : camera.person.name;
  function items(camera: Camera): MenuItem[] {
    const list: MenuItem[] = [];
    if (pinned !== camera.person.id)
      list.push({
        label:
          camera.person.id === engine.view.id
            ? "Fixar só a minha câmera"
            : `Fixar só a câmera de ${camera.person.name}`,
        icon: Pin,
        run: () => pinCamera(engine, widget.id, camera.person.id),
      });
    if (pinned) {
      list.push({
        label: "Mostrar todas",
        icon: LayoutGrid,
        run: () => pinCamera(engine, widget.id, undefined),
      });
      cameras
        .filter((c) => c.person.id !== pinned)
        .forEach((c, i) =>
          list.push({
            label: `Fixar ${c.person.id === engine.view.id ? "" : "a câmera de "}${nameOf(c)}`,
            icon: Pin,
            separated: i === 0,
            run: () => pinCamera(engine, widget.id, c.person.id),
          }),
        );
    }
    return list;
  }
  const role = engine.view.snapshot
    ? roomRole(engine.view.snapshot, engine.view.id)
    : "guest";
  const canTurnOn =
    engine.inCall &&
    engine.captures.canUseDevices &&
    !engine.captures.sources.has("camera") &&
    roleAllows(engine.view.snapshot?.permissions, role, "guestCamera");
  return (
    <div
      ref={root}
      className={`cameras-widget is-${mode}`}
      style={{
        gridTemplateColumns: grid.columns,
        gridTemplateRows: grid.rows,
      }}
    >
      {pinnedName && (
        <HeaderTools>
          <span className="cameras-pin">
            <Pin aria-hidden="true" />
            {pinned === engine.view.id ? "você" : pinnedName}
          </span>
        </HeaderTools>
      )}
      {cameras.map((camera) => (
        <SpeakerProbe
          key={`probe:${camera.person.id}`}
          person={camera.person}
          engine={engine}
          report={report}
        />
      ))}
      {cameras.map((camera) => (
        <CameraTile
          key={camera.publication.id}
          camera={camera}
          place={
            grid.places.get(camera.person.id) || { role: "hidden" as const }
          }
          engine={engine}
          speaking={speakers.has(camera.person.id)}
          focused={focused}
          active={visible && pageVisible}
          strip={mode === "strip"}
          onMenu={(c, at) => setMenu({ camera: c, at, origin: root.current })}
        />
      ))}
      {!cameras.length && (
        <div className="cameras-empty">
          <p>Ninguém está com a câmera ligada.</p>
          {canTurnOn && (
            <button className="primary" onClick={() => void engine.camera()}>
              <Video size={17} aria-hidden="true" /> Ligar minha câmera
            </button>
          )}
        </div>
      )}
      {menu && (
        <ContextMenu
          at={menu.at}
          items={items(menu.camera)}
          label={`Câmera de ${menu.camera.person.name}`}
          origin={menu.origin}
          close={() => setMenu(null)}
        />
      )}
    </div>
  );
}
