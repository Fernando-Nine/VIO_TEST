import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Shield, User, Users } from "lucide-react";
import type { MenuItem } from "../components/ContextMenu";
import { AnchoredPopover } from "../components/AnchoredPopover";
import { roleAllows, roomRole } from "../../shared/permissions";
import type { Snapshot } from "../../shared/protocol";
import type { SharedWidget } from "../../shared/widgets";

export type Rename = (title: string) => Promise<void>;
export type MenuSource = () => MenuItem[];

/** Bridge between a widget body and its frame's header. */
export const HeaderToolsSlot = createContext<{
  slot: HTMLElement | null;
  setRename: (rename: Rename | undefined) => void;
  setMenu: (menu: MenuSource | undefined) => void;
} | null>(null);

/** Renders compact tools (count, help, edit) on the widget's title line. */
export function HeaderTools({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderToolsSlot)?.slot;
  return slot ? createPortal(children, slot) : null;
}

/** Lets the header title be edited in place while `rename` is provided. */
export function useRename(rename: Rename | undefined) {
  const setRename = useContext(HeaderToolsSlot)?.setRename;
  const latest = useRef(rename);
  latest.current = rename;
  const enabled = !!rename;
  useEffect(() => {
    if (!setRename || !enabled) return;
    setRename((title) => latest.current?.(title) ?? Promise.resolve());
    return () => setRename(undefined);
  }, [setRename, enabled]);
}

/** Adds body-specific actions to the header's right-click menu. */
export function useMenuItems(items: MenuItem[] | undefined) {
  const setMenu = useContext(HeaderToolsSlot)?.setMenu;
  const latest = useRef(items);
  latest.current = items;
  const enabled = !!items?.length;
  useEffect(() => {
    if (!setMenu || !enabled) return;
    setMenu(() => latest.current || []);
    return () => setMenu(undefined);
  }, [setMenu, enabled]);
}

export type ControlLevel = "all" | "admins" | "you";
const levels = {
  all: { label: "Todos", icon: Users },
  admins: { label: "Admins", icon: Shield },
  you: { label: "Só você", icon: User },
} as const;
const names = new Intl.ListFormat("pt-BR", { type: "conjunction" });

/** Who controls a widget: room grant, per-widget grant, or just you. */
export function controlOf(
  snapshot: Snapshot | null | undefined,
  widget: SharedWidget | undefined,
): { level: ControlLevel; text: string } {
  if (!widget || !snapshot)
    return { level: "you", text: "Só você vê e controla este widget." };
  const need = widget.kind === "chat" ? "guestChat" : "guestControl";
  if (roleAllows(snapshot.permissions, "guest", need) || widget.allGuestsEdit)
    return { level: "all", text: "Todos na sala controlam este widget." };
  const people = snapshot.participants
    .filter(
      (p) =>
        roomRole(snapshot, p.id) !== "guest" ||
        widget.guestEditors?.includes(p.id),
    )
    .map((p) => p.name);
  return {
    level: "admins",
    text: people.length
      ? `${names.format(people)} ${people.length > 1 ? "controlam" : "controla"} este widget.`
      : "O criador e os administradores controlam este widget.",
  };
}

/** "Todos" / "Admins" / "Só você" beside the title; tap or hover says who. */
export function ControlBadge({
  snapshot,
  widget,
}: {
  snapshot: Snapshot | null | undefined;
  widget: SharedWidget | undefined;
}) {
  const { level, text } = controlOf(snapshot, widget);
  const { label, icon: Icon } = levels[level];
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        ref={anchor}
        type="button"
        className={`widget-control-badge is-${level}`}
        aria-label={`${label}. ${text}`}
        title={text}
        onClick={() => setOpen(!open)}
      >
        <Icon size={13} aria-hidden="true" />
        <span>{label}</span>
      </button>
      {open && (
        <AnchoredPopover
          anchor={anchor}
          id={id}
          role="tooltip"
          className="widget-control-pop"
          close={() => setOpen(false)}
        >
          {text}
        </AnchoredPopover>
      )}
    </>
  );
}
