import { useCallback, useRef, useState } from "react";
import {
  AudioLines,
  Crown,
  HeadphoneOff,
  MicOff,
  Monitor,
  MoreHorizontal,
  VolumeX,
  ShieldCheck,
} from "lucide-react";
import {
  canManageRoom,
  canSetPermission,
  permissionText,
  roomRole,
} from "../../shared/permissions";
import {
  defaultPermissions,
  type Participant,
  type RoomPermission,
} from "../../shared/protocol";
import type { Controller } from "../room/controller";
import { menuPoint, usePersonMenu } from "./PersonMenu";
import { useSpeaking } from "./Media";
import { participantStyle } from "./participant-style";
import { RoomLimit } from "./RoomStatus";

/** One 48 px row: avatar, name, role and call state (never by color alone). */
function PersonRow({
  person,
  engine,
  openMenu,
  hasMenu,
}: {
  person: Participant;
  engine: Controller;
  openMenu: (at: { x: number; y: number }, origin: Element) => void;
  hasMenu: boolean;
}) {
  const own = person.id === engine.view.id;
  const voice = person.publications.find((p) => p.kind === "voice");
  const screen = person.publications.find((p) => p.kind === "screen");
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
  const creator = engine.view.snapshot?.creatorId === person.id;
  const press = useRef(0);
  const silenced = !own && engine.volumes.get(person.id) === 0;
  const state = !person.online
    ? { icon: HeadphoneOff, label: "Reconectando", tone: "is-away" }
    : person.voiceBlocked
      ? { icon: MicOff, label: "Silenciado pelo dono", tone: "is-blocked" }
      : !person.inCall
        ? { icon: HeadphoneOff, label: "Fora da chamada", tone: "is-away" }
        : speaking
          ? { icon: AudioLines, label: "Falando", tone: "is-speaking" }
          : !voice || voice.muted
            ? { icon: MicOff, label: "Microfone desligado", tone: "is-muted" }
            : null;
  return (
    <li
      className={`person-row ${speaking ? "speaking" : ""}`}
      style={participantStyle(person.color, engine.participantColors)}
      onContextMenu={(event) => {
        if (!hasMenu) return;
        event.preventDefault();
        openMenu(menuPoint(event), event.currentTarget);
      }}
      // Touch: a long press opens the same menu.
      onPointerDown={(event) => {
        if (event.pointerType !== "touch" || !hasMenu) return;
        const target = event.currentTarget;
        const at = { x: event.clientX, y: event.clientY };
        press.current = window.setTimeout(() => openMenu(at, target), 500);
      }}
      onPointerUp={() => clearTimeout(press.current)}
      onPointerCancel={() => clearTimeout(press.current)}
      onPointerMove={(event) => {
        if (event.pointerType === "touch") clearTimeout(press.current);
      }}
    >
      <span className="person-avatar" aria-hidden="true">
        {[...person.name].slice(0, 2).join("").toUpperCase()}
      </span>
      <span className="person-name">
        <strong title={person.name}>{person.name}</strong>
        {own && <small>você</small>}
        {creator && (
          <Crown
            size={14}
            className="room-creator"
            role="img"
            aria-label="Criador da sala"
          />
        )}
        {person.role === "admin" && (
          <ShieldCheck
            size={14}
            className="room-admin"
            role="img"
            aria-label="Administrador"
          />
        )}
      </span>
      <span className="person-state">
        {screen && (
          <Monitor
            size={16}
            className="is-sharing"
            role="img"
            aria-label="Transmitindo"
          />
        )}
        {silenced && (
          <VolumeX
            size={16}
            className="is-away"
            role="img"
            aria-label="Silenciado para você"
          />
        )}
        {state && (
          <state.icon
            size={16}
            className={state.tone}
            role="img"
            aria-label={state.label}
          />
        )}
      </span>
      {hasMenu && (
        <button
          className="icon-button person-more"
          aria-label={`Ações de ${person.name}`}
          aria-haspopup="menu"
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            openMenu(
              { x: box.right - 220, y: box.bottom + 4 },
              event.currentTarget,
            );
          }}
        >
          <MoreHorizontal size={17} />
        </button>
      )}
    </li>
  );
}

export function PeoplePanel({
  engine,
  editColor,
}: {
  engine: Controller;
  editColor: () => void;
}) {
  const members = engine.view.snapshot?.participants || [];
  const [tab, setTab] = useState<"people" | "permissions">("people");
  const snapshot = engine.view.snapshot;
  const manages = canManageRoom(snapshot, engine.view.id);
  const menu = usePersonMenu(engine, editColor, { volume: true });
  const { run, busy } = menu;
  return (
    <>
      {manages && (
        <div className="people-tabs" role="tablist" aria-label="Pessoas">
          {(
            [
              ["people", `Pessoas · ${members.length}`],
              ["permissions", "Permissões"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {tab === "people" && (
        <>
          {members.length >= 6 && (
            <div className="widget-people-summary">
              <span>{members.length} pessoas</span>
              <RoomLimit count={members.length} />
            </div>
          )}
          <ul className="people-panel-list">
            {members.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                engine={engine}
                hasMenu={!busy}
                openMenu={(at, origin) => menu.open(person.id, at, origin)}
              />
            ))}
          </ul>
        </>
      )}
      {tab === "permissions" && manages && snapshot && (
        <div className="room-permissions">
          {(
            [
              ["Convidados podem", "guest"],
              ["Administradores podem", "admin"],
            ] as const
          ).map(([heading, prefix]) => (
            <fieldset key={prefix}>
              <legend>
                {prefix === "admin" && (
                  <Crown size={14} className="room-creator" aria-hidden />
                )}
                {heading}
              </legend>
              {(Object.keys(defaultPermissions) as RoomPermission[])
                .filter((key) => key.startsWith(prefix))
                .map((key) => {
                  const allowed = canSetPermission(
                    roomRole(snapshot, engine.view.id),
                    key,
                  );
                  const text = permissionText[key];
                  return (
                    <label
                      className="toggle"
                      key={key}
                      title={allowed ? undefined : "Só o criador altera."}
                    >
                      <span>{text[0].toUpperCase() + text.slice(1)}</span>
                      <input
                        type="checkbox"
                        role="switch"
                        disabled={busy || !allowed}
                        checked={
                          (snapshot.permissions || defaultPermissions)[key]
                        }
                        onChange={(e) =>
                          void run("room-permissions", {
                            permissions: { [key]: e.target.checked },
                          })
                        }
                      />
                    </label>
                  );
                })}
            </fieldset>
          ))}
        </div>
      )}
      {menu.node}
    </>
  );
}
