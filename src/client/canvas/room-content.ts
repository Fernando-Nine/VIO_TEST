import { isModule } from "../../shared/room-modules";

/** Which content a "Para a sala" widget starts with, or null if it is only yours. */
export function roomContentKind(
  type: string,
  scope: "individual" | "room",
): "module" | "timer" | "custom" | "chat" | null {
  if (type === "chat") return "chat";
  if (scope !== "room") return null;
  if (isModule(type)) return "module";
  if (type === "timer" || type === "custom") return type;
  return null;
}
