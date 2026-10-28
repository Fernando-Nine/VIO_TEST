import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Maximize2 } from "lucide-react";
import type { Box } from "./geometry";
import type { CellRect } from "./slot-spans";

/** Grid tools of #221: span handle, focus ghost and Shift edge bands. */
export type Side = "left" | "right" | "top" | "bottom";
export const sides: Side[] = ["left", "right", "top", "bottom"];
export const sideLabel: Record<Side, string> = {
  left: "Esquerda",
  right: "Direita",
  top: "Em cima",
  bottom: "Embaixo",
};
export const sidePhrase: Record<Side, string> = {
  left: "foco à esquerda",
  right: "foco à direita",
  top: "foco em cima",
  bottom: "foco embaixo",
};
/** The bottom band leaves the dock's middle alone (as `underDock`). */
export const DOCK_HALF = 230;
const EDGE = 48;

/** Nearest canvas edge within reach of the pointer, if any. */
export function edgeAt(
  point: { x: number; y: number },
  bounds: { width: number; height: number },
): Side | null {
  const distances: [Side, number][] = [
    ["left", point.x],
    ["right", bounds.width - point.x],
    ["top", point.y],
    ["bottom", bounds.height - point.y],
  ];
  const reachable = distances.filter(
    ([side, distance]) =>
      distance >= -EDGE &&
      distance <= EDGE &&
      !(side === "bottom" && Math.abs(point.x - bounds.width / 2) < DOCK_HALF),
  );
  reachable.sort((a, b) => a[1] - b[1]);
  return reachable[0]?.[0] ?? null;
}

/** Focus + three strip cells inside `box`, as the real layout draws them. */
export function focusParts(
  box: { width: number; height: number },
  side: Side,
  ratio: number,
  gap = 8,
) {
  const horizontal = side === "left" || side === "right";
  const length = horizontal ? box.width : box.height;
  const focusLength = Math.round(length * ratio - gap / 2);
  const stripLength = length - focusLength - gap;
  const across = horizontal ? box.height : box.width;
  const cell = (across - gap * 2) / 3;
  const focusStart = side === "left" || side === "top" ? 0 : stripLength + gap;
  const stripStart = side === "left" || side === "top" ? focusLength + gap : 0;
  const focus: Box = horizontal
    ? { x: focusStart, y: 0, width: focusLength, height: box.height }
    : { x: 0, y: focusStart, width: box.width, height: focusLength };
  const strip: Box[] = [0, 1, 2].map((i) =>
    horizontal
      ? { x: stripStart, y: i * (cell + gap), width: stripLength, height: cell }
      : {
          x: i * (cell + gap),
          y: stripStart,
          width: cell,
          height: stripLength,
        },
  );
  return { focus, strip };
}

const place = (box: Box): CSSProperties => ({
  left: box.x,
  top: box.y,
  width: box.width,
  height: box.height,
});

export function FocusGhost({
  box,
  side,
  ratio,
  label,
  fixed = false,
}: {
  box: Box;
  side: Side;
  ratio: number;
  label: string;
  /** Viewport coordinates (from the layout dialog); else canvas ones. */
  fixed?: boolean;
}) {
  const inner = { width: box.width - 16, height: box.height - 16 };
  const { focus, strip } = focusParts(inner, side, ratio);
  return (
    <div
      className={`focus-ghost ${fixed ? "is-fixed" : ""}`}
      style={place(box)}
      aria-hidden="true"
    >
      <div className="focus-ghost-area">
        <span className="ghost-focus" style={place(focus)} />
        {strip.map((cell, i) => (
          <span key={i} className="ghost-cell" style={place(cell)} />
        ))}
      </div>
      <span className="ghost-label">{label}</span>
    </div>
  );
}

/** 56×40 miniature of a focus position (layout dialog). */
export function FocusThumb({ side }: { side: Side }) {
  const { focus, strip } = focusParts({ width: 48, height: 32 }, side, 0.65, 2);
  return (
    <span className="focus-thumb" aria-hidden="true">
      <span className="thumb-focus" style={place(focus)} />
      {strip.map((cell, i) => (
        <span key={i} className="thumb-cell" style={place(cell)} />
      ))}
    </span>
  );
}

export function EdgeBands({ active }: { active: Side | null }) {
  return (
    <div className="edge-bands" aria-hidden="true">
      {sides.map((side) =>
        side === "bottom" ? (
          <span
            key={side}
            className={`edge-band is-bottom ${active === side ? "is-active" : ""}`}
          >
            <i />
            <i />
          </span>
        ) : (
          <span
            key={side}
            className={`edge-band is-${side} ${active === side ? "is-active" : ""}`}
          />
        ),
      )}
    </div>
  );
}

