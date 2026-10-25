import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  danger?: boolean;
  /** Draws a divider above this item. */
  separated?: boolean;
  run: () => void;
}

/**
 * Right-click (or ContextMenu key / Shift+F10) menu at a point. Lives in the
 * top layer so widget clipping never cuts it; closes on Escape, Tab, outside
 * pointer and after an item runs, returning focus to where it came from.
 */
export function ContextMenu({
  at,
  items,
  label,
  close,
  origin,
  header,
  className,
}: {
  at: { x: number; y: number };
  items: MenuItem[];
  /** Controls above the items (a volume slider); arrows stay theirs. */
  header?: ReactNode;
  className?: string;
  label: string;
  close: () => void;
  /**
   * Element the menu belongs to. Gives the right document (the room can live
   * in a PiP window) and keeps the menu inside an open modal dialog, outside
   * of which everything is inert.
   */
  origin?: Element | null;
}) {
  const doc = origin?.ownerDocument || document;
  const container = origin?.closest("dialog[open]") || doc.body;
  const menu = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useLayoutEffect(() => {
    const el = menu.current;
    if (!el) return;
    const win = doc.defaultView;
    const previous = doc.activeElement as HTMLElement | null;
    if ("showPopover" in el) el.showPopover();
    const box = el.getBoundingClientRect();
    const width = win?.innerWidth || box.width;
    const height = win?.innerHeight || box.height;
    el.style.left = `${Math.max(8, Math.min(at.x, width - box.width - 8))}px`;
    el.style.top = `${Math.max(8, Math.min(at.y, height - box.height - 8))}px`;
    el.querySelector<HTMLElement>("input, button")?.focus({
      preventScroll: true,
    });
    const outside = (event: PointerEvent) => {
      if (!el.contains(event.target as Node)) closeRef.current();
    };
    const blur = () => closeRef.current();
    doc.addEventListener("pointerdown", outside, true);
    win?.addEventListener("blur", blur);
    win?.addEventListener("resize", blur);
    return () => {
      doc.removeEventListener("pointerdown", outside, true);
      win?.removeEventListener("blur", blur);
      win?.removeEventListener("resize", blur);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [at.x, at.y, doc]);
  function keys(event: KeyboardEvent) {
    if ((event.target as HTMLElement).matches("input")) {
      // From the header slider, Tab moves into the items instead of closing.
      if (event.key === "Tab" && !event.shiftKey) {
        event.preventDefault();
        menu.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
      if (event.key !== "Escape") return;
    }
    const buttons = [
      ...(menu.current?.querySelectorAll<HTMLButtonElement>("button") || []),
    ];
    const index = buttons.indexOf(event.target as HTMLButtonElement);
    const move = (to: number) => {
      event.preventDefault();
      buttons[(to + buttons.length) % buttons.length]?.focus();
    };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(buttons.length - 1);
    else if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }
  return createPortal(
    <div
      ref={menu}
      className={`context-menu${className ? ` ${className}` : ""}`}
      role="menu"
      aria-label={label}
      popover="manual"
      onKeyDown={keys}
      onContextMenu={(e) => e.preventDefault()}
    >
      {header}
      {items.map(({ label, icon: Icon, danger, separated, run }) => (
        <button
          key={label}
          role="menuitem"
          tabIndex={-1}
          className={
            [danger && "is-danger", separated && "is-separated"]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onClick={() => {
            close();
            run();
          }}
        >
          {Icon && <Icon size={15} aria-hidden="true" />}
          <span>{label}</span>
        </button>
      ))}
    </div>,
    container,
  );
}
