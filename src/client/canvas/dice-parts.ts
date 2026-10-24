import type { ModuleResult } from "../../shared/room-modules";

export const kinds = [4, 6, 8, 10, 12, 20] as const;
export type Kind = (typeof kinds)[number];

interface Group {
  count: number;
  faces: string;
  kept: number[];
  shown: string;
}
/** Groups from a result detail such as "1d20: [20] · 2d6: [(1), 5]". */
export function groups(detail: string): Group[] {
  const first = detail.split("\n")[0].replace(/^\d+\) /, "");
  return [...first.matchAll(/(\d+)d(\w+): \[([^\]]*)\]/g)].map((m) => {
    const values = m[3].split(", ");
    return {
      count: Number(m[1]),
      faces: m[2].toLowerCase(),
      kept: values
        .filter((v) => !v.startsWith("("))
        .map(Number)
        .filter(Number.isFinite),
      shown: `[${values.filter((v) => !v.startsWith("(")).join(",")}]`,
    };
  });
}
/** "1d20+5" with each dice term replaced by what it rolled: "[20]+5". */
export function parts(result: ModuleResult) {
  const found = groups(result.detail);
  if (!result.expression || !found.length || result.detail.includes("\n"))
    return found.map((g) => g.shown).join(" ");
  let i = 0;
  const swapped = result.expression
    .replace(/\s+/g, "")
    .replace(/\d*d(\d+|f|%)[a-z!<>=\d]*/gi, (term) =>
      i < found.length ? found[i++].shown : term,
    );
  return i === found.length ? swapped : found.map((g) => g.shown).join(" ");
}
/** A natural 20 on a d20 that was kept. */
export function critical(result: ModuleResult) {
  return groups(result.detail).some(
    (g) => g.faces === "20" && g.kept.includes(20),
  );
}
export const dieKind = (faces: string): Kind => {
  const n = Number(faces);
  return kinds.includes(n as Kind) ? (n as Kind) : n > 20 ? 10 : 6;
};

/** Tapping a die adds it to the command: 1d20 → 2d20; another type joins with "+". */
export function addDie(command: string, kind: Kind) {
  const text = command.trim();
  if (!text) return `1d${kind}`;
  const last = new RegExp(`(^|[+\\-*/(])(\\d*)d${kind}$`, "i").exec(text);
  if (last) {
    const count = (Number(last[2]) || 1) + 1;
    return `${text.slice(0, last.index + last[1].length)}${count}d${kind}`;
  }
  return `${text}+1d${kind}`;
}
