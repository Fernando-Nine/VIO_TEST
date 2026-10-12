import type { Snapshot } from "./protocol";
import type { SharedWidget } from "./widgets";
export function canManageRoom(
  snapshot: Snapshot | null | undefined,
  id: string,
) {
  return (
    !!snapshot &&
    (snapshot.creatorId === id ||
      snapshot.participants.find((p) => p.id === id)?.role === "admin")
  );
}
export function canEditPublic(
  snapshot: Snapshot | null | undefined,
  id: string,
  widget: SharedWidget,
) {
  return (
    canManageRoom(snapshot, id) ||
    !!widget.allGuestsEdit ||
    !!widget.guestEditors?.includes(id)
  );
}
