import { contrast, hexToHsv, hsvToHex, luminance } from "./colors";

/** Raffle wheel palettes (docs/design/sorteador.md). */
export const paletteIds = [
  "indigo",
  "sunset",
  "forest",
  "candy",
  "random",
] as const;
export type PaletteId = (typeof paletteIds)[number];
export const paletteNames: Record<PaletteId, string> = {
  indigo: "Índigo",
  sunset: "Pôr do sol",
  forest: "Floresta",
  candy: "Doce",
  random: "Aleatória",
};
export const palettes: Record<Exclude<PaletteId, "random">, string[]> = {
  indigo: ["#A6A9FF", "#2727F5", "#1C1D6B", "#3A3DD8", "#24255C"],
  sunset: ["#FFB38A", "#E8615A", "#B23A6B", "#6E2F8A", "#F2C94C"],
  forest: ["#4CDDC3", "#2A9D8F", "#1F6F5C", "#8BC34A", "#E9C46A"],
  candy: ["#F4A6C6", "#C08BF2", "#8AA8FF", "#7EE0D0", "#FFD18A"],
};

function hslToHex(h: number, s: number, l: number) {
  // HSL → HSV, then reuse the shared converter.
  const v = l + s * Math.min(l, 1 - l);
  return hsvToHex(h, v ? 2 * (1 - l / v) : 0, v);
}

/**
 * Colors in harmony, not at random: a drawn base hue spread by a rule
 * (analogous or triad), saturation and lightness in a controlled band, and
 * neighbors alternating light and dark so adjacent slices stay distinct.
 */
export function harmonyPalette(random: () => number = Math.random): string[] {
  const base = random() * 360;
  const triad = random() < 0.5;
  const offsets = triad ? [0, 120, 240, 40, 160] : [0, 28, 56, -28, 84];
  const lightness = [0.8, 0.3, 0.64, 0.4, 0.52];
  const colors = offsets.map((offset, i) =>
    hslToHex(base + offset, 0.55 + random() * 0.2, lightness[i]),
  );
  // Interleave light and dark (hues differ in brightness at equal lightness).
  const sorted = [...colors].sort((a, b) => luminance(a) - luminance(b));
  return [4, 1, 3, 0, 2].map((i) => sorted[i]);
}

/** Colors of the current palette; a random one lives in the options' colors. */
export function paletteColors(
  palette: PaletteId | undefined,
  colors: (string | undefined)[] = [],
): string[] {
  if (palette !== "random") return palettes[palette || "indigo"];
  const own = colors.filter((c): c is string => !!c).slice(0, 5);
  return own.length ? own : palettes.indigo;
}

/** Twelve choices for one option: the palette and lighter/darker steps of it. */
export function swatches(base: string[]): string[] {
  const steps = base.flatMap((c) => {
    const { h, s, v } = hexToHsv(c);
    return [
      hsvToHex(h, s * 0.75, Math.min(1, v * 1.2)),
      hsvToHex(h, s, v * 0.7),
    ];
  });
  return [...new Set([...base, ...steps])].slice(0, 12);
}

/**
 * The color for the option at `index`: the palette in order, then lighter and
 * darker steps of it, so a sixth slice never repeats the first one beside it.
 */
export function colorAt(base: string[], index: number) {
  if (index < base.length) return base[index];
  const { h, s, v } = hexToHsv(base[index % base.length]);
  // Darker first: the next slice sits beside the first, often a light one.
  return Math.floor(index / base.length) % 2
    ? hsvToHex(h, s, v * 0.62)
    : hsvToHex(h, s * 0.7, Math.min(1, v * 1.25));
}

/** Dark or light text over a slice, whichever reads better (≥ 4.5:1 when possible). */
export function sliceInk(color: string) {
  return contrast(color, "#0B0C13") >= contrast(color, "#F3F3FB")
    ? "#0B0C13"
    : "#F3F3FB";
}
export { luminance };
