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
        quem criou a sala.
      </p>
      <div className="people-panel-list">
        {members.map((person) => (
          <ParticipantCard
            key={person.id}
            person={person}
            engine={engine}
            visible
            detailed
            onVisible={() => {}}
            onEditColor={editColor}
          />
        ))}
      </div>
    </>
  );
}
