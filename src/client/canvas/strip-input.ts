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
    const scrollable = (event: Event, delta: number) => {
      const body = (event.target as HTMLElement).closest<HTMLElement>(
        ".widget-body",
      );
      return (
        body &&
        body.scrollHeight > body.clientHeight + 2 &&
        (delta < 0
          ? body.scrollTop > 0
          : body.scrollTop + body.clientHeight < body.scrollHeight - 2)
      );
    };
    const wheel = (event: WheelEvent) => {
      const element = host(event);
      if (
        !element ||
        event.ctrlKey ||
        interactive(event) ||
        scrollable(event, event.deltaY)
      )
        return;
      event.preventDefault();
      const delta =
        (event.deltaX || event.deltaY) *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? scroller.clientHeight
            : 1);
      scroller.scrollBy({
        [element.dataset.stripAxis === "x" ? "left" : "top"]: delta,
        behavior: "instant",
      });
    };
    const down = (event: PointerEvent) => {
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
    viewport.addEventListener("wheel", wheel, { passive: false });
    viewport.addEventListener("pointerdown", down);
    viewport.addEventListener("pointermove", move);
    viewport.addEventListener("pointerup", up);
    viewport.addEventListener("pointercancel", up);
    viewport.addEventListener("click", click, true);
    return () => {
      clearTimeout(resetClick);
      scroller.style.removeProperty("scroll-snap-type");
      viewport.removeEventListener("wheel", wheel);
      viewport.removeEventListener("pointerdown", down);
      viewport.removeEventListener("pointermove", move);
      viewport.removeEventListener("pointerup", up);
      viewport.removeEventListener("pointercancel", up);
      viewport.removeEventListener("click", click, true);
    };
  }, [enabled, root, strip]);
}
