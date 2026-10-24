import { useState } from "react";
import {
  Crown,
  KeyRound,
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
import { ParticipantCard } from "./ParticipantCard";
import { RoomLimit } from "./RoomStatus";

export function PeoplePanel({
  engine,
  editColor,
}: {
  engine: Controller;
  editColor: () => void;
}) {
  const members = engine.view.snapshot?.participants || [];
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{
    person: Participant;
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
    const items: MenuItem[] = [];
    if (creator)
      items.push(
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
      items.push({
        label: "Permissões de edição",
        icon: KeyRound,
        run: () => setPermissionsOf(person.id),
      });
    if (creator)
      items.push({
        label: "Transferir posse da sala",
        icon: Crown,
        danger: true,
        run: () => setTransferTo(person),
      });
    return items;
  }
  const permissionsPerson = members.find((p) => p.id === permissionsOf);
  return (
    <>
      {members.length >= 6 && (
        <div className="widget-people-summary">
          <span>{members.length} pessoas</span>
          <RoomLimit count={members.length} />
        </div>
      )}
      <ul className="people-panel-list">
        {members.map((person) => {
          const items = actions(person);
          const open = (at: { x: number; y: number }, origin: Element) =>
            setMenu({ person, at, origin });
          return (
            <li
              className="person-row"
              key={person.id}
              onContextMenu={(event) => {
                if (!items.length || busy) return;
                event.preventDefault();
                const box = event.currentTarget.getBoundingClientRect();
                open(
                  event.clientX || event.clientY
                    ? { x: event.clientX, y: event.clientY }
                    : { x: box.left + 12, y: box.top + 12 },
                  event.currentTarget,
                );
              }}
            >
              <ParticipantCard
                person={person}
                engine={engine}
                visible
                detailed
                onVisible={() => {}}
                onEditColor={editColor}
              />
              {items.length > 0 && (
                <button
                  className="icon-button person-more"
                  aria-label={`Ações de ${person.name}`}
                  aria-haspopup="menu"
                  disabled={busy}
                  onClick={(event) => {
                    const box = event.currentTarget.getBoundingClientRect();
                    open(
                      { x: box.right - 190, y: box.bottom + 4 },
                      event.currentTarget,
                    );
                  }}
                >
                  <MoreHorizontal size={17} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {manages && snapshot && (
        <details className="public-permissions room-permissions">
          <summary>Permissões da sala</summary>
          {(
            [
              ["Convidados podem", "guest"],
              ["Administradores podem", "admin"],
            ] as const
          ).map(([heading, prefix]) => (
            <fieldset key={prefix}>
              <legend>{heading}</legend>
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
        </details>
      )}
      {manages && !!widgets.length && (
        <details className="public-permissions">
          <summary>Edição por todos os convidados</summary>
          {widgets.map((w) => (
            <label className="widget-permission" key={w.id}>
              <input
                type="checkbox"
                disabled={busy}
                checked={!!w.allGuestsEdit}
                onChange={(e) =>
                  void run("widget-permission", {
                    id: w.id,
                    allGuests: true,
                    allowed: e.target.checked,
                  })
                }
              />
              {w.title}
            </label>
          ))}
        </details>
      )}
      {error && <p role="alert">{error}</p>}
      {menu && (
        <ContextMenu
          at={menu.at}
          origin={menu.origin}
          items={actions(menu.person)}
          label={`Ações de ${menu.person.name}`}
          close={() => setMenu(null)}
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
