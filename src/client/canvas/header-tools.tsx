import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { User, Users } from "lucide-react";

/** Where a widget body renders its compact header tools (scope, share, edit). */
export const HeaderToolsSlot = createContext<HTMLElement | null>(null);

export function HeaderTools({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderToolsSlot);
  return slot ? createPortal(children, slot) : null;
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