export interface GridFrame {
  /** Cells area in canvas coordinates. */
  area: Box;
  rows: number;
  columns: number;
  gap: number;
}
export function cellBox(frame: GridFrame, rect: CellRect): Box {
  const width =
    (frame.area.width - frame.gap * (frame.columns - 1)) / frame.columns;
  const height =
    (frame.area.height - frame.gap * (frame.rows - 1)) / frame.rows;
  return {
    x: frame.area.x + rect.column * (width + frame.gap),
    y: frame.area.y + rect.row * (height + frame.gap),
    width: rect.columns * width + (rect.columns - 1) * frame.gap,
    height: rect.rows * height + (rect.rows - 1) * frame.gap,
  };
}
function cellAt(frame: GridFrame, point: { x: number; y: number }) {
  const width =
    (frame.area.width - frame.gap * (frame.columns - 1)) / frame.columns;
  const height =
    (frame.area.height - frame.gap * (frame.rows - 1)) / frame.rows;
  return {
    row: Math.floor(
      (point.y - frame.area.y + frame.gap / 2) / (height + frame.gap),
    ),
    column: Math.floor(
      (point.x - frame.area.x + frame.gap / 2) / (width + frame.gap),
    ),
  };
}

/**
 * The handle in the bottom-right corner of a docked slot: drag (or arrows +
 * Enter) to cover whole cells; back to 1 × 1 separates. Esc cancels.
 */
export function SpanHandle({
  frame,
  origin,
  toLocal,
  apply,
  busy,
}: {
  frame: GridFrame;
  origin: CellRect;
  toLocal: (point: { x: number; y: number }) => { x: number; y: number };
  apply: (rows: number, columns: number) => void;
  busy: (active: boolean) => void;
}) {
  const [draft, setDraft] = useState<{ rows: number; columns: number } | null>(
    null,
  );
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const clamp = (rows: number, columns: number) => ({
    rows: Math.max(1, Math.min(frame.rows - origin.row, rows)),
    columns: Math.max(1, Math.min(frame.columns - origin.column, columns)),
  });
  const cancel = () => {
    setDraft(null);
    setPointer(null);
    busy(false);
  };
  useEffect(() => {
    if (!pointer) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    window.addEventListener("keydown", escape, true);
    return () => window.removeEventListener("keydown", escape, true);
  }, [!!pointer]);
  const corner = cellBox(frame, origin);
  const ghost = draft && cellBox(frame, { ...origin, ...draft });
  const label = draft && `${draft.rows} × ${draft.columns}`;
  return (
    <>
      {ghost && (
        <div className="span-ghost" style={place(ghost)} aria-hidden="true">
          <span
            className="span-ghost-label"
            style={
              pointer
                ? {
                    left: pointer.x - ghost.x + 14,
                    top: pointer.y - ghost.y + 14,
                  }
                : { right: 10, bottom: 10 }
            }
          >
            {label}
          </span>
        </div>
      )}
      <button
        ref={button}
        className="span-handle"
        style={{ left: corner.x + corner.width, top: corner.y + corner.height }}
        aria-label={`Juntar espaços: ${origin.rows} × ${origin.columns}. Use as setas e Enter.`}
        aria-keyshortcuts="ArrowRight ArrowDown ArrowLeft ArrowUp Enter Escape"
        title="Arraste para juntar espaços"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          setDraft({ rows: origin.rows, columns: origin.columns });
          setPointer(toLocal({ x: event.clientX, y: event.clientY }));
          busy(true);
        }}
        onPointerMove={(event) => {
          if (!pointer) return;
          const local = toLocal({ x: event.clientX, y: event.clientY });
          const cell = cellAt(frame, local);
          setPointer(local);
          setDraft(
            clamp(cell.row - origin.row + 1, cell.column - origin.column + 1),
          );
        }}
        onPointerUp={() => {
          if (!pointer || !draft) return;
          const { rows, columns } = draft;
          cancel();
          apply(rows, columns);
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={() => pointer && cancel()}
        onBlur={() => !pointer && draft && cancel()}
        onKeyDown={(event) => {
          const current = draft || {
            rows: origin.rows,
            columns: origin.columns,
          };
          const step: Record<string, [number, number]> = {
            ArrowRight: [0, 1],
            ArrowLeft: [0, -1],
            ArrowDown: [1, 0],
            ArrowUp: [-1, 0],
          };
          if (step[event.key]) {
            event.preventDefault();
            event.stopPropagation();
            const [rows, columns] = step[event.key];
            setDraft(clamp(current.rows + rows, current.columns + columns));
            busy(true);
          } else if (event.key === "Enter" && draft) {
            event.preventDefault();
            const { rows, columns } = draft;
            cancel();
            apply(rows, columns);
          } else if (event.key === "Escape" && draft) {
            event.preventDefault();
            event.stopPropagation();
            cancel();
          }
        }}
      >
        <Maximize2 size={14} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </>
  );
}
