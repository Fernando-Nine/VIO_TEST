import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { User, Users } from "lucide-react";
import type { MenuItem } from "../components/ContextMenu";

export type Rename = (title: string) => Promise<void>;
export type MenuSource = () => MenuItem[];

/** Bridge between a widget body and its frame's header. */
export const HeaderToolsSlot = createContext<{
  slot: HTMLElement | null;
  setRename: (rename: Rename | undefined) => void;
  setMenu: (menu: MenuSource | undefined) => void;
} | null>(null);

/** Renders compact tools (scope, share, edit) on the widget's title line. */
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

/** Discreet "only you" / "whole room" marker beside the widget title. */
export function ScopeBadge({ shared }: { shared: boolean }) {
  const label = shared ? "Da sala" : "Só para você";
  const Icon = shared ? Users : User;
  return (
    <span
      className={`widget-scope-badge ${shared ? "is-shared" : ""}`}
      role="img"
      aria-label={label}
      title={label}
    >
      <Icon size={14} aria-hidden="true" />
    </span>
  );
}
