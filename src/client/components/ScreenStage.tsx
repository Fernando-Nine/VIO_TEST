import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import {
  Focus,
  Eye,
  EyeOff,
  X,
  GripHorizontal,
  MoreHorizontal,
  MoveDiagonal2,
} from "lucide-react";
import type { Controller } from "../room/controller";
import { ScreenAudio } from "./ScreenAudio";
import { Media } from "./Media";
import { Dialog } from "./Dialog";
import { participantStyle } from "./participant-style";
import { anchors } from "./floating-position";
import {
  arrangeScreen,
  fitScreen,
  placeScreen,
  savePlacement,
  restorePlacement,
  type Area,
  type Placement,
  type ScreenRect,
} from "./screen-layout";

function WatchedScreen({
  id,
  engine,
  diagnostics,
  rect,
  area,
  layer,
  place,
  front,
  organize,
  onInteraction,
}: {
  id: string;
  engine: Controller;
  diagnostics: () => void;
  rect: ScreenRect;
  area: Area;
  layer: number;
  place: (rect: ScreenRect) => void;
  front: () => void;
  organize: () => void;
  onInteraction: (busy: boolean) => void;
}) {
  const { volume, muted: silent } = engine.screenLevel(id);
  const [hidden, setHidden] = useState(false);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    origin: ScreenRect;
    resize: boolean;
    moved: boolean;
  } | null>(null);
  const ignoreClick = useRef(false);
  const info = engine.screenInfo(id);
  const name = info?.name || "Participante";
  const focused = engine.view.selected === id;
  const own = info?.publication.owner === engine.view.id;
  const stream = own
    ? engine.captures.sources.get("screen")?.stream
    : engine.peers.stream(id);
  const stats = engine.peers
    .infos()
    .find((p) => !p.sending && p.publicationId === id && p.tier === "main");
  const muted = own || silent || engine.remoteMute || engine.captures.deaf;
  function start(event: PointerEvent<HTMLButtonElement>, resize = false) {
    if (event.button !== 0 || focused) return;
    front();
    ignoreClick.current = false;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origin: rect,
      resize,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    onInteraction(true);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x,
      dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    setDragging(true);
    place(
      fitScreen(
        drag.resize
          ? {
              ...drag.origin,
              width:
                drag.origin.width +
                (Math.abs(dx) > Math.abs(dy) ? dx : (dy * 16) / 9),
            }
          : { ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy },
        area,
      ),
    );
  }
  function finish(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    ignoreClick.current = drag.moved;
    if (cancel) place(drag.origin);
    else if (drag.moved && !drag.resize) {
      const x =
        rect.x < 18
          ? 0
          : area.width - rect.width - rect.x < 18
            ? area.width - rect.width
            : rect.x;
      const y =
        rect.y < 18
          ? 0
          : area.height - rect.height - rect.y < 18
            ? area.height - rect.height
            : rect.y;
      place(fitScreen({ ...rect, x, y }, area));
    }
    gesture.current = null;
    setDragging(false);
    onInteraction(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keys(event: KeyboardEvent<HTMLButtonElement>, resize = false) {
    if (event.key === "Escape" && gesture.current) {
      place(gesture.current.origin);
      gesture.current = null;
      setDragging(false);
      onInteraction(false);
      return;
    }
    if (!event.key.startsWith("Arrow")) return;
    event.preventDefault();
    front();
    const step = event.shiftKey ? 40 : 12;
    const dx =
      event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
    const dy =
      event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
    place(
      fitScreen(
        resize
          ? { ...rect, width: rect.width + dx + dy }
          : { ...rect, x: rect.x + dx, y: rect.y + dy },
        area,
      ),
    );
  }
  return (
    <section
      className={`watched-screen ${focused ? "is-focused" : "is-secondary"} ${hidden ? "local-hidden" : ""} ${dragging ? "is-dragging" : ""}`}
      aria-label={`Tela de ${name}${focused ? ", em foco" : ", em conjunto"}`}
      data-publication={id}
      style={{
        ...participantStyle(info?.color, engine.participantColors),
        ...(focused
          ? {}
          : {
              width: rect.width,
              height: rect.height,
              transform: `translate(${rect.x}px, ${rect.y}px)`,
              zIndex: layer,
            }),
      }}
      onPointerDown={focused ? undefined : front}
      onFocus={focused ? undefined : front}
    >
      {/* The same DOM and streams survive focus, placement and size changes. */}
      <Media
        stream={stream}
        label={`Transmissão de ${name}`}
        className="main-video"
        muted={true}
      />
      {!own && info?.publication.audio && (
        <ScreenAudio
          stream={stream}
          engine={engine}
          muted={!!muted}
          volume={volume}
          name={name}
        />
      )}
      {(!stream?.getVideoTracks().length || hidden) && (
        <div className="screen-placeholder" role="status">
          <strong>
            {hidden ? "Prévia oculta" : `Conectando à tela de ${name}…`}
          </strong>
          {focused && (
            <p>
              {hidden
                ? "Você continua transmitindo para a sala."
                : "Aguardando a mídia da transmissão."}
            </p>
          )}
          {!hidden && stats?.error && (
            <button className="secondary" onClick={diagnostics}>
              Ver conexão
            </button>
          )}
        </div>
      )}
      <div className="screen-caption">
        {focused ? (
          <span>
            <i aria-hidden="true" />
            {name}
            {own ? " · você" : ""}
          </span>
        ) : (
          <button
            className="screen-drag"
            aria-label={`Mover tela de ${name}`}
            title="Arraste ou use as setas. Clique para escolher posição e tamanho."
            onPointerDown={(e) => start(e)}
            onPointerMove={move}
            onPointerUp={(e) => finish(e)}
            onPointerCancel={(e) => finish(e, true)}
            onLostPointerCapture={(e) => finish(e, true)}
            onKeyDown={keys}
            onClick={() => {
              if (ignoreClick.current) {
                ignoreClick.current = false;
                return;
              }
              organize();
            }}
          >
            <GripHorizontal size={14} />
            <span>{name}</span>
          </button>
        )}
        {!focused && (
          <button
            className="icon-button"
            aria-label={`Colocar tela de ${name} em foco`}
            title="Colocar em foco"
            onClick={() => engine.select(id)}
          >
            <Focus size={16} />
          </button>
        )}
        {!focused && (
          <button
            className="icon-button screen-options"
            aria-label={`Organizar tela de ${name}`}
            title="Posição e tamanho"
            onClick={organize}
          >
            <MoreHorizontal size={16} />
          </button>
        )}
        {focused && own && (
          <button
            className="icon-button"
            aria-label={
              hidden ? "Mostrar prévia local" : "Ocultar prévia local"
            }
            onClick={() => setHidden(!hidden)}
          >
            {hidden ? <Eye size={17} /> : <EyeOff size={17} />}
          </button>
        )}
        <button
          className="icon-button"
          aria-label={`Parar de assistir tela de ${name}`}
          title="Parar de assistir"
          onClick={() => engine.stopWatching(id)}
        >
          <X size={16} />
        </button>
      </div>
      {!focused && (
        <button
          className="screen-resize"
          aria-label={`Redimensionar tela de ${name}`}
          title="Arraste ou use as setas para ajustar o tamanho. Clique para mais opções."
          onPointerDown={(e) => start(e, true)}
          onPointerMove={move}
          onPointerUp={(e) => finish(e)}
          onPointerCancel={(e) => finish(e, true)}
          onLostPointerCapture={(e) => finish(e, true)}
          onKeyDown={(e) => keys(e, true)}
          onClick={() => {
            if (ignoreClick.current) {
              ignoreClick.current = false;
              return;
            }
            organize();
          }}
        >
          <MoveDiagonal2 size={15} />
        </button>
      )}
    </section>
  );
}

export function ScreenStage({
  engine,
  diagnostics,
  onInteraction,
}: {
  engine: Controller;
  diagnostics: () => void;
  onInteraction: (busy: boolean) => void;
}) {
  const workArea = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<Area>({ width: 1, height: 1 });
  const [positions, setPositions] = useState<Record<string, Placement>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [editing, setEditing] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const secondary = engine.view.watching.filter(
    (id) => id !== engine.view.selected,
  );
  const { mode, revision } = engine.screenArrangement;
  useLayoutEffect(() => {
    const measure = () => {
      if (workArea.current)
        setArea({
          width: workArea.current.clientWidth,
          height: workArea.current.clientHeight,
        });
    };
    const observer = new ResizeObserver(measure);
    if (workArea.current) observer.observe(workArea.current);
    measure();
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    setPositions({});
  }, [revision]);
  const rectFor = (id: string) =>
    positions[id]
      ? restorePlacement(positions[id], area)
      : arrangeScreen(
          Math.max(0, secondary.indexOf(id)),
          secondary.length,
          area,
          mode,
        );
  const place = (id: string, rect: ScreenRect) =>
    setPositions((all) => ({ ...all, [id]: savePlacement(rect, area) }));
  const front = (id: string) =>
    setOrder((all) =>
      all.at(-1) === id
        ? all
        : [
            ...all.filter(
              (other) => other !== id && engine.view.watching.includes(other),
            ),
            id,
          ],
    );
  const edited = secondary.includes(editing) ? editing : "";
  const rect = rectFor(edited);
  const maxWidth = Math.max(1, Math.min(area.width, (area.height * 16) / 9));
  return (
    <div className="screen-stage">
      <div className="screen-window-area" ref={workArea}>
        {engine.view.watching.map((id) => (
          <WatchedScreen
            key={id}
            id={id}
            engine={engine}
            diagnostics={diagnostics}
            area={area}
            rect={rectFor(id)}
            layer={2 + Math.max(0, order.indexOf(id) + 1)}
            place={(next) => place(id, next)}
            front={() => front(id)}
            organize={() => {
              front(id);
              setEditing(id);
            }}
            onInteraction={onInteraction}
          />
        ))}
      </div>
      {edited && (
        <Dialog
          title={`Organizar tela de ${engine.screenInfo(edited)?.name || "participante"}`}
          close={() => setEditing("")}
        >
          <p className="field-note">
            Ajuste esta janela sem interromper a transmissão. Também é possível
            arrastar a barra com o nome e o canto inferior.
          </p>
          <label className="screen-size-label">
            Tamanho <output>{Math.round(rect.width)} px</output>
            <input
              aria-label="Tamanho da tela menor"
              type="range"
              min={Math.min(144, maxWidth)}
              max={maxWidth}
              value={rect.width}
              onChange={(e) =>
                place(
                  edited,
                  fitScreen({ ...rect, width: Number(e.target.value) }, area),
                )
              }
            />
          </label>
          <div
            className="screen-size-presets"
            role="group"
            aria-label="Tamanhos de janela"
          >
            {(
              [
                [0.2, "Pequena"],
                [0.32, "Média"],
                [0.48, "Grande"],
              ] as const
            ).map(([fraction, label]) => (
              <button
                className="secondary"
                key={label}
                onClick={() => {
                  place(
                    edited,
                    fitScreen({ ...rect, width: area.width * fraction }, area),
                  );
                  setAnnouncement(`Tamanho ${label.toLowerCase()} aplicado.`);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p>Posição na tela</p>
          <div
            className="screen-position-presets"
            role="group"
            aria-label="Posição da janela"
          >
            {anchors.map((anchor) => (
              <button
                className="secondary"
                key={anchor.id}
                onClick={() => {
                  place(edited, placeScreen(rect, anchor.id, area));
                  setAnnouncement(`Janela: ${anchor.label.toLowerCase()}.`);
                }}
              >
                {anchor.label}
              </button>
            ))}
          </div>
          <p className="field-note" role="status">
            {announcement ||
              "Use as setas do teclado nos controles de mover e redimensionar para fazer ajustes menores."}
          </p>
          <button className="primary" onClick={() => setEditing("")}>
            Concluir
          </button>
        </Dialog>
      )}
    </div>
  );
}
