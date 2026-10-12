import { useState } from "react";
import { canManageRoom } from "../../shared/permissions";
import type { Controller } from "../room/controller";
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
  const snapshot = engine.view.snapshot;
  const manages = canManageRoom(snapshot, engine.view.id);
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
  return (
    <>
      <div className="widget-people-summary">
        <span>
          {members.length} {members.length === 1 ? "pessoa" : "pessoas"}
        </span>
        <RoomLimit count={members.length} />
        <button className="text-button" onClick={editColor}>
          Minha cor
        </button>
      </div>
      <p className="field-note">
        O ping mede a conexão de cada pessoa com o servidor. A coroa identifica
        o criador atual da sala.
      </p>
      <div className="people-panel-list">
        {members.map((person) => (
          <section className="person-management" key={person.id}>
            <ParticipantCard
              person={person}
              engine={engine}
              visible
              detailed
              onVisible={() => {}}
              onEditColor={editColor}
            />
            <small>
              {person.role === "creator"
                ? "Criador"
                : person.role === "admin"
                  ? "Administrador"
                  : "Convidado"}
            </small>
            {snapshot?.creatorId === engine.view.id &&
              person.id !== engine.view.id && (
                <details>
                  <summary>Gerenciar {person.name}</summary>
                  <div className="notification-actions">
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        void run("role", {
                          participantId: person.id,
                          action:
                            person.role === "admin" ? "revoke" : "promote",
                        })
                      }
                    >
                      {person.role === "admin"
                        ? "Revogar administrador"
                        : "Tornar administrador"}
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        void run("role", {
                          participantId: person.id,
                          action: "transfer",
                        })
                      }
                    >
                      Transferir posse
                    </button>
                  </div>
                </details>
              )}
            {manages &&
              person.role === "guest" &&
              !!snapshot?.widgets?.length && (
                <details>
                  <summary>Permissões de edição de {person.name}</summary>
                  {snapshot.widgets.map((w) => (
                    <label className="widget-permission" key={w.id}>
                      <input
                        type="checkbox"
                        disabled={busy || w.allGuestsEdit}
                        checked={
                          !!w.allGuestsEdit ||
                          !!w.guestEditors?.includes(person.id)
                        }
                        onChange={(e) =>
                          void run("widget-permission", {
                            id: w.id,
                            participantId: person.id,
                            allowed: e.target.checked,
                          })
                        }
                      />
                      {w.title}
                    </label>
                  ))}
                </details>
              )}
          </section>
        ))}
      </div>
      {manages && !!snapshot?.widgets?.length && (
        <details className="public-permissions">
          <summary>Edição por todos os convidados</summary>
          {snapshot.widgets.map((w) => (
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
    </>
  );
}
