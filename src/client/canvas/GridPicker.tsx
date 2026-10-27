import { useRef, useState, type KeyboardEvent } from "react";
import { MAX_GRID } from "./model";

interface Size {
  rows: number;
  columns: number;
}

/** 3 × 4 size matrix: lights from the corner to the pointer, click applies. */
export function GridPicker(props: {
  value: Size | null;
  pick: (size: Size) => void;
}) {
  const [hot, setHot] = useState<Size | null>(null);
  const [cursor, setCursor] = useState<Size>(
    props.value || { rows: 1, columns: 1 },
  );
  const cells = useRef(new Map<string, HTMLButtonElement>());
  const shown = hot || props.value;
  function move(event: KeyboardEvent, from: Size) {
    const step: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const delta = step[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = {
      rows: Math.max(1, Math.min(MAX_GRID.rows, from.rows + delta[0])),
      columns: Math.max(1, Math.min(MAX_GRID.columns, from.columns + delta[1])),
    };
    setCursor(next);
    setHot(next);
    cells.current.get(`${next.rows}x${next.columns}`)?.focus();
  }
  return (
    <div className="grid-picker">
      <div
        className="grid-picker-cells"
        role="group"
        aria-label="Tamanho da grade"
        onPointerLeave={() => setHot(null)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            setHot(null);
        }}
      >
        {Array.from({ length: MAX_GRID.rows }, (_, r) =>
          Array.from({ length: MAX_GRID.columns }, (_, c) => {
            const size = { rows: r + 1, columns: c + 1 };
            const lit =
              !!shown &&
              size.rows <= shown.rows &&
              size.columns <= shown.columns;
            const current =
              props.value?.rows === size.rows &&
              props.value?.columns === size.columns;
            return (
              <button
                key={`${size.rows}x${size.columns}`}
                ref={(node) => {
                  const key = `${size.rows}x${size.columns}`;
                  if (node) cells.current.set(key, node);
                  else cells.current.delete(key);
                }}
                className={lit ? "is-lit" : undefined}
                aria-label={`${size.rows} ${size.rows > 1 ? "linhas" : "linha"} por ${size.columns} ${size.columns > 1 ? "colunas" : "coluna"}`}
                aria-pressed={current}
                tabIndex={
                  cursor.rows === size.rows && cursor.columns === size.columns
                    ? 0
                    : -1
                }
                onPointerEnter={() => setHot(size)}
                onFocus={() => {
                  setCursor(size);
                  setHot(size);
                }}
                onKeyDown={(event) => move(event, size)}
                onClick={() => props.pick(size)}
              />
            );
          }),
        )}
      </div>
      <output className="grid-picker-label" aria-live="polite">
        {shown ? `${shown.rows} × ${shown.columns}` : "—"}
      </output>
    </div>
  );
}
