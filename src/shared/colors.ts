export const defaultColor = "#2727F5";
export const colorPresets = [
  { name: "Rosa", color: "#EC75B5" },
  { name: "Amarelo", color: "#F5CB55" },
  { name: "Verde", color: "#67CB96" },
  { name: "Anil", color: defaultColor },
  { name: "Ciano", color: "#60CFDC" },
  { name: "Vermelho", color: "#ED747C" },
  { name: "Roxo", color: "#AB88EE" },
  { name: "Laranja", color: "#F1A365" },
] as const;

export function normalizeColor(value: string): string | undefined {
  const hex = value.trim().replace(/^#/, "");
  if (/^[a-f\d]{6}$/i.test(hex)) return `#${hex.toUpperCase()}`;
  if (/^[a-f\d]{3}$/i.test(hex))
    return `#${[...hex]
      .map((c) => c + c)
      .join("")
      .toUpperCase()}`;
}

function rgb(color: string): number[] {
  const hex = normalizeColor(color) || defaultColor;
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}
function hex(values: number[]): string {
  return (
    "#" +
    values
      .map((c) => Math.round(c).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}
function luminance(color: string): number {
  const linear = rgb(color).map((c) => {
    const value = c / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
export function contrast(a: string, b: string): number {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function colorInk(color: string): string {
  return contrast(color, "#FFFFFF") >= contrast(color, "#000000")
    ? "#FFFFFF"
    : "#000000";
}
/** Keep exact avatar colors; lift only the small labels/outlines on dark surfaces. */
export function readableAccent(color: string): string {
  let result = normalizeColor(color) || defaultColor;
  const original = rgb(result);
  for (
    let mix = 0.05;
    contrast(result, "#242838") < 4.5 && mix <= 1;
    mix += 0.05
  )
    result = hex(original.map((c) => c + (255 - c) * mix));
  return result;
}
export function hsvToHex(
  hue: number,
  saturation: number,
  value: number,
): string {
  const h = (((hue % 360) + 360) % 360) / 60;
  const s = Math.max(0, Math.min(1, saturation));
  const v = Math.max(0, Math.min(1, value));
  const c = v * s,
    x = c * (1 - Math.abs((h % 2) - 1)),
    m = v - c;
  const channels =
    h < 1
      ? [c, x, 0]
      : h < 2
        ? [x, c, 0]
        : h < 3
          ? [0, c, x]
          : h < 4
            ? [0, x, c]
            : h < 5
              ? [x, 0, c]
              : [c, 0, x];
  return hex(channels.map((n) => (n + m) * 255));
}
export function hexToHsv(color: string) {
  const [r, g, b] = rgb(color).map((n) => n / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  const h = !delta
    ? 0
    : max === r
      ? ((g - b) / delta) % 6
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: max ? delta / max : 0, v: max };
}
