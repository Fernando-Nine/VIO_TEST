import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { popoverPosition } from "./popover-position";

/** Top layer escapes widget clipping; the portal is also the older-browser fallback. */
export function AnchoredPopover({
  anchor,
  id,
  className,
  children,
  close,
  role = "group",
  label,
  side = "below",
  onPointerEnter,
  onPointerLeave,
}: {
  anchor: RefObject<HTMLElement | null>;
  id: string;
  className: string;
  children: ReactNode;
  close: () => void;
  role?: "group" | "tooltip";
  label?: string;
  side?: "above" | "below";
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const dismissRef = useRef(close);
  dismissRef.current = close;
  const doc = anchor.current?.ownerDocument || document;
  const supported = "showPopover" in HTMLElement.prototype;
  useLayoutEffect(() => {
    const el = panel.current;
    const trigger = anchor.current;
    const win = doc.defaultView;
    if (!el || !trigger || !win) return;
    if (supported) el.showPopover();
    const position = () => {
      if (
        !trigger.isConnected ||
        trigger.closest("[inert], [hidden]") ||
        win.getComputedStyle(trigger).visibility === "hidden"
      ) {
        dismissRef.current();
        return;
      }
      const box = trigger.getBoundingClientRect();
      const visual = win.visualViewport;
      const viewport = {
        left: visual?.offsetLeft || 0,
        top: visual?.offsetTop || 0,
        width: visual?.width || win.innerWidth,
        height: visual?.height || win.innerHeight,
      };
      el.style.maxWidth = `${Math.max(0, viewport.width - 16)}px`;
      el.style.maxHeight = `${Math.max(0, viewport.height - 16)}px`;
      const point = popoverPosition(
        box,
        { width: el.offsetWidth, height: el.offsetHeight },
        viewport,
        side,
      );
      el.style.left = `${point.left}px`;
      el.style.top = `${point.top}px`;
    };
    position();
    const resize = new ResizeObserver(position);
    resize.observe(el);
    resize.observe(trigger);
    const host = trigger.closest(".widget-host");
    const movement = new MutationObserver(position);
    if (host)
      movement.observe(host, {
        attributes: true,
        attributeFilter: ["style", "class", "inert"],
      });
    win.addEventListener("resize", position);
    win.visualViewport?.addEventListener("resize", position);
    win.visualViewport?.addEventListener("scroll", position);
    doc.addEventListener("scroll", position, true);
    const dismiss = (event: PointerEvent) => {
      if (
        !el.contains(event.target as Node) &&
        !trigger.contains(event.target as Node)
      )
        dismissRef.current();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        dismissRef.current();
        trigger.focus({ preventScroll: true });
      }
    };
    doc.addEventListener("pointerdown", dismiss);
    doc.addEventListener("keydown", escape);
    const fullscreen = () => dismissRef.current();
    doc.addEventListener("fullscreenchange", fullscreen);
    return () => {
      resize.disconnect();
      movement.disconnect();
      if (supported && el.matches(":popover-open")) el.hidePopover();
      win.removeEventListener("resize", position);
      win.visualViewport?.removeEventListener("resize", position);
      win.visualViewport?.removeEventListener("scroll", position);
      doc.removeEventListener("scroll", position, true);
      doc.removeEventListener("pointerdown", dismiss);
      doc.removeEventListener("keydown", escape);
      doc.removeEventListener("fullscreenchange", fullscreen);
    };
  }, [anchor, doc, supported, side]);
  return createPortal(
    <div
      ref={panel}
      id={id}
      role={role}
      aria-label={label}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      popover={supported ? "manual" : undefined}
      className={`anchored-popover ${className}`}
    >
      {children}
    </div>,
    doc.fullscreenElement || doc.body,
  );
}
