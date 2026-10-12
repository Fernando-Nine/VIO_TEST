/** Coordinates are independent of orientation and of the future custom-grid UI. */
export interface CellRect {
  row: number;
  column: number;
  rows: number;
  columns: number;
}
export function rectangularUnion(rects: CellRect[]): CellRect | null {
  if (
    rects.length < 2 ||
    rects.some(
      (r) =>
        ![r.row, r.column, r.rows, r.columns].every(Number.isSafeInteger) ||
        r.row < 0 ||
        r.column < 0 ||
        r.rows < 1 ||
        r.columns < 1,
    )
  )
    return null;
  const row = Math.min(...rects.map((r) => r.row)),
    column = Math.min(...rects.map((r) => r.column));
  const rows = Math.max(...rects.map((r) => r.row + r.rows)) - row,
    columns = Math.max(...rects.map((r) => r.column + r.columns)) - column;
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i],
        b = rects[j];
      if (
        a.row < b.row + b.rows &&
        b.row < a.row + a.rows &&
        a.column < b.column + b.columns &&
        b.column < a.column + a.columns
      )
        return null;
    }
  return rects.reduce((area, r) => area + r.rows * r.columns, 0) ===
    rows * columns
    ? { row, column, rows, columns }
    : null;
}
