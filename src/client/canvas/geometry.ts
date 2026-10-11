import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CanvasState, Placement } from "./model";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SlotBox extends Box {
  visible: boolean;
  clip: string;
}
export function overlap(a: Box, b: Box) {
  const x = Math.max(a.x, b.x),
    y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
    height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y),
  };
}
export function relativeBox(rect: DOMRect, parent: DOMRect): Box {
  return {
    x: rect.left - parent.left,
    y: rect.top - parent.top,
    width: rect.width,
    height: rect.height,
  };
}
export function floatingBox(
  rect: Placement,
  bounds: Box,
  minimum = { width: 180, height: 120 },
): Box {
  const width = Math.min(
    bounds.width,
    Math.max(minimum.width, rect.width * bounds.width),
  );
  const height = Math.min(
    bounds.height,
    Math.max(minimum.height, rect.height * bounds.height),
  );
  return {
    x: Math.max(0, Math.min(bounds.width - width, rect.x * bounds.width)),
    y: Math.max(0, Math.min(bounds.height - height, rect.y * bounds.height)),
    width,
    height,
  };
}

/** Slot DOM provides geometry; media hosts keep a single, stable React parent. */
export function useCanvasGeometry(state: CanvasState) {
  const root = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const observer = useRef<ResizeObserver | null>(null);
  const intersections = useRef<IntersectionObserver | null>(null);
  const visible = useRef(new Set<string>());
  const [geometry, setGeometry] = useState<{
    bounds: Box;
    slots: Map<string, SlotBox>;
    strip: Box | null;
  }>({
    bounds: { x: 0, y: 0, width: 1, height: 1 },
    slots: new Map(),
    strip: null,
  });
  const measure = useCallback(() => {
    const element = root.current;
    if (!element) return;
    const base = element.getBoundingClientRect();
    const bounds = { x: 0, y: 0, width: base.width, height: base.height };
    const stripBox = strip.current
      ? relativeBox(strip.current.getBoundingClientRect(), base)
      : null;
    const slots = new Map<string, SlotBox>();
    for (const [id, node] of elements.current) {
      const box = relativeBox(node.getBoundingClientRect(), base);
      const region =
        stripBox && strip.current?.contains(node)
          ? overlap(bounds, stripBox)
          : bounds;
      const intersection = overlap(box, region);
      const clip = `inset(${Math.max(0, intersection.y - box.y)}px ${Math.max(0, box.x + box.width - intersection.x - intersection.width)}px ${Math.max(0, box.y + box.height - intersection.y - intersection.height)}px ${Math.max(0, intersection.x - box.x)}px)`;
      slots.set(id, {
        ...box,
        clip,
        visible:
          visible.current.has(id) &&
          intersection.width > 2 &&
          intersection.height > 2,
      });
    }
    setGeometry({ bounds, slots, strip: stripBox });
  }, []);
  const register = useCallback((id: string, node: HTMLElement | null) => {
    const previous = elements.current.get(id);
    if (previous) {
      observer.current?.unobserve(previous);
      intersections.current?.unobserve(previous);
    }
    if (node) {
      elements.current.set(id, node);
      observer.current?.observe(node);
      intersections.current?.observe(node);
    } else {
      elements.current.delete(id);
      visible.current.delete(id);
    }
  }, []);
  useLayoutEffect(() => {
    if (!root.current) return;
    const resize = new ResizeObserver(measure);
    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.slotId!;
          if (entry.isIntersecting && entry.intersectionRatio > 0.05)
            visible.current.add(id);
          else visible.current.delete(id);
        }
        measure();
      },
      { root: root.current, threshold: [0, 0.05, 0.5, 1] },
    );
    observer.current = resize;
    intersections.current = intersection;
    resize.observe(root.current);
    for (const node of elements.current.values()) {
      resize.observe(node);
      intersection.observe(node);
    }
    measure();
    return () => {
      resize.disconnect();
      intersection.disconnect();
      observer.current = null;
      intersections.current = null;
    };
  }, [measure]);
  const signature = state.slots
    .map((s) => `${s.id}:${s.widgetId || ""}:${s.offer?.id || ""}`)
    .join("|");
  useLayoutEffect(measure, [
    measure,
    signature,
    state.preset,
    state.ratio,
    state.single,
  ]);
  return { root, strip, register, measure, geometry };
}
