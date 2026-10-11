import {
  nearestStop,
  wheelPixels,
  wheelTarget,
  WHEEL_IDLE_MS,
  STRIP_ANIMATION_MS,
} from "./strip-wheel";
import { useEffect, type RefObject } from "react";

/** The stable media layer is a sibling of the scroller, so forward gestures
 * from strip hosts without stealing scroll from a widget's own long content. */
export function useStripInput(
  root: RefObject<HTMLDivElement | null>,
  strip: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const viewport = root.current,
      scroller = strip.current;
    if (!enabled || !viewport || !scroller) return;
    let swipe:
      | {
          pointer: number;
          x: number;
          y: number;
          left: number;
          top: number;
          axis: string;
          moved: boolean;
        }
      | undefined;
    let suppressClick = false;
    let resetClick: ReturnType<typeof setTimeout>;
    const host = (event: Event) =>
      (event.target as HTMLElement).closest<HTMLElement>(
        ".widget-host[data-strip-axis]",
      );
    const interactive = (event: Event) =>
      !!(event.target as HTMLElement).closest(
        "button,input,textarea,select,a,[contenteditable]",
      );
    let frame = 0;
    let idle: ReturnType<typeof setTimeout>;
    let lastWheel = -Infinity;
    let continuous = false;
    const win = viewport.ownerDocument.defaultView!;
    const horizontal = () =>
      win.getComputedStyle(scroller).gridAutoFlow === "column";
    const metrics = () => {
      const x = horizontal();
      const nodes = [...scroller.querySelectorAll<HTMLElement>(".canvas-slot")];
      const offset = (node: HTMLElement) =>
        x ? node.offsetLeft : node.offsetTop;
      return {
        x,
        position: x ? scroller.scrollLeft : scroller.scrollTop,
        maximum: Math.max(
          0,
          x
            ? scroller.scrollWidth - scroller.clientWidth
            : scroller.scrollHeight - scroller.clientHeight,
        ),
        stops: nodes.map(
          (node) => offset(node) - (nodes[0] ? offset(nodes[0]) : 0),
        ),
      };
    };
    const write = (position: number) =>
      scroller.scrollTo({
        [horizontal() ? "left" : "top"]: position,
        behavior: "instant",
      });
    const restoreSnap = () => scroller.style.removeProperty("scroll-snap-type");
    const animate = (target: number) => {
      win.cancelAnimationFrame(frame);
      const from = metrics().position;
      if (win.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        write(target);
        restoreSnap();
        return;
      }
      const started = win.performance.now();
      const tick = (time: number) => {
        const progress = Math.min(1, (time - started) / STRIP_ANIMATION_MS);
        write(from + (target - from) * (1 - (1 - progress) ** 3));
        if (progress < 1) frame = win.requestAnimationFrame(tick);
        else {
          frame = 0;
          restoreSnap();
        }
      };
      frame = win.requestAnimationFrame(tick);
    };
    const scrollable = (event: WheelEvent, delta: number) => {
      // Give nested editors first refusal, including a textarea inside a scrolling body.
      for (
        let node = event.target as HTMLElement | null;
        node && node !== viewport;
        node = node.parentElement
      ) {
        if (node === scroller) break;
        const style = win.getComputedStyle(node);
        const x = Math.abs(event.deltaX) > Math.abs(event.deltaY);
        const overflow = x ? style.overflowX : style.overflowY;
        if (!/(auto|scroll)/.test(overflow)) continue;
        const position = x ? node.scrollLeft : node.scrollTop;
        const maximum = x
          ? node.scrollWidth - node.clientWidth
          : node.scrollHeight - node.clientHeight;
        if (maximum > 2 && (delta < 0 ? position > 0 : position < maximum - 2))
          return true;
      }
      return false;
    };
    const wheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.ctrlKey ||
        (!host(event) &&
          !scroller.contains(target) &&
          !target.closest(".strip-controls"))
      )
        return;
      const m = metrics();
      const raw =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      const delta = wheelPixels(
        raw,
        event.deltaMode,
        m.x ? scroller.clientWidth : scroller.clientHeight,
      );
      if (!delta || scrollable(event, delta) || m.maximum === 0) return;
      event.preventDefault();
      const now = win.performance.now();
      continuous = now - lastWheel < WHEEL_IDLE_MS;
      lastWheel = now;
      clearTimeout(idle);
      win.cancelAnimationFrame(frame);
      scroller.style.scrollSnapType = "none";
      const destination = wheelTarget(
        m.position,
        delta,
        m.stops,
        m.maximum,
        continuous,
      );
      if (continuous) write(destination);
      else animate(destination);
      idle = setTimeout(() => {
        if (continuous) {
          const latest = metrics();
          animate(nearestStop(latest.position, latest.stops, latest.maximum));
        }
        continuous = false;
        lastWheel = -Infinity;
      }, WHEEL_IDLE_MS);
    };
    const down = (event: PointerEvent) => {
      win.cancelAnimationFrame(frame);
      clearTimeout(idle);
      lastWheel = -Infinity;
      restoreSnap();
      const element = host(event);
      if (
        event.pointerType !== "touch" ||
        !element ||
        interactive(event) ||
        (event.target as HTMLElement).closest(".widget-header")
      )
        return;
      const body = element.querySelector<HTMLElement>(".widget-body");
      if (
        element.dataset.stripAxis === "y" &&
        body &&
        body.scrollHeight > body.clientHeight + 2
      )
        return;
      swipe = {
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: scroller.scrollLeft,
        top: scroller.scrollTop,
        axis: element.dataset.stripAxis!,
        moved: false,
      };
    };
    const move = (event: PointerEvent) => {
      if (!swipe || swipe.pointer !== event.pointerId) return;
      const delta =
        swipe.axis === "x" ? event.clientX - swipe.x : event.clientY - swipe.y;
      if (!swipe.moved && Math.abs(delta) < 8) return;
      swipe.moved = true;
      suppressClick = true;
      scroller.style.scrollSnapType = "none";
      viewport.setPointerCapture(event.pointerId);
      scroller.scrollTo({
        left: swipe.left - (swipe.axis === "x" ? delta : 0),
        top: swipe.top - (swipe.axis === "y" ? delta : 0),
        behavior: "instant",
      });
    };
    const up = () => {
      swipe = undefined;
      scroller.style.removeProperty("scroll-snap-type");
      clearTimeout(resetClick);
      resetClick = setTimeout(() => {
        suppressClick = false;
      }, 350);
    };
    const click = (event: MouseEvent) => {
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
      }
    };
    viewport.addEventListener("wheel", wheel, {
      passive: false,
      capture: true,
    });
    viewport.addEventListener("pointerdown", down);
    viewport.addEventListener("pointermove", move);
    viewport.addEventListener("pointerup", up);
    viewport.addEventListener("pointercancel", up);
    viewport.addEventListener("click", click, true);
    return () => {
      clearTimeout(resetClick);
      clearTimeout(idle);
      win.cancelAnimationFrame(frame);
      scroller.style.removeProperty("scroll-snap-type");
      viewport.removeEventListener("wheel", wheel, true);
      viewport.removeEventListener("pointerdown", down);
      viewport.removeEventListener("pointermove", move);
      viewport.removeEventListener("pointerup", up);
      viewport.removeEventListener("pointercancel", up);
      viewport.removeEventListener("click", click, true);
    };
  }, [enabled, root, strip]);
}
