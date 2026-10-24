import {
  defaultPermissions,
  type RoomPermission,
  type RoomPermissions,
  type Snapshot,
} from "./protocol";
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
/** `need`: editing (default) or controlling (timers, alarms, polls, tasks). */
export function canEditPublic(
  snapshot: Snapshot | null | undefined,
  id: string,
  widget: SharedWidget,
  need: "guestEdit" | "guestControl" = "guestEdit",
) {
  return (
    !!snapshot &&
    canUseWidget(snapshot.permissions, roomRole(snapshot, id), id, widget, need)
  );
}

export type RoomRole = "creator" | "admin" | "guest";
/** Portuguese wording shared by the switches and the server's refusals. */
export const permissionText: Record<RoomPermission, string> = {
  guestControl:
    "controlar widgets da sala (cronômetro, alarme, iniciar e pausar)",
  guestEdit: "editar widgets públicos",
  guestShare: "compartilhar widgets sem pedir aprovação",
  guestRequest: "pedir para compartilhar widgets",
  guestChat: "enviar mensagens no chat",
  guestScreen: "compartilhar tela",
  guestVoice: "falar na chamada",
  guestCamera: "ligar a câmera",
  adminCreate: "adicionar widgets coletivos",
  adminClose: "encerrar widgets de outras pessoas",
};
/** Who may flip each switch: admin switches belong to the creator alone. */
export function canSetPermission(role: RoomRole, key: RoomPermission) {
  return role === "creator" || (role === "admin" && key.startsWith("guest"));
}
/** Room-wide grant for a role; per-widget grants are checked separately. */
export function roleAllows(
  permissions: RoomPermissions | undefined,
  role: RoomRole,
  key: RoomPermission,
) {
  const p = permissions || defaultPermissions;
  if (role === "creator") return true;
  if (key.startsWith("admin")) return role === "admin" && p[key];
  return role === "admin" || p[key];
}
export function roomRole(
  snapshot: Pick<Snapshot, "creatorId" | "participants">,
  id: string,
): RoomRole {
  return snapshot.creatorId === id
    ? "creator"
    : snapshot.participants.find((p) => p.id === id)?.role === "admin"
      ? "admin"
      : "guest";
}
/** Use one shared widget (edit, control, chat): room grant or per-widget grant (E7). */
export function canUseWidget(
  permissions: RoomPermissions | undefined,
  role: RoomRole,
  id: string,
  widget: SharedWidget,
  need: RoomPermission,
) {
  return (
    roleAllows(permissions, role, need) ||
    !!widget.allGuestsEdit ||
    !!widget.guestEditors?.includes(id)
  );
}
