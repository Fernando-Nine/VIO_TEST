import { useCallback, useRef, useState } from "react";
import {
  AudioLines,
  Crown,
  Eye,
  HeadphoneOff,
  KeyRound,
  MicOff,
  Monitor,
  MoreHorizontal,
  Palette,
  ShieldCheck,
  ShieldOff,
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
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { Dialog } from "./Dialog";
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
  const state = !person.online
    ? { icon: HeadphoneOff, label: "Reconectando", tone: "is-away" }
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
        const box = event.currentTarget.getBoundingClientRect();
        openMenu(
          event.clientX || event.clientY
            ? { x: event.clientX, y: event.clientY }
            : { x: box.left + 12, y: box.bottom },
          event.currentTarget,
        );
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{
    id: string;
    at: { x: number; y: number };
    origin: Element;
  } | null>(null);
  const [permissionsOf, setPermissionsOf] = useState<string | null>(null);
  const [transferTo, setTransferTo] = useState<Participant | null>(null);
  const snapshot = engine.view.snapshot;
  const manages = canManageRoom(snapshot, engine.view.id);
  const creator = snapshot?.creatorId === engine.view.id;
  const widgets = snapshot?.widgets || [];
  async function run(
    action: Parameters<Controller["request"]>[0],
    data: unknown,
  ) {
    setBusy(true);
    setError("");
    try {
      await engine.request(action, data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível alterar a permissão.",
      );
    } finally {
      setBusy(false);
    }
  }
  function actions(person: Participant): MenuItem[] {
    if (person.id === engine.view.id)
      return [{ label: "Minha cor", icon: Palette, run: editColor }];
    // Groups in a fixed order (watch, voice, room roles); each non-empty
    // group after the first opens with a separator. Voice is filled by #122.
    const watch: MenuItem[] = [];
    const voice: MenuItem[] = [];
    const room: MenuItem[] = [];
    const screen = person.publications.find((p) => p.kind === "screen");
    if (screen && !engine.view.watching.includes(screen.id))
      watch.push({
        label: "Assistir a tela",
        icon: Eye,
        run: () => engine.watch(screen.id, true),
      });
    if (creator)
      room.push(
        person.role === "admin"
          ? {
              label: "Revogar administrador",
              icon: ShieldOff,
              run: () =>
                void run("role", {
                  participantId: person.id,
                  action: "revoke",
                }),
            }
          : {
              label: "Tornar administrador",
              icon: ShieldCheck,
              run: () =>
                void run("role", {
                  participantId: person.id,
                  action: "promote",
                }),
            },
      );
    if (manages && person.role === "guest" && widgets.length)
      room.push({
        label: "Permissões de edição",
        icon: KeyRound,
        run: () => setPermissionsOf(person.id),
      });
    if (creator)
      room.push({
        label: "Transferir posse da sala",
        icon: Crown,
        danger: true,
        run: () => setTransferTo(person),
      });
    return [watch, voice, room]
      .filter((group) => group.length)
      .flatMap((group, i) =>
        group.map((item, j) => (i && !j ? { ...item, separated: true } : item)),
      );
  }
  const menuPerson = members.find((p) => p.id === menu?.id);
  const permissionsPerson = members.find((p) => p.id === permissionsOf);
  const volume = menuPerson && engine.volumes.get(menuPerson.id);
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
                openMenu={(at, origin) =>
                  setMenu({ id: person.id, at, origin })
                }
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
      {error && <p role="alert">{error}</p>}
      {menu && menuPerson && (
        <ContextMenu
          at={menu.at}
          origin={menu.origin}
          className="person-menu"
          items={actions(menuPerson)}
          label={`Ações de ${menuPerson.name}`}
          close={() => setMenu(null)}
          header={
            menuPerson.id !== engine.view.id && (
              <label className="person-menu-volume">
                <span>
                  Volume <output>{Math.round((volume ?? 1) * 100)}%</output>
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step=".05"
                  aria-label={`Volume de ${menuPerson.name} para você`}
                  value={volume ?? 1}
                  onChange={(event) => {
                    engine.volumes.set(menuPerson.id, +event.target.value);
                    engine.bump();
                  }}
                />
              </label>
            )
          }
        />
      )}
      {permissionsPerson && (
        <Dialog
          title={`Edição por ${permissionsPerson.name}`}
          centered
          close={() => setPermissionsOf(null)}
        >
          {widgets.map((w) => (
            <label className="widget-permission" key={w.id}>
              <input
                type="checkbox"
                disabled={busy || w.allGuestsEdit}
                checked={
                  !!w.allGuestsEdit ||
                  !!w.guestEditors?.includes(permissionsPerson.id)
                }
                onChange={(e) =>
                  void run("widget-permission", {
                    id: w.id,
                    participantId: permissionsPerson.id,
                    allowed: e.target.checked,
                  })
                }
              />
              {w.title}
            </label>
          ))}
        </Dialog>
      )}
      {transferTo && (
        <Dialog
          title={`Transferir a sala para ${transferTo.name}?`}
          centered
          close={() => setTransferTo(null)}
        >
          <p>Você deixa de ser o criador e passa a ser administrador.</p>
          <div className="notification-actions">
            <button
              className="primary"
              disabled={busy}
              onClick={() => {
                const id = transferTo.id;
                setTransferTo(null);
                void run("role", { participantId: id, action: "transfer" });
              }}
            >
              Transferir
            </button>
            <button className="secondary" onClick={() => setTransferTo(null)}>
              Cancelar
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
