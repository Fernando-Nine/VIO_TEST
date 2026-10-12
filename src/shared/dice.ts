/** Bounded expression parser. No JavaScript evaluation or external code. */
export interface DiceResult {
  total: number;
  detail: string;
}
type Value = { total: number; values?: number[] };
export function rollDice(
  expression: string,
  random: (max: number) => number,
): DiceResult[] {
  if (!expression.trim() || expression.length > 200)
    throw new Error("Use uma expressão de até 200 caracteres.");
  const source = expression.toLowerCase().replace(/\s+/g, "");
  const repeat = /^(\d+)#(.+)$/.exec(source);
  const count = repeat ? Number(repeat[1]) : 1;
  if (count < 1 || count > 20) throw new Error("Use de 1 a 20 repetições.");
  const input = repeat ? repeat[2] : source;
  let budget = 500;
  const run = (): DiceResult => {
    let pos = 0,
      depth = 0;
    const details: string[] = [];
    const take = (pattern: RegExp) => {
      const m = pattern.exec(input.slice(pos));
      if (m) pos += m[0].length;
      return m;
    };
    const integer = (fallback?: number): number => {
      const m = take(/^\d+/);
      if (m) return Number(m[0]);
      if (fallback !== undefined) return fallback;
      throw new Error("Falta um número na expressão.");
    };
    const draw = (faces: number, fate = false) => {
      if (--budget < 0)
        throw new Error(
          "Limite de 500 resultados por comando, incluindo explosões.",
        );
      return fate ? random(3) - 1 : random(faces) + 1;
    };
    const primary = (): Value => {
      if (++depth > 24) throw new Error("Expressão muito complexa.");
      try {
        if (take(/^\(/)) {
          const value = parse(0);
          if (!take(/^\)/)) throw new Error("Feche os parênteses.");
          return value;
        }
        if (take(/^\+/)) return primary();
        if (take(/^-/)) {
          const v = primary();
          return { total: -v.total, values: v.values?.map((n) => -n) };
        }
        const wheel = take(/^[bgw](?=\d)/);
        const n = integer(wheel ? undefined : 1);
        if (!wheel && !take(/^d/)) {
          // A missing number must not become an implicit constant.
          if (pos === 0 || !/\d/.test(input[pos - 1]))
            throw new Error("Sintaxe não reconhecida. Abra o guia de dados.");
          if (!Number.isSafeInteger(n) || n > 1e12)
            throw new Error("Número fora do limite permitido.");
          return { total: n };
        }
        const fate = !wheel && !!take(/^f/);
        const faces = wheel ? 6 : fate ? 3 : integer();
        if (n < 1 || n > 100 || faces < 1 || faces > 1000000)
          throw new Error("Use até 100 dados, com 1 a 1.000.000 de faces.");
        let explosion = 0,
          filter = "",
          filterCount = 0,
          unsorted = false;
        for (let i = 0; i < 4; i++) {
          if (take(/^!/)) {
            if (fate || explosion) throw new Error("Explosão inválida.");
            explosion = integer(faces);
            if (explosion < 2 || explosion > faces)
              throw new Error(
                "O limite de explosão deve estar entre 2 e o número de faces.",
              );
          } else if (take(/^ns/)) unsorted = true;
          else {
            const m = take(/^(kh|kl|dh|dl|k|d)(?=\d)/);
            if (!m) break;
            if (filter)
              throw new Error("Use apenas um filtro de manter ou descartar.");
            filter = m[1];
            filterCount = integer();
            if (filterCount > 500) throw new Error("Filtro fora do limite.");
          }
        }
        const values: number[] = [];
        for (let i = 0; i < n; i++) {
          let v: number;
          do {
            v = draw(faces, fate);
            values.push(v);
          } while (explosion && v >= explosion);
        }
        let kept = values.map((value, index) => ({ value, index }));
        if (filter) {
          const ascending = [...kept].sort((a, b) => a.value - b.value);
          const size = Math.min(filterCount, values.length);
          if (filter === "k" || filter === "kh")
            kept = size ? ascending.slice(-size) : [];
          if (filter === "kl") kept = ascending.slice(0, size);
          if (filter === "d" || filter === "dl") kept = ascending.slice(size);
          if (filter === "dh")
            kept = ascending.slice(0, ascending.length - size);
        }
        const ids = new Set(kept.map((v) => v.index));
        const display = values.map((value, index) => ({ value, index }));
        if (!unsorted) display.sort((a, b) => a.value - b.value);
        details.push(
          `${n}d${fate ? "F" : faces}: [${display.map((v) => (ids.has(v.index) ? String(v.value) : `(${v.value})`)).join(", ")}]`,
        );
        const selected = kept.map((v) => v.value);
        return {
          total: wheel
            ? selected.filter((v) => v >= { b: 4, g: 3, w: 2 }[wheel[0]]!)
                .length
            : selected.reduce((a, b) => a + b, 0),
          values: wheel ? undefined : selected,
        };
      } finally {
        depth--;
      }
    };
    const operators: Record<string, number> = {
      "=": 1,
      "<": 1,
      ">": 1,
      "<=": 1,
      ">=": 1,
      "<<": 2,
      ">>": 2,
      "+": 3,
      "-": 3,
      "++": 4,
      "--": 4,
      "*": 5,
      "/": 5,
    };
    const parse = (minimum: number): Value => {
      let left = primary();
      while (pos < input.length) {
        const op = /^(<<|>>|<=|>=|\+\+|--|[+*/=<>-])/.exec(
          input.slice(pos),
        )?.[0];
        if (!op || operators[op] < minimum) break;
        pos += op.length;
        const right = parse(operators[op] + 1),
          a = left.total,
          b = right.total;
        if (op === "++" || op === "--") {
          const values = (left.values || [a]).map((n) =>
            op === "++" ? n + b : n - b,
          );
          left = { total: values.reduce((x, y) => x + y, 0), values };
        } else if (op === "<<" || op === ">>")
          left = {
            total: (left.values || [a]).filter((n) =>
              op === "<<" ? n <= b : n >= b,
            ).length,
          };
        else if (op === "+") left = { total: a + b };
        else if (op === "-") left = { total: a - b };
        else if (op === "*") left = { total: a * b };
        else if (op === "/") {
          if (!b) throw new Error("Não é possível dividir por zero.");
          left = { total: a / b };
        } else
          left = {
            total: Number(
              op === "="
                ? a === b
                : op === "<"
                  ? a < b
                  : op === ">"
                    ? a > b
                    : op === "<="
                      ? a <= b
                      : a >= b,
            ),
          };
        if (!Number.isFinite(left.total) || Math.abs(left.total) > 1e12)
          throw new Error("Resultado fora do limite permitido.");
      }
      return left;
    };
    const result = parse(0);
    if (pos !== input.length)
      throw new Error("Sintaxe não reconhecida. Consulte os exemplos do guia.");
    return {
      total: result.total,
      detail: details.join(" · ").slice(0, 2000) || String(result.total),
    };
  };
  return Array.from({ length: count }, run);
}
