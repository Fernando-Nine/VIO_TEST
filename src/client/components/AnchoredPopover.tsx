import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/** Top layer escapes widget clipping; the portal is also the older-browser fallback. */
export function AnchoredPopover({
  anchor,
  id,
  className,
  children,
  close,
  role = "group",
}: {
  anchor: RefObject<HTMLElement | null>;
  id: string;
  className: string;
  children: ReactNode;
  close: () => void;
  role?: "group" | "tooltip";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const doc = anchor.current?.ownerDocument || document;
  const supported = "showPopover" in HTMLElement.prototype;
  useLayoutEffect(() => {
    const el = panel.current;
    const trigger = anchor.current;
    const win = doc.defaultView;
    if (!el || !trigger || !win) return;
    if (supported) el.showPopover();
    const position = () => {
      const box = trigger.getBoundingClientRect();
      el.style.left = `${Math.max(8, Math.min(win.innerWidth - el.offsetWidth - 8, box.right - el.offsetWidth))}px`;
      el.style.top = `${Math.max(8, Math.min(box.bottom + 6, win.innerHeight - el.offsetHeight - 8))}px`;
    };
    position();
    const resize = new ResizeObserver(position);
    resize.observe(el);
    win.addEventListener("resize", position);
    doc.addEventListener("scroll", position, true);
    const dismiss = (event: PointerEvent) => {
      if (
        !el.contains(event.target as Node) &&
        !trigger.contains(event.target as Node)
      )
        close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        trigger.focus({ preventScroll: true });
      }
    };
    doc.addEventListener("pointerdown", dismiss);
    doc.addEventListener("keydown", escape);
    return () => {
      resize.disconnect();
      if (supported && el.matches(":popover-open")) el.hidePopover();
      win.removeEventListener("resize", position);
      doc.removeEventListener("scroll", position, true);
      doc.removeEventListener("pointerdown", dismiss);
      doc.removeEventListener("keydown", escape);
    };
  }, [anchor, doc, supported, close]);
  return createPortal(
    <div
      ref={panel}
      id={id}
      role={role}
      popover={supported ? "manual" : undefined}
      className={`anchored-popover ${className}`}
    >
      {children}
    </div>,
    doc.fullscreenElement || doc.body,
  );
}
