import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { User, Users } from "lucide-react";

export type Rename = (title: string) => Promise<void>;

/** Bridge between a widget body and its frame's header. */
export const HeaderToolsSlot = createContext<{
  slot: HTMLElement | null;
  setRename: (rename: Rename | undefined) => void;
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
