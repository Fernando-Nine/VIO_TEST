import { useCallback, useRef, type PointerEvent } from "react";
import { MicOff, Monitor, Video } from "lucide-react";
import type { Participant } from "../../shared/protocol";
import type { Controller } from "../room/controller";
import { useSpeaking } from "../components/Media";
import { participantStyle } from "../components/participant-style";
import { menuPoint, usePersonMenu } from "../components/PersonMenu";
import { RoomLimit } from "../components/RoomStatus";
import { VolumeNumber, VolumeSlider } from "../components/VolumeSlider";
import { HeaderTools } from "./header-tools";
import type { WidgetProps } from "./widgets";
import "./people.css";

type Open = (id: string, at: { x: number; y: number }, origin: Element) => void;

const initials = (name: string) => [...name].slice(0, 2).join("").toUpperCase();

/**
 * Right click, the ContextMenu key / Shift+F10 (both fire contextmenu) and a
 * touch long press open the person menu. A plain click opens nothing.
 */
function useMenuHandlers(id: string, open: Open) {
  const press = useRef(0);
  const cancel = () => clearTimeout(press.current);
  return {
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault();
      open(id, menuPoint(event), event.currentTarget);
    },
    onPointerDown: (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      const target = event.currentTarget;
      const at = { x: event.clientX, y: event.clientY };
      press.current = window.setTimeout(() => open(id, at, target), 500);
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerMove: (event: PointerEvent) => {
      if (event.pointerType === "touch") cancel();
    },
  };
}

/** One person in the call: avatar with speaking ring and badges, name, volume. */
function Bubble({
  person,
  engine,
  open,
}: {
  person: Participant;
  engine: Controller;
  open: Open;
}) {
  const own = person.id === engine.view.id;
  const voice = person.publications.find((p) => p.kind === "voice");
  const sharing = person.publications.some((p) => p.kind === "screen");
  const camera = person.publications.some((p) => p.kind === "camera");
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
  const micOff = person.voiceBlocked || !voice || voice.muted;
  const volume = engine.volumes.get(person.id) ?? 1;
  return (
    <li
      className={`people-bubble ${speaking ? "is-speaking" : ""} ${person.online ? "" : "is-offline"}`}
      style={participantStyle(person.color, engine.participantColors)}
      tabIndex={0}
      aria-label={`${person.name}${own ? ", você" : ""}${speaking ? ", falando" : ""}${person.online ? "" : ", reconectando"}`}
      {...useMenuHandlers(person.id, open)}
    >
      <span className="bubble-avatar">
        <span aria-hidden="true">{initials(person.name)}</span>
        {sharing && (
          <Monitor
            className="bubble-badge is-sharing"
            role="img"
            aria-label="Transmitindo"
          />
        )}
        {micOff && (
          <MicOff
            className="bubble-badge is-muted"
            role="img"
            aria-label={
              person.voiceBlocked
                ? "Silenciado pelo dono"
                : "Microfone desligado"
            }
          />
        )}
        {camera && (
          <button
            type="button"
            className="bubble-badge is-camera"
            aria-label={`Abrir câmera de ${person.name}`}
            title="Abrir câmera"
            onClick={() => engine.cameraRequest?.(person.id)}
          >
            <Video aria-hidden="true" />
          </button>
        )}
      </span>
      <span className="bubble-name">
        <strong title={person.name}>{person.name}</strong>
        {own ? (
          <small>você</small>
        ) : (
          <VolumeNumber
            value={volume}
            reset={() => engine.setPersonVolume(person.id, 1)}
          />
        )}
      </span>
      {!own && (
        <VolumeSlider
          max={2}
          label={`Volume de ${person.name} para você`}
          value={volume}
          onChange={(value) => engine.setPersonVolume(person.id, value)}
        />
      )}
    </li>
  );
}

/** Someone in the room but not in the call: a dimmed avatar and the name. */
function Outside({
  person,
  engine,
  open,
}: {
  person: Participant;
  engine: Controller;
  open: Open;
}) {
  const own = person.id === engine.view.id;
  return (
    <li
      className="people-outside"
      style={participantStyle(person.color, engine.participantColors)}
      tabIndex={0}
      aria-label={`${person.name}${own ? ", você" : ""}, fora da chamada`}
      {...useMenuHandlers(person.id, open)}
    >
      <span className="bubble-avatar" aria-hidden="true">
        <span>{initials(person.name)}</span>
      </span>
      <span className="outside-name">{own ? "você" : person.name}</span>
    </li>
  );
}

/** The strip has no scrolling: three bubbles and "+N" once four do not fit. */
const stripBubbles = 4;

/** Pessoas (#159): who is in the call, with each volume always shown, and who is not. */
export function PeopleWidget({ engine, people, height }: WidgetProps) {
  const menu = usePersonMenu(engine, people);
  const members = engine.view.snapshot?.participants || [];
  const inCall = members.filter((p) => p.inCall);
  const outside = members.filter((p) => !p.inCall);
  const strip = height < 150;
  const shown =
    strip && inCall.length > stripBubbles
      ? inCall.slice(0, stripBubbles - 1)
      : inCall;
  const more = inCall.length - shown.length;
  return (
    <div className={`people-widget ${strip ? "is-strip" : ""}`}>
      {(members.length >= 6 || (strip && !!outside.length)) && (
        <HeaderTools>
          {strip && !!outside.length && (
            <span className="people-outside-count">
              +{outside.length} na sala
            </span>
          )}
          {members.length >= 6 && (
            <RoomLimit count={members.length} threshold={6} />
          )}
        </HeaderTools>
      )}
      {!!inCall.length && (
        <section className="people-group is-call" aria-label="Na chamada">
          {!strip && (
            <h3 className="people-heading">Na chamada · {inCall.length}</h3>
          )}
          <ul className="people-bubbles">
            {shown.map((person) => (
              <Bubble
                key={person.id}
                person={person}
                engine={engine}
                open={menu.open}
              />
            ))}
            {!!more && (
              <li
                className="people-more"
                aria-label={`Mais ${more} na chamada`}
              >
                +{more}
              </li>
            )}
          </ul>
        </section>
      )}
      {!!outside.length && !strip && (
        <section className="people-group is-room" aria-label="Na sala">
          <h3 className="people-heading">Na sala · {outside.length}</h3>
          <ul className="people-outside-list">
            {outside.map((person) => (
              <Outside
                key={person.id}
                person={person}
                engine={engine}
                open={menu.open}
              />
            ))}
          </ul>
        </section>
      )}
      {menu.node}
    </div>
  );
}
